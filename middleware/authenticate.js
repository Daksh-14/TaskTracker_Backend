import jwt from "jsonwebtoken";
import 'dotenv/config'

export const authenticate=(req,res,next)=>{
    const accessToken=req.cookies.accessToken;
    const refreshToken=req.cookies.refreshToken;
    if(!accessToken){
        if(!refreshToken){
            return res.status(404).json({message:"Refresh token expired"});
        }
        try{
        const user=jwt.verify(refreshToken,process.env.JWT_REFRESH_SECRET);
        const userid=user.userId;
        const newAccessToken=jwt.sign({userId:userid},process.env.JWT_SECRET,{expiresIn:process.env.JWT_EXPIRATION});
        res.cookie('accessToken', newAccessToken, { httpOnly: true, secure: true, sameSite: 'Strict' });
        req.user=userid;
        next()
        }
        catch(error){
            return res.status(404).json({message:"Refresh token expired"});
        }
    }
    else{
        try{
            const user=jwt.verify(accessToken,process.env.JWT_SECRET);
            const userid=user.userId;
            req.user=userid;
            next();
        }
        catch(error){
            console.log("here");
            if(!refreshToken){
                return res.status(404).json({message:"Refresh token expired"});
            }
            try{
            const user=jwt.verify(refreshToken,process.env.JWT_REFRESH_SECRET);
            const userid=user.userId;
            const newAccessToken=jwt.sign({userId:userid},process.env.JWT_SECRET,{expiresIn:process.env.JWT_EXPIRATION});
            res.cookie('accessToken', newAccessToken, { httpOnly: true, secure: true, sameSite: 'Strict' });
            req.user=userid;
            next()
            }
            catch(error){
                return res.status(404).json({message:"Refresh token expired"});
            }
        }
    }
}
