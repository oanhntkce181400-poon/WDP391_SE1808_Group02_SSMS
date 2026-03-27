require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const User = require('./src/models/user.model');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createAdminUser() {
  try {
    const mongoURI = process.env.MONGODB_URI;
    console.log('\n📋 Đang kết nối đến database...');
    console.log('Connecting to:', mongoURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    
    await mongoose.connect(mongoURI);
    
    const dbName = mongoose.connection.db.databaseName;
    console.log('✓ Đã kết nối thành công đến database:', dbName);
    
    // List existing admins
    const existingAdmins = await User.find({ role: 'admin' }).select('email fullName');
    if (existingAdmins.length > 0) {
      console.log('\n📊 Các tài khoản admin hiện có:');
      existingAdmins.forEach(u => console.log(`  - ${u.email} (${u.fullName})`));
    } else {
      console.log('\n⚠️  Chưa có tài khoản admin nào');
    }
    
    // Prompt for admin details
    console.log('\n📝 Nhập thông tin tài khoản admin mới:');
    const adminEmail = await question('Email: ');
    const fullName = await question('Họ và tên: ');
    const password = await question('Mật khẩu: ');
    const confirmPassword = await question('Xác nhận mật khẩu: ');
    
    // Validation
    if (!adminEmail || !adminEmail.includes('@')) {
      console.log('\n❌ Email không hợp lệ');
      process.exit(1);
    }
    
    if (!fullName.trim()) {
      console.log('\n❌ Vui lòng nhập họ và tên');
      process.exit(1);
    }
    
    if (password.length < 6) {
      console.log('\n❌ Mật khẩu phải tối thiểu 6 ký tự');
      process.exit(1);
    }
    
    if (password !== confirmPassword) {
      console.log('\n❌ Mật khẩu xác nhận không khớp');
      process.exit(1);
    }
    
    // Check if email already exists
    const existingUser = await User.findOne({ email: adminEmail });
    if (existingUser) {
      console.log('\n❌ Email này đã tồn tại trong hệ thống');
      console.log(`   Hiện tại là: ${existingUser.role} - ${existingUser.fullName}`);
      process.exit(1);
    }
    
    // Hash password
    console.log('\n🔐 Đang mã hóa mật khẩu...');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create admin user
    const adminUser = await User.create({
      email: adminEmail.toLowerCase(),
      password: hashedPassword,
      fullName: fullName.trim(),
      role: 'admin',
      authProvider: 'local',
      mustChangePassword: false,
      status: 'active',
      isActive: true,
    });
    
    console.log('\n✅ Tham số tài khoản admin thành công!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Email:    ${adminUser.email}`);
    console.log(`Họ tên:   ${adminUser.fullName}`);
    console.log(`Vai trò:  ${adminUser.role}`);
    console.log(`Trạng thái: ${adminUser.status}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🎯 Bạn có thể đăng nhập bằng:');
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Mật khẩu: (mật khẩu bạn vừa nhập)\n`);
    
    await mongoose.disconnect();
    console.log('✓ Đã ngắt kết nối database\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Lỗi:', error.message);
    if (error.code === 11000) {
      console.error('   Email này đã tồn tại trong hệ thống');
    }
    await mongoose.disconnect();
    process.exit(1);
  } finally {
    rl.close();
  }
}

createAdminUser();
