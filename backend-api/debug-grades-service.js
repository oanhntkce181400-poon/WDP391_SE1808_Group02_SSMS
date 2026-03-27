/**
 * Debug grades service directly
 * Usage: node debug-grades-service.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function debugGradesService() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME,
    });

    console.log('✅ Connected to MongoDB\n');

    const User = require('./src/models/user.model');
    const Student = require('./src/models/student.model');
    const ClassEnrollment = require('./src/models/classEnrollment.model');

    const testEmail = 'teststudent.grades@example.com';
    const user = await User.findOne({ email: testEmail });
    const student = await Student.findOne({ userId: user._id });
    const studentId = student._id;

    console.log(`🔍 Searching enrollments for student: ${studentId}\n`);

    // Step 1: Find raw enrollments
    console.log('📌 Step 1: Find raw enrollments');
    const enrollments = await ClassEnrollment.find({
      student: studentId
    }).lean();

    console.log(`Found: ${enrollments.length} enrollments`);
    console.log(`IDs:`, enrollments.map(e => e._id));
    console.log('');

    // Step 2: Find with classSection populate
    console.log('📌 Step 2: Find with classSection populate');
    const enrollmentsWithCS = await ClassEnrollment.find({
      student: studentId
    }).populate('classSection').lean();

    console.log(`Found: ${enrollmentsWithCS.length}`);
    if (enrollmentsWithCS.length > 0) {
      const first = enrollmentsWithCS[0];
      console.log(`First enrollment classSection:`, first.classSection ? 'EXISTS' : 'NULL');
      if (first.classSection) {
        console.log(`  - semester: ${first.classSection.semester}`);
        console.log(`  - academicYear: ${first.classSection.academicYear}`);
        console.log(`  - subject: ${first.classSection.subject}`);
      }
    }
    console.log('');

    // Step 3: Find with nested populate
    console.log('📌 Step 3: Find with subject populate');
    const enrollmentsWithSubject = await ClassEnrollment.find({
      student: studentId
    })
      .populate({
        path: 'classSection',
        populate: { path: 'subject' }
      }).lean();

    console.log(`Found: ${enrollmentsWithSubject.length}`);
    if (enrollmentsWithSubject.length > 0) {
      const first = enrollmentsWithSubject[0];
      console.log(`First enrollment:`,);
      console.log(`  - classSection: ${first.classSection ? 'EXISTS' : 'NULL'}`);
      if (first.classSection) {
        console.log(`  - subject: ${first.classSection.subject ? 'EXISTS' : 'NULL'}`);
        if (first.classSection.subject) {
          console.log(`    - subjectCode: ${first.classSection.subject.subjectCode}`);
          console.log(`    - credits: ${first.classSection.subject.credits}`);
        }
      }
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

debugGradesService();
