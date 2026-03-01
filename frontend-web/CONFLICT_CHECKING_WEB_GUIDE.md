# CONFLICT CHECKING - CẢNH BÁO TRÙNG LỊCH THI (WEB)

## 📋 TỔNG QUAN

Khi admin tạo hoặc cập nhật lịch thi, hệ thống sẽ **tự động kiểm tra xung đột** và hiển thị cảnh báo trên giao diện web nếu phát hiện:
1. **Phòng thi bị trùng** (Room Conflict)
2. **Sinh viên bị trùng lịch thi** (Student Conflict)

---

## 🎯 CÁCH HOẠT ĐỘNG

### 1️⃣ **Khi Tạo Lịch Thi Mới (Create Exam)**

**Flow:**
1. Admin điền form tạo lịch thi
2. Admin click "Tạo lịch thi"
3. Backend kiểm tra:
   - ✅ Phòng thi có trống không?
   - ✅ Sinh viên có bị trùng lịch không?
4. Nếu có xung đột:
   - ❌ **Không tạo lịch thi**
   - ⚠️ **Hiển thị cảnh báo màu vàng/cam trong form**
   - 🔔 **Toast notification màu amber**
   - 📝 **Form vẫn mở để admin sửa**

**Example - Room Conflict:**
```
⚠️ Cảnh báo: Phòng thi bị trùng
Phòng R101 đã được đặt cho Ca 1 (07:30 - 09:00) vào ngày này

Lịch thi trùng: SE1808-FE-FINAL - R101 - Slot 1
```

**Example - Student Conflict:**
```
⚠️ Cảnh báo: Sinh viên bị trùng lịch thi
Môn học này đã có kỳ thi được xếp cùng thời điểm

Số lượng: 1 kỳ thi trùng lịch
```

---

### 2️⃣ **Khi Cập Nhật Lịch Thi (Update Exam)**

**Flow tương tự:**
1. Admin chỉnh sửa lịch thi (đổi phòng, ngày, ca thi)
2. Backend kiểm tra conflicts (loại trừ lịch thi hiện tại)
3. Nếu có conflict → Hiển thị cảnh báo
4. Admin phải sửa trước khi lưu được

---

## 🎨 GIAO DIỆN CẢNH BÁO

### **Room Conflict Warning Box** (Màu Amber)
```
┌─────────────────────────────────────────────────┐
│ ⚠️  ⚠️ Cảnh báo: Phòng thi bị trùng             │
│                                                 │
│ Room conflict: R101 is already booked for       │
│ Slot 1 on this date                             │
│                                                 │
│ ╔═══════════════════════════════════════════╗  │
│ ║ Lịch thi trùng: TEST-ROOM-1 - R101 - ... ║  │
│ ╚═══════════════════════════════════════════╝  │
└─────────────────────────────────────────────────┘
```

### **Student Conflict Warning Box** (Màu Orange)
```
┌─────────────────────────────────────────────────┐
│ ⚠️  ⚠️ Cảnh báo: Sinh viên bị trùng lịch thi    │
│                                                 │
│ Student conflict: This subject already has 1   │
│ exam(s) scheduled at the same time              │
│                                                 │
│ ╔═══════════════════════════════════════════╗  │
│ ║ Số lượng: 1 kỳ thi trùng lịch            ║  │
│ ╚═══════════════════════════════════════════╝  │
└─────────────────────────────────────────────────┘
```

### **Toast Notification** (Màu Amber, góc dưới bên phải)
```
┌──────────────────────────────────────────────┐
│ ⚠️ Phát hiện xung đột lịch thi.             │
│    Vui lòng kiểm tra cảnh báo trong form.   │  [×]
└──────────────────────────────────────────────┘
```

---

## 💻 IMPLEMENTATION DETAILS

### **Frontend Components:**

#### 1. **ExamModal.jsx** (Form component)
```javascript
// State để lưu conflict warnings
const [conflictWarnings, setConflictWarnings] = useState({
  roomConflict: null,
  studentConflict: null,
});

// Nhận conflict data từ parent component
useEffect(() => {
  if (conflictData) {
    setConflictWarnings({
      roomConflict: conflictData.roomConflict || null,
      studentConflict: conflictData.studentConflict || null,
    });
  }
}, [conflictData]);

// Clear warnings khi user thay đổi fields quan trọng
const handleChange = (e) => {
  // ...
  if (['room', 'slot', 'examDate', 'subject'].includes(name)) {
    setConflictWarnings({ roomConflict: null, studentConflict: null });
  }
};
```

#### 2. **ExamScheduling.jsx** (Page component)
```javascript
// State để lưu conflict data
const [conflictData, setConflictData] = useState({
  roomConflict: null,
  studentConflict: null,
});

// Handle submit errors
const handleSubmitForm = async (formData) => {
  try {
    // ... API call
  } catch (err) {
    if (err.response?.status === 400 && err.response?.data) {
      const errorData = err.response.data;
      
      // Check for conflicts
      if (errorData.roomConflict || errorData.studentConflict) {
        // Update state to show in modal
        setConflictData({
          roomConflict: errorData.roomConflict || null,
          studentConflict: errorData.studentConflict || null,
        });
        // Show warning toast
        showToast('⚠️ Phát hiện xung đột...', 'warning');
        // Modal stays open
      }
    }
  }
};
```

#### 3. **Toast Types**
```javascript
// Warning toast styling
toast.type === 'warning' 
  ? 'bg-amber-600 text-white'  // Amber background
  : ...
```

---

## 📡 BACKEND API RESPONSE

### **Khi có conflict:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "Room conflict: R101 is already booked for Slot 1 on this date",
    "Student conflict: This subject already has 1 exam(s) scheduled at the same time"
  ],
  "roomConflict": {
    "hasConflict": true,
    "conflictingExam": {
      "examCode": "TEST-ROOM-1",
      "room": { "roomName": "R101" },
      "slot": { "groupName": "Slot 1" }
    },
    "message": "Room conflict: R101 is already booked..."
  },
  "studentConflict": {
    "hasConflict": true,
    "conflictCount": 1,
    "message": "Student conflict: This subject already has...",
    "conflictingExams": [...]
  }
}
```

**HTTP Status:** `400 Bad Request`

---

## 🔍 CONFLICT TYPES EXPLAINED

### **1. Room Conflict (Trùng phòng thi)**

**Điều kiện xung đột:**
- Cùng `room` (phòng thi)
- Cùng `examDate` (ngày thi)
- Cùng `slot` (ca thi)
- Status != 'cancelled'

**Ví dụ:**
```
Exam 1: R101 | 2026-06-01 | Slot 1 (07:30-09:00)
Exam 2: R101 | 2026-06-01 | Slot 1 (07:30-09:00)
         ↑                        ↑
        ❌ CONFLICT: Cùng phòng, cùng ngày, cùng ca
```

**Backend Logic:**
```javascript
// ExamService.checkRoomConflict()
const conflictingExams = await examRepository.findByRoomAndSlot(
  roomId, 
  examDate, 
  slotId, 
  excludeExamId  // Exclude current exam for updates
);
```

---

### **2. Student Conflict (Sinh viên trùng lịch)**

**Điều kiện xung đột:**
- Cùng `subject` (môn học)
- Cùng `examDate` (ngày thi)
- Cùng `slot` (ca thi)
- Status != 'cancelled'

**Giải thích:**
Nếu môn học đã có kỳ thi vào cùng thời điểm, sinh viên học môn đó sẽ bị conflict (không thể thi 2 môn cùng lúc).

**Ví dụ:**
```
Exam 1: Subject "PRJ301" | 2026-06-01 | Slot 1
Exam 2: Subject "PRJ301" | 2026-06-01 | Slot 1
                ↑
        ❌ CONFLICT: Cùng môn, cùng thời điểm
```

**Backend Logic:**
```javascript
// ExamService.checkStudentConflict()
const sameSlotExams = await examRepository.findBySubjectDateSlot(
  subjectId,
  examDate,
  slotId
);
```

---

## 🛡️ USER EXPERIENCE

### **Khi gặp conflict:**
1. ✅ **Form không bị đóng** - Admin có thể sửa ngay
2. ✅ **Cảnh báo rõ ràng** - Hiển thị chi tiết conflict
3. ✅ **Toast notification** - Thông báo ở góc màn hình
4. ✅ **Auto-clear warnings** - Khi admin thay đổi fields liên quan

### **Khi admin sửa fields:**
| Field thay đổi | Action |
|----------------|--------|
| Room | Clear both conflicts |
| Slot | Clear both conflicts |
| Exam Date | Clear both conflicts |
| Subject | Clear both conflicts |
| Other fields | Warnings vẫn hiển thị |

---

## 📸 SCREENSHOTS

### **Before Submit:**
```
┌─────────────────────────────────────────┐
│  Tạo lịch thi mới                 [×]  │
├─────────────────────────────────────────┤
│                                         │
│  Mã kỳ thi: [SE1808-FE-FINAL____]     │
│  Môn học:   [PRJ301_____________▼]     │
│  Phòng thi: [R101_______________▼]     │
│  Ca thi:    [Slot 1 (07:30-09:00)▼]    │
│  Ngày thi:  [2026-06-01_________]      │
│  ...                                    │
│                                         │
│              [Tạo lịch thi]            │
└─────────────────────────────────────────┘
```

### **After Submit with Conflict:**
```
┌─────────────────────────────────────────┐
│  Tạo lịch thi mới                 [×]  │
├─────────────────────────────────────────┤
│  ⚠️ CẢNH BÁO: Phòng thi bị trùng       │
│  Room conflict: R101 is already...     │
│  Lịch thi trùng: TEST-1 - R101 - ...  │
├─────────────────────────────────────────┤
│  ⚠️ CẢNH BÁO: Sinh viên bị trùng...    │
│  Student conflict: This subject...     │
│  Số lượng: 1 kỳ thi trùng lịch        │
├─────────────────────────────────────────┤
│                                         │
│  Mã kỳ thi: [SE1808-FE-FINAL____]     │
│  Môn học:   [PRJ301_____________▼]     │
│  Phòng thi: [R101_______________▼] ← Fix this
│  Ca thi:    [Slot 1_____________▼] ← Or this
│  Ngày thi:  [2026-06-01_________] ← Or this
│  ...                                    │
│                                         │
│              [Tạo lịch thi]            │
└─────────────────────────────────────────┘

[Toast Bottom-Right]
┌────────────────────────────────────────┐
│ ⚠️ Phát hiện xung đột lịch thi.      │
│    Vui lòng kiểm tra cảnh báo...     │  [×]
└────────────────────────────────────────┘
```

---

## 🧪 TESTING

### **Test Case 1: Room Conflict**
1. Tạo exam 1: R101, 2026-06-01, Slot 1
2. Tạo exam 2: R101, 2026-06-01, Slot 1 (same)
3. **Expected:** Warning box hiển thị "Phòng thi bị trùng"

### **Test Case 2: Student Conflict**
1. Tạo exam 1: PRJ301, 2026-06-01, Slot 1
2. Tạo exam 2: PRJ301, 2026-06-01, Slot 1 (same subject, time)
3. **Expected:** Warning box hiển thị "Sinh viên bị trùng lịch"

### **Test Case 3: Update with Conflict**
1. Tạo exam 1: R101, 2026-06-01, Slot 1
2. Tạo exam 2: R102, 2026-06-01, Slot 2
3. Update exam 2: R101, Slot 1 (conflict với exam 1)
4. **Expected:** Warning box hiển thị conflict

### **Test Case 4: Auto-Clear Warnings**
1. Submit form → Conflict warning hiển thị
2. Thay đổi room/slot/date
3. **Expected:** Warning box biến mất

---

## 🚀 DEPLOYMENT CHECKLIST

- [x] Backend validation logic implemented
- [x] ExamRepository conflict checking methods
- [x] ExamService conflict validation
- [x] Frontend ExamModal warning UI
- [x] Parent component conflict state management
- [x] Toast notification với type 'warning'
- [x] Auto-clear warnings on field change
- [x] Error handling in API calls

---

## 📚 FILES MODIFIED

### Backend:
- `backend-api/src/services/exam.service.js`
- `backend-api/src/modules/exam/exam.repository.js`
- `backend-api/src/controllers/exam.controller.js`

### Frontend:
- `frontend-web/src/components/features/ExamModal.jsx`
- `frontend-web/src/pages/admin/ExamScheduling.jsx`

---

## 💡 TIPS FOR ADMIN

1. **Khi thấy warning:** Đổi phòng hoặc ca thi hoặc ngày thi
2. **Check lịch trước:** Xem lịch thi hiện có trước khi tạo mới
3. **Dùng filters:** Lọc theo phòng/ngày để tránh trùng

---

**Created:** February 26, 2026  
**Status:** ✅ Implemented & Tested
