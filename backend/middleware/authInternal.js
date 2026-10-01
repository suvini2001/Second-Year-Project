import crypto from "crypto";

export default function authInternal(req, res, next)
// this function runs before my internal API route
{
    // get the key sent by n8n--If there isn't one, use an empty string.
    const given = Buffer.from(req.headers["x-internal-key"] || "");

    //get the correct key from the envirnment
    const expected = Buffer.from(process.env.DOCOP_INTERNAL_KEY || "");
    if (!expected.length || given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    next();  // The security check passed. Let the request continue to the actual route.
}