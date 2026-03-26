const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const FeedbackSubmission = require('../src/models/feedbackSubmission.model');

async function run() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error('Missing MongoDB connection string in backend-api/.env');
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const collection = FeedbackSubmission.collection;

  const collections = await mongoose.connection.db
    .listCollections({ name: collection.collectionName })
    .toArray();

  if (!collections.length) {
    await FeedbackSubmission.createCollection();
    console.log(`Created collection: ${collection.collectionName}`);
  }

  const indexes = await collection.indexes();
  const oldIndex = indexes.find((index) => index.name === 'feedbackTemplate_1_submittedBy_1');

  if (oldIndex) {
    await collection.dropIndex(oldIndex.name);
    console.log(`Dropped old index: ${oldIndex.name}`);
  } else {
    console.log('Old index not found, skipping drop');
  }

  const syncResult = await FeedbackSubmission.syncIndexes();
  console.log('syncIndexes result:', syncResult);

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
}

run().catch(async (error) => {
  console.error('Failed to sync feedback submission indexes:', error);
  try {
    await mongoose.disconnect();
  } catch (disconnectError) {
    console.error('Failed to disconnect mongoose cleanly:', disconnectError);
  }
  process.exitCode = 1;
});
