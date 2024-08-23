import { db } from "../database/db.js";
import express from "express";
import { authenticate } from "../middleware/authenticate.js";
import { v4 as uuidv4 } from "uuid";

const router=express.Router();

router
    .route('/create')
    .post(authenticate,async(req,res)=>{
        const {teamName}=req.body.formData;
        const user=req.user;
        try{
            const teamCode=uuidv4();
            const dt=await db.query('Insert into teams (TeamName,joincode) values($1,$2) returning id',[teamName,teamCode]);
            
            await db.query('Insert into teamleader (userid,teamid) values($1,$2)',[user,dt.rows[0].id]);
            res.status(201).json({message:"Team formed successfully"});
        }
        catch(error){
            res.status(500).json({message:"Team formation unsuccessful"});
        }
    })
 
router
    .route('/all/joined')
    .get(authenticate, async (req, res) => {
      const user = req.user;
      try {
        const teams = await db.query(
          `select teamid,teamname from teams join teammember on teammember.teamid=teams.id where userid=$1`, 
          [user]
        );
        return res.status(200).json({ teams: teams.rows });
      } catch (error) {
        res.status(500).json({ message: "Can't proceed your request.\n Please try again later." });
      }
    });

router
    .route('/all/created')
    .get(authenticate,async(req,res)=>{
        const user=req.user;
        try{
            const teams = await db.query(
                `SELECT *
                 FROM teams join teamleader on teams.id=teamleader.teamid
                 WHERE teamleader.userid = $1`,
                [user]
            );
            res.status(200).json({teams:teams.rows});
        }
        catch(error){
            res.status(500).json({message:"Can't proceed your request.\n Please try again later."})
        }
    })

router
    .route('/join')
    .post(authenticate,async(req,res)=>{
        const user=req.user;
        const {joinCode}=req.body.formData;
        try{
            const id=await db.query('select id from teams where joincode=$1',[joinCode]);

            if(id.rowCount==0){
                return res.status(403).json({message:"No team found. Please enter correct join code."});
            }
            await db.query('Insert into teamMember (userId,teamId) values($1,$2)',[user,id.rows[0].id]);
            res.status(200).json({message:"Team joined successfully."})
        }
        catch(error){
            res.status(500).json({message:"Can't process your request. Please try again later."})
        }
    })

router
    .route('/update/:id')
    .put(authenticate,async(req,res)=>{
        const user=req.user;
        const id=req.params.id;
        const {teamName}=req.body;
        try{
            await db.query("Update teams set teamName=$1 where id=$2 and teamleader=$3",[teamName,id,user]);
            res.status(200).json({message:"Name changed successfully"});
        }
        catch(error){
            res.status(500).json({message:"Can't proceed your request. Please try again."} );
        }
    })

router
    .route('/delete/:id')
    .delete(authenticate,async(req,res)=>{
        const id=req.params.id;
        try{
            await db.query('delete from teamMember where teamid=$1',[id]);
            await db.query('delete from teamLeader where teamid=$1',[id]);
            await db.query('delete from tasks where teamid=$1',[id]);
            await db.query('delete from teams where id=$1',[id]);
            res.status(200).json({message:"Team deletion succesful"})
        }
        catch(error){
            res.status(500).json({message:"Can't proceed your request. Please try again."} );
        }
    }) 

router
    .route('/:id/member')
    .get(authenticate,async(req,res)=>{ 
        console.log(req.params.id)
        const id=parseInt(req.params.id);
        try{
            const data=await db.query(`SELECT users.id, users.firstname, users.lastname, users.email
            FROM teammember
            JOIN users ON users.id = teammember.userid
            WHERE teammember.teamid = (SELECT teamid FROM tasks WHERE id = $1)`,[id]);
        
            const data2=await db.query(`Select users.id,users.firstname,users.lastname,users.email from teamleader 
                join teams on teams.id=teamleader.teamid 
                join users on users.id=teamleader.userid
                where teams.id=(SELECT teamid FROM tasks WHERE id = $1)`,[id]);
            const combinedData = [...data.rows, ...data2.rows];
            res.status(200).json({members:combinedData});
        }
        catch(error){
            res.status(400).json({message:"Please try again"});
        }
    })
   
router
    .route('/:id/joincode')
    .get(async(req,res)=>{
        try{
            const data=await db.query('Select * from teams where id=$1',[req.params.id]);
            res.status(200).json({jc:data.rows[0]});
        }
        catch(err){
            res.status(500).json({jc:""})
        }
    })

router
    .route('/assigned')
    .post(authenticate,async(req,res)=>{
        const {task}=req.body;
        try{
            const data=await db.query(`Select userid from taskassign where taskid=$1`,[task]);
            let common=[];
            data.rows.forEach(e => {
                common.push(e.userid);
            });
            res.status(200).json(common);
        }
        catch(error){
            res.status(400).json({message:"Please try again"});
        }
    })

export default router;