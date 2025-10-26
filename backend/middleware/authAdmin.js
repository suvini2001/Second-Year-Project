import jwt from "jsonwebtoken";

// Middleware to authenticate admin users
const authAdmin = (req, res, next) => {
    try{
        // Accept either 'aToken' or 'atoken' header (express lower-cases header names)
        const tokenHeader = req.headers['atoken'] || req.headers['aToken'] || req.headers['a-token'];

        if (!tokenHeader) {
            return res.status(401).json({ success: false, message: "Not authorized - login again" });
        }

        const token_decode = jwt.verify(tokenHeader, process.env.JWT_SECRET);

        // Ensure the decoded token contains the expected admin email
        if (!token_decode || token_decode.email !== process.env.ADMIN_EMAIL) {
            return res.status(401).json({ success: false, message: "Token verification failed, login again" });
        }

        // attach decoded token to request for downstream handlers if needed
        req.admin = token_decode;
        next();


    }

    catch(error){
       console.log(error);
       res.json({ success: false, message:error.message });
    }
};

export default authAdmin;
