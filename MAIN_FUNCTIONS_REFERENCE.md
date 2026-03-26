# Main Functions Reference (Timetable - Attendance - Conflict - Assign Lecturer)

Tai lieu nay tong hop nhanh cac ham chinh theo tung chuc nang de de doc, de demo, de trace code.

---

## 1) Timetable

### 1.1 Auto Generate + Reassign (Admin)

Backend file:
- backend-api/src/modules/schedule/scheduleGenerator.service.js

Ham chinh:
1. autoGenerateTimetables(payload)
- Vai tro: Tu dong tao ClassSection + Schedule theo semester/academicYear/subjects/rooms/timeslots.
- Input chinh:
  - semester, academicYear
  - subjectIds hoac curriculumId + curriculumSemester
  - expectedEnrollment
  - availableRooms, availableTimeSlots
  - startDate, endDate
- Xu ly chinh:
  - Resolve mon hoc can generate
  - Load Subject, Room, Timeslot, existing schedule
  - Build conflict map cho room va teacher
  - Chon teacher/day/slot/room theo uu tien
  - Tao class section + schedule neu tim thay o hop le
  - Neu khong tim thay thi dua vao unassigned
- Output:
  - summary (subjectsRequested, generatedClasses, unassignedClasses)
  - generated[]
  - unassigned[]

2. reassignGeneratedSchedule({ scheduleId, roomId, dayOfWeek, timeslotId })
- Vai tro: Keo tha doi phong/thu/ca cho lop da generate.
- Xu ly chinh:
  - Check schedule va class section ton tai
  - Check room/timeslot hop le va suc chua
  - Check conflict phong va conflict giang vien
  - Update Schedule + dong bo ClassSection
- Output:
  - schedule da cap nhat + room/timeslot/day moi

Frontend file:
- frontend-web/src/pages/admin/TeachingSchedulePage.jsx

Ham chinh:
1. handleGenerate()
- Goi API auto-generate va cap nhat danh sach card lich.

2. handleDropCard()
- Goi API reassign khi user drag/drop card sang cell moi.

3. getCardsAtCell(day, slot)
- Lay card theo cell de render grid timetable.

---

## 2) Attendance

Backend file:
- backend-api/src/services/attendance.service.js

Ham chinh:
1. getTeachingClasses(userId)
- Vai tro: Lay danh sach lop duoc diem danh theo role.
- Logic:
  - admin/staff thay rong hon
  - lecturer thay lop minh day
  - tinh thong ke enrollmentCount, taughtSlots, totalSessions, avgAttendanceRate

2. getClassSlots(classId, userId)
- Vai tro: Lay danh sach buoi diem danh cua 1 lop.
- Logic:
  - Aggregate Attendance theo slotId
  - Tra tong so, co mat, di tre, vang

3. getSlotAttendance(classId, slotId, userId)
- Vai tro: Lay ds sinh vien + trang thai diem danh theo buoi.

4. bulkSave(payload, userId)
- Vai tro: Luu diem danh hang loat (upsert).
- Validate quan trong:
  - Quyen tren lop
  - Lop co sinh vien
  - records du tat ca sinh vien
  - status hop le (Present/Late/Absent)
  - slotDate dung lich hoc cua lop
- Output:
  - Ket qua luu + warning (neu ty le vang cao)

Frontend file:
- frontend-web/src/pages/admin/AttendancePage.jsx

Ham chinh:
1. getThreeMonthBounds()
- Tinh mien ngay hop le 3 thang toi.

2. getAllowedDateOptionsForClass()
- Tao danh sach ngay hop le theo lich lop de user chon nhanh.

---

## 3) Conflict (Dang ky lop)

Backend file:
- backend-api/src/services/registration.service.js

Ham chinh:
1. checkScheduleConflict(studentId, classSectionId)
- Vai tro: Chan dang ky neu trung lich hoc.
- Logic:
  - Lay dayOfWeek + start/end cua lop duoc chon
  - Lay cac lop da enrolled trong cung ky
  - So sanh overlap theo day va time
- Output:
  - hasConflict: true/false
  - conflicts[] neu co trung

Frontend file:
- frontend-web/src/pages/student/ClassRegistrationPage.jsx

Ham chinh:
1. checkScheduleConflictNow(classId)
- Check conflict ngay khi click chon lop.

2. handleSelectClass(cls)
- Trigger check conflict va cap nhat state chon lop.

3. setConflictPopup(...)
- Hien popup canh bao neu trung lich.

---

## 4) Assign Lecturer (Admin)

Backend files:
- backend-api/src/modules/classSection/classSection.service.js
- backend-api/src/modules/classSection/classSection.controller.js
- backend-api/src/modules/classSection/classSection.routes.js
- backend-api/src/routes/classSectionRoster.routes.js

Ham chinh:
1. assignLecturerToClass(classId, lecturerId)
- Vai tro: Gan giang vien vao lop.
- Logic:
  - Check class ton tai
  - Check lecturer ton tai va isActive
  - Check conflict lich day
  - Update teacher cho class section

2. assertLecturerNoConflictForClass(classSection, teacherId)
- Vai tro: Validate khong trung lich truoc khi assign.

3. assignLecturer(req, res)
- Vai tro: Controller nhan request PATCH assign lecturer.

Frontend files:
- frontend-web/src/services/classService.js
- frontend-web/src/pages/admin/ClassManagement.jsx

Ham chinh:
1. assignLecturer(classId, lecturerId)
- Goi API assign lecturer.

2. handleLecturerSelect(classId, lecturerId)
- Luu lecturer user vua chon tren UI.

3. handleAssignLecturer(cls)
- Submit API assign, refresh list, show thong bao.

---

## 5) End-to-End Call Flow (RAT NGAN)

1. Admin generate timetable -> backend tao ClassSection + Schedule.
2. Student dang ky lop -> conflict duoc check truoc khi dang ky.
3. Lecturer/Admin diem danh -> Attendance duoc upsert theo slot.
4. Student xem TKB -> hien mon hoc va trang thai attendance.
5. Admin co the assign lai lecturer neu can (co check conflict).

---

## 6) Goi y demo nhanh theo chuc nang

1. Timetable: test auto-generate 1 hoc ky, xem generated/unassigned.
2. Reassign: keo tha 1 card sang slot moi, xac nhan khong conflict.
3. Conflict: thu dang ky 2 lop trung gio, xac nhan popup + reject.
4. Attendance: tao 1 buoi diem danh, save full records.
5. Assign lecturer: doi giang vien cho 1 lop, test ca case pass va case conflict.
