# Export Grade Records - Implementation Guide

## Overview
The Export Grade Records feature allows students to download their grade reports in Excel (.xlsx) or PDF formats with optional filtering by semester, academic year, class section, or major.

---

## Backend Implementation

### 1. Service Layer: `backend-api/src/services/export.service.js`

**Key Methods:**

```javascript
// Fetch enrollment data with filtering
async getExportData(studentId, filters = {})
```
- Supports filtering by: semester, academicYear, classSection, major
- Returns populated enrollment data with subject and teacher info

```javascript
// Generate Excel file
async generateExcel(enrollments, studentInfo)
```
- Uses ExcelJS library for .xlsx generation
- Features:
  - Headers with student info (name, ID, export date)
  - Data grouped by semester
  - Color-coded grades (Green=Excellent, Red=Fail)
  - Formatted columns: Subject Code, Subject Name, Credits, Grade Components, Final Grade, Classification, Status

```javascript
// Generate PDF file
async generatePDF(enrollments, studentInfo)
```
- Uses PDFKit library for PDF generation
- Features:
  - Professional header with title and student info
  - Data organized by semester
  - Table format with all grade information
  - Grade classifications included

### 2. Controller: `backend-api/src/controllers/grades.controller.js`

**New Method:**
```javascript
async exportGrades(req, res)
```
- Endpoint: `GET /api/grades/export`
- Query Parameters:
  - `format` (required): 'excel' or 'pdf'
  - `semester` (optional): semester number
  - `academicYear` (optional): academic year
  - `classSection` (optional): class section ID
  - `major` (optional): major code
- Authentication: Required (Bearer token)
- Response: Binary file with appropriate Content-Type and Content-Disposition headers

### 3. Routes: `backend-api/src/routes/grades.routes.js`

Added route:
```javascript
router.get(
  '/export',
  authMiddleware,
  gradesController.exportGrades
);
```

**Important:** Route placed before `:enrollmentId` routes to avoid routing conflicts.

### 4. Dependencies Added

```json
{
  "pdfkit": "^0.18.0"
}
```

ExcelJS was already installed.

---

## Frontend Implementation

### 1. Export Modal Component: `mobile-app/src/components/ExportModal.js`

**Features:**
- Modal dialog with two format options (Excel, PDF)
- Visual indicators with icons and color coding
- Loading state during export
- Descriptive text for each format
- Cancel and Export buttons

**Props:**
- `visible: boolean` - Show/hide modal
- `onClose: function` - Close handler
- `onExport: function(format)` - Export handler
- `isLoading: boolean` - Loading state

### 2. API Service: `mobile-app/src/api/grades.api.js`

**Main Methods:**

```javascript
// Export with optional filters
async exportGrades(format = 'excel', filters = {})
```

```javascript
// Export specific semester
async exportGradesBySemester(format = 'excel', semester, academicYear)
```

```javascript
// Export for class section
async exportGradesByClassSection(format = 'excel', classSection)
```

```javascript
// Export for major
async exportGradesByMajor(format = 'excel', major)
```

**Features:**
- Authenticates with Bearer token
- Saves file to document directory
- Auto-shares file using Sharing API
- Error handling with meaningful messages

### 3. Updated Screen: `mobile-app/src/screens/student/GradeReportScreen.js`

**Changes:**
```javascript
// New imports
import ExportModal from '../../components/ExportModal';
import { gradesApi } from '../../api/grades.api';

// New state
const [exportModalVisible, setExportModalVisible] = useState(false);
const [isExporting, setIsExporting] = useState(false);

// New handler
const handleExport = async (format) => {
  // Calls gradesApi.exportGrades()
  // Shows success/error alert
}
```

**UI Changes:**
- Added export button in header with download icon
- Button fixed in header, always visible
- Integrated ExportModal component at bottom

---

## Data Flow

```
User clicks Export Button
    ↓
ExportModal Dialog opens (select format)
    ↓
User selects format (Excel/PDF)
    ↓
Frontend: gradesApi.exportGrades(format)
    ↓
Backend: GET /api/grades/export?format=...
    ↓
Backend: Export Service
    - Fetch enrollment data
    - Generate file (Excel or PDF)
    - Return binary file
    ↓
Frontend: Save to file system → Share with user
    ↓
Success alert
    ↓
File opens in default application
```

---

## Grade Classification

Used in both Excel and PDF formats:
- **Xuất sắc (Excellent)**: >= 8.5 (Green)
- **Giỏi (Good)**: >= 8.0 (Blue)
- **Khá (Satisfactory)**: >= 7.0 (Green)
- **Trung bình (Average)**: >= 5.5 (Amber)
- **Yếu (Weak)**: >= 4.0 (Orange)
- **Kém (Poor)**: < 4.0 (Red)

---

## File Format Details

### Excel (.xlsx)
- Columns: 11 (Semester, Subject Code, Subject Name, Credits, Midterm, Final, Assignment, Continuous, Final Grade, Classification, Status)
- Grouped by semester with colored headers
- Student info section
- Formatted cells with proper alignment
- Color-coded grades

### PDF
- Header: Title "BÁO CÁO ĐIỂM" (Grade Report)
- Student info (Name, ID, Export Date)
- Data organized by semester
- Table format with 7 columns
- Grade classification included in final grade column
- Footer with disclaimer

---

## Error Handling

### Backend Errors (with HTTP Status):
- 401: Unauthorized (no/invalid token)
- 400: Invalid format parameter
- 404: Student not found or no grade data
- 500: Excel/PDF generation error

### Frontend Errors:
- Network errors
- File system errors
- Share API errors
- Displays user-friendly Alert dialogs

---

## Testing Checklist

- [ ] Backend route responds to `GET /api/grades/export`
- [ ] Format validation (excel vs pdf)
- [ ] Filter by semester works
- [ ] Filter by academicYear works
- [ ] Excel file generates with correct format
- [ ] PDF file generates with correct layout
- [ ] File downloads to mobile device
- [ ] File sharing works on both iOS and Android
- [ ] Authentication check (401 without token)
- [ ] Empty data handling

---

## Usage Examples

### From Mobile App:

```javascript
// Export all grades as Excel
await gradesApi.exportGrades('excel');

// Export specific semester as PDF
await gradesApi.exportGradesBySemester('pdf', '1', '2024-2025');

// Export with multiple filters
await gradesApi.exportGrades('excel', {
  semester: '2',
  academicYear: '2024-2025',
  classSection: 'class123'
});
```

### From API (cURL):

```bash
# Export as Excel
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/grades/export?format=excel" \
  -o report.xlsx

# Export specific semester as PDF
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/grades/export?format=pdf&semester=1&academicYear=2024-2025" \
  -o report.pdf
```

---

## Performance Considerations

- **Large Reports**: Excel/PDF generation with 100+ enrollments may take a few seconds
- **File Size**: 
  - Excel: Typically 50-200KB depending on grade components
  - PDF: Typically 100-300KB
- **Memory**: Peak memory usage during file generation (~50-100MB)

---

## Future Enhancements

1. Add filters UI in mobile app (semester, class selection before export)
2. Support custom grade classifications
3. Add student transcript download (multi-semester)
4. Support batch export for teachers/admin
5. Email export functionality
6. Archive/backup feature
7. Export templates customization

---

## Support & Troubleshooting

### Issue: Export fails with 401 error
- **Cause**: Token expired or missing
- **Solution**: Re-login to get new token

### Issue: PDF shows garbled Vietnamese characters
- **Cause**: Font encoding issue
- **Solution**: Update PDFKit to support UTF-8 fonts (already configured)

### Issue: File not appearing in download folder
- **Solution**: Check app permissions in mobile settings (file system access)

---

## Files Modified/Created

### Backend:
- ✅ Created: `backend-api/src/services/export.service.js`
- ✅ Modified: `backend-api/src/controllers/grades.controller.js` (added exportGrades method)
- ✅ Modified: `backend-api/src/routes/grades.routes.js` (added export route)
- ✅ Modified: `backend-api/package.json` (added pdfkit)

### Frontend:
- ✅ Created: `mobile-app/src/components/ExportModal.js`
- ✅ Created: `mobile-app/src/api/grades.api.js`
- ✅ Modified: `mobile-app/src/screens/student/GradeReportScreen.js` (added export button & modal)

---

**Status**: ✅ Complete and Ready for Testing
