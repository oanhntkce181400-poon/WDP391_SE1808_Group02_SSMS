require('dotenv').config();
const mongoose = require('mongoose');
const TuitionFee = require('../../models/tuitionFee.model');
const Subject = require('../../models/subject.model');

const connectDB = async () => {
  try {
    const dbConfig = require('../../configs/db.config');
    const { uri, dbName, appName } = dbConfig.getDbConfig();
    await mongoose.connect(uri, { dbName, appName });
    console.log('✅ Đã kết nối MongoDB Atlas\n');
  } catch (error) {
    console.error('❌ Lỗi kết nối MongoDB:', error);
    process.exit(1);
  }
};

const seedTuitionFees = async () => {
  try {
    console.log('🌱 Bắt đầu seed tuition fees...\n');

    await TuitionFee.deleteMany({});
    console.log('🗑️  Đã xóa dữ liệu cũ\n');

    const allSubjects = await Subject.find({}).lean();
    if (allSubjects.length === 0) {
      console.log('⚠️  Không có môn học nào. Chạy seedSubjectsWithPrices.js trước!');
      return;
    }

    console.log(`📚 Tìm thấy ${allSubjects.length} môn học\n`);

    const cohorts = ['K20', 'K21', 'K22'];
    const majors = ['SE', 'AI', 'GD', 'IB'];
    const academicYears = ['2023-2024', '2024-2025', '2025-2026'];
    
    const tuitionFees = [];

    for (const cohort of cohorts) {
      for (const major of majors) {
        for (let sem = 1; sem <= 9; sem++) {
          const numSubjects = Math.floor(Math.random() * 3) + 5;
          const semesterSubjects = [];
          const usedSubjects = new Set();
          
          let totalCredits = 0;
          let baseTuitionFee = 0;

          for (let i = 0; i < numSubjects; i++) {
            let subject;
            let attempts = 0;
            do {
              subject = allSubjects[Math.floor(Math.random() * allSubjects.length)];
              attempts++;
            } while (usedSubjects.has(subject._id.toString()) && attempts < 20);

            if (attempts >= 20) break;
            usedSubjects.add(subject._id.toString());

            const fee = subject.tuitionFee || subject.credits * 100;
            totalCredits += subject.credits;
            baseTuitionFee += fee;

            semesterSubjects.push({
              subjectId: subject._id,
              subjectCode: subject.subjectCode,
              subjectName: subject.subjectName,
              credits: subject.credits,
              tuitionFee: fee,
            });
          }

          const discounts = [];
          const hasEarlyBird = Math.random() > 0.5;
          const hasFullPayment = Math.random() > 0.6;
          const hasAlumni = Math.random() > 0.8;

          if (hasEarlyBird) {
            discounts.push({
              name: 'Early Bird',
              type: 'percentage',
              value: 5,
              description: 'Đăng ký sớm trước 30 ngày',
            });
          }

          if (hasFullPayment) {
            discounts.push({
              name: 'Full Payment',
              type: 'percentage',
              value: 10,
              description: 'Thanh toán toàn bộ học phí',
            });
          }

          if (hasAlumni) {
            discounts.push({
              name: 'Alumni',
              type: 'fixed',
              value: 500000,
              description: 'Ưu đãi sinh viên cũ',
            });
          }

          let totalDiscount = 0;
          discounts.forEach(d => {
            if (d.type === 'percentage') {
              totalDiscount += (baseTuitionFee * d.value) / 100;
            } else {
              totalDiscount += d.value;
            }
          });

          const finalFee = Math.max(0, baseTuitionFee - totalDiscount);

          tuitionFees.push({
            semester: `Kỳ ${sem}`,
            cohort,
            academicYear: sem <= 4 ? academicYears[0] : sem <= 8 ? academicYears[1] : academicYears[2],
            majorCode: major,
            subjects: semesterSubjects,
            totalCredits,
            baseTuitionFee,
            discounts,
            totalDiscount,
            finalTuitionFee: finalFee,
            status: 'active',
          });
        }
      }
    }

    const result = await TuitionFee.insertMany(tuitionFees);
    console.log(`✅ Đã tạo ${result.length} tuition fees\n`);

    console.log('📊 Một số học phí mẫu:\n');
    const samples = result.slice(0, 5);
    samples.forEach(tf => {
      console.log(`   ${tf.cohort} - ${tf.semester} (${tf.majorCode})`);
      console.log(`   Tín chỉ: ${tf.totalCredits} | Học phí gốc: ${tf.baseTuitionFee.toLocaleString('vi-VN')} VNĐ`);
      console.log(`   Giảm giá: ${tf.totalDiscount.toLocaleString('vi-VN')} VNĐ | Cuối: ${tf.finalTuitionFee.toLocaleString('vi-VN')} VNĐ`);
      console.log(`   Môn học: ${tf.subjects.length} môn`);
      console.log('');
    });

    console.log('='.repeat(60));
    console.log(`✅ Hoàn thành! Tổng cộng ${result.length} học phí`);
    console.log(`   - ${cohorts.length} khóa (${cohorts.join(', ')})`);
    console.log(`   - ${majors.length} ngành (${majors.join(', ')})`);
    console.log(`   - 9 kỳ/ngành`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Lỗi khi seed:', error);
    throw error;
  }
};

const main = async () => {
  try {
    await connectDB();
    await seedTuitionFees();
    console.log('✅ Seed thành công!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
};

main();
