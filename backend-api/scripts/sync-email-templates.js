require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const { connectDB } = require('../src/configs/db.config');
require('../src/models/user.model');
const EmailTemplate = require('../src/models/emailTemplate.model');
const emailTemplateService = require('../src/services/emailTemplate.service');

async function main() {
  try {
    await connectDB();
    const result = await emailTemplateService.syncSystemTemplates({ overwriteExisting: true });
    const total = await EmailTemplate.countDocuments();

    console.log('Đồng bộ mẫu email hệ thống thành công.');
    console.log(`- Đã tạo mới: ${result.created}`);
    console.log(`- Đã cập nhật: ${result.updated}`);
    console.log(`- Tổng số mẫu hiện có: ${total}`);
  } catch (error) {
    console.error('Đồng bộ mẫu email thất bại.');
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

main();
