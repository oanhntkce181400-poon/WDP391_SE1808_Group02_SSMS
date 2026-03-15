/**
 * Seed test class assignment to teacher
 * Purpose: Assign a class section to the test teacher so they can see teaching schedule and grade entry
 * Usage: node seed-assign-class-to-teacher.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function seedAssignClass() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME,
    });

    console.log('✅ Connected to MongoDB');

    // Get models
    const User = require('./src/models/user.model');
    const Teacher = require('./src/models/teacher.model');
    const Subject = require('./src/models/subject.model');
    const ClassSection = require('./src/models/classSection.model');
    const Room = require('./src/models/room.model');
    const Timeslot = require('./src/models/timeslot.model');
    const Semester = require('./src/models/semester.model');

    // Step 1: Find the test teacher
    console.log('\n📍 Step 1: Finding test teacher...');
    const teacherUser = await User.findOne({ email: 'teacher@test.com' });
    if (!teacherUser) {
      throw new Error('Teacher user not found. Please run seed-test-teacher.js first.');
    }
    console.log('✅ Found teacher user:', teacherUser.email);

    const teacher = await Teacher.findOne({ userId: teacherUser._id });
    if (!teacher) {
      throw new Error('Teacher profile not found. Database inconsistency detected.');
    }
    console.log('✅ Found teacher profile:', teacher.fullName);

    // Step 2: Find or create a subject
    console.log('\n📍 Step 2: Finding subject...');
    let subject = await Subject.findOne();
    if (!subject) {
      console.log('⚠️  No subjects found, creating test subject...');
      subject = new Subject({
        subjectCode: 'IT001',
        subjectName: 'Introduction to Programming',
        credits: 3,
        description: 'Test subject for grade entry',
      });
      await subject.save();
      console.log('✅ Created test subject:', subject.subjectCode);
    } else {
      console.log('✅ Found subject:', subject.subjectCode);
    }

    // Step 3: Find or create a room
    console.log('\n📍 Step 3: Finding room...');
    let room = await Room.findOne();
    if (!room) {
      console.log('⚠️  No rooms found, creating test room...');
      room = new Room({
        roomCode: 'A101',
        roomName: 'Classroom A101',
        building: 'Building A',
        capacity: 50,
        type: 'classroom',
      });
      await room.save();
      console.log('✅ Created test room:', room.roomCode);
    } else {
      console.log('✅ Found room:', room.roomCode);
    }

    // Step 4: Find or create a timeslot
    console.log('\n📍 Step 4: Finding timeslot...');
    let timeslot = await Timeslot.findOne();
    if (!timeslot) {
      console.log('⚠️  No timeslots found, creating test timeslot...');
      timeslot = new Timeslot({
        groupName: 'Morning',
        startTime: '08:00',
        endTime: '12:00',
      });
      await timeslot.save();
      console.log('✅ Created test timeslot:', timeslot.groupName);
    } else {
      console.log('✅ Found timeslot:', timeslot.groupName);
    }

    // Step 5: Find or create a semester
    console.log('\n📍 Step 5: Finding semester...');
    let semester = await Semester.findOne().sort({ createdAt: -1 });
    if (!semester) {
      console.log('⚠️  No semesters found, creating test semester...');
      const currentYear = new Date().getFullYear();
      const academicYear = `${currentYear}-${currentYear + 1}`;
      semester = new Semester({
        code: `${academicYear}_1`,
        name: `Kỳ 1 - ${academicYear}`,
        semesterNum: 1,
        academicYear: academicYear,
        semesterType: 'regular',
        startDate: new Date(currentYear, 8, 1), // September
        endDate: new Date(currentYear + 1, 0, 31), // January
        isCurrent: true,
        isActive: true,
      });
      await semester.save();
      console.log('✅ Created test semester:', semester.semesterNum, semester.academicYear);
    } else {
      console.log('✅ Found semester:', semester.semesterNum, semester.academicYear);
    }

    // Step 6: Create a new class section assigned to the teacher
    console.log('\n📍 Step 6: Creating/updating class section...');
    
    // Check if a class already exists for this teacher
    let classSection = await ClassSection.findOne({ teacher: teacher._id });
    
    if (classSection) {
      console.log('✅ Class section already exists:', classSection.classCode);
    } else {
      // Generate unique class code
      const existingCount = await ClassSection.countDocuments();
      const classCode = `CLS${String(existingCount + 1).padStart(5, '0')}`;

      classSection = new ClassSection({
        classCode,
        className: `${subject.subjectCode} - Class 01`,
        subject: subject._id,
        teacher: teacher._id,
        room: room._id,
        timeslot: timeslot._id,
        semester: semester.semesterNum,
        academicYear: semester.academicYear,
        maxCapacity: 50,
        currentEnrollment: 0,
        status: 'published',
        dayOfWeek: 2, // Tuesday
        startDate: semester.startDate,
        endDate: semester.endDate,
      });

      await classSection.save();
      console.log('✅ Created new class section:', classSection.classCode);
    }

    console.log('\n' + '='.repeat(50));
    console.log('📋 ===== Class Assignment Summary =====');
    console.log('='.repeat(50));
    console.log('Teacher Name  :', teacher.fullName);
    console.log('Teacher Email :', teacher.email);
    console.log('Class Code    :', classSection.classCode);
    console.log('Class Name    :', classSection.className);
    console.log('Subject       :', subject.subjectCode);
    console.log('Semester      :', `${semester.semesterNum}/${semester.academicYear}`);
    console.log('Room          :', room.roomCode);
    console.log('Capacity      :', classSection.maxCapacity);
    console.log('Status        :', classSection.status);
    console.log('='.repeat(50));
    console.log('\n✨ Teacher can now see this class in their teaching schedule!');
    console.log('🎯 Go to: http://localhost:5173/lecturer/teaching-schedule');
    console.log('   Then click "Nhập Điểm" button to enter grades');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

seedAssignClass();
