require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wdp301');
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Find student by code CE181361 (Tran Minh Khuong)
    const user = await db.collection('users').findOne({ code: 'CE181361' });
    console.log('Student found:');
    console.log('  ID:', user?._id);
    console.log('  Code:', user?.code);
    console.log('  Name:', user?.fullName);
    console.log('');

    if (!user) {
      console.log('Student not found');
      await mongoose.disconnect();
      return;
    }

    // Check enrollments for this student
    const ObjectId = require('mongodb').ObjectId;
    const enrollments = await db.collection('classenrollments').find({ 
      student: user._id
    }).toArray();

    console.log(`Total enrollments: ${enrollments.length}\n`);

    enrollments.forEach((e, idx) => {
      console.log(`Enrollment ${idx + 1}:`);
      console.log(`  Status: ${e.status}`);
      console.log(`  Grade: ${e.grade}`);
      console.log(`  GK: ${e.midtermScore}`);
      console.log(`  CK: ${e.finalScore}`);
      console.log(`  BT: ${e.assignmentScore}`);
      console.log('');
    });

    await mongoose.disconnect();
    console.log('Done');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
