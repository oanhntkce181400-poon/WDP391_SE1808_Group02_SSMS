# Exam Scheduling Feature - Architecture & Data Flow

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  StudentHome.jsx        ExamSchedulePage.jsx                   │
│  ├─ Dashboard           ├─ Main exam schedule view             │
│  ├─ Exam summary        ├─ Filter by status                    │
│  └─ Quick links         ├─ Exam cards                          │
│                         ├─ Detailed modal                      │
│                         └─ Statistics                          │
│                                                                 │
│  examService.js         classService.js                        │
│  ├─ getMyExams()        ├─ getAllClasses()                     │
│  ├─ getExamDetails()    ├─ getClassById()                      │
│  ├─ createExam()        ├─ getClassEnrollments()               │
│  └─ registerStudent()   └─ enrollStudent()                     │
│                                                                 │
└──────────────────────────────────────────────────────────────┬─┘
                                                                │
                    HTTP REST API (JWT Auth)                     │
                                                                │
┌──────────────────────────────────────────────────────────────┴─┐
│                      BACKEND (Node.js)                         │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  exam.routes.js          classSection.routes.js              │
│  ├─ GET /me              ├─ POST /                           │
│  ├─ GET /:id             ├─ PATCH /:id                       │
│  ├─ POST /               ├─ GET /:id/enrollments             │
│  ├─ PATCH /:id           └─ POST /enrollment/create          │
│  └─ DELETE /:id                                              │
│                                                                │
│  exam.controller.js      classSection.controller.js          │
│  ├─ getMyExams()         ├─ createClassSection()             │
│  ├─ getExamDetails()     ├─ enrollStudentInClass()           │
│  ├─ createExam()         ├─ dropCourse()                     │
│  └─ registerStudent()    └─ getStudentEnrollments()          │
│                                                                │
│  Middleware:                                                   │
│  ├─ authMiddleware (JWT verification)                         │
│  └─ rbacMiddleware (Role-based access control)               │
│                                                                │
└──────────────────────────────────────────────────────────────┬─┘
                                                                │
                    MongoDB/Mongoose                            │
                                                                │
┌──────────────────────────────────────────────────────────────┴─┐
│                      DATABASE (MongoDB)                        │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Collections:                                                  │
│  │                                                             │
│  ├─ exams (exam schedule)                                     │
│  ├─ studentexams (student exam registrations)                │
│  ├─ classsections (class offerings)                          │
│  ├─ classenrollments (student enrollments)                   │
│  ├─ students (student profiles)                             │
│  ├─ subjects (course subjects)                              │
│  ├─ teachers (teacher profiles)                            │
│  ├─ rooms (classroom information)                          │
│  └─ timeslots (time slot definitions)                      │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### 1. Student Viewing Exam Schedule

```
┌─────────────┐
│   Student   │
│  Login      │
│  Access     │
│  Dashboard  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│ Frontend: StudentHome.jsx       │
│ Render quick exam summary       │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ examService.getMyExams()        │
│ HTTP GET /api/exams/me          │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Backend: exam.controller        │
│ getMyExams()                    │
│                                 │
│ 1. Find Student record          │
│    by email                     │
│                                 │
│ 2. Get ClassEnrollments         │
│    where student enrolled       │
│                                 │
│ 3. Find Exams                   │
│    for those classes            │
│                                 │
│ 4. Get StudentExam records      │
│    (SBD, seat, status)          │
│                                 │
│ 5. Populate all references      │
│                                 │
│ 6. Return complete data         │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ MongoDB Query:                  │
│                                 │
│ Student.findOne({               │
│   email: req.user.email         │
│ })                              │
│                                 │
│ ClassEnrollment.find({          │
│   student: student._id,         │
│   status: 'enrolled'            │
│ })                              │
│                                 │
│ Exam.find({                     │
│   classSection: { $in: [...] }  │
│ }).populate(...)                │
│                                 │
│ StudentExam.findOne({           │
│   exam: exam._id,               │
│   student: student._id          │
│ })                              │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Response: Array of Exams        │
│                                 │
│ [                               │
│   {                             │
│     examCode: "EXAM001",        │
│     subject: {...},             │
│     room: {...},                │
│     examDate: "2026-02-28",     │
│     startTime: "08:00",         │
│     endTime: "09:30",           │
│     sbd: "CE181001",            │
│     registrationStatus: "..."   │
│   }                             │
│ ]                               │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Frontend: ExamSchedulePage      │
│ Display exams in cards          │
│ Filter by status                │
│ Show in modal                   │
│ Student sees schedule!          │
└─────────────────────────────────┘
```

### 2. Admin Creating Exam & Registering Student

```
┌─────────────┐
│   Admin     │
│ /Dashboard  │
│ Create Exam │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────┐
│ Admin Form                   │
│ - Select Class Section       │
│ - Select Subject             │
│ - Select Room                │
│ - Select Timeslot            │
│ - Set Date/Time              │
│ - Set Rules & Notes          │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ examService.createExam()     │
│ HTTP POST /api/exams         │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Backend: exam.controller     │
│ createExam()                 │
│                              │
│ 1. Validate all fields       │
│ 2. Check exam code unique    │
│ 3. Create Exam document      │
│ 4. Save to MongoDB           │
│ 5. Populate references       │
│ 6. Return exam data          │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ MongoDB Insert               │
│                              │
│ db.exams.insertOne({         │
│   examCode: "EXAM001",       │
│   classSection: <id>,        │
│   subject: <id>,             │
│   room: <id>,                │
│   slot: <id>,                │
│   examDate: ISODate(),       │
│   startTime: "08:00",        │
│   endTime: "09:30",          │
│   ...                        │
│ })                           │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Exam Created!                │
│                              │
│ Now register student...      │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Admin Selects:               │
│ - Exam                       │
│ - Student                    │
│ - Assign SBD                 │
│ - Assign Seat                │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ examService.                 │
│   registerStudentForExam()   │
│ HTTP POST /exams/:id/        │
│   register-student           │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Backend:                     │
│ registerStudentForExam()     │
│                              │
│ 1. Verify student exists     │
│ 2. Verify exam exists        │
│ 3. Create/Update StudentExam │
│ 4. Assign SBD               │
│ 5. Assign seat number        │
│ 6. Set status = registered   │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ MongoDB Update/Insert        │
│                              │
│ db.studentexams.findOneAnd   │
│ Update({                     │
│   exam: <id>,                │
│   student: <id>              │
│ }, {                         │
│   sbd: "CE181001",           │
│   seatNumber: "A1",          │
│   status: "registered"       │
│ })                           │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Student Registration Done!   │
│                              │
│ Student can now view:        │
│ - Exam schedule              │
│ - Their SBD                  │
│ - Room and seat info         │
└──────────────────────────────┘
```

### 3. Student Enrollment in Class to Exam

```
┌──────────────┐
│    Admin     │
│ Enroll       │
│ Student in   │
│ Class        │
└────────┬─────┘
         │
         ▼
┌────────────────────────────┐
│ classService.enrollStudent │
│ POST /classes/enrollment   │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ Backend: enrollInClass()   │
│ 1. Check class exists      │
│ 2. Check capacity          │
│ 3. Verify student exists   │
│ 4. Check not already       │
│    enrolled                │
│ 5. Create ClassEnrollment  │
│ 6. Increment enrollment    │
│    counter                 │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ DB: Create Enrollment      │
│ Update Class counter       │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ Student Now:               │
│ - Enrolled in class        │
│ - Shows in class roster    │
│ - Eligible for exam        │
│                            │
│ When exam created/assigned:│
│ - GET /api/exams/me        │
│   returns this exam        │
└────────────────────────────┘
```

---

## Database Relationship Diagram

```
┌─────────────┐              ┌──────────────┐
│   User      │              │   Student    │
│ (email)     │◄─────────────│ (email)      │
│ (password)  │              │ (studentCode)│
│ (role)      │              └──────┬───────┘
└─────────────┘                     │
                                    ▼
                           ┌──────────────────┐
                           │ ClassEnrollment  │
                           │ (status)         │
                           │ (grade)          │
                           └──────┬───────────┘
                                  │
                    ┌─────────────┴──────────────┐
                    ▼                            ▼
            ┌──────────────────┐      ┌──────────────────┐
            │  ClassSection    │      │ StudentExam      │
            │ (classCode)      │      │ (sbd)            │
            │ (maxCapacity)    │      │ (seatNumber)     │
            │ (currentEnroll)  │      │ (status)         │
            └────┬─┬─┬─┬───────┘      └────────┬─────────┘
                 │ │ │ │                       │
     ┌───────────┘ │ │ │                       │
     ▼             ▼ │ │                       ▼
  ┌───────┐  ┌──────────┐              ┌──────────┐
  │Subject│  │ Teacher  │              │   Exam   │
  │ (name)│  │  (name)  │              │ (date)   │
  │(credits)└──────────┘              │(time)    │
  └───────┘                            │(rules)   │
                                       └────┬────┘
                  └────────────────┬─────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                            ▼
                ┌────────┐                    ┌────────┐
                │  Room  │                    │Timeslot│
                └────────┘                    └────────┘
```

---

## Component Hierarchy

```
App.jsx
├── Router
│   └── /student/exams
│       └── ExamSchedulePage
│           ├── Loading State
│           ├── Error State
│           ├── Statistics Cards
│           │   ├── Total Exams
│           │   ├── Upcoming Exams
│           │   └── Completed Exams
│           ├── Filter Buttons
│           ├── ExamCard (repeated)
│           │   ├── Subject Info
│           │   ├── Date/Time Info
│           │   ├── Room Info
│           │   ├── SBD Display
│           │   ├── Status Badge
│           │   └── Detail Button
│           ├── ExamDetailsModal
│           │   ├── Subject Card
│           │   ├── Date/Time
│           │   ├── Room Details
│           │   ├── SBD & Seat
│           │   ├── Exam Rules
│           │   ├── Notes
│           │   └── Close Button
│           └── No Results Message
│
└── StudentHome.jsx
    ├── Header
    ├── Search Box
    ├── News Section
    ├── Procedures Section
    ├── Right Column
    │   ├── Lookup Section
    │   │   └── "Lịch thi & Địa điểm" → /student/exams
    │   ├── ExamScheduleSummary
    │   │   └── ExamCard (max 3)
    │   ├── Reports Section
    │   └── Regulations Section
    └── Footer
```

---

## State Management Flow

```
Student Request to View Exams
       │
       ▼
┌──────────────────────┐
│ ExamSchedulePage     │
│ State:               │
│ - exams: []          │
│ - loading: true      │
│ - error: null        │
│ - selectedExam: null │
│ - filterStatus: 'all'│
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ useEffect() on mount │
│ Call examService     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ examService.getMyExams()
│ Returns Promise      │
└──────────┬───────────┘
           │
    ┌──────┴──────┐
    ▼             ▼
┌────────┐   ┌─────────┐
│Success │   │  Error  │
├────────┤   ├─────────┤
│setExams│   │setError │
│loading │   │loading  │
│= false │   │= false  │
└────────┘   └─────────┘
    │             │
    ▼             ▼
┌──────────────────────────┐
│ Component Re-renders     │
│ - Shows exams/error      │
│ - User can interact      │
└──────────────────────────┘
```

---

## Security & Authentication Flow

```
User Login
    │
    ▼
JWT Token Created
    │
    ▼
Token Stored in localStorage
    │
    ▼
Every API Request
    │
    ├─ axios interceptor
    │ adds token to header
    │
    ▼
┌──────────────────────────┐
│ Backend Receives Request │
│ Authorization: Bearer X  │
└───┬──────────────────────┘
    │
    ▼
┌──────────────────────┐
│ authMiddleware       │
│ - Verify JWT        │
│ - Extract user ID   │
│ - Set req.user      │
└───┬──────────────────┘
    │
    ├─ Valid ──────────┐
    │                  ▼
    │          ┌─────────────────┐
    │          │ rbacMiddleware  │
    │          │ Check role      │
    │          │ (if needed)     │
    │          └────┬────────────┘
    │               │
    │          ┌────┴─────────┐
    │ ─────────┤ Authorized? ──┤
    │          └──┬────────┬──┬─┘
    │ ┌───────────┘         │  ▼
    │ │    YES            NO │  403 Forbidden
    │ ▼                      │
    │┌─────────────────┐    │
    ││ Controller      │    │
    ││ Process request │    │
    ││ Return data     │    │
    │└─────────────────┘    │
    └─────────┬─────────────┘
              │
    Invalid ──┤─── 401 Unauthorized
              │
              ▼
        Retry Login
```

---

## Performance Considerations

```
Database Indexing:
├─ exams
│  ├─ classSection: 1
│  ├─ subject: 1
│  ├─ room: 1
│  ├─ examDate: 1
│  └─ status: 1
│
├─ studentexams
│  ├─ exam: 1, student: 1 (unique)
│  ├─ student: 1
│  └─ status: 1
│
├─ classenrollments
│  ├─ classSection: 1, student: 1 (unique)
│  ├─ student: 1
│  └─ status: 1
│
└─ students
   └─ email: 1 (unique)

Query Optimization:
- Use .populate() to fetch references
- Filter at database level
- Sort results in database
- Limit queries with pagination (future)
```

---

**Last Updated**: February 21, 2026
**Version**: 1.0.0
