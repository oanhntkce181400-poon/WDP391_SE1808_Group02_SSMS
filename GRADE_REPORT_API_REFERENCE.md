# Grade Report Mobile - API Reference & Examples

## Backend API Endpoint

### GET `/api/grades/my-grades`

**Purpose**: Retrieve all student grades organized by semester

**Authentication**: Required (Bearer token)

**Query Parameters**: None

**Request Example**:
```javascript
// Called from gradeService.js
axiosClient.get('/grades/my-grades')
```

## Response Structure

### Success Response (200 OK)

```json
{
  "success": true,
  "semesterGroups": [
    {
      "semester": 1,
      "academicYear": "2024-2025",
      "totalCredits": 30,
      "totalWeightedPoints": 95.4,
      "semesterGPA": 3.18,
      "enrollments": [
        {
          "_id": "507f1f77bcf86cd799439011",
          "classSection": {
            "_id": "507f1f77bcf86cd799439010",
            "semester": 1,
            "academicYear": "2024-2025"
          },
          "subject": {
            "_id": "507f1f77bcf86cd799439012",
            "subjectCode": "WDP301",
            "subjectName": "Web Design & Prototyping",
            "credits": 3
          },
          "student": "507f1f77bcf86cd799439013",
          "credits": 3,
          "midtermScore": 8.0,
          "finalScore": 9.0,
          "assignmentScore": 8.5,
          "continuousScore": 8.0,
          "grade": 8.5,
          "gradeLabel": "Giỏi"
        },
        {
          "_id": "507f1f77bcf86cd799439021",
          "classSection": {
            "_id": "507f1f77bcf86cd799439020",
            "semester": 1,
            "academicYear": "2024-2025"
          },
          "subject": {
            "_id": "507f1f77bcf86cd799439022",
            "subjectCode": "PRJ301",
            "subjectName": "Project Management",
            "credits": 2
          },
          "student": "507f1f77bcf86cd799439013",
          "credits": 2,
          "midtermScore": 7.5,
          "finalScore": 7.5,
          "assignmentScore": 8.0,
          "continuousScore": 7.5,
          "grade": 7.6,
          "gradeLabel": "Khá"
        }
      ]
    },
    {
      "semester": 2,
      "academicYear": "2024-2025",
      "totalCredits": 28,
      "totalWeightedPoints": 92.1,
      "semesterGPA": 3.29,
      "enrollments": [
        {
          "_id": "507f1f77bcf86cd799439031",
          "classSection": {
            "_id": "507f1f77bcf86cd799439030",
            "semester": 2,
            "academicYear": "2024-2025"
          },
          "subject": {
            "_id": "507f1f77bcf86cd799439032",
            "subjectCode": "WDP302",
            "subjectName": "Advanced Web Development",
            "credits": 4
          },
          "student": "507f1f77bcf86cd799439013",
          "credits": 4,
          "midtermScore": 8.5,
          "finalScore": 9.5,
          "assignmentScore": 9.0,
          "continuousScore": 8.5,
          "grade": 9.0,
          "gradeLabel": "Xuất sắc"
        }
      ]
    }
  ],
  "overallGPA": 3.23
}
```

## Field Descriptions

### Semester Group Object

| Field | Type | Description |
|-------|------|-------------|
| `semester` | number | Semester number (1-8) |
| `academicYear` | string | Academic year (e.g., "2024-2025") |
| `totalCredits` | number | Total credits for semester |
| `totalWeightedPoints` | number | Sum of (grade × credits) |
| `semesterGPA` | number | GPA for this semester (0.0-4.0) |
| `enrollments` | array | Array of student enrollments |

### Enrollment Object

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `_id` | string | No | MongoDB enrollment ID |
| `classSection` | object | No | Class section info |
| `subject` | object | No | Subject info |
| `student` | string | No | Student ID |
| `credits` | number | No | Credit hours |
| `midtermScore` | number | Yes | Midterm exam score (0-10) |
| `finalScore` | number | Yes | Final exam score (0-10) |
| `assignmentScore` | number | Yes | Assignment score (0-10) |
| `continuousScore` | number | Yes | Continuous evaluation (0-10) |
| `grade` | number | No | Final calculated grade (0-10) |
| `gradeLabel` | string | No | Grade label in Vietnamese |

### Subject Object

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | MongoDB subject ID |
| `subjectCode` | string | Course code (e.g., "WDP301") |
| `subjectName` | string | Course name |
| `credits` | number | Credit hours |

## Grade Labels Mapping

```javascript
const gradeLabels = {
  "Xuất sắc": 8.5, // 8.5 - 10.0
  "Giỏi": 8.0,     // 8.0 - 8.4
  "Khá": 7.0,      // 7.0 - 7.9
  "Trung bình": 5.5, // 5.5 - 6.9
  "Yếu": 4.0,      // 4.0 - 5.4
  "Kém": null      // 0.0 - 3.9
}
```

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "No authentication token provided"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "You don't have permission to access this resource"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Student not found"
}
```

### 500 Server Error
```json
{
  "success": false,
  "message": "Error retrieving grades"
}
```

## Mock Data for Testing

### Minimal Response
```json
{
  "success": true,
  "semesterGroups": [],
  "overallGPA": 0
}
```

### Single Semester Response
```json
{
  "success": true,
  "semesterGroups": [
    {
      "semester": 1,
      "academicYear": "2024-2025",
      "totalCredits": 3,
      "totalWeightedPoints": 25.5,
      "semesterGPA": 8.5,
      "enrollments": [
        {
          "_id": "test_1",
          "classSection": { "_id": "cs_1", "semester": 1, "academicYear": "2024-2025" },
          "subject": {
            "_id": "subj_1",
            "subjectCode": "CS101",
            "subjectName": "Introduction to Programming",
            "credits": 3
          },
          "student": "student_123",
          "credits": 3,
          "midtermScore": 8.0,
          "finalScore": 9.0,
          "assignmentScore": null,
          "continuousScore": 8.5,
          "grade": 8.5,
          "gradeLabel": "Giỏi"
        }
      ]
    }
  ],
  "overallGPA": 8.5
}
```

### Edge Case - Failed Grades
```json
{
  "success": true,
  "semesterGroups": [
    {
      "semester": 1,
      "academicYear": "2024-2025",
      "totalCredits": 6,
      "totalWeightedPoints": 42,
      "semesterGPA": 3.5,
      "enrollments": [
        {
          "_id": "fail_1",
          "subject": {
            "subjectCode": "MATH101",
            "subjectName": "Calculus I",
            "credits": 3
          },
          "credits": 3,
          "midtermScore": 3.5,
          "finalScore": 2.5,
          "assignmentScore": 4.0,
          "continuousScore": 3.2,
          "grade": 3.2,
          "gradeLabel": "Kém"
        },
        {
          "_id": "pass_1",
          "subject": {
            "subjectCode": "PHY101",
            "subjectName": "Physics I",
            "credits": 3
          },
          "credits": 3,
          "midtermScore": 7.0,
          "finalScore": 7.0,
          "assignmentScore": 6.5,
          "continuousScore": 7.5,
          "grade": 7.0,
          "gradeLabel": "Khá"
        }
      ]
    }
  ],
  "overallGPA": 3.5
}
```

## Data Normalization (useGrades Hook)

The `useGrades` hook normalizes the API response:

```javascript
normalizeGrades(raw) {
  return {
    semesterGroups: raw.semesterGroups?.map(group => ({
      semester: group.semester || 'N/A',
      academicYear: group.academicYear || 'N/A',
      totalCredits: group.totalCredits || 0,
      totalWeightedPoints: group.totalWeightedPoints || 0,
      semesterGPA: formatNumber(group.semesterGPA), // String with 2 decimals
      enrollments: group.enrollments?.map(enrollment => ({
        id: enrollment._id,
        subjectCode: enrollment.subject?.subjectCode || 'N/A',
        subjectName: enrollment.subject?.subjectName || 'N/A',
        credits: enrollment.credits || 0,
        grade: formatNumber(enrollment.grade), // String with 1 decimal
        gradeLabel: enrollment.gradeLabel || 'N/A',
        status: enrollment.status || 'N/A',
        midtermScore: enrollment.midtermScore || null,
        finalScore: enrollment.finalScore || null,
        assignmentScore: enrollment.assignmentScore || null,
        continuousScore: enrollment.continuousScore || null,
        semester: group.semester,
        academicYear: group.academicYear,
      }))
    })),
    overallGPA: formatNumber(raw.overallGPA) // String with 2 decimals
  }
}
```

## Related Endpoints

### Get Enrollment Details
```
GET /api/grades/:enrollmentId/details
```
Returns detailed grade breakdown for specific enrollment.

### Get GPA Info
```
GET /api/students/me/gpa
```
Returns overall GPA information.

### Get Semester GPA
```
GET /api/students/me/gpa/semester/:semesterNumber/:academicYear
```
Returns GPA for specific semester.

## Integration Checklist

- [ ] Backend API returns all required fields
- [ ] Grade values are in 0-10 range
- [ ] GPA values are in 0-4.0 range
- [ ] SemesterGPA calculation is correct
- [ ] Grade labels match expected values
- [ ] Subject codes are non-empty
- [ ] Credit values are positive numbers
- [ ] Score components are nullable (null if not applicable)
- [ ] Response times < 2 seconds
- [ ] Handles 0 enrollments gracefully

## Performance Tips

1. **Data Size**: Keep enrollment lists reasonable (< 100 per semester)
2. **Caching**: Consider caching if API calls are frequent
3. **Pagination**: Not currently implemented but could be added
4. **Compression**: Ensure API response compression is enabled
5. **Batching**: Consider fetching semester-by-semester if needed

## Troubleshooting Response Issues

### Missing Fields
- Verify all required fields are present in enrollment object
- Check subject object has subjectCode and subjectName
- Ensure grade and gradeLabel are always present

### Incorrect Calculations
- Verify GPA calculation formula server-side
- Check weights are correct if weighted GPA used
- Ensure credit values are accurate

### Formatting Issues
- Grade values should be numbers, not strings
- GPA should be formatted to reasonable precision
- Academic year format should be "YYYY-YYYY"

---

**Last Updated**: March 26, 2026
**API Version**: 1.0
**Integration Status**: Ready for Testing
