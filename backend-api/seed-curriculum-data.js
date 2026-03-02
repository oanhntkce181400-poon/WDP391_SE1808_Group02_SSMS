/**
 * Seed curriculum semesters and courses for testing
 * Run: node seed-curriculum-data.js
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://bangdcce181999_db_user:7bizaqwqlvQ9m0xD@wdp301.miovw6s.mongodb.net/?retryWrites=true&w=majority';

async function seed() {
  try {
    await mongoose.connect(MONGO_URI, { dbName: 'wdp301' });
    console.log('✅ Connected to MongoDB');

    // Load models
    const Curriculum = require('./src/models/curriculum.model');
    const CurriculumSemester = require('./src/models/curriculumSemester.model');
    const CurriculumCourse = require('./src/models/curriculumCourse.model');
    const Subject = require('./src/models/subject.model');

    // Find existing curriculum
    let curriculum = await Curriculum.findOne({ code: 'SE_2026' });
    
    // If not found, create it
    if (!curriculum) {
      const Major = require('./src/models/major.model');
      let major = await Major.findOne();
      if (!major) {
        // Create a simple faculty first
        const Faculty = require('./src/models/faculty.model');
        let faculty = await Faculty.findOne();
        if (!faculty) {
          faculty = await Faculty.create({
            facultyCode: 'CIT',
            facultyName: 'Công nghệ Thông tin',
            description: 'Khoa Công nghệ Thông tin'
          });
          console.log(`📚 Created faculty: ${faculty.facultyName}`);
        }
        
        major = await Major.create({
          majorCode: 'SE',
          majorName: 'Kỹ thuật Phần mềm',
          faculty: faculty._id,
          isActive: true
        });
        console.log(`📚 Created major: ${major.majorName}`);
      }
      
      curriculum = await Curriculum.create({
        code: 'SE_2026',
        name: 'Khung chương trình Kỹ thuật Phần mềm 2024',
        major: major.majorName,  // Use majorName as string
        majorId: major._id,
        academicYear: '2024-2025',
        description: 'Khung chương trình đào tạo Kỹ thuật Phần mềm năm 2024',
        status: 'active',
        totalCredits: 150,
        totalCourses: 0,
        useRelationalStructure: false
      });
      console.log(`📚 Created new curriculum: ${curriculum.code} (${curriculum._id})`);
    } else {
      console.log(`📚 Found curriculum: ${curriculum.code} (${curriculum._id})`);
    }

    // Check if semesters already exist
    const existingSemesters = await CurriculumSemester.countDocuments({ curriculum: curriculum._id });
    if (existingSemesters > 0) {
      console.log(`⚠️  Curriculum already has ${existingSemesters} semesters. Deleting and recreating...`);
      
      // Delete existing semesters and courses
      const semesters = await CurriculumSemester.find({ curriculum: curriculum._id });
      for (const sem of semesters) {
        await CurriculumCourse.deleteMany({ semester: sem._id });
        await CurriculumSemester.deleteOne({ _id: sem._id });
      }
      console.log('🗑️  Deleted existing semesters');
    }

    // Get some subjects to add to curriculum
    let subjects = await Subject.find().limit(20);
    if (subjects.length === 0) {
      console.log('📝 Creating sample subjects...');
      
      // Create sample subjects
      const subjectData = [
        { subjectCode: 'CS101', subjectName: 'Nhập môn lập trình', credits: 3 },
        { subjectCode: 'CS102', subjectName: 'Cấu trúc dữ liệu', credits: 4 },
        { subjectCode: 'CS103', subjectName: 'Giải thuật', credits: 3 },
        { subjectCode: 'CS201', subjectName: 'Lập trình hướng đối tượng', credits: 3 },
        { subjectCode: 'CS202', subjectName: 'Cơ sở dữ liệu', credits: 4 },
        { subjectCode: 'CS203', subjectName: 'Mạng máy tính', credits: 3 },
        { subjectCode: 'CS301', subjectName: 'Phát triển Web', credits: 3 },
        { subjectCode: 'CS302', subjectName: 'Phát triển ứng dụng di động', credits: 3 },
        { subjectCode: 'CS303', subjectName: 'Kiểm thử phần mềm', credits: 3 },
        { subjectCode: 'CS304', subjectName: 'Quản lý dự án phần mềm', credits: 3 },
        { subjectCode: 'CS305', subjectName: 'Thiết kế phần mềm', credits: 3 },
        { subjectCode: 'CS306', subjectName: 'An toàn thông tin', credits: 3 },
        { subjectCode: 'CS307', subjectName: 'Điện toán đám mây', credits: 3 },
        { subjectCode: 'CS308', subjectName: 'Trí tuệ nhân tạo', credits: 3 },
        { subjectCode: 'CS309', subjectName: 'Học máy', credits: 3 },
        { subjectCode: 'CS310', subjectName: 'Thực tập tốt nghiệp', credits: 10 },
        { subjectCode: 'MATH101', subjectName: 'Toán rời rạc', credits: 3 },
        { subjectCode: 'MATH102', subjectName: 'Xác suất thống kê', credits: 3 },
        { subjectCode: 'EN101', subjectName: 'Tiếng Anh 1', credits: 3 },
        { subjectCode: 'EN102', subjectName: 'Tiếng Anh 2', credits: 3 },
      ];
      
      for (const data of subjectData) {
        await Subject.create({
          ...data,
          description: `Môn học ${data.subjectName}`,
          status: 'active'
        });
      }
      
      subjects = await Subject.find().limit(20);
      console.log(`✅ Created ${subjects.length} subjects`);
    }
    console.log(`📖 Found ${subjects.length} subjects`);

    // Create 8 semesters (4 years x 2 semesters)
    const semesterNames = [
      { order: 1, name: 'Học kỳ 1 - Năm 1' },
      { order: 2, name: 'Học kỳ 2 - Năm 1' },
      { order: 3, name: 'Học kỳ 1 - Năm 2' },
      { order: 4, name: 'Học kỳ 2 - Năm 2' },
      { order: 5, name: 'Học kỳ 1 - Năm 3' },
      { order: 6, name: 'Học kỳ 2 - Năm 3' },
      { order: 7, name: 'Học kỳ 1 - Năm 4' },
      { order: 8, name: 'Học kỳ 2 - Năm 4' },
    ];

    // Sample subjects mapping to semesters (simplified)
    const subjectDistribution = [
      [0, 1, 2],       // HK1 Year 1: 3 subjects
      [3, 4, 5],       // HK2 Year 1: 3 subjects
      [6, 7, 8],       // HK1 Year 2: 3 subjects
      [9, 10, 11],     // HK2 Year 2: 3 subjects
      [12, 13, 14],    // HK1 Year 3: 3 subjects
      [15, 16, 17],    // HK2 Year 3: 3 subjects
      [18, 19],        // HK1 Year 4: 2 subjects
      [],              // HK2 Year 4: 0 subjects (internship)
    ];

    console.log('\n📝 Creating semesters and courses...');

    for (let i = 0; i < semesterNames.length; i++) {
      const semData = semesterNames[i];
      
      // Create semester
      const semester = await CurriculumSemester.create({
        curriculum: curriculum._id,
        semesterOrder: semData.order,
        name: semData.name,
        credits: 0,
        status: 'active'
      });
      console.log(`  ✅ Created: ${semester.name}`);

      // Add courses to semester
      const subjectIndices = subjectDistribution[i];
      if (subjectIndices.length > 0) {
        for (const idx of subjectIndices) {
          if (idx < subjects.length) {
            const subject = subjects[idx];
            await CurriculumCourse.create({
              semester: semester._id,
              subject: subject._id,
              subjectCode: subject.subjectCode,
              subjectName: subject.subjectName,
              credits: subject.credits || 3,
              isRequired: true,
              notes: ''
            });
          }
        }
        console.log(`     + Added ${subjectIndices.length} courses`);
      }
    }

    // Update curriculum to use relational structure
    curriculum.useRelationalStructure = true;
    await curriculum.save();

    console.log('\n✅ Seed completed successfully!');
    console.log(`   - Created ${semesterNames.length} semesters`);
    console.log(`   - Updated curriculum to use relational structure`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

seed();
