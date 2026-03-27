#!/usr/bin/env node

/**
 * Quick test user creation script
 * Creates a student user that can be used for mobile app testing
 * 
 * Requirements:
 * - MongoDB must be running
 * - .env file configured
 * 
 * Usage: node create-test-user.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const testUsers = [
  {
    email: 'student@example.com',
    password: 'Password123!',
    fullName: 'Test Student',
    role: 'student',
    description: 'Default test student account'
  },
  {
    email: 'teststudent@example.com',
    password: 'password123',
    fullName: 'Test Student 2',
    role: 'student',
    description: 'Alternative test account'
  }
];

async function createTestUser() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME,
    });
    console.log('✅ Connected to MongoDB\n');

    const User = require('./src/models/user.model');

    for (const testUser of testUsers) {
      console.log(`📝 Creating user: ${testUser.email}`);
      
      // Check if user exists
      let user = await User.findOne({ email: testUser.email });
      
      if (user) {
        console.log(`⚠️  User already exists: ${testUser.email}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Full Name: ${user.fullName}\n`);
        continue;
      }

      // Create new user
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      user = new User({
        email: testUser.email,
        password: hashedPassword,
        fullName: testUser.fullName,
        role: testUser.role,
        emailVerified: true,
        isActive: true,
      });

      await user.save();
      console.log(`✅ User created successfully!`);
      console.log(`   Email: ${testUser.email}`);
      console.log(`   Password: ${testUser.password}`);
      console.log(`   Role: ${testUser.role}`);
      console.log(`   Full Name: ${testUser.fullName}`);
      console.log(`   ${testUser.description}\n`);
    }

    console.log('\n✅ All test users created/verified!');
    console.log('\n📱 Use these credentials in the mobile app:');
    testUsers.forEach(u => {
      console.log(`   Email: ${u.email}`);
      console.log(`   Password: ${u.password}`);
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n⚠️  MongoDB is not running!');
      console.error('Please start MongoDB first:');
      console.error('  - Windows: mongod');
      console.error('  - Or use: npm run db:start (if configured)');
    }
    process.exit(1);
  }
}

createTestUser();
