const ErrorLog = require('../models/errorLog.model');
const logger = require('../utils/logger');

/**
 * Global error handling middleware
 * Catches all errors and formats response
 */
function errorHandler(err, req, res, next) {
  // Default error values
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';
  let errorType = err.name || 'Error';

  // Determine error type
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorType = 'ValidationError';
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  } else if (err.name === 'CastError') {
    statusCode = 400;
    errorType = 'DatabaseError';
    message = 'Invalid ID format';
  } else if (err.code === 11000) {
    statusCode = 409;
    errorType = 'DatabaseError';
    const field = Object.keys(err.keyPattern)[0];
    message = `${field} already exists`;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorType = 'AuthenticationError';
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorType = 'AuthenticationError';
    message = 'Token expired';
  } else if (err.name === 'MongoError' || err.name === 'MongooseError') {
    errorType = 'DatabaseError';
  }

  // Prepare error response
  const errorResponse = {
    statusCode,
    message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl || req.url,
    method: req.method,
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  // Log error to file
  logger.error(`${errorType}: ${message}`, {
    statusCode,
    path: req.originalUrl || req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    stack: err.stack,
  });

  // Save error to database (async, don't wait)
  saveErrorToDatabase({
    statusCode,
    message,
    path: req.originalUrl || req.url,
    method: req.method,
    errorType,
    stack: err.stack,
    userId: req.user?._id,
    userEmail: req.user?.email,
    requestBody: req.body,
    requestQuery: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  }).catch((saveErr) => {
    logger.error('Failed to save error to database:', saveErr);
  });

  // Send error response
  res.status(statusCode).json(errorResponse);
}

/**
 * Save error log to database
 */
async function saveErrorToDatabase(errorData) {
  try {
    await ErrorLog.create(errorData);
  } catch (err) {
    // Ignore errors when saving error logs
    console.error('Error saving to database:', err);
  }
}

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res, next) {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  error.name = 'NotFoundError';
  next(error);
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
