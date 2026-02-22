const mongoose = require('mongoose');
const ClassEnrollment = require('./src/models/classEnrollment.model');
const Student = require('./src/models/student.model');
const User = require('./src/models/user.model');
const { connectDB } = require('./src/configs/db.config');

async function testGetMyClasses() {
  try {
    await connectDB();
    console.log('✓ Connected to MongoDB');

    // Find user
    const userId = '697ab37924dc848b87f25d0f';
    const user = await User.findById(userId);
    console.log('\n=== USER ===');
    console.log('User found:', !!user);
    console.log('Email:', user?.email);

    // Find student by userId
    const student = await Student.findOne({ userId: userId });
    console.log('\n=== STUDENT ===');
    console.log('Student found:', !!student);
    console.log('Student ID:', student?._id);

    if (!student) {
      console.log('❌ Student not found!');
      process.exit(1);
    }

    // Replicate getMyClasses logic
    console.log('\n=== TESTING GET MY CLASSES ===');
    console.log('Searching for enrollments with:');
    console.log('  student:', student._id);
    console.log('  status: $in: ["enrolled", "completed"]');

    const enrollments = await ClassEnrollment.find({ 
      student: student._id,
      status: { $in: ['enrolled', 'completed'] }
    })
      .populate({
        path: 'classSection',
        populate: [
          { path: 'subject', select: 'subjectCode subjectName credits' },
          { path: 'teacher', select: 'teacherCode fullName' },
          { path: 'room', select: 'roomCode roomName roomNumber' },
          { path: 'timeslot', select: 'groupName startTime endTime dayOfWeek' },
        ],
      })
      .sort({ createdAt: -1 })
      .exec();

    console.log('\nFound enrollments:', enrollments.length);

    // Extract class sections
    const classes = enrollments.map(e => ({
      ...e.classSection.toObject(),
      enrollmentId: e._id,
    }));

    console.log('\nExtracted classes:', classes.length);
    classes.forEach((c, idx) => {
      console.log(`[${idx + 1}] ${c.className}`);
      console.log(`    Subject: ${c.subject?.subjectCode} - ${c.subject?.subjectName}`);
      console.log(`    Teacher: ${c.teacher?.fullName}`);
    });

    await mongoose.connection.close();
    console.log('\n✓ Done');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testGetMyClasses();
