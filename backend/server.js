import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectToMongoDB from './config/mongodb.js';
import connectCloudinary from './config/cloudnary.js';
import adminRouter from './routes/adminRoute.js';
import doctorRouter from './routes/doctorRoute.js'; 
import userRouter from './routes/userRoute.js';

// cloudinary configuration
connectCloudinary();

// app configuration
const app = express();  // create express app instance use this to define the routes and middlewares
const PORT = process.env.PORT || 8000;  // define the port for the server


// database connection
connectToMongoDB();

// middlewares
app.use(cors());  
app.use(express.json());

// simple request logger to help debug missing routes
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} -> ${req.method} ${req.originalUrl}`);
  next();
});

// Register admin routes
app.use('/api/admin', adminRouter);

app.use('/api/doctor',doctorRouter)
app.use('/api/user',userRouter)

//api endpoints

app.get('/', (req, res) => {
  res.status(200).send('Hello, World!');
});

// server listener
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});