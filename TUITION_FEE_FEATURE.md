# 💰 Tính năng Học phí Môn học

## Tổng quan
Đã thêm field **học phí (tuitionFee)** cho mỗi môn học với công thức:
```
Học phí = Số tín chỉ × 630.000 VNĐ
```

## ✅ Đã hoàn thành

### 1. Backend
- ✅ Thêm field `tuitionFee` vào Subject Model
- ✅ Script seed data với Faker.js
- ✅ Đã seed 50 môn học có giá lên MongoDB Atlas
- ✅ API tự động trả về field tuitionFee

### 2. Frontend  
- ✅ Hiển thị cột "Học phí" trong bảng danh sách
- ✅ Format giá tiền theo chuẩn Việt Nam (VNĐ)
- ✅ Hiển thị giá rút gọn (tr = triệu)
- ✅ Tự động tính giá nếu backend chưa có

### 3. Database
- ✅ 50 môn học đã được seed lên Atlas
- ✅ Mỗi môn có giá theo công thức

## 📊 Bảng giá theo tín chỉ

| Tín chỉ | Học phí | Rút gọn |
|---------|---------|---------|
| 1 | 630.000 VNĐ | 0.6tr |
| 2 | 1.260.000 VNĐ | 1.3tr |
| 3 | 1.890.000 VNĐ | 1.9tr |
| 4 | 2.520.000 VNĐ | 2.5tr |
| 5 | 3.150.000 VNĐ | 3.2tr |
| 6 | 3.780.000 VNĐ | 3.8tr |

## 🔧 Files đã thay đổi

### Backend
```
backend-api/
├── src/
│   ├── models/
│   │   └── subject.model.js (UPDATED - thêm field tuitionFee)
│   └── database/
│       └── seeds/
│           ├── seedSubjectsWithPrices.js (NEW - seed với Faker)
│           └── updateSubjectPrices.js (NEW - update giá cho data cũ)
```

### Frontend
```
frontend-web/
└── src/
    ├── components/
    │   └── features/
    │       └── SubjectList.jsx (UPDATED - hiển thị cột giá)
    └── pages/
        └── admin/
            └── SubjectManagement.jsx (UPDATED - map tuitionFee)
```

## 🚀 Cách sử dụng

### 1. Xem danh sách môn học với giá
Truy cập: `http://localhost:5174/admin/subjects`

Bạn sẽ thấy:
- Cột "Học phí" mới
- Giá tiền format đẹp: `1.890.000 VNĐ`
- Giá rút gọn: `1.9tr`

### 2. Seed thêm môn học
```bash
cd backend-api
node src/database/seeds/seedSubjectsWithPrices.js 100
```
Sẽ tạo 100 môn học mới với giá tiền

### 3. Update giá cho môn học cũ
Nếu có môn học cũ chưa có giá:
```bash
cd backend-api
node src/database/seeds/updateSubjectPrices.js
```

## 📊 Thống kê Data hiện tại

Sau khi seed:
```
✅ 50 môn học đã có trên Atlas
📈 Phân bố:
   1 tín chỉ: 10 môn - 630.000 VNĐ
   2 tín chỉ: 7 môn - 1.260.000 VNĐ
   3 tín chỉ: 9 môn - 1.890.000 VNĐ
   4 tín chỉ: 8 môn - 2.520.000 VNĐ
   5 tín chỉ: 6 môn - 3.150.000 VNĐ
   6 tín chỉ: 10 môn - 3.780.000 VNĐ
```

## 💡 Ví dụ môn học

```javascript
{
  subjectCode: "SE586",
  subjectName: "Introduction to Testing",
  credits: 4,
  tuitionFee: 2520000, // 4 × 630,000
  majorCodes: ["IB"],
  isCommon: false
}

{
  subjectCode: "AI404",
  subjectName: "Principles of Neural Networks",
  credits: 3,
  tuitionFee: 1890000, // 3 × 630,000
  majorCodes: ["CS"],
  isCommon: false
}
```

## 🎯 Chi tiết kỹ thuật

### Model Schema
```javascript
const subjectSchema = new mongoose.Schema({
  subjectCode: { type: String, required: true, unique: true },
  subjectName: { type: String, required: true },
  credits: { type: Number, required: true },
  tuitionFee: { type: Number, default: 0 }, // NEW FIELD
  majorCode: { type: String },
  majorCodes: [{ type: String }],
  isCommon: { type: Boolean, default: false },
  prerequisites: [prerequisiteSchema],
}, { timestamps: true });
```

### Frontend Display
```jsx
<td className="px-6 py-5 text-sm">
  <div className="flex flex-col">
    <span className="text-slate-900 dark:text-white font-semibold">
      {subject.tuitionFee.toLocaleString('vi-VN')} VNĐ
    </span>
    <span className="text-xs text-slate-500 dark:text-slate-400">
      {(subject.credits * 630000 / 1000000).toFixed(1)}tr
    </span>
  </div>
</td>
```

### Seed Script với Faker
```javascript
const { faker } = require('@faker-js/faker');

const credits = faker.helpers.arrayElement([1, 2, 3, 4, 5, 6]);
const tuitionFee = credits * 630000;
const subjectName = generateSubjectName(department);
const subjectCode = generateSubjectCode(department);
```

## 🔄 Migration Data

Nếu cần update data cũ:
1. Script tự động tính giá dựa trên số tín chỉ
2. Update toàn bộ môn học trên Atlas
3. Không cần manual update

## 🎨 UI Features

### Hiển thị giá
- **Chính**: Giá đầy đủ với VNĐ (1.890.000 VNĐ)
- **Phụ**: Giá rút gọn triệu (1.9tr)
- **Format**: Locale Việt Nam với dấu phẩy
- **Dark mode**: Tự động adjust màu

### Responsive
- Desktop: Hiển thị đầy đủ 2 dòng
- Mobile: Tự động wrap
- Tablet: Vừa vặn

## 📝 Notes

### Tại sao 630.000 VNĐ/tín chỉ?
- Đây là mức học phí trung bình phổ biến
- Có thể điều chỉnh trong constant `PRICE_PER_CREDIT`
- Database đã lưu cứng, nếu đổi cần re-seed

### Tùy chỉnh giá
Nếu muốn môn học có giá khác công thức:
1. Update trực tiếp trong database
2. Hoặc thêm field `customPrice` boolean
3. Frontend sẽ ưu tiên giá custom

### Future Enhancements
- [ ] Admin có thể tùy chỉnh giá từng môn
- [ ] Lịch sử thay đổi giá
- [ ] Giá khác nhau theo học kỳ
- [ ] Giảm giá/học bổng
- [ ] Tổng học phí theo chương trình đào tạo

## 🐛 Troubleshooting

### Không hiển thị giá?
1. Check API response có field `tuitionFee` không
2. Kiểm tra frontend mapping
3. Clear cache và reload

### Giá sai?
1. Verify công thức: credits × 630,000
2. Check database data
3. Re-run seed script nếu cần

### Môn học cũ không có giá?
```bash
node src/database/seeds/updateSubjectPrices.js
```

---

**Developer**: Finance Feature Team  
**Date**: 28/01/2026  
**Status**: ✅ Complete  
**Database**: MongoDB Atlas (50 subjects seeded)
