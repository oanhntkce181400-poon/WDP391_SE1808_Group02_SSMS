const mongoose = require('mongoose');
const User = require('./src/models/user.model');
const Student = require('./src/models/student.model');
const Major = require('./src/models/major.model');
const Curriculum = require('./src/models/curriculum.model');
const ClassEnrollment = require('./src/models/classEnrollment.model');
const ClassSection = require('./src/models/classSection.model');
const { connectDB } = require('./src/configs/db.config');

async function seedTestData() {
  try {
    await connectDB();
    console.log('✓ Connected to MongoDB');

    // Find the test student user
    const user = await User.findById('697ab37924dc848b87f25d0f');
    console.log('\n=== USER ===');
    console.log('Email:', user?.email);

    if (!user) {
      console.log('❌ User not found!');
      process.exit(1);
    }

    // Find or create a major
    let major = await Major.findOne();
    if (!major) {
      console.log('❌ No major found! Please create a major first');
      process.exit(1);
    }
    console.log('Major:', major.majorCode, '-', major.majorName);

    // Find or create a curriculum
    let curriculum = await Curriculum.findOne();
    if (!curriculum) {
      console.log('❌ No curriculum found! Please create a curriculum first');
      process.exit(1);
    }
    console.log('Curriculum:', curriculum.curriculumCode);

    // Find or create a class section
    let classSection = await ClassSection.findOne();
    if (!classSection) {
      console.log('❌ No class section found! Please create a class section first');
      process.exit(1);
    }
    console.log('Class:', classSection.className);

    console.log('\n=== CREATING STUDENT RECORD ===');

    // Check if student already exists
    let student = await Student.findOne({ userId: user._id });
    if (student) {
      console.log('✓ Student record already exists:', student._id);
    } else {
      // Create student record with all required fields
      student = new Student({
        userId: user._id,
        studentCode: 'STU_' + Date.now(), // Unique code
        fullName: user.fullName,
        email: user.email,
        majorCode: major.majorCode,
        cohort: 2024,
        curriculum: curriculum._id,
        dateOfBirth: new Date('2000-01-01'),
        gender: 'M',
        status: 'active',
      });
      await student.save();
      console.log('✓ Created student record:', student._id);
    }

    console.log('\n=== CREATING ENROLLMENT ===');

    // Check if already enrolled
    let enrollment = await ClassEnrollment.findOne({
      student: student._id,
      classSection: classSection._id,
    });

    if (enrollment) {
      console.log('✓ Enrollment already exists');
    } else {
      enrollment = new ClassEnrollment({
        student: student._id,
        classSection: classSection._id,
        status: 'enrolled',
        enrollmentDate: new Date(),
      });
      await enrollment.save();
      console.log('✓ Created enrollment:', enrollment._id);
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
    if (error.errors) {
      Object.keys(error.errors).forEach(field => {
        console.error(`  ${field}: ${error.errors[field].message}`);
      });
    }
    process.exit(1);
  }
}

seedTestData();
