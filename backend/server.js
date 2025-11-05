import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectToMongoDB from './config/mongodb.js';
import connectCloudinary from './config/cloudnary.js';
import adminRouter from './routes/adminRoute.js';
import doctorRouter from './routes/doctorRoute.js'; 
import userRouter from './routes/userRoute.js';
import { Server } from 'socket.io';  
import http from 'http';  
import jwt from 'jsonwebtoken';
import messageModel from './models/messageModel.js';
import appointmentModel from './models/appointmentModel.js';

// cloudinary configuration
connectCloudinary();

// app configuration
const app = express();  // create express app instance use this to define the routes and middlewares
const PORT = process.env.PORT || 8000;  // define the port for the server

const server = http.createServer(app);
const io = new Server(server, {  
  path: "/socket.io/",
  cors: {  
    origin: ["http://localhost:5173", "http://localhost:5174"], // Vite dev servers  
    credentials: true  
  }  
});

// Socket.IO authentication middleware  

// This code is a Socket.IO authentication middleware that verifies a user’s identity before allowing a WebSocket connection. 
// It takes the JWT token sent by the client, checks its validity using the server’s secret key, and if valid, 
// attaches the user’s ID and type (user or doctor) to the socket for later use. If the token is invalid or missing, 
// it rejects the connection with an authentication error.

io.use((socket, next) => {  
  const token = socket.handshake.auth.token;  
  try {  
    const decoded = jwt.verify(token, process.env.JWT_SECRET);  
    socket.userId = decoded.id;  
    socket.userType = decoded.type; // 'user' or 'doctor'  
    next();  
  } catch (error) {  
    next(new Error('Authentication error'));  
  }  
});  




// Socket.IO connection handling  
io.on('connection', (socket) => {  

  console.log(`User connected: ${socket.userId}`);  
  // Join a personal room based on role to support inbox updates
  if (socket.userType === 'user') {
    socket.join(`user-${socket.userId}`);
  } else if (socket.userType === 'doctor') {
    socket.join(`doctor-${socket.userId}`);
  }
    
  // Join appointment-specific room  
  socket.on('join-appointment', (appointmentId) => {  
    socket.join(`appointment-${appointmentId}`);  
  });  
    
  // Handle incoming messages  
  socket.on('send-message', async (data) => {  
    const { appointmentId, message } = data;  
      
    // Save to database  
    const newMessage = new messageModel({  
      appointmentId,  
      senderId: socket.userId,  
      senderType: socket.userType,  
      message  
    });  
    await newMessage.save();  
      
    // Broadcast to appointment room  
    io.to(`appointment-${appointmentId}`).emit('receive-message', {  
      ...newMessage.toObject(),  
      timestamp: new Date()  
    });  


    // This code handles the process of notifying the user and doctor in real-time whenever there’s an update related to their shared appointment.
    //  It does so by emitting an event to their respective Socket.io rooms (user-${userId} and doctor-${doctorId}). The front-end would listen for these events and update the inbox UI for both participants.
    // Emit inbox update events to both participants' personal rooms
    try {
      const appt = await appointmentModel.findById(appointmentId).lean();
      if (appt) {
        io.to(`user-${appt.userId}`).emit('inbox-update', { appointmentId });
        io.to(`doctor-${appt.docId}`).emit('inbox-update', { appointmentId });
      }
    } catch (err) {
      console.error('Failed to emit inbox-update:', err.message);
    }
  });  
    
  socket.on('disconnect', () => {  
    console.log(`User disconnected: ${socket.userId}`);  
  });  
});  
  

//	This code handles real-time communication between connected clients using Socket.IO.
//  When a user connects, the server logs their ID and allows them to join a specific “appointment room” based on the appointment ID.
//  When a message is sent, the server saves it to the database with the sender’s details and 
// then broadcasts it to everyone in that appointment room so both the doctor and patient see it instantly.
//  It also logs when users disconnect, and finally, the server starts listening for incoming connections on the specified port


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
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

