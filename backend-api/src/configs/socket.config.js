const { Server } = require('socket.io');
const { socketAuthMiddleware } = require('../middlewares/socket.middleware');

function initializeSocketIO(httpServer) {
  function parseCorsOrigins() {
    const raw = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN;
    if (!raw) return '*';
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const io = new Server(httpServer, {
    cors: {
      origin: parseCorsOrigins(),
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    console.log(`🔌 New socket connection: ${socket.id}`);
    console.log(`   User: ${socket.email} (ID: ${socket.userId})`);

    socket.join(`user:${socket.userId}`);

    socket.emit('welcome', {
      message: 'Connected to SSMS Socket Server',
      userId: socket.userId,
      socketId: socket.id,
    });

    socket.on('disconnect', (reason) => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
      console.log(`   User: ${socket.email}`);
      console.log(`   Reason: ${reason}`);
    });

    socket.on('ping', (data) => {
      socket.emit('pong', { 
        message: 'pong', 
        timestamp: Date.now(),
        receivedData: data 
      });
    });

    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  io.sendToUser = function (userId, event, data) {
    io.to(`user:${userId}`).emit(event, data);
  };

  io.broadcastToAll = function (event, data) {
    io.emit(event, data);
  };

  console.log('✅ Socket.IO initialized with JWT authentication');

  return io;
}

module.exports = {
  initializeSocketIO,
};
