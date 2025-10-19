import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectToMongoDB from './config/mongodb.js';
import connectCloudinary from './config/cloudnary.js';

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


//api endpoints

app.get('/', (req, res) => {
  res.status(200).send('Hello, World!');
});

// server listener
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});