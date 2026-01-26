const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
  const dbName = process.env.MONGODB_DB_NAME || 'wdp301';

  try {
    await mongoose.connect(uri, {
      dbName,
    });
    console.log(`✅ MongoDB connected to ${uri}/${dbName}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
}

module.exports = {
  connectDB,
};
