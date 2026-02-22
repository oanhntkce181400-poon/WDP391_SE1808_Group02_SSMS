# 🚀 HỌC CẤP TỐC 5 PHÚT - SSMS System

> **Mục đích:** Hiểu nhanh code để trả lời thầy về Seed Data (Faker.js), Socket.IO, Cloudinary, Filter Môn học, và Xem Học phí trong 5-10 phút.

---

## 📋 MỤC LỤC

1. [Seed Data với Faker.js](#1-seed-data-với-fakerjs)
2. [Setup Socket.IO](#2-setup-socketio)
3. [Setup Cloudinary](#3-setup-cloudinary)
4. [Chức năng Lọc Môn học](#4-chức-năng-lọc-môn-học)
5. [Chức năng Xem Học phí](#5-chức-năng-xem-học-phí)

---

## 1. 📊 SEED DATA VỚI FAKER.JS

### 📂 File chính
- [backend-api/src/database/seeds/index.js](backend-api/src/database/seeds/index.js)
- [backend-api/SEED_DATA_DOCUMENTATION.md](backend-api/SEED_DATA_DOCUMENTATION.md)

### 🎯 Mục đích
Tạo **fake data** cho database MongoDB để test và development sử dụng thư viện `@faker-js/faker`.

### 🔧 Cách chạy
```bash
cd backend-api
npm run seed
```

### ⚙️ Logic chính

#### 1.1. Import Faker Vietnamese
```javascript
// File: backend-api/src/database/seeds/index.js (dòng 6-20)
const { fakerVI } = require('@faker-js/faker');
const faker = fakerVI;
faker.seed(20250127); // Seed cố định để tạo data giống nhau mỗi lần
```

#### 1.2. Tạo Major (Chuyên ngành)
```javascript
// 4 ngành cố định
const MAJORS = [
  { code: 'CE', name: 'Công nghệ thông tin' },
  { code: 'BA', name: 'Kinh tế' },
  { code: 'CA', name: 'Thiết kế đồ họa' },
  { code: 'SE', name: 'Kỹ thuật phần mềm' },
];
```

#### 1.3. Tạo Student Email (Logic quan trọng!)
```javascript
// File: backend-api/src/database/seeds/index.js (dòng 45-51)
function buildStudentEmail(fullName, majorCode, cohort, suffixNumber) {
  const parts = fullName.trim().split(/\s+/);
  const firstName = normalizeText(parts[parts.length - 1]); // Tên
  const initials = normalizeText(parts.slice(0, -1).map((p) => p[0]).join('')); // Chữ cái đầu họ đệm
  const major = majorCode.toLowerCase(); // ce, ba, ca, se
  const cohortText = String(cohort); // 16, 17, 18, 19, 20
  const suffix = String(suffixNumber).padStart(4, '0'); // 0001, 0002, ...
  return `${firstName}${initials}${major}${cohortText}${suffix}@fpt.edu.vn`;
}

// VD: Nguyen Van A, CE, K18, 1001
// → anguyenvance181001@fpt.edu.vn
```

#### 1.4. Tạo 50 Subjects (Môn học)
```javascript
// File: backend-api/src/database/seeds/index.js (dòng 200+)
for (let i = 1; i <= 50; i++) {
  const subject = new Subject({
    subjectCode: `SUB${String(i).padStart(3, '0')}`, // SUB001, SUB002, ...
    subjectName: faker.hacker.noun() + ' ' + faker.hacker.verb(), // "system deploy"
    credits: faker.number.int({ min: 2, max: 5 }), // Random 2-5 tín chỉ
    majorCode: randomFrom(['CE', 'BA', 'CA', 'SE']),
    tuitionFee: faker.number.int({ min: 1000000, max: 3000000 }),
  });
}
```

#### 1.5. Tạo 1000 Students
```javascript
// File: backend-api/src/database/seeds/index.js (dòng 300+)
for (let i = 1; i <= 1000; i++) {
  const majorCode = randomFrom(['CE', 'BA', 'CA', 'SE']);
  const cohort = randomFrom([16, 17, 18, 19, 20]);
  const fullName = faker.person.fullName();
  
  const student = new Student({
    studentCode: buildStudentCode(majorCode, cohort, i), // CE181001
    fullName: fullName,
    email: buildStudentEmail(fullName, majorCode, cohort, i),
    majorCode: majorCode,
    cohort: cohort,
  });
}
```

### 💡 Điểm quan trọng để nói với thầy
1. **Faker.js là thư viện tạo fake data tự động** - không cần nhập tay 1000 sinh viên
2. **Seed cố định (faker.seed)** - chạy nhiều lần vẫn ra data giống nhau để test
3. **Logic email thông minh** - tự động tạo email theo format FPT (tên + họ đầu + ngành + khóa)
4. **Tạo hết 1000 students, 100 teachers, 50 subjects** - đủ data để test

---

## 2. 🔌 SETUP SOCKET.IO

### 📂 File chính
- [backend-api/src/configs/socket.config.js](backend-api/src/configs/socket.config.js)
- [backend-api/src/middlewares/socket.middleware.js](backend-api/src/middlewares/socket.middleware.js)
- [backend-api/src/index.js](backend-api/src/index.js)

### 🎯 Mục đích
**Realtime communication** giữa server và client - gửi notification, chat, cập nhật dữ liệu realtime.

### ⚙️ Logic chính

#### 2.1. Khởi tạo Socket.IO Server
```javascript
// File: backend-api/src/configs/socket.config.js (dòng 5-18)
function initializeSocketIO(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: parseCorsOrigins(), // Cho phép frontend kết nối
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,  // 60s timeout
    pingInterval: 25000, // 25s ping
  });
  
  io.use(socketAuthMiddleware); // ✅ Bắt buộc có JWT token mới kết nối được
  // ...
}
```

#### 2.2. Socket Authentication Middleware
```javascript
// File: backend-api/src/middlewares/socket.middleware.js (dòng 3-15)
function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }
  
  const decoded = jwt.verify(token, JWT_SECRET); // ✅ Verify JWT token
  
  socket.userId = decoded.userId;   // Gán userId vào socket
  socket.email = decoded.email;     // Gán email vào socket
  socket.role = decoded.role;       // Gán role vào socket
  
  next(); // ✅ Cho phép kết nối
}
```

#### 2.3. Socket Events
```javascript
// File: backend-api/src/configs/socket.config.js (dòng 23-45)
io.on('connection', (socket) => {
  console.log(`🔌 New socket connection: ${socket.id}`);
  console.log(`   User: ${socket.email} (ID: ${socket.userId})`);
  
  // ✅ Tự động join room riêng cho user
  socket.join(`user:${socket.userId}`);
  
  // ✅ Gửi welcome message
  socket.emit('welcome', {
    message: 'Connected to SSMS Socket Server',
    userId: socket.userId,
    socketId: socket.id,
  });
  
  // ✅ Lắng nghe disconnect
  socket.on('disconnect', (reason) => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });
  
  // ✅ Lắng nghe ping/pong để test connection
  socket.on('ping', (data) => {
    socket.emit('pong', { message: 'pong', timestamp: Date.now() });
  });
});
```

#### 2.4. Utility Functions
```javascript
// File: backend-api/src/configs/socket.config.js (dòng 50-58)
// ✅ Gửi message tới 1 user cụ thể
io.sendToUser = function (userId, event, data) {
  io.to(`user:${userId}`).emit(event, data);
};

// ✅ Gửi message tới tất cả users (broadcast)
io.broadcastToAll = function (event, data) {
  io.emit(event, data);
};
```

### 💡 Điểm quan trọng để nói với thầy
1. **Socket.IO = WebSocket wrapper** - giúp realtime 2-way communication
2. **Bắt buộc authentication** - phải có JWT token mới kết nối được
3. **Room system** - mỗi user vào room riêng `user:userId` để nhận thông báo riêng
4. **2 cách gửi message:** `sendToUser()` (gửi 1 người) và `broadcastToAll()` (gửi tất cả)

---

## 3. ☁️ SETUP CLOUDINARY

### 📂 File chính
- [backend-api/src/external/cloudinary.provider.js](backend-api/src/external/cloudinary.provider.js)

### 🎯 Mục đích
**Upload và quản lý ảnh lên cloud** - không lưu ảnh trong server mà lưu lên Cloudinary.

### ⚙️ Logic chính

#### 3.1. Config Cloudinary
```javascript
// File: backend-api/src/external/cloudinary.provider.js (dòng 1-7)
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
```

#### 3.2. Upload Image Function
```javascript
// File: backend-api/src/external/cloudinary.provider.js (dòng 9-28)
async function uploadImage(filePath, options = {}) {
  const defaultOptions = {
    folder: 'ssms',           // ✅ Lưu trong folder "ssms"
    resource_type: 'image',   // ✅ Chỉ nhận image
    ...options,
  };
  
  const result = await cloudinary.uploader.upload(filePath, defaultOptions);
  
  return {
    url: result.url,                // ✅ URL public
    secure_url: result.secure_url,  // ✅ URL HTTPS
    public_id: result.public_id,    // ✅ ID để xóa sau này
    width: result.width,
    height: result.height,
    format: result.format,          // jpg, png, ...
  };
}
```

#### 3.3. Delete Image Function
```javascript
// File: backend-api/src/external/cloudinary.provider.js (dòng 30-42)
async function deleteImage(publicId) {
  const result = await cloudinary.uploader.destroy(publicId); // ✅ Xóa bằng publicId
  
  if (result.result === 'not found') {
    throw new Error('Image not found');
  }
  
  return result;
}

// ✅ Xóa nhiều ảnh 1 lúc
async function deleteImages(publicIds) {
  const result = await cloudinary.api.delete_resources(publicIds);
  return result;
}
```

### 💡 Điểm quan trọng để nói với thầy
1. **Cloudinary = Cloud storage cho ảnh** - không lưu ảnh trên server
2. **3 thông tin cần config:** cloud_name, api_key, api_secret (lấy từ Cloudinary account)
3. **Upload trả về URL** - lưu URL vào database, không lưu file
4. **Xóa ảnh cần publicId** - phải lưu publicId khi upload để xóa sau

---

## 4. 🔍 CHỨC NĂNG LỌC MÔN HỌC

### 📂 File chính

#### Backend:
- [backend-api/src/services/subject.service.js](backend-api/src/services/subject.service.js)
- [backend-api/src/controllers/subject.controller.js](backend-api/src/controllers/subject.controller.js)
- [backend-api/src/routes/subject.routes.js](backend-api/src/routes/subject.routes.js)

#### Frontend:
- [frontend-web/src/pages/admin/SubjectManagement.jsx](frontend-web/src/pages/admin/SubjectManagement.jsx)
- [frontend-web/src/services/subjectService.js](frontend-web/src/services/subjectService.js)

### 🎯 Tiêu chí lọc
1. **Keyword** - Tìm theo mã môn (subjectCode) hoặc tên môn (subjectName)
2. **Credits** - Lọc theo số tín chỉ (2, 3, 4, 5)
3. **Status** - Lọc theo trạng thái (active/inactive)

### ⚙️ Logic Backend

#### 4.1. Service Layer - getSubjects()
```javascript
// File: backend-api/src/services/subject.service.js (dòng 21-46)
async getSubjects({ page = 1, limit = 10, keyword = '' } = {}) {
  // ✅ Tạo query với regex (tìm kiếm không phân biệt hoa thường)
  const query = keyword
    ? {
        $or: [
          { subjectCode: { $regex: keyword, $options: 'i' } },
          { subjectName: { $regex: keyword, $options: 'i' } },
        ],
      }
    : {};
  
  // ✅ Tìm + phân trang
  const subjects = await Subject.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  
  const total = await Subject.countDocuments(query);
  
  return {
    data: subjects,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / limit),
  };
}
```

### ⚙️ Logic Frontend

#### 4.2. State Management
```javascript
// File: frontend-web/src/pages/admin/SubjectManagement.jsx
const [subjects, setSubjects] = useState([]);
const [filters, setFilters] = useState({
  keyword: '',   // Từ khóa tìm kiếm
  credits: '',   // Số tín chỉ
  status: '',    // Trạng thái
});
```

#### 4.3. Fetch Data từ API
```javascript
const fetchSubjects = async () => {
  setLoading(true);
  const params = {
    limit: 100,
    ...(filters.keyword && { search: filters.keyword }),    // ✅ Nếu có keyword thì thêm vào
    ...(filters.credits && { credits: filters.credits }),   // ✅ Nếu có credits thì thêm vào
    ...(filters.status && { status: filters.status }),      // ✅ Nếu có status thì thêm vào
  };
  
  const response = await subjectService.getSubjects(params);
  setSubjects(response.data.data || []);
  setLoading(false);
};
```

#### 4.4. Auto Fetch khi Filter thay đổi
```javascript
// ✅ Mỗi khi filters thay đổi → tự động gọi API
useEffect(() => {
  fetchSubjects();
}, [filters]);
```

#### 4.5. Update Filter
```javascript
const handleFilterChange = (key, value) => {
  setFilters(prev => ({
    ...prev,
    [key]: value,  // ✅ Cập nhật 1 filter cụ thể
  }));
};

// VD: handleFilterChange('credits', '3') → filters.credits = '3'
```

### 💡 Điểm quan trọng để nói với thầy
1. **Realtime search** - Mỗi khi gõ keyword hoặc chọn filter → tự động gọi API
2. **MongoDB regex** - Dùng `$regex` để tìm kiếm không phân biệt hoa thường
3. **useEffect dependency** - Khi `filters` thay đổi → chạy `fetchSubjects()`
4. **Conditional params** - Chỉ gửi params nào có giá trị (dùng spread operator)

---

## 5. 💰 CHỨC NĂNG XEM HỌC PHÍ

### 📂 File chính

#### Backend:
- [backend-api/src/services/tuitionFee.service.js](backend-api/src/services/tuitionFee.service.js)
- [backend-api/src/controllers/tuitionFee.controller.js](backend-api/src/controllers/tuitionFee.controller.js)
- [backend-api/src/models/tuitionFee.model.js](backend-api/src/models/tuitionFee.model.js)

#### Frontend:
- [frontend-web/src/pages/admin/TuitionFeeManagement.jsx](frontend-web/src/pages/admin/TuitionFeeManagement.jsx)
- [frontend-web/src/services/tuitionFeeService.js](frontend-web/src/services/tuitionFeeService.js)

### 🎯 Tính năng chính
1. **Xem Cards học phí** - Hiển thị cards theo kỳ học (Kỳ 1, Kỳ 2, ...)
2. **Filter theo Khóa & Ngành** - Chọn K20/K21/K22 và SE/AI/GD/IB
3. **Xem chi tiết môn học** - Click card → modal hiển thị list môn + học phí
4. **Quản lý Discount** - Thêm/xóa giảm giá (%, hoặc số tiền cố định)

### ⚙️ Logic Backend

#### 5.1. Service - getTuitionFees()
```javascript
// File: backend-api/src/services/tuitionFee.service.js (dòng 5-24)
exports.getTuitionFees = async ({ page = 1, limit = 10, cohort, majorCode, academicYear }) => {
  const query = {};
  
  if (cohort) query.cohort = cohort;         // ✅ Lọc theo khóa (K20, K21, K22)
  if (majorCode) query.majorCode = majorCode; // ✅ Lọc theo ngành (SE, AI, GD, IB)
  if (academicYear) query.academicYear = academicYear;
  
  const [data, total] = await Promise.all([
    TuitionFee.find(query)
      .sort({ academicYear: -1, semester: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    TuitionFee.countDocuments(query),
  ]);
  
  return { data, total, page, totalPages: Math.ceil(total / limit) };
};
```

#### 5.2. Service - addDiscount()
```javascript
// File: backend-api/src/services/tuitionFee.service.js (dòng 85-98)
exports.addDiscount = async (id, discountData) => {
  const tuitionFee = await TuitionFee.findById(id);
  
  // ✅ Thêm discount vào array
  tuitionFee.discounts.push(discountData);
  
  // ✅ Tính lại tổng discount
  tuitionFee.totalDiscount = tuitionFee.calculateTotalDiscount();
  
  // ✅ Tính lại học phí cuối
  tuitionFee.finalTuitionFee = tuitionFee.calculateFinalFee();
  
  await tuitionFee.save();
  return tuitionFee;
};
```

#### 5.3. Model - calculateTotalDiscount()
```javascript
// File: backend-api/src/models/tuitionFee.model.js
tuitionFeeSchema.methods.calculateTotalDiscount = function () {
  let total = 0;
  
  this.discounts.forEach(discount => {
    if (discount.type === 'percentage') {
      // ✅ Giảm theo %: baseFee * (5% = 0.05)
      total += this.baseTuitionFee * (discount.value / 100);
    } else {
      // ✅ Giảm số tiền cố định
      total += discount.value;
    }
  });
  
  return total;
};

tuitionFeeSchema.methods.calculateFinalFee = function () {
  // ✅ Học phí cuối = Học phí gốc - Tổng giảm giá
  return this.baseTuitionFee - this.totalDiscount;
};
```

### ⚙️ Logic Frontend

#### 5.4. State Management
```javascript
// File: frontend-web/src/pages/admin/TuitionFeeManagement.jsx
const [tuitionFees, setTuitionFees] = useState([]);
const [filters, setFilters] = useState({
  cohort: 'K20',    // Khóa mặc định
  majorCode: 'SE',  // Ngành mặc định
});
const [selectedTuitionFee, setSelectedTuitionFee] = useState(null);
const [isModalOpen, setIsModalOpen] = useState(false);
```

#### 5.5. Fetch Tuition Fees
```javascript
const fetchTuitionFees = async () => {
  const response = await tuitionFeeService.getTuitionFees({
    cohort: filters.cohort,
    majorCode: filters.majorCode,
    limit: 100,
  });
  setTuitionFees(response.data.data || []);
};

// ✅ Auto fetch khi filter thay đổi
useEffect(() => {
  fetchTuitionFees();
}, [filters]);
```

#### 5.6. Add Discount Handler
```javascript
const handleAddDiscount = async (discountData) => {
  await tuitionFeeService.addDiscount(selectedTuitionFee._id, discountData);
  
  // ✅ Refresh data
  await fetchTuitionFees();
  
  // ✅ Refresh modal
  const updated = await tuitionFeeService.getTuitionFeeById(selectedTuitionFee._id);
  setSelectedTuitionFee(updated.data);
};
```

### 💡 Điểm quan trọng để nói với thầy
1. **Tính học phí tự động** - Khi thêm discount → tự động tính lại `totalDiscount` và `finalTuitionFee`
2. **2 loại discount:** `percentage` (%) và `fixed` (số tiền cố định VNĐ)
3. **Card layout đẹp** - Hiển thị tổng quan học phí mỗi kỳ
4. **Modal chi tiết** - Click card → xem list môn học + quản lý discount
5. **Filter realtime** - Chọn khóa/ngành → tự động load dữ liệu mới

---

## 🎓 TÓM TẮT NHANH CHO THẦY (30 GIÂY)

### ✅ **Seed Data (Faker.js)**
- Tạo 1000 students, 100 teachers, 50 subjects tự động
- Email tự động theo format FPT (tên + họ đầu + ngành + khóa)
- Chạy `npm run seed` → có ngay data để test

### ✅ **Socket.IO**
- Realtime 2-way communication giữa server và client
- Bắt buộc JWT authentication → bảo mật
- Mỗi user vào room riêng → nhận notification riêng

### ✅ **Cloudinary**
- Upload ảnh lên cloud, không lưu trên server
- Trả về URL → lưu URL vào database
- Xóa ảnh bằng publicId

### ✅ **Filter Môn học**
- Tìm theo keyword (mã môn/tên môn) + tín chỉ + trạng thái
- MongoDB regex → tìm không phân biệt hoa thường
- useEffect → auto fetch khi filter thay đổi

### ✅ **Xem Học phí**
- Filter theo khóa (K20/K21/K22) + ngành (SE/AI/GD/IB)
- Xem cards tổng quan → click → modal chi tiết môn học
- Thêm/xóa discount (% hoặc VNĐ) → tự động tính lại học phí

---

## 📞 CÂU HỎI THẦY CÓ THỂ HỎI & CÁCH TRẢ LỜI

### **Q1: "Faker.js là gì? Tại sao dùng?"**
**A:** Faker.js là thư viện tạo fake data tự động thay vì nhập tay. Em dùng để tạo 1000 students, 100 teachers nhanh cho việc test. Có faker.seed() cố định nên mỗi lần chạy ra data giống nhau.

### **Q2: "Socket.IO dùng để làm gì?"**
**A:** Socket.IO giúp realtime 2-way communication. Em dùng JWT authentication nên chỉ user đăng nhập mới kết nối được. Mỗi user vào room riêng `user:userId` để nhận notification riêng.

### **Q3: "Cloudinary khác gì lưu ảnh trên server?"**
**A:** Cloudinary lưu ảnh trên cloud, không chiếm dung lượng server. Upload trả về URL, em lưu URL vào database. Xóa ảnh cần publicId nên phải lưu publicId khi upload.

### **Q4: "Filter môn học hoạt động thế nào?"**
**A:** Frontend có state `filters` (keyword, credits, status). Mỗi khi filters thay đổi, useEffect tự động gọi API. Backend dùng MongoDB regex `$regex` để tìm không phân biệt hoa thường.

### **Q5: "Học phí tính discount như thế nào?"**
**A:** Em có 2 loại discount: `percentage` (%) và `fixed` (VNĐ). Model có method `calculateTotalDiscount()` tính tổng discount, rồi `calculateFinalFee()` = baseFee - totalDiscount. Mỗi khi thêm/xóa discount thì tự động tính lại.

---

## ✨ KẾT LUẬN

Với 5 phút đọc tài liệu này, em có thể:
- ✅ Hiểu cách Faker.js tạo data tự động
- ✅ Hiểu Socket.IO setup và authentication flow
- ✅ Hiểu Cloudinary upload/delete image
- ✅ Giải thích logic filter môn học (regex, useEffect)
- ✅ Giải thích logic tính học phí & discount

**Chúc em tự tin trả lời thầy! 🚀**
