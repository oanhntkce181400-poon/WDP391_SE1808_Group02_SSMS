const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/wdp301').then(async () => {
  const db = mongoose.connection.db;
  
  console.log('Clearing old data...');
  
  // Clear schedules and classes
  await db.collection('schedules').deleteMany({});
  await db.collection('classsections').deleteMany({});
  await db.collection('classenrollments').deleteMany({});
  
  console.log('Creating new data...');
  
  // Use existing teachers, rooms
  const teachers = await db.collection('teachers').find({}).limit(5).toArray();
  const rooms = await db.collection('rooms').find({}).limit(7).toArray();
  
  console.log('Teachers found:', teachers.length);
  console.log('Rooms found:', rooms.length);
  
  // Create subjects
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
  
  const subjectIds = {};
  for (const subj of SUBJECTS) {
    const existing = await db.collection('subjects').findOne({ subjectCode: subj.code });
    if (existing) {
      subjectIds[subj.code] = existing._id;
    } else {
      const result = await db.collection('subjects').insertOne({
        subjectCode: subj.code,
        subjectName: subj.name,
        credits: subj.credits,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      subjectIds[subj.code] = result.insertedId;
    }
  }
  console.log('Subjects created:', Object.keys(subjectIds));
  
  // Create timeslots
  const TIMESLOTS = [
    { groupName: 'CA1', name: 'Ca 1 - Sáng', startTime: '07:30', endTime: '09:00', startPeriod: 1, endPeriod: 2 },
    { groupName: 'CA2', name: 'Ca 2 - Sáng', startTime: '09:30', endTime: '11:00', startPeriod: 3, endPeriod: 4 },
    { groupName: 'CA3', name: 'Ca 3 - Chiều', startTime: '12:30', endTime: '14:00', startPeriod: 5, endPeriod: 6 },
    { groupName: 'CA4', name: 'Ca 4 - Chiều', startTime: '14:30', endTime: '16:00', startPeriod: 7, endPeriod: 8 },
    { groupName: 'CA5', name: 'Ca 5 - Tối', startTime: '17:00', endTime: '18:30', startPeriod: 9, endPeriod: 10 },
  ];
  
  const timeslotIds = {};
  for (const ts of TIMESLOTS) {
    const result = await db.collection('timeslots').insertOne({
      groupName: ts.groupName,
      name: ts.name,
      startTime: ts.startTime,
      endTime: ts.endTime,
      startPeriod: ts.startPeriod,
      endPeriod: ts.endPeriod,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    timeslotIds[ts.groupName] = result.insertedId;
  }
  console.log('Timeslots created:', Object.keys(timeslotIds));
  
  // Create classes
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
  
  for (const cls of CLASSES) {
    const subjectId = subjectIds[cls.subjectCode];
    const teacherId = teachers[cls.teacherIndex]?._id;
    
    const result = await db.collection('classsections').insertOne({
      classCode: cls.classCode,
      className: cls.className,
      subject: subjectId,
      teacher: teacherId,
      semester: cls.semester,
      academicYear: cls.academicYear,
      maxCapacity: cls.maxCapacity,
      currentEnrollment: cls.currentEnrollment || 0,
      status: cls.status,
      room: null,
      timeslot: null,
      dayOfWeek: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    const classId = result.insertedId;
    
    // Add schedules for scheduled/published/locked classes
    if (cls.schedules && cls.schedules.length > 0) {
      for (const sched of cls.schedules) {
        const roomId = rooms[sched.roomIndex]?._id;
        
        if (roomId) {
          await db.collection('schedules').insertOne({
            classSection: classId,
            room: roomId,
            dayOfWeek: sched.dayOfWeek,
            startPeriod: sched.startPeriod,
            endPeriod: sched.endPeriod,
            startDate: new Date(sched.startDate),
            endDate: new Date(sched.endDate),
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }
  }
  console.log('Classes created:', CLASSES.length);
  
  // Get students and enroll them
  const students = await db.collection('students').find({}).limit(10).toArray();
  console.log('Students found:', students.length);
  
  // Enroll students in published classes
  const publishedClasses = await db.collection('classsections').find({ status: 'published' }).toArray();
  
  for (const cls of publishedClasses) {
    const studentsToAdd = students.slice(0, 5);
    
    for (const student of studentsToAdd) {
      const existing = await db.collection('classenrollments').findOne({ student: student._id, classSection: cls._id });
      
      if (!existing) {
        await db.collection('classenrollments').insertOne({
          student: student._id,
          classSection: cls._id,
          status: 'enrolled',
          enrolledAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        await db.collection('classsections').updateOne(
          { _id: cls._id },
          { $inc: { currentEnrollment: 1 } }
        );
      }
    }
  }
  console.log('Enrollments created');
  
  // Update semester
  await db.collection('semesters').updateOne(
    { code: '2025-2026_2' },
    { $set: { isCurrent: true }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  );
  
  await mongoose.disconnect();
  console.log('\n✅ Seed completed!');
  console.log('\n🎯 Test Reassign Class:');
  console.log('   - Source: MLN122-D4CA1-1501 (has students enrolled)');
  console.log('   - Target: MLN122-D5CA1-1502 (empty, same subject)');
}).catch(e => { 
  console.error(e); 
  process.exit(1); 
});
