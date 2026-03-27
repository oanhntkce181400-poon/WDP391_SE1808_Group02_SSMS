/**
 * Test login endpoint directly
 * Usage: node test-login-endpoint.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function testLoginLocal() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME,
    });

    const User = require('./src/models/user.model');

    const testEmail = 'teststudent.grades@example.com';
    const testPassword = 'TestPassword123!';

    console.log('🔐 TESTING LOGIN LOGIC LOCALLY...\n');
    console.log(`Email: ${testEmail}`);
    console.log(`Password: ${testPassword}\n`);

    // Find user
    const user = await User.findOne({ email: testEmail });

    if (!user) {
      console.log('❌ User not found!');
      process.exit(1);
    }

    console.log('✅ Step 1: User found in database');
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.isActive}`);

    // Check password
    const isPasswordValid = await bcrypt.compare(testPassword, user.password);

    if (!isPasswordValid) {
      console.log('\n❌ Step 2: Password verification FAILED!');
      process.exit(1);
    }

    console.log('\n✅ Step 2: Password verified successfully');

    // Simulate token generation
    console.log('\n✅ Step 3: Would generate JWT tokens');
    console.log(`   Sub (userId): ${user._id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ LOGIN LOGIC WORKS CORRECTLY!');
    console.log('='.repeat(60));
    console.log('\n⚠️  If mobile app still gets 401:');
    console.log('   1. Check backend server is RUNNING on port 3000');
    console.log('   2. Check mobile app connects to correct API URL');
    console.log('   3. Check auth middleware in backend');
    console.log('   4. View backend console logs');

    await mongoose.connection.close();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

testLoginLocal();
