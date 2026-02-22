const mongoose = require('mongoose');

async function seedFeedbackTemplate() {
  try {
    const mongoUrl = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wdp301';
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB');

    const FeedbackTemplate = require('./src/models/feedbackTemplate.model');
    const User = require('./src/models/user.model');

    // Get admin user to set as createdBy
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('❌ Admin user not found');
      process.exit(1);
    }

    // Clear existing templates
    await FeedbackTemplate.deleteMany({});
    console.log('🗑️ Cleared existing feedback templates');

    // Create a feedback template with extended feedback window
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 5); // Started 5 days ago
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 30); // Ends 30 days from now

    const template = new FeedbackTemplate({
      templateName: 'Đánh giá chất lượng giảng dạy - Học kỳ 1 (2025-2026)',
      description: 'Đánh giá các khía cạnh giảng dạy, nội dung khóa học, môi trường lớp học và chất lượng tài liệu',
      questions: [
        {
          questionText: 'Thầy/cô có truyền tải nội dung đầy đủ và rõ ràng?',
          questionType: 'rating',
          ratingScale: 5,
          displayOrder: 1
        },
        {
          questionText: 'Phương pháp giảng dạy có hiệu quả và phù hợp?',
          questionType: 'rating',
          ratingScale: 5,
          displayOrder: 2
        },
        {
          questionText: 'Nội dung bài giảng có liên hệ với thực tế?',
          questionType: 'rating',
          ratingScale: 5,
          displayOrder: 3
        },
        {
          questionText: 'Bạn cảm thấy hài lòng với môi trường học tập?',
          questionType: 'rating',
          ratingScale: 5,
          displayOrder: 4
        },
        {
          questionText: 'Tài liệu học tập có chất lượng tốt?',
          questionType: 'rating',
          ratingScale: 5,
          displayOrder: 5
        },
        {
          questionText: 'Ý kiến của bạn về lớp học này?',
          questionType: 'text',
          isRequired: false,
          maxLength: 500,
          displayOrder: 6
        }
      ],
      feedbackPeriod: {
        startDate,
        endDate
      },
      status: 'active',
      createdBy: admin._id
    });

    await template.save();
    console.log('✅ Created feedback template with:');
    console.log(`   Start: ${startDate.toLocaleString('vi-VN')}`);
    console.log(`   End:   ${endDate.toLocaleString('vi-VN')}`);
    console.log(`   Status: active`);

    // Calculate remaining time
    const remainingMs = endDate.getTime() - now.getTime();
    const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
    console.log(`   ⏱️ Còn ${remainingDays} ngày để cho phép chỉnh sửa đánh giá`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

seedFeedbackTemplate();
