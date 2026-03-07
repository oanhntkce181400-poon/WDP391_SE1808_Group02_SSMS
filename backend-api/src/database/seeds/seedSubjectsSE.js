require('dotenv').config();

const mongoose = require('mongoose');
const { connectDB } = require('../../configs/db.config');
const Subject = require('../../models/subject.model');
const Teacher = require('../../models/teacher.model');

const PRICE_PER_CREDIT = 100; // Giá mỗi tín chỉ (đơn vị demo)

const subjectsData = [
  {
    subjectCode: "SE101",
    subjectName: "Nhập môn Kỹ thuật phần mềm",
    credits: 3,
    suggestedSemester: 1,
    facultyCode: "CNTT",
    majorCodes: ["SE"],
    teacherCodes: ["GV001"],
    prerequisites: []
  },
  {
    subjectCode: "SE102",
    subjectName: "Lập trình cơ bản",
    credits: 3,
    suggestedSemester: 1,
    facultyCode: "CNTT",
    majorCodes: ["SE"],
    teacherCodes: ["GV002"],
    prerequisites: []
  },
  {
    subjectCode: "SE103",
    subjectName: "Toán rời rạc",
    credits: 3,
    suggestedSemester: 1,
    facultyCode: "CNTT",
    majorCodes: ["SE"],
    teacherCodes: ["GV003"],
    prerequisites: []
  },
  {
    subjectCode: "SE201",
    subjectName: "Cấu trúc dữ liệu",
    credits: 3,
    suggestedSemester: 2,
    facultyCode: "CNTT",
    majorCodes: ["SE"],
    teacherCodes: ["GV001"],
    prerequisites: ["SE102"]
  },
  {
    subjectCode: "SE202",
    subjectName: "Kiến trúc máy tính",
    credits: 3,
    suggestedSemester: 2,
    facultyCode: "CNTT",
    majorCodes: ["SE"],
    teacherCodes: ["GV004"],
    prerequisites: []
  },
  {
    subjectCode: "SE203",
    subjectName: "Hệ điều hành",
    credits: 3,
    suggestedSemester: 2,
    facultyCode: "CNTT",
    majorCodes: ["SE"],
    teacherCodes: ["GV007"],
    prerequisites: ["SE202"]
  },
  {
    subjectCode: "SE301",
    subjectName: "Lập trình hướng đối tượng",
    credits: 3,
    suggestedSemester: 3,
    facultyCode: "CNTT",
    majorCodes: ["SE"],
    teacherCodes: ["GV002"],
    prerequisites: ["SE201"]
  },
  {
    subjectCode: "SE302",
    subjectName: "Cơ sở dữ liệu",
    credits: 3,
    suggestedSemester: 3,
    facultyCode: "CNTT",
    majorCodes: ["SE"],
    teacherCodes: ["GV005"],
    prerequisites: ["SE201"]
  },
  {
    subjectCode: "SE303",
    subjectName: "Mạng máy tính",
    credits: 3,
    suggestedSemester: 3,
    facultyCode: "CNTT",
    majorCodes: ["SE"],
    teacherCodes: ["GV007"],
    prerequisites: []
  },
  {
    subjectCode: "SE401",
    subjectName: "Phân tích thiết kế hệ thống",
    credits: 3,
    suggestedSemester: 4,
    facultyCode: "CNTT",
    majorCodes: ["SE"],
    teacherCodes: ["GV001"],
    prerequisites: ["SE301"]
  },
  {
    subjectCode: "SE402",
    subjectName: "Phát triển Web",
    credits: 3,
    suggestedSemester: 4,
    facultyCode: "CNTT",
    majorCodes: ["SE"],
    teacherCodes: ["GV009"],
    prerequisites: ["SE301"]
  },
  {
    subjectCode: "SE403",
    subjectName: "Kiểm thử phần mềm",
    credits: 3,
    suggestedSemester: 4,
    facultyCode: "CNTT",
    majorCodes: ["SE"],
    teacherCodes: ["GV001"],
    prerequisites: ["SE301"]
  },
  {
    subjectCode: "SE501",
    subjectName: "Kiến trúc phần mềm",
    credits: 3,
    suggestedSemester: 5,
    facultyCode: "CNTT",
    majorCodes: ["SE"],
    teacherCodes: ["GV001"],
    prerequisites: ["SE401"]
  },
  {
    subjectCode: "SE502",
    subjectName: "Phát triển ứng dụng di động",
    credits: 3,
    suggestedSemester: 5,
    facultyCode: "CNTT",
    majorCodes: ["SE"],
    teacherCodes: ["GV010"],
    prerequisites: ["SE301"]
  },
  {
    subjectCode: "SE503",
    subjectName: "Lập trình Backend",
    credits: 3,
    suggestedSemester: 5,
    facultyCode: "CNTT",
    majorCodes: ["SE"],
    teacherCodes: ["GV009"],
    prerequisites: ["SE402"]
  },
  {
    subjectCode: "SE601",
    subjectName: "DevOps",
    credits: 3,
    suggestedSemester: 6,
    facultyCode: "CNTT",
    majorCodes: ["SE"],
    teacherCodes: ["GV009"],
    prerequisites: ["SE503"]
  },
  {
    subjectCode: "SE602",
    subjectName: "Cloud Computing",
    credits: 3,
    suggestedSemester: 6,
    facultyCode: "CNTT",
    majorCodes: ["SE"],
    teacherCodes: ["GV010"],
    prerequisites: ["SE401"]
  },
  {
    subjectCode: "SE603",
    subjectName: "Bảo mật ứng dụng",
    credits: 3,
    suggestedSemester: 6,
    facultyCode: "CNTT",
    majorCodes: ["SE"],
    teacherCodes: ["GV007"],
    prerequisites: ["SE303"]
  },
  {
    subjectCode: "SE701",
    subjectName: "Quản lý dự án phần mềm",
    credits: 3,
    suggestedSemester: 7,
    facultyCode: "CNTT",
    majorCodes: ["SE"],
    teacherCodes: ["GV001"],
    prerequisites: ["SE401"]
  },
  {
    subjectCode: "SE702",
    subjectName: "Microservices Architecture",
    credits: 3,
    suggestedSemester: 7,
    facultyCode: "CNTT",
    majorCodes: ["SE"],
    teacherCodes: ["GV009"],
    prerequisites: ["SE501"]
  },
  {
    subjectCode: "SE801",
    subjectName: "Thực tập doanh nghiệp",
    credits: 4,
    suggestedSemester: 8,
    facultyCode: "CNTT",
    majorCodes: ["SE"],
    teacherCodes: ["GV001"],
    prerequisites: ["SE701"]
  },
  {
    subjectCode: "SE901",
    subjectName: "Đồ án tốt nghiệp",
    credits: 6,
    suggestedSemester: 9,
    facultyCode: "CNTT",
    majorCodes: ["SE"],
    teacherCodes: ["GV001"],
    prerequisites: ["SE801"]
  }
];

async function seed() {
  try {
    await connectDB();
    console.log('🔌 Connected to database');

    // Get all teachers to map teacherCode to ObjectId
    console.log('👨‍🏫 Fetching teachers from database...');
    const teachers = await Teacher.find({});
    const teacherMap = {};
    teachers.forEach(teacher => {
      teacherMap[teacher.teacherCode] = teacher._id;
    });
    console.log(`✅ Found ${teachers.length} teachers`);

    // Transform data
    const subjects = subjectsData.map(sub => {
      // Map teacher codes to ObjectIds
      const teacherIds = sub.teacherCodes
        .map(code => teacherMap[code])
        .filter(id => id !== undefined);

      // Map prerequisites to include name
      const prerequisites = sub.prerequisites.map(prereqCode => {
        const prereq = subjectsData.find(s => s.subjectCode === prereqCode);
        return {
          code: prereqCode,
          name: prereq ? prereq.subjectName : ''
        };
      });

      return {
        subjectCode: sub.subjectCode,
        subjectName: sub.subjectName,
        credits: sub.credits,
        tuitionFee: sub.credits * PRICE_PER_CREDIT,
        majorCode: sub.majorCodes[0],
        majorCodes: sub.majorCodes,
        facultyCode: sub.facultyCode,
        suggestedSemester: sub.suggestedSemester,
        teachers: teacherIds,
        prerequisites: prerequisites,
        isCommon: false
      };
    });

    // Delete existing subjects
    console.log('🗑️ Deleting existing subjects...');
    await Subject.deleteMany({ majorCodes: "SE" });
    console.log('   Deleted SE subjects');

    // Seed new subjects
    console.log('📚 Seeding SE subjects...');
    const insertedSubjects = await Subject.insertMany(subjects);
    console.log(`✅ Inserted ${insertedSubjects.length} subjects`);

    // Verify
    const count = await Subject.countDocuments({ majorCodes: "SE" });
    console.log(`📊 Total SE subjects in database: ${count}`);

    // Show sample
    console.log('\n📋 Sample subjects:');
    insertedSubjects.slice(0, 5).forEach(sub => {
      console.log(`   ${sub.subjectCode} - ${sub.subjectName}`);
      console.log(`   Tín chỉ: ${sub.credits} | Học phí: ${sub.tuitionFee.toLocaleString('vi-VN')} VNĐ`);
      console.log(`   Học kỳ: ${sub.suggestedSemester} | Giảng viên: ${sub.teachers.length}`);
      console.log('');
    });

    console.log('🎉 Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
