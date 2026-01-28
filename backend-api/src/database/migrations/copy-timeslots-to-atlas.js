// Script to copy timeslots data from local to Atlas
require('dotenv').config();
const mongoose = require('mongoose');

const ATLAS_URI = 'mongodb+srv://huypvqce182111_db_user:F1JASFrrkKZV1Sng@wdp301.miovw6s.mongodb.net/wdp301?retryWrites=true&w=majority';
const LOCAL_URI = 'mongodb://127.0.0.1:27017/wdp301';

async function copyData() {
  try {
    // Connect to local
    console.log('📦 Connecting to local MongoDB...');
    const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
    console.log('✅ Connected to local');

    // Get timeslots from local
    const Timeslot = localConn.model('Timeslot', new mongoose.Schema({}, { strict: false, collection: 'timeslots' }));
    const timeslots = await Timeslot.find({}).lean();
    console.log(`📊 Found ${timeslots.length} timeslots in local database`);

    if (timeslots.length === 0) {
      console.log('⚠️  No data to copy');
      process.exit(0);
    }

    // Close local connection
    await localConn.close();

    // Connect to Atlas
    console.log('\n🌐 Connecting to MongoDB Atlas...');
    const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
    console.log('✅ Connected to Atlas');

    // Insert to Atlas
    const TimeslotAtlas = atlasConn.model('Timeslot', new mongoose.Schema({}, { strict: false, collection: 'timeslots' }));
    
    // Clear existing data (optional)
    const existingCount = await TimeslotAtlas.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing records. Clearing...`);
      await TimeslotAtlas.deleteMany({});
    }

    // Remove _id to let MongoDB generate new ones
    const dataToInsert = timeslots.map(({ _id, __v, ...rest }) => rest);
    
    const result = await TimeslotAtlas.insertMany(dataToInsert);
    console.log(`✅ Successfully inserted ${result.length} timeslots to Atlas`);

    // Close Atlas connection
    await atlasConn.close();
    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

copyData();
