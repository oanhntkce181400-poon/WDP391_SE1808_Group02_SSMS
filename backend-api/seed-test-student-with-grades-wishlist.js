/**
 * Seed test student account with Grades and Wishlist data
 * Usage: node seed-test-student-with-grades-wishlist.js
 * 
 * This script creates a test student account with:
 * - Grade data across multiple classes (soft data - dynamically fetched)
 * - Wishlist entries for courses
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function seedTestStudentWithGradesAndWishlist() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME,
    });

    console.log('✅ Connected to MongoDB\n');

    // Import models
    const User = require('./src/models/user.model');
    const Student = require('./src/models/student.model');
    const Major = require('./src/models/major.model');
    const Curriculum = require('./src/models/curriculum.model');
    const ClassSection = require('./src/models/classSection.model');
    const ClassEnrollment = require('./src/models/classEnrollment.model');
    const Subject = require('./src/models/subject.model');
    const Semester = require('./src/models/semester.model');
    const CourseWishlist = require('./src/models/courseWishlist.model');

    // ================================================================
    // STEP 1: Create or find test user account
    // ================================================================
    console.log('📌 STEP 1: Setting up User Account...');
    const testEmail = 'teststudent.grades@example.com';
    let user = await User.findOne({ email: testEmail });

    if (!user) {
      const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
      user = new User({
        email: testEmail,
        password: hashedPassword,
        fullName: 'Test Student - Grades & Wishlist',
        role: 'student',
        emailVerified: true,
        avatar: null,
        isActive: true,
      });
      await user.save();
      console.log(`✅ Created User: ${testEmail}`);
    } else {
      console.log(`✅ Found existing User: ${testEmail}`);
    }

    // ================================================================
    // STEP 2: Get or create Major (use first available or create)
    // ================================================================
    console.log('\n📌 STEP 2: Setting up Major...');
    let major = await Major.findOne().sort({ createdAt: 1 });
    if (!major) {
      major = new Major({
        majorCode: 'SE',
        majorName: 'Software Engineering',
        isActive: true,
      });
      await major.save();
      console.log(`✅ Created Major: ${major.majorCode}`);
    } else {
      console.log(`✅ Using Major: ${major.majorCode} - ${major.majorName}`);
    }

    // ================================================================
    // STEP 3: Get or create Curriculum
    // ================================================================
    console.log('\n📌 STEP 3: Setting up Curriculum...');
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
      console.log(`✅ Created Curriculum: ${curriculum.curriculumCode}`);
    } else {
      console.log(`✅ Using Curriculum: ${curriculum.curriculumCode}`);
    }

    // ================================================================
    // STEP 4: Create or find Student record
    // ================================================================
    console.log('\n📌 STEP 4: Setting up Student Record...');
    let student = await Student.findOne({ userId: user._id });

    if (!student) {
      student = new Student({
        userId: user._id,
        studentCode: `STU_GRADES_${Date.now()}`,
        fullName: user.fullName,
        email: user.email,
        majorCode: major.majorCode,
        majorId: major._id,
        cohort: 2026,
        curriculumId: curriculum._id,
        dateOfBirth: new Date('2000-01-15'),
        gender: 'male',
        academicStatus: 'enrolled',
        enrollmentYear: 2024,
        isActive: true,
      });
      await student.save();
      console.log(`✅ Created Student Record (Code: ${student.studentCode})`);
    } else {
      console.log(`✅ Found existing Student Record (Code: ${student.studentCode})`);
    }

    // ================================================================
    // STEP 5: Get classes and create enrollments with grades
    // ================================================================
    console.log('\n📌 STEP 5: Creating Enrollments with Grade Data...');
    
    // Get available classes
    const classesAvailable = await ClassSection.find()
      .limit(3)
      .populate('subject');

    if (classesAvailable.length === 0) {
      console.log('⚠️  No class sections found. Creating test classes...');
      
      // Create some test subjects if they don't exist
      let subject1 = await Subject.findOne({ subjectCode: 'CS101' });
      if (!subject1) {
        subject1 = new Subject({
          subjectCode: 'CS101',
          subjectName: 'Introduction to Programming',
          credits: 3,
          majorCode: major.majorCode,
        });
        await subject1.save();
      }

      let subject2 = await Subject.findOne({ subjectCode: 'CS201' });
      if (!subject2) {
        subject2 = new Subject({
          subjectCode: 'CS201',
          subjectName: 'Data Structures',
          credits: 3,
          majorCode: major.majorCode,
        });
        await subject2.save();
      }

      let subject3 = await Subject.findOne({ subjectCode: 'CS301' });
      if (!subject3) {
        subject3 = new Subject({
          subjectCode: 'CS301',
          subjectName: 'Web Development',
          credits: 4,
          majorCode: major.majorCode,
        });
        await subject3.save();
      }

      // Create test class sections
      const newClasses = [];
      const subjects = [subject1, subject2, subject3];

      for (let i = 0; i < subjects.length; i++) {
        const classSection = new ClassSection({
          className: `${subjects[i].subjectCode}_001`,
          subject: subjects[i]._id,
          semester: 1,
          academicYear: 2024,
          capacity: 50,
          enrolledCount: 0,
          credits: subjects[i].credits,
          maxStudents: 50,
          status: 'active',
        });
        await classSection.save();
        newClasses.push(classSection);
      }

      classesAvailable.push(...newClasses);
    }

    // Create enrollments with grade data
    for (let i = 0; i < Math.min(classesAvailable.length, 3); i++) {
      const classSection = classesAvailable[i];
      
      // Check if already enrolled
      let enrollment = await ClassEnrollment.findOne({
        student: student._id,
        classSection: classSection._id,
      });

      if (!enrollment) {
        // Create sample grade data (soft data - varies by enrollment)
        enrollment = new ClassEnrollment({
          classSection: classSection._id,
          student: student._id,
          enrollmentDate: new Date(),
          status: 'completed',
          
          // Grade components (sample soft data - realistic values)
          continuousScore: 7 + Math.random() * 3, // 7-10
          ptScores: [
            {
              type: 'PT1',
              score: 6.5 + Math.random() * 3.5, // 6.5-10
              updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
            {
              type: 'PT2',
              score: 7 + Math.random() * 3, // 7-10
              updatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
            },
          ],
          assignmentScore: 7.5 + Math.random() * 2.5, // 7.5-10
          midtermScore: 7 + Math.random() * 3, // 7-10
          finalScore: 7.5 + Math.random() * 2.5, // 7.5-10
          
          isFinalized: true,
          submittedAt: new Date(),
          note: `Sample grade data for testing - Created ${new Date().toLocaleDateString('vi-VN')}`,
        });

        // Calculate final grade from components
        const weights = { continuousScore: 0.1, pt: 0.2, assignment: 0.2, midterm: 0.2, final: 0.3 };
        const totalPT = (enrollment.ptScores[0]?.score || 0 + enrollment.ptScores[1]?.score || 0) / 2;
        enrollment.grade = Math.round(
          (enrollment.continuousScore * weights.continuousScore +
            totalPT * weights.pt +
            enrollment.assignmentScore * weights.assignment +
            enrollment.midtermScore * weights.midterm +
            enrollment.finalScore * weights.final) * 100
        ) / 100;

        await enrollment.save();
        console.log(
          `✅ Created Enrollment: ${classSection.className} - Final Grade: ${enrollment.grade.toFixed(2)}/10`
        );
      } else {
        console.log(`✅ Found existing Enrollment: ${classSection.className}`);
      }
    }

    // ================================================================
    // STEP 6: Create Wishlist entries
    // ================================================================
    console.log('\n📌 STEP 6: Creating Wishlist Entries...');

    // Get current semester
    let currentSemester = await Semester.findOne({
      isActive: true,
    }).sort({ createdAt: -1 });

    if (!currentSemester) {
      currentSemester = new Semester({
        semesterName: 'Semester 2',
        semesterCode: 'HK2_2024',
        startDate: new Date(2024, 11, 1),
        endDate: new Date(2025, 3, 31),
        academicYear: 2024,
        semesterOrder: 2,
        isActive: true,
      });
      await currentSemester.save();
      console.log(`✅ Created Semester: ${currentSemester.semesterCode}`);
    }

    // Get available subjects for wishlist
    const availableSubjects = await Subject.find()
      .limit(4)
      .sort({ createdAt: -1 });

    // Create wishlist entries
    const wishlistPriorities = [1, 2, 3, 4];
    const wishlistStatuses = ['pending', 'pending', 'approved'];

    for (let i = 0; i < Math.min(availableSubjects.length, 3); i++) {
      const subject = availableSubjects[i];
      
      // Check if wishlist already exists
      let wishlist = await CourseWishlist.findOne({
        student: student._id,
        subject: subject._id,
        semester: currentSemester._id,
        status: 'pending',
      });

      if (!wishlist) {
        wishlist = new CourseWishlist({
          student: student._id,
          subject: subject._id,
          semester: currentSemester._id,
          reason: `Student needs ${subject.subjectName} for career development. Soft data - flexible reason based on subject.`,
          priority: wishlistPriorities[i] || 3,
          status: wishlistStatuses[i % wishlistStatuses.length],
          enrolledClassSection: null,
          reviewedBy: null,
          reviewedAt: null,
          reviewNote: '',
        });

        await wishlist.save();
        console.log(
          `✅ Created Wishlist: ${subject.subjectCode} - ${subject.subjectName} (Priority: ${wishlist.priority}, Status: ${wishlist.status})`
        );
      } else {
        console.log(`✅ Found existing Wishlist: ${subject.subjectCode}`);
      }
    }

    // ================================================================
    // STEP 7: Display Summary
    // ================================================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST ACCOUNT SUMMARY');
    console.log('='.repeat(60));
    
    const enrollmentCount = await ClassEnrollment.countDocuments({
      student: student._id,
    });
    const wishlistCount = await CourseWishlist.countDocuments({
      student: student._id,
    });

    console.log(`\n📧 Email      : ${user.email}`);
    console.log(`🔐 Password   : TestPassword123!`);
    console.log(`👤 Name       : ${user.fullName}`);
    console.log(`🎓 Student ID : ${student.studentCode}`);
    console.log(`🏢 Major      : ${major.majorCode} - ${major.majorName}`);
    console.log(`📚 Curriculum : ${curriculum.curriculumCode}`);
    console.log(`\n📖 Enrollments: ${enrollmentCount} classes with grades`);
    console.log(`📋 Wishlist   : ${wishlistCount} courses`);
    
    // Show enrollment details
    const enrollments = await ClassEnrollment.find({
      student: student._id,
    }).populate('classSection');
    
    console.log('\n📈 Enrolled Classes with Grades:');
    enrollments.forEach((e, idx) => {
      console.log(`   [${idx + 1}] ${e.classSection?.className || 'Unknown'}`);
      console.log(`       - Final Grade: ${e.grade ? e.grade.toFixed(2) : 'N/A'}/10`);
      console.log(`       - Midterm: ${e.midtermScore || 'N/A'}/10, Final: ${e.finalScore || 'N/A'}/10`);
      console.log(`       - PT Scores: ${e.ptScores.map(p => `${p.type}:${p.score.toFixed(2)}`).join(', ') || 'N/A'}`);
    });

    // Show wishlist details
    const wishlists = await CourseWishlist.find({
      student: student._id,
    }).populate('subject');

    console.log('\n🎯 Wishlist Entries:');
    wishlists.forEach((w, idx) => {
      console.log(`   [${idx + 1}] ${w.subject?.subjectCode} - ${w.subject?.subjectName}`);
      console.log(`       - Priority: ${w.priority}/5, Status: ${w.status}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Setup Complete! Test account is ready for use.\n');

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

seedTestStudentWithGradesAndWishlist();
