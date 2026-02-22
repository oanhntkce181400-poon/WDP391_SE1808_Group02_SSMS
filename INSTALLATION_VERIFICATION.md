# 🔧 Phase 2 Installation & Verification Guide

## ⚡ Quick Installation (5 Steps)

### Step 1: Install Recharts Package
```bash
# Navigate to frontend directory
cd frontend-web

# Install recharts for chart visualizations
npm install recharts

# Verify installation
npm list recharts
```

### Step 2: Backend Verification
Run this to confirm routes are registered in `backend-api/src/index.js`:

```bash
# Should see both lines:
# app.use('/api/feedback-submissions', require('./routes/feedbackSubmission.routes'));
# app.use('/api/feedback-statistics', require('./routes/feedbackStatistics.routes'));

grep -n "feedback-submissions\|feedback-statistics" backend-api/src/index.js
```

**Expected output:**
```
Located at line 48-49 in index.js
✓ Routes registered
```

### Step 3: Frontend Route Verification
Check `frontend-web/src/App.jsx` has the route:

```bash
# Should contain:
# import FeedbackStatisticsPage from './pages/admin/FeedbackStatisticsPage';
# <Route path="feedback-statistics" element={<FeedbackStatisticsPage />} />

grep -n "FeedbackStatisticsPage\|feedback-statistics" frontend-web/src/App.jsx
```

**Expected output:**
```
Line 27: import FeedbackStatisticsPage
Line 61: Route path="feedback-statistics"
✓ Route registered
```

### Step 4: Navigation Menu Verification
Check `frontend-web/src/components/layout/Header.jsx` has menu item:

```bash
# Should contain:
# { label: 'Thống kê Đánh giá', href: '/admin/feedback-statistics' }

grep -n "Thống kê Đánh giá" frontend-web/src/components/layout/Header.jsx
```

**Expected output:**
```
Line 61: { label: 'Thống kê Đánh giá', href: '/admin/feedback-statistics' },
✓ Menu item added
```

### Step 5: Start Services
```bash
# Terminal 1: Start Backend
cd backend-api
npm start
# Expected: Server running on port 3000

# Terminal 2: Start Frontend
cd frontend-web
npm run dev
# Expected: Vite server on port 5173
```

---

## ✅ Installation Checklist

- [ ] **Recharts installed**: Run `npm list recharts` to verify
- [ ] **Backend routes**: Check index.js has 2 new route imports
- [ ] **Frontend route**: Check App.jsx has feedback-statistics route
- [ ] **Menu item**: Check Header.jsx has "Thống kê Đánh giá"
- [ ] **Backend running**: http://localhost:3000/health returns `{"status":"ok"}`
- [ ] **Frontend running**: http://localhost:5173 loads without errors
- [ ] **Can navigate**: Click "Thống kê Đánh giá" menu loads statistics page

---

## 🧪 Testing the Implementation

### Manual Test 1: Create Feedback Template
```bash
curl -X POST http://localhost:3000/api/feedback-templates \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "templateName": "Test Template 2024",
    "description": "Test feedback template",
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
      }
    ]
  }'
```

### Manual Test 2: Submit Feedback
```bash
curl -X POST http://localhost:3000/api/feedback-submissions \
  -H "Authorization: Bearer <student-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "feedbackTemplateId": "template-id-from-step-1",
    "evaluatedEntityId": "teacher-id-123",
    "evaluationType": "teacher",
    "responses": [
      {
        "questionId": "question-id",
        "questionText": "Giáo viên giải thích kỹ lưỡng?",
        "questionType": "rating",
        "answer": "5"
      }
    ]
  }'
```

### Manual Test 3: View Statistics Dashboard
1. Open browser: `http://localhost:5173/admin/feedback-statistics`
2. Should see empty dashboard (no data yet)
3. After submitting feedback, refresh
4. Should see data in Overview tab

### Manual Test 4: Check Top Teachers
```bash
curl -X GET http://localhost:3000/api/feedback-statistics/teachers/top?limit=10 \
  -H "Authorization: Bearer <admin-token>"
```

**Expected response:**
```json
{
  "success": true,
  "data": [
    {
      "teacherId": "...",
      "gpa": 4.5,
      "totalFeedback": 10,
      "satisfactionCount": 9
    }
  ]
}
```

---

## 🐛 Troubleshooting Common Issues

### Issue: "Cannot find module 'recharts'"
```bash
# Solution: Install recharts
cd frontend-web
npm install recharts
npm start
```

### Issue: Routes return 404
```bash
# Solution: Check backend has routes registered
1. Check backend-api/src/index.js line 48-49
2. Restart backend server
3. Test with: curl http://localhost:3000/api/feedback-submissions/test/statistics
```

### Issue: Dashboard shows no data
```bash
# Solution: Check database has submissions
1. Make sure feedback template is created
2. Submit at least one feedback via API or form
3. Check MongoDB: db.feedbackSubmissions.find()
```

### Issue: Charts not rendering
```bash
# Solution: Check Recharts installation
1. Verify: npm list recharts
2. Check browser console for errors (F12)
3. Clear cache: rm -rf node_modules/.vite
4. Restart dev server: npm run dev
```

### Issue: Authentication errors (401)
```bash
# Solution: Use valid JWT token
1. Login with admin/staff account first
2. Get JWT token from localStorage
3. Use in Authorization header: Bearer <token>
```

---

## 📊 Expected Directory Structure After Setup

```
Project Root/
├── backend-api/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── feedbackSubmission.controller.js     ✓ NEW
│   │   │   ├── feedbackStatistics.controller.js     ✓ NEW
│   │   │   └── ...
│   │   ├── routes/
│   │   │   ├── feedbackSubmission.routes.js         ✓ NEW
│   │   │   ├── feedbackStatistics.routes.js         ✓ NEW
│   │   │   └── ...
│   │   ├── services/
│   │   │   ├── feedbackStatistics.service.js        ✓ NEW
│   │   │   └── ...
│   │   └── index.js                                  ✓ MODIFIED
│   └── package.json
│
├── frontend-web/
│   ├── src/
│   │   ├── services/
│   │   │   ├── feedbackStatisticsService.js         ✓ NEW
│   │   │   └── ...
│   │   ├── pages/admin/
│   │   │   ├── FeedbackStatisticsPage.jsx           ✓ NEW
│   │   │   └── ...
│   │   ├── components/features/
│   │   │   ├── FeedbackStatisticsDashboard.jsx      ✓ NEW
│   │   │   ├── StudentFeedbackForm.jsx              ✓ NEW
│   │   │   └── ...
│   │   ├── App.jsx                                   ✓ MODIFIED
│   │   └── components/layout/
│   │       └── Header.jsx                            ✓ MODIFIED
│   ├── node_modules/
│   │   ├── recharts/                                 ✓ NEW (after npm install)
│   │   └── ...
│   └── package.json                                  (recharts added after install)
│
└── Documentation/
    ├── FEEDBACK_STATISTICS_IMPLEMENTATION.md         ✓ NEW
    ├── FEEDBACK_STATISTICS_QUICK_START.md            ✓ NEW
    ├── PHASE_2_SUMMARY.md                            ✓ NEW
    └── INSTALLATION_VERIFICATION.md                  ✓ THIS FILE
```

---

## 🚀 Quick Start Commands

```bash
# Clone and setup
cd d:\Ky\ 8\WDP301\New_Project\...\WDP391_SE1808_Group02_SSMS

# Install Recharts
cd frontend-web
npm install recharts

# Start both services (in separate terminals)
# Terminal 1:
cd backend-api
npm start

# Terminal 2:
cd frontend-web
npm run dev

# Access Dashboard
open http://localhost:5173/admin/feedback-statistics
```

---

## 📈 Performance Benchmarks

| Action | Expected Time | Status |
|--------|---|---------|
| Load dashboard with 100 submissions | < 1s | ✅ Expected |
| Render pie chart with 5 categories | < 500ms | ✅ Expected |
| Render teacher comparison bar chart | < 800ms | ✅ Expected |
| Load date range trends (30 days) | < 1.5s | ✅ Expected |
| Calculate teacher GPA | < 100ms | ✅ Expected |

---

## 🔐 Security Verification

- [x] JWT authentication on all endpoints
- [x] Role-based access (admin/staff/academicAdmin only)
- [x] Students can only submit once per template
- [x] No sensitive data in error messages
- [x] Date validation prevents invalid submissions
- [x] Duplicate submission prevention

---

## 🎯 Final Checklist Before Going Live

- [ ] Recharts installed and working
- [ ] Dashboard loads without errors
- [ ] Can create feedback templates
- [ ] Can submit feedback as student
- [ ] Statistics calculate correctly
- [ ] Charts render with data
- [ ] All tabs work (Overview, Template, Teachers, Trends)
- [ ] Date range filtering works
- [ ] Error messages display properly
- [ ] Mobile responsiveness verified
- [ ] Performance tested with 100+ records

---

## 📞 Support Resources

**Technical Questions:**
- See `FEEDBACK_STATISTICS_IMPLEMENTATION.md` for detailed architecture
- See `FEEDBACK_STATISTICS_QUICK_START.md` for usage guide

**API Testing:**
- Use Postman collection: `API_REQUESTS.postman_collection.json` (create separately)
- Or use curl examples in `MANUAL_TESTING.md` (create separately)

**Common Issues:**
- See **Troubleshooting** section above
- Check browser console (F12) for client-side errors
- Check backend logs for server errors

---

## ✨ You're All Set!

Phase 2 implementation is complete. Follow these verification steps to ensure everything works correctly.

**Status**: 🟢 READY FOR INSTALLATION & TESTING

---

*Last Updated: 2024*
*Version: 1.0*
*Installation Time: ~10 minutes (including npm install)*
