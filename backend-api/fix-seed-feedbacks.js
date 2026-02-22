/**
 * Fix: Update seed feedbacks to be anonymous so student can still submit
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Load models
require('./src/models/user.model');
require('./src/models/feedback.model');

async function fixSeedFeedbacks() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME,
    });

    console.log('✅ Connected to MongoDB\n');

    const User = mongoose.model('User');
    const Feedback = mongoose.model('Feedback');

    // Get student user
    const studentUser = await User.findOne({ email: 'student@test.com' });
    const userId = studentUser._id;

    console.log('👤 Student User ID:', userId.toString());
    console.log('');

    // Find student's feedbacks
    const studentFeedbacks = await Feedback.find({
      submittedBy: userId,
      isAnonymous: false
    });

    console.log(`Found ${studentFeedbacks.length} non-anonymous feedback records\n`);

    // Update them to be anonymous and remove submittedBy
    if (studentFeedbacks.length > 0) {
      const result = await Feedback.updateMany(
        {
          submittedBy: userId,
          isAnonymous: false
        },
        {
          $set: {
            isAnonymous: true,
            submittedBy: null
          }
        }
      );

      console.log(`✅ Updated ${result.modifiedCount} feedbacks to anonymous\n`);
    }

    // Verify
    const allFeedbacks = await Feedback.find({}).sort({ createdAt: -1 });

    console.log(`📊 Total feedbacks in database: ${allFeedbacks.length}`);
    allFeedbacks.forEach((fb, i) => {
      const submitterInfo = fb.submittedBy ? `submittedBy: ${fb.submittedBy}` : 'anonymous';
      console.log(`   ${i + 1}. ${submitterInfo} - Anonymous: ${fb.isAnonymous}`);
    });

    console.log('\n✅ FIXED! Student feedbacks are now anonymous.');
    console.log('Now student can submit their own feedback!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixSeedFeedbacks();
