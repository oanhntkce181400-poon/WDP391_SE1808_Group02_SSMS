// update-all-prices-to-100.js
// Script cập nhật tất cả giá tín chỉ về 100 VNĐ
// Chạy: node update-all-prices-to-100.js

const mongoose = require('mongoose');
require('dotenv').config();

const PRICE_PER_CREDIT = 100; // 100 VNĐ / tín chỉ

async function updatePrices() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sms');
    console.log('✅ Đã kết nối MongoDB\n');

    const Subject = require('./src/models/subject.model');
    const TuitionFee = require('./src/models/tuitionFee.model');
    const Curriculum = require('./src/models/curriculum.model');

    // 1. Update Subject.tuitionFee = credits * 100
    const subjects = await Subject.find({});
    let subjectCount = 0;
    for (const sub of subjects) {
      const newTuitionFee = sub.credits * PRICE_PER_CREDIT;
      if (sub.tuitionFee !== newTuitionFee) {
        await Subject.updateOne(
          { _id: sub._id },
          { tuitionFee: newTuitionFee }
        );
        subjectCount++;
      }
    }
    console.log(`✅ Đã cập nhật ${subjectCount}/${subjects.length} Subject`);

    // 2. Update TuitionFee - recalculate baseTuitionFee và finalTuitionFee
    const tuitionFees = await TuitionFee.find({});
    let tuitionCount = 0;
    for (const tf of tuitionFees) {
      const newBaseTuitionFee = tf.totalCredits * PRICE_PER_CREDIT;
      const newFinalTuitionFee = newBaseTuitionFee - (tf.totalDiscount || 0);
      
      if (tf.baseTuitionFee !== newBaseTuitionFee || tf.finalTuitionFee !== newFinalTuitionFee) {
        await TuitionFee.updateOne(
          { _id: tf._id },
          { 
            baseTuitionFee: newBaseTuitionFee,
            finalTuitionFee: newFinalTuitionFee
          }
        );
        tuitionCount++;
      }
    }
    console.log(`✅ Đã cập nhật ${tuitionCount}/${tuitionFees.length} TuitionFee`);

    // 3. Update Curriculum embedded structure - courses[].tuitionFee
    const curricula = await Curriculum.find({});
    let curriculumCount = 0;
    for (const cur of curricula) {
      let updated = false;
      if (cur.semesters && cur.semesters.length > 0) {
        for (const sem of cur.semesters) {
          if (sem.courses && sem.courses.length > 0) {
            for (const course of sem.courses) {
              const newTuitionFee = (course.credits || 0) * PRICE_PER_CREDIT;
              if (course.tuitionFee !== newTuitionFee) {
                course.tuitionFee = newTuitionFee;
                updated = true;
              }
            }
          }
        }
      }
      if (updated) {
        await Curriculum.updateOne({ _id: cur._id }, { semesters: cur.semesters });
        curriculumCount++;
      }
    }
    console.log(`✅ Đã cập nhật ${curriculumCount}/${curricula.length} Curriculum`);

    // 4. Update CurriculumCourse (relational) - tuitionFee
    const CurriculumCourse = require('./src/models/curriculumCourse.model');
    const curriculumCourses = await CurriculumCourse.find({});
    let ccCount = 0;
    for (const cc of curriculumCourses) {
      const newTuitionFee = (cc.credits || 0) * PRICE_PER_CREDIT;
      if (cc.tuitionFee !== newTuitionFee) {
        await CurriculumCourse.updateOne(
          { _id: cc._id },
          { tuitionFee: newTuitionFee }
        );
        ccCount++;
      }
    }
    console.log(`✅ Đã cập nhật ${ccCount}/${curriculumCourses.length} CurriculumCourse`);

    console.log('\n🎉 Hoàn tất! Tất cả giá đã được cập nhật về 100 VNĐ/tín chỉ');

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Đã ngắt kết nối MongoDB');
    process.exit(0);
  }
}

updatePrices();
