const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
});

const Waitlist = require('../src/models/waitlist.model');

const LEGACY_UNIQUE_INDEX = 'student_1_subject_1_status_1';

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'wdp301';
  const appName = process.env.MONGODB_APP_NAME || 'sync-waitlist-indexes';

  if (!uri) {
    throw new Error('Missing MONGODB_URI or MONGO_URI in environment.');
  }

  await mongoose.connect(uri, { dbName, appName });

  try {
    await Waitlist.createCollection().catch(() => null);
    const indexes = await Waitlist.collection.indexes();
    const indexNames = indexes.map((index) => index.name);

    if (indexNames.includes(LEGACY_UNIQUE_INDEX)) {
      await Waitlist.collection.dropIndex(LEGACY_UNIQUE_INDEX);
    }

    await Waitlist.collection.createIndex(
      { student: 1, subject: 1, targetSemester: 1, targetAcademicYear: 1, status: 1 },
      { unique: true },
    );
    await Waitlist.collection.createIndex(
      { subject: 1, targetSemester: 1, targetAcademicYear: 1, status: 1 },
    );
    await Waitlist.collection.createIndex({ student: 1, status: 1 });

    const updatedIndexes = await Waitlist.collection.indexes();
    console.log(
      JSON.stringify(
        {
          success: true,
          droppedLegacyIndex: indexNames.includes(LEGACY_UNIQUE_INDEX),
          indexes: updatedIndexes.map((index) => ({
            name: index.name,
            key: index.key,
            unique: index.unique === true,
          })),
        },
        null,
        2,
      ),
    );
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error('[sync-waitlist-indexes] Failed:', error.message);
  process.exit(1);
});
