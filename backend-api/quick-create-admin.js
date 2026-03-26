require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./src/models/user.model');

async function createAdminUser() {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    // Get email and password from command line arguments
    // Usage: node quick-create-admin.js <email> <password>
    const adminEmail = process.argv[2] || 'admin@wdp301.edu.vn';
    const password = process.argv[3] || 'Admin@123456';
    const fullName = process.argv[4] || 'System Administrator';

    console.log('\n📋 Đang kết nối đến database...');
    await mongoose.connect(mongoURI);
    
    const dbName = mongoose.connection.db.databaseName;
    console.log('✓ Đã kết nối thành công đến database:', dbName);
    
    // Check if email already exists
    const existingUser = await User.findOne({ email: adminEmail });
    if (existingUser) {
      console.log('\n⚠️  Email này đã tồn tại');
      console.log(`   Hiện tại là: ${existingUser.role} - ${existingUser.fullName}`);
      await mongoose.disconnect();
      process.exit(0);
    }
    
    // Hash password
    console.log('🔐 Đang tạo tài khoản...');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create admin user
    const adminUser = await User.create({
      email: adminEmail.toLowerCase(),
      password: hashedPassword,
      fullName: fullName,
      role: 'admin',
      authProvider: 'local',
      mustChangePassword: false,
      status: 'active',
      isActive: true,
    });
    
    console.log('\n✅ Tạo tài khoản admin thành công!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 Email:    ${adminUser.email}`);
    console.log(`🔑 Mật khẩu: ${password}`);
    console.log(`👤 Họ tên:   ${adminUser.fullName}`);
    console.log(`🎯 Vai trò:  ${adminUser.role}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Lỗi:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

createAdminUser();
