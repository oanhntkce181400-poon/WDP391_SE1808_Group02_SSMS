const mongoose = require('mongoose');

function getDbConfig() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
  const dbName = process.env.MONGODB_DB_NAME || 'wdp301';
  const appName = process.env.MONGODB_APP_NAME || 'backend-api';

  return { uri, dbName, appName };
}

function sanitizeUriForLog(uri) {
  if (!uri) return uri;
  // Hide credentials in mongodb+srv://user:pass@host format.
  return uri.replace(/(mongodb(?:\+srv)?:\/\/)([^:@/]+):([^@/]+)@/i, '$1***:***@');
}

async function connectDB() {
  const { uri, dbName, appName } = getDbConfig();

  try {
    await mongoose.connect(uri, {
      dbName,
      appName,
      serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 5000),
      maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE || 10),
    });
    console.log(`MongoDB connected to ${sanitizeUriForLog(uri)}/${dbName}`);
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
}

module.exports = {
  connectDB,
  getDbConfig,
};
