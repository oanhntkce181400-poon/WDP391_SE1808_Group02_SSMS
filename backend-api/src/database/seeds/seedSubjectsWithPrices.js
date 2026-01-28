require('dotenv').config();
const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');
const Subject = require('../../models/subject.model');

const PRICE_PER_CREDIT = 630000;

const DEPARTMENTS = ['AI', 'GD', 'IB', 'SE', 'IA', 'MC', 'SA', 'CS', 'IT'];

const CODE_PREFIXES = {
  'AI': ['AI', 'ML', 'DL'],
  'GD': ['GD', 'DES', 'ART'],
  'IB': ['BUS', 'MGT', 'MKT'],
  'SE': ['SE', 'SWE', 'SWT'],
  'IA': ['IA', 'NET', 'SYS'],
  'MC': ['MC', 'MED', 'COM'],
  'SA': ['SA', 'ANL', 'DATA'],
  'CS': ['CS', 'ALG', 'PROG'],
  'IT': ['IT', 'WEB', 'MOB']
};

const connectDB = async () => {
  try {
    const dbConfig = require('../../configs/db.config');
    const { uri, dbName, appName } = dbConfig.getDbConfig();
    await mongoose.connect(uri, { dbName, appName });
    console.log('✅ Đã kết nối MongoDB Atlas\n');
  } catch (error) {
    console.error('❌ Lỗi kết nối MongoDB:', error);
    process.exit(1);
  }
};

const generateSubjectCode = (department) => {
  const prefixes = CODE_PREFIXES[department] || ['SUB'];
  const prefix = faker.helpers.arrayElement(prefixes);
  const number = faker.number.int({ min: 100, max: 599 });
  return `${prefix}${number}`;
};

const generateSubjectName = (department) => {
  const topics = {
    'AI': ['Machine Learning', 'Deep Learning', 'Neural Networks', 'Computer Vision', 'NLP'],
    'GD': ['Graphic Design', 'UI/UX Design', '3D Modeling', 'Animation', 'Typography'],
    'IB': ['Business Management', 'Marketing', 'Finance', 'Accounting', 'Economics'],
    'SE': ['Software Engineering', 'Agile Development', 'Testing', 'DevOps', 'Cloud Computing'],
    'IA': ['Network Security', 'System Architecture', 'Database Design', 'Infrastructure', 'Cloud'],
    'MC': ['Digital Media', 'Content Creation', 'Video Production', 'Social Media', 'Broadcasting'],
    'SA': ['Data Analysis', 'Business Intelligence', 'Big Data', 'Analytics', 'Visualization'],
    'CS': ['Algorithms', 'Data Structures', 'Programming', 'Compilers', 'Operating Systems'],
    'IT': ['Web Development', 'Mobile Apps', 'Software Testing', 'IT Management', 'Networking']
  };

  const levels = ['Fundamentals', 'Advanced', 'Introduction to', 'Principles of', 'Applied'];
  const topic = faker.helpers.arrayElement(topics[department] || topics['CS']);
  const level = faker.helpers.arrayElement(levels);
  
  return `${level} ${topic}`;
};

const seedSubjects = async (count = 50) => {
  try {
    console.log(`🌱 Bắt đầu seed ${count} môn học...\n`);

    await Subject.deleteMany({});
    console.log('🗑️  Đã xóa dữ liệu cũ\n');

    const subjects = [];
    const usedCodes = new Set();

    for (let i = 0; i < count; i++) {
      const department = faker.helpers.arrayElement(DEPARTMENTS);
      let subjectCode = generateSubjectCode(department);

      let attempts = 0;
      while (usedCodes.has(subjectCode) && attempts < 10) {
        subjectCode = generateSubjectCode(department);
        attempts++;
      }
      usedCodes.add(subjectCode);

      const credits = faker.helpers.arrayElement([1, 2, 3, 4, 5, 6]);
      const tuitionFee = credits * PRICE_PER_CREDIT;
      const subjectName = generateSubjectName(department);
      const isCommon = faker.datatype.boolean({ probability: 0.2 });

      const numDepts = faker.number.int({ min: 1, max: isCommon ? 3 : 1 });
      const majorCodes = faker.helpers.arrayElements(DEPARTMENTS, numDepts);

      const subject = {
        subjectCode,
        subjectName,
        credits,
        tuitionFee,
        majorCode: majorCodes[0],
        majorCodes,
        isCommon,
        prerequisites: []
      };

      subjects.push(subject);
    }

    const result = await Subject.insertMany(subjects);
    console.log(`✅ Đã tạo ${result.length} môn học\n`);

    console.log('📊 Một số môn học mẫu:\n');
    const samples = result.slice(0, 10);
    samples.forEach(subject => {
      console.log(`   ${subject.subjectCode} - ${subject.subjectName}`);
      console.log(`   Tín chỉ: ${subject.credits} | Học phí: ${subject.tuitionFee.toLocaleString('vi-VN')} VNĐ`);
      console.log(`   Khoa: ${subject.majorCodes.join(', ')}${subject.isCommon ? ' (Môn chung)' : ''}`);
      console.log('');
    });

    console.log('='.repeat(60));
    console.log('📈 Thống kê:');
    
    const stats = await Subject.aggregate([
      {
        $group: {
          _id: '$credits',
          count: { $sum: 1 },
          avgFee: { $avg: '$tuitionFee' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    stats.forEach(stat => {
      console.log(`   ${stat._id} tín chỉ: ${stat.count} môn - Học phí: ${stat.avgFee.toLocaleString('vi-VN')} VNĐ`);
    });

    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Lỗi khi seed:', error);
    throw error;
  }
};

const main = async () => {
  try {
    await connectDB();
    
    const count = parseInt(process.argv[2]) || 50;
    await seedSubjects(count);
    
    console.log('✅ Seed thành công!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
};

main();
