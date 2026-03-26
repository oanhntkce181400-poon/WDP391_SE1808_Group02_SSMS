/**
 * Xóa toàn bộ dữ liệu ClassSection + Enrollment + Waitlist + Schedule liên quan.
 * Chạy: node clean-classes.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');

async function main() {
  const MONGO_URI = process.env.MONGODB_URI;
  const DB_NAME = process.env.MONGODB_DB_NAME || 'wdp301';

  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
  console.log('✅ Connected\n');

  const db = mongoose.connection.db;

  // Lấy danh sách collection
  const cols = (await db.listCollections().toArray()).map(c => c.name);
  console.log('Collections:', cols.join(', '));

  // Xóa theo thứ tự: enrollment → waitlist → schedule → classsection
  const TARGET_COLLS = [
    'classenrollments',
    'waitlists',
    'schedules',
    'classsections',
  ];

  for (const collName of TARGET_COLLS) {
    if (!cols.includes(collName)) {
      console.log(`⚠️  Collection "${collName}" not found, skipping.`);
      continue;
    }
    const result = await db.collection(collName).deleteMany({});
    console.log(`🗑️  ${collName}: deleted ${result.deletedCount} documents`);
  }

  console.log('\n✅ Done. Tất cả lớp học phần + đăng ký + lịch + chờ đã được xóa.');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
