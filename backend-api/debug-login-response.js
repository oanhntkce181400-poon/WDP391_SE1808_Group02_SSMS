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

    console.log('\n✅ [Test] Login response:');
    console.log(JSON.stringify(loginResponse.data, null, 2));

    // Check what token fields exist
    const data = loginResponse.data;
    const tokenKey = Object.keys(data).find(k => k.includes('token'));
    console.log('\nToken field found:', tokenKey);

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
