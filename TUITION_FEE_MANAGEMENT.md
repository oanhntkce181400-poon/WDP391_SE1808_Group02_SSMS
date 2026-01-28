# 💰 Chức năng Quản lý Học phí (Tuition Fee Management)

## ✅ Hoàn thành

### Backend
- ✅ **TuitionFee Model** - Schema MongoDB cho học phí
- ✅ **Routes & Controllers** - API endpoints đầy đủ
- ✅ **Service Layer** - Logic xử lý học phí
- ✅ **Seed Data** - 96 học phí mẫu (3 khóa × 4 ngành × 8 kỳ)

### Frontend
- ✅ **TuitionFeeManagement Page** - Trang quản lý chính
- ✅ **TuitionFeeCard Component** - Card hiển thị học phí (giống Cohorts & Rates)
- ✅ **TuitionFeeModal Component** - Modal chi tiết + quản lý discount
- ✅ **Menu "Học phí"** trong navbar (kế bên "Khung chương trình")

## 🎯 Tính năng

### 1. Hiển thị Cards theo Kỳ học
- Card layout đẹp mắt giống ảnh Cohorts & Rates
- Hiển thị: Khóa, Kỳ, Ngành, Năm học
- Học phí gốc, giảm giá, học phí cuối
- Badge status (Active/Draft/Archived)
- Số tín chỉ & số môn học

### 2. Click vào Card → Modal Chi tiết
- **Danh sách môn học đầy đủ**:
  - Bảng table với mã môn, tên, tín chỉ, học phí
  - Footer tổng hợp
  
- **Summary Cards**:
  - Học phí gốc (xanh dương)
  - Tổng giảm giá (xanh lá)
  - Học phí cuối (tím)

- **Quản lý Discount**:
  - Thêm giảm giá (percentage hoặc fixed amount)
  - Xóa giảm giá
  - Hiển thị danh sách discount đẹp mắt

### 3. Filter theo Khóa & Ngành
- Dropdown chọn khóa: K20, K21, K22
- Dropdown chọn ngành: SE, AI, GD, IB
- Tự động load lại khi thay đổi

## 📊 Dữ liệu hiện có

### Database (MongoDB Atlas)
```
✅ 96 tuition fees
- 3 khóa: K20, K21, K22
- 4 ngành: SE, AI, GD, IB  
- 8 kỳ/ngành
- Mỗi kỳ 5-7 môn học
- Có discounts ngẫu nhiên (Early Bird, Full Payment, Alumni)
```

### Ví dụ dữ liệu:
```javascript
{
  semester: "Kỳ 1",
  cohort: "K20",
  academicYear: "2023-2024",
  majorCode: "SE",
  totalCredits: 13,
  baseTuitionFee: 8190000,  // VNĐ
  discounts: [
    { name: "Early Bird", type: "percentage", value: 5 },
    { name: "Full Payment", type: "percentage", value: 10 }
  ],
  totalDiscount: 1228500,  // VNĐ
  finalTuitionFee: 6961500,  // VNĐ
  subjects: [/* 5-7 môn */]
}
```

## 🚀 Cách sử dụng

### 1. Truy cập trang
```
URL: http://localhost:5174/admin/tuition-fees
```

### 2. Xem học phí các kỳ
- Chọn khóa (K20/K21/K22) và ngành (SE/AI/GD/IB)
- Xem danh sách cards các kỳ học
- Mỗi card hiển thị tổng quan học phí

### 3. Xem chi tiết & quản lý discount
- Click "Xem chi tiết" trên card
- Modal hiển thị:
  - List tất cả môn học kỳ đó
  - Summary tiền
  - Quản lý discount

### 4. Thêm discount
- Click "+ Thêm giảm giá"
- Chọn loại: Phần trăm (%) hoặc Số tiền cố định (VNĐ)
- Nhập tên (VD: Early Bird -5%)
- Nhập giá trị
- Click "Thêm"

### 5. Xóa discount
- Click icon thùng rác bên cạnh discount
- Confirm xóa

## 🎨 UI/UX Features

### Card Design (giống Cohorts & Rates)
```
┌─────────────────────────────────────┐
│ 👥 K20 - Kỳ 1         [ACTIVE]     │
│ SE • 2023-2024                      │
│                                     │
│ HỌC PHÍ CƠ BẢN                      │
│ 8.190.000 VNĐ                       │
│ 13 tín chỉ • 5 môn học              │
│                                     │
│ GIẢM GIÁ                            │
│ ○ Early Bird: -5%                   │
│ ○ Full Payment: -10%                │
│ Tổng giảm: -1.228.500 VNĐ           │
│                                     │
│ Học phí cuối: 6.961.500 VNĐ         │
│                                     │
│ [    Xem chi tiết    ]              │
└─────────────────────────────────────┘
```

### Modal Layout
```
┌─────────────────────────────────────────────┐
│ K20 - Kỳ 1                            [×]   │
│ SE • 2023-2024                              │
├─────────────────────────────────────────────┤
│                                             │
│ ┌──────┐  ┌──────┐  ┌──────┐              │
│ │ 8.2M │  │-1.2M │  │ 7.0M │              │
│ │ Gốc  │  │Giảm  │  │Cuối  │              │
│ └──────┘  └──────┘  └──────┘              │
│                                             │
│ DANH SÁCH MÔN HỌC (5)                       │
│ ┌───┬──────────────┬────┬─────────┐        │
│ │MÃ │ TÊN          │TC  │ HỌC PHÍ │        │
│ ├───┼──────────────┼────┼─────────┤        │
│ │...│ ...          │... │  ...    │        │
│ └───┴──────────────┴────┴─────────┘        │
│                                             │
│ GIẢM GIÁ            [+ Thêm giảm giá]      │
│ ○ Early Bird -5%                      [🗑]  │
│ ○ Full Payment -10%                   [🗑]  │
│                                             │
└─────────────────────────────────────────────┘
```

## 📁 Files Structure

### Backend
```
backend-api/
├── src/
│   ├── models/
│   │   └── tuitionFee.model.js         (NEW)
│   ├── controllers/
│   │   └── tuitionFee.controller.js    (NEW)
│   ├── services/
│   │   └── tuitionFee.service.js       (NEW)
│   ├── routes/
│   │   └── tuitionFee.routes.js        (NEW)
│   ├── database/
│   │   └── seeds/
│   │       └── seedTuitionFees.js      (NEW)
│   └── index.js                        (UPDATED)
```

### Frontend
```
frontend-web/
├── src/
│   ├── pages/
│   │   └── admin/
│   │       └── TuitionFeeManagement.jsx (NEW)
│   ├── components/
│   │   ├── features/
│   │   │   ├── TuitionFeeCard.jsx       (NEW)
│   │   │   └── TuitionFeeModal.jsx      (NEW)
│   │   └── layout/
│   │       └── Header.jsx               (UPDATED)
│   ├── services/
│   │   └── tuitionFeeService.js         (NEW)
│   └── App.jsx                          (UPDATED)
```

## 🔌 API Endpoints

### GET /api/tuition-fees
Lấy danh sách học phí
```javascript
// Query params
{
  page: 1,
  limit: 10,
  cohort: "K20",       // optional
  majorCode: "SE",     // optional
  academicYear: "2023-2024"  // optional
}

// Response
{
  success: true,
  data: [...],
  total: 96,
  page: 1,
  totalPages: 10
}
```

### GET /api/tuition-fees/:id
Lấy chi tiết học phí

### POST /api/tuition-fees
Tạo học phí mới
```javascript
{
  semester: "Kỳ 1",
  cohort: "K23",
  academicYear: "2025-2026",
  majorCode: "SE",
  subjectIds: ["64abc...", "64def..."]  // Array of subject IDs
}
```

### POST /api/tuition-fees/:id/discounts
Thêm discount
```javascript
{
  name: "Early Bird",
  type: "percentage",  // or "fixed"
  value: 5,           // 5% or 500000 VNĐ
  description: "Đăng ký sớm"
}
```

### DELETE /api/tuition-fees/:id/discounts/:discountId
Xóa discount

### GET /api/tuition-fees/summary
Lấy summary theo cohort

## 💡 Công thức tính

### Học phí gốc
```
baseTuitionFee = Σ(tuitionFee của mỗi môn)
               = Σ(credits × 630,000 VNĐ)
```

### Tổng giảm giá
```
Với mỗi discount:
  - Nếu type = "percentage":
      discount_amount = baseTuitionFee × value / 100
  - Nếu type = "fixed":
      discount_amount = value

totalDiscount = Σ(discount_amount)
```

### Học phí cuối
```
finalTuitionFee = baseTuitionFee - totalDiscount
                = max(0, baseTuitionFee - totalDiscount)
```

## 🎓 Ví dụ tính toán

### Kỳ 1 - Khóa K20 - Ngành SE
```
Môn học:
1. SE586 - Testing (4 TC × 630k) = 2.520.000
2. AI404 - Neural Networks (3 TC × 630k) = 1.890.000
3. CS101 - Programming (3 TC × 630k) = 1.890.000
4. MATH201 - Calculus (3 TC × 630k) = 1.890.000
─────────────────────────────────────────────
Tổng: 13 tín chỉ = 8.190.000 VNĐ

Giảm giá:
- Early Bird -5%: 8.190.000 × 5% = 409.500
- Full Payment -10%: 8.190.000 × 10% = 819.000
─────────────────────────────────────────────
Tổng giảm: 1.228.500 VNĐ

Học phí cuối: 8.190.000 - 1.228.500 = 6.961.500 VNĐ
```

## 🐛 Troubleshooting

### Không hiển thị cards?
1. Check backend đang chạy: http://localhost:3000/health
2. Check console browser có lỗi không
3. Verify đã seed data: `node src/database/seeds/seedTuitionFees.js`

### Không thêm được discount?
1. Check tuitionFee có _id không
2. Verify API endpoint
3. Check form validation

### Giá tiền không đúng?
1. Verify subjects đã có tuitionFee field
2. Check công thức tính trong modal
3. Re-seed nếu cần

## 🚀 Next Steps

### Features có thể thêm:
- [ ] Export học phí ra Excel/PDF
- [ ] Gửi email thông báo học phí
- [ ] Lịch sử thay đổi discount
- [ ] So sánh học phí giữa các kỳ
- [ ] Thống kê doanh thu
- [ ] Payment integration
- [ ] Student view (xem học phí của mình)
- [ ] Bulk operations (apply discount cho nhiều kỳ)

## 📝 Notes

### Đơn giản dễ hiểu
- Code có comment rõ ràng
- Tên biến có nghĩa
- Logic đơn giản, không phức tạp
- Component nhỏ, dễ maintain

### Best Practices
- Separation of concerns (Model-Service-Controller)
- Reusable components
- Proper error handling
- Responsive design
- Dark mode support

---

**Người phát triển**: Finance Feature Team  
**Ngày**: 28/01/2026  
**Status**: ✅ Complete & Ready to use!  
**Database**: MongoDB Atlas (96 tuition fees seeded)
