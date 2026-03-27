const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://127.0.0.1:27017/wdp301';

async function test() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find the test student user
    const User = require('./src/models/user.model');
    const user = await User.findOne({ email: 'teststudent.grades@example.com' }).lean();

    console.log('\n👤 User record:');
    console.log('   _id:', user?._id);
    console.log('   email:', user?.email);
    
    // Check what fields exist on user
    console.log('\n   User fields:', Object.keys(user).filter(k => !k.startsWith('_')));

    // Find the student directly
    const Student = require('./src/models/student.model');
    const students = await Student.find({ studentCode: 'TEST_GRADES_1774613890691' }).lean();
    
    console.log('\n🎓 Student records found:', students?.length);
    if (students?.length > 0) {
      const student = students[0];
      console.log('   _id:', student?._id);
      console.log('   studentCode:', student?.studentCode);
      console.log('   cohort:', student?.cohort);

      // Now check enrollments for this student
      const ClassEnrollment = require('./src/models/classEnrollment.model');
      const enrollments = await ClassEnrollment.find({ student: student?._id }).lean();
      console.log('\n📚 Enrollments for this student:');
      console.log('   Count:', enrollments?.length || 0);
      if (enrollments?.length > 0) {
        console.log('   First enrollment:', {
          _id: enrollments[0]._id,
          student: enrollments[0].student,
          grade: enrollments[0].grade
        });
      }
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

test();
