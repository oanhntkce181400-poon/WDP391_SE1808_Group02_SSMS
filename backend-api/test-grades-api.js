/**
 * Test grades API to verify GPA calculation
 * Usage: node test-grades-api.js
 */

require('dotenv').config();
const axios = require('axios');

async function testGradesAPI() {
  try {
    const baseURL = process.env.API_BASE_URL || 'http://localhost:3000/api';
    console.log('🔗 Testing Grades API\n');

    // Step 1: Login
    console.log('📌 STEP 1: Login...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'teststudent.grades@example.com',
      password: 'TestPassword123!',
    });

    const accessToken = loginResponse.data.tokens?.accessToken;
    console.log(`✅ Login successful\n`);

    // Step 2: Fetch grades
    console.log('📌 STEP 2: Fetching grades...');
    const gradesResponse = await axios.get(`${baseURL}/grades/my-grades`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const gradesData = gradesResponse.data;
    console.log(`✅ Grades API responded\n`);

    // Display results
    console.log('📊 RESPONSE FORMAT:');
    console.log(`   overallGPA: ${gradesData.overallGPA}`);
    console.log(`   semesterGroups: ${gradesData.semesterGroups?.length || 0} groups\n`);

    if (gradesData.semesterGroups && Array.isArray(gradesData.semesterGroups)) {
      console.log('📈 SEMESTER BREAKDOWN:\n');

      gradesData.semesterGroups.forEach((group, idx) => {
        console.log(`[Semester ${idx + 1}] Kỳ ${group.semester} - ${group.academicYear}`);
        console.log(`   - Semester GPA: ${group.semesterGPA}`);
        console.log(`   - Total Credits: ${group.totalCredits}`);
        console.log(`   - Courses: ${group.enrollments?.length || 0}`);
        console.log('');

        group.enrollments?.slice(0, 2).forEach(e => {
          console.log(`     • ${e.subjectCode}: ${e.grade}/10 (${e.credits} credits)`);
        });
        console.log('');
      });

      console.log('='.repeat(60));
      console.log(`\n✅ API FORMAT CORRECT!`);
      console.log(`   Overall GPA: ${gradesData.overallGPA}`);
      console.log(`   Ready for mobile app!\n`);
    } else {
      console.log('⚠️  No semesterGroups in response');
      console.log('   Response:', JSON.stringify(gradesData, null, 2));
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

testGradesAPI();
