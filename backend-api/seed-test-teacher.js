/**
 * Seed test teacher account for development
 * Usage: node seed-test-teacher.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function seedTestTeacher() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME,
    });

    console.log('✅ Connected to MongoDB');

    // Get models
    const User = require('./src/models/user.model');
    const Teacher = require('./src/models/teacher.model');

    // Check if teacher user already exists
    const existingTeacher = await User.findOne({ email: 'teacher@test.com' });
    if (existingTeacher) {
      console.log('⚠️  Teacher account already exists');
      console.log('📧 Email: teacher@test.com');
      console.log('🔑 Password: Teacher@123456');
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('Teacher@123456', 10);

    // Step 1: Create User account with lecturer role
    const newTeacherUser = new User({
      email: 'teacher@test.com',
      fullName: 'Test Teacher (Giảng viên)',
      password: hashedPassword,
      role: 'lecturer',
      status: 'active',
      authProvider: 'local',
      isActive: true,
    });

    const savedUser = await newTeacherUser.save();
    console.log('✅ User account created successfully');

    // Step 2: Create Teacher profile
    const newTeacher = new Teacher({
      userId: savedUser._id,
      teacherCode: 'GV999',
      email: 'teacher@test.com',
      fullName: 'Test Teacher (Giảng viên)',
      phone: '0901999999',
      department: 'CNTT',
      specialization: 'Kỹ thuật phần mềm',
      degree: 'masters',
      gender: 'male',
    });

    await newTeacher.save();
    console.log('✅ Teacher profile created successfully');

    console.log('\n📋 ===== Teacher Account Details =====');
    console.log('📧 Email       : teacher@test.com');
    console.log('🔑 Password    : Teacher@123456');
    console.log('👤 Full Name   : Test Teacher (Giảng viên)');
    console.log('🏢 Department  : CNTT');
    console.log('📚 Specialization: Kỹ thuật phần mềm');
    console.log('🎓 Degree      : Masters');
    console.log('📞 Phone       : 0901999999');
    console.log('🆔 Teacher Code: GV999');
    console.log('======================================\n');
    console.log('✨ You can now login as a teacher on the teacher page!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

seedTestTeacher();
