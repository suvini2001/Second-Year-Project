import express from "express";
import cors from "cors";
import "dotenv/config";
import connectToMongoDB from "./config/mongodb.js";
import connectCloudinary from "./config/cloudnary.js";
import adminRouter from "./routes/adminRoute.js";
import doctorRouter from "./routes/doctorRoute.js";
import userRouter from "./routes/userRoute.js";
import { Server } from "socket.io";
import http from "http";
import jwt from "jsonwebtoken";
import messageModel from "./models/messageModel.js";
import appointmentModel from "./models/appointmentModel.js";
import mongoose from "mongoose";

// cloudinary configuration
connectCloudinary();

// app configuration
const app = express(); // create express app instance use this to define the routes and middlewares
const PORT = process.env.PORT || 8000; // define the port for the server

const server = http.createServer(app);
const io = new Server(server, {
  path: "/socket.io/",
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"], // Vite dev servers
    credentials: true,
  },
});

// Expose io for controllers that need to emit outside socket handlers (e.g., after REST reads)
global.io = io;

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
    next(new Error("Authentication error"));
  }
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.userId}`);
  // Join a personal room based on role to support inbox updates
  if (socket.userType === "user") {
    socket.join(`user-${socket.userId}`);
  } else if (socket.userType === "doctor") {
    socket.join(`doctor-${socket.userId}`);
  }

  // Join appointment-specific room
  socket.on("join-appointment", (appointmentId) => {
    socket.join(`appointment-${appointmentId}`);
  });

  // Handle incoming messages with acknowledgements and deduplication
  socket.on("send-message", async (data, ack) => {
    // safe ack helper so we don't crash if client didn't pass a function
    const reply = (payload) => {  //checks if ack is actually a function before calling it (to avoid errors if the client didn’t pass one).
      try {
        if (typeof ack === "function") ack(payload);
      } catch (_) {} //ensures that even if something goes wrong in the client’s ack, the server won’t crash.
    };

    try {
      const { appointmentId, message, clientMessageId } = data || {};

      //Prevents wasted DB work and gives the client immediate actionable errors.
      // 1) Validate payload
      if (!appointmentId || typeof appointmentId !== "string") {
        return reply({ ok: false, error: "Invalid appointmentId" });
      }
      if (
        !message ||
        typeof message !== "string" ||
        message.trim().length === 0
      ) {
        return reply({ ok: false, error: "Message text is required" });
      }

      // 2) Verify appointment exists and socket user participates in it--Authorization
      let appt;
      try {
        appt = await appointmentModel.findById(appointmentId).lean();  // tries to find an apponiment in the DB - lean -->plain JS object not a mongoDB document which is faster when reading
      } catch (error) {
        return reply({ ok: false, error: "Invalid appointment reference" });
      }
      if (!appt) {
        return reply({ ok: false, error: "Appointment not found" });
      }
      //check if the current appointment belongs either user or a doctor / this ensures only participants can send messages in that chat 
      const isParticipant =
        (socket.userType === "user" && String(appt.userId) === String(socket.userId)) || (socket.userType === "doctor" && String(appt.docId) === String(socket.userId));
      if (!isParticipant) {
        return reply({
          ok: false,
          error: "Unauthorized to message in this appointment",
        });
      }

      // 3) Try to insert message (with optional clientMessageId for dedup)
      let savedMessage;  // creates a new mesage document using messageModel
      try {
        const newMessage = new messageModel({
          appointmentId,
          senderId: socket.userId,
          senderType: socket.userType,
          message,
          ...(clientMessageId ? { clientMessageId } : {}),
        });
        savedMessage = await newMessage.save();
      } catch (err) {
        // Handle duplicate on (senderId, clientMessageId)
        //If MongoDB throws a duplicate key error (code === 11000) — meaning this message (same senderId + clientMessageId) was already saved — it retrieves the existing one instead.
        if (err && err.code === 11000 && clientMessageId) {
          savedMessage = await messageModel
            .findOne({ senderId: socket.userId, clientMessageId })
            .lean();
          if (!savedMessage) {
            // rare race: index says dup but document not found yet
            return reply({
              ok: false,
              error: "Duplicate message detected but not retrievable",
            });
          }
        } else {
          console.error("send-message save error:", err);
          return reply({ ok: false, error: "Failed to send message" });
        }
      }

      // Ensure we have a plain object for broadcasting/ack
      const msgObj =
        typeof savedMessage?.toObject === "function"   //If true → it means savedMessage is a Mongoose document.//If false → it means it’s already a plain object (like if you got it using .lean() earlier).
          ? savedMessage.toObject()    // hat converts the document into a plain JavaScript object.
          : savedMessage;

      // 4) Broadcast to appointment room (include clientMessageId if present)
      io.to(`appointment-${appointmentId}`).emit("receive-message", msgObj);

      // 5) Keep existing inbox updates
      try {
        io.to(`user-${appt.userId}`).emit("inbox-update", { appointmentId }); //Emits 'inbox-update' events to both the user and doctor’s private rooms.
        io.to(`doctor-${appt.docId}`).emit("inbox-update", { appointmentId });
      } catch (emitErr) {
        console.error(
          "Failed to emit inbox-update:",
          emitErr?.message || emitErr
        );
      }

      // 6) Acknowledge success
      return reply({ ok: true, message: msgObj });
    } catch (unexpected) {
      console.error("send-message unexpected error:", unexpected);
      return reply({ ok: false, error: "Unexpected error" });
    }
  });

  // Optional: Explicit "messages-read" event so UIs can flip to ✓✓ immediately
  // Client emits when chat is brought to foreground/focused
  socket.on("messages-read", async (data = {}, ack) => {
    const reply = (payload) => {
      try {
        if (typeof ack === "function") ack(payload);
      } catch (_) {}
    };

    //Extract and validate appointmentId
    try {
      const { appointmentId } = data;
      if (!appointmentId || typeof appointmentId !== "string") {
        return reply({ ok: false, error: "Invalid appointmentId" });
      }

      // Verify participation in the appointment//Fetch the appointment from the database
      let appt;
      try {
        appt = await appointmentModel.findById(appointmentId).lean();
      } catch (e) {
        return reply({ ok: false, error: "Invalid appointment reference" });
      }
      if (!appt) return reply({ ok: false, error: "Appointment not found" });
      //Check if the socket user belongs to this appointment
      const isParticipant =
        (socket.userType === "user" && String(appt.userId) === String(socket.userId)) ||
        (socket.userType === "doctor" && String(appt.docId) === String(socket.userId));
      if (!isParticipant) return reply({ ok: false, error: "Unauthorized" });

      const readAt = new Date();
      const opposite = socket.userType === "user" ? "doctor" : "user";
      // Mark all unread messages sent by the opposite side as read

      //Update unread messages in the database
      await messageModel.updateMany(
        { appointmentId, senderType: opposite, isRead: false },
        { $set: { isRead: true, readAt } }
      );

      // Notify both sides so senders can flip their ticks instantly
      const payload = { appointmentId, by: socket.userType, readAt };
      io.to(`appointment-${appointmentId}`).emit("messages-read", payload);
      
      //Acknowledge success back to requester
      return reply({ ok: true });

      //Handle unexpected server errors
    } catch (err) {
      console.error("messages-read error:", err);
      return reply({ ok: false, error: "Unexpected error" });
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.userId}`);
  });
});

//	This code handles real-time communication between connected clients using Socket.IO.
//  When a user connects, the server logs their ID and allows them to join a specific “appointment room” based on the appointment ID.
//  When a message is sent, the server saves it to the database with the sender’s details and
// then broadcasts it to everyone in that appointment room so both the doctor and patient see it instantly.
//  It also logs when users disconnect, and finally, the server starts listening for incoming connections on the specified port

// database connection
// Here’s what syncIndexes() does:
// Mongoose looks at all the indexes you defined in your schema (like { appointmentId: 1, timestamp: 1 }, { senderId: 1, clientMessageId: 1 }, etc.).
// Then it compares them to the indexes currently stored in MongoDB for that collection.
// If any defined indexes are missing, it creates them.

connectToMongoDB();

mongoose.connection.once("open", async () => {
  console.log("MongoDB connected. Syncing indexes...");
  // Ensure schema-defined indexes exist and obsolete ones are dropped
  await messageModel.createIndexes();
  console.log("Message indexes synced!");
});

// middlewares
app.use(cors());
app.use(express.json());

// simple request logger to help debug missing routes
app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} -> ${req.method} ${req.originalUrl}`
  );
  next();
});

// Register admin routes
app.use("/api/admin", adminRouter);

app.use("/api/doctor", doctorRouter);
app.use("/api/user", userRouter);

//api endpoints

app.get("/", (req, res) => {
  res.status(200).send("Hello, World!");
});

// server listener
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
