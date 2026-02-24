const { Server } = require('socket.io');
const logger = require('../utils/logger');

let io = null;

// Initializes Socket.io server attached to the HTTP server — notifications only
const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:5173',
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    // Handle new client connections
    io.on('connection', (socket) => {
        logger.info(`Socket connected: ${socket.id}`);

        // Each user joins their personal notification room on authentication
        socket.on('join', (userId) => {
            if (userId) {
                socket.join(`user-${userId}`);
                logger.info(`User ${userId} joined notification room`);
            }
        });

        socket.on('disconnect', () => {
            logger.info(`Socket disconnected: ${socket.id}`);
        });
    });

    logger.info('Socket.io initialized (notifications only)');
    return io;
};

// Returns the current Socket.io instance for emitting events
const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized — call initSocket first');
    }
    return io;
};

module.exports = { initSocket, getIO };
