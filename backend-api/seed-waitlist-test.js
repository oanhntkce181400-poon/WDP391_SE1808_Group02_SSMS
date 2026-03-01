/**
 * Seed data for Waitlist feature testing
 * 
 * Test Cases:
 * 1. SV chưa học môn → CÓ thể join waitlist
 * 2. SV đã học/môn đang học → KHÔNG thể join waitlist  
 * 3. SV đã join waitlist rồi → KHÔNG thể join lần 2
 * 4. SV đang waitlist → KHÔNG thể đăng ký lớp hiện tại
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = 'mongodb://127.0.0.1:27017/wdp301';

const waitlistSeed = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // ========================================
    // 1. Create test subjects (if not exist)
    // ========================================
    const Subject = require('./src/models/subject.model');
    const subjectData = [
      { subjectCode: 'WDP301', subjectName: 'Web Design & Prototyping', credits: 4 },
      { subjectCode: 'PRJ301', subjectName: 'Java Web Application Development', credits: 4 },
      { subjectCode: 'PRM393', subjectName: 'Mobile Programming', credits: 3 },
      { subjectCode: 'SWP391', subjectName: 'Software Project', credits: 5 },
    ];

    const subjectIds = {};
    for (const s of subjectData) {
      let existing = await Subject.findOne({ subjectCode: s.subjectCode });
      if (!existing) {
        existing = await Subject.create(s);
        console.log(`  📚 Created subject: ${s.subjectCode}`);
      } else {
        console.log(`  📚 Subject exists: ${s.subjectCode}`);
      }
      subjectIds[s.subjectCode] = existing._id;
    }

    // ========================================
    // 2. Create test students
    // ========================================
    const User = require('./src/models/user.model');
    const Student = require('./src/models/student.model');

    const testStudents = [
      { email: 'testwaitlist01@fpt.edu.vn', name: 'Nguyễn Văn A - Chưa học môn', studentCode: 'CE180001' },
      { email: 'testwaitlist02@fpt.edu.vn', name: 'Trần Thị B - Đã hoàn thành môn', studentCode: 'CE180002' },
      { email: 'testwaitlist03@fpt.edu.vn', name: 'Lê Văn C - Đang học môn', studentCode: 'CE180003' },
      { email: 'testwaitlist04@fpt.edu.vn', name: 'Phạm Thị D - Đã trong waitlist', studentCode: 'CE180004' },
    ];

    // Update existing test users with hashed password and correct role
    const hashedPassword = await bcrypt.hash('123456', 10);
    for (const ts of testStudents) {
      await User.updateOne(
        { email: ts.email },
        { $set: { password: hashedPassword, fullName: ts.name, name: ts.name, role: 'student' } },
        { upsert: true }
      );
    }
    console.log(`  🔐 Updated password for ${testStudents.length} test users`);

    const studentIds = {};
    for (const ts of testStudents) {
      let user = await User.findOne({ email: ts.email });
      if (!user) {
        const hashedPassword = await bcrypt.hash('123456', 10);
        user = await User.create({
          email: ts.email,
          fullName: ts.name,
          name: ts.name,
          password: hashedPassword,
          role: 'student',
        });
        console.log(`  👤 Created user: ${ts.email}`);
      }

      let student = await Student.findOne({ email: ts.email });
      if (!student) {
        student = await Student.create({
          userId: user._id,
          email: ts.email,
          fullName: ts.name,
          studentCode: ts.studentCode,
          cohort: '18',
          majorCode: 'CE',
          curriculumCode: 'CEK18',
          status: 'active',
          academicStatus: 'enrolled',
          enrollmentYear: 2023,
        });
        console.log(`  🎓 Created student: ${ts.studentCode}`);
      }
      studentIds[ts.studentCode] = student._id;
    }

    // ========================================
    // 3. Get existing class sections OR use any subject
    // ========================================
    const ClassSection = require('./src/models/classSection.model');
    const ClassEnrollment = require('./src/models/classEnrollment.model');
    const Teacher = require('./src/models/teacher.model');

    const nextSemester = 2;
    const nextYear = '2025-2026';

    // Get any existing class section - the subject doesn't matter for testing
    let classCurrent = await ClassSection.findOne();

    // If no class sections, create a simple one
    if (!classCurrent) {
      const teacher = await Teacher.findOne();
      if (teacher && subjectIds.WDP301) {
        classCurrent = await ClassSection.create({
          subject: subjectIds.WDP301,
          classCode: 'WDP301-TEST-001',
          className: 'WDP301 Test Class',
          semester: 1,
          academicYear: '2025-2026',
          teacher: teacher._id,
          maxCapacity: 50,
          currentEnrollment: 0,
          status: 'published',
          schedule: [],
        });
        console.log(`  🏫 Created test class: WDP301-TEST-001`);
      } else {
        console.log('  ⚠️ No teacher found, cannot create class');
      }
    } else {
      console.log(`  🏫 Using existing class: ${classCurrent.classCode}`);
    }

    // ========================================
    // 4. Create enrollments (only if class sections exist)
    // ========================================
    
    if (classCurrent && classCurrent._id) {
      // Student B (CE180002): Already completed WDP301
      const existingEnrollB = await ClassEnrollment.findOne({
        student: studentIds.CE180002,
        classSection: classCurrent._id,
      });
      if (!existingEnrollB) {
        await ClassEnrollment.create({
          student: studentIds.CE180002,
          classSection: classCurrent._id,
          status: 'completed',
          enrolledAt: new Date('2025-01-15'),
        });
        console.log(`  ✅ Enrolled Student B (CE180002) - completed WDP301`);
      }

      // Student C (CE180003): Currently enrolled in WDP301
      const existingEnrollC = await ClassEnrollment.findOne({
        student: studentIds.CE180003,
        classSection: classCurrent._id,
      });
      if (!existingEnrollC) {
        await ClassEnrollment.create({
          student: studentIds.CE180003,
          classSection: classCurrent._id,
          status: 'enrolled',
          enrolledAt: new Date(),
        });
        console.log(`  ✅ Enrolled Student C (CE180003) - currently studying WDP301`);
      }
    } else {
      console.log('  ⚠️ No class sections, skipping enrollments');
    }

    // ========================================
    // 5. Create waitlist entry for Student D
    // ========================================
    const Waitlist = require('./src/models/waitlist.model');
    
    const existingWaitlistD = await Waitlist.findOne({
      student: studentIds.CE180004,
      subject: subjectIds.WDP301,
      status: 'WAITING',
    });
    if (!existingWaitlistD) {
      await Waitlist.create({
        student: studentIds.CE180004,
        subject: subjectIds.WDP301,
        targetSemester: nextSemester,
        targetAcademicYear: nextYear,
        status: 'WAITING',
        createdAt: new Date(),
      });
      console.log(`  📝 Created waitlist for Student D (CE180004) - WDP301 kỳ ${nextSemester}`);
    }

    // ========================================
    // Summary
    // ========================================
    console.log('\n' + '='.repeat(50));
    console.log('🎯 WAITLIST TEST DATA SEEDED SUCCESSFULLY!');
    console.log('='.repeat(50));
    console.log('\n📋 TEST CASES:');
    console.log('─'.repeat(50));
    console.log('1️⃣  CE180001 (Nguyễn Văn A) - Chưa học WDP301');
    console.log('    → CÓ THỂ join waitlist WDP301 kỳ sau');
    console.log('');
    console.log('2️⃣  CE180002 (Trần Thị B) - Đã hoàn thành WDP301');
    console.log('    → KHÔNG THỂ join waitlist (đã học xong)');
    console.log('');
    console.log('3️⃣  CE180003 (Lê Văn C) - Đang học WDP301');
    console.log('    → KHÔNG THỂ join waitlist (đang học)');
    console.log('');
    console.log('4️⃣  CE180004 (Phạm Thị D) - Đã trong waitlist WDP301');
    console.log('    → KHÔNG THỂ join waitlist lần 2');
    console.log('    → KHÔNG THỂ đăng ký lớp WDP301 hiện tại');
    console.log('');
    console.log('5️⃣  CE180004 (Phạm Thị D) - Muốn đăng ký WDP301 hiện tại');
    console.log('    → Bị chặn vì đang trong waitlist');
    console.log('─'.repeat(50));

    console.log('\n🔐 Login credentials:');
    console.log('   Email: testwaitlist01@fpt.edu.vn (và 02, 03, 04)');
    console.log('   Password: 123456');
    console.log('');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

waitlistSeed();
