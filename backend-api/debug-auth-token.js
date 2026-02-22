const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const config = require('./src/configs/db.config');

async function debugAuthToken() {
  try {
    const mongoUrl = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wdp301';
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB');

    const User = require('./src/models/user.model');
    
    // Get the student user
    const student = await User.findOne({ email: 'student@test.com' });
    if (!student) {
      console.log('❌ Student user not found');
      process.exit(1);
    }

    console.log('\n👤 Student User:');
    console.log('   Email:', student.email);
    console.log('   Role:', student.role);
    console.log('   ID:', student._id);

    // Simulate what the auth.service does when issuing tokens
    const token = jwt.sign({
      sub: String(student._id),
      role: student.role,
      familyId: 'test-fam123',
      jti: 'test-jti123',
      type: 'access',
    }, process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me', 
    { expiresIn: '1h' });

    console.log('\n🔐 Generated Token:', token.substring(0, 50) + '...');

    // Decode the token to see what it contains
    const decoded = jwt.decode(token);
    console.log('\n📦 Token Payload:');
    console.log(JSON.stringify(decoded, null, 2));

    // Verify the token contains the role
    if (decoded.role) {
      console.log('\n✅ Token DOES include role:', decoded.role);
    } else {
      console.log('\n❌ Token DOES NOT include role!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

debugAuthToken();
