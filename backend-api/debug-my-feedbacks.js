const mongoose = require('mongoose');

async function debugMyFeedbacks() {
  try {
    const mongoUrl = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wdp301';
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB');

    const User = require('./src/models/user.model');
    const Feedback = require('./src/models/feedback.model');

    // Get student user
    const student = await User.findOne({ email: 'student@test.com' });
    if (!student) {
      console.log('❌ Student user not found');
      process.exit(1);
    }

    console.log('\n👤 Student User:');
    console.log('   ID:', student._id);
    console.log('   Email:', student.email);

    // Check feedbacks by userId
    const feedbacks = await Feedback.find({ submittedBy: student._id })
      .populate('classSection');

    console.log('\n📊 Feedbacks found:', feedbacks.length);
    
    if (feedbacks.length > 0) {
      feedbacks.forEach((fb, idx) => {
        console.log(`\n   Feedback ${idx + 1}:`);
        console.log(`     ID: ${fb._id}`);
        console.log(`     Class: ${fb.classSection?.subjectCode}`);
        console.log(`     Rating: ${fb.rating} ⭐`);
        console.log(`     Status: ${fb.status}`);
        console.log(`     Created: ${fb.createdAt}`);
        console.log(`     Comment: ${fb.comment ? fb.comment.substring(0, 50) + '...' : 'none'}`);
      });
    } else {
      console.log('   ❌ No feedbacks found for this student');
      
      // Check all feedbacks in DB
      const allFeedbacks = await Feedback.countDocuments();
      console.log(`\n   Total feedbacks in DB: ${allFeedbacks}`);
      
      // List all feedbacks (for debugging)
      const sample = await Feedback.find({})
        .limit(3)
        .populate('classSection')
        .lean();
      
      if (sample.length > 0) {
        console.log('\n   Sample feedbacks in DB:');
        sample.forEach(fb => {
          console.log(`     - ${fb.classSection?.subjectCode} by ${fb.submittedBy || 'anonymous'}`);
        });
      }
    }

    // Check FeedbackTemplate
    const FeedbackTemplate = require('./src/models/feedbackTemplate.model');
    const template = await FeedbackTemplate.findOne({ status: 'active' });
    
    console.log('\n🔐 FeedbackTemplate:');
    if (template) {
      console.log(`   ✅ Found active template: ${template.templateName}`);
      console.log(`   Start: ${template.feedbackPeriod.startDate}`);
      console.log(`   End: ${template.feedbackPeriod.endDate}`);
      const now = new Date();
      const inWindow = now >= template.feedbackPeriod.startDate && now <= template.feedbackPeriod.endDate;
      console.log(`   In window: ${inWindow ? '✅ YES' : '❌ NO'}`);
    } else {
      console.log('   ❌ No active feedback template found');
      console.log('   💡 Run: node seed-feedback-template.js');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

debugMyFeedbacks();
