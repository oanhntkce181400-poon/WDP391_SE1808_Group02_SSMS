/**
 * fix-registration-period-date.js
 * 1) Kéo [startDate, endDate] của đợt đăng ký repeat để BAO PHỦ ngày hiện tại (điều kiện BE).
 * 2) Gắn lại semester = học kỳ hệ thống đúng mã (vd 2025-2026_2) — tránh lệch ObjectId sau khi admin sửa/xóa học kỳ.
 *
 * Chạy: npm run fix:registration-period-date
 */
require('dotenv').config();
const { connectDB } = require('../src/configs/db.config');

const RegistrationPeriod = require('../src/models/registrationPeriod.model');
const Semester = require('../src/models/semester.model');

const DEFAULT_SEMESTER_CODE = process.env.FIX_RP_SEMESTER_CODE || '2025-2026_2';

async function fix() {
  await connectDB();

  const now = new Date();
  const period = await RegistrationPeriod.findOne({ requestType: 'repeat' });

  if (!period) {
    console.log('❌ Không tìm thấy RegistrationPeriod requestType=repeat');
    process.exit(1);
  }

  const sem = await Semester.findOne({ code: DEFAULT_SEMESTER_CODE }).lean();
  if (!sem) {
    console.log(`❌ Không tìm thấy Semester code=${DEFAULT_SEMESTER_CODE} — tạo/sửa học kỳ trong Admin hoặc đặt FIX_RP_SEMESTER_CODE`);
    process.exit(1);
  }

  period.startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  period.endDate = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000);
  period.status = 'active';
  period.semester = sem._id;
  await period.save();

  console.log('✅ Đã cập nhật RegistrationPeriod (repeat):');
  console.log(`   periodName: ${period.periodName}`);
  console.log(`   semester:   ${DEFAULT_SEMESTER_CODE} (${sem._id})`);
  console.log(`   startDate: ${period.startDate.toISOString().slice(0, 10)}`);
  console.log(`   endDate:   ${period.endDate.toISOString().slice(0, 10)}`);
  console.log(`   status: ${period.status}`);
  console.log('\n🎉 Đợt đăng ký khớp BE (startDate <= hôm nay <= endDate) và khớp học kỳ Kỳ 2. F5 trang đăng ký SV.');
  process.exit(0);
}

fix().catch((err) => {
  console.error('❌ FAILED:', err.message);
  process.exit(1);
});
