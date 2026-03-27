/**
 * Check enrollments directly
 * Usage: node check-enrollments-direct.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function checkEnrollments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME,
    });

    console.log('✅ Connected to MongoDB\n');

    const User = require('./src/models/user.model');
    const Student = require('./src/models/student.model');
    const ClassEnrollment = require('./src/models/classEnrollment.model');

    const testEmail = 'teststudent.grades@example.com';

    const user = await User.findOne({ email: testEmail });
    const student = await Student.findOne({ userId: user._id });

    // Count all enrollments for this student
    const count = await ClassEnrollment.countDocuments({ student: student._id });
    console.log(`📊 Enrollment count for student ${student._id}: ${count}\n`);

    if (count === 0) {
      console.log('❌ NO ENROLLMENTS FOUND!');
      console.log('\n🔧 Solution: Comment on the first enrollment creation script');
      console.log('   Run: node create-test-student-account.js\n');
    } else {
      // Get all enrollments without populate
      const enrollments = await ClassEnrollment.find({ student: student._id }).lean();
      
      console.log(`✅ Found ${enrollments.length} enrollments:\n`);
      enrollments.forEach((e, idx) => {
        console.log(`[${idx + 1}] Enrollment ${e._id}`);
        console.log(`    classSection: ${e.classSection}`);
        console.log(`    grade: ${e.grade}`);
        console.log(`    status: ${e.status}`);
        console.log(`    midtermScore: ${e.midtermScore}`);
        console.log(`    finalScore: ${e.finalScore}\n`);
      });
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

checkEnrollments();
