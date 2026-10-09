import crypto from "crypto";

// Same check as authInternal.js, but with its own header and key.
// Only the mcp-server container has DOCOP_MCP_KEY, and it opens only /api/mcp/* (read-only).

//Define the authentication middleware-security guard at the entrance to your MCP API
//  *req — the incoming HTTP request.
//  *res — the HTTP response your backend will send.
//  *next — a function that passes control to the next middleware or route handler.
export default function authMcp(req, res, next) {

    //
    const given = Buffer.from(req.headers["x-mcp-key"] || "");
    const expected = Buffer.from(process.env.DOCOP_MCP_KEY || "");
    if (!expected.length || given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
}


// MCP server --> Reads process.env.DOCOP_MCP_KEY --> HTTP request--> Sends it in the x-mcp-key header
// Backend --> Reads it using req.headers["x-mcp-key"] --> authMcp.js --> Compares the received key with process.env.DOCOP_MCP_KEY
// authMcp.js--> Compares the received key with process.env.DOCOP_MCP_KEY