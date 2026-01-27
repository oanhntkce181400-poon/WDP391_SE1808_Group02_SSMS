const jwt = require('jsonwebtoken');

/**
 * Middleware xác thực JWT cho Socket.IO
 * Kiểm tra token từ handshake auth hoặc query parameter
 * Chỉ cho phép user đã login mới connect socket được
 * 
 * Sử dụng:
 * io.use(socketAuthMiddleware);
 */
function socketAuthMiddleware(socket, next) {
  try {
    // Lấy token từ handshake (client gửi lên)
    // Client có thể gửi qua: auth.token hoặc query.token
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    // Verify token với JWT_ACCESS_SECRET
    const JWT_SECRET = process.env.JWT_ACCESS_SECRET;
    if (!JWT_SECRET) {
      console.error('JWT_ACCESS_SECRET not configured');
      return next(new Error('Server configuration error'));
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Lưu thông tin user vào socket để dùng sau
    socket.userId = decoded.userId;
    socket.email = decoded.email;
    socket.role = decoded.role;

    console.log(`✅ Socket authenticated: User ${decoded.email} (${decoded.userId})`);

    next(); // Cho phép kết nối
  } catch (error) {
    console.error('Socket authentication failed:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Authentication error: Token expired'));
    }
    
    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Authentication error: Invalid token'));
    }
    
    return next(new Error('Authentication error'));
  }
}

module.exports = {
  socketAuthMiddleware,
};
