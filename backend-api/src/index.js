require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { connectDB } = require('./configs/db.config');
const { initializeSocketIO } = require('./configs/socket.config');
const authRoutes = require('./modules/auth/auth.routes');
const actorsRoutes = require('./modules/actors/actors.routes');

const app = express();
const httpServer = http.createServer(app);

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

// Routes
app.use('/api/subjects', require('./routes/subject.routes'));
app.use('/api/curriculums', require('./routes/curriculum.routes'));
app.use('/api/rooms', require('./routes/room.routes'));
app.use('/api/timeslots', require('./routes/timeslot.routes'));
app.use('/api/tuition-fees', require('./routes/tuitionFee.routes'));
app.use('/api/majors', require('./routes/major.routes'));

// Health check đơn giản
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/actors', actorsRoutes);

const PORT = process.env.PORT || 3000;

async function startServer() {
  await connectDB();

  // Khởi tạo Socket.IO với JWT authentication
  const io = initializeSocketIO(httpServer);
  
  // Lưu io instance vào app để dùng ở các routes khác (nếu cần)
  app.set('io', io);

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`🔌 Socket.IO is ready for connections`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
