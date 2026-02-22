# 💬 Phase 3: Student Feedback & Comments System

## Overview
Đã hoàn thành **Phase 3** của hệ thống Feedback: **Anonymous Student Feedback & Comments** 

Chức năng cho phép sinh viên đánh giá các lớp học của mình một cách ẩn danh với:
- ⭐ Star rating (1-5 sao)
- 💬 Comment có độ dài giới hạn
- 🔍 Chi tiết tiêu chí đánh giá (tùy chọn)
- 🔒 Ẩn danh hoàn toàn
- ✅ Validation: sinh viên chỉ được đánh giá lớp của mình

---

## Backend Implementation

### 1. Feedback Model
**File**: `backend-api/src/models/feedback.model.js` (~90 lines)

**Schema Fields**:
- `classSection`: Reference to class being evaluated
- `submittedBy`: Student ID (null if anonymous)
- `isAnonymous`: Boolean flag (default: true)
- `rating`: 1-5 stars (required)
- `comment`: Text feedback (max 1000 chars)
- `criteria`: Object with optional ratings:
  - teachingQuality
  - courseContent
  - classEnvironment
  - materialQuality
- `status`: pending/approved/rejected
- `submissionIp`: IP address for security
- `submissionUserAgent`: Browser info

**Indexes**:
- Composite on classSection + submittedBy + createdAt
- On classSection + status

### 2. Feedback Service
**File**: `backend-api/src/services/feedback.service.js` (~320 lines)

**Methods**:
- `validateStudentInClass()`: Check enrollment
- `createFeedback()`: Create new feedback with validation
- `getFeedbackByClass()`: List feedbacks for a class
- `getClassFeedbackStats()`: Calculate stats (average, distribution, sentiment)
- `getStudentFeedback()`: Get student's own feedbacks
- `approveFeedback()`: Approve pending feedback
- `rejectFeedback()`: Reject with reason
- `deleteFeedback()`: Admin delete
- `getPendingFeedback()`: Get all pending for moderation

**Key Logic**:
- Validate student is enrolled in class
- Prevent duplicate submissions (one per student per class)
- Normalize data (trim, validate rating range)
- Calculate statistics: average rating, distribution, sentiment analysis

### 3. Feedback Controller
**File**: `backend-api/src/controllers/feedback.controller.js` (~240 lines)

**Endpoints & Actions**:
- `submitFeedback()`: POST /feedbacks - Create feedback
- `getClassFeedback()`: GET /feedbacks/class/:classSectionId - Get class feedbacks
- `getClassFeedbackStats()`: GET /feedbacks/class/:classSectionId/stats - Get stats
- `getMyFeedback()`: GET /feedbacks/my-feedbacks - Student's feedbacks
- `approveFeedback()`: PATCH /feedbacks/:id/approve - Admin approve
- `rejectFeedback()`: PATCH /feedbacks/:id/reject - Admin reject
- `deleteFeedback()`: DELETE /feedbacks/:id - Admin delete
- `getPendingFeedback()`: GET /feedbacks/pending - Get pending items

**Validation**:
- Rating: 1-5 integer
- Comment: max 1000 chars
- ClassSection required
- Authentication required for student endpoints

### 4. Feedback Routes
**File**: `backend-api/src/routes/feedback.routes.js` (~50 lines)

**Endpoints**:
```
POST   /feedbacks                             - Student submit (auth, student role)
GET    /feedbacks/class/:classSectionId      - Get class feedbacks (public)
GET    /feedbacks/class/:classSectionId/stats - Get stats (public)
GET    /feedbacks/my-feedbacks               - Student's own (auth, student)
PATCH  /feedbacks/:id/approve                - Approve (auth, admin/staff)
PATCH  /feedbacks/:id/reject                 - Reject (auth, admin/staff)
DELETE /feedbacks/:id                         - Delete (auth, admin/staff)
GET    /feedbacks/pending                    - Pending list (auth, admin/staff)
```

### 5. Backend Integration
**File**: `backend-api/src/index.js` (MODIFIED)

Added route:
```javascript
app.use('/api/feedbacks', require('./routes/feedback.routes'));
```

---

## Frontend Implementation

### 1. Feedback Service
**File**: `frontend-web/src/services/feedbackService.js` (~60 lines)

**Methods**:
- `submitFeedback()`: POST /feedbacks
- `getClassFeedback()`: GET /feedbacks/class/:id
- `getClassFeedbackStats()`: GET /feedbacks/class/:id/stats
- `getMyFeedback()`: GET /feedbacks/my-feedbacks
- `approveFeedback()`: PATCH /feedbacks/:id/approve
- `rejectFeedback()`: PATCH /feedbacks/:id/reject
- `deleteFeedback()`: DELETE /feedbacks/:id
- `getPendingFeedback()`: GET /feedbacks/pending

### 2. Feedback Form Component
**File**: `frontend-web/src/components/features/FeedbackForm.jsx` (~280 lines)

**Features**:
- ⭐ **Interactive Star Rating**: 5 stars with hover effects
- **Detailed Criteria**: Optional ratings for 4 categories
- **Comment Box**: Max 1000 character input
- **Anonymous Toggle**: Checkbox to submit anonymously
- **Loading States**: Shows feedback submission status
- **Success Modal**: Displays confirmation message
- **Form Validation**: Ensures rating is selected

**UI Components**:
- Dynamic star renderer function
- Character counter for comments
- Category rating selector
- Anonymous toggle checkbox
- Submit/Cancel buttons

### 3. Class Feedback Display Component
**File**: `frontend-web/src/components/features/ClassFeedbackDisplay.jsx` (~380 lines)

**Features**:
- 📊 **Statistics Cards**: Total, average rating, sentiment, top rating
- **Rating Distribution**: Bar chart showing rating breakdown
- **Feedback List**: Shows all approved feedbacks
- **Filter by Rating**: Filter feedbacks by star rating
- **Anonymous Display**: Shows "👤 Ẩn danh" instead of name
- **Detailed View**: Shows criteria details when available
- **Add Feedback Button**: Opens feedback form modal

**Display Elements**:
- Statistics summary cards
- Bar chart for rating distribution
- Filterable feedback list
- Star display for each rating
- Timestamp for each feedback
- Modal form integration

### 4. Student Feedback Page
**File**: `frontend-web/src/pages/student/StudentFeedbackPage.jsx` (~180 lines)

**Layout**:
- Left sidebar: Class list with scroll
- Main area: Class info header + feedback display
- Responsive design (stacks on mobile)

**Features**:
- Load enrolled classes
- Select class to view
- Show class details (code, name, teacher, room, semester)
- Display feedback for selected class
- Integrated feedback form

### 5. Frontend Integration
**File**: `frontend-web/src/App.jsx` (MODIFIED)

Changes:
- Added import: `import StudentFeedbackPage from './pages/student/StudentFeedbackPage';`
- Added route: `<Route path="feedback" element={<StudentFeedbackPage />} />`

---

## API Endpoints

### Student Actions
```
POST /api/feedbacks
{
  "classSection": "class-id",
  "rating": 5,
  "comment": "Great class!",
  "criteria": {
    "teachingQuality": 5,
    "courseContent": 4,
    "classEnvironment": 5,
    "materialQuality": 4
  },
  "isAnonymous": true
}

GET /api/feedbacks/class/{classSectionId}
GET /api/feedbacks/class/{classSectionId}/stats
GET /api/feedbacks/my-feedbacks
```

### Admin Actions
```
GET /api/feedbacks/pending?limit=20&skip=0
PATCH /api/feedbacks/{feedbackId}/approve
PATCH /api/feedbacks/{feedbackId}/reject
  { "reason": "Inappropriate content" }
DELETE /api/feedbacks/{feedbackId}
```

---

## Data Flow

```
┌──────────────────────────┐
│ Student Visits Feedback  │
│      /student/feedback   │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ Load Enrolled Classes    │
│ GET /classes/my-classes  │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ Select Class             │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ Load Class Feedbacks     │
│ GET /feedbacks/class/:id │
│ GET /feedbacks/class/:id/stats
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ Display Stats & Feedback │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ Student Submits Feedback │
│ POST /feedbacks          │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ Validate Enrollment      │
│ Prevent Duplicates       │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ Save to MongoDB          │
│ feedbacks collection     │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ Show Success Modal       │
│ Refresh Feedback List    │
└──────────────────────────┘
```

---

## Key Features

✅ **Star Rating Interface**: 5-star rating with hover preview
✅ **Detailed Criteria**: Optional ratings for 4 different aspects
✅ **Anonymous Submission**: Toggle to submit without revealing identity
✅ **Validation**: Students can only rate their own classes
✅ **Duplicate Prevention**: One feedback per student per class
✅ **Moderation Queue**: Pending feedbacks for admin review
✅ **Statistics**: Average rating, distribution, sentiment analysis
✅ **Comment Display**: Show up to 1000 character comments
✅ **Filtering**: Filter feedbacks by rating level
✅ **Responsive Design**: Works on mobile, tablet, desktop

---

## Security & Permissions

- ✅ Only authenticated students can submit feedback
- ✅ Students can only rate their enrolled classes
- ✅ Cannot submit multiple feedbacks for same class
- ✅ Admin can approve/reject/delete feedbacks
- ✅ Anonymous submissions don't expose student identity
- ✅ IP and user agent logged for security
- ✅ Validation on both frontend and backend

---

## Usage

### For Students

1. **Navigate to Feedback Section**
   - URL: `/student/feedback`
   - Or menu item: "Đánh giá Lớp Học"

2. **Select Class**
   - Choose from left sidebar list
   - View class details (teacher, room, etc.)

3. **Submit Feedback**
   - Click "Thêm Đánh giá" button
   - Fill star rating (required)
   - Add comment (optional)
   - Rate criteria (optional)
   - Check anonymous checkbox if desired
   - Click "Gửi Đánh giá"

4. **View Class Feedback**
   - See all approved feedbacks
   - View statistics (average, distribution)
   - Filter by rating level

### For Admin

1. **Review Pending Feedback**
   - Navigate to admin panel
   - Check pending feedbacks queue

2. **Action Items**
   - Approve: Click approve button
   - Reject: Provide rejection reason
   - Delete: Remove inappropriate content

---

## Example API Responses

### Submit Feedback Response
```json
{
  "success": true,
  "message": "Feedback submitted successfully",
  "data": {
    "_id": "feedback-123",
    "classSection": "class-456",
    "submittedBy": null,
    "isAnonymous": true,
    "rating": 5,
    "comment": "Great class",
    "status": "pending",
    "createdAt": "2024-02-22T10:00:00Z"
  }
}
```

### Get Class Statistics Response
```json
{
  "success": true,
  "data": {
    "totalFeedback": 45,
    "averageRating": 4.5,
    "ratingDistribution": {
      "5": 25,
      "4": 15,
      "3": 4,
      "2": 1,
      "1": 0
    },
    "criteriaAverages": {
      "teachingQuality": 4.6,
      "courseContent": 4.4,
      "classEnvironment": 4.5,
      "materialQuality": 4.3
    },
    "sentiment": "Excellent"
  }
}
```

---

## File Summary

| File | Type | Lines | Status |
|------|------|-------|--------|
| feedback.model.js | Backend | 90 | ✅ New |
| feedback.service.js | Backend | 320 | ✅ New |
| feedback.controller.js | Backend | 240 | ✅ New |
| feedback.routes.js | Backend | 50 | ✅ New |
| index.js | Backend | (modified) | ✅ Updated |
| feedbackService.js | Frontend | 60 | ✅ New |
| FeedbackForm.jsx | Frontend | 280 | ✅ New |
| ClassFeedbackDisplay.jsx | Frontend | 380 | ✅ New |
| StudentFeedbackPage.jsx | Frontend | 180 | ✅ New |
| App.jsx | Frontend | (modified) | ✅ Updated |

**Total New Code**: ~1,600 lines

---

## Testing Checklist

- [ ] Student can submit feedback for enrolled class
- [ ] Cannot submit duplicate feedback
- [ ] Cannot rate non-enrolled class (401)
- [ ] Star rating works smoothly
- [ ] Optional criteria ratings display
- [ ] Anonymous toggle works
- [ ] Comment character counter works
- [ ] Statistics calculate correctly
- [ ] Feedbacks display in list
- [ ] Filter by rating works
- [ ] Admin can approve/reject/delete
- [ ] Pending queue shows new feedbacks

---

## Installation

### Backend
The routes are automatically registered in `index.js`. No additional setup needed.

### Frontend
No new dependencies required. Uses existing axiosClient.

---

## Status
🟢 **READY FOR TESTING**

- Backend: ✅ Complete
- Frontend: ✅ Complete
- Integration: ✅ Complete
- Documentation: ✅ Complete
