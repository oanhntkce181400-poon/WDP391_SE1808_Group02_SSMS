/**
 * Create fresh test user account with hardened approach
 * Usage: node create-test-student-account.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function createTestAccount() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME,
    });

    console.log('✅ Connected to MongoDB\n');

    const User = require('./src/models/user.model');
    const Student = require('./src/models/student.model');
    const Major = require('./src/models/major.model');
    const Curriculum = require('./src/models/curriculum.model');
    const ClassSection = require('./src/models/classSection.model');
    const ClassEnrollment = require('./src/models/classEnrollment.model');
    const Subject = require('./src/models/subject.model');

    const testEmail = 'teststudent.grades@example.com';
    const testPassword = 'TestPassword123!';

    console.log('🗑️  CLEANING UP OLD TEST ACCOUNT...');
    // Delete old account if exists
    await User.deleteOne({ email: testEmail });
    const student = await Student.findOne({ email: testEmail });
    if (student) {
      await ClassEnrollment.deleteMany({ student: student._id });
      await Student.deleteOne({ _id: student._id });
    }
    console.log('✅ Old records cleaned\n');

    // ========== CREATE USER ==========
    console.log('👤 CREATING USER...');
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    const newUser = new User({
      email: testEmail,
      password: hashedPassword,
      fullName: 'Test Student - Sinh Viên Kiểm Tra',
      role: 'student',
      emailVerified: true,
      avatar: null,
      isActive: true,
    });
    await newUser.save();
    console.log(`✅ User Created: ${testEmail}\n`);

    // ========== GET MAJOR & CURRICULUM ==========
    console.log('🏢 SETTING UP MAJOR & CURRICULUM...');
    let major = await Major.findOne().sort({ createdAt: 1 });
    if (!major) {
      major = new Major({
        majorCode: 'SE',
        majorName: 'Software Engineering',
        isActive: true,
      });
      await major.save();
    }
    console.log(`✅ Major: ${major.majorCode} - ${major.majorName}`);

    let curriculum = await Curriculum.findOne().sort({ createdAt: 1 });
    if (!curriculum) {
      curriculum = new Curriculum({
        curriculumCode: 'K26',
        cohort: 26,
        title: 'Curriculum K26',
        isActive: true,
        subjects: [],
      });
      await curriculum.save();
    }
    console.log(`✅ Curriculum: ${curriculum.curriculumCode}\n`);

    // ========== CREATE STUDENT ==========
    console.log('🎓 CREATING STUDENT RECORD...');
    const newStudent = new Student({
      userId: newUser._id,
      studentCode: `TEST_GRADES_${Date.now()}`,
      fullName: newUser.fullName,
      email: newUser.email,
      majorCode: major.majorCode,
      majorId: major._id,
      cohort: 2026,
      curriculumId: curriculum._id,
      dateOfBirth: new Date('2000-05-15'),
      gender: 'male',
      academicStatus: 'enrolled',
      enrollmentYear: 2024,
      isActive: true,
    });
    await newStudent.save();
    console.log(`✅ Student Created: ${newStudent.studentCode}\n`);

    // ========== CREATE ENROLLMENTS WITH GRADES ==========
    console.log('📚 CREATING ENROLLMENTS WITH GRADES...');
    const classes = await ClassSection.find().limit(3).populate('subject');

    if (classes.length > 0) {
      for (let i = 0; i < classes.length; i++) {
        const classSection = classes[i];
        const enrollment = new ClassEnrollment({
          classSection: classSection._id,
          student: newStudent._id,
          enrollmentDate: new Date(),
          status: 'completed',
          continuousScore: 7.5 + Math.random() * 2.5,
          ptScores: [
            { type: 'PT1', score: 6.5 + Math.random() * 3.5, updatedAt: new Date() },
            { type: 'PT2', score: 7 + Math.random() * 3, updatedAt: new Date() },
          ],
          assignmentScore: 7.5 + Math.random() * 2.5,
          midtermScore: 7 + Math.random() * 3,
          finalScore: 7.5 + Math.random() * 2.5,
          isFinalized: true,
          submittedAt: new Date(),
        });

        const totalPT = (enrollment.ptScores[0]?.score || 0 + enrollment.ptScores[1]?.score || 0) / 2;
        enrollment.grade = Math.round(
          (enrollment.continuousScore * 0.1 + totalPT * 0.2 + enrollment.assignmentScore * 0.2 +
            enrollment.midtermScore * 0.2 + enrollment.finalScore * 0.3) * 100
        ) / 100;

        await enrollment.save();
        console.log(`✅ Enrollment: ${classSection.className} - Grade: ${enrollment.grade.toFixed(2)}`);
      }
    } else {
      console.log('⚠️  No classes available, skipping enrollments');
    }

    // ========== FINAL VERIFICATION ==========
    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST ACCOUNT CREATED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`\n📧 Email:    ${testEmail}`);
    console.log(`🔐 Password: ${testPassword}`);
    console.log(`👤 Name:     ${newUser.fullName}`);
    console.log(`🎓 ID:       ${newStudent.studentCode}`);
    console.log(`📊 Grades:   ${classes.length} courses`);

    // Verify it was saved
    const verifyUser = await User.findById(newUser._id);
    const verifyStudent = await Student.findById(newStudent._id);

    console.log('\n✅ Verification:');
    console.log(`   User in DB: ${verifyUser ? 'YES ✓' : 'NO ✗'}`);
    console.log(`   Student in DB: ${verifyStudent ? 'YES ✓' : 'NO ✗'}`);

    if (verifyUser) {
      const psswdMatch = await bcrypt.compare(testPassword, verifyUser.password);
      console.log(`   Password Match: ${psswdMatch ? 'YES ✓' : 'NO ✗'}`);
    }

    console.log('\n🚀 Ready to login on mobile app!');
    console.log('='.repeat(60) + '\n');

    await mongoose.connection.close();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.errors) {
      Object.keys(error.errors).forEach(field => {
        console.error(`  ${field}: ${error.errors[field].message}`);
      });
    }
    process.exit(1);
  }
}

createTestAccount();
