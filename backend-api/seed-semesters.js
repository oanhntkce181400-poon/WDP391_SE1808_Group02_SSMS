require('dotenv').config();
const mongoose = require('mongoose');

const Semester = require('./src/models/semester.model');

async function seedSemesters() {
  try {
    const mongoURI = process.env.MONGODB_URI;
    console.log('📚 Connecting to database...');
    await mongoose.connect(mongoURI);
    
    console.log('✓ Connected to database');

    // Delete existing semesters
    await Semester.deleteMany({});
    console.log('🗑️  Cleared existing semesters');

    // Create test semesters
    const semesters = [
      {
        code: '2024-2025_1',
        name: 'Kỳ 1 - 2024/2025',
        semesterType: 'regular',
        semesterNum: 1,
        academicYear: '2024-2025',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-31'),
        isCurrent: false,
        isActive: true,
      },
      {
        code: '2024-2025_2',
        name: 'Kỳ 2 - 2024/2025',
        semesterType: 'regular',
        semesterNum: 2,
        academicYear: '2024-2025',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-04-30'),
        isCurrent: false,
        isActive: true,
      },
      {
        code: '2024-2025_3',
        name: 'Kỳ 3 - 2024/2025',
        semesterType: 'regular',
        semesterNum: 3,
        academicYear: '2024-2025',
        startDate: new Date('2025-05-01'),
        endDate: new Date('2025-08-31'),
        isCurrent: false,
        isActive: true,
      },
      {
        code: '2025-2026_1',
        name: 'Kỳ 1 - 2025/2026',
        semesterType: 'regular',
        semesterNum: 1,
        academicYear: '2025-2026',
        startDate: new Date('2025-09-01'),
        endDate: new Date('2025-12-31'),
        isCurrent: true,
        isActive: true,
      },
      {
        code: '2025-2026_2',
        name: 'Kỳ 2 - 2025/2026',
        semesterType: 'regular',
        semesterNum: 2,
        academicYear: '2025-2026',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-04-30'),
        isCurrent: false,
        isActive: true,
      },
    ];

    const created = await Semester.insertMany(semesters);
    console.log('✅ Seeded', created.length, 'semesters');

    created.forEach(sem => {
      console.log(`   - ${sem.code}: ${sem.name}`);
    });

    await mongoose.disconnect();
    console.log('✓ Disconnected from database\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

seedSemesters();
