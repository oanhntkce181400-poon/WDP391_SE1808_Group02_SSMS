/**
 * Seed feedback data for student classes
 * Usage: node seed-feedback-data.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Load all models
require('./src/models/user.model');
require('./src/models/student.model');
require('./src/models/subject.model');
require('./src/models/curriculum.model');
require('./src/models/major.model');
require('./src/models/teacher.model');
require('./src/models/room.model');
require('./src/models/timeslot.model');
require('./src/models/classSection.model');
require('./src/models/classEnrollment.model');
require('./src/models/feedback.model');
require('./src/models/feedbackTemplate.model');
require('./src/models/feedbackSubmission.model');

async function seedFeedbackData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME,
    });

    console.log('✅ Connected to MongoDB\n');

    const User = mongoose.model('User');
    const ClassEnrollment = mongoose.model('ClassEnrollment');
    const Feedback = mongoose.model('Feedback');
    const FeedbackTemplate = mongoose.model('FeedbackTemplate');

    // Get student user
    const studentUser = await User.findOne({ email: 'student@test.com' });
    const userId = studentUser._id;

    // Get admin user for creating template
    const adminUser = await User.findOne({ role: 'admin' });
    const adminId = adminUser ? adminUser._id : userId;

    console.log('👤 Student User ID:', userId.toString());
    console.log('👤 Admin User ID:', adminId.toString());
    console.log('');

    // Get enrolled classes
    const enrollments = await ClassEnrollment.find({
      student: userId,
    }).populate('classSection');

    console.log(`📝 Found ${enrollments.length} enrolled classes\n`);

    // 1. Create FeedbackTemplate
    console.log('📋 Creating Feedback Template...');
    
    let feedbackTemplate = await FeedbackTemplate.findOne({ 
      templateName: 'Đánh giá Chất Lượng Giảng Dạy - Học Kỳ 1' 
    });

    if (!feedbackTemplate) {
      const now = new Date();
      feedbackTemplate = new FeedbackTemplate({
        templateName: 'Đánh giá Chất Lượng Giảng Dạy - Học Kỳ 1',
        description: 'Mẫu đánh giá chất lượng giảng dạy cho học kỳ 1 năm học 2024-2025',
        questions: [
          {
            questionText: 'Thầy/cô có truyền tải nội dung đầy đủ và rõ ràng?',
            questionType: 'rating',
            ratingScale: 5,
            displayOrder: 1
          },
          {
            questionText: 'Chất liệu bài giảng và tài liệu học tập có chất lượng?',
            questionType: 'rating',
            ratingScale: 5,
            displayOrder: 2
          },
          {
            questionText: 'Môi trường học tập trong lớp được cải thiện như thế nào?',
            questionType: 'text',
            maxLength: 500,
            isRequired: false,
            displayOrder: 3
          },
          {
            questionText: 'Bạn có hài lòng với tiến độ và điều phối của khóa học?',
            questionType: 'rating',
            ratingScale: 5,
            displayOrder: 4
          },
          {
            questionText: 'Nhận xét chung của bạn về môn học này:',
            questionType: 'text',
            maxLength: 1000,
            isRequired: false,
            displayOrder: 5
          }
        ],
        feedbackPeriod: {
          startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        },
        status: 'active',
        applicableTo: ['classSection'],
        isCompulsory: true,
        createdBy: adminId
      });

      await feedbackTemplate.save();
      console.log('✅ Created FeedbackTemplate\n');
    } else {
      console.log('✅ Found existing FeedbackTemplate\n');
    }

    // 2. Create Feedback records for each class
    console.log('⭐ Creating Feedback records...\n');

    const feedbackComments = [
      'Giảng viên tuyệt vời, dạy rất rõ ràng và có kiến thức sâu về môn học.',
      'Bài giảng hay nhưng tốc độ hơi nhanh, mong giảng viên giảm tốc độ.',
      'Rất tốt! Giảng viên tương tác với sinh viên nhiều và giải đáp thắc mắc tận tình.',
      'Nội dung hay nhưng muốn có nhiều bài tập thực hành hơn.',
      'Giảng viên rất nhiệt tình. Một môn học rất hữu ích cho tương lai của tôi.'
    ];

    let feedbackCount = 0;

    for (let i = 0; i < enrollments.length; i++) {
      const enrollment = enrollments[i];
      const classId = enrollment.classSection._id;
      const className = enrollment.classSection.classCode;

      console.log(`Processing class: ${className}...`);

      // Check if feedback already exists
      const existingFeedback = await Feedback.findOne({
        classSection: classId,
        submittedBy: userId,
      });

      if (!existingFeedback) {
        const feedback = new Feedback({
          classSection: classId,
          submittedBy: null, // Anonymous feedback - no user attribution
          isAnonymous: true, // This allows other students to still submit their own feedback
          rating: 4 + Math.floor(Math.random() * 2), // 4 or 5 stars
          comment: feedbackComments[i % feedbackComments.length],
          criteria: {
            teachingQuality: 4 + Math.floor(Math.random() * 2),
            courseContent: 4 + Math.floor(Math.random() * 2),
            classEnvironment: 4 + Math.floor(Math.random() * 2),
            materialQuality: 4 + Math.floor(Math.random() * 2)
          },
          status: 'approved',
          submissionIp: '127.0.0.1',
          submissionUserAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        });

        await feedback.save();
        feedbackCount++;
        console.log(`✅ Created feedback for ${className}`);
      } else {
        console.log(`⏭️  Feedback already exists for ${className}`);
      }
    }

    console.log(`\n✅ Created ${feedbackCount} new feedback records\n`);

    // Summary
    const allFeedbacks = await Feedback.find({
      submittedBy: userId,
    }).populate('classSection', 'classCode className');

    console.log('📊 Summary:');
    console.log(`   Total feedbacks for student: ${allFeedbacks.length}`);
    allFeedbacks.forEach((fb, i) => {
      console.log(`   ${i + 1}. ${fb.classSection.classCode} - Rating: ${fb.rating}⭐ - Status: ${fb.status}`);
    });

    console.log('\n✅✅✅ Feedback data seeding completed! ✅✅✅');
    console.log('\nRefresh the browser to see feedback data on the Student Feedback page!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

seedFeedbackData();
