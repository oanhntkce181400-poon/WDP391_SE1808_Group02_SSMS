/**
 * Fix StudentExam records to reference correct User ID
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Load all models
require('./src/models/user.model');
require('./src/models/student.model');
require('./src/models/classSection.model');
require('./src/models/classEnrollment.model');
require('./src/models/exam.model');
require('./src/models/studentExam.model');

async function fixStudentExams() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME,
    });

    console.log('✅ Connected to MongoDB\n');

    const User = mongoose.model('User');
    const StudentExam = mongoose.model('StudentExam');
    const Exam = mongoose.model('Exam');

    // Get student user
    const studentUser = await User.findOne({ email: 'student@test.com' });
    const userId = studentUser._id;

    console.log('👤 Student User ID:', userId.toString());
    console.log('');

    // Find all exams
    const exams = await Exam.find({});
    console.log(`Found ${exams.length} total exams\n`);

    const examIds = exams.map(e => e._id);

    // Find all StudentExam records for these exams
    const allStudentExams = await StudentExam.find({
      exam: { $in: examIds },
    });

    console.log(`Found ${allStudentExams.length} StudentExam records\n`);

    // Update each StudentExam to use the correct User ID
    let updated = 0;
    for (const studentExam of allStudentExams) {
      if (!studentExam.student.equals(userId)) {
        console.log(`Updating StudentExam: ${studentExam.sbd}`);
        console.log(`  Old student ID: ${studentExam.student}`);
        studentExam.student = userId;
        console.log(`  New student ID: ${studentExam.student}`);
        await studentExam.save();
        updated++;
      }
    }

    console.log(`\n✅ Updated ${updated} StudentExam records\n`);

    // Verify
    const verifyStudentExams = await StudentExam.find({
      exam: { $in: examIds },
      student: userId,
    });

    console.log(`✅ Final verification: ${verifyStudentExams.length} StudentExam records found for user`);
    verifyStudentExams.forEach((se) => {
      console.log(`   - SBD: ${se.sbd}, Exam: ${se.exam}, Status: ${se.status}`);
    });

    console.log('\n✅ ALL FIXED! Refresh browser to see exams!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixStudentExams();
