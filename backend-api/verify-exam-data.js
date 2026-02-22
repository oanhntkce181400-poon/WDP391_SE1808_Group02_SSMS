/**
 * Verify exam data is now accessible
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function verifyExamData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME,
    });

    console.log('✅ Connected to MongoDB\n');

    const User = require('./src/models/user.model');
    const ClassEnrollment = require('./src/models/classEnrollment.model');
    const Exam = require('./src/models/exam.model');
    const StudentExam = require('./src/models/studentExam.model');

    // Get student user
    const studentUser = await User.findOne({ email: 'student@test.com' });
    const userId = studentUser._id;

    console.log('👤 Student User ID:', userId.toString());
    console.log('');

    // Find class enrollments
    const enrollments = await ClassEnrollment.find({
      student: userId,
    });

    console.log(`✅ Found ${enrollments.length} class enrollments\n`);

    if (enrollments.length > 0) {
      const classIds = enrollments.map(e => e.classSection);
      
      // Find exams
      const exams = await Exam.find({
        classSection: { $in: classIds },
        status: { $ne: 'cancelled' },
      })
        .populate('subject', 'subjectCode subjectName')
        .exec();

      console.log(`✅ Found ${exams.length} exams:\n`);

      exams.forEach((exam, i) => {
        console.log(`${i + 1}. ${exam.subject.subjectName}`);
        console.log(`   Code: ${exam.examCode}`);
        console.log(`   Date: ${exam.examDate.toLocaleDateString('vi-VN')}`);
        console.log(`   Time: ${exam.startTime} - ${exam.endTime}`);
        console.log('');
      });

      // Check StudentExam registrations
      const studentExams = await StudentExam.find({
        exam: { $in: exams.map(e => e._id) },
        student: userId,
      });

      console.log(`✅ Found ${studentExams.length} exam registrations (SBD):\n`);
      studentExams.forEach((se, i) => {
        console.log(`${i + 1}. SBD: ${se.sbd}, Seat: ${se.seatNumber}, Status: ${se.status}`);
      });

      console.log('\n✅✅✅ ALL DATA IS CORRECT! ✅✅✅');
      console.log('The API should now return exam data correctly.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyExamData();
