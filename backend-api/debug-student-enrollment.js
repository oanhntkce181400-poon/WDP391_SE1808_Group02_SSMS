const mongoose = require('mongoose');
const Student = require('./src/models/student.model');
const ClassEnrollment = require('./src/models/classEnrollment.model');
const { connectDB } = require('./src/configs/db.config');

async function debugEnrollment() {
  try {
    // Connect to database
    await connectDB();
    console.log('✓ Connected to MongoDB');

    // Find the test student
    const student = await Student.findOne({ userId: '697ab37924dc848b87f25d0f' });
    console.log('\n=== STUDENT ===');
    console.log('Student ID:', student?._id);
    console.log('Student Name:', student?.fullName);
    console.log('User ID:', student?.userId);

    if (!student) {
      console.log('❌ Student not found!');
      process.exit(1);
    }

    // Find enrollments for this student
    const enrollments = await ClassEnrollment.find({ student: student._id })
      .populate({
        path: 'classSection',
        populate: [
          { path: 'subject', select: 'subjectCode subjectName credits' },
          { path: 'teacher', select: 'teacherCode fullName' },
          { path: 'room', select: 'roomCode roomName roomNumber' },
          { path: 'timeslot', select: 'groupName startTime endTime dayOfWeek' },
        ],
      });

    console.log('\n=== ENROLLMENTS ===');
    console.log('Total enrollments:', enrollments.length);
    enrollments.forEach((e, idx) => {
      console.log(`\n[${idx + 1}] Enrollment:`);
      console.log('  ID:', e._id);
      console.log('  Status:', e.status);
      console.log('  ClassSection:', e.classSection?._id);
      console.log('  ClassSection Name:', e.classSection?.className);
      console.log('  Subject:', e.classSection?.subject?.subjectCode, '-', e.classSection?.subject?.subjectName);
      console.log('  Teacher:', e.classSection?.teacher?.fullName);
    });

    // Also check for 'enrolled' status specifically
    const enrolledOnly = enrollments.filter(e => e.status === 'enrolled');
    console.log('\n=== ENROLLED ONLY ===');
    console.log('Count:', enrolledOnly.length);
    enrolledOnly.forEach((e, idx) => {
      console.log(`[${idx + 1}] ${e.classSection?.className || 'N/A'} (${e.status})`);
    });

    await mongoose.connection.close();
    console.log('\n✓ Done');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

debugEnrollment();
