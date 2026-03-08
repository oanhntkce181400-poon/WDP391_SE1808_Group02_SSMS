// Script test đăng nhập sinh viên
// Chạy: node test-student-login.js

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ssms';

const UserSchema = new mongoose.Schema({
  email: String,
  password: String,
  fullName: String,
  role: String,
  status: String,
});

const User = mongoose.model('User', UserSchema);

async function testLogin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Kết nối MongoDB thành công\n');

    // Tìm một sinh viên mới tạo
    const students = await User.find({ role: 'student' }).sort({ createdAt: -1 }).limit(5);
    
    if (students.length === 0) {
      console.log('❌ Không tìm thấy sinh viên nào trong hệ thống');
      process.exit(0);
    }

    console.log(`📋 Tìm thấy ${students.length} sinh viên gần đây:\n`);

    for (const student of students) {
      console.log('─────────────────────────────────────────');
      console.log(`👤 Họ tên: ${student.fullName}`);
      console.log(`📧 Email: ${student.email}`);
      console.log(`🔒 Password Hash: ${student.password.substring(0, 20)}...`);
      console.log(`📊 Status: ${student.status}`);
      
      // Test password
      console.log('\n🔑 Test mật khẩu:');
      const testPasswords = ['123456', '12345678'];
      
      for (const testPw of testPasswords) {
        const isMatch = await bcrypt.compare(testPw, student.password);
        console.log(`  • "${testPw}": ${isMatch ? '✅ ĐÚNG' : '❌ SAI'}`);
      }
      
      console.log('');
    }

    console.log('\n💡 Hướng dẫn đăng nhập:');
    console.log('  1. Lấy email của sinh viên (format: ten+ho_viet_tat+MSSV@fpt.edu.vn)');
    console.log('  2. Mật khẩu = CCCD/CMND (nếu có) hoặc "123456"');
    console.log('  3. Nếu không đăng nhập được, kiểm tra field identityNumber trong Student collection');

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  }
}

testLogin();
