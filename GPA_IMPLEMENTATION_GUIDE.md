## GPA Calculation Feature - Implementation Summary

### Feature Overview
Implemented a comprehensive GPA (Grade Point Average) calculation system that:
- Calculates GPA based on weighted grades and credits
- Displays GPA in the student header with visual warning when below 5.0
- Provides API endpoints for both students and administrators
- **NEW**: Calculates GPA for individual semesters with semester selector dropdown

---

## Backend Implementation

### 1. GPA Service (`backend-api/src/services/gpa.service.js`)

**Key Functions:**

- **`calculateStudentGPA(studentId)`**
  - Retrieves all `ClassEnrollment` records with grades
  - Formula: `GPA = (Σ grade × credits) / Σ credits`
  - Only considers completed enrollments
  - Returns: `{ gpa, totalCredits, weightedSum, courses, status }`

- **`calculateSemesterGPA(studentId, semesterNumber, academicYear)`** ⭐ NEW
  - Calculates GPA for a specific semester
  - Filters enrollments by semester number and academic year
  - Same calculation formula as overall GPA
  - Returns: `{ gpa, totalCredits, weightedSum, courses, semesterNumber, academicYear }`

- **`getSemesterListForStudent(studentId)`** ⭐ NEW
  - Returns list of all semesters student has completed
  - Each semester: `{ semesterNumber, academicYear, semesterName }`
  - Sorted by most recent first

- **`getDetailedGPA(studentId)`**
  - Returns GPA with course-by-course breakdown

- **`getSimpleGPA(studentId)`**
  - Returns just the GPA number

- **`checkGPAWarning(studentId)`**
  - Returns `{ isLow, gpa, status }`
  - `isLow` = true if GPA < 5.0

### 2. Student Controller Updates (`backend-api/src/controllers/student.controller.js`)

**New Methods:**

- **`getMyGPA(req, res)`** - GET /api/students/me/gpa
  - For current authenticated student
  - Returns full GPA details including courses

- **`getStudentGPA(req, res)`** - GET /api/students/:id/gpa
  - For admin/staff viewing any student's GPA

- **`getMyGPABySemester(req, res)`** - GET /api/students/me/gpa/semester/:semesterNumber/:academicYear ⭐ NEW
  - GPA for current student's specific semester

- **`getStudentGPABySemester(req, res)`** - GET /api/students/:id/gpa/semester/:semesterNumber/:academicYear ⭐ NEW
  - GPA for any student's specific semester (admin only)

- **`getMySemesterList(req, res)`** - GET /api/students/me/semesters ⭐ NEW
  - List of semesters for current student

- **`getStudentSemesterList(req, res)`** - GET /api/students/:id/semesters ⭐ NEW
  - List of semesters for any student (admin only)

### 3. Routes Updates (`backend-api/src/routes/student.routes.js`)

```javascript
// Student's routes
GET /api/students/me/gpa                              // Overall GPA
GET /api/students/me/semesters                        // List of semesters
GET /api/students/me/gpa/semester/:semester/:year     // Semester GPA

// Admin's routes (for viewing specific student)
GET /api/students/:id/gpa                             // Overall GPA
GET /api/students/:id/semesters                       // List of semesters
GET /api/students/:id/gpa/semester/:semester/:year    // Semester GPA
```

---

## Frontend Implementation

### 1. GPA Service (`frontend-web/src/services/gpaService.js`)

**New Functions:**

- **`getMySemesters()`** - Fetches list of student's semesters
- **`getStudentSemesters(studentId)`** - Admin function for any student
- **`getMyGPABySemester(semesterNumber, academicYear)`** - Fetches semester GPA
- **`getStudentGPABySemester(studentId, semesterNumber, academicYear)`** - Admin function

**Helper Functions:**

- **`formatGPA(gpa)`** - Formats to 2 decimal places
- **`isGPAWarning(gpa)`** - Returns true if GPA < 5.0
- **`getGPAColor(gpa)`** - Returns Tailwind color class

### 2. StudentLayout.jsx Updates

**New State Variables:**
- `semesters` - Array of available semesters
- `selectedSemester` - Currently selected semester
- `semesterGPA` - GPA data for selected semester
- `semesterGPALoading` - Loading state for semester GPA

**New Effects:**
1. Fetch overall GPA on mount (existing)
2. **Fetch semester list on mount** ⭐ NEW - Automatically selects most recent
3. **Fetch semester GPA when selected semester changes** ⭐ NEW

**UI Additions:**
- **Overall GPA Display** - Shows total GPA with warning icon if < 5.0
- **Semester Selector Dropdown** ⭐ NEW
  - Hover to open dropdown
  - Lists all semesters with semester name and academic year
  - Click to select
  - Highlighted current selection
- **Semester GPA Display** ⭐ NEW
  - Shows GPA for selected semester
  - Different color coding:
    - Red if < 5.0
    - Blue if ≥ 5.0
  - Warning icon for < 5.0

---

## Database Schema

**ClassEnrollment Model:**
- `student` - Reference to Student
- `classSection` - Reference to ClassSection
- `grade` - Number (0-10)
- `status` - Enum: 'enrolled', 'dropped', 'completed'

**ClassSection Model:**
- `semester` - Number (1, 2, 3...)
- `academicYear` - String (e.g., "2025-2026")
- References `Subject` (which contains `credits`)

**Subject Model:**
- `credits` - Number of credits for the course

---

## GPA Calculation Examples

### Overall GPA
```
Class 1: Grade 8.0, Credits 3 → Weighted: 24
Class 2: Grade 7.5, Credits 4 → Weighted: 30
Class 3: Grade 9.0, Credits 2 → Weighted: 18
---
Total Credits: 9
Total Weighted: 72
Overall GPA = 72 / 9 = 8.0
```

### Semester GPA
```
Same calculation, but only for classes in Semester 1 - 2025/2026

Semester 1 Classes:
- Class 1: Grade 8.5, Credits 3 → Weighted: 25.5
- Class 2: Grade 7.0, Credits 3 → Weighted: 21.0
---
Total Credits: 6
Total Weighted: 46.5
Semester 1 GPA = 46.5 / 6 = 7.75
```

---

## API Usage Examples

### 1. Get Overall GPA
```bash
GET /api/students/me/gpa
Authorization: Bearer {student_token}

Response:
{
  "gpa": 7.25,
  "totalCredits": 16,
  "weightedSum": 116.0,
  "courses": [...],
  "warning": false
}
```

### 2. Get Semester List ⭐ NEW
```bash
GET /api/students/me/semesters
Authorization: Bearer {student_token}

Response:
[
  {
    "semesterNumber": 1,
    "academicYear": "2025-2026",
    "semesterName": "Kỳ 1 - 2025/2026"
  },
  {
    "semesterNumber": 2,
    "academicYear": "2025-2026",
    "semesterName": "Kỳ 2 - 2025/2026"
  }
]
```

### 3. Get Semester GPA ⭐ NEW
```bash
GET /api/students/me/gpa/semester/1/2025-2026
Authorization: Bearer {student_token}

Response:
{
  "gpa": 7.75,
  "totalCredits": 6,
  "weightedSum": 46.5,
  "courses": [...],
  "semesterNumber": 1,
  "academicYear": "2025-2026"
}
```

### 4. Admin Viewing Student's Semester GPA
```bash
GET /api/students/{studentId}/gpa/semester/1/2025-2026
Authorization: Bearer {admin_token}
Role: admin or staff
```

---

## Features

✅ **Accurate GPA Calculation** - Uses weighted average formula

✅ **Real-time Display** - Shows on student header automatically

✅ **Overall GPA** - Cumulative GPA across all completed semesters

✅ **Semester GPA** ⭐ NEW - Individual semester performance tracking

✅ **Semester Selector** ⭐ NEW - Interactive dropdown to switch between semesters

✅ **Visual Warning System** - Color-coded display with warning badge

✅ **Detailed Breakdown** - Students see course-by-course breakdown

✅ **Admin Access** - Staff/Admin can view any student's GPA

✅ **Error Handling** - Graceful failure if no grades available

✅ **Responsive Design** - Works on desktop and mobile

✅ **Localized** - Vietnamese language support

---

## Testing Checklist

- [ ] Verify overall GPA calculates correctly
- [ ] Verify semester GPA calculates correctly with semester filter
- [ ] Confirm semester list fetches and sorts correctly
- [ ] Test semester dropdown opens/closes
- [ ] Test selecting different semesters updates displayed GPA
- [ ] Confirm warning displays when GPA < 5.0
- [ ] Test API endpoints with valid/invalid semester params
- [ ] Check authentication/authorization on endpoints
- [ ] Verify frontend displays both overall and semester GPA
- [ ] Test responsive design on mobile
- [ ] Verify error handling for students with no grades

---

## Files Modified/Created

**Backend:**
- ✅ Created: `backend-api/src/services/gpa.service.js` (enhanced)
- ✅ Modified: `backend-api/src/controllers/student.controller.js`
- ✅ Modified: `backend-api/src/routes/student.routes.js`

**Frontend:**
- ✅ Created: `frontend-web/src/services/gpaService.js` (enhanced)
- ✅ Modified: `frontend-web/src/components/layout/StudentLayout.jsx`

---

## Key Improvements (Semester GPA)

| Feature | Overall GPA | Semester GPA |
|---------|-------------|-------------|
| Calculation | All completed courses | Filter by semester |
| Update | Static (overall) | Dynamic (per semester) |
| UI | Single display | Dropdown selector |
| Use Case | Academic standing | Per-semester performance |
| Warning | GPA < 5.0 | GPA < 5.0 |

---

## Notes

- GPA only includes enrollments with `status: 'completed'` 
- Only considers enrollments where `grade` is not null
- Semesters are sorted by most recent first
- First semester in dropdown is automatically selected on page load
- Semester list updates dynamically when GPA calculation finishes
- Graceful degradation: If fetch fails, UI displays without GPA
- Color-coded system helps students quickly identify performance
