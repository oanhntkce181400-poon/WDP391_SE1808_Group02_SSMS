const fs = require('fs');
const http = require('http');
const https = require('https');
const querystring = require('querystring');

const BASE_URL = 'http://localhost:3000/api';

function makeRequest(method, path, headers, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      method: method,
      headers: headers,
    };

    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: data ? JSON.parse(data) : null,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function testSettingsUpload() {
  try {
    console.log('\n=== TEST SETTINGS UPLOAD ===\n');

    // Step 1: Login to get token
    console.log('Step 1: Logging in...');
    const loginBody = JSON.stringify({
      email: 'admin@test.com',
      password: 'Test@123456'
    });

    const loginRes = await makeRequest('POST', '/auth/login', {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginBody)
    }, loginBody);

    if (loginRes.status !== 200) {
      console.error('Login failed:', loginRes.data);
      return;
    }

    const token = loginRes.data.data.token;
    console.log(`✓ Login successful. Token: ${token.substring(0, 50)}...`);
    console.log(`✓ User ID: ${loginRes.data.data.user.id}\n`);

    // Step 2: Create a test PNG image
    console.log('Step 2: Creating test image and form data...');
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
      0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB2, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
      0x42, 0x60, 0x82
    ]);
    const testImagePath = './test-logo.png';
    fs.writeFileSync(testImagePath, pngBuffer);
    console.log(`✓ Test image created (${pngBuffer.length} bytes)\n`);

    // Step 3: Build multipart form data
    console.log('Step 3: Updating settings with image...');
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substr(2, 9);
    const parts = [];

    // Add text fields
    parts.push(`--${boundary}`);
    parts.push(`Content-Disposition: form-data; name="schoolName"`);
    parts.push('');
    parts.push('Test School ' + Date.now());
    
    parts.push(`--${boundary}`);
    parts.push(`Content-Disposition: form-data; name="contactEmail"`);
    parts.push('');
    parts.push('contact@test.com');

    parts.push(`--${boundary}`);
    parts.push(`Content-Disposition: form-data; name="logo"; filename="test-logo.png"`);
    parts.push('Content-Type: image/png');
    parts.push('');

    const beforeFileBody = parts.join('\r\n') + '\r\n';
    const afterFileBody = `\r\n--${boundary}--\r\n`;

    const formDataBuffer = Buffer.concat([
      Buffer.from(beforeFileBody),
      pngBuffer,
      Buffer.from(afterFileBody)
    ]);

    const updateRes = await makeRequest('PATCH', '/settings', {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Authorization': `Bearer ${token}`,
      'Content-Length': formDataBuffer.length
    }, formDataBuffer);

    console.log(`Response Status: ${updateRes.status}`);
    console.log(`Response Body:`, JSON.stringify(updateRes.data, null, 2));

    if (updateRes.status === 200) {
      console.log('\n✅ Settings update SUCCESSFUL!');
      console.log('Logo URL:', updateRes.data.data?.logoUrl);
    } else {
      console.log('\n❌ Settings update FAILED');
    }

    // Cleanup
    fs.unlinkSync(testImagePath);
    console.log('\n✓ Test completed');

  } catch (error) {
    console.error('Test Error:', error.message);
    console.error('Full error:', error);
  }
}

testSettingsUpload();
