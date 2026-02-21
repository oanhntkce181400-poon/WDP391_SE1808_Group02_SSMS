# API Documentation - Exam Scheduling

## Base URL
```
http://localhost:3000/api/exams
```

## Authentication
All endpoints require JWT token in Authorization header:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## Endpoints

### 1. Get Student's Exam Schedule (for Students)

#### Request
```
GET /me
```

#### Headers
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "examCode": "EXAM001",
      "subject": {
        "_id": "507f1f77bcf86cd799439001",
        "subjectCode": "PRJ301",
        "subjectName": "Professional Project",
        "credits": 4
      },
      "classSection": {
        "_id": "507f1f77bcf86cd799439002",
        "classCode": "CE17A1",
        "className": "CE17A1 - PRJ301"
      },
      "room": {
        "_id": "507f1f77bcf86cd799439003",
        "roomCode": "A502",
        "roomName": "Lab A5.02",
        "capacity": 30,
        "roomType": "Lab"
      },
      "slot": {
        "_id": "507f1f77bcf86cd799439004",
        "groupName": "Group 1",
        "startTime": "08:00",
        "endTime": "09:30"
      },
      "examDate": "2026-02-28T00:00:00.000Z",
      "startTime": "08:00",
      "endTime": "09:30",
      "examRules": "Quy chế thi tiêu chuẩn",
      "notes": "Mang theo CMND và laptop",
      "status": "scheduled",
      "sbd": "CE181001",
      "seatNumber": "A1",
      "registrationStatus": "registered",
      "registrationDate": "2026-01-15T10:30:00.000Z"
    }
  ],
  "total": 1
}
```

#### Response (404 Not Found)
```json
{
  "success": false,
  "message": "Student record not found"
}
```

---

### 2. Get Exam Details

#### Request
```
GET /:examId
```

#### Headers
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "examCode": "EXAM001",
    "subject": {...},
    "classSection": {...},
    "room": {...},
    "slot": {...},
    "examDate": "2026-02-28T00:00:00.000Z",
    "startTime": "08:00",
    "endTime": "09:30",
    "examRules": "Quy chế thi tiêu chuẩn",
    "notes": "Mang theo CMND và laptop",
    "status": "scheduled",
    "sbd": "CE181001",
    "seatNumber": "A1",
    "registrationStatus": "registered"
  }
}
```

---

### 3. Create Exam (Admin/Staff only)

#### Request
```
POST /
```

#### Headers
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

#### Request Body
```json
{
  "examCode": "EXAM001",
  "classSection": "507f1f77bcf86cd799439002",
  "subject": "507f1f77bcf86cd799439001",
  "room": "507f1f77bcf86cd799439003",
  "slot": "507f1f77bcf86cd799439004",
  "examDate": "2026-02-28",
  "startTime": "08:00",
  "endTime": "09:30",
  "examRules": "Quy chế thi tiêu chuẩn",
  "notes": "Mang theo CMND và laptop",
  "maxCapacity": 30
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Exam created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "examCode": "EXAM001",
    ...
  }
}
```

---

### 4. Update Exam (Admin/Staff only)

#### Request
```
PATCH /:examId
```

#### Headers
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

#### Request Body (partial update)
```json
{
  "examRules": "Quy chế thi mới",
  "notes": "Thay đổi ghi chú",
  "status": "in-progress"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Exam updated successfully",
  "data": {...}
}
```

---

### 5. Delete Exam (Admin/Staff only)

#### Request
```
DELETE /:examId
```

#### Headers
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Exam deleted successfully"
}
```

---

### 6. Register Student for Exam (Admin/Staff only)

#### Request
```
POST /:examId/register-student
```

#### Headers
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

#### Request Body
```json
{
  "studentId": "507f1f77bcf86cd799439011",
  "sbd": "CE181001",
  "seatNumber": "A1"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Student registered for exam successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439020",
    "exam": "507f1f77bcf86cd799439012",
    "student": "507f1f77bcf86cd799439011",
    "sbd": "CE181001",
    "seatNumber": "A1",
    "status": "registered",
    "registrationDate": "2026-01-15T10:30:00.000Z"
  }
}
```

---

## Data Models

### Exam Model
```javascript
{
  examCode: String (unique, required),
  classSection: ObjectId (ref: ClassSection, required),
  subject: ObjectId (ref: Subject, required),
  room: ObjectId (ref: Room, required),
  slot: ObjectId (ref: Timeslot, required),
  examDate: Date (required),
  startTime: String (HH:mm format, required),
  endTime: String (HH:mm format, required),
  examRules: String,
  notes: String,
  maxCapacity: Number (required),
  registeredStudents: Number,
  status: String (enum: 'scheduled', 'in-progress', 'completed', 'cancelled'),
  createdAt: Date,
  updatedAt: Date
}
```

### StudentExam Model
```javascript
{
  exam: ObjectId (ref: Exam, required),
  student: ObjectId (ref: Student, required),
  sbd: String (Số báo danh, required),
  seatNumber: String,
  status: String (enum: 'registered', 'attended', 'absent', 'cancelled'),
  registrationDate: Date,
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

### ClassSection Model
```javascript
{
  classCode: String (unique, required),
  className: String (required),
  subject: ObjectId (ref: Subject, required),
  teacher: ObjectId (ref: Teacher, required),
  room: ObjectId (ref: Room, required),
  timeslot: ObjectId (ref: Timeslot, required),
  semester: Number (required),
  academicYear: String (required),
  maxCapacity: Number (required),
  currentEnrollment: Number,
  status: String (enum: 'active', 'cancelled', 'completed'),
  createdAt: Date,
  updatedAt: Date
}
```

### ClassEnrollment Model
```javascript
{
  classSection: ObjectId (ref: ClassSection, required),
  student: ObjectId (ref: Student, required),
  enrollmentDate: Date,
  status: String (enum: 'enrolled', 'dropped', 'completed'),
  grade: Number (0-10),
  createdAt: Date,
  updatedAt: Date
}
```

---

## Key Features

### For Students:
1. **View Exam Schedule** - GET /me
   - Shows only exams for classes they've enrolled in
   - Displays: Room, Time slot, SBD, Exam rules
   - Filters by exam status (scheduled, in-progress, completed, cancelled)

2. **View Exam Details** - GET /:examId
   - Complete information about specific exam
   - Includes seat number and exam rules

### For Admin/Staff:
1. **Create Exams** - POST /
   - Assign exams to class sections
   - Set exam date, time, room, capacity

2. **Register Students** - POST /:examId/register-student
   - Assign SBD (Số báo danh) and seat numbers
   - Batch registration support

3. **Update/Delete Exams** - PATCH, DELETE
   - Modify exam details
   - Cancel exams if needed

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Missing required fields"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Exam not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to get exam schedule",
  "error": "error details"
}
```

---

## Usage Examples

### JavaScript/Fetch
```javascript
// Get student's exam schedule
const response = await fetch('http://localhost:3000/api/exams/me', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
const data = await response.json();
console.log(data.data); // Array of exams
```

### React
```javascript
import examService from './services/examService';

const MyExams = () => {
  const [exams, setExams] = useState([]);

  useEffect(() => {
    examService.getMyExams()
      .then(res => setExams(res.data.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      {exams.map(exam => (
        <div key={exam._id}>
          <h3>{exam.subject.subjectName}</h3>
          <p>📅 {exam.examDate}</p>
          <p>🏠 {exam.room.roomCode}</p>
          <p>🔢 SBD: {exam.sbd}</p>
        </div>
      ))}
    </div>
  );
};
```

---

## Integration Notes

1. **Frontend Routing** - Add route `/student/exams` to display ExamSchedulePage
2. **Student Home Integration** - ExamScheduleSummary shows upcoming exams
3. **Admin Panel** - Can manage exams via API endpoints
4. **Database** - Requires MongoDB Atlas or local MongoDB setup

---

**Last updated:** 2026-02-21
