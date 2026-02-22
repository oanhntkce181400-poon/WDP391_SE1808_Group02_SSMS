/**
 * Check student account role
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function checkStudentRole() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME,
    });

    console.log('✅ Connected to MongoDB\n');

    const User = require('./src/models/user.model');

    const student = await User.findOne({ email: 'student@test.com' });

    if (!student) {
      console.log('❌ Student account not found');
      process.exit(1);
    }

    console.log('📋 Student Account Details:');
    console.log('   Email:', student.email);
    console.log('   Full Name:', student.fullName);
    console.log('   Role:', student.role);
    console.log('   Status:', student.status);
    console.log('   Is Active:', student.isActive);
    console.log('   Auth Provider:', student.authProvider);

    if (student.role === 'student') {
      console.log('\n✅ Role is correctly set to "student"');
    } else {
      console.log('\n❌ Role is NOT set to "student"! Current role:', student.role);
      console.log('\nUpdating student role to "student"...');
      
      await User.updateOne(
        { email: 'student@test.com' },
        { role: 'student' }
      );
      
      const updated = await User.findOne({ email: 'student@test.com' });
      console.log('✅ Student role updated!');
      console.log('   New role:', updated.role);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkStudentRole();
