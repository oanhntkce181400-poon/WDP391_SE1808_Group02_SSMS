/**
 * Test wishlist API endpoint for test student
 * Usage: node test-wishlist-api.js
 */

require('dotenv').config();
const axios = require('axios');

async function testWishlistAPI() {
  try {
    const baseURL = process.env.API_BASE_URL || 'http://localhost:3000/api';
    console.log('🔗 Testing Wishlist API\n');
    console.log(`Base URL: ${baseURL}\n`);

    // Step 1: Login to get token
    console.log('📌 STEP 1: Login to get token...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'teststudent.grades@example.com',
      password: 'TestPassword123!',
    });

    const accessToken = loginResponse.data.tokens?.accessToken;
    if (!accessToken) {
      console.log('❌ No access token received');
      process.exit(1);
    }

    console.log(`✅ Login successful`);
    console.log(`   Token: ${accessToken.substring(0, 20)}...\n`);

    // Step 2: Fetch wishlist
    console.log('📌 STEP 2: Fetching wishlist...');
    const wishlistResponse = await axios.get(`${baseURL}/wishlist/my-wishlist`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const wishlistData = wishlistResponse.data;
    console.log(`✅ Wishlist API responded\n`);

    // Display results
    if (wishlistData.data && Array.isArray(wishlistData.data)) {
      console.log(`📋 WISHLIST DATA (${wishlistData.data.length} items):\n`);

      wishlistData.data.forEach((item, idx) => {
        console.log(`[${idx + 1}] ${item.subject?.subjectCode} - ${item.subject?.subjectName}`);
        console.log(`    Priority: ${item.priority}/5`);
        console.log(`    Status: ${item.status}`);
        console.log(`    Reason: ${item.reason || 'N/A'}`);
        console.log(`    Created: ${new Date(item.createdAt).toLocaleDateString('vi-VN')}`);
        console.log('');
      });

      console.log('='.repeat(60));
      console.log('\n✅ Wishlist API is working correctly!');
      console.log('\n📊 Summary:');
      console.log(`   Total wishlists: ${wishlistData.data.length}`);

      const stats = {
        pending: wishlistData.data.filter(w => w.status === 'pending').length,
        approved: wishlistData.data.filter(w => w.status === 'approved').length,
        rejected: wishlistData.data.filter(w => w.status === 'rejected').length,
      };

      console.log(`   Pending: ${stats.pending}`);
      console.log(`   Approved: ${stats.approved}`);
      console.log(`   Rejected: ${stats.rejected}`);
    } else {
      console.log('⚠️  No wishlist data in response');
      console.log('   Response:', JSON.stringify(wishlistData, null, 2));
    }

    console.log('\n' + '='.repeat(60));
    console.log('💡 If no wishlist showing:');
    console.log('   1. Check test data was created (run: node create-test-student-account.js)');
    console.log('   2. Navigate to "Yêu cầu" (Requests) tab in mobile app');
    console.log('   3. Pull down to refresh and load wishlist data');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

testWishlistAPI();
