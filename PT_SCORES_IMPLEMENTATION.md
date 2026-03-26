# Tính Năng Điểm PT (Practice Test) - Tài Liệu Thực Hiện

## Tóm tắt
Đã thêm tính năng quản lý điểm kiểm tra thường xuyên (PT1, PT2, PT3) vào hệ thống SSMS. Người dùng giảng viên có thể nhập các loại điểm PT khác nhau cho mỗi sinh viên, và điểm này sẽ được hiển thị cho sinh viên và trong lịch sử thay đổi.

## Các Thay Đổi Chi Tiết

### 1. Database Schema - Backend
**File:** `backend-api/src/models/classEnrollment.model.js`

- **Thêm trường ptScores:**
  ```javascript
  ptScores: [
    {
      type: { type: String, enum: ['PT1', 'PT2', 'PT3'], required: true },
      score: { type: Number, min: 0, max: 10, required: true },
      updatedAt: { type: Date, default: Date.now }
    }
  ]
  ```

### 2. Backend Service - Grades Service
**File:** `backend-api/src/services/grades.service.js`

Cập nhật các hàm:
- **`buildScoreSnapshot()`**: Thêm ptScores vào snapshot
- **`getChangedFields()`**: Nhận diện sự thay đổi ptScores
- **`applyScoresToEnrollment()`**: Áp dụng ptScores từ payload
- **`updateEnrollmentGrade()`**: Validate và lưu ptScores, tạo lịch sử thay đổi

Các endpoint vẫn:
- `PATCH /api/grades/:enrollmentId` - Lưu/cập nhật điểm bao gồm ptScores

### 3. Frontend - Lecturer Grades Entry Page
**File:** `frontend-web/src/pages/lecturer/LecturerGradesEntryPage.jsx`

**Thay đổi giao diện:**
- Đổi cột "Điểm khác" thành "Điểm PT"
- Thay input số thường thành hiển thị danh sách PT được nhập
- Thêm nút "+ Thêm PT" để mở modal chọn loại PT

**Thêm Modal PT:**
- Cho phép chọn loại PT (PT1, PT2, PT3)
- Nhập điểm (0-10)
- Tự động cập nhật nếu PT loại đó đã tồn tại
- Hiển thị danh sách PT được thêm với nút xóa

**Thêm State:**
```javascript
const [showPTModal, setShowPTModal] = useState(false);
const [selectedEnrollmentForPT, setSelectedEnrollmentForPT] = useState(null);
const [ptType, setPTType] = useState('PT1');
const [ptScore, setPTScore] = useState('');
const [savingPT, setSavingPT] = useState(false);
```

**Thêm Hàm:**
- `openPTModal()`: Mở modal PT
- `handleSavePT()`: Lưu PT vào draft
- `handleRemovePT()`: Xóa PT từ draft
- `getPTDisplay()`: Hiển thị danh sách PT

**Cập nhật handleSaveRow():**
- Sử dụng `updateEnrollmentGrade(PATCH)` thay vì `submitSingleStudentGrade(POST)`
- Gửi ptScores cùng với GK/CK/BT

**Cập nhật Log Modal:**
- Hiển thị ptScores trong before/after của lịch sử thay đổi

### 4. Frontend - Student View Grades Page
**File:** `frontend-web/src/pages/student/ViewGradesPage.jsx`

**Thêm cột "PT":**
- Thêm header cột
- Hiển thị danh sách PT với điểm (ví dụ: PT1: 8.5, PT2: 9.0)
- Hiển thị "—" nếu chưa có PT

**Cập nhật Legend:**
- Thêm giải thích cho cột PT: "Điểm kiểm tra thường xuyên (PT1, PT2, PT3)"

## Luồng Sử Dụng

### Cho Giảng Viên
1. Vào trang "Nhập Điểm Sinh Viên"
2. Tại cột "Điểm PT", nhấp "+ Thêm PT"
3. Modal mở ra cho phép chọn loại PT (PT1/PT2/PT3)
4. Nhập điểm (0-10) và lưu
5. Giảng viên sẽ thấy danh sách PT được thêm (ví dụ: "PT1: 8.5")
6. Nhấp nút "Lưu" để lưu tất cả điểm cho sinh viên
7. Xem lịch sử thay đổi để xác nhận PT scores được lưu

### Cho Sinh Viên
1. Vào trang "Xem Điểm"
2. Chọn kỳ học và môn học
3. Xem cột "PT" để biết các điểm kiểm tra thường xuyên của mình

## Kiểu Dữ Liệu

### ptScores Array
```json
[
  {
    "type": "PT1",
    "score": 8.5,
    "updatedAt": "2026-03-26T10:30:00Z"
  },
  {
    "type": "PT2",
    "score": 9.0,
    "updatedAt": "2026-03-26T11:00:00Z"
  }
]
```

## Lịch Sử Thay Đổi (Change Logs)

Các thay đổi PT sẽ được lưu trong GradeChangeLog:
- **beforeScores**: ptScores trước thay đổi
- **afterScores**: ptScores sau thay đổi
- **changedFields**: Sẽ bao gồm "ptScores" nếu có thay đổi

Ví dụ log:
```
Changed fields: ptScores
Before: PT: PT1:8.5
After: PT: PT1:8.5, PT2:9.0
Reason: Lưu điểm từ giao diện nhập điểm
```

## Validation

- Loại PT phải là PT1, PT2, hoặc PT3
- Điểm phải nằm trong khoảng 0-10
- Không được phép thêm PT trùng lặp (sẽ update thay vì thêm)

## Tương Thích Ngược

Các enrollment cũ không có ptScores sẽ được xử lý như mảng rỗng (`[]`).
Các API endpoint cũ vẫn hoạt động bình thường mà không cần ptScores.

## API Endpoints

### PATCH /api/grades/:enrollmentId
**Body:**
```json
{
  "grade": {
    "midtermScore": 8.5,
    "finalScore": 9.0,
    "otherScore": 0,
    "ptScores": [
      { "type": "PT1", "score": 8.5 },
      { "type": "PT2", "score": 9.0 }
    ]
  },
  "reason": "Lưu điểm từ giao diện"
}
```

## Testing Checklist

- [ ] Giảng viên có thể thêm PT từ modal
- [ ] Giảng viên có thể xóa PT từ danh sách
- [ ] Giảng viên có thể cập nhật PT (thay đổi loại/điểm)
- [ ] Điểm PT được lưu khi nhấp "Lưu"
- [ ] Sinh viên có thể xem điểm PT ở trang "Xem Điểm"
- [ ] Lịch sử thay đổi hiển thị thay đổi PT
- [ ] Validation điểm (0-10) hoạt động
- [ ] Các PT cũ được cập nhật thay vì thêm mới cùng loại
- [ ] Xem lịch sử thay đổi hiển thị before/after PT scores

## Lưu Ý

1. PT1, PT2, PT3 là tùy chọn - không bắt buộc
2. Một môn học không cần có đầy đủ PT1-2-3, có thể chỉ có PT1, PT2 hoặc cả 3
3. Điểm PT độc lập với tính toán GPA (không ảnh hưởng đến điểm tổng kết)
4. Mỗi lần thay đổi PT sẽ tạo một entry trong lịch sử thay đổi
