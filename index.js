import express from "express";
import cookieParser from "cookie-parser";
import authRoutes from './routes/Auth.js';
import {db} from './database/db.js'
import teamRoutes from './routes/Team.js'
import taskRoutes from './routes/Task.js'
import cors from 'cors';
const PORT=3000;
const app=express();

const corsOptions = {
    origin: 'http://localhost:5173', // Your frontend URL
    credentials: true, // Allow credentials (cookies) to be sent
  };

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use('/auth',authRoutes);
app.use('/team',teamRoutes);
app.use('/task',taskRoutes)

try{
    db.connect();
}
catch{
    console.log("The connection to database failed");
}
const server=app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
})

server.on("close",()=>{
    console.log("Server is shutting down. Closing DB connection...");
    db.end((err) => {
        if (err) {
            console.error("Error closing DB connection:", err);
        } else {
            console.log("DB connection closed successfully.");
        }
    });
})