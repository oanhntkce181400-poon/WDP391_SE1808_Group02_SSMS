require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wdp301');
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Search for enrollments with grade 9.4
    const enrollments = await db.collection('classenrollments').find({ grade: 9.4 }).toArray();

    console.log(`Found ${enrollments.length} enrollments with grade 9.4\n`);

    if (enrollments.length > 0) {
      for (const e of enrollments) {
        console.log('Enrollment ID:', e._id);
        console.log('Student ID:', e.student);
        console.log('Status:', e.status);
        console.log('Grade:', e.grade);
        console.log('GK:', e.gk, 'CK:', e.ck, 'BT:', e.bT);
        console.log('PT1:', e.pT1, 'PT2:', e.pT2, 'PT3:', e.pT3);
        console.log('Class Section:', e.classSection);
        console.log('---');
      }
    } else {
      console.log('No enrollments with 9.4 found\n');
      
      // Find WDP301 enrollments
      const wdp = await db.collection('classsections').findOne({ classCode: { $regex: 'WDP301' } });
      console.log('WDP301 Class:', wdp?.classCode, wdp?._id);

      if (wdp) {
        const enrolledInWDP = await db.collection('classenrollments').find({ classSection: wdp._id }).toArray();
        console.log(`\nEnrollments in ${wdp.classCode}:`, enrolledInWDP.length);
        enrolledInWDP.forEach(e => {
          console.log(`  Grade: ${e.grade}, Student: ${e.student}, Status: ${e.status}`);
        });
      }
    }

    await mongoose.disconnect();
    console.log('\nDone');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
