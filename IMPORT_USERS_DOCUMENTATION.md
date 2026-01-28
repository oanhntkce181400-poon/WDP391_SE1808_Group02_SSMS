# Import Users Feature Documentation

## Overview
This feature allows IT Admins to import multiple users from Excel files (.xlsx, .xls, .csv) into the system in bulk, with validation, error handling, and automatic wallet creation.

## Backend Implementation

### Files Created/Modified

#### 1. **Models**
- **`wallet.model.js`** (NEW)
  - Wallet schema for storing user balance and transaction history
  - Fields: `userId`, `balance`, `totalEarned`, `totalSpent`, `currency`, `status`, `lastTransactionAt`

#### 2. **Utils**
- **`importHelper.js`** (NEW)
  - `isValidEmail(email)` - Validates email format using regex
  - `emailExists(email)` - Checks if email already exists in database
  - `validateUserRow(row, rowIndex)` - Validates single row data
  - `validateImportRows(rows)` - Validates all rows with duplicate checking

- **`createSampleImportFile.js`** (NEW)
  - Script to generate sample Excel file for testing
  - Run: `node src/utils/createSampleImportFile.js`

#### 3. **Middlewares**
- **`excelUpload.middleware.js`** (NEW)
  - Multer configuration for Excel file upload
  - Accepts: .xlsx, .xls, .csv
  - Max file size: 5MB
  - Storage: Memory (buffer)

#### 4. **Controllers**
- **`user.controller.js`** (MODIFIED)
  - Added `importUsers()` function
  - Features:
    - Uses MongoDB transactions for data consistency
    - Parses Excel file with ExcelJS
    - Validates each row (email format, duplicates in file, duplicates in DB)
    - Creates User + Wallet in single transaction
    - Returns detailed results: success count, failed count, error details

#### 5. **Routes**
- **`user.routes.js`** (MODIFIED)
  - Added `POST /users/import` route
  - Middleware: authMiddleware, excelUpload.single('file')
  - Route must be before `/:userId` pattern

#### 6. **Dependencies**
- Updated `package.json` with `exceljs: ^4.4.0`

### API Endpoint

**POST** `/api/users/import`

**Authentication:** Required (Bearer token in cookie)

**Request:**
```
Content-Type: multipart/form-data
- file: Excel file (.xlsx, .xls, .csv)
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Users imported successfully",
  "data": {
    "successCount": 4,
    "failureCount": 1,
    "importedUsers": [
      {
        "rowIndex": 2,
        "email": "student1@example.com",
        "fullName": "Nguyễn Văn A",
        "userId": "ObjectId",
        "status": "success"
      }
    ],
    "invalidRows": [
      {
        "rowIndex": 3,
        "email": "invalid-email",
        "fullName": "Trần Thị B",
        "errors": ["Email không hợp lệ: invalid-email"]
      }
    ],
    "errors": []
  }
}
```

**Response Error (400/500):**
```json
{
  "success": false,
  "message": "Error message"
}
```

### Excel File Format

**Required Columns:**
1. `email` - Email address (required, must be unique)
2. `fullName` - Full name (required)
3. `role` - Role: admin, staff, student (optional, default: student)
4. `status` - Status: active, inactive, blocked, pending (optional, default: active)

**Example File:**
```
email                    | fullName          | role     | status
student1@example.com    | Nguyễn Văn A      | student  | active
staff1@example.com      | Lê Văn C          | staff    | active
admin1@example.com      | Phạm Thị D        | admin    | active
```

### Validation Rules

1. **Email Format:**
   - Must contain @ and domain
   - Pattern: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

2. **Email Uniqueness:**
   - No duplicates within import file
   - No duplicates in database

3. **Required Fields:**
   - `email` - Must be provided and valid
   - `fullName` - Must be provided and not empty

4. **Optional Fields:**
   - `role` - Defaults to 'student' if not provided
   - `status` - Defaults to 'active' if not provided

5. **Enum Values:**
   - `role`: ['admin', 'staff', 'student']
   - `status`: ['active', 'inactive', 'blocked', 'pending']

### Transaction Flow

1. Start MongoDB transaction
2. For each valid row:
   - Create User document
   - Create Wallet document with balance = 0
3. Commit transaction if all succeed
4. Abort transaction if any error occurs
5. Return detailed results to frontend

---

## Frontend Implementation

### Files Created/Modified

#### 1. **Components**
- **`ImportUsersModal.jsx`** (NEW)
  - Modal dialog for import process
  - Features:
    - File input (drag & drop support)
    - File validation (type, size)
    - Progress bar during upload
    - Results table showing success/failed rows
    - Error log download as CSV

#### 2. **Services**
- **`userService.js`** (MODIFIED)
  - Added/confirmed `importUsers(formData)` function
  - Sends POST request to `/users/import`

#### 3. **Pages**
- **`UserListPage.jsx`** (MODIFIED)
  - Added "Import Excel" button
  - Opens ImportUsersModal
  - Refreshes user list on successful import
  - Shows import results

### ImportUsersModal Component

**Props:**
- `isOpen: boolean` - Controls modal visibility
- `onClose: function` - Called when modal closes
- `onImportSuccess: function` - Called after successful import

**Features:**
1. **File Selection:**
   - Click or drag & drop
   - Validates file type (.xlsx, .xls, .csv)
   - Validates file size (max 5MB)
   - Shows file preview

2. **File Requirements Help:**
   - Shows required columns
   - Shows field format rules
   - Inline documentation

3. **Progress Tracking:**
   - Progress bar during upload
   - Percentage display

4. **Results Display:**
   - Summary cards (success/failure count)
   - Error details table with:
     - Row number
     - Email
     - Full name
     - Error message(s)
   - "Download Error Log" button exports to CSV

5. **States:**
   - File selection state
   - Processing state
   - Results state
   - Error state

### Usage Example

```jsx
import UserListPage from './pages/UserListPage';

// Inside UserListPage component:
const [importModalOpen, setImportModalOpen] = useState(false);

// Render button
<button
  onClick={() => setImportModalOpen(true)}
  className="px-4 py-2 bg-green-600 text-white rounded"
>
  Import Excel
</button>

// Render modal
<ImportUsersModal
  isOpen={importModalOpen}
  onClose={() => setImportModalOpen(false)}
  onImportSuccess={() => {
    setImportModalOpen(false);
    fetchUsers(); // Refresh list
  }}
/>
```

---

## Testing Guide

### Setup

1. **Install dependencies:**
   ```bash
   cd backend-api
   npm install exceljs
   ```

2. **Generate sample Excel file:**
   ```bash
   node src/utils/createSampleImportFile.js
   ```
   This creates `sample-users-import.xlsx` in project root

### Test Scenarios

#### 1. **Valid Import**
- Use sample Excel file
- All rows should import successfully
- Check database: Users and Wallets created
- Frontend shows success summary

#### 2. **Invalid Email**
- Add row with invalid email (e.g., "notanemail")
- Row should be marked as failed
- Error message: "Email không hợp lệ"

#### 3. **Duplicate Email (in file)**
- Add same email twice in file
- First occurrence imports
- Second occurrence fails with: "Email bị trùng trong file import"

#### 4. **Duplicate Email (in DB)**
- Import same users twice
- First import succeeds
- Second import fails with: "Email đã tồn tại trong hệ thống"

#### 5. **Invalid Role**
- Add row with role = "teacher" (not in enum)
- Row fails with: "Role không hợp lệ: teacher. Phải là: admin, staff, student"

#### 6. **Missing Required Field**
- Add row without email or fullName
- Row fails with: "Email không được để trống" or "Họ tên không được để trống"

#### 7. **Download Error Log**
- Import file with errors
- Click "Tải file log lỗi"
- CSV file downloads with all error details

#### 8. **Large File**
- Try uploading file > 5MB
- Frontend shows error: "Kích thước file không được vượt quá 5MB"

#### 9. **Wrong File Type**
- Try uploading .doc or .pdf
- Frontend shows error: "Chỉ chấp nhận file Excel (.xlsx, .xls, .csv)"

### Database Verification

```javascript
// Check imported users
db.users.find({ importSource: "excel_import" })

// Check wallets created
db.wallets.find({ balance: 0 })

// Verify no duplicate emails
db.users.aggregate([
  { $group: { _id: "$email", count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])
```

---

## Error Handling

### Backend Errors

| Scenario | Status | Message |
|----------|--------|---------|
| No file uploaded | 400 | "No file uploaded" |
| Invalid Excel file | 400 | "Invalid Excel file: No worksheet found" |
| No valid rows | 500 | Transaction aborts, returns errors |
| Invalid email format | Results | "Email không hợp lệ: {email}" |
| Email already exists | Results | "Email đã tồn tại trong hệ thống" |
| Missing fullName | Results | "Họ tên không được để trống" |
| Invalid role | Results | "Role không hợp lệ: {role}" |
| Invalid status | Results | "Status không hợp lệ: {status}" |

### Frontend Errors

| Scenario | Display |
|----------|---------|
| No file selected | "Vui lòng chọn file" |
| File too large | "Kích thước file không được vượt quá 5MB" |
| Wrong file type | "Chỉ chấp nhận file Excel (.xlsx, .xls, .csv)" |
| Upload failed | Error message from server |
| Network error | "Lỗi khi import users" |

---

## Performance Considerations

1. **Transaction Handling:**
   - All users imported in single transaction
   - Rollback if any error
   - Ensures data consistency

2. **File Size Limit:**
   - Max 5MB to prevent server overload
   - Suitable for up to ~1000 users per file

3. **Validation Order:**
   - Format validation first (fast)
   - Database lookup second (may be slow)
   - Creates balance: speed vs. accuracy

4. **Memory Usage:**
   - Multer stores file in memory (buffer)
   - ExcelJS processes line-by-line
   - Suitable for typical file sizes

---

## Future Enhancements

1. **Batch Size Optimization:**
   - Split large imports into smaller batches
   - Prevent timeout on very large files

2. **Email Notification:**
   - Send welcome email to imported users
   - Include temporary password/reset link

3. **Import History:**
   - Log all imports (who, when, count)
   - Undo/rollback previous imports

4. **Template Download:**
   - Provide Excel template download from UI
   - Pre-filled with example data

5. **Column Mapping:**
   - Allow mapping custom columns
   - Support various Excel formats

6. **Async Processing:**
   - Use job queue for large imports
   - Show progress via WebSocket

---

## API Curl Examples

```bash
# Test import with sample file
curl -X POST http://localhost:3000/api/users/import \
  -H "Authorization: Bearer {token}" \
  -F "file=@sample-users-import.xlsx"

# Test with CSV file
curl -X POST http://localhost:3000/api/users/import \
  -H "Authorization: Bearer {token}" \
  -F "file=@users.csv"
```

---

## Summary

The ImportUsers feature provides a complete solution for bulk user management:
- ✅ Excel file upload and parsing
- ✅ Comprehensive validation (format, uniqueness, enum values)
- ✅ MongoDB transaction for data consistency
- ✅ Automatic wallet creation for new users
- ✅ Detailed error reporting and export
- ✅ User-friendly modal with progress tracking
- ✅ Error log download for failed rows
