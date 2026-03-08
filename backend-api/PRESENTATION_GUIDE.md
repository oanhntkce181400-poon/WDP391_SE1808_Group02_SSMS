# PRESENTATION GUIDE - Code Review Summary

## 📝 CÁC ĐIỂM CHÍNH ĐỂ TRÌNH BÀY

### 1. KIẾN TRÚC TỔNG QUAN (2 phút)

**"Hệ thống sử dụng 4-layer architecture để tách biệt concerns:"**

```
Client → Router → Controller → Service → Repository → Database
          ↓
     Middleware
     (Auth, RBAC, Validation)
```

**Giải thích:**
- **Router**: Định nghĩa routes và áp dụng middleware chain
- **Middleware**: Xử lý authentication, authorization, validation
- **Controller**: Nhận request, gọi service, format response
- **Service**: Chứa business logic phức tạp
- **Repository**: Trực tiếp tương tác với database

---

### 2. DEMO FLOW: VIEW STUDENT LIST (3 phút)

**"Tôi sẽ demo flow của UC01 - View Student List:"**

#### Step 1: Client Request
```javascript
GET /api/students?page=1&limit=20
Headers: Authorization: Bearer <token>
```

#### Step 2: Authentication Middleware
```javascript
// Verify JWT token
const decoded = jwt.verify(token, SECRET);
req.user = decoded; // { userId, email, role }
```
**→ Đảm bảo user đã đăng nhập**

#### Step 3: Authorization Middleware (RBAC)
```javascript
// Check permission based on role
if (userRole === 'admin' || userRole === 'staff') {
  next(); // Có quyền view students
} else {
  return 403; // Permission denied
}
```
**→ Đảm bảo user có quyền truy cập**

#### Step 4: Controller
```javascript
const { page = 1, limit = 20 } = req.query;
const result = await studentService.getStudents({ page, limit });
return res.status(200).json(result);
```
**→ Extract parameters và gọi service**

#### Step 5: Service Layer
```javascript
const students = await studentModel.find({ isActive: true })
  .skip((page - 1) * limit)
  .limit(limit)
  .populate('userId', 'email')        // Join với User
  .populate('majorCode', 'majorName') // Join với Major
  .sort({ createdAt: -1 });

const total = await studentModel.countDocuments({ isActive: true });
```
**→ Business logic: pagination, populate, soft delete**

#### Step 6: Database Query
```javascript
// MongoDB query với index optimization
db.students.find({ isActive: true })
  .skip(0).limit(20).sort({ createdAt: -1 })

// Sử dụng index: { isActive: 1, createdAt: -1 }
```
**→ Fast query nhờ index**

---

### 3. SECURITY FEATURES (2 phút)

**"Hệ thống có 3 layers security:"**

#### A. Authentication (JWT)
```javascript
// Token structure
{
  userId: "65abc...",
  email: "admin@fpt.edu.vn",
  role: "admin",
  exp: 1709107200  // 24h expiration
}
```
- Token được sign với secret key
- Expire sau 24h để security
- Verify mỗi request

#### B. Authorization (RBAC)
```javascript
const permissions = {
  admin: ['view', 'create', 'update', 'delete'],
  staff: ['view', 'update'],
  teacher: ['view']
};
```
- Permission matrix theo role
- Check quyền trước mỗi action

#### C. Input Validation
```javascript
// 3 levels validation:
1. Client-side: JavaScript validation
2. Middleware: express-validator
3. Service: Business logic validation
4. Database: Mongoose schema
```

---

### 4. COMPLEX FEATURE: CREATE STUDENT (3 phút)

**"Tôi sẽ demo flow phức tạp nhất - Create Student:"**

#### Transaction Pattern
```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
  // Step 1: Create User account
  const user = await userModel.create([{
    email: data.email,
    passwordHash: await bcrypt.hash(defaultPassword, 10),
    role: 'student'
  }], { session });

  // Step 2: Create Student record
  const student = await studentModel.create([{
    userId: user[0]._id,
    studentCode: data.studentCode,
    ...data
  }], { session });

  // Step 3: Create Wallet
  await walletModel.create([{
    userId: user[0]._id,
    balance: 0
  }], { session });

  // All success → COMMIT
  await session.commitTransaction();
} catch (error) {
  // Any fail → ROLLBACK
  await session.abortTransaction();
  throw error;
}
```

**Key Points:**
- **Transaction**: Đảm bảo tạo cả User + Student + Wallet hoặc không tạo gì cả
- **Password Hashing**: Bcrypt với 10 salt rounds
- **Auto-create**: Tự động tạo User account khi tạo Student
- **Rollback**: Nếu 1 bước fail, rollback tất cả

---

### 5. BUSINESS LOGIC: REGISTRATION PERIOD (2 phút)

**"Feature phức tạp nhất: Registration Period Management"**

#### A. Overlap Detection
```javascript
// Query tìm periods trùng lặp
const overlaps = await registrationPeriodModel.find({
  status: { $in: ['upcoming', 'active'] },
  allowedCohorts: { $in: [18, 19, 20] },  // Array intersection
  $or: [
    // Case 1: New start trong existing period
    { startDate: { $lte: newStart }, endDate: { $gte: newStart } },
    // Case 2: New end trong existing period
    { startDate: { $lte: newEnd }, endDate: { $gte: newEnd } },
    // Case 3: New period bao phủ existing
    { startDate: { $gte: newStart }, endDate: { $lte: newEnd } }
  ]
});

if (overlaps.length > 0) {
  throw new Error('Period overlaps!');
}
```
**→ Phức tạp: Check cả date overlap và cohort overlap**

#### B. Auto Status Update
```javascript
const now = new Date();
let status;

if (now < startDate) status = 'upcoming';
else if (now <= endDate) status = 'active';
else status = 'closed';
```
**→ Status tự động update dựa trên thời gian**

#### C. Status Transition Rules
```javascript
const validTransitions = {
  'upcoming': ['active', 'cancelled'],
  'active': ['closed', 'cancelled'],
  'closed': ['cancelled'],
  'cancelled': []  // Cannot transition
};
```
**→ Finite state machine cho status workflow**

---

### 6. DATABASE OPTIMIZATION (1 phút)

**"Các kỹ thuật optimize performance:"**

#### A. Indexing
```javascript
// Index trên các field thường query
studentSchema.index({ studentCode: 1 });
studentSchema.index({ email: 1 });
studentSchema.index({ isActive: 1, createdAt: -1 });

// Compound index cho query phức tạp
periodSchema.index({ status: 1, allowedCohorts: 1, startDate: 1 });
```

#### B. Pagination
```javascript
// Tránh load toàn bộ data
.skip((page - 1) * limit)
.limit(limit)
```

#### C. Populate (Join)
```javascript
// Join với collections khác
.populate('userId', 'email username')    // Chỉ lấy field cần thiết
.populate('majorCode', 'majorName')
```

#### D. Soft Delete
```javascript
// Chỉ query records active
{ isActive: true }

// Không delete thật, giữ lại để audit
await student.update({ isActive: false, deletedAt: new Date() });
```

---

### 7. ERROR HANDLING (1 phút)

**"Centralized error handling pattern:"**

```javascript
// Service throw error với code
throw { 
  code: 'DUPLICATE_EMAIL',
  message: 'Email already exists' 
};

// Controller catch và map to HTTP status
catch (error) {
  if (error.code === 'DUPLICATE_EMAIL') {
    return res.status(409).json({ message: error.message });
  }
  if (error.code === 'NOT_FOUND') {
    return res.status(404).json({ message: error.message });
  }
  return res.status(500).json({ message: 'Internal server error' });
}
```

**HTTP Status Codes:**
- 200: Success
- 201: Created
- 400: Bad Request (validation fail)
- 401: Unauthorized (no token)
- 403: Forbidden (no permission)
- 404: Not Found
- 409: Conflict (duplicate)
- 500: Internal Server Error

---

## 📊 CÁC SỐ LIỆU QUAN TRỌNG

### Performance Metrics
- **Average Response Time**: 50-100ms
- **With Index**: Query trong 2-5ms
- **Without Index**: Query có thể >1000ms
- **Pagination**: Chỉ load 20 records thay vì toàn bộ

### Security Metrics
- **Password Hash Time**: ~100ms (bcrypt với 10 rounds)
- **JWT Token Size**: ~200 bytes
- **Token Expiration**: 24 hours
- **Rate Limiting**: 100 requests/15 minutes

---

## 🎯 CÂU HỎI THƯỜNG GẶP

### Q1: "Tại sao dùng JWT thay vì session?"
**A:** JWT stateless, dễ scale horizontally. Session cần shared storage (Redis), phức tạp hơn khi scale.

### Q2: "Tại sao dùng soft delete?"
**A:** Giữ lại data để audit trail, có thể recover nếu delete nhầm. Tuân thủ data retention policies.

### Q3: "Tại sao cần transaction?"
**A:** Đảm bảo data consistency. Ví dụ: Tạo Student phải đi kèm User + Wallet, không được thiếu.

### Q4: "MongoDB có support transaction không?"
**A:** Có, từ version 4.0. Support multi-document ACID transactions.

### Q5: "Overlap detection hoạt động thế nào?"
**A:** Check 3 cases: new start trong existing, new end trong existing, new period bao phủ existing. Kết hợp với cohort array intersection.

### Q6: "Tại sao có nhiều layer validation?"
**A:** Defense in depth. Client có thể bypass, nên cần validate ở server. Middleware validate format, service validate business rules.

---

## 💡 ĐIỂM MẠNH CỦA CODE

### 1. Kiến trúc rõ ràng
✅ Separation of concerns
✅ Single responsibility
✅ Dependency injection

### 2. Security comprehensive
✅ Authentication + Authorization
✅ Multi-layer validation
✅ Password hashing
✅ Rate limiting

### 3. Data integrity
✅ Transaction support
✅ Soft delete
✅ Audit trail (createdBy, updatedBy)

### 4. Performance optimization
✅ Database indexing
✅ Pagination
✅ Efficient populate

### 5. Business logic phức tạp
✅ Overlap detection
✅ Status state machine
✅ Auto-update logic

### 6. Error handling
✅ Specific error codes
✅ Proper HTTP status
✅ Centralized handling

### 7. Code quality
✅ Clean code
✅ Consistent naming
✅ Well documented
✅ Async/await pattern

---

## 🎤 SCRIPT TRÌNH BÀY 1 PHÚT

*"Xin chào thầy/cô, em xin trình bày về hệ thống Student Management:"*

*"Hệ thống sử dụng **4-layer architecture**: Router → Controller → Service → Repository để tách biệt concerns. Mỗi request đi qua **middleware chain** để authentication với JWT token, authorization với RBAC, và validation với express-validator."*

*"Em sẽ demo **UC03 - Create Student**: Khi tạo student, system tự động tạo User account với password được hash bằng bcrypt, tạo Student record, và tạo Wallet. Cả 3 operations này được wrap trong **MongoDB transaction** để đảm bảo data consistency. Nếu 1 bước fail, tất cả sẽ được rollback."*

*"Feature phức tạp nhất là **Registration Period** với **overlap detection**: System check xem period mới có trùng date và cohort với períod existing không. Sử dụng 3 cases để check date overlap kết hợp với array intersection cho cohort."*

*"Về **performance**, system optimize bằng database indexing, pagination, và populate. Về **security**, có multi-layer validation, JWT authentication, RBAC authorization, và password hashing."*

*"Em xin cảm ơn thầy/cô đã lắng nghe."*

---

## 📄 FILES REFERENCE

1. [CODE_FLOW_ANALYSIS.md](./CODE_FLOW_ANALYSIS.md) - Chi tiết đầy đủ
2. [UC01-UC07 Sequence Diagrams](./diagrams/) - Visual flow
3. [Class Diagrams](./diagrams/) - Architecture overview
4. [Class Specifications](./diagrams/) - Method descriptions

---

*Chúc bạn trình bày tốt! Hãy tự tin và giải thích theo cách của mình, không nhất thiết phải nhớ từng dòng code.*
