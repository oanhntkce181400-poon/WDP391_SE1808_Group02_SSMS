# 📌 CHEAT SHEET - CODE REFERENCES SIÊU NHANH

> **In file này ra để tham khảo khi trình bày!**

---

## 🔥 TOP 5 ĐOẠN CODE GIẢNG VIÊN HAY HỎI

### **1️⃣ AUTO-CALCULATE STATUS (QUAN TRỌNG NHẤT!) ⭐⭐⭐⭐⭐**
```
📁 src/services/registrationPeriod.service.js
📍 Line 18-26

const now = new Date();
let status = 'upcoming';
if (now >= startDate && now <= endDate) status = 'active';
else if (now > endDate) status = 'closed';
```

---

### **2️⃣ SCHEMA VALIDATION ⭐⭐⭐⭐⭐**
```
📁 src/models/registrationPeriod.model.js
📍 Line 72-79

registrationPeriodSchema.pre('save', function (next) {
  if (this.endDate <= this.startDate) {
    next(new Error('Ngày kết thúc phải sau ngày bắt đầu'));
  } else {
    next();
  }
});
```

---

### **3️⃣ TRANSACTION (3 BƯỚC) ⭐⭐⭐⭐⭐**
```
📁 src/services/student.service.js
📍 Line 151-198

const session = await mongoose.startSession();
session.startTransaction();
try {
  await User.create([{...}], { session });
  await Student.create([{...}], { session });
  await Wallet.create([{...}], { session });
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
}
```

---

### **4️⃣ PROMISE.ALL() - PARALLEL QUERIES ⭐⭐⭐⭐**
```
📁 src/services/student.service.js
📍 Line 257-266

const [students, total] = await Promise.all([
  Student.find(query).skip(skip).limit(limit).lean(),
  Student.countDocuments(query)
]);
```

---

### **5️⃣ DYNAMIC QUERY BUILDER ⭐⭐⭐⭐**
```
📁 src/services/student.service.js
📍 Line 230-245

const query = { isActive: true };
if (majorCode) query.majorCode = majorCode;
if (search) {
  query.$or = [
    { studentCode: { $regex: search, $options: 'i' } },
    { fullName: { $regex: search, $options: 'i' } }
  ];
}
```

---

## 📊 QUICK TABLE - 7 CHỨC NĂNG

| UC | Controller | Service | Line | Key Feature |
|----|-----------|---------|------|-------------|
| **UC01** | student.controller.js:36 | student.service.js:213 | 257-266 | Promise.all() |
| **UC02** | (same UC01) | (same UC01) | 230-245 | Dynamic Query |
| **UC03** | student.controller.js:12 | student.service.js:95 | 151-198 | Transaction ⭐ |
| **UC04** | student.controller.js:97 | student.service.js:315 | 410 | Soft Delete |
| **UC05** | registrationPeriod.controller.js:32 | registrationPeriod.service.js:42 | - | Query + Sort |
| **UC06** | registrationPeriod.controller.js:9 | registrationPeriod.service.js:9 | **18-26** ⭐ | **Auto Status** |
| **UC07** | registrationPeriod.controller.js | registrationPeriod.service.js:116 | 124-129 | Status Validation |

---

## 🎯 KHI GIẢNG VIÊN HỎI...

### **"Giải thích logic set thời gian mở/đóng?"**
→ Mở `registrationPeriod.service.js` line 18-26  
→ Giải thích: "Em tính status tự động dựa trên now so với startDate/endDate"

### **"Validation ở đâu?"**
→ Mở `registrationPeriod.model.js` line 72-79  
→ Giải thích: "Em có validation ở schema level: endDate phải > startDate"

### **"Transaction hoạt động thế nào?"**
→ Mở `student.service.js` line 151-198  
→ Giải thích: "Em dùng MongoDB session, startTransaction → 3 creates → commit/abort"

### **"Tại sao dùng Promise.all()?"**
→ Mở `student.service.js` line 257-266  
→ Giải thích: "2 queries không phụ thuộc nhau, chạy song song giảm 33% thời gian"

### **"Soft delete ở đâu?"**
→ Mở `student.service.js` line 410  
→ Giải thích: "Em set isActive = false thay vì xóa thật, có thể restore"

---

## 🚀 CÁCH MỞ CODE NHANH TRONG VS CODE

1. Press `Ctrl+P`
2. Type tên file (VD: "registration")
3. Press `Enter`
4. Press `Ctrl+G`
5. Type line number (VD: "18")
6. Press `Enter`

**Example:**
- `Ctrl+P` → "registrationPeriod.service" → `Enter`
- `Ctrl+G` → "18" → `Enter`
- → Jump to auto-calculate status code!

---

## 📂 5 FILES MỞ SẰNG

1. ✅ `src/services/registrationPeriod.service.js` - Auto status
2. ✅ `src/models/registrationPeriod.model.js` - Validation
3. ✅ `src/services/student.service.js` - Transaction + Pagination
4. ✅ `src/controllers/student.controller.js` - Controller pattern
5. ✅ `src/middlewares/auth.middleware.js` - JWT verify

**Tip:** Mở 2 splits trong VS Code:
- Split trái: Documentation files
- Split phải: Code gốc (5 files trên)

---

## 💬 CÂU TRẢ LỜI MẪU (COPY & PASTE)

### **Q: "Code ở file nào?"**
**A:** "Thưa thầy/cô, code này ở file `src/services/registrationPeriod.service.js` line 18-26. Em show luôn ạ (Ctrl+P → registrationPeriod.service → Ctrl+G → 18)"

### **Q: "Validation ở đâu?"**
**A:** "Thưa thầy/cô, em validate ở 2 chỗ: Frontend check UX, và MongoDB schema level ở `src/models/registrationPeriod.model.js` line 72-79 để ensure data integrity"

### **Q: "Tại sao tính status tự động?"**
**A:** "Thưa thầy/cô, nếu admin manual chọn có thể sai. Ví dụ tạo period tháng sau nhưng chọn 'active' → sai logic. Em tính tự động dựa trên dates thì luôn đúng và consistent"

---

## 🎤 SCRIPT SIÊU NGẮN (30 GIÂY)

> "Em implement chức năng Create Registration Period cho admin set thời gian mở/đóng. Khi admin nhập **startDate** và **endDate**, hệ thống tự động tính **status**: nếu chưa đến startDate → 'upcoming', đang trong khoảng → 'active', đã qua endDate → 'closed'. Em có **validation ở schema level**: endDate phải sau startDate để đảm bảo data integrity. Code ở `registrationPeriod.service.js` line 18 và validation ở `registrationPeriod.model.js` line 72."

---

## ✅ CHECKLIST TRƯỚC TRÌNH BÀY

- [ ] Mở sẵn 5 files code quan trọng
- [ ] Test Ctrl+P và Ctrl+G một lần
- [ ] Đọc qua 5 đoạn code top
- [ ] Nhớ line numbers: 18-26, 72-79, 151-198, 257-266, 230-245
- [ ] Practice câu trả lời mẫu 2 lần

---

**🎯 In file này ra và để bên cạnh khi trình bày!**
