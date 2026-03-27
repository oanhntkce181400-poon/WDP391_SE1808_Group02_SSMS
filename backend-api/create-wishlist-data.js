/**
 * Create wishlist data for test student
 * Usage: node create-wishlist-data.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function createWishlistData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME,
    });

    console.log('✅ Connected to MongoDB\n');

    const User = require('./src/models/user.model');
    const Student = require('./src/models/student.model');
    const Subject = require('./src/models/subject.model');
    const Semester = require('./src/models/semester.model');
    const CourseWishlist = require('./src/models/courseWishlist.model');

    const testEmail = 'teststudent.grades@example.com';

    console.log('🔍 FINDING TEST STUDENT...');
    const user = await User.findOne({ email: testEmail });

    if (!user) {
      console.log('❌ User not found! Create account first: node create-test-student-account.js');
      process.exit(1);
    }

    const student = await Student.findOne({ userId: user._id });
    if (!student) {
      console.log('❌ Student record not found!');
      process.exit(1);
    }

    console.log(`✅ Found student: ${student.studentCode}\n`);

    // ========== GET OR CREATE SEMESTER ==========
    console.log('📌 Setting up Semester...');
    let semester = await Semester.findOne({ isActive: true }).sort({ createdAt: -1 });

    if (!semester) {
      semester = new Semester({
        semesterName: 'Semester 2',
        semesterCode: 'HK2_2024',
        semesterNumber: 2,
        startDate: new Date(2024, 11, 1),
        endDate: new Date(2025, 3, 31),
        academicYear: 2024,
        isActive: true,
      });
      await semester.save();
      console.log(`✅ Created Semester: ${semester.semesterCode}`);
    } else {
      console.log(`✅ Using Semester: ${semester.semesterCode}`);
    }
    console.log('');

    // ========== GET SUBJECTS ==========
    console.log('📌 Getting Subjects...');
    const subjects = await Subject.find().limit(3);

    if (subjects.length === 0) {
      console.log('❌ No subjects found in database!');
      console.log('   Please create subjects first or run seed data script');
      process.exit(1);
    }

    console.log(`✅ Found ${subjects.length} subjects\n`);

    // ========== CREATE WISHLIST ENTRIES ==========
    console.log('📋 CREATING WISHLIST ENTRIES...');

    const wishlistReasons = [
      'Cần nắm vững kiến thức để phát triển sự nghiệp',
      'Yêu cầu bổ sung cho khóa học chuyên ngành',
      'Quan tâm để mở rộng kiến thức cá nhân',
    ];

    const wishlistStatuses = ['pending', 'approved', 'pending'];

    for (let i = 0; i < subjects.length; i++) {
      const subject = subjects[i];

      // Check if already exists
      const existingWishlist = await CourseWishlist.findOne({
        student: student._id,
        subject: subject._id,
        semester: semester._id,
      });

      if (existingWishlist) {
        console.log(`⚠️  Wishlist already exists for ${subject.subjectCode}`);
        continue;
      }

      // Create wishlist entry
      const wishlist = new CourseWishlist({
        student: student._id,
        subject: subject._id,
        semester: semester._id,
        reason: wishlistReasons[i] || 'Yêu cầu khóa học',
        priority: (i % 3) + 2, // 2, 3, 1
        status: wishlistStatuses[i],
        enrolledClassSection: null,
        reviewedBy: null,
        reviewedAt: null,
        reviewNote: '',
      });

      await wishlist.save();

      console.log(`✅ Created Wishlist:`);
      console.log(`   Subject: ${subject.subjectCode} - ${subject.subjectName}`);
      console.log(`   Priority: ${wishlist.priority}/5`);
      console.log(`   Status: ${wishlist.status}`);
      console.log('');
    }

    // ========== VERIFY DATA ==========
    console.log('\n' + '='.repeat(60));
    console.log('✅ WISHLIST DATA CREATED SUCCESSFULLY!');
    console.log('='.repeat(60));

    const wishlists = await CourseWishlist.find({
      student: student._id,
    }).populate('subject', 'subjectCode subjectName');

    console.log(`\n📊 Total Wishlists: ${wishlists.length}\n`);

    wishlists.forEach((w, idx) => {
      const statusLabel = {
        pending: '⏳ Đang chờ',
        approved: '✅ Đã duyệt',
        rejected: '❌ Từ chối',
      }[w.status];

      console.log(`[${idx + 1}] ${w.subject.subjectCode} - ${w.subject.subjectName}`);
      console.log(`    Status: ${statusLabel}`);
      console.log(`    Priority: ${w.priority}/5`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('🚀 Now in mobile app:');
    console.log('   1. Go to "Yêu cầu" (Requests) tab - the BOOKMARK icon');
    console.log('   2. Pull down to refresh');
    console.log('   3. See your wishlist with pending/approved status\n');

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

createWishlistData();
