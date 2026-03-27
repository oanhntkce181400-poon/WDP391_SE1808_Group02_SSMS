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
    console.log('✅ [Test] Login successful\n');

    // Test grades
    console.log('📊 [Test] Calling /api/grades/my-grades...');
    const gradesResponse = await axios.get(`${API_BASE}/grades/my-grades`, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    console.log('   ✅ Grades:', {
      semesterGroups: gradesResponse.data.semesterGroups?.length || 0,
      overallGPA: gradesResponse.data.overallGPA
    });

    // Test wishlist
    console.log('\n🎯 [Test] Calling /api/wishlist/my-wishlist...');
    const wishlistResponse = await axios.get(`${API_BASE}/wishlist/my-wishlist`, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    console.log('   ✅ Wishlist:', {
      wishlists: wishlistResponse.data.wishlists?.length || 0,
      summary: wishlistResponse.data.summary
    });

    console.log('\n✅ [Test] Both APIs working correctly!');

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
