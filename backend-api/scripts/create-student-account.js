require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const { connectDB } = require('../src/configs/db.config');
const { createStudent } = require('../src/services/student.service');
const Major = require('../src/models/major.model');
const User = require('../src/models/user.model');

function getArgValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index === process.argv.length - 1) {
    return fallback;
  }
  return process.argv[index + 1];
}

async function main() {
  const mustChangePassword =
    String(getArgValue('--must-change-password', 'false')).toLowerCase() === 'true';

  const payload = {
    fullName: getArgValue('--name', 'Nguyen Minh Khang'),
    majorCode: getArgValue('--major', 'SE').toUpperCase(),
    enrollmentYear: Number(getArgValue('--year', '2026')),
    gender: getArgValue('--gender', 'male'),
    dateOfBirth: new Date(getArgValue('--dob', '2005-09-15')),
    phoneNumber: getArgValue('--phone', '0901234567'),
    address: getArgValue('--address', 'Ho Chi Minh City'),
  };

  try {
    await connectDB();

    const major = await Major.findOne({ majorCode: payload.majorCode, isActive: true }).lean();
    if (!major) {
      throw new Error(`Active major not found for code "${payload.majorCode}"`);
    }

    const created = await createStudent(payload, null);

    if (!mustChangePassword && created.userId) {
      await User.findByIdAndUpdate(created.userId, { mustChangePassword: false });
    }

    console.log('Student account created successfully.');
    console.log(`Full name: ${created.fullName}`);
    console.log(`Major: ${created.majorCode}`);
    console.log(`Student code: ${created.studentCode}`);
    console.log(`Class section: ${created.classSection || 'N/A'}`);
    console.log(`Email: ${created.email}`);
    console.log(`Default password: ${created.defaultPassword}`);
    console.log(`Email password: ${created.emailPassword}`);
    console.log(`Must change password: ${mustChangePassword}`);
    console.log(`Student ID: ${created._id}`);
    console.log(`User ID: ${created.userId}`);
  } catch (error) {
    console.error('Failed to create student account.');
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

main();
