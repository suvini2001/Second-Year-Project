// Small client for the DocOp backend's read-only routes (/api/mcp/*).
// The MCP server never connects to MongoDB itself.
const BASE = process.env.DOCOP_API_URL || "http://backend:8000";

export async function docop(path, params = {})
//path - Which backend endpoint to call
//parms - Optional query parameters {specialty: "cardiology"w}
{
    // build the complete URL -- combines the backend address with the API path
    const url = new URL(`/api/mcp${path}`, BASE);
    //Object.entries(params) turns an object into key-value pairs.
    //key is the parameter name, such as specialty.
    //value is the parameter value, such as cardiology.
    //String(value) converts the value to text.
    //url.searchParams.set() adds the parameter to the URL.
    //It skips values that are undefined, null, or empty strings.

    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "")
            //prevent malformed URLs and unintended query parameters
            url.searchParams.set(key, String(value));
    }

    //This is the part that actually communicates with your backend.
    let res;
    try {
        res = await fetch(url, {
            headers: { "x-mcp-key": process.env.DOCOP_MCP_KEY },
            signal: AbortSignal.timeout(10_000), // never hang an AI client for long
        });
    } catch {
        throw new Error("The DocOp API is not reachable right now. Try again in a minute.");
    }
    //Read the backend response
    const body = await res.json().catch(() => ({}));
    // The backend answers 400 with a readable { error } so the AI can fix its input

    //Handle HTTP errors clearly
    if (!res.ok) throw new Error(body.error || `The DocOp API returned HTTP ${res.status}.`);
    return body;  // Return successful data
}