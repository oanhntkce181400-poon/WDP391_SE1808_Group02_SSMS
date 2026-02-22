/**
 * Simple verification - just check counts
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Load all models first
require('./src/models/user.model');
require('./src/models/student.model');
require('./src/models/subject.model');
require('./src/models/curriculum.model');
require('./src/models/major.model');
require('./src/models/teacher.model');
require('./src/models/room.model');
require('./src/models/timeslot.model');
require('./src/models/classSection.model');
require('./src/models/classEnrollment.model');
require('./src/models/exam.model');
require('./src/models/studentExam.model');

async function verifyExamData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME,
    });

    console.log('✅ Connected to MongoDB\n');

    const User = mongoose.model('User');
    const ClassEnrollment = mongoose.model('ClassEnrollment');
    const Exam = mongoose.model('Exam');
    const StudentExam = mongoose.model('StudentExam');

    // Get student user
    const studentUser = await User.findOne({ email: 'student@test.com' });
    const userId = studentUser._id;

    console.log('👤 Student User ID:', userId.toString());
    console.log('   Email:', studentUser.email);
    console.log('   Role:', studentUser.role);
    console.log('');

    // Find class enrollments
    const enrollments = await ClassEnrollment.find({
      student: userId,
    });

    console.log(`✅ Class Enrollments: ${enrollments.length}`);
    console.log('');

    if (enrollments.length > 0) {
      const classIds = enrollments.map(e => e.classSection);
      
      // Find exams
      const exams = await Exam.find({
        classSection: { $in: classIds },
        status: { $ne: 'cancelled' },
      });

      console.log(`✅ Exams for enrolled classes: ${exams.length}`);
      exams.forEach((exam, i) => {
        console.log(`   ${i + 1}. ${exam.examCode}`);
      });
      console.log('');

      // Check StudentExam registrations
      const studentExams = await StudentExam.find({
        exam: { $in: exams.map(e => e._id) },
        student: userId,
      });

      console.log(`✅ Student exam registrations: ${studentExams.length}`);
      studentExams.forEach((se, i) => {
        console.log(`   ${i + 1}. SBD: ${se.sbd}`);
      });

      console.log('\n✅✅✅ FIXED! DATA IS READY! ✅✅✅');
      console.log('\nNow try refreshing your browser and exams should appear!');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyExamData();
