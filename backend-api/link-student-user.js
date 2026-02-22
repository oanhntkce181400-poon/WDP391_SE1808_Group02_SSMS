const mongoose = require('mongoose');
const User = require('./src/models/user.model');
const Student = require('./src/models/student.model');
const ClassEnrollment = require('./src/models/classEnrollment.model');
const ClassSection = require('./src/models/classSection.model');
const { connectDB } = require('./src/configs/db.config');

async function linkStudentToUser() {
  try {
    await connectDB();
    console.log('✓ Connected to MongoDB');

    // Find the test student user
    const user = await User.findById('697ab37924dc848b87f25d0f');
    console.log('\n=== USER ===');
    console.log('Email:', user?.email);
    console.log('ID:', user?._id);

    if (!user) {
      console.log('❌ User not found!');
      process.exit(1);
    }

    // Find student by email
    const student = await Student.findOne({ email: user.email });
    console.log('\n=== STUDENT ===');
    console.log('Found:', !!student);
    if (student) {
      console.log('ID:', student._id);
      console.log('Current userId:', student.userId);
      console.log('Code:', student.studentCode);
    } else {
      console.log('❌ Student not found!');
      process.exit(1);
    }

    // Link userId if not already linked
    if (!student.userId) {
      student.userId = user._id;
      await student.save();
      console.log('\n✓ Linked userId to student');
    } else {
      console.log('\n✓ UserId already linked');
    }

    // Find or create enrollment
    const classSection = await ClassSection.findOne();
    console.log('\n=== CLASS ===');
    console.log('Class:', classSection?.className);

    let enrollment = await ClassEnrollment.findOne({
      student: student._id,
      classSection: classSection._id,
    });

    if (!enrollment) {
      enrollment = new ClassEnrollment({
        student: student._id,
        classSection: classSection._id,
        status: 'enrolled',
        enrollmentDate: new Date(),
      });
      await enrollment.save();
      console.log('\n✓ Created enrollment');
    } else {
      console.log('\n✓ Enrollment already exists');
    }

    console.log('\n=== VERIFYING DATA ===');
    const enrollments = await ClassEnrollment.find({ student: student._id }).populate('classSection');
    console.log('Total enrollments:', enrollments.length);
    enrollments.forEach((e, idx) => {
      console.log(`[${idx + 1}] ${e.classSection?.className} (${e.status})`);
    });

    await mongoose.connection.close();
    console.log('\n✓ Done');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

linkStudentToUser();
