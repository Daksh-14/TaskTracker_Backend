import { db } from "../database/db.js";
import express from "express";
import { authenticate } from "../middleware/authenticate.js";
import { uploadfiles ,deleteFromCloudinary} from "../cloudinary.js";
import { storage } from "../middleware/multerUpload.js";
import multer from 'multer';
const upload = multer({ storage: storage });
const router = express.Router();

router
  .route('/:id/create')
  .post(authenticate, upload.array('files', 10), async (req, res) => {
    const user = req.user;
    const teamId=parseInt(req.params.id);
    const { title ,description ,dueDate ,links} = req.body;
    const files = req.files;
    const teamLeaderCheck = await db.query('SELECT * FROM teamleader WHERE teamid=$1 AND userid=$2', [teamId, user]);
    let rd=new Date();
    rd=rd.toUTCString();
    let dd=dueDate;
    if (teamLeaderCheck.rowCount === 0) {
      return res.status(403).json({ message: 'You are not authorized to create tasks for this team.' });
    }

    try {
      let fileUrls = [];
      if (files && files.length > 0) {
        for (const file of files) {
          const uploadedFile = await uploadfiles(file.path);
          if (uploadedFile) {
            fileUrls.push(uploadedFile.url);
          }
        }
      }
      let newlink=links;
      if(!links){
        newlink=[];
      }
      const result = await db.query(
        'INSERT INTO tasks (title, description, teamId, fileUrls, assigndate, duedate, createdby, links) VALUES ($1, $2, $3, $4, $5, $6, $7,$8) RETURNING id',
        [title, description, teamId, JSON.stringify(fileUrls), rd, dd, user,JSON.stringify(newlink)]
      );
    
      // The ID of the newly inserted task
      const newTaskId = result.rows[0].id;
      
      res.status(201).json({id:newTaskId,user});
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Can't proceed your request. Please try again later." });
    }
  });

router
    .route('/addtask')
    .post(authenticate,async(req,res)=>{
        const {uid,taskid}=req.body;
        try{
           
          await db.query('Insert into taskassign(userid,taskId) values($1,$2)',[uid,taskid]);
            
          res.status(200).json({message:"Task assignment successful"});
        }catch(error){
            res.status(500).json({message:"Task assignment failed"});
        }
    }) 

router
    .route('/:id/all')
    .get(authenticate,async(req,res)=>{
      const teamid=parseInt(req.params.id);
      const user=req.user;
      try{
        const data=await db.query(`Select taskid,title,duedate,firstname,lastname from taskassign join tasks on tasks.id=taskassign.taskid join users on users.id=tasks.createdby
            where taskassign.userid=$1 and tasks.teamid=$2`,[user,teamid]);
            console.log(data.rows);
      res.status(200).json(data.rows);
        }
        catch(err){
          res.status(404).json({message:"tasks retrival failed"});
        }
    })
 
router
    .route('/findall')
    .get(authenticate,async(req,res)=>{
      const user=req.user;
      try{
      const data=await db.query(`Select title,duedate,taskid,status from taskassign join tasks on tasks.id=taskassign.taskid where taskassign.userid=$1`,[user]);
      res.status(200).json(data.rows);
      }
      catch(err){
        res.status(500).json({message:"tasks here retrival failed"});
      }
    })

router
    .route('/getstatus/all')
    .get(authenticate,async(req,res)=>{
      const user=req.user;
      try{
        const data=await db.query(`Select status from taskassign where userid=$1`,[user]);
        res.status(200).json(data.rows);
      }
      catch(err){
        res.status(500).json({message:"Try again"}) 
      }
    })

router
    .route('/:id/update')
    .get(authenticate,async(req,res)=>{
      const taskid=req.params.id;
      try{
        const data=await db.query('Select * from tasks where id=$1',[taskid]);
        const mem=await db.query('select * from taskassign where taskid=$1',[taskid]);
        res.status(200).json({Form:data.rows[0],assigned:mem.rows});
      }
      catch(error){
        res.status(500).json({message:"task retrival failed"});
      }
    })
    .put(authenticate,upload.array('files', 10),async(req,res)=>{
      const { title, description, dueDate, links } = req.body;
      const files = req.files;
      const user = req.user;
      const taskId = req.params.id;
      try {
        // Fetch the existing task details
        const taskResult = await db.query('SELECT fileUrls, links FROM tasks WHERE id=$1', [taskId]);
        if (taskResult.rowCount === 0) {
          return res.status(404).json({ message: 'Task not found.' });
        }
        const existingTask = taskResult.rows[0];
        let existingFileUrls = JSON.parse(existingTask.fileurls || '[]');
        let existingLinks = JSON.parse(existingTask.links || '[]');

        // Upload new files if any
        let newFileUrls = [];
        if (files && files.length > 0) {
          for (const file of files) {
            const uploadedFile = await uploadfiles(file.path);
            if (uploadedFile) {
              newFileUrls.push(uploadedFile.url);
            }
          }
        }

        // Append new links to existing ones
        let updatedLinks = existingLinks.concat(links || []);
        // Append new file URLs to existing ones
        let updatedFileUrls = existingFileUrls.concat(newFileUrls);
        // Update the task in the database
        await db.query(
          'UPDATE tasks SET title=$1, description=$2, duedate=$3, fileUrls=$4, links=$5 WHERE id=$6 ',
          [title, description, dueDate, JSON.stringify(updatedFileUrls), JSON.stringify(updatedLinks), taskId]
        );

        res.status(200).json({ message: 'Task updated successfully.' });
      } catch (error) {
        res.status(500).json({ message: "Can't proceed with your request. Please try again later." });
      }

    })

router
    .route('/:id/file/update')
    .get(authenticate,async(req,res)=>{
      const task=req.params.id;
      try{
        const urls=await db.query(`Select fileurls,links from tasks where id=$1`,[task]);
        res.status(200).json(urls.rows[0]);
      }
      catch(err){
        res.status(500).json({message:'file fetch failed'});
      }
    })
    .put(authenticate,async(req,res)=>{
      const { files, links } = req.body;
    const taskId = req.params.id;
    try {
      // Fetch the existing task data
      const existingTask = await db.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
      if (existingTask.rowCount === 0) {
        return res.status(404).json({ message: 'Task not found' });
      }

      const taskData = existingTask.rows[0];

      // Merge the new data with the existing task data
      const updatedTask = {
        ...taskData,
        fileurls: JSON.stringify(files),
        links: JSON.stringify(links),
      };
      await db.query(
        'UPDATE tasks SET title = $1, description = $2, teamid = $3, fileurls = $4, assigndate = $5, duedate = $6, createdby = $7, links = $8 WHERE id = $9',
        [
          updatedTask.title,
          updatedTask.description,
          updatedTask.teamid,
          updatedTask.fileurls,
          updatedTask.assigndate,
          updatedTask.duedate,
          updatedTask.createdby,
          updatedTask.links,
          taskId,
        ]
      );

      res.status(200).json({ message: 'Task updated successfully.' });
    } catch (err) {
      res.status(500).json({ message: "Can't proceed with your request. Please try again later." });
    }
    })

router.
    route('/delete')
    .post(async(req,res)=>{
      const {taskid}=req.body;
      try{
      await db.query('delete from taskassign where taskid=$1',[taskid]);
      await db.query('delete from tasks where id=$1',[taskid]);
      res.status(200).json({ message: 'Task deleted successfully.' });
      }
      catch(err){
        res.status(500).json({ message: 'Task deletion failed.' });
      }
    })

router
    .route(`/filesdelete`)
    .post(async(req,res)=>{
      const {files}=req.body;
      files.forEach(url => {
        try{
        deleteFromCloudinary(url)
        }
        catch(err){

        }
      });
      res.status(200);
    })

router
    .route(`/remove`)
    .post(async(req,res)=>{
      const {uid,taskid}=req.body;
      try{
        await db.query(`Delete from taskassign where taskid=$1 and userid=$2`,[taskid,uid]);
        res.status(200).json({message:"Task assignment successful"});
      }
      catch(err){
        res.status(500).json({message:'failed'});
      }
      res.status(200);
    })

router
    .route(`/:id/assigned`)
    .get(authenticate,async(req,res)=>{
      const user=req.user;
      const taskid=req.params.id;
      try{
        const data=await db.query(`Select users.id, users.firstname, users.lastname, users.email from taskassign join users on users.id=taskassign.userid where taskid=$1 `,[taskid]);
        res.status(200).json(data.rows);
      }
      catch(error){
        res.status(500).json({message:'failed'});
      }
    })

router
    .route('/:id')
    .get(authenticate,async(req,res)=>{
      const taskid=parseInt(req.params.id);
      const user=req.user;
      try{
      const data=await db.query(`Select * from taskassign join tasks on tasks.id=taskassign.taskid join users on users.id=tasks.createdby
          where taskid=$1`,[taskid]);
      res.status(200).json(data.rows);
      }
      catch(err){
        res.status(404).json({message:"task retrival failed"});
      }
    })

export default router;
