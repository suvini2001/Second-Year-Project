import jwt from "jsonwebtoken";

// Middleware to authenticate  doctors
const authDoctor = (req, res, next) => {
    try {
        const { dtoken } = req.headers;

        if (!dtoken) {
            console.log("No token provided in headers.");
            return res.status(401).json({ success: false, message: "Not authorized, login again" });
        }

        const token_decode = jwt.verify(dtoken, process.env.JWT_SECRET);
        console.log("Decoded token:", token_decode);

        req.docId = token_decode.id; // Set req.docId from the decoded token

        if (!req.docId) {
            console.log("Token does not contain a valid id.");
            return res.status(401).json({ success: false, message: "Invalid token, login again" });
        }

        next();
    } catch (error) {
        console.log("Error in authDoctor middleware:", error);
        res.status(401).json({ success: false, message: "Token verification failed, login again" });
    }
};

export default authDoctor;
