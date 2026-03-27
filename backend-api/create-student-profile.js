require('dotenv').config();
const mongoose = require('mongoose');

const User = require('./src/models/user.model');
const Student = require('./src/models/student.model');
const Major = require('./src/models/major.model');

async function createStudentProfile() {
  try {
    const mongoURI = process.env.MONGODB_URI;
    console.log('Connecting to:', mongoURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    
    await mongoose.connect(mongoURI);
    
    const dbName = mongoose.connection.db.databaseName;
    console.log('✓ Connected to database:', dbName);

    // Find the user we just created
    const user = await User.findOne({ email: 'student@fpt.edu.vn' });
    if (!user) {
      console.log('❌ User not found: student@fpt.edu.vn');
      process.exit(1);
    }
    console.log('✓ Found user:', user.email);

    // Check if student profile already exists
    const existingStudent = await Student.findOne({ userId: user._id });
    if (existingStudent) {
      console.log('✓ Student profile already exists:', existingStudent.studentCode);
      process.exit(0);
    }

    // Get a major (grab the first one from database)
    const major = await Major.findOne().select('majorCode _id');
    if (!major) {
      console.log('⚠️  No major found in database, using default majorCode');
    }
    
    const majorCode = major?.majorCode || 'SE';
    const majorId = major?._id || null;

    // Create student profile
    const student = await Student.create({
      userId: user._id,
      studentCode: 'TEST001',
      fullName: 'Sinh Viên Test',
      email: user.email,
      majorCode: majorCode,
      majorId: majorId,
      cohort: 26, // K26
      dateOfBirth: new Date('2000-01-01'),
      gender: 'male',
      phoneNumber: '0123456789',
      address: 'Test Address',
      classSection: 'SE1808',
      academicStatus: 'enrolled',
      enrollmentYear: 2024,
      isActive: true,
    });

    console.log('✅ Student profile created successfully!');
    console.log('Student Code:', student.studentCode);
    console.log('Name:', student.firstName + ' ' + student.lastName);
    console.log('User ID:', student.userId);
    
    // Test login again
    console.log('\n=== Testing login ===');
    const authService = require('./src/modules/auth/auth.service');
    const result = await authService.loginWithCredentials({
      email: 'student@fpt.edu.vn',
      password: '123456'
    });
    
    console.log('✅ Login successful!');
    console.log('User:', result.user.email);
    console.log('Tokens:', {
      accessToken: result.tokens.accessToken.substring(0, 20) + '...',
      refreshToken: result.tokens.refreshToken.substring(0, 20) + '...',
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createStudentProfile();
