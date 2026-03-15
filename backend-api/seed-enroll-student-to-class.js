/**
 * Seed: Enroll student to class for testing grade entry
 * Purpose: Add student@test.com to the class created by seed-assign-class-to-teacher.js
 * Usage: node seed-enroll-student-to-class.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function enrollStudent() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME,
    });

    console.log('✅ Connected to MongoDB');

    // Get models
    const User = require('./src/models/user.model');
    const Student = require('./src/models/student.model');
    const ClassSection = require('./src/models/classSection.model');
    const ClassEnrollment = require('./src/models/classEnrollment.model');

    // Step 1: Find student user
    console.log('\n📍 Step 1: Finding student user...');
    const studentUser = await User.findOne({ email: 'student@test.com' });
    if (!studentUser) {
      throw new Error('Student user not found. Please run seed-test-user.js first.');
    }
    console.log('✅ Found student user:', studentUser.email);

    // Step 2: Find or create student profile
    console.log('\n📍 Step 2: Finding/creating student profile...');
    let student = await Student.findOne({ userId: studentUser._id });
    
    if (!student) {
      console.log('⚠️  Student profile not found, creating...');
      student = new Student({
        userId: studentUser._id,
        email: studentUser.email,
        fullName: studentUser.fullName,
        studentCode: 'CE18' + Math.floor(Math.random() * 9000 + 1000),
        cohort: '18',
        majorCode: 'CE',
        curriculumCode: 'CEK18',
        status: 'active',
        enrollmentYear: 2023,
      });
      await student.save();
      console.log('✅ Created student profile:', student.studentCode);
    } else {
      console.log('✅ Found student profile:', student.studentCode);
    }

    // Step 3: Find the class created by teacher
    console.log('\n📍 Step 3: Finding class section...');
    const classSection = await ClassSection.findOne({ classCode: 'CLS00004' });
    if (!classSection) {
      throw new Error('Class CLS00004 not found. Please run seed-assign-class-to-teacher.js first.');
    }
    console.log('✅ Found class:', classSection.classCode);

    // Step 4: Check if already enrolled
    console.log('\n📍 Step 4: Checking existing enrollment...');
    let enrollment = await ClassEnrollment.findOne({
      student: student._id,
      classSection: classSection._id,
    });

    if (enrollment) {
      console.log('⚠️  Student already enrolled in this class');
      console.log('📊 Enrollment status:', enrollment.status);
      console.log('📊 Current grades:', {
        midtermScore: enrollment.midtermScore || 'Not set',
        finalScore: enrollment.finalScore || 'Not set',
        assignmentScore: enrollment.assignmentScore || 'Not set',
        continuousScore: enrollment.continuousScore || 'Not set',
      });
    } else {
      // Step 5: Create enrollment
      console.log('\n📍 Step 5: Creating enrollment...');
      enrollment = new ClassEnrollment({
        student: student._id,
        classSection: classSection._id,
        academicYear: classSection.academicYear,
        semester: classSection.semester,
        status: 'enrolled',
        enrollmentDate: new Date(),
        enrollmentType: 'regular',
      });

      await enrollment.save();
      console.log('✅ Enrollment created successfully');

      // Update class enrollment count
      classSection.currentEnrollment += 1;
      await classSection.save();
      console.log('✅ Updated class enrollment count');
    }

    console.log('\n' + '='.repeat(60));
    console.log('📋 ===== Enrollment Summary =====');
    console.log('='.repeat(60));
    console.log('Student Code      :', student.studentCode);
    console.log('Student Name      :', student.fullName);
    console.log('Student Email     :', student.email);
    console.log('Class Code        :', classSection.classCode);
    console.log('Class Name        :', classSection.className);
    console.log('Subject           :', classSection.subject);
    console.log('Semester          :', classSection.semester);
    console.log('Academic Year     :', classSection.academicYear);
    console.log('Enrollment Status :', enrollment.status);
    console.log('='.repeat(60));
    console.log('\n✨ Student can now see this class in their dashboard!');
    console.log('🎯 Teacher can now grade this student at: /lecturer/grades/' + classSection._id);
    console.log('👨‍🎓 Student can view grades at: /student/grades');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

enrollStudent();
