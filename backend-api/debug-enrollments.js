require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wdp301');
  const db = mongoose.connection.db;
  
  // Find all enrollments for studentId 69c41a5ef764f03f55745405
  const enrollments = await db.collection('classenrollments').find({ 
    student: new (require('mongodb')).ObjectId('69c41a5ef764f03f55745405')
  }).toArray();
  
  console.log('Total enrollments:', enrollments.length);
  enrollments.forEach((e, idx) => {
    console.log(`
Enrollment ${idx + 1}:`);
    console.log('  status:', e.status);
    console.log('  grade (DB):', e.grade);
    console.log('  midtermScore (GK):', e.midtermScore);
    console.log('  finalScore (CK):', e.finalScore);
    console.log('  ptScores:', e.ptScores?.length || 0, 'entries');
    if (e.ptScores?.length) {
      e.ptScores.forEach(pt => {
        console.log(`    ${pt.type}: ${pt.score}`);
      });
    }
  });
  
  await mongoose.disconnect();
})();
