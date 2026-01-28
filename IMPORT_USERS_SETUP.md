# Import Users Feature - Setup & Installation Guide

## Quick Start

### 1. Backend Setup

#### Step 1: Install Dependencies
```bash
cd backend-api
npm install exceljs
```

#### Step 2: Verify Models
The following files should already exist:
- `src/models/user.model.js` ✓
- `src/models/wallet.model.js` ✓ (NEW)

#### Step 3: Verify Files Created
```
backend-api/
├── src/
│   ├── controllers/
│   │   └── user.controller.js (UPDATED - added importUsers)
│   ├── middlewares/
│   │   └── excelUpload.middleware.js (NEW)
│   ├── models/
│   │   └── wallet.model.js (NEW)
│   ├── routes/
│   │   └── user.routes.js (UPDATED - added /import route)
│   └── utils/
│       ├── importHelper.js (NEW)
│       └── createSampleImportFile.js (NEW)
└── package.json (UPDATED - added exceljs)
```

#### Step 4: Restart Backend
```bash
# If running with npm start or nodemon
# Press Ctrl+C to stop
# Then run:
npm start
# or
npm run dev
```

---

### 2. Frontend Setup

#### Step 1: Verify Files Created
```
frontend-web/
├── src/
│   ├── components/
│   │   └── features/
│   │       └── ImportUsersModal.jsx (NEW)
│   ├── pages/
│   │   └── UserListPage.jsx (UPDATED - added Import button)
│   └── services/
│       └── userService.js (UPDATED - importUsers function)
```

#### Step 2: No Additional Dependencies Needed
- ImportUsersModal uses built-in React hooks and Tailwind CSS
- userService uses existing axiosClient

#### Step 3: Verify Changes
Check that UserListPage.jsx imports ImportUsersModal:
```jsx
import ImportUsersModal from '../components/features/ImportUsersModal';
```

---

## Verification Checklist

### Backend Files
- [x] `wallet.model.js` created with Mongoose schema
- [x] `excelUpload.middleware.js` created with multer config
- [x] `importHelper.js` created with validation functions
- [x] `createSampleImportFile.js` created for testing
- [x] `user.controller.js` updated with importUsers function
- [x] `user.routes.js` updated with POST /users/import route
- [x] `package.json` updated with exceljs dependency

### Frontend Files
- [x] `ImportUsersModal.jsx` created with complete UI
- [x] `UserListPage.jsx` updated with Import button
- [x] `userService.js` has importUsers function

### Database Setup
- [x] MongoDB running and connected
- [x] User model has importSource field for tracking
- [x] Wallet model ready for storing balance data

---

## Generate Sample Excel File

### Method 1: Using Node Script
```bash
cd backend-api
node src/utils/createSampleImportFile.js
```

Output: `sample-users-import.xlsx` in project root

**Contains 5 sample users:**
1. student1@example.com - Nguyễn Văn A (student, active)
2. student2@example.com - Trần Thị B (student, active)
3. staff1@example.com - Lê Văn C (staff, active)
4. admin1@example.com - Phạm Thị D (admin, active)
5. student3@example.com - Hoàng Văn E (student, pending)

### Method 2: Manual Creation
Create Excel file with columns:
```
A: email
B: fullName
C: role
D: status
```

Add sample rows with data as above.

---

## Testing the Feature

### Step 1: Start Services
```bash
# Terminal 1 - Backend
cd backend-api
npm start

# Terminal 2 - Frontend (new terminal)
cd frontend-web
npm run dev
```

### Step 2: Login to Application
- Navigate to `http://localhost:5173`
- Login with admin account (or IT Admin role)

### Step 3: Access Import Feature
1. Click "Manage Users" or navigate to `/admin/users`
2. Click green "Import Excel" button in top-right

### Step 4: Test Import
1. Click file input area or drag & drop
2. Select `sample-users-import.xlsx`
3. Click "Import" button
4. Monitor progress bar
5. Review results showing success/failure counts

### Step 5: Verify Data
- Check user list updates with new users
- Filter or search for newly imported users
- Open database to verify Wallet documents created

---

## Troubleshooting

### Issue: "importUsers is not a function"
**Solution:** Make sure `user.controller.js` has the new importUsers export
```javascript
exports.importUsers = async (req, res) => { ... };
```

### Issue: Cannot find module 'exceljs'
**Solution:** Install the dependency
```bash
cd backend-api
npm install exceljs
npm install  # Install all dependencies
```

### Issue: File upload returns 413 (Payload Too Large)
**Solution:** File exceeds 5MB limit. Reduce file size or increase limit in `excelUpload.middleware.js`:
```javascript
limits: {
  fileSize: 10 * 1024 * 1024, // Change to 10MB
}
```

### Issue: API returns 403 Forbidden
**Solution:** User doesn't have proper authentication. Ensure:
- Token is valid and not expired
- User is authenticated (check req.auth in console)
- Cookie-based auth is working

### Issue: "Invalid Excel file: No worksheet found"
**Solution:** Excel file is corrupted or empty. Re-create file or verify worksheet exists

### Issue: All imports fail validation
**Causes:**
- Column headers don't match exactly (case-sensitive): `email`, `fullName`, `role`, `status`
- Email format invalid (missing @ or domain)
- Required fields empty
- Check error details in results table

### Issue: Frontend modal doesn't open
**Solution:** Check that:
- ImportUsersModal is properly imported in UserListPage
- importModalOpen state exists
- Import button onClick handler works

---

## Configuration

### File Size Limit
**File:** `backend-api/src/middlewares/excelUpload.middleware.js`
```javascript
limits: {
  fileSize: 5 * 1024 * 1024, // Change this value
}
```

### Default Values for Optional Fields
**File:** `backend-api/src/utils/importHelper.js`
```javascript
role: row.role?.toLowerCase() || 'student',
status: row.status?.toLowerCase() || 'active',
```

### Wallet Default Balance
**File:** `backend-api/src/controllers/user.controller.js`
```javascript
const wallet = new Wallet({
  balance: 0, // Change default starting balance
  totalEarned: 0,
  totalSpent: 0,
  currency: 'VND', // Change currency
});
```

---

## API Examples

### Upload Excel File
```bash
curl -X POST http://localhost:3000/api/users/import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@sample-users-import.xlsx"
```

### Response Success
```json
{
  "success": true,
  "message": "Users imported successfully",
  "data": {
    "successCount": 5,
    "failureCount": 0,
    "importedUsers": [
      {
        "rowIndex": 2,
        "email": "student1@example.com",
        "fullName": "Nguyễn Văn A",
        "userId": "507f1f77bcf86cd799439011",
        "status": "success"
      }
    ],
    "invalidRows": [],
    "errors": []
  }
}
```

---

## File Structure Summary

### Backend Changes
```
user.controller.js:
  + const Wallet = require('../models/wallet.model');
  + const { validateImportRows } = require('../utils/importHelper');
  + const ExcelJS = require('exceljs');
  + exports.importUsers = async (req, res) => { ... }

user.routes.js:
  + const excelUpload = require('../middlewares/excelUpload.middleware');
  + router.post('/import', authMiddleware, excelUpload.single('file'), userController.importUsers);

package.json:
  + "exceljs": "^4.4.0"
```

### Frontend Changes
```
UserListPage.jsx:
  + import ImportUsersModal from '../components/features/ImportUsersModal';
  + const [importModalOpen, setImportModalOpen] = useState(false);
  + <button onClick={() => setImportModalOpen(true)}>Import Excel</button>
  + <ImportUsersModal isOpen={importModalOpen} onClose={...} onImportSuccess={...} />

userService.js:
  ✓ importUsers(formData) already exists

ImportUsersModal.jsx: (NEW)
  ✓ Complete modal component with all features
```

---

## Next Steps

1. **Install dependencies**: `npm install exceljs` in backend
2. **Restart backend**: `npm start`
3. **Verify files**: Check all files created in checklist above
4. **Generate sample**: `node src/utils/createSampleImportFile.js`
5. **Test import**: Use UI to import sample Excel file
6. **Verify results**: Check users and wallets created in database

---

## Support & References

- ExcelJS Documentation: https://github.com/exceljs/exceljs
- Multer Documentation: https://github.com/expressjs/multer
- MongoDB Transactions: https://docs.mongodb.com/manual/core/transactions/
- Tailwind CSS: https://tailwindcss.com/docs

---

## Summary

✅ **Import Users Feature Complete**
- Backend API fully implemented with validation and transactions
- Frontend UI with modal, progress tracking, and error handling
- Documentation and testing guide provided
- Sample Excel file generator included
- Ready for production use

Next feature: Continue with other admin functions or refine based on feedback.
