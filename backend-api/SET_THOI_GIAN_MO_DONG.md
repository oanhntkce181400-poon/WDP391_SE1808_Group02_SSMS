# ⏰ LOGIC SET THỜI GIAN MỞ/ĐÓNG ĐĂNG KÝ - TÓM TẮT SIÊU NHANH

> **Đọc trong 3 phút** - Hiểu rõ cách hệ thống xử lý thời gian mở/đóng đợt đăng ký

---

## 🎯 KHÁI NIỆM CƠ BẢN

**Registration Period** là đợt đăng ký môn học, có 2 thời điểm quan trọng:
- **startDate**: Thời gian BẮT ĐẦU cho phép sinh viên đăng ký
- **endDate**: Thời gian ĐÓNG đăng ký (sau đó sinh viên không thể đăng ký nữa)

**Ví dụ:**
```
Đợt đăng ký học kỳ Spring 2025:
  startDate: 2025-03-01 00:00:00  ← Mở đăng ký từ 1/3
  endDate:   2025-03-15 23:59:59  ← Đóng đăng ký lúc 23:59 ngày 15/3
  
Timeline:
  28/02 → Chưa mở (upcoming)
  05/03 → Đang mở (active)
  16/03 → Đã đóng (closed)
```

---

## 🔄 FLOW KHI ADMIN TẠO PERIOD

```
┌────────────────────────────────────────────────────────────────┐
│ BƯỚC 1: Admin điền form                                        │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Tên: "Đăng ký học kỳ Spring 2025"                            │
│  Ngày mở: 2025-03-01 00:00:00      ← Admin chọn date picker  │
│  Ngày đóng: 2025-03-15 23:59:59    ← Admin chọn date picker  │
│  Khóa: [18, 19, 20]                                           │
│  Mô tả: "Đợt đăng ký cho các khóa 18, 19, 20"                │
│                                                                │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 │ Click "Tạo đợt đăng ký"
                 ▼
┌────────────────────────────────────────────────────────────────┐
│ BƯỚC 2: Frontend gửi request                                   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  POST /api/registration-periods                                │
│  Body: {                                                       │
│    periodName: "Đăng ký học kỳ Spring 2025",                  │
│    startDate: "2025-03-01T00:00:00.000Z",                     │
│    endDate: "2025-03-15T23:59:59.000Z",                       │
│    allowedCohorts: [18, 19, 20]                               │
│  }                                                             │
│                                                                │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────────┐
│ BƯỚC 2.5: Router định tuyến                                    │
│ 📁 FILE: src/routes/registrationPeriod.routes.js              │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  router.post('/registration-periods',                         │
│    authMiddleware.verifyToken,                                │
│    rbacMiddleware.checkPermission('create_period'),           │
│    registrationPeriodController.createPeriod                  │
│  );                                                            │
│                                                                │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 ▼                
┌────────────────────────────────────────────────────────────────┐
│ BƯỚC 2.6: Controller nhận request                              │
│ 📁 FILE: src/controllers/registrationPeriod.controller.js     │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  const createPeriod = async (req, res) => {                   │
│    const userId = req.auth.sub;                               │
│    const payload = req.body;                                  │
│                                                                │
│    const period = await registrationPeriodService             │
│      .createRegistrationPeriod(payload, userId);              │
│                                                                │
│    return res.status(201).json({ ... });                     │
│  };                                                            │
│                                                                │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────────┐
│ BƯỚC 3: Backend validation (MongoDB Schema)                    │
│ 📁 FILE: src/models/registrationPeriod.model.js               │
│ 📍 LINE: ~72-79                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  registrationPeriodSchema.pre('save', function (next) {       │
│    if (this.endDate <= this.startDate) {                      │
│      ❌ REJECT: "Ngày kết thúc phải sau ngày bắt đầu"         │
│    } else {                                                    │
│      ✅ OK: Cho phép save                                      │
│    }                                                           │
│  });                                                           │
│                                                                │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 │ ✅ Validation passed
                 ▼
┌────────────────────────────────────────────────────────────────┐
│ BƯỚC 4: Auto-calculate status                                  │
│ 📁 FILE: src/services/registrationPeriod.service.js           │
│ 📍 LINE: ~18-26                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  const now = new Date();  // 2025-02-24                       │
│  let status = 'upcoming'; // Default                          │
│                                                                │
│  if (now >= startDate && now <= endDate) {                    │
│    status = 'active';   // Đang trong khoảng                  │
│  } else if (now > endDate) {                                  │
│    status = 'closed';   // Đã qua endDate                     │
│  }                                                             │
│  // else: giữ nguyên 'upcoming' (chưa đến startDate)          │
│                                                                │
│  → Result: status = "upcoming"                                 │
│    (vì 02/24 < 03/01)                                         │
│                                                                │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────────┐
│ BƯỚC 5: Save vào database                                      │
│ 📁 FILE: src/services/registrationPeriod.service.js           │
│ 📍 LINE: ~28-37                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  await RegistrationPeriod.create({                             │
│    periodName: "Đăng ký học kỳ Spring 2025",                  │
│    startDate: "2025-03-01T00:00:00.000Z",                     │
│    endDate: "2025-03-15T23:59:59.000Z",                       │
│    allowedCohorts: [18, 19, 20],                              │
│    status: "upcoming",  ← Tự động tính toán                   │
│    createdBy: adminId                                          │
│  });                                                           │
│                                                                │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 │ Success
                 ▼
┌────────────────────────────────────────────────────────────────┐
│ BƯỚC 6: Response về client                                     │
│ 📁 FILE: src/controllers/registrationPeriod.controller.js     │
│ 📍 LINE: ~17-20                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  {                                                             │
│    success: true,                                              │
│    message: "Tạo đợt đăng ký thành công",                     │
│    data: {                                                     │
│      _id: "65def789...",                                       │
│      periodName: "Đăng ký học kỳ Spring 2025",                │
│      startDate: "2025-03-01T00:00:00.000Z",                   │
│      endDate: "2025-03-15T23:59:59.000Z",                     │
│      allowedCohorts: [18, 19, 20],                            │
│      status: "upcoming"  ← Hiển thị trên UI                   │
│    }                                                           │
│  }                                                             │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 🧠 LOGIC TỰ ĐỘNG TÍNH STATUS

### 📁 **FILE: `src/services/registrationPeriod.service.js`**
### 📍 **LINE: 18-26** (trong function `createRegistrationPeriod`)

**Code thực tế:**
```javascript
const now = new Date();  // Thời gian hiện tại
let status = 'upcoming'; // Mặc định

if (now >= startDate && now <= endDate) {
  status = 'active';   // Đang diễn ra
} else if (now > endDate) {
  status = 'closed';   // Đã kết thúc
}
// else: giữ nguyên 'upcoming' (chưa bắt đầu)
```

**✅ Để check code gốc:**
1. Mở file `src/services/registrationPeriod.service.js`
2. Tìm function `createRegistrationPeriod` (line ~9)
3. Logic tính status ở line 18-26

**Minh họa timeline:**

```
════════════════════════════════════════════════════════════════

        NOW          startDate                     endDate
         │               │                             │
         │               │                             │
         ▼               ▼                             ▼
─────────●───────────────●─────────────────────────────●────────→
         │               │                             │
         │               │                             │
    ┌────┴─────┐    ┌────┴─────┐                 ┌────┴─────┐
    │ upcoming │    │  active  │                 │  closed  │
    └──────────┘    └──────────┘                 └──────────┘

════════════════════════════════════════════════════════════════
```

**3 trường hợp:**

| Thời gian hiện tại | startDate | endDate | Status |
|-------------------|-----------|---------|---------|
### 📁 **FILE: `src/models/registrationPeriod.model.js`**
### 📍 **LINE: 72-79** (pre-save hook)

**Code validation (MongoDB Schema):**
```javascript
registrationPeriodSchema.pre('save', function (next) {
  if (this.endDate <= this.startDate) {
    // ❌ REJECT: endDate không được trước hoặc bằng startDate
    next(new Error('Ngày kết thúc phải sau ngày bắt đầu'));
  } else {
    // ✅ OK
    next();
  }
});
```

**✅ Để check code gốc:**
1. Mở file `src/models/registrationPeriod.model.js`
2. Scroll xuống cuối file
3. Pre-save validation ở line 72-79f (this.endDate <= this.startDate) {
    // ❌ REJECT: endDate không được trước hoặc bằng startDate
    next(new Error('Ngày kết thúc phải sau ngày bắt đầu'));
  } else {
    // ✅ OK
    next();
  }
});
```

**Ví dụ validation:**

| startDate | endDate | Result |
|-----------|---------|--------|
| 2025-03-01 | 2025-02-28 | ❌ Error: "Ngày kết thúc phải sau ngày bắt đầu" |
| 2025-03-01 | 2025-03-01 | ❌ Error: "Ngày kết thúc phải sau ngày bắt đầu" |
| 2025-03-01 | 2025-03-15 | ✅ OK: Cho phép tạo |

→ **Đây là validation ở database level** - Last defense, không thể bypass!

---

## 🎯 3 ĐIỂM MẠNH

### **1. Auto-Calculate Status**
- ✅ **Không cần admin manual chọn**: Status tự động tính toán
- ✅ **Luôn đúng**: Dựa trên logic rõ ràng
- ✅ **Instant feedback**: Tạo xong biết ngay status

### **2. Database-Level Validation**
- ✅ **Cannot bypass**: Dù validate ở client/service, đây là check cuối
- ✅ **Data integrity**: DB luôn có data hợp lệ
- ✅ **Simple logic**: 1 if statement dễ hiểu

### **3. Clear Business Logic**
- ✅ **Easy to understand**: 3 if statements, ai cũng hiểu
- ✅ **Easy to maintain**: Sửa logic chỉ 1 chỗ
- ✅ **No magic**: Không có hidden logic

---

## 🔍 DEMO SCENARIOS

### **Scenario 1: Tạo period cho tương lai**
```javascript
Input:
  now: 2025-02-24
  startDate: 2025-03-01
  endDate: 2025-03-15

Process:
  now < startDate → status = "upcoming"

Output:
  {
    periodName: "Đăng ký Spring 2025",
    startDate: "2025-03-01T00:00:00.000Z",
    endDate: "2025-03-15T23:59:59.000Z",
    status: "upcoming"  ← Sắp diễn ra
  }
```

---

### **Scenario 2: Tạo period đang diễn ra**
```javascript
Input:
  now: 2025-03-05
  startDate: 2025-03-01
  endDate: 2025-03-15

Process:
  startDate ≤ now ≤ endDate → status = "active"

Output:
  {
    periodName: "Đăng ký Spring 2025",
    startDate: "2025-03-01T00:00:00.000Z",
    endDate: "2025-03-15T23:59:59.000Z",
    status: "active"  ← Đang mở
  }
```

---

### **Scenario 3: Validation fail - endDate trước startDate**
```javascript
Input:
  startDate: 2025-03-15
  endDate: 2025-03-01  ← SAI: endDate < startDate

Process:
  MongoDB pre-save validation:
    if (endDate <= startDate) → REJECT

Output:
  ❌ Error: {
    success: false,
    message: "Ngày kết thúc phải sau ngày bắt đầu"
  }
```

---

## 💬 TRẢ LỜI GIẢNG VIÊN

**Q: "Tại sao tính status ngay khi tạo, không để admin chọn?"**

**A:**
```
"Thưa thầy/cô, em tự động tính status có 3 lý do:

1. ✅ CHÍNH XÁC: Admin có thể nhầm lẫn. Ví dụ tạo period 
   cho tháng sau nhưng chọn status là 'active' → Sai logic

2. ✅ NHẤT QUÁN: Logic tính toán dựa trên dates, không thay đổi,
   dễ maintain. Còn nếu manual thì mỗi admin chọn khác nhau

3. ✅ ĐƠN GIẢN: Chỉ 3 if-statements, code rất clean. Admin chỉ 
   cần focus vào dates, status lo tự động

Trade-off: Mất khả năng admin force status khác, nhưng đổi lại 
được consistency và correctness."
```

---

**Q: "Validation ở schema level có cần thiết không? Đã validate ở frontend rồi?"**

**A:**
```
"Thưa thầy/cô, validation ở schema level RẤT CẦN THIẾT:

1. ✅ LAST DEFENSE: Frontend validation có thể bypass (disable JS,
   dùng Postman, hack). Schema validation là check cuối cùng

2. ✅ DATA INTEGRITY: Đảm bảo database KHÔNG BAO GIỜ có data sai.
   Nguyên tắc: Never trust client input

3. ✅ MULTI-LAYER VALIDATION:
   - Frontend: UX, instant feedback
   - Backend service: Business logic check
   - Schema: Database level, cannot bypass

Best practice: Validate ở MỌI LAYER!"
```

---

**Q: "Status tự động thay đổi theo thời gian sao?"**

**A:**
```
"Thưa thầy/cô, em có 2 chỗ tính status:

1. KHI TẠO PERIOD: Tính status ban đầu dựa trên dates
   → Lưu vào DB

2. KHI VIEW PERIOD: Tính lại status realtime dựa trên dates
   → Return cho client
   (Giống như chức năng View Registration Period em đã trình bày)

Lợi ích: Status LUÔN CHÍNH XÁC, không cần cron job update.

Ví dụ:
- Tạo ngày 24/02 → status = 'upcoming' → Save DB
- View ngày 05/03 → Tính lại → status = 'active' → Return client
- View ngày 20/03 → Tính lại → status = 'closed' → Return client

Code chỉ tốn ~0.1ms nhưng đảm bảo 100% accuracy!"
```

---

## 📝 TÓM TẮT SIÊU NGẮN (30 GIÂY)

**Khi admin tạo đợt đăng ký:**
1. Admin chọn **startDate** và **endDate** qua date picker
2. Backend **validate** endDate phải sau startDate (schema level)
3. Backend **tự động tính status** dựa trên thời gian hiện tại:
   - Chưa đến startDate → `upcoming`
   - Đang trong khoảng → `active`
   - Đã qua endDate → `closed`
4. Save vào database với status đã tính
5. Response về client để hiển thị

**3 điểm mạnh:** Auto-calculate status, Database validation, Clear business logic

---

## 🎯 1 CÂU NHỚ THUỘC

**"Em set thời gian mở/đóng bằng startDate và endDate, validate ở schema level để endDate phải sau startDate, và tự động tính status khi tạo dựa trên thời gian hiện tại so với 2 dates đó."**

→ Câu này đủ để giảng viên hiểu logic!

---

**File này tóm tắt toàn bộ logic set thời gian. Đọc 3 phút là hiểu rõ! 🚀**
