require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wdp301');
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Find users with code starting with CE
    const users = await db.collection('users').find({ 
      code: { $regex: '^CE' }
    }).limit(5).toArray();

    console.log(`Found ${users.length} users with code starting with CE:\n`);

    users.forEach(u => {
      console.log(`Code: ${u.code}`);
      console.log(`Name: ${u.fullName}`);
      console.log(`ID: ${u._id}`);
      console.log('---');
    });

    // Also search for Tran Minh Khuong
    console.log('\nSearching for "Tran Minh Khuong":');
    const tmk = await db.collection('users').findOne({ 
      fullName: { $regex: 'Tran Minh Khuong' }
    });
    
    if (tmk) {
      console.log(`Code: ${tmk.code}`);
      console.log(`ID: ${tmk._id}`);
    } else {
      console.log('Not found');
      // Try case insensitive
      const users2 = await db.collection('users').find({ 
        fullName: { $regex: 'Khuong' }
      }).limit(3).toArray();
      console.log(`\nUsers with "Khuong": ${users2.length}`);
      users2.forEach(u => {
        console.log(`  ${u.code} - ${u.fullName}`);
      });
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
