const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/.env' });

// Kết nối MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ssms';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
};

const updatePrices = async () => {
  const Subject = require('./src/models/subject.model');
  const TuitionFee = require('./src/models/tuitionFee.model');

  try {
    // Cập nhật giá môn học (100 VND per credit)
    const subjectResult = await Subject.updateMany(
      {},
      [
        {
          $set: {
            tuitionFee: { $multiply: ['$credits', 100] }
          }
        }
      ]
    );
    console.log(`✅ Updated ${subjectResult.modifiedCount} subjects`);

    // Lấy tất cả TuitionFee và cập nhật lại
    const tuitionFees = await TuitionFee.find({});
    
    for (const tf of tuitionFees) {
      let totalFee = 0;
      for (const sub of tf.subjects) {
        const newFee = sub.credits * 100;
        sub.tuitionFee = newFee;
        totalFee += newFee;
      }
      tf.totalAmount = totalFee;
      tf.paidAmount = 0;
      tf.unpaidAmount = totalFee;
      await tf.save();
    }
    console.log(`✅ Updated ${tuitionFees.length} tuition fees`);

    console.log('\n🎉 All prices updated to 100 VND per credit!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected');
    process.exit(0);
  }
};

connectDB().then(updatePrices);
