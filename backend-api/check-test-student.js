require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wdp301');
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Check the test student's enrollments
    const studentId = '69c3f87b1b50f0db5349105d';
    
    const enrollments = await db.collection('classenrollments').find({ 
      student: new (require('mongodb')).ObjectId(studentId) 
    }).toArray();

    console.log(`\n=== Enrollments for student ${studentId} ===`);
    console.log(`Total enrollments: ${enrollments.length}\n`);

    enrollments.forEach((e, idx) => {
      console.log(`Enrollment ${idx + 1}:`);
      console.log(`  ID: ${e._id}`);
      console.log(`  Status: ${e.status}`);
      console.log(`  Grade: ${e.grade}`);
      console.log(`  GK (midtermScore): ${e.midtermScore}`);
      console.log(`  CK (finalScore): ${e.finalScore}`);
      console.log(`  BT (assignmentScore): ${e.assignmentScore}`);
      console.log(`  PT1: ${e.pT1}, PT2: ${e.pT2}, PT3: ${e.pT3}`);
      console.log(`  Class Section: ${e.classSection}`);
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
