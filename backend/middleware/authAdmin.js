import jwt from "jsonwebtoken";

// Middleware to authenticate admin users
const authAdmin = (req, res, next) => {
    try{
        const{atoken} = req.headers;

        if(!atoken){
            return res.status(401).json({ success: false, message: "Not authorized login again" });
        }
        const token_decode = jwt.verify(atoken, process.env.JWT_SECRET);

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

export default authAdmin;
