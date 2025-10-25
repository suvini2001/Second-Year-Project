import jwt from "jsonwebtoken";

// Middleware to authenticate  users
const authUser = (req, res, next) => {
    try{
        const{token} = req.headers;

        if(!token){
            return res.status(401).json({ success: false, message: "Not authorized login again" });
        }
        const token_decode = jwt.verify(token, process.env.JWT_SECRET);
    if (!req.body) req.body = {};
    req.body.userId = token_decode.id;

        if(!token_decode.email === process.env.ADMIN_EMAIL){
            return res.status(401).json({ success: false, message: "Token verification failed, login again" });
        }
        next();


    }

    catch(error){
       console.log(error);
       res.json({ success: false, message:error.message });
    }
};

export default authUser;
