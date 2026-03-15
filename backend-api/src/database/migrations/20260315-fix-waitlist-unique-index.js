const Waitlist = require('../../models/waitlist.model');

const LEGACY_UNIQUE_INDEX = 'student_1_subject_1_status_1';
const TARGET_UNIQUE_INDEX_KEYS = {
  student: 1,
  subject: 1,
  targetSemester: 1,
  targetAcademicYear: 1,
  status: 1,
};

async function ensureWaitlistIndexes() {
  await Waitlist.createCollection().catch(() => null);
  const indexes = await Waitlist.collection.indexes();
  const indexNames = indexes.map((index) => index.name);

  if (indexNames.includes(LEGACY_UNIQUE_INDEX)) {
    await Waitlist.collection.dropIndex(LEGACY_UNIQUE_INDEX);
  }

  await Waitlist.collection.createIndex(TARGET_UNIQUE_INDEX_KEYS, { unique: true });
  await Waitlist.collection.createIndex({
    subject: 1,
    targetSemester: 1,
    targetAcademicYear: 1,
    status: 1,
  });
  await Waitlist.collection.createIndex({ student: 1, status: 1 });
}

async function restoreLegacyIndex() {
  const indexes = await Waitlist.collection.indexes();
  const nextIndexes = indexes.map((index) => index.name);
  const targetIndexName =
    'student_1_subject_1_targetSemester_1_targetAcademicYear_1_status_1';

  if (nextIndexes.includes(targetIndexName)) {
    await Waitlist.collection.dropIndex(targetIndexName);
  }

  await Waitlist.collection.createIndex(
    { student: 1, subject: 1, status: 1 },
    { unique: true },
  );
}

module.exports = {
  id: '20260315-fix-waitlist-unique-index',
  description: 'Drop legacy waitlist unique index and recreate semester-aware unique index',
  up: async () => {
    await ensureWaitlistIndexes();
  },
  down: async () => {
    await restoreLegacyIndex();
  },
};
