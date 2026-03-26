require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wdp301');
  console.log('Connected');

  const Attendance = require('./src/models/attendance.model');
  const EnrollmentSnapshot = require('./src/models/enrollmentSnapshot.model');

  // Xem tất cả snapshot
  const snaps = await EnrollmentSnapshot.find({}).select('title').lean();
  console.log('Snapshots:', snaps.map(s => s.title).join('\n  '));

  // Xem attendance gần đây
  const recent = await Attendance.find({}).sort({ createdAt: -1 }).limit(5).lean();
  console.log('\nRecent attendance slotIds:', recent.map(a => a.slotId));

  // Xóa theo ObjectId của curriculum K26_SE_2026
  const Curriculum = require('./src/models/curriculum.model');
  const cur = await Curriculum.findOne({ code: 'K26_SE_2026' }).lean();
  console.log('\nCurriculum K26_SE_2026:', cur ? cur._id : 'NOT FOUND');

  await mongoose.disconnect();
  console.log('Done');
}

main().catch(console.error);
