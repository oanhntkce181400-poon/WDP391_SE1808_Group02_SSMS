/**
 * verify-repeat-enrollment-test.js
 * Verify dữ liệu đã seed cho kịch bản repeat enrollment
 */
require('dotenv').config();
const { connectDB } = require('../src/configs/db.config');

// Must require ALL models to ensure they're registered with mongoose
// Order matters: models referenced by others must be required first
const Curriculum = require('../src/models/curriculum.model');
const Major = require('../src/models/major.model');
const Subject = require('../src/models/subject.model');
const Semester = require('../src/models/semester.model');
const Student = require('../src/models/student.model');
const Teacher = require('../src/models/teacher.model');
const ClassSection = require('../src/models/classSection.model');
const ClassEnrollment = require('../src/models/classEnrollment.model');
const RegistrationPeriod = require('../src/models/registrationPeriod.model');
const Payment = require('../src/models/payment.model');
const Schedule = require('../src/models/schedule.model');
const Room = require('../src/models/room.model');

async function verify() {
  await connectDB();

  console.log('🔍 VERIFY: Repeat Enrollment Test Data\n');

  // 1. Student
  const student = await Student.findOne({ studentCode: 'SE260001' }).populate('curriculumId').lean();
  console.log('📋 Student:', student ? `${student.studentCode} - ${student.fullName}` : '❌ NOT FOUND');
  if (student) {
    console.log(`   cohort: K${student.cohort}, enrollmentYear: ${student.enrollmentYear}`);
    console.log(`   currentCurriculumSemester: ${student.currentCurriculumSemester}`);
    console.log(`   curriculum: ${student.curriculumId?.code}`);
  }

  // 2. Enrollments
  const enrollments = await ClassEnrollment.find({ student: student?._id })
    .populate({ path: 'classSection', populate: { path: 'subject', select: 'subjectCode' } })
    .lean();
  console.log('\n📋 Enrollments:');
  for (const e of enrollments) {
    const sub = e.classSection?.subject?.subjectCode;
    const cls = e.classSection?.classCode;
    const sem = e.classSection?.semester;
    const grade = e.grade;
    const status = e.status;
    const isRepeat = sem === 2 && e.classSection?.curriculumSemesterOrder === 1;
    console.log(`   ${sub} | Kỳ ${sem} | ${cls} | grade=${grade ?? 'null'} | status=${status}${isRepeat ? ' (HỌC LẠI)' : ''}`);
  }

  // 3. Check "rớt môn trong khung"
  const failedEnrollment = enrollments.find(e => e.grade !== null && e.grade < 5.0);
  console.log(`\n📋 Rớt môn trong khung: ${failedEnrollment ? '✅ CÓ (grade < 5.0)' : '❌ KHÔNG'}`);
  if (failedEnrollment) {
    console.log(`   Môn: ${failedEnrollment.classSection?.subject?.subjectCode}, grade: ${failedEnrollment.grade}`);
  }

  // 4. hasSubjectEnrollmentHistory → đủ điều kiện học lại
  const repeatClass = await ClassSection.findOne({ classCode: 'SE101-K26-R1' }).populate('subject').lean();
  if (repeatClass) {
    const existingEnrollment = await ClassEnrollment.findOne({
      student: student?._id,
      classSection: { $in: await ClassSection.find({ subject: repeatClass.subject._id }).select('_id').then(docs => docs.map(d => d._id)) },
      status: { $in: ['enrolled', 'completed', 'dropped'] },
    });
    console.log(`\n📋 hasSubjectEnrollmentHistory: ${existingEnrollment ? '✅ TRUE (đủ đk học lại)' : '❌ FALSE'}`);
    console.log(`   Lớp học lại: ${repeatClass.classCode} | status: ${repeatClass.status}`);
    console.log(`   semester: ${repeatClass.semester}, curriculumSemesterOrder: ${repeatClass.curriculumSemesterOrder}`);
  }

  // 5. RegistrationPeriod
  const period = await RegistrationPeriod.findOne({ requestType: 'repeat' }).populate('semester').lean();
  console.log('\n📋 RegistrationPeriod (repeat):', period ? `✅ Tìm thấy: ${period.periodName}` : '❌ NOT FOUND');
  if (period) {
    console.log(`   status: ${period.status}, allowedCohorts: K${period.allowedCohorts.join(', K')}`);
    console.log(`   semester: ${period.semester?.code} (${period.semester?.name})`);
    const now = new Date();
    const active = period.status === 'active' && now >= period.startDate && now <= period.endDate;
    console.log(`   Đang active: ${active ? '✅ CÓ' : '❌ KHÔNG'}`);
  }

  // 6. Payment (Kỳ 2)
  const payment = await Payment.findOne({ student: student?._id, semesterCode: 'K2_SEK26' }).lean();
  console.log('\n📋 Payment Kỳ 2:', payment ? `${payment.semesterCode} | status: ${payment.status}` : '❌ NOT FOUND');
  if (payment) {
    const hasPaid = payment.status === 'completed';
    console.log(`   Đã thanh toán: ${hasPaid ? '✅ CÓ' : '❌ CHƯA → TKB sẽ bị BLOCK'}`);
  }

  // 7. Schedule
  const schedules = await Schedule.find({ classSection: repeatClass?._id }).populate('room').lean();
  console.log('\n📋 Schedule (lớp học lại):');
  if (schedules.length > 0) {
    for (const s of schedules) {
      const days = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
      console.log(`   ${days[s.dayOfWeek]}, Tiết ${s.startPeriod}-${s.endPeriod}, Phòng: ${s.room?.roomCode}`);
    }
  } else {
    console.log('   ❌ Không có schedule');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ VERIFY HOÀN TẤT!');
  process.exit(0);
}

verify().catch(err => {
  console.error('❌ VERIFY FAILED:', err.message);
  process.exit(1);
});
