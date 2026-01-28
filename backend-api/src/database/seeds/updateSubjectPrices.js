// Script to update tuition fees for all subjects in MongoDB Atlas
// Formula: tuitionFee = credits × 630,000 VNĐ
require('dotenv').config();
const mongoose = require('mongoose');
const Subject = require('../../models/subject.model');

// Giá 1 tín chỉ
const PRICE_PER_CREDIT = 630000; // 630,000 VNĐ

// Kết nối MongoDB Atlas
const connectDB = async () => {
  try {
    const dbConfig = require('../../configs/db.config');
    await mongoose.connect(process.env.MONGODB_URI || dbConfig.url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Đã kết nối MongoDB Atlas');
  } catch (error) {
    console.error('❌ Lỗi kết nối MongoDB:', error);
    process.exit(1);
  }
};

// Update giá tiền cho tất cả môn học
const updateSubjectPrices = async () => {
  try {
    console.log('\n🔄 Bắt đầu cập nhật giá tiền cho các môn học...\n');

    // Lấy tất cả môn học
    const subjects = await Subject.find({});
    console.log(`📚 Tìm thấy ${subjects.length} môn học\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const subject of subjects) {
      const tuitionFee = subject.credits * PRICE_PER_CREDIT;
      
      // Update môn học
      await Subject.updateOne(
        { _id: subject._id },
        { $set: { tuitionFee: tuitionFee } }
      );

      console.log(`✅ ${subject.subjectCode} (${subject.subjectName})`);
      console.log(`   Tín chỉ: ${subject.credits} → Học phí: ${tuitionFee.toLocaleString('vi-VN')} VNĐ`);
      
      updatedCount++;
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Hoàn thành! Đã cập nhật ${updatedCount} môn học`);
    console.log(`⏭️  Bỏ qua: ${skippedCount} môn học`);
    console.log('='.repeat(60) + '\n');

    // Hiển thị một vài ví dụ
    console.log('📊 Ví dụ giá tiền theo tín chỉ:');
    console.log(`   1 tín chỉ = ${(1 * PRICE_PER_CREDIT).toLocaleString('vi-VN')} VNĐ`);
    console.log(`   2 tín chỉ = ${(2 * PRICE_PER_CREDIT).toLocaleString('vi-VN')} VNĐ`);
    console.log(`   3 tín chỉ = ${(3 * PRICE_PER_CREDIT).toLocaleString('vi-VN')} VNĐ`);
    console.log(`   4 tín chỉ = ${(4 * PRICE_PER_CREDIT).toLocaleString('vi-VN')} VNĐ`);
    console.log(`   5 tín chỉ = ${(5 * PRICE_PER_CREDIT).toLocaleString('vi-VN')} VNĐ`);
    console.log(`   6 tín chỉ = ${(6 * PRICE_PER_CREDIT).toLocaleString('vi-VN')} VNĐ\n`);

  } catch (error) {
    console.error('❌ Lỗi khi cập nhật giá:', error);
    throw error;
  }
};

// Main function
const main = async () => {
  try {
    await connectDB();
    await updateSubjectPrices();
    
    console.log('✅ Cập nhật thành công!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
};

// Run script
main();
