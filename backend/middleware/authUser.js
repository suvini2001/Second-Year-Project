import jwt from "jsonwebtoken";

// Middleware to authenticate  users
const authUser = (req, res, next) => {
    try {
        const { token } = req.headers;

        if (!token) {
            return res.status(401).json({ success: false, message: "Not authorized login again" });
        }
        const token_decode = jwt.verify(token, process.env.JWT_SECRET);

        req.userId = token_decode.id; // Set req.userId instead of req.body.userId
        req.userType = token_decode.type; // Pass user type to the request

        if (token_decode.type !== 'user') {
            return res.status(401).json({ success: false, message: "Invalid token for user" });
        }
        next();
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

export default authUser;
