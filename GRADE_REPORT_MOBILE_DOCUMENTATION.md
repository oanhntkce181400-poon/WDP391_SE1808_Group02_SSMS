# Grade Report Feature Documentation

## Overview
The Grade Report feature allows students to view their grades for each subject/course in a well-organized, visually clear format. The feature displays:
- Overall cumulative GPA
- Grades organized by semester
- Individual subject grades with color-coded status
- Grade component breakdown (midterm, finals, assignment, continuous)
- Detailed modal view for each subject

## Architecture

### Service Layer (`gradeService.js`)
Communicates with the backend API to fetch grade data:

```javascript
// Get all grades grouped by semester
gradeService.getMyGrades()

// Get specific enrollment details
gradeService.getGradeDetails(enrollmentId)

// Get GPA info
gradeService.getGPA()
gradeService.getGPABySemester(semesterNumber, academicYear)
```

### State Management Hook (`useGrades.js`)
Manages grade data fetching and normalization:

```javascript
const { 
  grades,      // Normalized grade data
  loading,     // Initial load indicator
  refreshing,  // Pull-to-refresh indicator
  error,       // Error message if any
  refresh,     // Refresh function
  reload       // Full reload function
} = useGrades();
```

### UI Components (`GradeReportScreen.js`)

#### Main Screen
- Header with overall GPA display
- Scrollable list of semester sections
- Pull-to-refresh functionality
- Error and empty states

#### SemesterSection
- Expandable section per semester
- Shows pass/fail counts
- Displays semester GPA
- Contains grade cards for each subject

#### GradeCard
- Subject code and name
- Final grade with color-coded background
- Credits display
- Failed indicator badge
- Score components (GK, BT, QT, CK)

#### GradeDetailModal
- Full subject details
- Grade breakdown by component
- Subject information (credits, status)
- Dismissible modal

## Data Flow

```
Backend API (/api/grades/my-grades)
    ↓
gradeService.getMyGrades()
    ↓
useGrades Hook (fetches and normalizes)
    ↓
GradeReportScreen (renders organized view)
    ↓
User interacts → Detail Modal
```

## Grade Scoring System

### Grade Labels (Vietnamese)
| Grade | Label | Color | Status |
|-------|-------|-------|--------|
| 8.5+ | Xuất sắc | #16a34a (Green) | Pass |
| 8.0+ | Giỏi | #0ea5e9 (Sky Blue) | Pass |
| 7.0+ | Khá | #10b981 (Green) | Pass |
| 5.5+ | Trung bình | #f59e0b (Amber) | Pass |
| 4.0+ | Yếu | #f97316 (Orange) | Pass |
| <4.0 | Kém | #dc2626 (Red) | FAIL |

### Score Components
- **GK** (Giữa kỳ): Midterm score
- **BT** (Bài tập): Assignment score
- **QT** (Quá trình): Continuous/Process score
- **CK** (Cuối kỳ): Final exam score

## Navigation Integration

### Tabs
The feature is accessible via the "Điểm" (Grades) tab in the bottom navigation bar.
- Icon: bar-chart
- Default position: 4th tab (after Exam Schedule, before Feedback)

### Quick Access
From the Home screen, users can access the feature via:
- Quick Actions card: "Báo cáo điểm"
- Location: 4th position in quick actions grid

## Backend API Integration

### Endpoint: `GET /api/grades/my-grades`

**Response Structure:**
```json
{
  "semesterGroups": [
    {
      "semester": 1,
      "academicYear": "2024-2025",
      "totalCredits": 30,
      "totalWeightedPoints": 95,
      "semesterGPA": 3.17,
      "enrollments": [
        {
          "_id": "enrollment_id",
          "subject": {
            "subjectCode": "WDP301",
            "subjectName": "Web Design & Prototyping"
          },
          "credits": 3,
          "grade": 8.5,
          "gradeLabel": "Giỏi",
          "status": "completed",
          "midtermScore": 8.0,
          "finalScore": 9.0,
          "assignmentScore": 8.5,
          "continuousScore": 8.0
        }
      ]
    }
  ],
  "overallGPA": 3.17
}
```

## Features & Functionality

### 1. **Semester Organization**
- Grades grouped by semester and academic year
- Collapsible/expandable sections
- Shows pass/fail counts per semester
- Semester GPA display

### 2. **Subject Grade Display**
- Color-coded grade indicators
- Credits information
- Failed indicator for grades < 4.0
- Quick view of score components

### 3. **Detailed View**
- Modal popup on grade card click
- Complete score breakdown
- Subject details
- Component score visualization

### 4. **Refresh & Reload**
- Pull-to-refresh from top
- Manual retry button on error
- Maintains scroll position on refresh

### 5. **Accessibility**
- Proper error messages in Vietnamese
- Loading states
- Empty data states
- Readable color contrast

## Styling & UX

### Colors Used
- Primary: #1d4ed8 (Blue)
- Success: #16a34a (Green)
- Warning: #f59e0b (Amber)
- Error: #dc2626 (Red)
- Text: #0f172a (Dark), #64748b (Gray)
- Background: #f8fafc (Light)

### Typography
- Headers: fontWeight: '700', fontSize: 28
- Titles: fontWeight: '600', fontSize: 16
- Body: fontWeight: '500', fontSize: 14

## Testing Checklist

- [ ] Navigation tab appears in bottom bar
- [ ] Quick action card appears on home screen
- [ ] Screen loads and displays grades correctly
- [ ] Pull-to-refresh works
- [ ] Grade detail modal opens on card tap
- [ ] Color coding displays correctly
- [ ] Empty state shows when no grades
- [ ] Error state shows and retry works
- [ ] Semester sections expand/collapse
- [ ] Overall GPA displays correctly
- [ ] Score components show correctly

## Future Enhancements

- [ ] Filter grades by semester
- [ ] Export grades as PDF
- [ ] Grade trends visualization (chart)
- [ ] GPA calculator tool
- [ ] Comparison with class average
- [ ] Grade prediction based on current components
- [ ] Notifications for grade updates

## Troubleshooting

### Grades not loading
1. Check backend API is running
2. Verify `/api/grades/my-grades` endpoint exists
3. Check authentication token is valid
4. Check network connectivity

### Modal not opening
1. Verify GradeCard onPress handler is working
2. Check modal state updates correctly
3. Verify enrollment data is complete

### Colors not displaying
1. Check style definitions are correct
2. Verify grade values are numbers
3. Check component rendering logic

## File Structure

```
mobile-app/
├── src/
│   ├── services/
│   │   └── gradeService.js          ← New service
│   ├── hooks/
│   │   └── useGrades.js             ← New hook
│   ├── screens/student/
│   │   ├── GradeReportScreen.js     ← New screen
│   │   └── HomeScreen.js            ← Modified (added quick action)
│   └── navigation/
│       └── AppNavigator.js          ← Modified (added routing)
└── package.json
```
