require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

async function main() {
  const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wdp301';
  const DB_NAME   = process.env.MONGODB_DB_NAME || 'wdp301';
  console.log('URI:', MONGO_URI, '| DB:', DB_NAME);

  await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
  console.log('Connected to', mongoose.connection.name);

  const Student = require('./src/models/student.model');
  const Attendance = require('./src/models/attendance.model');
  const EnrollmentSnapshot = require('./src/models/enrollmentSnapshot.model');

  // 1. Xóa enrollment snapshots liên quan K26
  const snapResult = await EnrollmentSnapshot.deleteMany({ title: /K26/ });
  console.log('Deleted snapshots:', snapResult.deletedCount);

  // 2. Xóa attendance của 45 SV SE2601 (studentCode bắt đầu bằng SE2601)
  const k26Students = await Student.find({
    studentCode: { $regex: /^SE2601/ },
    cohort: 26,
  }).select('_id').lean();
  const k26Ids = k26Students.map(s => s._id);
  console.log('Found K26 students:', k26Ids.length);

  const attResult = await Attendance.deleteMany({ student: { $in: k26Ids } });
  console.log('Deleted K26 attendance records:', attResult.deletedCount);

  // 3. Kiểm tra lại
  const remaining = await Attendance.countDocuments({ student: { $in: k26Ids } });
  console.log('Remaining K26 attendance:', remaining);

  await mongoose.disconnect();
  console.log('Done');
}

main().catch(console.error);
