// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import http from "http";
import { Server } from "socket.io";
import fs from "fs";
import path from "path";


dotenv.config();

const PORT = process.env.PORT || 5000;
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.FRONTEND_URL,methods:["GET", "POST"] } });
app.use(cors());
app.use(express.json({ limit: "50mb" }));

const __dirname = path.resolve();

app.use("/public", express.static(path.join(__dirname, "public")));
const uploadPath = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);

// Track files by room
let roomFiles = {};  // { roomId: [filePaths...] }

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Join room
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  // File upload (store room reference)
  socket.on("file-upload", ({ file, fileName, fileType, roomId }) => {
  const buffer = Buffer.from(new Uint8Array(file));
  const savedName = `${Date.now()}-${fileName}`;
  const filePath = path.join(uploadPath, savedName);
  fs.writeFileSync(filePath, buffer);

  if (!roomFiles[roomId]) roomFiles[roomId] = [];
  roomFiles[roomId].push(filePath);

  // Send the actual saved filename & URL back
  io.to(roomId).emit("file-shared", {
    fileName, // original name
    savedName, // stored name
    fileType: fileType,
    url: `/uploads/${savedName}`
  });
});


  // When a user leaves/disconnects
  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms].filter(r => r !== socket.id); // exclude personal room

    rooms.forEach((roomId) => {
      // Check number of clients in room
      const room = io.sockets.adapter.rooms.get(roomId);
      const numClients = room ? room.size : 0;

      if (numClients === 1) { // this user is the last one
        console.log(`Room ${roomId} is now empty. Deleting files...`);
        
        if (roomFiles[roomId]) {
          roomFiles[roomId].forEach((filePath) => {
            try {
              fs.unlinkSync(filePath);
              console.log("Deleted:", filePath);
            } catch (err) {
              console.error("Error deleting file:", err);
            }
          });
          delete roomFiles[roomId];
        }
      }
    });
  });
});

app.use("/uploads", express.static(uploadPath));

app.get("/download/:filename", (req, res) => {
  const file = path.join(__dirname, "uploads", req.params.filename);
  res.download(file); // This forces the download
});

app.use(express.static(path.join(__dirname, "/frontend/dist")));
app.get(/.*/, (req, res) => {
  res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
