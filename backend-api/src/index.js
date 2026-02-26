require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { connectDB } = require("./configs/db.config");
const { initializeSocketIO } = require("./configs/socket.config");
const {
  errorHandler,
  notFoundHandler,
} = require("./middlewares/error.middleware");
const authRoutes = require("./modules/auth/auth.routes");
const actorsRoutes = require("./modules/actors/actors.routes");

const app = express();
const httpServer = http.createServer(app);

function parseCorsOrigins() {
  const raw = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN;
  if (!raw) return true;
  return raw
    .split(",")
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
app.use("/api/subjects", require("./routes/subject.routes"));
app.use("/api/curriculums", require("./routes/curriculum.routes"));
app.use("/api/users", require("./routes/user.routes"));
app.use("/api/settings", require("./routes/settings.routes"));
app.use("/api/auth", authRoutes);
app.use("/api/actors", actorsRoutes);
app.use("/api/rooms", require("./routes/room.routes"));
app.use("/api/timeslots", require("./routes/timeslot.routes"));
app.use("/api/tuition-fees", require("./routes/tuitionFee.routes"));
app.use("/api/majors", require("./routes/major.routes"));
app.use("/api/faculties", require("./routes/faculty.routes"));
app.use("/api/error-logs", require("./routes/errorLog.routes"));
app.use("/api/announcements", require("./routes/announcement.routes"));
app.use("/api/file-proxy", require("./routes/fileProxy.routes"));
app.use("/api/classes", require("./modules/classSection/classSection.routes"));
app.use("/api/classes", require("./modules/schedule/schedule.routes"));
app.use("/api/semesters", require("./modules/semester/semester.routes"));
app.use("/api/lecturers", require("./modules/lecturer/lecturer.routes"));
app.use("/api/exams", require("./routes/exam.routes"));
app.use("/api/feedback-templates", require("./routes/feedbackTemplate.routes"));
app.use(
  "/api/feedback-submissions",
  require("./routes/feedbackSubmission.routes"),
);
app.use(
  "/api/feedback-statistics",
  require("./routes/feedbackStatistics.routes"),
);
app.use("/api/schedules", require("./routes/schedule.routes"));
app.use("/api/requests", require("./routes/request.routes"));
app.use("/api/attendance", require("./routes/attendance.routes"));
app.use("/api/finance", require("./routes/finance.routes"));
app.use("/api/students", require("./routes/student.routes"));
app.use(
  "/api/registration-periods",
  require("./routes/registrationPeriod.routes"),
);
app.use("/api/registrations", require("./routes/registration.routes"));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    console.log("Connecting to database...");
    await connectDB();
    console.log("Database connected, starting HTTP server...");

    // Initialize cron jobs
    const { initializeCronJobs } = require("./jobs/cron");
    initializeCronJobs();

    return new Promise((resolve, reject) => {
      const server = httpServer.listen(PORT, () => {
        console.log(`🚀 Server is running on http://localhost:${PORT}`);
        console.log("✅ Server startup complete");
        resolve();
      });

      server.on("error", (err) => {
        console.error("❌ Server error:", err);
        reject(err);
      });

      // Timeout after 5 seconds if something hangs
      setTimeout(() => {
        console.log("⏱️ Server listening confirmed at port", PORT);
      }, 100);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

// Start server
startServer()
  .then(() => {
    console.log("✨ Server is ready for requests");
  })
  .catch((err) => {
    console.error("❌ Server startup failed:", err);
    process.exit(1);
  });

// Global error handlers
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled rejection:", reason);
  process.exit(1);
});
