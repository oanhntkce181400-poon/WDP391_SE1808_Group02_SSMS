require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wdp301';
const DB_NAME = process.env.MONGODB_DB_NAME || 'wdp301';

// ─── Dữ liệu mẫu ─────────────────────────────────────

const SUBJECTS = [
  { code: 'WDP301', name: 'Web Design & Prototyping', credits: 4 },
  { code: 'SDN302', name: 'Software Development for Network Apps', credits: 4 },
  { code: 'MLN122', name: 'Chủ nghĩa Mác-Lênin', credits: 4 },
  { code: 'PRJ301', name: 'Java Web Application Development', credits: 4 },
  { code: 'EXE201', name: 'Entrepreneurship Concepts', credits: 2 },
  { code: 'PRM393', name: 'Mobile Programming', credits: 3 },
  { code: 'SWP391', name: 'Software Project', credits: 5 },
  { code: 'DBI202', name: 'Database Management', credits: 3 },
  { code: 'OSG202', name: 'Operating Systems', credits: 3 },
  { code: 'SWT301', name: 'Software Testing', credits: 3 },
];

const TIMESLOTS = [
  { groupName: 'CA1', name: 'Ca 1 - Sáng', startTime: '07:30', endTime: '09:00', startPeriod: 1, endPeriod: 2 },
  { groupName: 'CA2', name: 'Ca 2 - Sáng', startTime: '09:30', endTime: '11:00', startPeriod: 3, endPeriod: 4 },
  { groupName: 'CA3', name: 'Ca 3 - Chiều', startTime: '12:30', endTime: '14:00', startPeriod: 5, endPeriod: 6 },
  { groupName: 'CA4', name: 'Ca 4 - Chiều', startTime: '14:30', endTime: '16:00', startPeriod: 7, endPeriod: 8 },
  { groupName: 'CA5', name: 'Ca 5 - Tối', startTime: '17:00', endTime: '18:30', startPeriod: 9, endPeriod: 10 },
];

const ROOMS = [
  { roomCode: 'A101', roomName: 'Phòng A101', capacity: 40 },
  { roomCode: 'A102', roomName: 'Phòng A102', capacity: 50 },
  { roomCode: 'A103', roomName: 'Phòng A103', capacity: 30 },
  { roomCode: 'B201', roomName: 'Phòng B201', capacity: 60 },
  { roomCode: 'B202', roomName: 'Phòng B202', capacity: 45 },
  { roomCode: 'LAB1', roomName: 'Phòng LAB1 - Máy tính', capacity: 35 },
  { roomCode: 'LAB2', roomName: 'Phòng LAB2 - Máy tính', capacity: 35 },
];

const TEACHERS = [
  { teacherCode: 'GV001', fullName: 'Nguyễn Văn A', email: 'nguyenvana@fpt.edu.vn', department: 'Khoa Công nghệ Thông tin' },
  { teacherCode: 'GV002', fullName: 'Trần Thị B', email: 'tranthib@fpt.edu.vn', department: 'Khoa Công nghệ Thông tin' },
  { teacherCode: 'GV003', fullName: 'Lê Văn C', email: 'levanc@fpt.edu.vn', department: 'Khoa Công nghệ Thông tin' },
  { teacherCode: 'GV004', fullName: 'Phạm Thị D', email: 'phamthid@fpt.edu.vn', department: 'Khoa Công nghệ Thông tin' },
  { teacherCode: 'GV005', fullName: 'Hoàng Văn E', email: 'hoangvane@fpt.edu.vn', department: 'Khoa Công nghệ Thông tin' },
];

const CLASSES = [
  // Draft classes - chưa có lịch
  { classCode: 'WDP301-D2CA1-1501', className: 'WDP301 - Lớp 01', subjectCode: 'WDP301', teacherIndex: 0, semester: 2, academicYear: '2025-2026', maxCapacity: 40, status: 'draft' },
  { classCode: 'SDN302-D1CA2-1501', className: 'SDN302 - Lớp 01', subjectCode: 'SDN302', teacherIndex: 1, semester: 2, academicYear: '2025-2026', maxCapacity: 40, status: 'draft' },
  
  // Scheduled classes - đã có lịch
  { classCode: 'PRJ301-D3CA3-1501', className: 'PRJ301 - Lớp 01', subjectCode: 'PRJ301', teacherIndex: 2, semester: 2, academicYear: '2025-2026', maxCapacity: 40, status: 'scheduled', schedules: [
    { dayOfWeek: 3, startPeriod: 5, endPeriod: 6, roomIndex: 0, startDate: '2026-01-15', endDate: '2026-06-15' }
  ]},
  { classCode: 'EXE201-D2CA4-1501', className: 'EXE201 - Lớp 01', subjectCode: 'EXE201', teacherIndex: 3, semester: 2, academicYear: '2025-2026', maxCapacity: 35, status: 'scheduled', schedules: [
    { dayOfWeek: 2, startPeriod: 7, endPeriod: 8, roomIndex: 1, startDate: '2026-01-15', endDate: '2026-06-15' }
  ]},
  
  // Published classes - đã mở cho sinh viên đăng ký
  { classCode: 'MLN122-D4CA1-1501', className: 'MLN122 - Lớp 01', subjectCode: 'MLN122', teacherIndex: 0, semester: 2, academicYear: '2025-2026', maxCapacity: 50, status: 'published', schedules: [
    { dayOfWeek: 4, startPeriod: 1, endPeriod: 2, roomIndex: 2, startDate: '2026-01-15', endDate: '2026-06-15' }
  ]},
  { classCode: 'PRM393-D5CA2-1501', className: 'PRM393 - Lớp 01', subjectCode: 'PRM393', teacherIndex: 1, semester: 2, academicYear: '2025-2026', maxCapacity: 35, status: 'published', schedules: [
    { dayOfWeek: 5, startPeriod: 3, endPeriod: 4, roomIndex: 5, startDate: '2026-01-15', endDate: '2026-06-15' }
  ]},
  { classCode: 'DBI202-D6CA3-1501', className: 'DBI202 - Lớp 01', subjectCode: 'DBI202', teacherIndex: 2, semester: 2, academicYear: '2025-2026', maxCapacity: 40, status: 'published', schedules: [
    { dayOfWeek: 6, startPeriod: 5, endPeriod: 6, roomIndex: 6, startDate: '2026-01-15', endDate: '2026-06-15' }
  ]},
  
  // Locked classes - đã khóa
  { classCode: 'SWP391-D3CA5-1501', className: 'SWP391 - Lớp 01', subjectCode: 'SWP391', teacherIndex: 4, semester: 2, academicYear: '2025-2026', maxCapacity: 45, status: 'locked', schedules: [
    { dayOfWeek: 3, startPeriod: 9, endPeriod: 10, roomIndex: 3, startDate: '2026-01-15', endDate: '2026-06-15' }
  ]},
  
  // Lớp đích cho việc test chuyển lớp
  { classCode: 'MLN122-D5CA1-1502', className: 'MLN122 - Lớp 02', subjectCode: 'MLN122', teacherIndex: 4, semester: 2, academicYear: '2025-2026', maxCapacity: 50, status: 'published', schedules: [
    { dayOfWeek: 5, startPeriod: 1, endPeriod: 2, roomIndex: 4, startDate: '2026-01-15', endDate: '2026-06-15' }
  ], currentEnrollment: 0 },
  
  // Completed classes
  { classCode: 'WDP301-D2CA2-1501', className: 'WDP301 - Lớp 01', subjectCode: 'WDP301', teacherIndex: 3, semester: 1, academicYear: '2025-2026', maxCapacity: 40, status: 'completed', schedules: [
    { dayOfWeek: 2, startPeriod: 3, endPeriod: 4, roomIndex: 0, startDate: '2025-09-01', endDate: '2025-12-15' }
  ]},
];

// ─── Helper functions ─────────────────────────────────

async function ensureCollection(db, name) {
  const collections = await db.listCollections().toArray();
  if (!collections.find(c => c.name === name)) {
    await db.createCollection(name);
  }
}

async function ensureIndexes(db) {
  await db.collection('subjects').createIndex({ subjectCode: 1 }, { unique: true });
  await db.collection('teachers').createIndex({ teacherCode: 1 }, { unique: true });
  await db.collection('rooms').createIndex({ roomCode: 1 }, { unique: true });
  await db.collection('timeslots').createIndex({ groupName: 1 }, { unique: true });
  await db.collection('classsections').createIndex({ classCode: 1 }, { unique: true });
  await db.collection('schedules').createIndex({ room: 1, dayOfWeek: 1, startPeriod: 1, endPeriod: 1, status: 1 });
  await db.collection('classenrollments').createIndex({ student: 1, classSection: 1 }, { unique: true });
}

async function ensureSubjects(db) {
  for (const subj of SUBJECTS) {
    await db.collection('subjects').updateOne(
      { subjectCode: subj.code },
      { $set: { subjectCode: subj.code, subjectName: subj.name, credits: subj.credits, status: 'active' }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
  }
  console.log('  ✓ Subjects seeded');
}

async function ensureTeachers(db) {
  for (const teacher of TEACHERS) {
    try {
      await db.collection('teachers').updateOne(
        { teacherCode: teacher.teacherCode },
        { $set: { teacherCode: teacher.teacherCode, fullName: teacher.fullName, email: teacher.email, department: teacher.department, isActive: true }, $setOnInsert: { createdAt: new Date() } },
        { upsert: true }
      );
    } catch (e) {
      // Skip if teacher already exists with different email
      console.log(`  ⚠ Teacher ${teacher.teacherCode} already exists, skipping...`);
    }
  }
  console.log('  ✓ Teachers seeded');
}

async function ensureRooms(db) {
  for (const room of ROOMS) {
    await db.collection('rooms').updateOne(
      { roomCode: room.roomCode },
      { $set: { roomCode: room.roomCode, roomName: room.roomName, capacity: room.capacity, status: 'active' }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
  }
  console.log('  ✓ Rooms seeded');
}

async function ensureTimeslots(db) {
  for (const ts of TIMESLOTS) {
    await db.collection('timeslots').updateOne(
      { groupName: ts.groupName },
      { $set: { groupName: ts.groupName, name: ts.name, startTime: ts.startTime, endTime: ts.endTime, startPeriod: ts.startPeriod, endPeriod: ts.endPeriod, status: 'active' }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
  }
  console.log('  ✓ Timeslots seeded');
}

async function ensureSemester(db) {
  await db.collection('semesters').updateOne(
    { code: '2025-2026_2' },
    { $set: { code: '2025-2026_2', name: 'Học kỳ 2 năm học 2025-2026', academicYear: '2025-2026', semesterNum: 2, isCurrent: true, startDate: new Date('2026-01-01'), endDate: new Date('2026-06-30'), status: 'active' }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  );
  await db.collection('semesters').updateMany(
    { code: { $ne: '2025-2026_2' } },
    { $set: { isCurrent: false } }
  );
  console.log('  ✓ Semester seeded');
}

async function ensureClasses(db) {
  const subjectMap = {};
  const subjectDocs = await db.collection('subjects').find({}).toArray();
  subjectDocs.forEach(s => { subjectMap[s.subjectCode] = s._id; });

  const teacherMap = {};
  const teacherDocs = await db.collection('teachers').find({}).toArray();
  teacherDocs.forEach(t => { teacherMap[t.teacherCode] = t._id; });

  const roomDocs = await db.collection('rooms').find({}).toArray();
  const roomMap = {};
  roomDocs.forEach(r => { roomMap[r.roomCode] = r._id; });

  for (const cls of CLASSES) {
    const subjectId = subjectMap[cls.subjectCode];
    const teacherId = teacherMap[TEACHERS[cls.teacherIndex].teacherCode];

    await db.collection('classsections').updateOne(
      { classCode: cls.classCode },
      { 
        $set: { 
          classCode: cls.classCode,
          className: cls.className,
          subject: subjectId,
          teacher: teacherId,
          semester: cls.semester,
          academicYear: cls.academicYear,
          maxCapacity: cls.maxCapacity,
          currentEnrollment: cls.currentEnrollment || 0,
          status: cls.status,
          room: null, // Room is now in Schedule model
          timeslot: null,
          dayOfWeek: null,
        }, 
        $setOnInsert: { createdAt: new Date() } 
      },
      { upsert: true }
    );

    // Add schedules for scheduled/published/locked classes
    if (cls.schedules && cls.schedules.length > 0) {
      const classDoc = await db.collection('classsections').findOne({ classCode: cls.classCode });
      
      for (const sched of cls.schedules) {
        const roomId = roomDocs[sched.roomIndex]._id;
        
        await db.collection('schedules').updateOne(
          { classSection: classDoc._id, dayOfWeek: sched.dayOfWeek, room: roomId },
          { 
            $set: { 
              classSection: classDoc._id,
              room: roomId,
              dayOfWeek: sched.dayOfWeek,
              startPeriod: sched.startPeriod,
              endPeriod: sched.endPeriod,
              startDate: new Date(sched.startDate),
              endDate: new Date(sched.endDate),
              status: 'active'
            }, 
            $setOnInsert: { createdAt: new Date() } 
          },
          { upsert: true }
        );
      }
    }
  }
  console.log('  ✓ Classes seeded');
}

async function ensureStudents(db) {
  const users = await db.collection('users').find({ role: 'student' }).limit(10).toArray();
  
  if (users.length === 0) {
    console.log('  ⚠ No student users found. Creating sample students...');
    return;
  }

  // Get or create student records
  const existingStudents = await db.collection('students').find({}).toArray();
  const studentMap = {};
  existingStudents.forEach(s => { studentMap[s.email] = s._id; });

  const studentsToEnroll = [];
  for (const user of users) {
    if (!studentMap[user.email]) {
      const studentCode = 'SE18' + Math.floor(1000 + Math.random() * 9000);
      const result = await db.collection('students').insertOne({
        userId: user._id,
        email: user.email,
        fullName: user.fullName || user.name || 'Sinh viên',
        studentCode: studentCode,
        cohort: '18',
        majorCode: 'SE',
        curriculumCode: 'SE18',
        status: 'active',
        enrollmentYear: 2023,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      studentMap[user.email] = result.insertedId;
    }
    studentsToEnroll.push(studentMap[user.email]);
  }
  console.log('  ✓ Students seeded');

  // Enroll students in published classes
  const classDocs = await db.collection('classsections').find({ status: 'published' }).toArray();
  
  for (const cls of classDocs) {
    // Enroll up to 5 students per class for testing
    const studentsToAdd = studentsToEnroll.slice(0, 5);
    
    for (const studentId of studentsToAdd) {
      const existingEnrollment = await db.collection('classenrollments').findOne({ student: studentId, classSection: cls._id });
      
      if (!existingEnrollment) {
        await db.collection('classenrollments').insertOne({
          student: studentId,
          classSection: cls._id,
          status: 'enrolled',
          enrolledAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        // Update current enrollment count
        await db.collection('classsections').updateOne(
          { _id: cls._id },
          { $inc: { currentEnrollment: 1 } }
        );
      }
    }
  }
  console.log('  ✓ Enrollments seeded');
}

// ─── Main ─────────────────────────────────────────────

async function run() {
  await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
  const db = mongoose.connection.db;
  console.log('Connected to:', db.databaseName);

  console.log('\n[1/6] Ensuring indexes...');
  await ensureIndexes(db);

  console.log('\n[2/6] Seeding subjects...');
  await ensureSubjects(db);

  console.log('\n[3/6] Seeding teachers...');
  await ensureTeachers(db);

  console.log('\n[4/6] Seeding rooms...');
  await ensureRooms(db);

  console.log('\n[5/6] Seeding timeslots...');
  await ensureTimeslots(db);

  console.log('\n[6/6] Seeding semester...');
  await ensureSemester(db);

  console.log('\n[7/8] Seeding classes with schedules...');
  await ensureClasses(db);

  console.log('\n[8/8] Seeding students and enrollments...');
  await ensureStudents(db);

  await mongoose.disconnect();
  console.log('\n✅ Seed completed! You can now test the scheduling module.');
  console.log('\n📋 Sample data:');
  console.log('   - Subjects: ' + SUBJECTS.length);
  console.log('   - Teachers: ' + TEACHERS.length);
  console.log('   - Rooms: ' + ROOMS.length);
  console.log('   - Timeslots: ' + TIMESLOTS.length);
  console.log('   - Classes: ' + CLASSES.length + ' (various statuses: draft, scheduled, published, locked, completed)');
  console.log('\n🎯 Test Reassign Class:');
  console.log('   - Source: MLN122-D4CA1-1501 (has students enrolled)');
  console.log('   - Target: MLN122-D5CA1-1502 (empty, same subject)');
}

run().catch(e => { 
  console.error('Error:', e); 
  process.exit(1); 
});
