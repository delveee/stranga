require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // TODO: Restrict in production
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('STRANGA Server Running');
});

const matchingEngine = require('./utils/matching');

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // User joins the pool
    socket.on('join-pool', (data) => {
        const { interests, filters } = data || {};
        console.log(`User ${socket.id} joined pool`, interests);

        const match = matchingEngine.addUser(socket.id, interests, filters);

        if (match) {
            console.log(`Match found: ${socket.id} <-> ${match.partnerId}`);
            // Notify both users
            io.to(socket.id).emit('match-found', { partnerId: match.partnerId, initiator: true });
            io.to(match.partnerId).emit('match-found', { partnerId: socket.id, initiator: false });
        }
    });

    // Relay WebRTC Signals
    socket.on('signal', (data) => {
        // data: { to, signal }
        io.to(data.to).emit('signal', { from: socket.id, signal: data.signal });
    });

    // Explicit ICE Candidate Relay (Critical for reliability)
    socket.on('ice-candidate', (data) => {
        // data: { to, candidate }
        io.to(data.to).emit('ice-candidate', { from: socket.id, candidate: data.candidate });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        const partnerId = matchingEngine.removeUser(socket.id);
        if (partnerId) {
            io.to(partnerId).emit('partner-disconnected');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
