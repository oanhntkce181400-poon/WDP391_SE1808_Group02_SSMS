const { Server } = require('socket.io');
const { socketAuthMiddleware } = require('../middlewares/socket.middleware');

/**
 * Cấu hình và khởi tạo Socket.IO server
 * @param {http.Server} httpServer - HTTP server từ Express
 * @returns {Server} - Socket.IO server instance
 * 
 * File này xử lý:
 * 1. Tạo Socket.IO server với CORS config
 * 2. Áp dụng JWT authentication middleware
 * 3. Handle các sự kiện connection/disconnect
 */
function initializeSocketIO(httpServer) {
  // Parse CORS origins từ environment variable
  function parseCorsOrigins() {
    const raw = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN;
    if (!raw) return '*'; // Allow all nếu không config
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Tạo Socket.IO server
  const io = new Server(httpServer, {
    cors: {
      origin: parseCorsOrigins(),
      credentials: true,
      methods: ['GET', 'POST'],
    },
    // Các config bổ sung
    pingTimeout: 60000, // 60 giây
    pingInterval: 25000, // 25 giây
  });

  // Áp dụng authentication middleware
  // Middleware này sẽ check JWT token trước khi cho phép connect
  io.use(socketAuthMiddleware);

  // Xử lý khi có user kết nối
  io.on('connection', (socket) => {
    console.log(`🔌 New socket connection: ${socket.id}`);
    console.log(`   User: ${socket.email} (ID: ${socket.userId})`);

    // Tự động join room theo userId (để dễ gửi message riêng cho user)
    socket.join(`user:${socket.userId}`);

    // Gửi welcome message cho client
    socket.emit('welcome', {
      message: 'Connected to SSMS Socket Server',
      userId: socket.userId,
      socketId: socket.id,
    });

    // Handle event disconnect
    socket.on('disconnect', (reason) => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
      console.log(`   User: ${socket.email}`);
      console.log(`   Reason: ${reason}`);
    });

    // Handle custom events (ví dụ)
    socket.on('ping', (data) => {
      socket.emit('pong', { 
        message: 'pong', 
        timestamp: Date.now(),
        receivedData: data 
      });
    });

    // Error handling
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });

    /**
     * Thêm các event handlers khác ở đây
     * Ví dụ:
     * 
     * socket.on('join_room', (roomId) => {
     *   socket.join(roomId);
     *   io.to(roomId).emit('user_joined', { userId: socket.userId });
     * });
     * 
     * socket.on('send_message', (data) => {
     *   io.to(data.roomId).emit('new_message', { 
     *     from: socket.userId, 
     *     message: data.message 
     *   });
     * });
     */
  });

  // Hàm helper để gửi message tới user cụ thể (dùng userId)
  io.sendToUser = function (userId, event, data) {
    io.to(`user:${userId}`).emit(event, data);
  };

  // Hàm helper để broadcast tới tất cả connected users
  io.broadcastToAll = function (event, data) {
    io.emit(event, data);
  };

  console.log('✅ Socket.IO initialized with JWT authentication');

  return io;
}

module.exports = {
  initializeSocketIO,
};
