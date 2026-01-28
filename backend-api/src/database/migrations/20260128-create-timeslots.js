const Timeslot = require('../../models/timeslot.model');

const TIMESLOTS_DATA = [
  {
    groupName: 'Nhóm Đại cương',
    description: 'Môn đại cương - kiến thức nền tảng',
    startDate: new Date('2023-09-05'),
    endDate: new Date('2023-12-25'),
    startTime: '07:30',
    endTime: '09:30',
    sessionsPerDay: 3,
    status: 'completed',
  },
  {
    groupName: 'Nhóm Chuyên ngành',
    description: 'Môn chuyên ngành - kiến thức chuyên sâu',
    startDate: new Date('2024-01-08'),
    endDate: new Date('2024-05-20'),
    startTime: '09:45',
    endTime: '11:45',
    sessionsPerDay: 3,
    status: 'completed',
  },
  {
    groupName: 'Nhóm Thực hành',
    description: 'Môn thực hành và lab',
    startDate: new Date('2024-06-01'),
    endDate: new Date('2024-08-30'),
    startTime: '13:00',
    endTime: '16:00',
    sessionsPerDay: 2,
    status: 'completed',
  },
  {
    groupName: 'Nhóm Kỹ năng mềm',
    description: 'Kỹ năng giao tiếp, làm việc nhóm',
    startDate: new Date('2024-09-02'),
    endDate: new Date('2024-12-20'),
    startTime: '15:00',
    endTime: '16:30',
    sessionsPerDay: 2,
    status: 'active',
  },
  {
    groupName: 'Nhóm Tiếng Anh',
    description: 'Tiếng Anh chuyên ngành',
    startDate: new Date('2025-01-06'),
    endDate: new Date('2025-05-15'),
    startTime: '07:30',
    endTime: '09:00',
    sessionsPerDay: 3,
    status: 'active',
  },
  {
    groupName: 'Nhóm Thể dục',
    description: 'Giáo dục thể chất',
    startDate: new Date('2025-01-06'),
    endDate: new Date('2025-05-15'),
    startTime: '16:00',
    endTime: '17:30',
    sessionsPerDay: 2,
    status: 'active',
  },
  {
    groupName: 'Nhóm Tốt nghiệp',
    description: 'Đồ án tốt nghiệp và seminar',
    startDate: new Date('2025-06-01'),
    endDate: new Date('2025-08-30'),
    startTime: '08:00',
    endTime: '11:00',
    sessionsPerDay: 1,
    status: 'inactive',
  },
];

async function up() {
  console.log('🚀 Running migration: Create timeslots collection and seed data');

  try {
    // Drop existing indexes if any
    const existingIndexes = await Timeslot.collection.getIndexes();
    if (existingIndexes.groupName_1) {
      await Timeslot.collection.dropIndex('groupName_1');
      console.log('✅ Dropped existing groupName index');
    }
  } catch (err) {
    console.log('⚠️  No existing indexes to drop');
  }

  // Create indexes for timeslot collection
  await Timeslot.collection.createIndex({ groupName: 1 }, { unique: true });
  await Timeslot.collection.createIndex({ startDate: 1, endDate: 1 });
  await Timeslot.collection.createIndex({ status: 1 });

  console.log('✅ Created indexes for timeslots collection');

  // Check if data already exists
  const count = await Timeslot.countDocuments();
  if (count > 0) {
    console.log(`⚠️  Timeslots collection already has ${count} documents. Skipping seed.`);
    return;
  }

  // Insert seed data
  const result = await Timeslot.insertMany(TIMESLOTS_DATA);
  console.log(`✅ Inserted ${result.length} timeslot records`);
}

async function down() {
  console.log('🔄 Rolling back migration: Drop timeslots collection');

  await Timeslot.collection.drop();
  console.log('✅ Dropped timeslots collection');
}

module.exports = {
  id: '20260128-create-timeslots',
  description: 'Create timeslots collection with indexes and seed initial data',
  up,
  down,
};
