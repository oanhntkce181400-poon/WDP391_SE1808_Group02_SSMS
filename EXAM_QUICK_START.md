# Exam Scheduling Feature - Quick Start Guide

## Overview
This guide helps you test and use the newly implemented "View Exam Scheduling" feature.

---

## Quick Setup

### 1. Start Backend Server
```bash
cd backend-api
npm install  # If not already done
npm run dev  # Start development server
```

The server will run on `http://localhost:3000`

### 2. Start Frontend Server
```bash
cd frontend-web
npm install  # If not already done
npm run dev  # Start development server
```

The frontend will run on `http://localhost:5173`

### 3. Database Preparation
Ensure MongoDB is running locally or Atlas connection is configured.

---

## Testing the Feature

### For Students:

#### 1. Login as Student
- Go to `http://localhost:5173`
- Login with student credentials
- Dashboard shows exam summary in "Lịch thi của tôi" section

#### 2. View Exam Schedule
- Click "Lịch thi & Địa điểm" link on dashboard
- Or navigate to `/student/exams`
- Page displays:
  - Statistics (Total exams, Upcoming, Completed)
  - Filter buttons by status
  - Exam cards with details:
    - Subject name and code
    - Date and time
    - Room code
    - SBD (Số báo danh)
    - Registration status

#### 3. View Exam Details
- Click "Xem Chi Tiết" on any exam card
- Modal shows comprehensive exam information including exam rules

#### 4. Filter Exams
- Use filter buttons to show:
  - All exams
  - Scheduled exams
  - In-progress exams
  - Completed exams
  - Cancelled exams

---

### For Admin/Staff:

#### 1. Create Class Section
```bash
POST /api/classes
Content-Type: application/json
Authorization: Bearer <ADMIN_TOKEN>

{
  "classCode": "CE17A1",
  "className": "CE17A1 - PRJ301",
  "subject": "<subject_id>",
  "teacher": "<teacher_id>",
  "room": "<room_id>",
  "timeslot": "<timeslot_id>",
  "semester": 1,
  "academicYear": "2025-2026",
  "maxCapacity": 30
}
```

#### 2. Enroll Student in Class
```bash
POST /api/classes/enrollment/create
Content-Type: application/json
Authorization: Bearer <ADMIN_TOKEN>

{
  "classId": "<class_id>",
  "studentId": "<student_id>"
}
```

#### 3. Create Exam
```bash
POST /api/exams
Content-Type: application/json
Authorization: Bearer <ADMIN_TOKEN>

{
  "examCode": "EXAM001",
  "classSection": "<class_id>",
  "subject": "<subject_id>",
  "room": "<room_id>",
  "slot": "<timeslot_id>",
  "examDate": "2026-02-28",
  "startTime": "08:00",
  "endTime": "09:30",
  "examRules": "Quy chế thi tiêu chuẩn",
  "notes": "Mang theo CMND",
  "maxCapacity": 30
}
```

#### 4. Register Student for Exam (Assign SBD)
```bash
POST /api/exams/<exam_id>/register-student
Content-Type: application/json
Authorization: Bearer <ADMIN_TOKEN>

{
  "studentId": "<student_id>",
  "sbd": "CE181001",
  "seatNumber": "A1"
}
```

---

## Sample Data Creation (Using curl)

### Create Test Subject
```bash
curl -X POST http://localhost:3000/api/subjects \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "subjectCode": "PRJ301",
    "subjectName": "Professional Project",
    "credits": 4,
    "majorCode": "SE"
  }'
```

### Create Test Teacher
```bash
curl -X POST http://localhost:3000/api/actors/teachers \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "teacherCode": "GV001",
    "fullName": "Dr. Nguyễn Văn A",
    "email": "teacher@example.com",
    "department": "IT"
  }'
```

### Get All Rooms
```bash
curl -X GET http://localhost:3000/api/rooms \
  -H "Authorization: Bearer <TOKEN>"
```

### Get All Timeslots
```bash
curl -X GET http://localhost:3000/api/timeslots \
  -H "Authorization: Bearer <TOKEN>"
```

---

## API Endpoints Reference

### Student Endpoints
```
GET  /api/exams/me              - Get my exam schedule
GET  /api/exams/:examId         - Get exam details
```

### Admin Exam Management
```
POST   /api/exams                       - Create exam
PATCH  /api/exams/:examId               - Update exam
DELETE /api/exams/:examId               - Delete exam
POST   /api/exams/:examId/register-student - Assign SBD
```

### Class Management
```
GET    /api/classes                              - Get all classes
GET    /api/classes/:classId                     - Get class details
GET    /api/classes/:classId/enrollments         - Get class enrollments
POST   /api/classes                              - Create class
PATCH  /api/classes/:classId                     - Update class
DELETE /api/classes/:classId                     - Delete class
POST   /api/classes/enrollment/create            - Enroll student
POST   /api/classes/enrollment/:enrollmentId/drop - Drop course
```

---

## Frontend Components Usage

### In React Components:

```javascript
import examService from '../../services/examService';
import { useEffect, useState } from 'react';

const MyComponent = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    examService.getMyExams()
      .then(response => setExams(response.data.data))
      .catch(error => console.error('Error:', error))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {exams.map(exam => (
        <div key={exam._id}>
          <h3>{exam.subject.subjectName}</h3>
          <p>Date: {exam.examDate}</p>
          <p>Room: {exam.room.roomCode}</p>
          <p>SBD: {exam.sbd}</p>
        </div>
      ))}
    </div>
  );
};

export default MyComponent;
```

---

## Debugging Tips

### 1. Check Backend Logs
```bash
# Terminal running backend server shows:
- API requests
- Database queries
- Error messages
```

### 2. Browser DevTools
- F12 → Network tab: Check API requests
- F12 → Console tab: Check JavaScript errors
- F12 → Application tab: Check localStorage tokens

### 3. Common Issues

**Issue**: "Student record not found"
- Solution: Ensure student email matches user email in database

**Issue**: "No enrolled classes found"
- Solution: Admin must enroll student in classes first

**Issue**: "Unauthorized" (401 error)
- Solution: Check JWT token in localStorage, re-login if expired

**Issue**: "Database connection failed"
- Solution: Verify MongoDB is running and connection string is correct

---

## Performance Tips

1. **Index Queries**: Database queries use indexes for fast lookups
2. **Pagination**: Can be added for large datasets
3. **Caching**: Consider caching exam data for students
4. **Lazy Loading**: Images/data loads on demand

---

## Security Considerations

1. **Authentication**: All endpoints require JWT token
2. **Authorization**: Admin functions restricted to staff/admin roles
3. **Data Validation**: All inputs validated before processing
4. **Error Handling**: Sensitive errors not exposed to users

---

## Screenshots/UI Elements

### Exam Schedule Page
```
┌─────────────────────────────────────────┐
│           📅 Lịch Thi Của Tôi           │
│  Xem lịch thi, phòng thi, SBD và QC thi │
├─────────────────────────────────────────┤
│                                         │
│  Tổng Kỳ Thi: 3  | Sắp Tới: 2  | XL: 1 │
│                                         │
│  [🔍 Tất Cả] [Scheduled] [Completed] ... │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │ PRJ301 - Professional Project    │  │
│  │                                  │  │
│  │ 📅 Thứ Sáu, 28/02/2026          │  │
│  │ ⏰ 08:00 - 09:30                 │  │
│  │ 🏠 A502 - Lab A5.02             │  │
│  │ 🔢 SBD: CE181001                │  │
│  │                                  │  │
│  │ [Xem Chi Tiết →]                │  │
│  └──────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

### Exam Details Modal
```
┌──────────────────────────────────────────────┐
│  Chi Tiết Kỳ Thi                          ✕  │
├──────────────────────────────────────────────┤
│                                              │
│ Môn Học:                                     │
│ ┌────────────────────────────────────────┐  │
│ │ PRJ301 - Professional Project (4 TC)  │  │
│ └────────────────────────────────────────┘  │
│                                              │
│ Ngày Thi: Thứ Sáu, 28/02/2026               │
│ Giờ Thi: 08:00 - 09:30                      │
│                                              │
│ Phòng Thi:                                   │
│ ┌────────────────────────────────────────┐  │
│ │ Mã: A502  |  Tên: Lab A5.02           │  │
│ │ Loại: Lab  |  Sức chứa: 30 người     │  │
│ └────────────────────────────────────────┘  │
│                                              │
│ SBD: CE181001  |  Ghế: A1                   │
│                                              │
│ Quy Chế Thi:                                 │
│ ┌────────────────────────────────────────┐  │
│ │ Quy chế thi tiêu chuẩn                 │  │
│ └────────────────────────────────────────┘  │
│                                              │
│ [Đóng]                                       │
└──────────────────────────────────────────────┘
```

---

## Next Steps

1. ✅ Test student exam viewing
2. ✅ Test admin exam creation
3. ✅ Test student enrollment
4. ✅ Verify SBD assignment
5. ✅ Check error handling
6. ✅ Test page responsiveness
7. ✅ Review security

---

## Support

For issues or questions:
1. Check API documentation: `EXAM_API_DOCUMENTATION.md`
2. Review implementation guide: `EXAM_SCHEDULING_IMPLEMENTATION.md`
3. Check backend logs for errors
4. Verify database connectivity

---

**Happy Testing!** 🎓📅
