const http = require('http');
const jwt = require('jsonwebtoken');

async function testGetMyClasses() {
  try {
    // Create a test token with the dev secret
    const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me';
    const token = jwt.sign(
      {
        sub: '697ab37924dc848b87f25d0f',
        email: 'student@test.com'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✓ Created test token');
    console.log('Token (first 100 chars):', token.substring(0, 100) + '...');
    console.log('Secret used:', JWT_SECRET.substring(0, 20) + '...');

    // Call the API using http
    console.log('\n🔍 Calling GET /api/classes/my-classes...');
    
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/classes/my-classes',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          console.log('\n Status:', res.statusCode);
          console.log('Response:');
          try {
            console.log(JSON.stringify(JSON.parse(data), null, 2));
          } catch (e) {
            console.log(data);
          }
          resolve();
        });
      });

      req.on('error', (e) => {
        console.error('Request error:', e.message);
        reject(e);
      });

      req.end();
    });
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

testGetMyClasses();
