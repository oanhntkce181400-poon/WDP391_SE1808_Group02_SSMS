const mongoose = require('mongoose');
const Student = require('./src/models/student.model');
const { connectDB } = require('./src/configs/db.config');

async function checkStudentUserId() {
  try {
    await connectDB();
    console.log('✓ Connected to MongoDB');

    // Find the student by email
    const student = await Student.findOne({ email: 'student@test.com' });
    console.log('\n=== STUDENT ===');
    console.log('Found:', !!student);
    console.log('ID:', student?._id);
    console.log('Name:', student?.fullName);
    console.log('Code:', student?.studentCode);
    console.log('Email:', student?.email);
    console.log('userId:', student?.userId);
    console.log('userId type:', typeof student?.userId);
    console.log('Full object:', JSON.stringify(student?.toObject?.(), null, 2));

    // Try to find by userId
    const byUserId = await Student.findOne({ userId: '697ab37924dc848b87f25d0f' });
    console.log('\n=== BY STRING USER ID ===');
    console.log('Found:', !!byUserId);

    const byObjectId = await Student.findOne({ userId: new mongoose.Types.ObjectId('697ab37924dc848b87f25d0f') });
    console.log('\n=== BY OBJECT ID ===');
    console.log('Found:', !!byObjectId);

    await mongoose.connection.close();
    console.log('\n✓ Done');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkStudentUserId();
