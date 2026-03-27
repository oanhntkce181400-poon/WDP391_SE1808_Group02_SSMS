const axios = require('axios');

const API_BASE = 'http://10.10.11.61:3000/api';

async function test() {
  try {
    console.log('🔐 [Test] Logging in...');
    
    // Login
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'teststudent.grades@example.com',
      password: 'TestPassword123!'
    });

    const userId = loginResponse.data.user.id;
    const studentData = loginResponse.data.user.student;
    
    console.log('\n📋 User Info:');
    console.log('   User ID:', userId);
    console.log('   Student Code:', studentData?.studentCode);
    console.log('   Student Info:', JSON.stringify(studentData, null, 2));

  } catch (error) {
    console.error('\n❌ [Test] Error:');
    console.error('   Message:', error.message);
  }
}

test();
