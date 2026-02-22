// seed-finance-data.js
// Script tạo dữ liệu mẫu cho tính năng Học phí
// Chạy: node seed-finance-data.js
//
// Sẽ tạo:
//   • 1 Semester (học kỳ hiện tại, isCurrent = true)
//   • 1 TuitionFee rule cho khóa K18 (pricePerCredit = 630.000đ)
//   • Payments (lịch sử nộp tiền) cho sinh viên huyhmce181719@fpt.edu.vn
//   • OtherFees (các khoản phí khác) cho sinh viên đó

require('dotenv').config();
const mongoose = require('mongoose');

// ── Load models ──────────────────────────────────────────────
const Semester  = require('./src/models/semester.model');
const TuitionFee = require('./src/models/tuitionFee.model');
const Payment   = require('./src/models/payment.model');
const OtherFee  = require('./src/models/otherFee.model');
const Student   = require('./src/models/student.model');
const User      = require('./src/models/user.model');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/wdp301';
const DB_NAME   = process.env.MONGODB_DB_NAME || 'wdp301';
const SEMESTER_CODE = '2025-2026_2'; // Học kỳ 2, năm 2025-2026

async function run() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
  console.log('✅ Connected to DB:', mongoose.connection.db.databaseName);

  // ─── 1. Tạo Semester hiện tại ───────────────────────────────
  console.log('\n📅 Creating/updating current semester...');

  // Xóa cờ isCurrent của các học kỳ khác trước
  await Semester.updateMany({}, { isCurrent: false });

  const semester = await Semester.findOneAndUpdate(
    { code: SEMESTER_CODE },
    {
      code: SEMESTER_CODE,
      name: 'Học kỳ 2 - 2025/2026',
      semesterNum: 2,
      academicYear: '2025-2026',
      startDate: new Date('2026-01-05'),
      endDate:   new Date('2026-05-20'),
      isCurrent: true,
    },
    { upsert: true, new: true },
  );
  console.log(`  ✅ Semester: ${semester.name} (${semester.code})`);

  // ─── 2. Tạo TuitionFee rule cho khóa K18 ────────────────────
  console.log('\n💰 Creating TuitionFee rule for cohort K18...');

  const pricePerCredit = 630_000; // 630.000đ / tín chỉ
  const totalCredits   = 20;      // Giả sử SV đăng ký 20 tín chỉ
  const baseTuitionFee = pricePerCredit * totalCredits; // 12.600.000đ

  await TuitionFee.findOneAndUpdate(
    { cohort: 'K18', academicYear: '2025-2026' },
    {
      semester:       '2',
      cohort:         'K18',
      academicYear:   '2025-2026',
      majorCode:      'CE',
      subjects:       [], // Để trống - chỉ dùng pricePerCredit
      totalCredits,
      baseTuitionFee,
      discounts:      [],
      totalDiscount:  0,
      finalTuitionFee: baseTuitionFee,
      status:         'active',
      notes:          'Seed data - K18 uniform rate',
    },
    { upsert: true, new: true },
  );

  // Cũng tạo cho K18CT (cohort viết tắt khác)
  await TuitionFee.findOneAndUpdate(
    { cohort: '18', academicYear: '2025-2026' },
    {
      semester:       '2',
      cohort:         '18',
      academicYear:   '2025-2026',
      majorCode:      'CE',
      subjects:       [],
      totalCredits,
      baseTuitionFee,
      discounts:      [],
      totalDiscount:  0,
      finalTuitionFee: baseTuitionFee,
      status:         'active',
      notes:          'Seed data - cohort 18 numeric',
    },
    { upsert: true, new: true },
  );

  console.log(`  ✅ TuitionFee: ${pricePerCredit.toLocaleString('vi-VN')}đ/TC cho K18`);

  // ─── 3. Đảm bảo Student record cho tài khoản demo tồn tại ──
  console.log('\n👤 Ensuring demo student record exists...');

  const DEMO_EMAIL = 'student@fpt.edu.vn';

  // Tìm curriculum CE/K18 trong DB
  const Curriculum = require('./src/models/curriculum.model');
  let curriculum = await Curriculum.findOne({ code: 'CEK18' }).lean();
  if (!curriculum) {
    curriculum = await Curriculum.findOne({}).lean();
  }

  if (!curriculum) {
    console.log('  ⚠️  No curriculum found. Run main seed first: node src/database/seeds/index.js');
    await mongoose.disconnect();
    return;
  }

  let testStudent = await Student.findOne({ email: DEMO_EMAIL }).lean();
  if (!testStudent) {
    testStudent = await Student.create({
      studentCode: 'CE181719',
      fullName: 'Nguyen Van A',
      email: DEMO_EMAIL,
      majorCode: 'CE',
      cohort: 18,
      curriculum: curriculum._id,
      isActive: true,
    });
    console.log(`  ✅ Created Student record for ${DEMO_EMAIL}`);
  } else {
    console.log(`  ✅ Found existing student: ${testStudent.fullName} (${testStudent.email})`);
  }

  // ─── 4. Xóa dữ liệu cũ của học kỳ này để tránh trùng ───────
  await Payment.deleteMany({ student: testStudent._id, semesterCode: SEMESTER_CODE });
  await OtherFee.deleteMany({ student: testStudent._id, semesterCode: SEMESTER_CODE });

  // ─── 5. Tạo OtherFees - Các khoản phí khác ─────────────────
  console.log('\n📌 Creating OtherFees...');

  const otherFees = [
    { feeName: 'Phí bảo hiểm y tế',  amount: 575_000 },
    { feeName: 'Phí hoạt động SV',   amount: 200_000 },
    { feeName: 'Phí thư viện',        amount: 100_000 },
  ];

  await OtherFee.insertMany(
    otherFees.map((f) => ({
      student:      testStudent._id,
      semesterCode: SEMESTER_CODE,
      feeName:      f.feeName,
      amount:       f.amount,
    })),
  );

  const totalOtherFees = otherFees.reduce((s, f) => s + f.amount, 0);
  console.log(`  ✅ Created ${otherFees.length} other fees (${totalOtherFees.toLocaleString('vi-VN')}đ total)`);

  // ─── 6. Tạo Payments - Lịch sử nộp tiền ─────────────────────
  console.log('\n💳 Creating Payments...');

  const totalTuition = pricePerCredit * totalCredits + totalOtherFees;
  // Giả sử SV đã nộp 1 đợt (50% tổng)
  const payments = [
    {
      amount: Math.round(totalTuition * 0.5),
      paidAt: new Date('2026-01-10T09:30:00'),
      method: 'bank_transfer',
      note:   'Nộp đợt 1 - Chuyển khoản BIDV',
    },
  ];

  await Payment.insertMany(
    payments.map((p) => ({
      student:      testStudent._id,
      semesterCode: SEMESTER_CODE,
      amount:       p.amount,
      paidAt:       p.paidAt,
      method:       p.method,
      note:         p.note,
    })),
  );

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  console.log(`  ✅ Created ${payments.length} payments (${totalPaid.toLocaleString('vi-VN')}đ total)`);

  // ─── Tóm tắt ────────────────────────────────────────────────
  console.log('\n──────────────────────────────────────────────');
  console.log('📊 Expected TuitionPage output:');
  console.log(`  Học kỳ         : ${semester.name}`);
  console.log(`  Tín chỉ đăng ký: ${totalCredits} TC (từ ClassEnrollment)`);
  console.log(`  Đơn giá/TC     : ${pricePerCredit.toLocaleString('vi-VN')}đ`);
  console.log(`  HP theo TC     : ${(pricePerCredit * totalCredits).toLocaleString('vi-VN')}đ`);
  console.log(`  Phí khác       : ${totalOtherFees.toLocaleString('vi-VN')}đ`);
  console.log(`  TỔNG HP        : ${totalTuition.toLocaleString('vi-VN')}đ`);
  console.log(`  Đã nộp         : ${totalPaid.toLocaleString('vi-VN')}đ`);
  console.log(`  Còn nợ         : ${(totalTuition - totalPaid).toLocaleString('vi-VN')}đ`);
  console.log('──────────────────────────────────────────────\n');

  await mongoose.disconnect();
  console.log('🎉 Done! Seed finance data complete.');
}

run().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
