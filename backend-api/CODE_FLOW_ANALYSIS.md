# CODE FLOW ANALYSIS - Student Management & Registration Period

## 📚 TABLE OF CONTENTS
1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Detailed Flow Analysis](#detailed-flow-analysis)
   - [UC01: View Student List](#uc01-view-student-list)
   - [UC02: Search/Filter Student](#uc02-searchfilter-student)
   - [UC03: Create Student](#uc03-create-student)
   - [UC04: Update/Delete Student](#uc04-updatedelete-student)
   - [UC05: View Registration Period List](#uc05-view-registration-period-list)
   - [UC06: Create Registration Period](#uc06-create-registration-period)
   - [UC07: Configure Registration Period](#uc07-configure-registration-period)
4. [Key Technical Concepts](#key-technical-concepts)
5. [Security & Validation](#security--validation)

---

## ARCHITECTURE OVERVIEW

### 🏗️ Layered Architecture Pattern

Hệ thống sử dụng **4-layer architecture** để tách biệt concerns và dễ maintain:

```
┌─────────────────────────────────────────┐
│  CLIENT (Browser/Mobile App)            │
└─────────────────┬───────────────────────┘
                  │ HTTP Request
                  ▼
┌─────────────────────────────────────────┐
│  LAYER 1: ROUTER & MIDDLEWARE           │
│  - Route định nghĩa (GET/POST/PUT/DELETE)│
│  - Authentication (JWT Token)            │
│  - Authorization (RBAC - Role Based)     │
│  - Validation (Request Body/Query)       │
└─────────────────┬───────────────────────┘
                  │ Validated Request
                  ▼
┌─────────────────────────────────────────┐
│  LAYER 2: CONTROLLER                    │
│  - Nhận request từ Router                │
│  - Extract parameters (params, query, body)│
│  - Gọi Service layer                     │
│  - Format response (JSON)                │
│  - Handle HTTP status codes              │
└─────────────────┬───────────────────────┘
                  │ Business Logic Call
                  ▼
┌─────────────────────────────────────────┐
│  LAYER 3: SERVICE                       │
│  - Business logic chính                  │
│  - Validation logic phức tạp             │
│  - Transaction management                │
│  - Gọi multiple repositories             │
│  - Data transformation                   │
└─────────────────┬───────────────────────┘
                  │ Database Operations
                  ▼
┌─────────────────────────────────────────┐
│  LAYER 4: REPOSITORY (MODEL)            │
│  - Direct database access                │
│  - CRUD operations                       │
│  - Query optimization                    │
│  - Schema validation (Mongoose)          │
└─────────────────┬───────────────────────┘
                  │ MongoDB Query
                  ▼
┌─────────────────────────────────────────┐
│  DATABASE: MongoDB                      │
│  - Collections: Students, Users, etc.    │
└─────────────────────────────────────────┘
```

### 🔑 Key Principles

1. **Separation of Concerns**: Mỗi layer có trách nhiệm riêng
2. **Dependency Injection**: Service/Repository được inject vào Controller
3. **Single Responsibility**: Mỗi function chỉ làm 1 việc
4. **Error Handling**: Centralized error handling middleware
5. **Security First**: Authentication & Authorization ở mọi endpoint

---

## TECHNOLOGY STACK

### Backend Framework
- **Node.js**: Runtime environment
- **Express.js**: Web framework cho routing và middleware
- **Mongoose**: ODM (Object Data Modeling) cho MongoDB

### Security
- **JWT (jsonwebtoken)**: Token-based authentication
- **bcrypt**: Password hashing
- **express-validator**: Request validation

### Database
- **MongoDB Atlas**: Cloud NoSQL database

---

## DETAILED FLOW ANALYSIS

## UC01: View Student List

### 📋 **Mục đích**: Hiển thị danh sách sinh viên với phân trang

### **Step-by-Step Flow:**

```javascript
// ============ STEP 1: CLIENT REQUEST ============
// User clicks "Student Management" menu
GET http://localhost:5000/api/students?page=1&limit=20

// ============ STEP 2: ROUTER ============
// File: routes/student.routes.js
router.get('/students', 
  authMiddleware.verifyToken,           // STEP 2.1: Check JWT token
  rbacMiddleware.checkPermission('view_students'), // STEP 2.2: Check quyền
  studentController.getStudents          // STEP 2.3: Forward to controller
);

// ============ STEP 3: MIDDLEWARE CHAIN ============

// STEP 3.1: AuthMiddleware (middlewares/auth.middleware.js)
verifyToken: async (req, res, next) => {
  // Extract token từ header: "Authorization: Bearer <token>"
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  
  try {
    // Verify token với JWT secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Decoded payload chứa: { userId, email, role }
    req.user = decoded;  // Attach user info vào request
    next();  // Pass sang middleware tiếp theo
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// STEP 3.2: RBACMiddleware (middlewares/rbac.middleware.js)
checkPermission: (permission) => {
  return async (req, res, next) => {
    const userRole = req.user.role;  // Lấy từ decoded token
    
    // Permission matrix
    const permissions = {
      admin: ['view_students', 'create_students', 'update_students', 'delete_students'],
      academic_staff: ['view_students', 'update_students'],
      teacher: ['view_students'],
      student: []
    };
    
    if (permissions[userRole]?.includes(permission)) {
      next();  // User có quyền, continue
    } else {
      return res.status(403).json({ message: 'Permission denied' });
    }
  };
}

// ============ STEP 4: CONTROLLER ============
// File: controllers/student.controller.js
getStudents: async (req, res) => {
  try {
    // Extract query parameters
    const { page = 1, limit = 20 } = req.query;
    
    // Gọi service layer
    const result = await studentService.getStudents({
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
    // Format response
    return res.status(200).json({
      success: true,
      data: result.students,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
}

// ============ STEP 5: SERVICE ============
// File: services/student.service.js
getStudents: async ({ page, limit }) => {
  // Calculate skip cho pagination
  const skip = (page - 1) * limit;
  
  // Gọi repository để query database
  const students = await studentModel.find({ isActive: true })
    .skip(skip)
    .limit(limit)
    .populate('userId', 'email username')      // Join với User collection
    .populate('majorCode', 'majorName')        // Join với Major collection
    .sort({ createdAt: -1 });                  // Sort mới nhất trước
  
  // Count total để tính totalPages
  const total = await studentModel.countDocuments({ isActive: true });
  
  // Format và return
  return {
    students: students.map(student => ({
      id: student._id,
      studentCode: student.studentCode,
      fullName: student.fullName,
      email: student.email,
      majorName: student.majorCode?.majorName,
      cohort: student.cohort,
      academicStatus: student.academicStatus,
      gpa: student.gpa
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

// ============ STEP 6: MODEL/REPOSITORY ============
// File: models/student.model.js
const studentSchema = new mongoose.Schema({
  studentCode: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  majorCode: { type: String, ref: 'Major' },
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: String,
  cohort: Number,
  academicStatus: { 
    type: String, 
    enum: ['enrolled', 'suspended', 'graduated', 'dropped'],
    default: 'enrolled'
  },
  gpa: { type: Number, min: 0, max: 4 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index để optimize query
studentSchema.index({ studentCode: 1 });
studentSchema.index({ email: 1 });
studentSchema.index({ isActive: 1, createdAt: -1 });

// MongoDB thực hiện query:
db.students.find({ isActive: true })
  .skip(0)
  .limit(20)
  .sort({ createdAt: -1 })
// Sử dụng index để fast query
```

### **💡 Key Points để giải thích:**

1. **Authentication Flow**: JWT token được verify trước khi xử lý request
2. **Authorization**: RBAC kiểm tra quyền dựa trên role
3. **Pagination**: Sử dụng skip/limit để tránh load toàn bộ data
4. **Populate**: Mongoose populate để join collections (giống SQL JOIN)
5. **Soft Delete**: Chỉ query `isActive: true`, không delete thật khỏi DB
6. **Index Optimization**: MongoDB index trên các field thường query

---

## UC02: Search/Filter Student

### 📋 **Mục đích**: Tìm kiếm và lọc sinh viên real-time

### **Step-by-Step Flow:**

```javascript
// ============ STEP 1: CLIENT REQUEST ============
// User types "Nguyen" in search box (debounced 500ms)
GET http://localhost:5000/api/students/search?keyword=Nguyen&major=SE&cohort=18&status=enrolled

// ============ STEP 2-3: ROUTER & MIDDLEWARE ============
// (Tương tự UC01: authMiddleware → rbacMiddleware)

// ============ STEP 4: CONTROLLER ============
searchStudents: async (req, res) => {
  try {
    const { keyword, major, cohort, status, page = 1, limit = 50 } = req.query;
    
    // Validate keyword length
    if (keyword && keyword.length < 2) {
      return res.status(400).json({ 
        message: 'Keyword must be at least 2 characters' 
      });
    }
    
    const result = await studentService.searchAndFilter({
      keyword,
      majorCode: major,
      cohort: cohort ? parseInt(cohort) : undefined,
      academicStatus: status,
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
    return res.status(200).json({
      success: true,
      data: result.students,
      count: result.count,
      filters: {
        keyword,
        major,
        cohort,
        status
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ============ STEP 5: SERVICE ============
searchAndFilter: async (criteria) => {
  const { keyword, majorCode, cohort, academicStatus, page, limit } = criteria;
  
  // BUILD DYNAMIC QUERY
  const query = { isActive: true };  // Base condition
  
  // SEARCH với REGEX (case-insensitive)
  if (keyword) {
    query.$or = [
      { studentCode: { $regex: keyword, $options: 'i' } },  // Search trong mã SV
      { fullName: { $regex: keyword, $options: 'i' } },     // Search trong tên
      { email: { $regex: keyword, $options: 'i' } }         // Search trong email
    ];
  }
  
  // FILTER theo Major
  if (majorCode) {
    query.majorCode = majorCode;
  }
  
  // FILTER theo Cohort
  if (cohort) {
    query.cohort = cohort;
  }
  
  // FILTER theo Status
  if (academicStatus) {
    query.academicStatus = academicStatus;
  }
  
  /* 
   * Final query example:
   * {
   *   isActive: true,
   *   $or: [
   *     { studentCode: /Nguyen/i },
   *     { fullName: /Nguyen/i },
   *     { email: /Nguyen/i }
   *   ],
   *   majorCode: 'SE',
   *   cohort: 18,
   *   academicStatus: 'enrolled'
   * }
   */
  
  // Execute query với pagination
  const students = await studentModel.find(query)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('userId', 'email')
    .populate('majorCode', 'majorName')
    .sort({ fullName: 1 });  // Sort A-Z
  
  const count = await studentModel.countDocuments(query);
  
  return {
    students: students.map(s => ({
      id: s._id,
      studentCode: s.studentCode,
      fullName: s.fullName,
      email: s.email,
      majorName: s.majorCode?.majorName,
      cohort: s.cohort,
      academicStatus: s.academicStatus
    })),
    count
  };
}

// ============ STEP 6: DATABASE QUERY ============
// MongoDB sử dụng text index hoặc regex
db.students.find({
  isActive: true,
  $or: [
    { studentCode: /Nguyen/i },
    { fullName: /Nguyen/i },
    { email: /Nguyen/i }
  ],
  majorCode: 'SE',
  cohort: 18,
  academicStatus: 'enrolled'
})
```

### **💡 Key Points:**

1. **Dynamic Query Building**: Build MongoDB query object dựa trên filters
2. **Regex Search**: Case-insensitive search với `$regex` và `$options: 'i'`
3. **OR Operator**: `$or` để search multiple fields
4. **Debouncing**: Client-side debounce 500ms để giảm API calls
5. **Performance**: Index trên các field thường search (studentCode, fullName)

---

## UC03: Create Student

### 📋 **Mục đích**: Tạo sinh viên mới + tự động tạo User account + Wallet

### **Step-by-Step Flow:**

```javascript
// ============ STEP 1: CLIENT REQUEST ============
POST http://localhost:5000/api/students
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "studentCode": "SE180001",
  "fullName": "Nguyen Van A",
  "email": "nguyenvana@fpt.edu.vn",
  "majorCode": "SE",
  "cohort": 18,
  "identityNumber": "123456789",
  "phone": "0912345678",
  "dateOfBirth": "2003-01-15"
}

// ============ STEP 2: ROUTER ============
router.post('/students',
  authMiddleware.verifyToken,
  rbacMiddleware.checkPermission('create_students'),  // Chỉ admin/staff
  validationMiddleware.validateCreateStudent,         // Validate payload
  studentController.createStudent
);

// ============ STEP 3: VALIDATION MIDDLEWARE ============
validateCreateStudent: [
  // Express-validator rules
  body('studentCode')
    .notEmpty().withMessage('Student code is required')
    .matches(/^[A-Z]{2}\d{6}$/).withMessage('Invalid format: SE180001'),
  
  body('fullName')
    .notEmpty()
    .isLength({ min: 3, max: 100 }),
  
  body('email')
    .isEmail().withMessage('Invalid email')
    .normalizeEmail(),
  
  body('majorCode')
    .notEmpty()
    .isIn(['SE', 'AI', 'IA', 'GD']).withMessage('Invalid major code'),
  
  body('cohort')
    .isInt({ min: 1, max: 99 }),
  
  body('identityNumber')
    .notEmpty()
    .isLength({ min: 9, max: 12 }),
  
  // Middleware to check validation results
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    next();
  }
]

// ============ STEP 4: CONTROLLER ============
createStudent: async (req, res) => {
  try {
    const payload = req.body;
    const createdById = req.user.userId;  // Từ JWT token
    
    // Gọi service
    const newStudent = await studentService.createStudent(payload, createdById);
    
    return res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: newStudent
    });
  } catch (error) {
    // Handle specific errors
    if (error.code === 'DUPLICATE_STUDENT_CODE') {
      return res.status(409).json({ 
        success: false, 
        message: 'Student code already exists' 
      });
    }
    if (error.code === 'DUPLICATE_EMAIL') {
      return res.status(409).json({ 
        success: false, 
        message: 'Email already exists' 
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ============ STEP 5: SERVICE (COMPLEX BUSINESS LOGIC) ============
createStudent: async (data, createdById) => {
  // STEP 5.1: Validate Major exists
  const major = await majorModel.findOne({ majorCode: data.majorCode });
  if (!major) {
    throw { code: 'INVALID_MAJOR', message: 'Major not found' };
  }
  
  // STEP 5.2: Check duplicate studentCode
  const existingStudent = await studentModel.findOne({ 
    studentCode: data.studentCode 
  });
  if (existingStudent) {
    throw { code: 'DUPLICATE_STUDENT_CODE' };
  }
  
  // STEP 5.3: Check duplicate email
  const existingUser = await userModel.findOne({ email: data.email });
  if (existingUser) {
    throw { code: 'DUPLICATE_EMAIL' };
  }
  
  // STEP 5.4: Hash default password
  // Password mặc định = CMND hoặc "123456"
  const defaultPassword = data.identityNumber || '123456';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);  // 10 salt rounds
  
  // START TRANSACTION
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // STEP 5.5: Create USER account
    const newUser = await userModel.create([{
      username: data.studentCode.toLowerCase(),
      email: data.email,
      passwordHash: passwordHash,
      fullName: data.fullName,
      phone: data.phone,
      role: 'student',
      status: 'active',
      createdAt: new Date()
    }], { session });
    
    const userId = newUser[0]._id;
    
    // STEP 5.6: Create STUDENT record
    const newStudent = await studentModel.create([{
      studentCode: data.studentCode,
      userId: userId,
      majorCode: data.majorCode,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      dateOfBirth: data.dateOfBirth,
      identityNumber: data.identityNumber,
      cohort: data.cohort,
      academicStatus: 'enrolled',
      isActive: true,
      createdBy: createdById,
      createdAt: new Date()
    }], { session });
    
    // STEP 5.7: Create WALLET with balance 0
    await walletModel.create([{
      userId: userId,
      balance: 0,
      currency: 'VND',
      status: 'active',
      createdAt: new Date()
    }], { session });
    
    // COMMIT TRANSACTION
    await session.commitTransaction();
    session.endSession();
    
    // STEP 5.8: Format và return
    return {
      id: newStudent[0]._id,
      studentCode: newStudent[0].studentCode,
      fullName: newStudent[0].fullName,
      email: newStudent[0].email,
      majorCode: newStudent[0].majorCode,
      cohort: newStudent[0].cohort,
      defaultPassword: defaultPassword  // Return để admin biết password ban đầu
    };
    
  } catch (error) {
    // ROLLBACK nếu có lỗi
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}
```

### **💡 Key Points:**

1. **Transaction**: Sử dụng MongoDB transaction để đảm bảo tạo User + Student + Wallet atomic
2. **Password Hashing**: bcrypt với 10 salt rounds để secure password
3. **Validation Chain**: 3 levels - Client validation → Middleware validation → Service validation
4. **Duplicate Check**: Check trước khi insert để tránh lỗi
5. **Rollback**: Nếu 1 bước fail, tất cả changes đều được rollback
6. **Default Values**: Password mặc định = identityNumber hoặc 123456

---

## UC04: Update/Delete Student

### **A. UPDATE FLOW**

```javascript
// ============ STEP 1: CLIENT REQUEST ============
PUT http://localhost:5000/api/students/65abc123def456789
Content-Type: application/json

{
  "fullName": "Nguyen Van A Updated",
  "phone": "0987654321",
  "academicStatus": "suspended"
}

// ============ STEP 2-3: ROUTER & MIDDLEWARE ============
router.put('/students/:id',
  authMiddleware.verifyToken,
  rbacMiddleware.checkPermission('update_students'),
  validationMiddleware.validateUpdateStudent,
  studentController.updateStudent
);

// ============ STEP 4: CONTROLLER ============
updateStudent: async (req, res) => {
  try {
    const studentId = req.params.id;
    const updates = req.body;
    const updatedById = req.user.userId;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: 'Invalid student ID' });
    }
    
    const updatedStudent = await studentService.updateStudent(
      studentId, 
      updates, 
      updatedById
    );
    
    return res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      data: updatedStudent
    });
  } catch (error) {
    if (error.code === 'STUDENT_NOT_FOUND') {
      return res.status(404).json({ message: 'Student not found' });
    }
    if (error.code === 'DUPLICATE_EMAIL') {
      return res.status(409).json({ message: 'Email already in use' });
    }
    return res.status(500).json({ message: error.message });
  }
}

// ============ STEP 5: SERVICE ============
updateStudent: async (studentId, updates, updatedById) => {
  // STEP 5.1: Check student exists
  const student = await studentModel.findById(studentId);
  if (!student || !student.isActive) {
    throw { code: 'STUDENT_NOT_FOUND' };
  }
  
  // STEP 5.2: Nếu update email, check uniqueness
  if (updates.email && updates.email !== student.email) {
    const emailExists = await userModel.findOne({ 
      email: updates.email,
      _id: { $ne: student.userId }  // Exclude current user
    });
    if (emailExists) {
      throw { code: 'DUPLICATE_EMAIL' };
    }
    
    // Update email in User collection too
    await userModel.findByIdAndUpdate(student.userId, {
      email: updates.email
    });
  }
  
  // STEP 5.3: Update student record
  const updatedStudent = await studentModel.findByIdAndUpdate(
    studentId,
    {
      ...updates,
      updatedBy: updatedById,
      updatedAt: new Date()
    },
    { new: true }  // Return updated document
  ).populate('majorCode', 'majorName');
  
  return updatedStudent;
}
```

### **B. DELETE FLOW (Soft Delete)**

```javascript
// ============ STEP 1: CLIENT REQUEST ============
DELETE http://localhost:5000/api/students/65abc123def456789

// ============ STEP 4: CONTROLLER ============
deleteStudent: async (req, res) => {
  try {
    const studentId = req.params.id;
    const deletedById = req.user.userId;
    
    await studentService.deleteStudent(studentId, deletedById);
    
    return res.status(200).json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    if (error.code === 'STUDENT_NOT_FOUND') {
      return res.status(404).json({ message: 'Student not found' });
    }
    if (error.code === 'HAS_ACTIVE_ENROLLMENTS') {
      return res.status(400).json({ 
        message: 'Cannot delete student with active enrollments' 
      });
    }
    return res.status(500).json({ message: error.message });
  }
}

// ============ STEP 5: SERVICE ============
deleteStudent: async (studentId, deletedById) => {
  // STEP 5.1: Check student exists
  const student = await studentModel.findById(studentId);
  if (!student || !student.isActive) {
    throw { code: 'STUDENT_NOT_FOUND' };
  }
  
  // STEP 5.2: Check for active enrollments
  const activeEnrollments = await classEnrollmentModel.countDocuments({
    student: studentId,
    status: 'enrolled'
  });
  
  if (activeEnrollments > 0) {
    throw { code: 'HAS_ACTIVE_ENROLLMENTS' };
  }
  
  // START TRANSACTION
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // STEP 5.3: Soft delete student (set isActive = false)
    await studentModel.findByIdAndUpdate(
      studentId,
      {
        isActive: false,
        deletedBy: deletedById,
        deletedAt: new Date()
      },
      { session }
    );
    
    // STEP 5.4: Deactivate linked User account
    await userModel.findByIdAndUpdate(
      student.userId,
      {
        status: 'inactive',
        updatedAt: new Date()
      },
      { session }
    );
    
    // COMMIT
    await session.commitTransaction();
    session.endSession();
    
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}
```

### **💡 Key Points:**

1. **Soft Delete**: Set `isActive = false` thay vì xóa khỏi DB
2. **Business Rule Validation**: Kiểm tra active enrollments trước khi delete
3. **Cascade Update**: Update cả User account khi delete Student
4. **Audit Trail**: Track `updatedBy`, `deletedBy`, timestamps

---

## UC05: View Registration Period List

### **Step-by-Step Flow:**

```javascript
// ============ SERVICE ============
getAllPeriods: async () => {
  // Query all periods
  const periods = await registrationPeriodModel.find()
    .populate('createdBy', 'fullName email')
    .sort({ startDate: -1 });  // Mới nhất trước
  
  // AUTO-UPDATE STATUS based on current date
  const now = new Date();
  const updatedPeriods = periods.map(period => {
    let calculatedStatus = period.status;
    
    // Nếu status không phải 'cancelled', tự động update
    if (period.status !== 'cancelled') {
      if (now < period.startDate) {
        calculatedStatus = 'upcoming';
      } else if (now >= period.startDate && now <= period.endDate) {
        calculatedStatus = 'active';
      } else if (now > period.endDate) {
        calculatedStatus = 'closed';
      }
      
      // Update DB nếu status thay đổi
      if (calculatedStatus !== period.status) {
        registrationPeriodModel.findByIdAndUpdate(period._id, {
          status: calculatedStatus
        }).exec();  // Async update, không block
      }
    }
    
    return {
      ...period.toObject(),
      status: calculatedStatus
    };
  });
  
  return {
    periods: updatedPeriods,
    count: updatedPeriods.length
  };
}
```

### **💡 Key Points:**

1. **Auto Status Update**: Status tự động update dựa trên current date
2. **Non-blocking Update**: DB update async, không làm chậm response
3. **Status Priority**: 'cancelled' status không bị override
4. **Date Comparison**: Sử dụng Date object để so sánh

---

## UC06: Create Registration Period

### **Step-by-Step Flow:**

```javascript
// ============ SERVICE ============
createPeriod: async (data, createdById) => {
  // STEP 1: Validate date range
  if (new Date(data.endDate) <= new Date(data.startDate)) {
    throw { 
      code: 'INVALID_DATE_RANGE', 
      message: 'End date must be after start date' 
    };
  }
  
  // STEP 2: CHECK OVERLAP
  // Query để tìm periods trùng lặp
  const overlappingPeriods = await registrationPeriodModel.find({
    // Chỉ check periods chưa close/cancelled
    status: { $in: ['upcoming', 'active'] },
    
    // Check cohort overlap: có cohort nào trùng không?
    allowedCohorts: { $in: data.allowedCohorts },
    
    // Check date overlap
    $or: [
      // Case 1: New period start trong existing period
      {
        startDate: { $lte: new Date(data.startDate) },
        endDate: { $gte: new Date(data.startDate) }
      },
      // Case 2: New period end trong existing period
      {
        startDate: { $lte: new Date(data.endDate) },
        endDate: { $gte: new Date(data.endDate) }
      },
      // Case 3: New period bao phủ existing period
      {
        startDate: { $gte: new Date(data.startDate) },
        endDate: { $lte: new Date(data.endDate) }
      }
    ]
  });
  
  if (overlappingPeriods.length > 0) {
    throw {
      code: 'PERIOD_OVERLAP',
      message: `Period overlaps with existing period: ${overlappingPeriods[0].periodName}`,
      conflictWith: overlappingPeriods[0]
    };
  }
  
  // STEP 3: Determine initial status
  const now = new Date();
  let initialStatus;
  if (now < new Date(data.startDate)) {
    initialStatus = 'upcoming';
  } else if (now <= new Date(data.endDate)) {
    initialStatus = 'active';
  } else {
    initialStatus = 'closed';
  }
  
  // STEP 4: Generate periodCode
  const periodCode = await generatePeriodCode();  // e.g., RP2025-01
  
  // STEP 5: Create period
  const newPeriod = await registrationPeriodModel.create({
    periodCode,
    periodName: data.periodName,
    description: data.description,
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
    allowedCohorts: data.allowedCohorts,
    status: initialStatus,
    maxCoursesPerStudent: data.maxCoursesPerStudent || 8,
    minCoursesPerStudent: data.minCoursesPerStudent || 1,
    createdBy: createdById,
    createdAt: new Date()
  });
  
  return newPeriod;
}

// Helper function
const generatePeriodCode = async () => {
  const year = new Date().getFullYear();
  const count = await registrationPeriodModel.countDocuments({
    periodCode: { $regex: `^RP${year}` }
  });
  return `RP${year}-${String(count + 1).padStart(2, '0')}`;
}
```

### **💡 Key Points:**

1. **Complex Overlap Detection**: 3 cases để check date overlap
2. **Array Intersection**: `$in` operator để check cohort overlap
3. **Auto Status**: Determine status based on creation time
4. **Code Generation**: Auto-generate unique periodCode

---

## UC07: Configure Registration Period

### **Step-by-Step Flow:**

```javascript
// ============ SERVICE ============
configurePeriod: async (periodId, updates, updatedById) => {
  // STEP 1: Get existing period
  const period = await registrationPeriodModel.findById(periodId);
  if (!period) {
    throw { code: 'PERIOD_NOT_FOUND' };
  }
  
  // STEP 2: Check if period is cancelled
  if (period.status === 'cancelled') {
    throw { 
      code: 'CANNOT_MODIFY_CANCELLED', 
      message: 'Cannot modify cancelled period' 
    };
  }
  
  // STEP 3: Validate status transition (nếu có update status)
  if (updates.status && updates.status !== period.status) {
    validateStatusTransition(period.status, updates.status);
  }
  
  // STEP 4: Nếu update dates, check overlap lại
  if (updates.startDate || updates.endDate) {
    const newStartDate = updates.startDate || period.startDate;
    const newEndDate = updates.endDate || period.endDate;
    
    // Validate date range
    if (new Date(newEndDate) <= new Date(newStartDate)) {
      throw { code: 'INVALID_DATE_RANGE' };
    }
    
    // Check overlap (exclude current period)
    const overlaps = await registrationPeriodModel.find({
      _id: { $ne: periodId },  // Exclude current
      status: { $in: ['upcoming', 'active'] },
      allowedCohorts: { $in: updates.allowedCohorts || period.allowedCohorts },
      $or: [
        {
          startDate: { $lte: newStartDate },
          endDate: { $gte: newStartDate }
        },
        {
          startDate: { $lte: newEndDate },
          endDate: { $gte: newEndDate }
        }
      ]
    });
    
    if (overlaps.length > 0) {
      throw { code: 'PERIOD_OVERLAP' };
    }
  }
  
  // STEP 5: Update period
  const updatedPeriod = await registrationPeriodModel.findByIdAndUpdate(
    periodId,
    {
      ...updates,
      updatedBy: updatedById,
      updatedAt: new Date()
    },
    { new: true }
  );
  
  return updatedPeriod;
}

// Status transition validator
const validateStatusTransition = (currentStatus, nextStatus) => {
  const validTransitions = {
    'upcoming': ['active', 'cancelled'],
    'active': ['closed', 'cancelled'],
    'closed': ['cancelled'],
    'cancelled': []  // Cannot transition from cancelled
  };
  
  if (!validTransitions[currentStatus]?.includes(nextStatus)) {
    throw {
      code: 'INVALID_STATUS_TRANSITION',
      message: `Cannot transition from ${currentStatus} to ${nextStatus}`
    };
  }
}
```

### **💡 Key Points:**

1. **Status Transition Rules**: Finite state machine cho status workflow
2. **Business Rules**: Không thể modify cancelled period
3. **Re-validation**: Check lại overlap nếu dates thay đổi
4. **Exclude Self**: `$ne: periodId` để không check overlap với chính nó

---

## KEY TECHNICAL CONCEPTS

### 🔐 **1. JWT Authentication**

```javascript
// Token structure
{
  header: {
    alg: "HS256",
    typ: "JWT"
  },
  payload: {
    userId: "65abc...",
    email: "admin@fpt.edu.vn",
    role: "admin",
    iat: 1709020800,    // Issued at
    exp: 1709107200     // Expiration (24h)
  },
  signature: "..." // HMAC SHA256
}

// Token flow:
// 1. User login → Server verify credentials
// 2. Server generate token = jwt.sign(payload, SECRET, { expiresIn: '24h' })
// 3. Client store token (localStorage/cookie)
// 4. Client gửi token trong header: Authorization: Bearer <token>
// 5. Server verify token = jwt.verify(token, SECRET)
```

### 🛡️ **2. RBAC (Role-Based Access Control)**

```javascript
// Permission matrix
const PERMISSIONS = {
  admin: {
    students: ['view', 'create', 'update', 'delete'],
    periods: ['view', 'create', 'update', 'delete'],
    users: ['view', 'create', 'update', 'delete']
  },
  academic_staff: {
    students: ['view', 'update'],
    periods: ['view', 'create', 'update'],
    users: ['view']
  },
  teacher: {
    students: ['view'],
    periods: ['view'],
    users: []
  },
  student: {
    students: [],
    periods: ['view'],
    users: []
  }
};

// Check permission
function hasPermission(role, resource, action) {
  return PERMISSIONS[role]?.[resource]?.includes(action);
}
```

### 📊 **3. MongoDB Query Optimization**

```javascript
// BAD: Không dùng index, full collection scan
db.students.find({ fullName: "Nguyen Van A" });

// GOOD: Dùng index trên studentCode
db.students.find({ studentCode: "SE180001" });
// Index: studentCode_1

// GOOD: Compound index
db.students.find({ isActive: true, createdAt: { $gte: date } });
// Index: { isActive: 1, createdAt: -1 }

// Explain query để check performance
db.students.find({ studentCode: "SE180001" }).explain("executionStats");
// → nIndexesUsed: 1, executionTimeMillis: 2ms
```

### 🔄 **4. Transaction Pattern**

```javascript
// ACID properties với MongoDB Transaction:

// Atomicity: All or nothing
const session = await mongoose.startSession();
session.startTransaction();

try {
  // Multiple operations
  await userModel.create([userData], { session });
  await studentModel.create([studentData], { session });
  await walletModel.create([walletData], { session });
  
  // All success → COMMIT
  await session.commitTransaction();
} catch (error) {
  // Any failure → ROLLBACK
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

### ✅ **5. Validation Layers**

```javascript
// 3-layer validation:

// LAYER 1: Client-side (JavaScript)
if (!email.includes('@')) {
  alert('Invalid email');
}

// LAYER 2: Middleware (express-validator)
body('email').isEmail().normalizeEmail()

// LAYER 3: Service/Business Logic
if (await userExists(email)) {
  throw new Error('Email already exists');
}

// LAYER 4: Database Schema (Mongoose)
{
  email: {
    type: String,
    required: true,
    unique: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  }
}
```

---

## SECURITY & VALIDATION

### 🔒 **Security Best Practices**

1. **Password Security**
   - Bcrypt hashing với 10 salt rounds
   - Không store plain text password
   - Default password được hash trước khi lưu

2. **SQL Injection Prevention**
   - MongoDB không bị SQL injection
   - Nhưng vẫn validate input để tránh NoSQL injection
   - Sử dụng Mongoose schema validation

3. **XSS Prevention**
   - Sanitize input với express-validator
   - `.escape()` để remove HTML tags
   - `.normalizeEmail()` để standardize email

4. **CORS Configuration**
   ```javascript
   app.use(cors({
     origin: ['http://localhost:3000'],
     credentials: true
   }));
   ```

5. **Rate Limiting**
   ```javascript
   const rateLimit = require('express-rate-limit');
   
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100 // limit each IP to 100 requests per windowMs
   });
   
   app.use('/api/', limiter);
   ```

### ✅ **Validation Examples**

```javascript
// Email validation
body('email')
  .isEmail()
  .normalizeEmail()
  .custom(async (email) => {
    const exists = await User.findOne({ email });
    if (exists) throw new Error('Email already in use');
  })

// Date range validation
body('endDate')
  .isISO8601()
  .custom((endDate, { req }) => {
    if (new Date(endDate) <= new Date(req.body.startDate)) {
      throw new Error('End date must be after start date');
    }
    return true;
  })

// Array validation
body('allowedCohorts')
  .isArray({ min: 1 })
  .custom((cohorts) => {
    if (!cohorts.every(c => Number.isInteger(c) && c > 0 && c < 100)) {
      throw new Error('Invalid cohort values');
    }
    return true;
  })
```

---

## 📌 SUMMARY FOR PRESENTATION

### **Architecture Highlights:**
1. **4-Layer Architecture** với clear separation of concerns
2. **Middleware chain** cho authentication, authorization, validation
3. **Service layer** chứa business logic phức tạp
4. **Transaction support** cho data consistency

### **Technical Highlights:**
1. **JWT-based authentication** với role-based access control
2. **MongoDB with Mongoose ODM** cho schema validation
3. **Soft delete pattern** để maintain data integrity
4. **Auto-status update** based on date logic
5. **Complex overlap detection** cho registration periods

### **Security Highlights:**
1. Password hashing với bcrypt
2. Input validation ở multiple layers
3. Transaction để đảm bảo ACID properties
4. Rate limiting và CORS protection

### **Code Quality:**
1. Clean code với clear naming conventions
2. Error handling với specific error codes
3. Async/await pattern cho readable code
4. Documentation và comments đầy đủ

---

## 🎯 KEY POINTS FOR CODE REVIEW

1. **Separation of Concerns**: Router → Middleware → Controller → Service → Repository
2. **Security First**: Authentication → Authorization → Validation
3. **Transaction Management**: Multi-collection updates trong transaction
4. **Error Handling**: Specific error codes, proper HTTP status
5. **Performance**: Index optimization, pagination, populate
6. **Data Integrity**: Soft delete, audit trail, status workflow
7. **Business Logic**: Complex validation (overlap detection, status transitions)

---

*Document này giải thích chi tiết cách code hoạt động từ client request đến database query. Sử dụng để trình bày cho giảng viên hiểu rõ architecture và implementation details.*
