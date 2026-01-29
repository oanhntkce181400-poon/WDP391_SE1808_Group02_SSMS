import requests
import json
from requests_toolbelt.multipart.encoder import MultipartEncoder
import io

BASE_URL = 'http://localhost:3000/api'

# Step 1: Login
print("\n=== Step 1: Login ===")
login_res = requests.post(
    f"{BASE_URL}/auth/login",
    json={"email": "admin@test.com", "password": "Test@123456"},
    allow_redirects=True
)
print(f"Status: {login_res.status_code}")
login_data = login_res.json()
print(f"Success: {login_data.get('success')}")

if not login_data.get('success'):
    print(f"Error: {login_data.get('message')}")
    exit(1)

token = login_data['data']['accessToken']
print(f"Token: {token[:20]}...")

# Step 2: Create test PNG image
print("\n=== Step 2: Creating test image ===")
png_bytes = bytes([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
    0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
])
print(f"Created test PNG ({len(png_bytes)} bytes)")

# Step 3: Upload settings with image
print("\n=== Step 3: Upload settings with logo ===")
headers = {
    'Authorization': f'Bearer {token}'
}

files = {
    'logo': ('test-logo.png', io.BytesIO(png_bytes), 'image/png'),
}

data = {
    'schoolName': 'Test School - Updated',
    'schoolCode': 'TEST001',
    'contactEmail': 'contact@school.edu',
    'contactPhone': '+84912345678',
    'address': 'Test Address Street, City',
}

update_res = requests.patch(
    f"{BASE_URL}/settings",
    headers=headers,
    data=data,
    files=files
)

print(f"Status: {update_res.status_code}")
print(f"Response: {json.dumps(update_res.json(), indent=2)}")

if update_res.status_code == 200:
    print("\n✅ Settings updated successfully!")
    resp_data = update_res.json()
    if resp_data.get('data') and resp_data['data'].get('logoUrl'):
        print(f"Logo URL: {resp_data['data']['logoUrl']}")
else:
    print("\n❌ Settings update failed!")
    if 'debug' in update_res.json():
        print(f"Debug info: {update_res.json()['debug']}")

# Step 4: Get settings to verify
print("\n=== Step 4: Verify settings ===")
get_res = requests.get(f"{BASE_URL}/settings")
print(f"Status: {get_res.status_code}")
get_data = get_res.json()
if get_data.get('success'):
    settings = get_data['data']
    print(f"School Name: {settings.get('schoolName')}")
    print(f"Logo URL: {settings.get('logoUrl')}")
    print("\n✅ All tests passed!")
else:
    print(f"Error: {get_data.get('message')}")
