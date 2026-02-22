/**
 * Debug exam data and relationships
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function debugExamData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME,
    });

    console.log('✅ Connected to MongoDB\n');

    const User = require('./src/models/user.model');
    const Student = require('./src/models/student.model');
    const ClassEnrollment = require('./src/models/classEnrollment.model');
    const Exam = require('./src/models/exam.model');

    // Get student user
    const studentUser = await User.findOne({ email: 'student@test.com' });
    console.log('👤 Student User:');
    console.log('   ID:', studentUser._id);
    console.log('   Email:', studentUser.email);
    console.log('   Role:', studentUser.role);
    console.log('');

    // Get student record
    const student = await Student.findOne({ studentCode: 'SE181001' });
    console.log('📚 Student Record:');
    console.log('   ID:', student._id);
    console.log('   Code:', student.studentCode);
    console.log('   Email:', student.email);
    console.log('');

    // Check if IDs match
    console.log('🔍 ID Comparison:');
    console.log('   User ID:', studentUser._id.toString());
    console.log('   Student ID:', student._id.toString());
    console.log('   IDs Match:', studentUser._id.toString() === student._id.toString() ? '✅ YES' : '❌ NO');
    console.log('');

    // Find class enrollments using Student ID
    const enrollments = await ClassEnrollment.find({
      student: student._id,
    }).populate('classSection', 'classCode className');

    console.log(`📝 Class Enrollments (using Student ID): ${enrollments.length}`);
    enrollments.forEach((e, i) => {
      console.log(`   ${i + 1}. ${e.classSection.classCode} - Status: ${e.status}`);
    });
    console.log('');

    // Find class enrollments using User ID
    const enrollmentsWithUserId = await ClassEnrollment.find({
      student: studentUser._id,
    }).populate('classSection', 'classCode className');

    console.log(`📝 Class Enrollments (using User ID): ${enrollmentsWithUserId.length}`);
    enrollmentsWithUserId.forEach((e, i) => {
      console.log(`   ${i + 1}. ${e.classSection.classCode} - Status: ${e.status}`);
    });
    console.log('');

    // Find exams
    if (enrollments.length > 0) {
      const classIds = enrollments.map(e => e.classSection._id);
      const exams = await Exam.find({
        classSection: { $in: classIds },
      }).populate('subject', 'subjectName').populate('classSection', 'classCode');
      
      console.log(`📋 Exams (using Student ID): ${exams.length}`);
      exams.forEach((e, i) => {
        console.log(`   ${i + 1}. ${e.subject.subjectName} - Class: ${e.classSection.classCode}`);
      });
    }

    console.log('\n❓ PROBLEM:');
    console.log('   The API is using User ID but ClassEnrollment references Student ID.');
    console.log('   This is why no exams are found!\n');

    console.log('✅ SOLUTION: Creating a link between User and Student...\n');

    // Add userId to Student record
    student.userId = studentUser._id;
    await student.save();

    console.log('✅ Added userId to Student record');
    console.log('   Student now has userId:', student.userId.toString());

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

debugExamData();
