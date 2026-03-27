/**
 * Debug - Check test student data
 * Usage: node debug-test-student.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function debugTestStudent() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME,
    });

    console.log('✅ Connected to MongoDB\n');

    const User = require('./src/models/user.model');
    const Student = require('./src/models/student.model');
    const ClassEnrollment = require('./src/models/classEnrollment.model');

    const testEmail = 'teststudent.grades@example.com';

    // 1. Find user
    console.log('🔍 Step 1: Find User');
    const user = await User.findOne({ email: testEmail });
    if (!user) {
      console.log('❌ User not found!');
      process.exit(1);
    }
    console.log(`✅ User found: ${user._id}`);
    console.log(`   Email: ${user.email}\n`);

    // 2. Find student
    console.log('🔍 Step 2: Find Student');
    const student = await Student.findOne({ userId: user._id });
    if (!student) {
      console.log('❌ Student not found!');
      process.exit(1);
    }
    console.log(`✅ Student found: ${student._id}`);
    console.log(`   Code: ${student.studentCode}`);
    console.log(`   Name: ${student.fullName}\n`);

    // 3. Find enrollments
    console.log('🔍 Step 3: Find Enrollments');
    const enrollments = await ClassEnrollment.find({ student: student._id })
      .populate('classSection', 'className semester academicYear')
      .populate('subject', 'subjectCode subjectName');

    console.log(`Found: ${enrollments.length} enrollments\n`);

    if (enrollments.length === 0) {
      console.log('❌ Problem: No enrollments found!');
      console.log('\nSolution: Create enrollments using:');
      console.log('   node create-test-student-account.js');
    } else {
      enrollments.forEach((e, idx) => {
        console.log(`[${idx + 1}] ${e.classSection?.className}`);
        console.log(`    Grade: ${e.grade || 'null'}`);
        console.log(`    Status: ${e.status}\n`);
      });
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

debugTestStudent();
