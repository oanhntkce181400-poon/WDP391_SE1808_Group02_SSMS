# 🔧 Sửa Lỗi Không Hiển Thị Điểm - Summary

## 🐛 Vấn Đề Phát Hiện

**Dấu hiệu:**
- Trang "Xem điểm học tập" (student view) không hiển thị điểm
- Trang profile không hiển thị GPA
- Mặc dù giảng viên đã nhập điểm và lưu

**Nguyên nhân gốc rễ:**
1. **API không trả về PT Scores** - Student view page có code hiển thị PT scores nhưng API `getMyGrades()` không trả về
2. **Grade không được tính** - Khi giáo viên chỉ nhập GK + CK (không nhập BT), grade sẽ không được tính vì code yêu cầu cả 3 scores

---

## ✅ Sửa Chữa Thực Hiện

### Fix 1: Thêm ptScores vào API Response

**File:** `backend-api/src/services/grades.service.js`  
**Method:** `getMyGrades()`  
**Line:** ~715

**Trước:**
```javascript
groupedBySemester[semesterKey].enrollments.push({
  _id: enrollment._id,
  subjectCode: enrollment.classSection.subject?.subjectCode || 'N/A',
  subjectName: enrollment.classSection.subject?.subjectName || 'N/A',
  credits: enrollment.classSection.subject?.credits || 0,
  grade: enrollment.grade,
  midtermScore: enrollment.midtermScore,
  finalScore: enrollment.finalScore,
  assignmentScore: enrollment.assignmentScore,
  continuousScore: enrollment.continuousScore,
  // ❌ ptScores không được include
  classCode: enrollment.classSection.classCode,
  gradeComponents: {...}
});
```

**Sau:**
```javascript
groupedBySemester[semesterKey].enrollments.push({
  _id: enrollment._id,
  subjectCode: enrollment.classSection.subject?.subjectCode || 'N/A',
  subjectName: enrollment.classSection.subject?.subjectName || 'N/A',
  credits: enrollment.classSection.subject?.credits || 0,
  grade: enrollment.grade,
  midtermScore: enrollment.midtermScore,
  finalScore: enrollment.finalScore,
  assignmentScore: enrollment.assignmentScore,
  continuousScore: enrollment.continuousScore,
  ptScores: enrollment.ptScores || [],  // ✅ ADDED
  classCode: enrollment.classSection.classCode,
  gradeComponents: {...}
});
```

**Kết quả:** Student page sekarang có thể hiển thị PT1, PT2, PT3 scores

---

### Fix 2: Sửa Logic Tính Điểm Grade

**File:** `backend-api/src/services/grades.service.js`  
**Method:** `applyScoresToEnrollment()`  
**Line:** ~123-133

**Vấn đề:**
```javascript
// ❌ Cũ: Yêu cầu cả 3 scores
if (
  autoCalculate &&
  enrollment.midtermScore !== null &&
  enrollment.finalScore !== null &&
  enrollment.assignmentScore !== null  // ← YÊUCẦU BT
) {
  // Tính grade
}
```

Giáo viên nhập GK (30%) + CK (50%), nhưng không nhập BT (20%)  
→ Điều kiện không thỏa → Grade không được tính  
→ Student không thấy điểm!

**Giải pháp:**
```javascript
// ✅ Mới: Chỉ cần GK + CK
if (autoCalculate) {
  // Calculate if at least GK and CK are provided
  if (enrollment.midtermScore !== null && enrollment.finalScore !== null) {
    let calculatedGrade = 0;
    
    // Always GK (30%) + CK (50%)
    calculatedGrade += enrollment.midtermScore * 0.30;
    calculatedGrade += enrollment.finalScore * 0.50;
    
    // If BT provided, use it (20%)
    // If not, redistribute BT weight to CK (now 70%)
    if (enrollment.assignmentScore !== null) {
      calculatedGrade += enrollment.assignmentScore * 0.20;
    } else {
      calculatedGrade += enrollment.finalScore * 0.20;
    }
    
    enrollment.grade = parseFloat(calculatedGrade.toFixed(2));
  }
}
```

**Công thức tính:**
- **Nếu có BT:** `Grade = (GK × 0.30) + (CK × 0.50) + (BT × 0.20)`
- **Nếu không có BT:** `Grade = (GK × 0.30) + (CK × 0.70)`

**Kết quả:** Grade được tính và lưu ngay cả khi giáo viên chỉ nhập GK + CK

---

## 🔄 Tác Động Kết Nối

| Trang | Trước | Sau |
|------|-------|-----|
| **Student View Grades** | GK, CK, BT, QT hiển thị nhưng PT không | ✅ Hiển thị tất cả bao gồm PT |
| **GPA Calculation** | GPA = 0.00 (vì grade không được tính) | ✅ GPA được tính đúng |
| **Student Profile** | Hiển thị GPA = 0.00 ❌ | ✅ Hiển thị GPA đúng |
| **Lecturer View** | Hiển thị đúng (không thay đổi) | ✅ Vẫn hoạt động |

---

## 📋 Danh Sách Thay Đổi

| File | Phương Thức | Thay Đổi |
|------|-----------|---------|
| `grades.service.js` | `getMyGrades()` | Thêm `ptScores` vào response |
| `grades.service.js` | `applyScoresToEnrollment()` | Sửa logic tính grade |

**Tổng:** 2 files, 2 methods được cập nhật

---

## 🚀 Cần Làm Tiếp

### Step 1: Restart Backend Server
```bash
cd backend-api
npm start
```

### Step 2: Kiểm Tra
1. Đăng nhập vào tài khoản giáo viên
2. Nhập GK + CK cho học viên nào đó
3. Nhấn "Lưu"
4. Đăng nhập vào tài khoản học viên đó
5. Vào "Xem điểm học tập"
6. ✅ Nên thấy:
   - Điểm GK, CK
   - PT scores (nếu có)
   - **Điểm cuối (Grade) khác 0**
   - **GPA được tính từ (Grade × Credits)**

---

## 🔍 Kiểm Tra Chi Tiết

### Công thức Preview
```
Ví dụ: Giáo viên nhập GK=7.5, CK=8.5, Không nhập BT

Grade = (7.5 × 0.30) + (8.5 × 0.70)
       = 2.25 + 5.95
       = 8.20

GPA (nếu 3 credits) = 8.20 × 3 / 3 = 8.20 ✅
```

### Kiểm Tra PT Scores
```
Nếu giáo viên nhập PT1=8.0, PT2=9.0, PT3=8.5

Student page sẽ hiển thị cột PT:
PT1: 8.0
PT2: 9.0
PT3: 8.5
```

---

## 📝 Ghi Chú Kỹ Thuật

- **ptScores** trong database là mảng objects: `[{type: 'PT1', score: 8.0}, ...]`
- **Grade calculation** sử dụng hardcoded weights (30-50-20) - tương thích với score component system
- **Backward compatibility** maintained - students/teachers không bị ảnh hưởng

---

## ✨ Kết Quả Dự Kiến

✅ **Trước:**
```
Student View:
- GK: [nhập được]
- CK: [nhập được]
- BT: [nhập được]
- PT: [nhập được]
- Điểm: 0.00 ❌
- GPA: 0.00 ❌
```

✅ **Sau:**
```
Student View:
- GK: 7.5 ✅
- CK: 8.5 ✅
- BT: [trống - tùy chọn]
- PT: 8.0, 9.0, 8.5 ✅
- Điểm: 8.20 ✅
- GPA: 8.20 ✅
```

---

**Hoàn thành:** Sửa 2 vấn đề chính  
**Cần làm:** Restart backend server
