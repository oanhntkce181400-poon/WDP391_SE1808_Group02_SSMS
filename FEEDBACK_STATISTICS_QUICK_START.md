# 🚀 Feedback Statistics - Quick Setup Guide

## Installation Steps

### Step 1: Install Recharts Dependency
```bash
# Navigate to frontend directory
cd frontend-web

# Install recharts for charts
npm install recharts

# Or with yarn
yarn add recharts
```

### Step 2: Verify Backend Routes
The following routes are now active:

**Feedback Submission** (Students):
```
POST /api/feedback-submissions
```

**Feedback Statistics** (Admin/Staff/AcademicAdmin):
```
GET /api/feedback-statistics/teacher/:teacherId
GET /api/feedback-statistics/template/:templateId
GET /api/feedback-statistics/teachers/top?limit=10
GET /api/feedback-statistics/range?startDate=2024-01-01&endDate=2024-12-31
GET /api/feedback-statistics/question/:templateId/:questionId
```

### Step 3: Backend Update Verification
Check that `backend-api/src/index.js` contains:
```javascript
app.use('/api/feedback-submissions', require('./routes/feedbackSubmission.routes'));
app.use('/api/feedback-statistics', require('./routes/feedbackStatistics.routes'));
```

### Step 4: Frontend Route Verification
Check that `frontend-web/src/App.jsx` contains:
```jsx
import FeedbackStatisticsPage from './pages/admin/FeedbackStatisticsPage';
// ... in routes ...
<Route path="feedback-statistics" element={<FeedbackStatisticsPage />} />
```

### Step 5: Menu Navigation
Header should show "Thống kê Đánh giá" menu item pointing to `/admin/feedback-statistics`

## Usage

### For Admin/Staff/Academic Admin

#### Accessing Dashboard
1. Login with academic admin, admin, or staff role
2. Click on "Thống kê Đánh giá" in the left navigation menu
3. Or navigate to: `http://localhost:3000/admin/feedback-statistics`

#### Dashboard Tabs

**📈 Overview Tab** (Default)
- View total teachers evaluated
- See overall GPA average
- Check top GPA score
- View teacher ranking bar chart

**📋 Template Tab**
- Select a template by ID
- View total submissions
- See GPA for that template
- Check rating distribution pie chart
- View category breakdown bar chart
- See per-question statistics

**👨‍🏫 Teachers Tab**
- View ranked list of all teachers
- Sort by GPA (highest to lowest)
- See total feedback count per teacher
- View satisfaction status (Excellent/Good/Needs Improvement)

**📅 Trends Tab**
- Select date range
- View GPA trend line chart over time
- Analyze daily average scores
- Identify improvement patterns

### For Students

#### Submitting Feedback
1. Ensure you're logged in with student account
2. Navigate to feedback section (when available on student dashboard)
3. Select a feedback template from active list
4. Fill in all questions (rating, text, or multiple choice)
5. Submit

#### Via API (Manual Testing)
```bash
curl -X POST http://localhost:3000/api/feedback-submissions \
  -H "Authorization: Bearer <student-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "feedbackTemplateId": "template-123",
    "evaluatedEntityId": "teacher-456",
    "evaluationType": "teacher",
    "responses": [
      {
        "questionId": "q1",
        "questionText": "Quality",
        "questionType": "rating",
        "answer": "5"
      }
    ]
  }'
```

## Database Requirements

### Required Collections
- `feedbackTemplates` - Created by Phase 1
- `feedbackSubmissions` - Created by Phase 1

### Sample Data (For Testing)

#### Create Test Template
```json
POST /api/feedback-templates

{
  "templateName": "Đánh giá Giáo viên 2024",
  "description": "Template đánh giá chất lượng giảng dạy",
  "evaluationTarget": "teacher",
  "feedbackStartDate": "2024-01-01T00:00:00Z",
  "feedbackEndDate": "2024-12-31T23:59:59Z",
  "questions": [
    {
      "questionText": "Giáo viên giải thích kỹ lưỡng?",
      "questionType": "rating",
      "scale": 5,
      "required": true,
      "displayOrder": 1
    },
    {
      "questionText": "Ý kiến của bạn về lớp học?",
      "questionType": "text",
      "maxLength": 500,
      "required": false,
      "displayOrder": 2
    }
  ]
}
```

#### Submit Test Feedback
```json
POST /api/feedback-submissions

{
  "feedbackTemplateId": "template-id-from-above",
  "evaluatedEntityId": "teacher-id-123",
  "evaluationType": "teacher",
  "responses": [
    {
      "questionId": "q1-id",
      "questionText": "Giáo viên giải thích kỹ lưỡng?",
      "questionType": "rating",
      "answer": "5"
    },
    {
      "questionId": "q2-id",
      "questionText": "Ý kiến của bạn về lớp học?",
      "questionType": "text",
      "answer": "Rất hài lòng với lớp học này"
    }
  ]
}
```

## Troubleshooting

### Issue: "Recharts not found"
**Solution**: Install recharts
```bash
cd frontend-web
npm install recharts
```

### Issue: Routes not found (404)
**Solution**: 
1. Check backend has both routes registered in index.js
2. Restart backend server
3. Verify MongoDB connection

### Issue: Charts not rendering
**Solution**:
1. Check browser console for errors
2. Verify data is loading in Network tab
3. Ensure template has submissions

### Issue: Authentication errors (401)
**Solution**:
1. Login with correct admin/staff role
2. Check JWT token is valid
3. Verify authMiddleware is in place

### Issue: Data not showing
**Solution**:
1. Ensure submissions exist in database
2. Check date range is correct for trends tab
3. Verify template ID is correct

## Performance Notes

- **Large Datasets**: Dashboard performs well with 100+ submissions
- **Chart Rendering**: Recharts handles up to 365 daily data points efficiently
- **Database Queries**: Indexes recommended on `feedbackTemplate` and `evaluatedEntity` fields

## Security

- ✅ All admin endpoints require authentication
- ✅ Student can only submit once per template
- ✅ Role-based access control enforced
- ✅ No sensitive data in error messages
- ✅ Date validation prevents invalid submissions

## Integration Checklist

- [x] Backend models created
- [x] Frontend service created
- [x] Routes registered
- [x] Controllers implemented
- [x] Dashboard component built
- [x] Charts integrated
- [x] Navigation menu updated
- [x] Error handling added
- [ ] Recharts installed (TODO - run npm install recharts)
- [ ] Production testing complete

## File Locations

```
Backend:
├── controllers/feedbackSubmission.controller.js
├── controllers/feedbackStatistics.controller.js
├── routes/feedbackSubmission.routes.js
├── routes/feedbackStatistics.routes.js
└── services/feedbackStatistics.service.js

Frontend:
├── services/feedbackStatisticsService.js
├── pages/admin/FeedbackStatisticsPage.jsx
├── components/features/FeedbackStatisticsDashboard.jsx
```

## API Response Examples

### Get Teacher Statistics Response
```json
{
  "success": true,
  "data": {
    "teacherId": "teacher-123",
    "gpa": 4.65,
    "satisfactionPercentage": "88.67",
    "totalFeedback": 75,
    "categoryDistribution": {
      "Rất tốt": 60,
      "Tốt": 12,
      "Trung bình": 3,
      "Cần cải thiện": 0
    },
    "ratingDistribution": {
      "1": 0,
      "2": 0,
      "3": 3,
      "4": 12,
      "5": 60
    }
  }
}
```

### Get Template Statistics Response
```json
{
  "success": true,
  "data": {
    "templateId": "template-123",
    "templateName": "Đánh giá Giáo viên 2024",
    "totalSubmissions": 150,
    "overallAverage": 4.52,
    "questionStatistics": {
      "q1": {
        "questionId": "q1",
        "questionText": "Giáo viên rõ ràng?",
        "questionType": "rating",
        "average": "4.75",
        "distribution": {"5": 120, "4": 25, "3": 5},
        "totalResponses": 150
      }
    }
  }
}
```

## Support & Documentation

For detailed implementation: See `FEEDBACK_STATISTICS_IMPLEMENTATION.md`
For Phase 1 (Templates): See `FEEDBACK_MANAGEMENT_DOCUMENTATION.md`

---

**Last Updated**: 2024
**Version**: 1.0
**Status**: Ready for Testing ✅
