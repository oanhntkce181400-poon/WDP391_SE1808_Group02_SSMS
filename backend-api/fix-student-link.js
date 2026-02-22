/**
 * Fix: Link Student record to User account
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function fixStudentLink() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME,
    });

    console.log('✅ Connected to MongoDB\n');

    const User = require('./src/models/user.model');
    const Student = require('./src/models/student.model');
    const ClassEnrollment = require('./src/models/classEnrollment.model');

    // Get student user
    const studentUser = await User.findOne({ email: 'student@test.com' });
    console.log('👤 Found Student User:');
    console.log('   ID:', studentUser._id);
    console.log('   Email:', studentUser.email);
    console.log('');

    // Get student record
    let student = await Student.findOne({ studentCode: 'SE181001' });
    console.log('📚 Found Student Record (BEFORE):');
    console.log('   ID:', student._id);
    console.log('   Code:', student.studentCode);
    console.log('');

    // SOLUTION: Update all ClassEnrollments to use User ID instead of Student ID
    // First, find enrollments with old student ID
    const enrollmentsOld = await ClassEnrollment.find({
      student: student._id,
    });

    console.log(`Found ${enrollmentsOld.length} enrollments with old Student ID\n`);

    if (enrollmentsOld.length > 0) {
      // Update each enrollment to use User ID
      for (const enrollment of enrollmentsOld) {
        enrollment.student = studentUser._id;
        await enrollment.save();
      }
      console.log('✅ Updated all enrollments to use User ID\n');
    }

    // Delete old student record
    await Student.deleteOne({ _id: student._id });
    console.log('🗑️  Deleted old Student record\n');

    // Create new Student record with User ID
    const newStudent = new Student({
      _id: studentUser._id, // Use same ID as User
      studentCode: 'SE181001',
      fullName: 'Test Student',
      email: 'student@test.com',
      majorCode: 'SE',
      cohort: 18,
      curriculum: student.curriculum,
      isActive: true,
    });

    await newStudent.save();
    console.log('✅ Created new Student record with User ID');
    console.log('   ID:', newStudent._id);
    console.log('');

    // Verify enrollments now work
    const enrollmentsVerify = await ClassEnrollment.find({
      student: studentUser._id,
    }).populate('classSection', 'classCode className');

    console.log(`✅ Verified: Found ${enrollmentsVerify.length} enrollments`);
    enrollmentsVerify.forEach((e, i) => {
      console.log(`   ${i + 1}. ${e.classSection.classCode}`);
    });

    console.log('\n✅ SUCCESS! Student-User link is now fixed!');
    console.log('   The API will now work correctly.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixStudentLink();
