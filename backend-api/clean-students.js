/**
 * Delete all students and the records that are directly tied to them.
 * Run from backend-api: node clean-students.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');

const Student = require('./src/models/student.model');
const User = require('./src/models/user.model');
const Wallet = require('./src/models/wallet.model');
const WalletTransaction = require('./src/models/walletTransaction.model');

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'wdp301';

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri, { dbName });
  console.log('Connected\n');

  const db = mongoose.connection.db;
  const collections = new Set((await db.listCollections().toArray()).map((item) => item.name));

  const students = await Student.find({}, '_id userId').lean();
  const userIds = students.map((student) => student.userId).filter(Boolean);
  const wallets = userIds.length
    ? await Wallet.find({ userId: { $in: userIds } }, '_id').lean()
    : [];
  const walletIds = wallets.map((wallet) => wallet._id);

  const targetCollections = [
    'classenrollments',
    'waitlists',
    'students',
  ];

  for (const collectionName of targetCollections) {
    if (!collections.has(collectionName)) {
      console.log(`Collection "${collectionName}" not found, skipping.`);
      continue;
    }

    const result = await db.collection(collectionName).deleteMany({});
    console.log(`${collectionName}: deleted ${result.deletedCount} documents`);
  }

  if (walletIds.length) {
    const walletTxnResult = await WalletTransaction.deleteMany({ wallet: { $in: walletIds } });
    console.log(`wallettransactions: deleted ${walletTxnResult.deletedCount || 0} documents`);
  }

  if (userIds.length) {
    const walletResult = await Wallet.deleteMany({ userId: { $in: userIds } });
    console.log(`wallets: deleted ${walletResult.deletedCount || 0} documents`);

    const userResult = await User.deleteMany({ _id: { $in: userIds } });
    console.log(`users: deleted ${userResult.deletedCount || 0} documents`);
  }

  console.log('\nDone. Students and linked records were deleted.');
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
