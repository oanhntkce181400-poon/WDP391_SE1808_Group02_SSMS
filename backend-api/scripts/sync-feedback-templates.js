require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../src/configs/db.config');
const feedbackTemplateService = require('../src/services/feedbackTemplate.service');
const User = require('../src/models/user.model');

async function main() {
  try {
    await connectDB();

    const adminUser = await User.findOne({
      role: { $in: ['admin', 'staff'] },
    }).select('_id email fullName role');

    if (!adminUser) {
      throw new Error('Không tìm thấy tài khoản admin/staff để gán người tạo mẫu feedback.');
    }

    const result = await feedbackTemplateService.syncDefaultTemplates(adminUser._id);

    console.log('Đã đồng bộ mẫu feedback mặc định thành công.');
    console.log(`Người thực hiện: ${adminUser.fullName || adminUser.email} (${adminUser.role})`);
    console.log(`Số mẫu được xử lý: ${result.count}`);

    result.results.forEach((item, index) => {
      console.log(
        `${index + 1}. [${item.action}] ${item.template.templateCode} - ${item.template.templateName}`,
      );
    });
  } catch (error) {
    console.error('Đồng bộ mẫu feedback mặc định thất bại:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

main();
