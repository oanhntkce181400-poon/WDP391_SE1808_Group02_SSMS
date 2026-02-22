/**
 * Seed exam schedule data for development
 * Usage: node seed-exam-data.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function seedExamData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME,
    });

    console.log('✅ Connected to MongoDB');

    // Import models
    const User = require('./src/models/user.model');
    const Student = require('./src/models/student.model');
    const Teacher = require('./src/models/teacher.model');
    const Subject = require('./src/models/subject.model');
    const Major = require('./src/models/major.model');
    const Curriculum = require('./src/models/curriculum.model');
    const Room = require('./src/models/room.model');
    const Timeslot = require('./src/models/timeslot.model');
    const ClassSection = require('./src/models/classSection.model');
    const ClassEnrollment = require('./src/models/classEnrollment.model');
    const Exam = require('./src/models/exam.model');
    const StudentExam = require('./src/models/studentExam.model');

    // 1. Get or create Major
    console.log('\n📌 Setting up Major...');
    let major = await Major.findOne({ majorCode: 'SE' });
    if (!major) {
      major = new Major({
        majorCode: 'SE',
        majorName: 'Software Engineering',
        isActive: true,
      });
      await major.save();
      console.log('✅ Created Major: SE');
    } else {
      console.log('✅ Found existing Major: SE');
    }

    // 2. Get or create Curriculum
    console.log('\n📌 Setting up Curriculum...');
    let curriculum = await Curriculum.findOne({ curriculumCode: 'K18' });
    if (!curriculum) {
      curriculum = new Curriculum({
        curriculumCode: 'K18',
        cohort: 18,
        title: 'Curriculum 2018',
        subjects: [],
      });
      await curriculum.save();
      console.log('✅ Created Curriculum: K18');
    } else {
      console.log('✅ Found existing Curriculum: K18');
    }

    // 3. Get or create Subjects
    console.log('\n📌 Setting up Subjects...');
    let subject1 = await Subject.findOne({ subjectCode: 'SE001' });
    if (!subject1) {
      subject1 = new Subject({
        subjectCode: 'SE001',
        subjectName: 'Data Structures',
        credits: 3,
        majorCode: 'SE',
      });
      await subject1.save();
      console.log('✅ Created Subject: SE001 - Data Structures');
    } else {
      console.log('✅ Found existing Subject: SE001');
    }

    let subject2 = await Subject.findOne({ subjectCode: 'SE002' });
    if (!subject2) {
      subject2 = new Subject({
        subjectCode: 'SE002',
        subjectName: 'Web Development',
        credits: 3,
        majorCode: 'SE',
      });
      await subject2.save();
      console.log('✅ Created Subject: SE002 - Web Development');
    } else {
      console.log('✅ Found existing Subject: SE002');
    }

    let subject3 = await Subject.findOne({ subjectCode: 'SE003' });
    if (!subject3) {
      subject3 = new Subject({
        subjectCode: 'SE003',
        subjectName: 'Database Management',
        credits: 3,
        majorCode: 'SE',
      });
      await subject3.save();
      console.log('✅ Created Subject: SE003 - Database Management');
    } else {
      console.log('✅ Found existing Subject: SE003');
    }

    // 4. Get or create Teacher
    console.log('\n📌 Setting up Teacher...');
    let teacher = await Teacher.findOne({ teacherCode: 'GV0001' });
    if (!teacher) {
      teacher = new Teacher({
        teacherCode: 'GV0001',
        fullName: 'Dr. Nguyen Van A',
        email: 'teacher1@university.edu',
        department: 'Software Engineering',
      });
      await teacher.save();
      console.log('✅ Created Teacher: GV0001');
    } else {
      console.log('✅ Found existing Teacher: GV0001');
    }

    // 5. Get or create Rooms
    console.log('\n📌 Setting up Rooms...');
    let room1 = await Room.findOne({ roomCode: 'A101' });
    if (!room1) {
      room1 = new Room({
        roomCode: 'A101',
        roomName: 'Phòng A101',
        roomType: 'Classroom',
        capacity: 30,
        status: 'available',
      });
      await room1.save();
      console.log('✅ Created Room: A101');
    } else {
      console.log('✅ Found existing Room: A101');
    }

    let room2 = await Room.findOne({ roomCode: 'A102' });
    if (!room2) {
      room2 = new Room({
        roomCode: 'A102',
        roomName: 'Phòng A102',
        roomType: 'Exam Hall',
        capacity: 50,
        status: 'available',
      });
      await room2.save();
      console.log('✅ Created Room: A102');
    } else {
      console.log('✅ Found existing Room: A102');
    }

    let room3 = await Room.findOne({ roomCode: 'B204' });
    if (!room3) {
      room3 = new Room({
        roomCode: 'B204',
        roomName: 'Phòng B204',
        roomType: 'Lab',
        capacity: 25,
        status: 'available',
      });
      await room3.save();
      console.log('✅ Created Room: B204');
    } else {
      console.log('✅ Found existing Room: B204');
    }

    // 6. Get or create Timeslots
    console.log('\n📌 Setting up Timeslots...');
    let timeslot1 = await Timeslot.findOne({ groupName: 'Slot_01' });
    if (!timeslot1) {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5);
      const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 20);
      timeslot1 = new Timeslot({
        groupName: 'Slot_01',
        description: 'Morning Session',
        startDate,
        endDate,
        startTime: '07:00',
        endTime: '09:30',
        sessionsPerDay: 2,
        status: 'active',
      });
      await timeslot1.save();
      console.log('✅ Created Timeslot: Slot_01 (07:00 - 09:30)');
    } else {
      console.log('✅ Found existing Timeslot: Slot_01');
    }

    let timeslot2 = await Timeslot.findOne({ groupName: 'Slot_02' });
    if (!timeslot2) {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5);
      const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 20);
      timeslot2 = new Timeslot({
        groupName: 'Slot_02',
        description: 'Afternoon Session',
        startDate,
        endDate,
        startTime: '10:00',
        endTime: '12:30',
        sessionsPerDay: 2,
        status: 'active',
      });
      await timeslot2.save();
      console.log('✅ Created Timeslot: Slot_02 (10:00 - 12:30)');
    } else {
      console.log('✅ Found existing Timeslot: Slot_02');
    }

    let timeslot3 = await Timeslot.findOne({ groupName: 'Slot_03' });
    if (!timeslot3) {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5);
      const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 20);
      timeslot3 = new Timeslot({
        groupName: 'Slot_03',
        description: 'Evening Session',
        startDate,
        endDate,
        startTime: '13:00',
        endTime: '15:30',
        sessionsPerDay: 2,
        status: 'active',
      });
      await timeslot3.save();
      console.log('✅ Created Timeslot: Slot_03 (13:00 - 15:30)');
    } else {
      console.log('✅ Found existing Timeslot: Slot_03');
    }

    // 7. Get or create Student User
    console.log('\n📌 Setting up Student User...');
    let studentUser = await User.findOne({ email: 'student@test.com' });
    if (!studentUser) {
      const studentHashedPassword = await bcrypt.hash('Student@123456', 10);
      studentUser = new User({
        email: 'student@test.com',
        fullName: 'Test Student',
        password: studentHashedPassword,
        role: 'student',
        status: 'active',
        authProvider: 'local',
        isActive: true,
      });
      await studentUser.save();
      console.log('✅ Created Student User: student@test.com');
    } else {
      console.log('✅ Found existing Student User: student@test.com');
    }

    // 8. Get or create Student Record
    console.log('\n📌 Setting up Student Record...');
    let student = await Student.findOne({ studentCode: 'SE181001' });
    if (!student) {
      student = new Student({
        studentCode: 'SE181001',
        fullName: 'Test Student',
        email: 'student@test.com',
        majorCode: 'SE',
        cohort: 18,
        curriculum: curriculum._id,
        isActive: true,
      });
      await student.save();
      console.log('✅ Created Student Record: SE181001');
    } else {
      console.log('✅ Found existing Student Record: SE181001');
    }

    // 9. Get or create ClassSections
    console.log('\n📌 Setting up Class Sections...');
    let class1 = await ClassSection.findOne({ classCode: 'SE001_01' });
    if (!class1) {
      class1 = new ClassSection({
        classCode: 'SE001_01',
        className: 'Data Structures - Class 01',
        subject: subject1._id,
        teacher: teacher._id,
        room: room1._id,
        timeslot: timeslot1._id,
        semester: 1,
        academicYear: '2024-2025',
        maxCapacity: 30,
        currentEnrollment: 0,
        status: 'active',
      });
      await class1.save();
      console.log('✅ Created ClassSection: SE001_01');
    } else {
      console.log('✅ Found existing ClassSection: SE001_01');
    }

    let class2 = await ClassSection.findOne({ classCode: 'SE002_01' });
    if (!class2) {
      class2 = new ClassSection({
        classCode: 'SE002_01',
        className: 'Web Development - Class 01',
        subject: subject2._id,
        teacher: teacher._id,
        room: room1._id,
        timeslot: timeslot2._id,
        semester: 1,
        academicYear: '2024-2025',
        maxCapacity: 30,
        currentEnrollment: 0,
        status: 'active',
      });
      await class2.save();
      console.log('✅ Created ClassSection: SE002_01');
    } else {
      console.log('✅ Found existing ClassSection: SE002_01');
    }

    let class3 = await ClassSection.findOne({ classCode: 'SE003_01' });
    if (!class3) {
      class3 = new ClassSection({
        classCode: 'SE003_01',
        className: 'Database Management - Class 01',
        subject: subject3._id,
        teacher: teacher._id,
        room: room1._id,
        timeslot: timeslot3._id,
        semester: 1,
        academicYear: '2024-2025',
        maxCapacity: 30,
        currentEnrollment: 0,
        status: 'active',
      });
      await class3.save();
      console.log('✅ Created ClassSection: SE003_01');
    } else {
      console.log('✅ Found existing ClassSection: SE003_01');
    }

    // 10. Enroll student in classes
    console.log('\n📌 Enrolling Student in Classes...');
    
    let enrollment1 = await ClassEnrollment.findOne({
      classSection: class1._id,
      student: student._id,
    });
    if (!enrollment1) {
      enrollment1 = new ClassEnrollment({
        classSection: class1._id,
        student: student._id,
        status: 'enrolled',
        enrollmentDate: new Date(),
      });
      await enrollment1.save();
      console.log('✅ Student enrolled in: SE001_01');
    } else {
      console.log('✅ Student already enrolled in: SE001_01');
    }

    let enrollment2 = await ClassEnrollment.findOne({
      classSection: class2._id,
      student: student._id,
    });
    if (!enrollment2) {
      enrollment2 = new ClassEnrollment({
        classSection: class2._id,
        student: student._id,
        status: 'enrolled',
        enrollmentDate: new Date(),
      });
      await enrollment2.save();
      console.log('✅ Student enrolled in: SE002_01');
    } else {
      console.log('✅ Student already enrolled in: SE002_01');
    }

    let enrollment3 = await ClassEnrollment.findOne({
      classSection: class3._id,
      student: student._id,
    });
    if (!enrollment3) {
      enrollment3 = new ClassEnrollment({
        classSection: class3._id,
        student: student._id,
        status: 'enrolled',
        enrollmentDate: new Date(),
      });
      await enrollment3.save();
      console.log('✅ Student enrolled in: SE003_01');
    } else {
      console.log('✅ Student already enrolled in: SE003_01');
    }

    // 11. Create Exams
    console.log('\n📌 Creating Exams...');
    
    const now = new Date();
    const examDate1 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10);
    const examDate2 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 12);
    const examDate3 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14);

    let exam1 = await Exam.findOne({ examCode: 'EXAM_SE001_01_01' });
    if (!exam1) {
      exam1 = new Exam({
        examCode: 'EXAM_SE001_01_01',
        classSection: class1._id,
        subject: subject1._id,
        room: room2._id,
        slot: timeslot1._id,
        examDate: examDate1,
        startTime: '07:00',
        endTime: '09:30',
        maxCapacity: 50,
        registeredStudents: 0,
        examRules: 'Quy chế thi tiêu chuẩn',
        notes: 'Mang máy tính cầm tay, không sử dụng điện thoại',
        status: 'scheduled',
      });
      await exam1.save();
      console.log('✅ Created Exam: EXAM_SE001_01_01 (Data Structures)');
    } else {
      console.log('✅ Found existing Exam: EXAM_SE001_01_01');
    }

    let exam2 = await Exam.findOne({ examCode: 'EXAM_SE002_01_01' });
    if (!exam2) {
      exam2 = new Exam({
        examCode: 'EXAM_SE002_01_01',
        classSection: class2._id,
        subject: subject2._id,
        room: room3._id,
        slot: timeslot2._id,
        examDate: examDate2,
        startTime: '10:00',
        endTime: '12:30',
        maxCapacity: 25,
        registeredStudents: 0,
        examRules: 'Quy chế thi tiêu chuẩn',
        notes: 'Sử dụng máy tính trong phòng thi',
        status: 'scheduled',
      });
      await exam2.save();
      console.log('✅ Created Exam: EXAM_SE002_01_01 (Web Development)');
    } else {
      console.log('✅ Found existing Exam: EXAM_SE002_01_01');
    }

    let exam3 = await Exam.findOne({ examCode: 'EXAM_SE003_01_01' });
    if (!exam3) {
      exam3 = new Exam({
        examCode: 'EXAM_SE003_01_01',
        classSection: class3._id,
        subject: subject3._id,
        room: room2._id,
        slot: timeslot3._id,
        examDate: examDate3,
        startTime: '13:00',
        endTime: '15:30',
        maxCapacity: 50,
        registeredStudents: 0,
        examRules: 'Quy chế thi tiêu chuẩn',
        notes: 'Mang máy tính cầm tay',
        status: 'scheduled',
      });
      await exam3.save();
      console.log('✅ Created Exam: EXAM_SE003_01_01 (Database Management)');
    } else {
      console.log('✅ Found existing Exam: EXAM_SE003_01_01');
    }

    // 12. Register Student in Exams (StudentExam)
    console.log('\n📌 Registering Student in Exams...');

    let studentExam1 = await StudentExam.findOne({
      exam: exam1._id,
      student: student._id,
    });
    if (!studentExam1) {
      studentExam1 = new StudentExam({
        exam: exam1._id,
        student: student._id,
        sbd: 'SBD001001',
        seatNumber: 'A01',
        status: 'registered',
        registrationDate: new Date(),
        notes: 'Đăng ký thành công',
      });
      await studentExam1.save();
      exam1.registeredStudents += 1;
      await exam1.save();
      console.log('✅ Student registered for Exam: EXAM_SE001_01_01 (SBD: SBD001001)');
    } else {
      console.log('✅ Student already registered for Exam: EXAM_SE001_01_01');
    }

    let studentExam2 = await StudentExam.findOne({
      exam: exam2._id,
      student: student._id,
    });
    if (!studentExam2) {
      studentExam2 = new StudentExam({
        exam: exam2._id,
        student: student._id,
        sbd: 'SBD001002',
        seatNumber: 'B12',
        status: 'registered',
        registrationDate: new Date(),
        notes: 'Đăng ký thành công',
      });
      await studentExam2.save();
      exam2.registeredStudents += 1;
      await exam2.save();
      console.log('✅ Student registered for Exam: EXAM_SE002_01_01 (SBD: SBD001002)');
    } else {
      console.log('✅ Student already registered for Exam: EXAM_SE002_01_01');
    }

    let studentExam3 = await StudentExam.findOne({
      exam: exam3._id,
      student: student._id,
    });
    if (!studentExam3) {
      studentExam3 = new StudentExam({
        exam: exam3._id,
        student: student._id,
        sbd: 'SBD001003',
        seatNumber: 'C05',
        status: 'registered',
        registrationDate: new Date(),
        notes: 'Đăng ký thành công',
      });
      await studentExam3.save();
      exam3.registeredStudents += 1;
      await exam3.save();
      console.log('✅ Student registered for Exam: EXAM_SE003_01_01 (SBD: SBD001003)');
    } else {
      console.log('✅ Student already registered for Exam: EXAM_SE003_01_01');
    }

    console.log('\n✅✅✅ Exam data seeding completed successfully! ✅✅✅');
    console.log('\n📋 Summary:');
    console.log('   Student Account:');
    console.log('   📧 Email: student@test.com');
    console.log('   🔑 Password: Student@123456');
    console.log('\n   Student Code: SE181001');
    console.log('   Display Name: Test Student');
    console.log('\n   Exams Scheduled:');
    console.log(`   1️⃣  Data Structures - ${examDate1.toLocaleDateString('vi-VN')} 07:00-09:30`);
    console.log(`   2️⃣  Web Development - ${examDate2.toLocaleDateString('vi-VN')} 10:00-12:30`);
    console.log(`   3️⃣  Database Management - ${examDate3.toLocaleDateString('vi-VN')} 13:00-15:30`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

seedExamData();
