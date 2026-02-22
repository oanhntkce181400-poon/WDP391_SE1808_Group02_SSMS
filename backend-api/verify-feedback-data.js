/**
 * Verify feedback data
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Load all models
require('./src/models/user.model');
require('./src/models/feedback.model');
require('./src/models/classSection.model');

async function verifyFeedbackData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME,
    });

    console.log('✅ Connected to MongoDB\n');

    const User = mongoose.model('User');
    const Feedback = mongoose.model('Feedback');
    const ClassSection = mongoose.model('ClassSection');

    // Get student user
    const studentUser = await User.findOne({ email: 'student@test.com' });
    const userId = studentUser._id;

    console.log('👤 Student User ID:', userId.toString());
    console.log('');

    // Get feedbacks
    const feedbacks = await Feedback.find({
      submittedBy: userId,
    }).populate('classSection', 'classCode');

    console.log(`✅ Found ${feedbacks.length} feedbacks:\n`);

    feedbacks.forEach((fb, i) => {
      console.log(`${i + 1}. Class: ${fb.classSection.classCode}`);
      console.log(`   Rating: ${fb.rating}⭐`);
      console.log(`   Comment: ${fb.comment.substring(0, 50)}...`);
      console.log(`   Status: ${fb.status}`);
      console.log('');
    });

    // Get stats for first class
    if (feedbacks.length > 0) {
      const classId = feedbacks[0].classSection._id;
      
      // Calculate stats
      const allClassFeedbacks = await Feedback.find({
        classSection: classId,
        status: 'approved'
      });

      const avgRating = (allClassFeedbacks.reduce((sum, f) => sum + f.rating, 0) / allClassFeedbacks.length).toFixed(2);
      
      console.log('📊 Stats for first class:');
      console.log(`   Total feedbacks: ${allClassFeedbacks.length}`);
      console.log(`   Average rating: ${avgRating}⭐`);
    }

    console.log('\n✅✅✅ All feedback data is ready! ✅✅✅');
    console.log('\nRefresh the Student Feedback page to see feedback data!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyFeedbackData();
