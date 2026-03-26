# Grade Report Mobile App - Quick Start Guide

## What's New?

A complete Grade Report feature has been implemented for the mobile app with:
- ✅ Grade Service (`gradeService.js`)
- ✅ Grades Hook (`useGrades.js`)  
- ✅ Grade Report Screen (`GradeReportScreen.js`)
- ✅ Navigation Integration
- ✅ Home Screen Integration

## How to Test

### 1. Access the Feature

**Method 1: From Home Screen**
- Open the app and go to Home tab
- Scroll to "Truy cập nhanh" (Quick Access) section
- Tap "Báo cáo điểm" card (green, 4th position)

**Method 2: From Navigation Tab**
- Tap the bottom "Điểm" (Grades) tab with bar-chart icon
- Located between "Lịch thi" and "Đánh giá" tabs

### 2. Expected UI Components

**Header Section:**
- Title: "Báo cáo điểm"
- GPA Card showing overall cumulative GPA

**Semester Sections:**
- Expandable by semester/academic year
- Shows: "Kỳ X - YYYY-YYYY"
- Displays: pass count, fail count, semester GPA

**Grade Cards (Per Subject):**
- Subject code + name
- Final grade (large, color-coded)
- Credits
- Score components (GK, BT, QT, CK) if available
- "Chưa đủ điểm" badge if grade < 4.0

**Interactive Features:**
- Tap any grade card to open detail modal
- Pull down to refresh
- Tap error retry button if loading fails

### 3. Color Scheme

| Grade | Vietnamese | Color | Hex |
|-------|-----------|-------|-----|
| 8.5+ | Xuất sắc | Green | #16a34a |
| 8.0+ | Giỏi | Sky Blue | #0ea5e9 |
| 7.0+ | Khá | Green | #10b981 |
| 5.5+ | Trung bình | Amber | #f59e0b |
| 4.0+ | Yếu | Orange | #f97316 |
| <4.0 | Kém | Red | #dc2626 |

### 4. Testing Scenarios

**Scenario 1: Normal Load**
1. Tap "Điểm" tab
2. Wait for grades to load
3. Verify: Header shows GPA, semesters display with grades

**Scenario 2: Expand/Collapse**
1. Tap semester header arrow
2. Grades should expand/collapse smoothly
3. Verify: UI remains responsive

**Scenario 3: View Details**
1. Tap any grade card
2. Modal should slide up
3. Verify: Shows all components, can scroll
4. Tap close or backdrop to dismiss

**Scenario 4: Refresh**
1. On Grade Report screen
2. Swipe down from top
3. Verify: Loading indicator shows, data refreshes

**Scenario 5: No Data**
1. If student has no grades
2. Verify: Empty state message shows

**Scenario 6: Error Handling**
1. Disconnect network
2. Try to load grades
3. Verify: Error message shows with retry button
4. Reconnect and tap retry
5. Verify: Grades load successfully

### 5. Data Source

The feature connects to the backend API:
```
GET /api/grades/my-grades
```

Expected response includes:
- `semesterGroups[]`: Array of semesters with enrollments
- Each enrollment: subject data, grades, components
- `overallGPA`: Cumulative GPA value

### 6. Dependencies

Required packages (already in package.json):
- react-native
- @expo/vector-icons
- zustand (for auth store)

Service dependencies:
- `axiosClient` (HTTP client)
- `useAuthStore` (authentication)

### 7. Code Files Modified/Created

**Created:**
- `/mobile-app/src/services/gradeService.js`
- `/mobile-app/src/hooks/useGrades.js`
- `/mobile-app/src/screens/student/GradeReportScreen.js`

**Modified:**
- `/mobile-app/src/navigation/AppNavigator.js` (routing + import)
- `/mobile-app/src/screens/student/HomeScreen.js` (quick action added)

### 8. Key Features Implemented

✅ Display overall cumulative GPA
✅ Group grades by semester
✅ Color-coded grade indicators  
✅ Score component breakdown (GK, BT, QT, CK)
✅ Pass/fail status indicator
✅ Expandable semester sections
✅ Detail modal for each subject
✅ Pull-to-refresh
✅ Error handling & retry
✅ Empty state handling
✅ Full Vietnamese localization

### 9. Known Limitations

- Modal uses bottom sheet (not page-based navigation)
- Score components only show if available in data
- GPA calculation done server-side

### 10. Support & Debugging

**If grades don't load:**
1. Check backend is running (`npm run dev` in backend-api)
2. Verify `/api/grades/my-grades` endpoint works
3. Check browser console for API errors
4. Verify student has enrollment data

**If UI looks broken:**
1. Check React Native version compatibility
2. Clear app cache: `expo start --clear`
3. Check screen dimensions for overflow issues

---

## Success Criteria

✅ Feature accessible from:
- Home screen quick actions
- Bottom navigation "Điểm" tab

✅ Displays:
- Overall GPA
- Grades by semester
- Score for each subject
- Grade components
- Grade status/label

✅ Functionality:
- Refresh data
- View details
- Handle errors
- Show empty states

✅ UX Quality:
- Vietnamese labels
- Color-coded feedback
- Responsive interactions
- Professional styling
