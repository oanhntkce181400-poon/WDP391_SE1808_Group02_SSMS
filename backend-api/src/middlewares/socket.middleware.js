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

    const userId = decoded.userId || decoded.sub || decoded.id;
    if (!userId) {
      return next(new Error('Authentication error: Invalid token payload'));
    }

    socket.userId = String(userId);
    socket.email = decoded.email || null;
    socket.role = decoded.role || null;

    console.log(`✅ Socket authenticated: User ${socket.email || 'unknown'} (${socket.userId})`);

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
