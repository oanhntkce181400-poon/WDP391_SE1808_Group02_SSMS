# Tong Hop Ky Thuat Cac Chuc Nang Da Lam (Timetable - Attendance - Conflict - Assign Lecturer)

Tai lieu nay giai thich theo kieu de doc cho nguoi moi hoc code. Muc tieu la ban co the noi lai voi thay duoc:
- He thong lay mon tu dau
- Xep lich hoc vao o grid nhu the nao
- Diem danh luu ra sao
- Vi sao trang thai diem danh len duoc o TKB sinh vien
- Conflict duoc chan nhu the nao
- Chuc nang admin phan cong giang vien vao lop

---

## 1) Tong Quan Kien Truc (Noi de hieu)

He thong dang theo mo hinh:
- Frontend (React): hien thi man hinh, goi API
- Backend (Node/Express + MongoDB): xu ly logic nghiep vu, luu du lieu
- Database: luu ClassSection, Schedule, Enrollment, Attendance, Subject, Teacher, Room, Timeslot

Chuoi du lieu chinh:
1. Admin tao/xep lop (thu cong hoac auto generate)
2. Lich hoc luu vao ClassSection + Schedule
3. Sinh vien dang ky lop (Enrollment)
4. Trang TKB sinh vien doc Enrollment + Schedule de ve grid
5. Giang vien/Admin diem danh theo Class + SlotDate
6. Trang TKB sinh vien doc Attendance de hien badge Co mat/Di tre/Vang

---

## 2) Chuc Nang Timetable (Admin + Student + Lecturer)

## 2.1 Admin Generate Timetable (Auto + Drag/Drop)

### Backend
- File: backend-api/src/modules/schedule/scheduleGenerator.service.js
- Ham quan trong:
  - autoGenerateTimetables(...): tao class section + schedule tu danh sach mon
  - reassignGeneratedSchedule(...): keo tha doi room/day/timeslot, check conflict

Logic auto generate:
1. Nhan input semester, academicYear, subjectIds, roomIds, timeslotIds
2. Load du lieu Subject, Room, Timeslot, existing Schedule
3. Sap xep room/timeslot + teacher candidates
4. Tim o phu hop khong trung phong, khong trung giang vien
5. Tao ClassSection
6. Tao Schedule cho ClassSection vua tao
7. Tra ve generated va unassigned

### Frontend
- File: frontend-web/src/pages/admin/TeachingSchedulePage.jsx
- Ham quan trong:
  - handleGenerate(): goi API generate
  - handleDropCard(): goi API reassign khi drag/drop
  - getCardsAtCell(): map card vao dung cell day/timeslot

Luu y role:
- Hien tai da tach theo role:
  - admin/staff: thay block Generate + drag/drop
  - lecturer: chi thay block Lich giang day, khong thay block Generate

## 2.2 Timetable Sinh Vien (Grid)

### Backend
- File: backend-api/src/services/schedule.service.js
- Ham quan trong:
  - getMyWeekSchedule(userId, weekStart)
  - buildCurriculumFallbackSchedule(student)
  - mergeCurriculumItemsIntoSchedule(existingItems, curriculumItems)
  - attachAttendanceStatus(items, studentId, weekStartDate, weekEndDate)

Luong xu ly:
1. Xac dinh sinh vien theo userId
2. Lay cac lop da enrolled
3. Lay Schedule active cua cac lop do trong tuan
4. Build item de tra ve cho frontend
5. Neu thieu mon thi them fallback tu khung chuong trinh (curriculum)
6. Gan attendanceStatus cho tung item theo slotDate

### Frontend
- File: frontend-web/src/pages/student/SchedulePage.jsx
- Ham quan trong:
  - fetchSchedule()
  - getScheduleForCell(dayOfWeek, timeSlot)
  - handleSlotClick(schedule)

Cach ve grid:
1. FE co mang TIME_SLOTS co dinh (Ca 1..Ca 6)
2. FE co mang DAYS (Thu 2..Chu nhat)
3. Moi cell goi getScheduleForCell(day, slot)
4. Neu co mon -> render card mon hoc
5. Neu la lop that (co classId) -> click mo chi tiet lop/roster

---

## 3) Chuc Nang Attendance (Admin + Lecturer)

## 3.1 Lay danh sach lop de diem danh

- File: backend-api/src/services/attendance.service.js
- Ham: getTeachingClasses(userId)

Logic:
1. Neu admin/staff: lay nhieu lop theo he thong
2. Neu lecturer: chi lay lop cua lecturer do
3. Tinh enrollmentCount, taughtSlots, totalSessions, avgAttendanceRate
4. Loc bo lop khong co sinh vien enrolled de tranh diem danh lop rong

## 3.2 Lay danh sach buoi diem danh cua lop

- File: backend-api/src/services/attendance.service.js
- Ham: getClassSlots(classId, userId)

Logic:
1. Aggregate Attendance theo slotId
2. Tinh tong so, co mat, di tre, vang
3. Sap xep theo slotDate giam dan

## 3.3 Lay danh sach sinh vien theo buoi

- File: backend-api/src/services/attendance.service.js
- Ham: getSlotAttendance(classId, slotId, userId)

Logic:
1. Lay enrollment trong lop
2. Lay attendance records cua slotId
3. Tra ve list sinh vien kem status/note

## 3.4 Luu diem danh

- File: backend-api/src/services/attendance.service.js
- Ham: bulkSave(payload, userId)

Payload:
- classId
- slotId
- slotDate
- records[]: studentId + status + note

Logic validate quan trong:
1. Nguoi diem danh co quyen tren lop
2. Lop phai co sinh vien
3. records phai day du tat ca sinh vien
4. Moi sinh vien phai co status hop le (Present/Late/Absent)
5. slotDate phai dung lich hoc cua lop (dua theo Schedule)
6. Upsert vao Attendance
7. Tinh warning neu vang > 15%

## 3.5 Hien ngay hop le tren UI diem danh

- File: frontend-web/src/pages/admin/AttendancePage.jsx
- Ham quan trong:
  - getThreeMonthBounds()
  - getAllowedDateOptionsForClass()

Da doi UX:
- Datepicker -> Dropdown “Buoi hop le 3 thang toi”
- Chi hien ngay hop le cua lop dang chon
- Giup tranh save sai ngay hoc

---

## 4) Conflict Dang Ky Lop (Prevent Schedule Conflicts)

### Backend
- File: backend-api/src/services/registration.service.js
- Ham: checkScheduleConflict(studentId, classSectionId)

Logic:
1. Lay selected class (dayOfWeek + timeslot start/end)
2. Lay cac lop sinh vien da enrolled trong cung ky
3. So sanh overlap theo:
   - dayOfWeek
   - startTime, endTime
4. Neu conflict -> hasConflict = true, tra danh sach conflict
5. Neu khong conflict -> hasConflict = false

### Frontend
- File: frontend-web/src/pages/student/ClassRegistrationPage.jsx
- Ham quan trong:
  - checkScheduleConflictNow(classId)
  - handleSelectClass(cls)
  - setConflictPopup(...)

Hanh vi:
- Vua click chon lop da check conflict ngay
- Neu trung -> popup do canh bao
- Neu bam Register ma trung -> reject

---

## 5) Chuc Nang Moi: Assign Lecturers To Classes (Admin)

Yeu cau:
- BE: PATCH /api/class-sections/:id/assign-lecturer
- FE: Dropdown chon giang vien

## 5.1 Backend da them

### API routes
- File: backend-api/src/routes/classSectionRoster.routes.js
  - PATCH /api/class-sections/:id/assign-lecturer
- File: backend-api/src/modules/classSection/classSection.routes.js
  - PATCH /api/classes/:classId/assign-lecturer (endpoint tuong duong)

### Controller
- File: backend-api/src/modules/classSection/classSection.controller.js
- Ham: assignLecturer(req, res)

### Service
- File: backend-api/src/modules/classSection/classSection.service.js
- Ham:
  - assignLecturerToClass(classId, lecturerId)
  - assertLecturerNoConflictForClass(classSection, teacherId)

Logic:
1. Check class ton tai
2. Check lecturer ton tai va isActive
3. Check conflict lich day (legacy + Schedule)
4. Neu khong conflict -> update teacher cho class

## 5.2 Frontend da them

- File: frontend-web/src/services/classService.js
  - assignLecturer(classId, lecturerId)

- File: frontend-web/src/pages/admin/ClassManagement.jsx
  - handleLecturerSelect(classId, lecturerId)
  - handleAssignLecturer(cls)
  - Cot “Giang vien” co dropdown + nut “Luu GV”

Hanh vi:
1. Admin chon GV trong dong lop
2. Bam Luu GV
3. Goi API assign
4. Refresh list va show toast

---

## 6) Role-based UI da dieu chinh

- File: frontend-web/src/App.jsx
  - Group route /lecturer co layout
  - Co 2 trang: teaching-schedule, attendance

- File: frontend-web/src/components/layout/Header.jsx
  - Menu theo role
  - Lecturer chi thay menu can thiet (Lich giang day, Diem danh)

- File: frontend-web/src/pages/admin/TeachingSchedulePage.jsx
  - Lecturer khong thay block Generate
  - Admin/staff moi thay block Generate + drag/drop

---

## 7) Ve du lieu demo va tinh on dinh

- File: backend-api/scripts/setup-6uc-demo-data.js

Script tao:
1. Tai khoan demo admin/lecturer/student
2. Lop demo day du Mon-Fri, 2 ca/ngay
3. Enrollment that cho sinh vien
4. Attendance demo co du lieu mau
5. Don dep demo data cu de tranh sai lech

Khuyen nghi khi test:
1. Chay lai script seed demo
2. Restart backend + frontend
3. Hard refresh browser

---

## 8) API/Endpoint Quan Trong De Nho

Timetable:
- POST /api/classes/schedules/auto-generate
- PATCH /api/classes/schedules/:scheduleId/reassign
- GET /api/classes/schedules/auto-generated
- GET /api/schedules/me?weekStart=YYYY-MM-DD

Attendance:
- GET /api/attendance/classes
- GET /api/attendance/classes/:classId/slots
- GET /api/attendance/classes/:classId/slots/:slotId
- POST /api/attendance/mark

Registration conflict:
- API validate schedule conflict trong registration flow (qua registration service)
- FE check ngay khi click class tai man Class Registration

Assign lecturer:
- PATCH /api/class-sections/:id/assign-lecturer
- (Tuong duong) PATCH /api/classes/:classId/assign-lecturer

---

## 9) Luong End-to-End De Trinh Bay Voi Thay (Ngan gon)

1. Admin mo lop/generate timetable -> co class, room, teacher, schedule
2. Sinh vien dang ky lop -> he thong check trung lich, check dieu kien
3. TKB sinh vien doc enrollment + schedule -> render grid
4. Lecturer/Admin vao attendance theo lop va ngay hop le -> luu status
5. TKB sinh vien doc attendanceStatus -> hien Co mat/Di tre/Vang tren card
6. Admin co the doi giang vien lop qua dropdown assign lecturer

---

## 10) Ghi Chu Quan Trong (de tranh hieu nham)

1. Timetable grid cua sinh vien uu tien du lieu lop that (classId != null)
2. Fallback curriculum chi la du lieu bo sung khi thieu lop that
3. Attendance chi cap nhat trang thai cho class that
4. Neu muon demo dep, can seed data dong bo truoc khi test

---

## 11) Danh Sach File Da Dong Va Quan Trong Nhat

Backend:
- backend-api/src/services/schedule.service.js
- backend-api/src/services/attendance.service.js
- backend-api/src/services/registration.service.js
- backend-api/src/modules/schedule/scheduleGenerator.service.js
- backend-api/src/modules/classSection/classSection.service.js
- backend-api/src/modules/classSection/classSection.controller.js
- backend-api/src/modules/classSection/classSection.routes.js
- backend-api/src/routes/classSectionRoster.routes.js
- backend-api/scripts/setup-6uc-demo-data.js

Frontend:
- frontend-web/src/pages/student/SchedulePage.jsx
- frontend-web/src/pages/student/ClassRegistrationPage.jsx
- frontend-web/src/pages/admin/AttendancePage.jsx
- frontend-web/src/pages/admin/TeachingSchedulePage.jsx
- frontend-web/src/pages/admin/ClassManagement.jsx
- frontend-web/src/services/classService.js
- frontend-web/src/App.jsx
- frontend-web/src/components/layout/Header.jsx

---

Neu ban muon, minh co the tao them 1 file checklist test case theo tung UC (pass/fail) de ban demo theo tung buoc truoc hoi dong.
