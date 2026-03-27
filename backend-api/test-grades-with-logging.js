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

    const { tokens } = loginResponse.data;
    const access_token = tokens?.accessToken;
    console.log('✅ [Test] Login successful');
    console.log('   Token:', access_token?.substring(0, 20) + '...');

    // Call grades endpoint
    console.log('\n📊 [Test] Calling grades endpoint...');
    const gradesResponse = await axios.get(`${API_BASE}/grades/my-grades`, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    console.log('\n✅ [Test] Grades response:');
    console.log(JSON.stringify(gradesResponse.data, null, 2));

  } catch (error) {
    console.error('\n❌ [Test] Error:');
    console.error('   Message:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

test();
