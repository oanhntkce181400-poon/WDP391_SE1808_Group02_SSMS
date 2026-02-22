const mongoose = require('mongoose');
const User = require('./src/models/user.model');
const Student = require('./src/models/student.model');
const { connectDB } = require('./src/configs/db.config');

async function debugUsers() {
  try {
    await connectDB();
    console.log('✓ Connected to MongoDB');

    // Find user
    const user = await User.findById('697ab37924dc848b87f25d0f');
    console.log('\n=== USER ===');
    console.log('User ID:', user?._id);
    console.log('Email:', user?.email);
    console.log('Role:', user?.role);
    console.log('Full User:', JSON.stringify(user, null, 2));

    // Find all students
    const students = await Student.find().limit(5);
    console.log('\n=== ALL STUDENTS (first 5) ===');
    students.forEach((s, idx) => {
      console.log(`[${idx + 1}] Student ID: ${s._id}, UserId: ${s.userId}, Name: ${s.fullName}`);
    });

    // Find any student with this userId
    const linkedStudent = await Student.findOne({ userId: '697ab37924dc848b87f25d0f' });
    console.log('\n=== LINKED STUDENT ===');
    console.log('Found:', !!linkedStudent);
    if (linkedStudent) {
      console.log('Student ID:', linkedStudent._id);
    }

    await mongoose.connection.close();
    console.log('\n✓ Done');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

debugUsers();
