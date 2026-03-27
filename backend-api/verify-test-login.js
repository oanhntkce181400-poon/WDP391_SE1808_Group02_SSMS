/**
 * Verify test student account and test login
 * Usage: node verify-test-login.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function verifyTestLogin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME,
    });

    console.log('✅ Connected to MongoDB\n');

    const User = require('./src/models/user.model');
    const Student = require('./src/models/student.model');

    const testEmail = 'teststudent.grades@example.com';
    const testPassword = 'TestPassword123!';

    console.log('🔍 VERIFYING TEST ACCOUNT...\n');

    // Find user
    const user = await User.findOne({ email: testEmail });

    if (!user) {
      console.log('❌ User not found in database!');
      console.log(`   Email: ${testEmail}`);
      process.exit(1);
    }

    console.log('✅ User Found:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Full Name: ${user.fullName}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.isActive}`);
    console.log(`   Email Verified: ${user.emailVerified}`);

    // Verify password
    console.log('\n🔐 VERIFYING PASSWORD...');
    const isPasswordValid = await bcrypt.compare(testPassword, user.password);

    if (!isPasswordValid) {
      console.log('❌ Password verification FAILED!');
      console.log(`   Password: ${testPassword}`);
      process.exit(1);
    }

    console.log('✅ Password is CORRECT');
    console.log(`   Password: ${testPassword}`);

    // Check student record
    console.log('\n🎓 STUDENT RECORD:');
    const student = await Student.findOne({ userId: user._id });

    if (!student) {
      console.log('⚠️  No student record linked to this user');
    } else {
      console.log(`✅ Student Record Found:`);
      console.log(`   Student Code: ${student.studentCode}`);
      console.log(`   Full Name: ${student.fullName}`);
      console.log(`   Status: ${student.academicStatus}`);
      console.log(`   Active: ${student.isActive}`);
    }

    // Display login info
    console.log('\n' + '='.repeat(60));
    console.log('📱 LOGIN INFORMATION FOR MOBILE APP:');
    console.log('='.repeat(60));
    console.log(`Email:    ${testEmail}`);
    console.log(`Password: ${testPassword}`);
    console.log('\n✅ Account is ready to use!');
    console.log('\n⚠️  If still getting 401 error:');
    console.log('   1. Make sure backend server is RUNNING');
    console.log('   2. Check mobile app API_BASE_URL matches backend URL');
    console.log('   3. Verify network connectivity (ping 10.10.11.61:3000)');
    console.log('   4. Check backend logs for auth errors');

    await mongoose.connection.close();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

verifyTestLogin();
