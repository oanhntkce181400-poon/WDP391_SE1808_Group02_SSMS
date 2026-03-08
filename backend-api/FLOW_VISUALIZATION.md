# REQUEST FLOW VISUALIZATION

## 🔄 COMPLETE REQUEST FLOW - VIEW STUDENT LIST

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                            │
│                                                                     │
│  User clicks "Student Management" menu                              │
│  → Send GET request with JWT token                                  │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 │ GET /api/students?page=1&limit=20
                 │ Headers: { Authorization: "Bearer eyJhbGc..." }
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      EXPRESS APPLICATION                            │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    ROUTER LAYER                               │ │
│  │  File: routes/student.routes.js                               │ │
│  │                                                               │ │
│  │  router.get('/students',                                      │ │
│  │    authMiddleware.verifyToken,      ← Middleware 1           │ │
│  │    rbacMiddleware.checkPermission,  ← Middleware 2           │ │
│  │    studentController.getStudents    ← Handler                │ │
│  │  );                                                           │ │
│  └───────────────┬───────────────────────────────────────────────┘ │
│                  │                                                   │
│                  ▼                                                   │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │              MIDDLEWARE 1: AUTH                               │ │
│  │  File: middlewares/auth.middleware.js                         │ │
│  │                                                               │ │
│  │  1. Extract token from header                                │ │
│  │     const token = req.headers.authorization.split(' ')[1]    │ │
│  │                                                               │ │
│  │  2. Verify token                                             │ │
│  │     const decoded = jwt.verify(token, SECRET)                │ │
│  │     // Result: { userId: "...", role: "admin", ... }         │ │
│  │                                                               │ │
│  │  3. Attach to request                                        │ │
│  │     req.user = decoded                                        │ │
│  │                                                               │ │
│  │  ✅ Token valid → next()                                      │ │
│  │  ❌ Token invalid → 401 Unauthorized                          │ │
│  └───────────────┬───────────────────────────────────────────────┘ │
│                  │                                                   │
│                  ▼                                                   │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │              MIDDLEWARE 2: RBAC                               │ │
│  │  File: middlewares/rbac.middleware.js                         │ │
│  │                                                               │ │
│  │  1. Get user role                                            │ │
│  │     const role = req.user.role  // "admin"                   │ │
│  │                                                               │ │
│  │  2. Check permission matrix                                  │ │
│  │     permissions = {                                          │ │
│  │       admin: ['view', 'create', 'update', 'delete'],        │ │
│  │       staff: ['view', 'update']                             │ │
│  │     }                                                         │ │
│  │                                                               │ │
│  │  3. Validate permission                                      │ │
│  │     if (permissions[role].includes('view_students'))         │ │
│  │                                                               │ │
│  │  ✅ Has permission → next()                                   │ │
│  │  ❌ No permission → 403 Forbidden                             │ │
│  └───────────────┬───────────────────────────────────────────────┘ │
│                  │                                                   │
│                  ▼                                                   │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │               CONTROLLER LAYER                                │ │
│  │  File: controllers/student.controller.js                      │ │
│  │                                                               │ │
│  │  getStudents: async (req, res) => {                          │ │
│  │    try {                                                      │ │
│  │      // 1. Extract query params                              │ │
│  │      const { page = 1, limit = 20 } = req.query;            │ │
│  │                                                               │ │
│  │      // 2. Call service layer                                │ │
│  │      const result = await studentService.getStudents({       │ │
│  │        page: parseInt(page),                                 │ │
│  │        limit: parseInt(limit)                                │ │
│  │      });                                                      │ │
│  │                                                               │ │
│  │      // 3. Format response                                   │ │
│  │      return res.status(200).json({                           │ │
│  │        success: true,                                         │ │
│  │        data: result.students,                                │ │
│  │        pagination: { ... }                                   │ │
│  │      });                                                      │ │
│  │                                                               │ │
│  │    } catch (error) {                                         │ │
│  │      return res.status(500).json({ error });                │ │
│  │    }                                                          │ │
│  │  }                                                            │ │
│  └───────────────┬───────────────────────────────────────────────┘ │
│                  │                                                   │
│                  ▼                                                   │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                SERVICE LAYER                                  │ │
│  │  File: services/student.service.js                            │ │
│  │                                                               │ │
│  │  getStudents: async ({ page, limit }) => {                   │ │
│  │                                                               │ │
│  │    // 1. Calculate pagination                                │ │
│  │    const skip = (page - 1) * limit;                          │ │
│  │    // page=1, limit=20 → skip=0                              │ │
│  │    // page=2, limit=20 → skip=20                             │ │
│  │                                                               │ │
│  │    // 2. Query database                                      │ │
│  │    const students = await studentModel.find(...)             │ │
│  │                                                               │ │
│  │    // 3. Count total                                         │ │
│  │    const total = await studentModel.countDocuments(...)      │ │
│  │                                                               │ │
│  │    // 4. Format and return                                   │ │
│  │    return {                                                   │ │
│  │      students: [...],                                        │ │
│  │      total: 150,                                             │ │
│  │      page: 1,                                                │ │
│  │      totalPages: 8                                           │ │
│  │    };                                                         │ │
│  │  }                                                            │ │
│  └───────────────┬───────────────────────────────────────────────┘ │
│                  │                                                   │
└──────────────────┼───────────────────────────────────────────────────┘
                   │
                   │ MongoDB Query
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         MONGODB DATABASE                            │
│                                                                     │
│  Collection: students                                               │
│                                                                     │
│  db.students.find({                                                 │
│    isActive: true          ← Soft delete filter                     │
│  })                                                                 │
│  .skip(0)                  ← Pagination: Skip first 0 records       │
│  .limit(20)                ← Pagination: Return max 20 records      │
│  .populate('userId')       ← Join with users collection             │
│  .populate('majorCode')    ← Join with majors collection            │
│  .sort({ createdAt: -1 })  ← Sort: Newest first                     │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Index Used: { isActive: 1, createdAt: -1 }                 │   │
│  │  Execution Time: ~3ms                                        │   │
│  │  Documents Scanned: 20                                       │   │
│  │  Documents Returned: 20                                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Returns: [                                                         │
│    {                                                                │
│      _id: ObjectId("..."),                                          │
│      studentCode: "SE180001",                                       │
│      fullName: "Nguyen Van A",                                      │
│      email: "student@fpt.edu.vn",                                   │
│      userId: {                                                      │
│        email: "student@fpt.edu.vn",                                 │
│        username: "se180001"                                         │
│      },                                                             │
│      majorCode: {                                                   │
│        majorName: "Software Engineering"                            │
│      },                                                             │
│      cohort: 18,                                                    │
│      academicStatus: "enrolled",                                    │
│      gpa: 3.5,                                                      │
│      createdAt: "2025-01-15T..."                                    │
│    },                                                               │
│    // ... 19 more students                                          │
│  ]                                                                  │
└────────────────┬────────────────────────────────────────────────────┘
                 │
                 │ Return data back through layers
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    RESPONSE TO CLIENT                               │
│                                                                     │
│  HTTP/1.1 200 OK                                                    │
│  Content-Type: application/json                                     │
│                                                                     │
│  {                                                                  │
│    "success": true,                                                 │
│    "data": [                                                        │
│      {                                                              │
│        "id": "65abc...",                                            │
│        "studentCode": "SE180001",                                   │
│        "fullName": "Nguyen Van A",                                  │
│        "email": "student@fpt.edu.vn",                               │
│        "majorName": "Software Engineering",                         │
│        "cohort": 18,                                                │
│        "academicStatus": "enrolled",                                │
│        "gpa": 3.5                                                   │
│      },                                                             │
│      // ... 19 more                                                 │
│    ],                                                               │
│    "pagination": {                                                  │
│      "page": 1,                                                     │
│      "limit": 20,                                                   │
│      "total": 150,                                                  │
│      "totalPages": 8                                                │
│    }                                                                │
│  }                                                                  │
│                                                                     │
│  Total Time: ~50ms                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 AUTHENTICATION FLOW DETAIL

```
┌─────────────────────────────────────────────────────────────────────┐
│                    JWT TOKEN LIFECYCLE                              │
└─────────────────────────────────────────────────────────────────────┘

1. USER LOGIN
   ┌─────────┐
   │ Client  │  POST /api/auth/login
   │         │  { email, password }
   └────┬────┘
        │
        ▼
   ┌─────────────────────────────────────┐
   │ Server: Verify Credentials          │
   │                                     │
   │ 1. Find user by email               │
   │ 2. Compare password:                │
   │    bcrypt.compare(                  │
   │      inputPassword,                 │
   │      storedPasswordHash             │
   │    )                                │
   │                                     │
   │ ✅ Match → Generate Token           │
   │ ❌ No match → 401 Unauthorized      │
   └────┬────────────────────────────────┘
        │
        │ ✅ Success
        ▼
   ┌─────────────────────────────────────┐
   │ Generate JWT Token                  │
   │                                     │
   │ const token = jwt.sign(             │
   │   {                                 │
   │     userId: user._id,               │
   │     email: user.email,              │
   │     role: user.role                 │
   │   },                                │
   │   SECRET_KEY,                       │
   │   { expiresIn: '24h' }              │
   │ );                                  │
   │                                     │
   │ Token = "eyJhbGciOiJIUzI1NiIsInR5" │
   │         "cCI6IkpXVCJ9.eyJ1c2VySW" │
   │         "QiOiI2NWFiYy4uLiIsImVtYW" │
   │         "lsIjoiYWRtaW5AZnB0LmVkdS" │
   │         "52biIsInJvbGUiOiJhZG1pbi" │
   │         "IsImlhdCI6MTcwOTAyMDgwM" │
   │         "CwiZXhwIjoxNzA5MTA3MjAw" │
   │         "fQ.SflKxwRJSMeKKF2QT4fw" │
   │         "pMeJf36POk6yJV_adQssw5c"  │
   └────┬────────────────────────────────┘
        │
        │ Return token to client
        ▼
   ┌─────────┐
   │ Client  │  Store token in:
   │         │  - localStorage
   │         │  - sessionStorage
   │         │  - Cookie
   └─────────┘


2. AUTHENTICATED REQUEST
   ┌─────────┐
   │ Client  │  GET /api/students
   │         │  Headers: {
   │         │    Authorization: "Bearer <token>"
   │         │  }
   └────┬────┘
        │
        ▼
   ┌─────────────────────────────────────┐
   │ Server: Verify Token                │
   │                                     │
   │ 1. Extract token from header        │
   │    const token = req.headers        │
   │      .authorization                 │
   │      .split(' ')[1];                │
   │                                     │
   │ 2. Verify signature                 │
   │    try {                            │
   │      const decoded = jwt.verify(    │
   │        token,                       │
   │        SECRET_KEY                   │
   │      );                             │
   │                                     │
   │      // decoded = {                 │
   │      //   userId: "65abc...",       │
   │      //   email: "admin@...",       │
   │      //   role: "admin",            │
   │      //   iat: 1709020800,          │
   │      //   exp: 1709107200           │
   │      // }                           │
   │                                     │
   │      req.user = decoded;            │
   │      next();  // ✅ Proceed          │
   │                                     │
   │    } catch (error) {                │
   │      return 401; // ❌ Invalid      │
   │    }                                │
   └─────────────────────────────────────┘
```

---

## 🔄 CREATE STUDENT TRANSACTION FLOW

```
┌─────────────────────────────────────────────────────────────────────┐
│              CREATE STUDENT WITH TRANSACTION                        │
└─────────────────────────────────────────────────────────────────────┘

INPUT:
{
  studentCode: "SE180001",
  fullName: "Nguyen Van A",
  email: "student@fpt.edu.vn",
  majorCode: "SE",
  cohort: 18,
  identityNumber: "123456789"
}

┌─────────────────────────────────────────────────────────────────────┐
│ STEP 1: VALIDATION                                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ✓ Check Major exists:                                              │
│    const major = await Major.findOne({ majorCode: "SE" })          │
│    if (!major) throw Error                                          │
│                                                                     │
│  ✓ Check Student Code unique:                                       │
│    const exists = await Student.findOne({                           │
│      studentCode: "SE180001"                                        │
│    })                                                               │
│    if (exists) throw "DUPLICATE_STUDENT_CODE"                       │
│                                                                     │
│  ✓ Check Email unique:                                              │
│    const emailExists = await User.findOne({                         │
│      email: "student@fpt.edu.vn"                                    │
│    })                                                               │
│    if (emailExists) throw "DUPLICATE_EMAIL"                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               │ All validations passed
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 2: START TRANSACTION                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  const session = await mongoose.startSession();                     │
│  session.startTransaction();                                        │
│                                                                     │
│  console.log("Transaction started");                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 3: CREATE USER ACCOUNT (in transaction)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  // Hash password                                                   │
│  const defaultPassword = "123456789"; // From identityNumber        │
│  const passwordHash = await bcrypt.hash(defaultPassword, 10);      │
│  // Takes ~100ms, 10 salt rounds                                    │
│                                                                     │
│  const newUser = await User.create([{                               │
│    username: "se180001",                                            │
│    email: "student@fpt.edu.vn",                                     │
│    passwordHash: "$2b$10$abcdef...",                                │
│    fullName: "Nguyen Van A",                                        │
│    role: "student",                                                 │
│    status: "active"                                                 │
│  }], { session });                                                  │
│                                                                     │
│  const userId = newUser[0]._id;                                     │
│  // Result: ObjectId("65abc123def456789")                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 4: CREATE STUDENT RECORD (in transaction)                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  const newStudent = await Student.create([{                         │
│    studentCode: "SE180001",                                         │
│    userId: ObjectId("65abc123def456789"),  ← Link to User          │
│    majorCode: "SE",                                                 │
│    fullName: "Nguyen Van A",                                        │
│    email: "student@fpt.edu.vn",                                     │
│    cohort: 18,                                                      │
│    academicStatus: "enrolled",                                      │
│    isActive: true,                                                  │
│    createdBy: ObjectId("admin_id"),                                 │
│    createdAt: new Date()                                            │
│  }], { session });                                                  │
│                                                                     │
│  const studentId = newStudent[0]._id;                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 5: CREATE WALLET (in transaction)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  await Wallet.create([{                                             │
│    userId: ObjectId("65abc123def456789"),  ← Link to User          │
│    balance: 0,                                                      │
│    currency: "VND",                                                 │
│    status: "active",                                                │
│    createdAt: new Date()                                            │
│  }], { session });                                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               │ All operations success
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 6: COMMIT TRANSACTION                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  await session.commitTransaction();                                 │
│  session.endSession();                                              │
│                                                                     │
│  ✅ ALL 3 RECORDS PERMANENTLY SAVED:                                │
│     - User in users collection                                      │
│     - Student in students collection                                │
│     - Wallet in wallets collection                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

                               │
                               ▼
                          ✅ SUCCESS


IF ANY STEP FAILS:
┌─────────────────────────────────────────────────────────────────────┐
│ ERROR HANDLING                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  catch (error) {                                                    │
│    // ❌ Something went wrong                                        │
│                                                                     │
│    await session.abortTransaction();                                │
│    session.endSession();                                            │
│                                                                     │
│    // 🔙 ROLLBACK ALL CHANGES                                        │
│    // - User không được tạo                                         │
│    // - Student không được tạo                                      │
│    // - Wallet không được tạo                                       │
│                                                                     │
│    throw error;  // Return error to client                          │
│  }                                                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 OVERLAP DETECTION ALGORITHM

```
┌─────────────────────────────────────────────────────────────────────┐
│         REGISTRATION PERIOD OVERLAP DETECTION                       │
└─────────────────────────────────────────────────────────────────────┘

SCENARIO: Creating new period
  Start: 2025-08-01
  End:   2025-08-15
  Cohorts: [18, 19, 20]

┌────────────────────────────────────────────────────────────────────┐
│ EXISTING PERIODS IN DATABASE:                                     │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│ Period A:  [2025-07-15 ════════════ 2025-08-05]                   │
│            Cohorts: [17, 18, 19]                                   │
│                                                                    │
│ Period B:  [2025-08-10 ════════════ 2025-08-25]                   │
│            Cohorts: [19, 20, 21]                                   │
│                                                                    │
│ Period C:  [2025-09-01 ════════════ 2025-09-15]                   │
│            Cohorts: [18, 19]                                       │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

NEW PERIOD:     [2025-08-01 ════════════ 2025-08-15]
                 Cohorts: [18, 19, 20]

┌────────────────────────────────────────────────────────────────────┐
│ OVERLAP CHECK ALGORITHM:                                           │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│ FOR EACH existing period:                                         │
│                                                                    │
│   1. CHECK COHORT OVERLAP:                                         │
│      intersection([18,19,20], period.allowedCohorts)              │
│      → If empty, skip this period                                  │
│      → If has common cohorts, continue to step 2                   │
│                                                                    │
│   2. CHECK DATE OVERLAP (3 cases):                                 │
│                                                                    │
│      Case 1: New start falls in existing period                    │
│      ─────────────────────────────────────────                     │
│      Existing:  [════════════════]                                 │
│      New:              [════════════════]                          │
│                        ↑ new start inside                          │
│                                                                    │
│      if (existingStart <= newStart <= existingEnd)                 │
│        → OVERLAP                                                   │
│                                                                    │
│                                                                    │
│      Case 2: New end falls in existing period                      │
│      ─────────────────────────────────────────                     │
│      Existing:         [════════════════]                          │
│      New:       [════════════════]                                 │
│                            ↑ new end inside                        │
│                                                                    │
│      if (existingStart <= newEnd <= existingEnd)                   │
│        → OVERLAP                                                   │
│                                                                    │
│                                                                    │
│      Case 3: New period contains existing period                   │
│      ─────────────────────────────────────────                     │
│      Existing:     [═══════]                                       │
│      New:       [═══════════════]                                  │
│                                                                    │
│      if (newStart <= existingStart AND newEnd >= existingEnd)      │
│        → OVERLAP                                                   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ CHECKING PERIOD A:                                                 │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│ Cohorts: [17, 18, 19] ∩ [18, 19, 20] = [18, 19] ✓ Has overlap    │
│                                                                    │
│ Dates:                                                             │
│   Period A:  [2025-07-15 ════════════ 2025-08-05]                 │
│   New:                [2025-08-01 ════════════ 2025-08-15]        │
│                              ↑                                     │
│                        new start inside A                          │
│                                                                    │
│ Result: ⚠️ OVERLAP DETECTED!                                       │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ CHECKING PERIOD B:                                                 │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│ Cohorts: [19, 20, 21] ∩ [18, 19, 20] = [19, 20] ✓ Has overlap    │
│                                                                    │
│ Dates:                                                             │
│   New:      [2025-08-01 ════════════ 2025-08-15]                  │
│   Period B:         [2025-08-10 ════════════ 2025-08-25]          │
│                                  ↑                                 │
│                            new end inside B                        │
│                                                                    │
│ Result: ⚠️ OVERLAP DETECTED!                                       │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ CHECKING PERIOD C:                                                 │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│ Cohorts: [18, 19] ∩ [18, 19, 20] = [18, 19] ✓ Has overlap        │
│                                                                    │
│ Dates:                                                             │
│   New:      [2025-08-01 ════════════ 2025-08-15]                  │
│   Period C:                            [2025-09-01 ═══ 2025-09-15]│
│                                                                    │
│   No overlap in dates (C starts after New ends)                   │
│                                                                    │
│ Result: ✅ NO OVERLAP                                              │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

FINAL RESULT: ❌ CANNOT CREATE NEW PERIOD
              Conflicts with Period A and Period B
```

---

*Sử dụng các visualizations này để giải thích flow cho giảng viên một cách trực quan hơn!*
