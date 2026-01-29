/**
 * Seed test user for development
 * Usage: node seed-test-user.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function seedTestUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME,
    });

    console.log('✅ Connected to MongoDB');

    // Get User model
    const User = require('./src/models/user.model');

    // Check if admin user exists
    const existingAdmin = await User.findOne({ email: 'admin@test.com' });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      return;
    }

    // Create new admin user
    const hashedPassword = await bcrypt.hash('Test@123456', 10);
    
    const newUser = new User({
      email: 'admin@test.com',
      fullName: 'Test Admin',
      password: hashedPassword,
      role: 'admin',
      status: 'active',
      authProvider: 'local',
      isActive: true,
    });

    await newUser.save();
    console.log('✅ Test user created successfully');
    console.log('📧 Email: admin@test.com');
    console.log('🔑 Password: Test@123456');

    // Also create a student test user
    const existingStudent = await User.findOne({ email: 'student@test.com' });
    if (!existingStudent) {
      const studentHashedPassword = await bcrypt.hash('Student@123456', 10);
      const studentUser = new User({
        email: 'student@test.com',
        fullName: 'Test Student',
        password: studentHashedPassword,
        role: 'student',
        status: 'active',
        authProvider: 'local',
        isActive: true,
      });
      await studentUser.save();
      console.log('✅ Student test user created successfully');
      console.log('📧 Email: student@test.com');
      console.log('🔑 Password: Student@123456');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

seedTestUser();
