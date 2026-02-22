# 🚀 HỌC CẤP TỐC 5 PHÚT - PHIÊN 2 (Tối qua → Sáng nay)

> **Phủ toàn bộ các thay đổi:** Seed data lịch học, liên kết Curriculum ↔ TuitionFee ↔ Schedule, sửa giao diện sinh viên.

---

## 📋 MỤC LỤC

1. [Student Layout – Refresh user từ API](#1-student-layout--refresh-user-từ-api)
2. [Seed Finance Data](#2-seed-finance-data)
3. [Seed Schedule – Lịch học FPT](#3-seed-schedule--lịch-học-fpt)
4. [Seed Link All – Liên kết toàn bộ](#4-seed-link-all--liên-kết-toàn-bộ)
5. [SchedulePage – Giao diện lịch học có màu](#5-schedulepage--giao-diện-lịch-học-có-màu)
6. [Finance Service – Trả về môn đăng ký](#6-finance-service--trả-về-môn-đăng-ký)
7. [TuitionPage – Hiển thị môn học kỳ](#7-tuitionpage--hiển-thị-môn-học-kỳ)
8. [Luồng dữ liệu toàn hệ thống](#8-luồng-dữ-liệu-toàn-hệ-thống)

---

## 1. 🔑 STUDENT LAYOUT – REFRESH USER TỪ API

### 📂 File
- [frontend-web/src/components/layout/StudentLayout.jsx](frontend-web/src/components/layout/StudentLayout.jsx)

### 🎯 Vấn đề
Header hiển thị "Student" thay vì tên thật vì `auth_user` trong localStorage là dữ liệu cũ từ lần đăng nhập trước, thiếu `fullName`.

### ⚙️ Giải pháp
```jsx
// Khi layout mount → gọi /auth/me → cập nhật localStorage + state
useEffect(() => {
  authService.me().then(res => {
    const freshUser = res.data.data;
    localStorage.setItem('auth_user', JSON.stringify(freshUser));
    setUser(freshUser);
  });
}, []);
```

**Logic quan trọng:** Luôn ưu tiên dữ liệu từ server, không dùng `localStorage` làm source of truth duy nhất.

---

## 2. 💰 SEED FINANCE DATA

### 📂 File
- [backend-api/seed-finance-data.js](backend-api/seed-finance-data.js)

### 🎯 Mục đích
Tạo dữ liệu học phí cho sinh viên demo `huyhmce181719@fpt.edu.vn`.

### ⚙️ Logic chính
```javascript
// Tạo OtherFee (phí ký túc xá, bảo hiểm, ...) + Payment (đã nộp)
// Kết nối: student._id → OtherFee.student + Payment.student
// Kết nối: semester.code → OtherFee.semesterCode + Payment.semesterCode
```

**Điểm quan trọng:** DB phải dùng `{ dbName: 'wdp301' }` khi connect:
```javascript
mongoose.connect(MONGO_URI, { dbName: 'wdp301' })
```

---

## 3. 📅 SEED SCHEDULE – LỊCH HỌC FPT

### 📂 File
- [backend-api/seed-schedule.js](backend-api/seed-schedule.js)

### 🎯 Mục đích
Tạo lịch học thực cho `huyhmce181719@fpt.edu.vn` với 7 môn FPT, 13 buổi/tuần.

### ⚙️ Các bảng dữ liệu liên quan

| Model | Vai trò |
|-------|---------|
| `Subject` | Môn học (WDP301, SDN302, ...) |
| `Timeslot` | Ca học CA1–CA6 (07:00–22:00) |
| `ClassSection` | Buổi học cụ thể (môn + phòng + giáo viên + ca + thứ) |
| `ClassEnrollment` | Sinh viên đăng ký buổi học nào |

### ⚙️ Flow chính
```javascript
// 1. Đổi tên SUBxxx → FPT code (WDP301, SDN302, ...)
await subjects.updateOne({ subjectCode: 'SUB004' }, { $set: { subjectCode: 'WDP301', ... } })

// 2. Upsert 6 Timeslot CA1–CA6
await timeslots.findOneAndUpdate({ groupName: 'CA2' }, { $set: { startTime: '09:30', endTime: '11:45' } }, { upsert: true })

// 3. Tạo ClassSection (1 bản ghi = 1 buổi học cố định mỗi tuần)
{ subject: subjectId, teacher: teacherId, room: roomId, timeslot: tsId,
  semester: 2, academicYear: '2025-2026', dayOfWeek: 2 /* T3 */ }

// 4. Tạo ClassEnrollment (link sinh viên với ClassSection)
{ classSection: sectionId, student: studentId, status: 'enrolled' }
```

### ⚙️ Layout lịch học
```
WDP301: T3-Ca1 (07:00) + T5-Ca2 (09:30)
SDN302: T2-Ca2 (09:30) + T5-Ca3 (12:30)
MLN122: T4-Ca1 (07:00) + T6-Ca3 (12:30)
PRJ301: T2-Ca3 (12:30) + T4-Ca4 (15:00)
EXE201: T3-Ca5 (17:30) + T7-Ca4 (15:00)
PRM393: T3-Ca2 (09:30) + T6-Ca1 (07:00)
SWP391: T4-Ca2 (09:30)
```

**Chạy:** `cd backend-api && node seed-schedule.js`

---

## 4. 🔗 SEED LINK ALL – LIÊN KẾT TOÀN BỘ

### 📂 File
- [backend-api/seed-link-all.js](backend-api/seed-link-all.js)

### 🎯 Mục đích
Đồng bộ 3 thứ phải khớp nhau:
- **Curriculum CEK18** (admin xem ở trang Học phí)
- **TuitionFee records** (finance service dùng để tính học phí)
- **ClassSection/ClassEnrollment** (lịch học + tín chỉ đăng ký)

### ⚙️ Cấu trúc CEK18 sau khi update

| Học kỳ | Môn học | Tín chỉ |
|--------|---------|---------|
| HK1 | WDP301, SDN302, MLN122 | 12 TC |
| HK2 | PRJ301, EXE201, PRM393, SWP391 | 14 TC |
| HK3 | DBI202, OSG202, EXE101 | 7 TC |
| HK4 | SWT301, NWC203 | 10 TC |
| **Tổng** | **12 môn** | **43 TC** |

### ⚙️ TuitionFee records tạo ra

```javascript
// 4 bản ghi cho K18 2025-2026, mỗi học kỳ 1 bản
{ cohort: 'K18', academicYear: '2025-2026', semester: 'Học kỳ 2',
  totalCredits: 14, baseTuitionFee: 8_820_000, status: 'active',
  subjects: [{ subjectCode: 'PRJ301', credits: 4, tuitionFee: 2_520_000 }, ...] }
```

**Finance service dùng TuitionFee để tìm pricePerCredit:**
```javascript
// Tìm record khớp cohort + academicYear
const rule = await TuitionFee.findOne({ cohort: { $in: ['18','K18','K18CT'] }, academicYear: '2025-2026', status: 'active' })
const pricePerCredit = rule.baseTuitionFee / rule.totalCredits  // → 630.000 ₫/TC
```

**Chạy:** `cd backend-api && node seed-link-all.js`

---

## 5. 📊 SCHEDULEPAGE – GIAO DIỆN LỊCH HỌC CÓ MÀU

### 📂 File
- [frontend-web/src/pages/student/SchedulePage.jsx](frontend-web/src/pages/student/SchedulePage.jsx)

### 🎯 Thay đổi

#### 5.1. Fix TIME_SLOTS (bug quan trọng)
```javascript
// TRƯỚC (sai – không match DB)
{ label: 'Ca 2', startTime: '09:25' }
{ label: 'Ca 6', startTime: '19:55' }

// SAU (đúng – khớp Timeslot trong DB)
{ label: 'Ca 2', startTime: '09:30' }
{ label: 'Ca 6', startTime: '20:00' }
```
`getScheduleForCell()` so sánh `s.startTime === timeSlot.startTime` → sai 1 ký tự là không hiện buổi học.

#### 5.2. Màu cố định theo môn
```javascript
// Mỗi môn 1 màu cố định, không thay đổi khi render lại
const SUBJECT_COLORS = {
  WDP301: { bg: 'bg-blue-600',    text: 'text-blue-100' },
  SDN302: { bg: 'bg-emerald-600', text: 'text-emerald-100' },
  MLN122: { bg: 'bg-purple-600',  text: 'text-purple-100' },
  PRJ301: { bg: 'bg-orange-500',  text: 'text-orange-100' },
  EXE201: { bg: 'bg-rose-500',    text: 'text-rose-100' },
  PRM393: { bg: 'bg-cyan-600',    text: 'text-cyan-100' },
  SWP391: { bg: 'bg-amber-500',   text: 'text-amber-100' },
  // ... (FALLBACK_COLORS cho môn không có trong map)
};
const getColor = (code) => SUBJECT_COLORS[code] || FALLBACK_COLORS[dynamicIndex];
```

#### 5.3. Card môn học hiển thị
Mỗi ô trong bảng hiển thị: **Mã môn** (badge tối) · **Tên môn** · **Phòng** (icon pin) · **Giáo viên** (icon người) · **Giờ học**

---

## 6. 🏦 FINANCE SERVICE – TRẢ VỀ MÔN ĐĂNG KÝ

### 📂 File
- [backend-api/src/services/finance.service.js](backend-api/src/services/finance.service.js)

### 🎯 Thay đổi
`sumRegisteredCredits()` giờ trả về `{ total, subjects }` thay vì chỉ `total`.

```javascript
// TRƯỚC
async function sumRegisteredCredits(...) {
  // ...
  return totalCredits;  // chỉ số
}

// SAU
async function sumRegisteredCredits(...) {
  // populate thêm subjectCode, subjectName
  return {
    total: totalCredits,
    subjects: [{ subjectCode: 'WDP301', subjectName: '...', credits: 4, tuitionFee: 0 }, ...]
  };
}
```

`getMyTuitionSummary()` tính `tuitionFee` cho từng môn rồi đưa vào DTO:
```javascript
enrolledSubjects = enrolledSubjects.map(s => ({
  ...s,
  tuitionFee: s.credits * pricePerCredit  // 4 TC × 630.000 = 2.520.000
}));
```

DTO trả về thêm field `enrolledSubjects: [...]`.

---

## 7. 💳 TUITIONPAGE – HIỂN THỊ MÔN HỌC KỲ

### 📂 File
- [frontend-web/src/pages/student/TuitionPage.jsx](frontend-web/src/pages/student/TuitionPage.jsx)

### 🎯 Thay đổi
Thêm section **"Môn học đăng ký học kỳ này"** hiển thị danh sách môn từ `summary.enrolledSubjects`.

```jsx
{summary.enrolledSubjects?.length > 0 && (
  <div className="rounded-xl border border-blue-200 bg-white">
    {summary.enrolledSubjects.map(sub => (
      <div key={sub.subjectCode} className="flex justify-between px-5 py-3">
        <div>
          <span className="bg-blue-100 text-blue-700 rounded px-2 text-xs font-bold">
            {sub.subjectCode}
          </span>
          <span className="ml-2 text-sm">{sub.subjectName}</span>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">{sub.credits} TC</p>
          <p className="font-medium">{formatMoney(sub.tuitionFee)}</p>
        </div>
      </div>
    ))}
  </div>
)}
```

---

## 8. 🔁 LUỒNG DỮ LIỆU TOÀN HỆ THỐNG

```
[Admin: Học phí]
  curriculumService.getCurriculums() → Curriculum.semesters[].courses
  │  CEK18: HK1(WDP301,SDN302,MLN122) · HK2(PRJ301,EXE201,PRM393,SWP391) · ...
  │  Hiển thị: tên môn thật + tín chỉ + học phí = TC × 630.000
  └─ LIÊN KẾT: Subject.subjectCode khớp Curriculum.courses[].code

[Schedule Seed → DB]
  ClassSection: { subject→ObjectId, semester:2, academicYear:'2025-2026', dayOfWeek, timeslot }
  ClassEnrollment: { classSection→ObjectId, student→ObjectId }
  └─ LIÊN KẾT: Subject._id dùng trong ClassSection

[Student: Lịch học]
  scheduleService.getMySchedule(weekStart)
    → ClassEnrollment.find({student}) → populate classSection → populate subject/room
    → trả về: { dayOfWeek, startTime, subject: { subjectCode, subjectName }, room, teacher }
    → SchedulePage dùng startTime để match TIME_SLOTS ('09:30' phải đúng)
    └─ LIÊN KẾT: Timeslot.startTime = TIME_SLOTS.startTime = ClassSection schedule

[TuitionFee Config]
  seed-link-all.js tạo: { cohort:'K18', academicYear:'2025-2026', baseTuitionFee, totalCredits }
  └─ LIÊN KẾT: Student.cohort = TuitionFee.cohort

[Student: Học phí]
  financeService.getMyTuitionSummary()
    1. Student.findOne({ email }) → lấy cohort, _id
    2. Semester.findOne({ isCurrent:true }) → academicYear:'2025-2026', semesterNum:2
    3. ClassEnrollment.find({student}) → ClassSection.match(semester:2,AY:'2025-2026')
       → Subject → credits, subjectCode, subjectName
    4. TuitionFee.findOne({cohort:'K18', academicYear:'2025-2026'}) → pricePerCredit=630.000
    5. total = registeredCredits × 630.000 + otherFees
    └─ TẤT CẢ LIÊN KẾT: Curriculum = Schedule = TuitionFee = Finance đều dùng cùng Subject codes
```

---

## 📞 CÂU HỎI THẦY CÓ THỂ HỎI

### Q: "Dữ liệu lịch học lấy từ đâu?"
**A:** Từ `ClassEnrollment` → `ClassSection` → `Subject`/`Room`/`Timeslot`. Seed tạo 13 ClassSection cho 7 môn với 6 ca học chuẩn FPT (CA1-CA6).

### Q: "Học phí tính thế nào?"
**A:** Finance service lấy `pricePerCredit` từ `TuitionFee` (630.000đ/TC), nhân với tổng tín chỉ đăng ký (từ ClassEnrollment), cộng các khoản phí khác từ `OtherFee`.

### Q: "Tại sao Curriculum, Schedule, Học phí phải liên kết?"
**A:** Curriculum định nghĩa môn học của ngành. Schedule dùng các môn đó để tạo buổi học. Finance dùng tín chỉ của các môn đó để tính học phí. Ba thứ đều tham chiếu đến cùng `Subject` collection bằng `subjectCode`.

### Q: "seed-link-all.js làm gì?"
**A:** Cập nhật CEK18 với 12 môn FPT thực tế (4 học kỳ × 43 TC tổng) và tạo 4 bản ghi `TuitionFee` cho K18 học năm 2025-2026, mỗi học kỳ 1 bản, đảm bảo finance service tìm được `pricePerCredit = 630.000`.

---

## 🏃 CHẠY NHANH (Nếu cần reset data)

```bash
cd backend-api

# Reset lịch học cho sinh viên huyhmce181719
node seed-schedule.js

# Đồng bộ curriculum CEK18 + TuitionFee records K18 2025-2026
node seed-link-all.js
```

**Thứ tự quan trọng:** `seed-schedule.js` trước (đổi tên subjects) → `seed-link-all.js` sau (dùng subject codes đã đổi).
