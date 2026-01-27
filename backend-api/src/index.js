require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { connectDB } = require('./configs/db.config');
const authRoutes = require('./modules/auth/auth.routes');
const actorsRoutes = require('./modules/actors/actors.routes');

const app = express();

function parseCorsOrigins() {
  const raw = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN;
  if (!raw) return true;
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// Middlewares chung
app.use(
  cors({
    origin: parseCorsOrigins(),
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());

// Health check đơn giản
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/actors', actorsRoutes);

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
