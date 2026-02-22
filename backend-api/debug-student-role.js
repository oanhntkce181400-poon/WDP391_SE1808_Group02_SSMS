/**
 * Debug: Check student role and permissions
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Load all models
require('./src/models/user.model');
require('./src/models/student.model');

async function debugStudentRole() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME,
    });

    console.log('✅ Connected to MongoDB\n');

    const User = mongoose.model('User');

    // Get student user
    const studentUser = await User.findOne({ email: 'student@test.com' });

    console.log('👤 Student User Details:');
    console.log('   Email:', studentUser.email);
    console.log('   ID:', studentUser._id.toString());
    console.log('   Role:', studentUser.role);
    console.log('   Status:', studentUser.status);
    console.log('   isActive:', studentUser.isActive);
    console.log('   authProvider:', studentUser.authProvider);
    console.log('');

    // Check if role is correctly set
    if (studentUser.role === 'student') {
      console.log('✅ Role is correctly set to "student"');
    } else {
      console.log('❌ ERROR: Role is "' + studentUser.role + '" instead of "student"');
      console.log('   Updating role to "student"...');
      
      studentUser.role = 'student';
      await studentUser.save();
      console.log('   ✅ Role updated!');
    }

    // Check status
    if (studentUser.status === 'active') {
      console.log('✅ Status is "active"');
    } else {
      console.log('⚠️  Status is "' + studentUser.status + '". Updating to "active"...');
      studentUser.status = 'active';
      await studentUser.save();
      console.log('   ✅ Status updated!');
    }

    // Check isActive
    if (studentUser.isActive === true) {
      console.log('✅ isActive is true');
    } else {
      console.log('⚠️  isActive is false. Updating...');
      studentUser.isActive = true;
      await studentUser.save();
      console.log('   ✅ isActive updated!');
    }

    console.log('\n✅ Student user verified!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

debugStudentRole();
