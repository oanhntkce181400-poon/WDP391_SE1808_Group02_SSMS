require('dotenv').config();

const mongoose = require('mongoose');
const { connectDB } = require('../../configs/db.config');
const Faculty = require('../../models/faculty.model');
const Major = require('../../models/major.model');

const facultiesData = [
  {
    facultyCode: 'CNTT',
    facultyName: 'Công nghệ thông tin',
    shortName: 'CNTT',
    description: 'Đào tạo các ngành về lập trình, trí tuệ nhân tạo, khoa học dữ liệu và an ninh mạng.',
    isActive: true
  },
  {
    facultyCode: 'QTKD',
    facultyName: 'Quản trị kinh doanh',
    shortName: 'QTKD',
    description: 'Đào tạo các lĩnh vực quản trị, marketing, thương mại điện tử và quản lý doanh nghiệp.',
    isActive: true
  },
  {
    facultyCode: 'KT',
    facultyName: 'Kế toán',
    shortName: 'KT',
    description: 'Đào tạo chuyên sâu về kế toán doanh nghiệp, kiểm toán và tài chính.',
    isActive: true
  },
  {
    facultyCode: 'TCNH',
    facultyName: 'Tài chính - Ngân hàng',
    shortName: 'TCNH',
    description: 'Đào tạo các chuyên ngành tài chính, đầu tư, ngân hàng và quản lý rủi ro.',
    isActive: true
  },
  {
    facultyCode: 'NN',
    facultyName: 'Ngoại ngữ',
    shortName: 'NN',
    description: 'Đào tạo các ngành ngôn ngữ Anh, Nhật, Trung và Hàn.',
    isActive: true
  },
  {
    facultyCode: 'DLKS',
    facultyName: 'Du lịch - Khách sạn',
    shortName: 'DLKS',
    description: 'Đào tạo nghiệp vụ du lịch, quản lý khách sạn và nhà hàng.',
    isActive: false
  }
];

const majorsData = [
  {
    majorCode: 'SE',
    majorName: 'Kỹ thuật phần mềm',
    facultyCode: 'CNTT',
    isActive: true
  },
  {
    majorCode: 'AI',
    majorName: 'Trí tuệ nhân tạo',
    facultyCode: 'CNTT',
    isActive: true
  },
  {
    majorCode: 'DS',
    majorName: 'Khoa học dữ liệu',
    facultyCode: 'CNTT',
    isActive: true
  },
  {
    majorCode: 'IB',
    majorName: 'Kinh doanh quốc tế',
    facultyCode: 'QTKD',
    isActive: true
  },
  {
    majorCode: 'MKT',
    majorName: 'Marketing',
    facultyCode: 'QTKD',
    isActive: true
  },
  {
    majorCode: 'ACC',
    majorName: 'Kế toán',
    facultyCode: 'KT',
    isActive: true
  },
  {
    majorCode: 'FIN',
    majorName: 'Tài chính',
    facultyCode: 'TCNH',
    isActive: true
  },
  {
    majorCode: 'ENG',
    majorName: 'Ngôn ngữ Anh',
    facultyCode: 'NN',
    isActive: true
  },
  {
    majorCode: 'JPN',
    majorName: 'Ngôn ngữ Nhật',
    facultyCode: 'NN',
    isActive: true
  },
  {
    majorCode: 'HTM',
    majorName: 'Quản trị khách sạn',
    facultyCode: 'DLKS',
    isActive: false
  }
];

async function seed() {
  try {
    await connectDB();
    console.log('🔌 Connected to database');

    // Seed Faculties
    console.log('📚 Seeding faculties...');
    await Faculty.deleteMany({});
    const faculties = await Faculty.insertMany(facultiesData);
    console.log(`✅ Inserted ${faculties.length} faculties`);

    // Create faculty map for reference
    const facultyMap = {};
    faculties.forEach(f => {
      facultyMap[f.facultyCode] = f._id;
    });

    // Seed Majors
    console.log('🎓 Seeding majors...');
    await Major.deleteMany({});
    const majors = await Major.insertMany(
      majorsData.map(m => ({
        majorCode: m.majorCode,
        majorName: m.majorName,
        faculty: facultyMap[m.facultyCode],
        isActive: m.isActive
      }))
    );
    console.log(`✅ Inserted ${majors.length} majors`);

    console.log('🎉 Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
