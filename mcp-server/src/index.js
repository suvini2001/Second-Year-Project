import crypto from "node:crypto";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { buildServer } from "./tools.js";

const PORT = Number(process.env.PORT || 3001);

// Refuse to start without the secrets: a server with no token would be open to anyone
//Checking that required secrets exist
for (const name of ["DOCOP_MCP_KEY", "MCP_ADMIN_TOKEN"]) {
    if (!process.env[name]) {
        console.error(`[mcp] ${name} is not set. Add it to the root .env and restart.`);
        process.exit(1);
    }
}

// Each token maps to a scope. The scope decides which tools exist for that caller.
const TOKENS = [
    { token: process.env.MCP_ADMIN_TOKEN, scope: "admin" },
    { token: process.env.MCP_ASSISTANT_TOKEN, scope: "assistant" },
].filter((t) => t.token);

// "Authorization: Bearer <token>" -> "admin" | "assistant" | null (timing-safe, like authInternal.js)
//The scopeFor() authentication function
function scopeFor(header) {
    const match = /^Bearer\s+(.+)$/i.exec(header || "");
    if (!match) return null;
    const given = Buffer.from(match[1].trim());
    for (const { token, scope } of TOKENS) {
        const expected = Buffer.from(token);
        if (given.length === expected.length && crypto.timingSafeEqual(given, expected)) return scope;
    }
    return null;
}

const rpcError = (res, status, code, message) =>
    res.status(status).json({ jsonrpc: "2.0", error: { code, message }, id: null });

const app = express();
app.use(express.json({ limit: "100kb" }));

// For the Docker healthcheck. Says nothing about the data.
app.get("/health", (req, res) => res.json({ status: "ok" }));

// Streamable HTTP, stateless: every POST gets a fresh server + transport.
// No sessions to store, so the container can restart (or scale) without breaking clients.
app.post("/mcp", async (req, res) => {
    const scope = scopeFor(req.headers.authorization);
    if (!scope) return rpcError(res, 401, -32001, "Unauthorized");

    res.setHeader("X-Accel-Buffering", "no"); // tells nginx not to buffer this response (Step 6)

    const server = buildServer(scope);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
        transport.close();
        server.close();
    });

    try {
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        if (req.body?.method === "tools/call") console.log(`[mcp] ${scope} called ${req.body.params?.name}`);
    } catch (err) {
        console.error("[mcp] request failed:", err);
        if (!res.headersSent) rpcError(res, 500, -32603, "Internal server error");
    }
});

// Stateless mode has no server-to-client stream and no sessions to delete
app.get("/mcp", (req, res) => rpcError(res, 405, -32000, "Method not allowed"));
app.delete("/mcp", (req, res) => rpcError(res, 405, -32000, "Method not allowed"));

app.listen(PORT, () => {
    console.log(`[mcp] DocOp MCP server on port ${PORT}, scopes: ${TOKENS.map((t) => t.scope).join(", ")}`);
});



// DocOp MCP Server – Implementation Explanation
//     1. Set up the MCP server
//         ▪ Used Express.js to create an HTTP server.
//         ▪ Integrated the official MCP SDK's Streamable HTTP transport to communicate with MCP clients.
//         ▪ Set the server port through environment variables, with port 3001 as the default.
//     2. Configured environment-based security
//         ▪ Stored authentication tokens and backend API secrets in environment variables.
//         ▪ Added a startup check to prevent the server from running if essential secrets are missing.
//     3. Implemented token-based authentication
//         ▪ Created separate authentication tokens for admin and assistant clients.
//         ▪ Used Bearer token authentication to identify incoming requests.
//         ▪ Used crypto.timingSafeEqual() to compare tokens safely.
//     4. Implemented scope-based access control
//         ▪ Mapped authenticated tokens to admin or assistant scopes.
//         ▪ Passed the authenticated scope to buildServer() in tools.js.
//         ▪ Admin clients can access all four tools, while assistant clients can access only doctor search and appointment availability.
//     5. Created the MCP request endpoint
//         ▪ Implemented POST /mcp to receive MCP protocol messages.
//         ▪ Rejected requests with missing or invalid tokens using HTTP 401 Unauthorized.
//         ▪ Connected the MCP server to the Streamable HTTP transport to process incoming requests.
//     6. Integrated the MCP tools
//         ▪ Connected index.js to tools.js, where I defined four read-only tools:
//             • list_doctors
//             • get_availability
//             • get_appointment_stats
//             • get_todays_schedule
//         ▪ These tools retrieve data through the DocOp backend API.
//     7. Separated client authentication from backend authentication
//         ▪ Used MCP access tokens to authenticate clients connecting to the MCP server.
//         ▪ Used a separate DOCOP_MCP_KEY when the MCP server calls the DocOp backend.
//         ▪ This separates client access control from service-to-service authentication.
//     8. Added error handling and monitoring
//         ▪ Created a reusable JSON-RPC error response function.
//         ▪ Added error handling for failed MCP request processing.
//         ▪ Logged tool calls for debugging and monitoring.
//         ▪ Added a /health endpoint for basic health checks.
//     9. Configured stateless request handling
//         ▪ Configured the Streamable HTTP transport without generated session IDs.
//         ▪ Created a server and transport for each POST request and added cleanup logic.
//         ▪ This avoids maintaining persistent MCP sessions in this implementation.