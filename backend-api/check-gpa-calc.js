require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wdp301');
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Check the test student's data
    const studentId = '69c3f87b1b50f0db5349105d';
    
    const student = await db.collection('students').findOne({ 
      _id: new (require('mongodb')).ObjectId(studentId)
    });

    if (student) {
      console.log('Student collection entry:');
      console.log('  studentCode:', student.studentCode);
      console.log('  fullName:', student.fullName);
      console.log('  user:', student.user);
    } else {
      console.log('Student not found in students collection');
    }

    // Check the user entry
    const user = await db.collection('users').findOne({
      _id: new (require('mongodb')).ObjectId(studentId)
    });

    if (user) {
      console.log('\nUser collection entry:');
      console.log('  code:', user.code);
      console.log('  fullName:', user.fullName);
      console.log('  role:', user.role);
    }

    // Get the student's enrollments and check the GPA calculation
    const enrollments = await db.collection('classenrollments').find({ 
      student: new (require('mongodb')).ObjectId(studentId)
    }).toArray();

    console.log(`\n=== Enrollments (Grade Calculation) ===`);
    let totalGrade = 0;
    let totalCredits = 0;

    for (const e of enrollments) {
      if (e.midtermScore && e.finalScore) {
        // Get the class section to find credits
        const classSection = await db.collection('classsections').findOne({
          _id: e.classSection
        });
        
        const subject = await db.collection('subjects').findOne({
          _id: classSection?.subject
        });

        const credits = subject?.credits || 0;
        console.log(`Enrollment: Grade=${e.grade}, Credits=${credits}, Weighted=${e.grade * credits}`);
        
        if (e.grade !== null && credits > 0) {
          totalGrade += e.grade * credits;
          totalCredits += credits;
        }
      }
    }

    const calculatedGPA = totalCredits > 0 ? totalGrade / totalCredits : 0;
    console.log(`\nManual GPA Calculation: ${totalGrade} / ${totalCredits} = ${calculatedGPA.toFixed(2)}`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
