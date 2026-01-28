const jwt = require('jsonwebtoken');

function socketAuthMiddleware(socket, next) {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const JWT_SECRET = process.env.JWT_ACCESS_SECRET;
    if (!JWT_SECRET) {
      console.error('JWT_ACCESS_SECRET not configured');
      return next(new Error('Server configuration error'));
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    socket.userId = decoded.userId;
    socket.email = decoded.email;
    socket.role = decoded.role;

    console.log(`✅ Socket authenticated: User ${decoded.email} (${decoded.userId})`);

    next();
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
