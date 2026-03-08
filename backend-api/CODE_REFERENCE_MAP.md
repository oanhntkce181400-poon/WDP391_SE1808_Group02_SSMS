# 📂 CODE REFERENCE MAP - ĐƯỜNG DẪN NHANH ĐẾN CODE

> **Mục đích:** Chỉ đường nhanh đến từng đoạn code trong project khi trình bày cho giảng viên

---

## 🎯 HƯỚNG DẪN SỬ DỤNG

Khi giảng viên hỏi về một chức năng:
1. Tìm chức năng trong list dưới
2. Mở file theo đường dẫn
3. Jump đến line number được chỉ định
4. Giải thích code ngay tại đó

---

## 📋 TABLE OF CONTENTS

1. [Student Management](#1-student-management)
2. [Registration Period Management](#2-registration-period-management)
3. [Authentication & Security](#3-authentication--security)
4. [Middleware & Validation](#4-middleware--validation)

---

## 1️⃣ STUDENT MANAGEMENT

### **UC01: View Student List (Pagination)**

**Controller:**
- 📁 `src/controllers/student.controller.js`
- 📍 Line 36-66
- 🔍 Function: `getStudents`
- ⚡ Key: Extract query params, gọi service

**Service:**
- 📁 `src/services/student.service.js`
- 📍 Line 213-275
- 🔍 Function: `getStudents`
- ⚡ Key: Dynamic query builder, Promise.all(), pagination

**Code highlights:**
```javascript
// Line 230-245: Dynamic query builder
const query = { isActive: true };
if (majorCode) query.majorCode = majorCode;
if (search) {
  query.$or = [
    { studentCode: { $regex: search, $options: 'i' } },
    { fullName: { $regex: search, $options: 'i' } }
  ];
}

// Line 257-266: Promise.all() + Pagination
const skip = (page - 1) * limit;
const [students, total] = await Promise.all([
  Student.find(query).sort(sort).skip(skip).limit(limit).lean(),
  Student.countDocuments(query)
]);
```

---

### **UC03: Create Student (Transaction)**

**Service:**
- 📁 `src/services/student.service.js`
- 📍 Line 95-200
- 🔍 Function: `createStudent`
- ⚡ Key: MongoDB transaction, 3-step creation

**Code highlights:**
```javascript
// Line 151-198: Transaction logic
const session = await mongoose.startSession();
session.startTransaction();

try {
  // Step 1: Create User (Line 155-165)
  const newUser = await User.create([{ ... }], { session });
  
  // Step 2: Create Student (Line 167-180)
  const newStudent = await Student.create([{ ... }], { session });
  
  // Step 3: Create Wallet (Line 182-187)
  await Wallet.create([{ userId: newUser._id, ... }], { session });
  
  await session.commitTransaction();
  
} catch (error) {
  await session.abortTransaction();
  throw error;
}
```

---

### **UC04: Update/Delete Student**

**Update:**
- 📁 `src/services/student.service.js`
- 📍 Line 315-375
- 🔍 Function: `updateStudent`
- ⚡ Key: Uniqueness check before update

**Delete (Soft):**
- 📁 `src/services/student.service.js`
- 📍 Line 377-420
- 🔍 Function: `deleteStudent`
- ⚡ Key: Soft delete pattern (isActive: false)

**Code highlights:**
```javascript
// Soft delete (Line 410)
student.isActive = false;
student.deletedAt = new Date();
await student.save();
```

---

## 2️⃣ REGISTRATION PERIOD MANAGEMENT

### **UC05: View Registration Period List (Auto-Status)**

**Controller:**
- 📁 `src/controllers/registrationPeriod.controller.js`
- 📍 Line 32-54
- 🔍 Function: `getPeriods`
- ⚡ Key: Extract filters, call service

**Service:**
- 📁 `src/services/registrationPeriod.service.js`
- 📍 Line 42-58
- 🔍 Function: `getRegistrationPeriods`
- ⚡ Key: Query + sort, auto-status update happens in frontend/view

**Note:** Auto-status update thực tế không có trong code này, nhưng logic tương tự có thể apply bằng cách:
```javascript
// Có thể thêm vào service
periods.forEach(period => {
  const now = new Date();
  if (now < period.startDate) period.status = 'upcoming';
  else if (now >= period.startDate && now <= period.endDate) period.status = 'active';
  else period.status = 'closed';
});
```

---

### **UC06: Create Registration Period (Set Thời Gian + Status)**

**Controller:**
- 📁 `src/controllers/registrationPeriod.controller.js`
- 📍 Line 9-29
- 🔍 Function: `createPeriod`
- ⚡ Key: Nhận payload, gọi service

**Service (QUAN TRỌNG NHẤT!):**
- 📁 `src/services/registrationPeriod.service.js`
- 📍 Line 9-39
- 🔍 Function: `createRegistrationPeriod`
- ⚡ Key: **Auto-calculate status từ startDate/endDate** ⭐

**Code highlights:**
```javascript
// Line 18-26: AUTO-CALCULATE STATUS ⭐⭐⭐
const now = new Date();
let status = 'upcoming';

if (now >= new Date(startDate) && now <= new Date(endDate)) {
  status = 'active';
} else if (now > new Date(endDate)) {
  status = 'closed';
}

// Line 28-37: Save với status đã tính
const period = await RegistrationPeriod.create({
  periodName,
  startDate,
  endDate,
  allowedCohorts,
  status,  // ← Status tự động
  createdBy: createdById,
});
```

**Model (Validation):**
- 📁 `src/models/registrationPeriod.model.js`
- 📍 Line 72-79
- 🔍 Hook: `pre('save')`
- ⚡ Key: **Validate endDate > startDate** ⭐

**Code highlights:**
```javascript
// Line 72-79: VALIDATION ⭐⭐⭐
registrationPeriodSchema.pre('save', function (next) {
  if (this.endDate <= this.startDate) {
    next(new Error('Ngày kết thúc phải sau ngày bắt đầu'));
  } else {
    next();
  }
});
```

**Schema định nghĩa:**
- 📁 `src/models/registrationPeriod.model.js`
- 📍 Line 15-24 (startDate), Line 26-29 (endDate)

```javascript
// Line 15-24: startDate field
startDate: {
  type: Date,
  required: true,  // Bắt buộc
},

// Line 26-29: endDate field
endDate: {
  type: Date,
  required: true,  // Bắt buộc
},
```

---

### **UC07: Configure Period Status (State Machine)**

**Service:**
- 📁 `src/services/registrationPeriod.service.js`
- 📍 Line 116-140
- 🔍 Function: `togglePeriodStatus`
- ⚡ Key: Validate allowed status transitions

**Code highlights:**
```javascript
// Line 124-129: Status validation
const validStatuses = ['upcoming', 'active', 'closed', 'cancelled'];
if (!validStatuses.includes(newStatus)) {
  throw new Error('Trạng thái không hợp lệ');
}
```

---

## 3️⃣ AUTHENTICATION & SECURITY

### **JWT Token Generation**

**Auth Service:**
- 📁 `src/services/auth.service.js` (nếu có)
- 🔍 Function: `login`, `generateToken`

**Example logic:**
```javascript
const token = jwt.sign(
  { userId, email, role },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);
```

---

### **JWT Token Verification**

**Middleware:**
- 📁 `src/middlewares/auth.middleware.js`
- 🔍 Function: `verifyToken`
- ⚡ Key: Decode token, attach user to req

**Code highlights:**
```javascript
const token = req.headers.authorization?.split(' ')[1];
const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.user = decoded;
next();
```

---

### **Password Hashing**

**Student Service:**
- 📁 `src/services/student.service.js`
- 📍 Line 148-149 (trong createStudent)

```javascript
const passwordHash = await bcrypt.hash(defaultPassword, 10);
// 10 = salt rounds
```

---

## 4️⃣ MIDDLEWARE & VALIDATION

### **RBAC Middleware**

**Middleware:**
- 📁 `src/middlewares/rbac.middleware.js`
- 🔍 Function: `checkPermission`
- ⚡ Key: Check user role against permissions

**Example logic:**
```javascript
const permissions = {
  admin: ['view', 'create', 'update', 'delete'],
  staff: ['view', 'update']
};

if (!permissions[user.role]?.includes(requiredPermission)) {
  return res.status(403).json({ message: 'Forbidden' });
}
```

---

### **Error Handling**

**Convention:**
```javascript
try {
  // Business logic
} catch (error) {
  console.error('[ControllerName] functionName error:', error);
  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    message: error.message || 'Lỗi máy chủ'
  });
}
```

---

## 📊 MODELS SCHEMA REFERENCE

### **Student Model**
- 📁 `src/models/student.model.js`
- Key fields: studentCode, userId, majorCode, cohort, isActive

### **User Model**
- 📁 `src/models/user.model.js`
- Key fields: email, passwordHash, role, status

### **Registration Period Model**
- 📁 `src/models/registrationPeriod.model.js`
- Key fields: periodName, startDate, endDate, allowedCohorts, status

### **Wallet Model**
- 📁 `src/models/wallet.model.js`
- Key fields: userId, balance, status

---

## 🎯 QUICK REFERENCE: 7 CHỨC NĂNG

| Chức năng | Controller | Service | Model |
|-----------|-----------|---------|-------|
| **UC01: View Students** | student.controller.js:36 | student.service.js:213 | student.model.js |
| **UC02: Search/Filter** | (same as UC01) | (same as UC01) | (same) |
| **UC03: Create Student** | student.controller.js:12 | student.service.js:95 | student.model.js |
| **UC04: Update/Delete** | student.controller.js:97,123 | student.service.js:315,377 | student.model.js |
| **UC05: View Periods** | registrationPeriod.controller.js:32 | registrationPeriod.service.js:42 | registrationPeriod.model.js |
| **UC06: Create Period** | registrationPeriod.controller.js:9 | registrationPeriod.service.js:9 | registrationPeriod.model.js |
| **UC07: Configure Status** | registrationPeriod.controller.js | registrationPeriod.service.js:116 | registrationPeriod.model.js |

---

## 💡 TIPS KHI TRÌNH BÀY

### **Cách mở code nhanh:**

1. **VS Code:** `Ctrl+P` → Nhập tên file → `Ctrl+G` → Nhập line number
2. **Example:** `Ctrl+P` → "student.service" → Enter → `Ctrl+G` → "213" → Enter

### **Khi giảng viên hỏi về một feature:**

1. Mở file reference này
2. Tìm feature trong table
3. Mở file + jump to line
4. Explain code trực tiếp

### **Prepare trước:**

- Mở sẵn 3-4 files quan trọng nhất:
  - `student.service.js`
  - `registrationPeriod.service.js`
  - `registrationPeriod.model.js`
  - `auth.middleware.js`

---

## 🚀 CÁC ĐOẠN CODE GIẢNG VIÊN HAY HỎI

### **1. Transaction (QUAN TRỌNG NHẤT!)**
→ `student.service.js` line 151-198

### **2. Auto-calculate Status (QUAN TRỌNG!)**
→ `registrationPeriod.service.js` line 18-26

### **3. Schema Validation**
→ `registrationPeriod.model.js` line 72-79

### **4. Promise.all()**
→ `student.service.js` line 257-266

### **5. Soft Delete**
→ `student.service.js` line 410

### **6. Dynamic Query Builder**
→ `student.service.js` line 230-245

### **7. Password Hash**
→ `student.service.js` line 148-149

---

**🎯 File này là bản đồ đường đi khi trình bày! Lưu tab này mở sẵn!**
