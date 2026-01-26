require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { connectDB } = require('./configs/db.config');

const app = express();

// Middlewares chung
app.use(cors());
app.use(express.json());

// Health check đơn giản
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
