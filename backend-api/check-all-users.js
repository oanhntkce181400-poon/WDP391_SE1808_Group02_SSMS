/**
 * Check all users in database to debug login issue
 * Usage: node check-all-users.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function checkAllUsers() {
  try {
    console.log('📊 CONNECTING TO MONGODB...');
    console.log(`   URI: ${process.env.MONGODB_URI}`);
    console.log(`   DB: ${process.env.MONGODB_DB_NAME}\n`);

    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME,
    });

    console.log('✅ Connected to MongoDB\n');

    const User = require('./src/models/user.model');
    const Student = require('./src/models/student.model');

    // Get all users
    const users = await User.find().select('email fullName role isActive emailVerified');
    
    console.log('📋 ALL USERS IN DATABASE:');
    console.log(`   Total: ${users.length} users\n`);

    if (users.length === 0) {
      console.log('⚠️  No users found in database!');
    } else {
      users.forEach((user, idx) => {
        console.log(`[${idx + 1}] Email: ${user.email}`);
        console.log(`    Name: ${user.fullName}`);
        console.log(`    Role: ${user.role}`);
        console.log(`    Active: ${user.isActive}`);
        console.log(`    Email Verified: ${user.emailVerified}`);
        console.log('');
      });
    }

    // Check for test student user
    console.log('\n🔍 SEARCHING FOR TEST STUDENTS...');
    const testUsers = await User.find({ 
      email: { $regex: 'test', $options: 'i' } 
    }).select('email fullName');

    if (testUsers.length > 0) {
      console.log(`Found ${testUsers.length} test users:`);
      testUsers.forEach(u => console.log(`   - ${u.email}`));
    } else {
      console.log('❌ No test users found');
    }

    // Check students
    const students = await Student.find().select('studentCode fullName email');
    console.log(`\n📚 STUDENTS: ${students.length} records`);
    students.slice(0, 5).forEach(s => {
      console.log(`   - ${s.studentCode}: ${s.email || 'no email'}`);
    });

    await mongoose.connection.close();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

checkAllUsers();
