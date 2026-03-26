/**
 * Xóa toàn bộ sinh viên K26 (SE2601xxx, cohort 26) và dữ liệu liên quan:
 * ClassEnrollment, Attendance, snapshot K26, User tài khoản SV, các bản ghi ref Student khác.
 *
 * Chạy từ thư mục backend-api:  node clean-k26-students.js
 */
require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wdp301';
const DB_NAME = process.env.MONGODB_DB_NAME || 'wdp301';

async function main() {
  await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
  console.log('Connected:', mongoose.connection.name);

  const Student = require('./src/models/student.model');
  const User = require('./src/models/user.model');
  const ClassEnrollment = require('./src/models/classEnrollment.model');
  const ClassSection = require('./src/models/classSection.model');
  const Attendance = require('./src/models/attendance.model');
  const EnrollmentSnapshot = require('./src/models/enrollmentSnapshot.model');
  const Waitlist = require('./src/models/waitlist.model');
  const CourseWishlist = require('./src/models/courseWishlist.model');
  const Payment = require('./src/models/payment.model');
  const PaymentOrder = require('./src/models/paymentOrder.model');
  const TuitionBill = require('./src/models/tuitionBill.model');
  const FeedbackSubmission = require('./src/models/feedbackSubmission.model');
  const OtherFee = require('./src/models/otherFee.model');
  const GradeChangeLog = require('./src/models/gradeChangeLog.model');
  const Request = require('./src/models/request.model');
  const StudentExam = require('./src/models/studentExam.model');

  const k26Students = await Student.find({
    studentCode: { $regex: /^SE2601/ },
    cohort: 26,
  })
    .select('_id userId')
    .lean();

  const k26Ids = k26Students.map((s) => s._id);
  const userIds = k26Students.map((s) => s.userId).filter(Boolean);

  console.log('K26 students found:', k26Ids.length);

  if (k26Ids.length === 0) {
    await mongoose.disconnect();
    console.log('Nothing to delete.');
    return;
  }

  // Giảm currentEnrollment trên ClassSection trước khi xóa enrollment
  const bySection = await ClassEnrollment.aggregate([
    { $match: { student: { $in: k26Ids } } },
    { $group: { _id: '$classSection', n: { $sum: 1 } } },
  ]);
  for (const row of bySection) {
    await ClassSection.updateOne(
      { _id: row._id },
      { $inc: { currentEnrollment: -row.n } },
    );
  }
  console.log('Adjusted currentEnrollment on', bySection.length, 'class sections');

  const del = async (label, promise) => {
    const r = await promise;
    const n = r.deletedCount ?? r.modifiedCount ?? 0;
    console.log(`  ${label}:`, n);
  };

  await del('ClassEnrollment', ClassEnrollment.deleteMany({ student: { $in: k26Ids } }));
  await del('Attendance', Attendance.deleteMany({ student: { $in: k26Ids } }));
  await del('EnrollmentSnapshot (title K26)', EnrollmentSnapshot.deleteMany({ title: /K26/i }));
  await del('Waitlist', Waitlist.deleteMany({ student: { $in: k26Ids } }));
  await del('CourseWishlist', CourseWishlist.deleteMany({ student: { $in: k26Ids } }));
  await del('Payment', Payment.deleteMany({ student: { $in: k26Ids } }));
  await del('PaymentOrder', PaymentOrder.deleteMany({ studentId: { $in: k26Ids } }));
  await del('TuitionBill', TuitionBill.deleteMany({ student: { $in: k26Ids } }));
  await del('FeedbackSubmission', FeedbackSubmission.deleteMany({ submittedBy: { $in: k26Ids } }));
  await del('OtherFee', OtherFee.deleteMany({ student: { $in: k26Ids } }));
  await del('GradeChangeLog', GradeChangeLog.deleteMany({ student: { $in: k26Ids } }));
  await del('Request', Request.deleteMany({ student: { $in: k26Ids } }));
  await del('StudentExam', StudentExam.deleteMany({ student: { $in: k26Ids } }));

  await del('Student', Student.deleteMany({ _id: { $in: k26Ids } }));

  if (userIds.length) {
    await del('User (K26 accounts)', User.deleteMany({ _id: { $in: userIds } }));
  }

  await ClassSection.updateMany({ currentEnrollment: { $lt: 0 } }, { $set: { currentEnrollment: 0 } });

  const left = await Student.countDocuments({
    studentCode: { $regex: /^SE2601/ },
    cohort: 26,
  });
  console.log('Remaining K26 students:', left);

  await mongoose.disconnect();
  console.log('Done. Chạy: node seed-K26-no-snapshot.js');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
