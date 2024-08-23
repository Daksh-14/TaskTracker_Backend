import express, { Router } from 'express'
import {db} from '../database/db.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { authenticate } from '../middleware/authenticate.js'
import 'dotenv/config'

const router=express.Router();

const genToken=(user)=>{
    const accessToken=jwt.sign({userId:user.id},process.env.JWT_SECRET,{expiresIn:process.env.JWT_EXPIRATION});
    const refreshToken=jwt.sign({userId:user.id},process.env.JWT_REFRESH_SECRET,{expiresIn:process.env.JWT_REFRESH_EXPIRATION});
    return {accessToken,refreshToken};
}
router
    .route('/register')
    .post(async(req,res)=>{
        try{
            const {firstName,lastName,email,password}=req.body.formData;
            if(!(firstName && lastName && email && password)){
                return res.status(400).send("All fields are necessary");
            }
            
            const id=await db.query('Select * from users where email=$1',[email]);
            if(id.rowCount>0){
                return res.status(400).send("This email is already in use");
            }

            const myEncPassword=await bcrypt.hash(password,10);
            await db.query('Insert into users (firstName,lastName,email,password) values ($1,$2,$3,$4)',[firstName,lastName,email,myEncPassword]);
            const user=await db.query('Select * from users where email=$1',[email]);
            const tokens=genToken(user.rows[0]);
            user.rows[0].password=undefined;
            res.cookie('accessToken', tokens.accessToken, { httpOnly: true, secure: true, sameSite: 'Strict' });
            res.cookie('refreshToken', tokens.refreshToken, { httpOnly: true, secure: true, sameSite: 'Strict' });
            return res.status(201).json({ message: 'Signup successful' });
        }
        catch(error){
            return res.status(400).json({ message: 'Error registering, please try again' });
        }
    })

router
    .route('/login')
    .post(async(req,res)=>{
        try{
            const { email, password } = req.body.formData;

            const user = await db.query('SELECT * FROM users WHERE email=$1', [email]);
            if (user.rows.length === 0) {
                return res.status(400).send('Invalid email or password');
            }
            const hashString = user.rows[0].password.toString();
            const validPassword = await bcrypt.compare(password, hashString);
            if (!validPassword) {
                return res.status(400).send('Invalid email or password');
            }

            const tokens = genToken(user.rows[0]);
            res.cookie('accessToken', tokens.accessToken, { httpOnly: true, secure: true, sameSite: 'Strict' });
            res.cookie('refreshToken', tokens.refreshToken, { httpOnly: true, secure: true, sameSite: 'Strict' });
            res.status(200).json({ message: 'Login successful' });
        }
        catch(error){
            console.log(error);
            res.status(500).json({message:'Error registering, please try again'})
        }
    })

router
    .route('/refresh')
    .post((req, res) => {
        try{
        const { refreshToken } = req.cookies;
      
        if (!refreshToken) {
          return res.status(401).send('Refresh token required');
        }
      
        jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, user) => {
          if (err) {
            return res.status(403).send('Invalid refresh token');
          }
      
          const newAccessToken = jwt.sign({ userId: user.userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRATION });
          res.cookie('accessToken', newAccessToken, { httpOnly: true, secure: true, sameSite: 'Strict' });
          res.status(200).json({ message: 'Token refreshed' });
        });
    }
        catch(error){
            res.status(500).json({ message: 'Refreshing token failed' });
        }
      });

router
    .route('/check')
    .get((req, res) => {
        const accessToken = req.cookies.accessToken;
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
          return res.status(401).json({ isLoggedIn: false });
        }
        try{
            jwt.verify(refreshToken,process.env.JWT_REFRESH_SECRET,(err,user)=>{
                if(err){
                    return res.status(401).json({ isLoggedIn: false });
                }
            })
            return res.status(200).json({ isLoggedIn: true });
        }
        catch(err){
            return res.status(401).json({ isLoggedIn: false });
        }
        
      });

router
    .route('/logout')
    .post((req, res) => {
        try {
          res.cookie('accessToken', '', { expires: new Date(0), httpOnly: true, secure: true, sameSite: 'Strict' });
          res.cookie('refreshToken', '', { expires: new Date(0), httpOnly: true, secure: true, sameSite: 'Strict' });
          res.status(200).json({ message: 'User logged out successfully' });
        } catch (error) {
          res.status(500).json({ message: 'Error logging out, please try again' });
        }
      });
     
router.
      route(`/checkTeam/:id`)
      .get(authenticate,async(req,res)=>{
        const user=req.user;
        const teamid=req.params.id;
        try{
            const result=await db.query(`Select * from teamleader where userid=$1 and teamid=$2`,[user,teamid])
            let ans=(result.rowCount>0);
            res.status(200).json(ans);
        }
        catch(err){
            res.status(500).json({message:'Error checking status'});
        }
      })

router.
      route('/checkTask/:id')
      .get(authenticate,async(req,res)=>{
        const user=req.user;
        const taskid=req.params.id;
        try{
            const result=await db.query(`Select * from tasks join teamleader on tasks.teamid=teamleader.teamid where id=$1 and userid=$2`,[taskid,user])
            let ans=(result.rowCount>0);
            res.status(200).json(ans);
        }
        catch(err){
            res.status(500).json({message:'Error checking status'});
        }
      })
      

     export default router;
