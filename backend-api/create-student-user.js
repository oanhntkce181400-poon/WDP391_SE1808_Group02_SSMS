require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./src/models/user.model');

async function createStudentUser() {
  try {
    const mongoURI = process.env.MONGODB_URI;
    console.log('Connecting to:', mongoURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    
    await mongoose.connect(mongoURI);
    
    // Check actual database name being used
    const dbName = mongoose.connection.db.databaseName;
    console.log('✓ Connected to database:', dbName);
    console.log('✓ Collections:', await mongoose.connection.db.listCollections().toArray().then(c => c.map(x => x.name)));
    
    const User = require('./src/models/user.model');

    // List all existing users first
    const allUsers = await User.find({}).select('email role fullName');
    console.log('\n=== EXISTING USERS ===');
    allUsers.forEach(u => console.log(`- ${u.email} (${u.role}) - ${u.fullName}`));
    console.log('======================\n');

    const studentEmail = 'student@fpt.edu.vn';
    const studentPassword = '123456';
    const saltRounds = 10;

    // Delete if exists first
    const deleted = await User.deleteOne({ email: studentEmail });
    if (deleted.deletedCount > 0) {
      console.log('Deleted existing student user');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(studentPassword, saltRounds);

    // Create student user
    const studentUser = await User.create({
      email: studentEmail,
      password: hashedPassword,
      fullName: 'Nguyen Van A',
      role: 'student',
      authProvider: 'local',
      mustChangePassword: false,
      status: 'active',
      isActive: true,
    });

    console.log('\n✅ Student user created successfully!');
    console.log('Email:', studentUser.email);
    console.log('Password: 123456');
    console.log('Role:', studentUser.role);
    console.log('_id:', studentUser._id);
    
    // Verify by listing all users again
    const finalUsers = await User.find({}).select('email role fullName');
    console.log('\n=== ALL USERS AFTER CREATE ===');
    finalUsers.forEach(u => console.log(`- ${u.email} (${u.role}) - ${u.fullName}`));
    console.log('==============================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error creating student user:', error);
    process.exit(1);
  }
}

createStudentUser();
