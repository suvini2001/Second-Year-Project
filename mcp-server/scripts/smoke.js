// Smoke test for a running DocOp MCP server, using the official MCP client.
// Usage (from mcp-server/):
//   MCP_ADMIN_TOKEN=... MCP_ASSISTANT_TOKEN=... npm run smoke
// Optional: MCP_URL (default http://localhost:3001/mcp)
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const URL_ = new URL(process.env.MCP_URL || "http://localhost:3001/mcp");
let pass = 0, fail = 0;
const check = (ok, label, detail = "") => {
    ok ? pass++ : fail++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
};

async function connect(token) {
    const client = new Client({ name: "docop-smoke", version: "1.0.0" });
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    await client.connect(new StreamableHTTPClientTransport(URL_, { requestInit: { headers } }));
    return client;
}
const json = (result) => JSON.parse(result.content[0].text);

// 1. No token / wrong token
for (const [label, token] of [["no token", ""], ["wrong token", "not-a-real-token"]]) {
    try {
        await connect(token);
        check(false, `${label} is refused`, "connected anyway");
    } catch (err) {
        check(/401|Unauthorized/i.test(String(err)), `${label} is refused`, String(err.message).slice(0, 60));
    }
}

// 2. Admin token: 4 read-only tools
const admin = await connect(process.env.MCP_ADMIN_TOKEN);
const adminTools = (await admin.listTools()).tools;
check(adminTools.length === 4, "admin sees 4 tools", adminTools.map((t) => t.name).join(", "));
check(adminTools.every((t) => t.annotations?.readOnlyHint === true), "every tool is marked read-only");

const doctors = json(await admin.callTool({ name: "list_doctors", arguments: {} }));
check(Array.isArray(doctors.doctors), "list_doctors works", `${doctors.count} doctors`);
check(!JSON.stringify(doctors).includes("@"), "list_doctors returns no email addresses");

const today = json(await admin.callTool({ name: "get_todays_schedule", arguments: {} }));
check(typeof today.count === "number", "get_todays_schedule works", `${today.date}: ${today.count} appointments`);

const stats = json(await admin.callTool({ name: "get_appointment_stats", arguments: { days: 7 } }));
check(typeof stats.totals?.total === "number", "get_appointment_stats works", `${stats.period}: ${stats.totals?.total}`);

if (doctors.doctors?.[0]) {
    const tomorrow = new Date(Date.now() + 864e5).toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
    const free = json(await admin.callTool({ name: "get_availability", arguments: { doctorId: doctors.doctors[0].doctorId, date: tomorrow } }));
    check(Array.isArray(free.freeSlots), "get_availability works", `${free.doctor} on ${tomorrow}: ${free.freeSlots?.length} free`);
}

// 3. Bad input comes back as a readable tool error, not a crash
const bad = await admin.callTool({ name: "get_todays_schedule", arguments: { date: "tomorrow" } });
check(bad.isError === true, "a bad date is a readable tool error", bad.content?.[0]?.text?.slice(0, 60));
const past = await admin.callTool({ name: "get_availability", arguments: { doctorId: "0".repeat(24), date: "2020-01-01" } });
check(past.isError === true, "a past date for availability is refused", past.content?.[0]?.text?.slice(0, 60));
await admin.close();

// 4. Assistant token: only the 2 patient-safe tools
if (process.env.MCP_ASSISTANT_TOKEN) {
    const assistant = await connect(process.env.MCP_ASSISTANT_TOKEN);
    const names = (await assistant.listTools()).tools.map((t) => t.name).sort();
    check(names.join() === "get_availability,list_doctors", "assistant sees only list_doctors and get_availability", names.join(", "));
    const hidden = await assistant.callTool({ name: "get_appointment_stats", arguments: {} }).catch((e) => ({ isError: true, content: [{ text: e.message }] }));
    check(hidden.isError === true, "assistant can't call get_appointment_stats");
    const avail = json(await assistant.callTool({ name: "list_doctors", arguments: {} }));
    check(avail.doctors.every((d) => d.available), "assistant sees only available doctors");
    await assistant.close();
} else {
    console.log("SKIP  assistant checks (MCP_ASSISTANT_TOKEN not set)");
}

console.log(`\nPASS ${pass}  FAIL ${fail}`);
process.exit(fail ? 1 : 0);