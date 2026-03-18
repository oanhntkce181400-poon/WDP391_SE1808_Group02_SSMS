# Example Test Chức Năng Auto-Assign Students To Classes

Tài liệu này tổng hợp một bộ **example/test case rất lớn** để test chức năng:

- `Auto-Assign Students To Classes`
- `Auto Enrollment`
- API chính: `POST /api/auto-enrollment/trigger`
- Service chính: `triggerAutoEnrollment(semesterId, options)`

Mục tiêu của tài liệu:

- cho bạn một bộ case đủ dày để test tay, demo, viết báo cáo, hoặc dùng làm checklist QA
- tạo được khoảng **10 example cho mỗi curriculum semester**
- bổ sung thêm một nhóm **case nâng cao** để test business rule và edge case

Lưu ý quan trọng:

- Trong code hiện tại, `currentCurriculumSemester` hợp lệ từ `1` đến `9`
- Auto Enrollment hiện **không** kiểm tra prerequisite / overload / credit limit như flow student self-registration
- Auto Enrollment tập trung vào:
  - chọn đúng student active
  - resolve đúng curriculum
  - xác định đúng curriculum semester
  - lấy đúng subject của kỳ đó
  - tìm class section còn chỗ
  - tạo `ClassEnrollment`
  - đưa vào `Waitlist` nếu không còn lớp phù hợp
  - chống duplicate

---

## 1. Điều kiện nền chung để chạy test

Trước khi test hàng loạt, nên chuẩn bị:

- một `Semester` hợp lệ, tốt nhất là semester current hoặc semester được chọn ở UI admin
- mỗi major cần test phải có ít nhất một `Curriculum` ở trạng thái `active`
- curriculum phải có dữ liệu `CurriculumSemester` và `CurriculumCourse`
- `CurriculumCourse.subject` phải map đúng sang `Subject`
- các `ClassSection` phải mở ở đúng:
  - `semester = semester.semesterNum`
  - `academicYear = semester.academicYear`
  - `status in ['published', 'scheduled']`
- student dùng để test phải có:
  - `isActive = true`
  - `majorCode`
  - `enrollmentYear` hoặc `currentCurriculumSemester`

---

## 2. Mẫu request API dùng chung

### 2.1. Chạy thật cho toàn bộ student

```json
{
  "semesterId": "<SEMESTER_ID>",
  "dryRun": false
}
```

### 2.2. Chạy thử không ghi DB

```json
{
  "semesterId": "<SEMESTER_ID>",
  "dryRun": true
}
```

### 2.3. Chỉ chạy cho một major

```json
{
  "semesterId": "<SEMESTER_ID>",
  "dryRun": false,
  "majorCodes": ["SE"]
}
```

### 2.4. Chỉ chạy cho một nhóm student

```json
{
  "semesterId": "<SEMESTER_ID>",
  "dryRun": false,
  "studentCodes": ["AEK1SE01", "AEK1SE02"]
}
```

### 2.5. Chỉ chạy cho student chưa có enrollment

```json
{
  "semesterId": "<SEMESTER_ID>",
  "dryRun": false,
  "onlyStudentsWithoutEnrollments": true
}
```

---

## 3. Quy ước đặt mã dữ liệu mẫu

Bạn có thể đặt bộ dữ liệu test theo pattern này để dễ nhìn trên log:

- Student:
  - `AEK1SE01` = Auto Enrollment, Kỳ 1, ngành SE, case 01
  - `AEK2AI04` = Auto Enrollment, Kỳ 2, ngành AI, case 04
- ClassSection:
  - `AE-K1-SE-CLS01`
  - `AE-K5-AI-CLS03`
- Subject:
  - `AEK1SUB01`
  - `AEK7SUB04`

Nếu không muốn tạo mã mới, bạn chỉ cần giữ logic:

- student có `currentCurriculumSemester = N`
- curriculum semester `N` có các môn tương ứng
- có hoặc không có class section mở tùy theo case

---

## 4. 10 pattern test chuẩn áp dụng cho mọi kỳ

Mỗi kỳ bên dưới sẽ dùng lại 10 pattern sau:

1. `P01 - Happy path`
   Tất cả môn của kỳ có lớp mở và còn chỗ.
2. `P02 - Một môn full`
   Một môn còn lại đều ổn, riêng một môn hết chỗ nên phải vào waitlist.
3. `P03 - Tất cả môn full`
   Không môn nào còn chỗ, student chỉ nhận waitlist.
4. `P04 - Đã enroll sẵn một môn`
   Một subject trong kỳ đã có `ClassEnrollment`, hệ thống phải skip duplicate.
5. `P05 - Đã waitlist sẵn một môn`
   Student đã có waitlist `WAITING` cho một subject, batch không tạo waitlist trùng.
6. `P06 - Ưu tiên currentCurriculumSemester`
   Student có `currentCurriculumSemester = N`, hệ thống dùng đúng giá trị này.
7. `P07 - Tính semester từ enrollmentYear`
   Student không có `currentCurriculumSemester`, service phải tính ra semester order.
8. `P08 - Dry run`
   Kết quả summary/log đầy đủ nhưng DB không đổi.
9. `P09 - Chạy bằng filter`
   Chỉ chạy theo `majorCodes` hoặc `studentCodes`, student ngoài filter không bị tác động.
10. `P10 - onlyStudentsWithoutEnrollments`
    Student đã có enrollment active thì bị bỏ qua nếu bật option này.

---

## 5. Example cho Kỳ 1

### Mục tiêu riêng của Kỳ 1

- test sinh viên mới vào chương trình
- test logic ưu tiên `currentCurriculumSemester = 1`
- test các môn nền tảng thường mở nhiều lớp

1. `AE-K1-01` - Happy path Kỳ 1  
   Setup:
   - student `AEK1SE01`
   - `currentCurriculumSemester = 1`
   - curriculum semester 1 có 3 môn
   - cả 3 môn đều có lớp mở và còn chỗ  
   Kỳ vọng:
   - tạo 3 `ClassEnrollment`
   - `waitlisted = 0`
   - `failed = 0`

2. `AE-K1-02` - Một môn full ở Kỳ 1  
   Setup:
   - student `AEK1SE02`
   - 2 môn còn chỗ, 1 môn full  
   Kỳ vọng:
   - enroll 2 môn
   - 1 record waitlist
   - log có cả `enrolled` và `waitlisted`

3. `AE-K1-03` - Tất cả môn full  
   Setup:
   - student `AEK1SE03`
   - toàn bộ class section của semester 1 đều full  
   Kỳ vọng:
   - không tạo enrollment
   - tất cả subject đi vào waitlist

4. `AE-K1-04` - Đã enroll sẵn một môn  
   Setup:
   - student `AEK1SE04`
   - đã có 1 enrollment active của 1 subject thuộc kỳ 1  
   Kỳ vọng:
   - subject đó bị log `already enrolled`
   - `duplicates` tăng
   - chỉ enroll các môn còn lại

5. `AE-K1-05` - Đã waitlist sẵn một môn  
   Setup:
   - student `AEK1SE05`
   - đã có `Waitlist WAITING` cho 1 subject kỳ 1  
   Kỳ vọng:
   - không tạo waitlist trùng
   - log trả `already_waiting`

6. `AE-K1-06` - Ưu tiên `currentCurriculumSemester = 1`  
   Setup:
   - student `AEK1SE06`
   - `enrollmentYear` có thể tính ra kỳ khác
   - nhưng `currentCurriculumSemester = 1`  
   Kỳ vọng:
   - service vẫn lấy môn của kỳ 1

7. `AE-K1-07` - Tính từ `enrollmentYear`  
   Setup:
   - student `AEK1SE07`
   - không có `currentCurriculumSemester`
   - `enrollmentYear` cho ra semester order = 1  
   Kỳ vọng:
   - student vẫn được xếp môn kỳ 1 đúng

8. `AE-K1-08` - Dry run kỳ 1  
   Setup:
   - student `AEK1SE08`
   - dữ liệu giống happy path  
   Request:
   - `dryRun = true`  
   Kỳ vọng:
   - summary/log hiển thị sẽ enroll
   - DB không tạo enrollment thật

9. `AE-K1-09` - Filter theo `studentCodes`  
   Setup:
   - có 3 student kỳ 1
   - request chỉ chứa `["AEK1SE09"]`  
   Kỳ vọng:
   - chỉ 1 student được xử lý

10. `AE-K1-10` - `onlyStudentsWithoutEnrollments = true`  
    Setup:
    - `AEK1SE10` đã có enrollment active
    - `AEK1SE11` chưa có enrollment  
    Kỳ vọng:
    - `AEK1SE10` bị bỏ qua
    - `AEK1SE11` được xử lý

---

## 6. Example cho Kỳ 2

1. `AE-K2-01` - Happy path Kỳ 2  
   Student `AEK2SE01`, `currentCurriculumSemester = 2`, tất cả môn kỳ 2 có lớp mở.  
   Kỳ vọng: enroll đầy đủ các môn kỳ 2.

2. `AE-K2-02` - Một môn full  
   Student `AEK2SE02`, 1 subject kỳ 2 full.  
   Kỳ vọng: subject full vào waitlist, các subject còn lại enroll bình thường.

3. `AE-K2-03` - Tất cả subject kỳ 2 đều full  
   Student `AEK2SE03`.  
   Kỳ vọng: chỉ tạo waitlist, không tạo enrollment.

4. `AE-K2-04` - Đã enroll sẵn một subject kỳ 2  
   Student `AEK2SE04`.  
   Kỳ vọng: subject đó bị skip duplicate.

5. `AE-K2-05` - Đã có waitlist sẵn  
   Student `AEK2SE05`.  
   Kỳ vọng: không tạo waitlist trùng cho cùng subject trong cùng kỳ.

6. `AE-K2-06` - Ưu tiên `currentCurriculumSemester = 2`  
   Student `AEK2SE06`.  
   Kỳ vọng: lấy đúng semester order 2.

7. `AE-K2-07` - Tính từ `enrollmentYear` ra kỳ 2  
   Student `AEK2SE07`.  
   Kỳ vọng: xếp môn đúng của curriculum semester 2.

8. `AE-K2-08` - Dry run kỳ 2  
   Student `AEK2SE08`.  
   Kỳ vọng: log có dữ liệu, DB không đổi.

9. `AE-K2-09` - Filter theo `majorCodes = ["SE"]`  
   Setup thêm student AI/BA cùng semester.  
   Kỳ vọng: chỉ SE được xử lý.

10. `AE-K2-10` - `onlyStudentsWithoutEnrollments`  
    Một student kỳ 2 đã có active enrollment, một student khác chưa có.  
    Kỳ vọng: chỉ student chưa có enrollment được chạy.

---

## 7. Example cho Kỳ 3

1. `AE-K3-01` - Happy path Kỳ 3  
   Student `AEK3SE01`, semester order = 3, đủ toàn bộ lớp.  
   Kỳ vọng: enroll toàn bộ môn kỳ 3.

2. `AE-K3-02` - Một môn full  
   Student `AEK3SE02`.  
   Kỳ vọng: 1 waitlist, các môn khác enroll.

3. `AE-K3-03` - Không có class section cho một môn  
   Student `AEK3SE03`.  
   Kỳ vọng: môn không có lớp mở sẽ đi waitlist như case full.

4. `AE-K3-04` - Đã enroll sẵn 2 môn  
   Student `AEK3SE04`.  
   Kỳ vọng: 2 môn bị skip duplicate, chỉ xếp phần còn lại.

5. `AE-K3-05` - Có waitlist cũ đúng kỳ, đúng subject  
   Student `AEK3SE05`.  
   Kỳ vọng: không tạo thêm waitlist mới.

6. `AE-K3-06` - Ưu tiên current semester  
   Student `AEK3SE06`, `currentCurriculumSemester = 3`.  
   Kỳ vọng: dùng kỳ 3, không dùng kết quả tính khác.

7. `AE-K3-07` - Tính semester từ enrollmentYear  
   Student `AEK3SE07`.  
   Kỳ vọng: resolve ra kỳ 3 và lấy đúng subject.

8. `AE-K3-08` - Dry run  
   Student `AEK3SE08`.  
   Kỳ vọng: không ghi DB.

9. `AE-K3-09` - Filter theo `studentCodes`  
   Chỉ truyền `AEK3SE09`.  
   Kỳ vọng: chỉ 1 student có log.

10. `AE-K3-10` - `limit = 1`  
    Setup nhiều student kỳ 3.  
    Kỳ vọng: chỉ student đầu tiên theo sort được xử lý.

---

## 8. Example cho Kỳ 4

1. `AE-K4-01` - Happy path kỳ 4  
2. `AE-K4-02` - Một môn full kỳ 4  
3. `AE-K4-03` - Toàn bộ môn kỳ 4 full  
4. `AE-K4-04` - Đã enroll sẵn một môn kỳ 4  
5. `AE-K4-05` - Đã waitlist sẵn một môn kỳ 4  
6. `AE-K4-06` - Ưu tiên `currentCurriculumSemester = 4`  
7. `AE-K4-07` - Không có `currentCurriculumSemester`, tính từ `enrollmentYear` ra 4  
8. `AE-K4-08` - Dry run kỳ 4  
9. `AE-K4-09` - Filter theo major  
10. `AE-K4-10` - `onlyStudentsWithoutEnrollments` ở kỳ 4  

Chi tiết kỳ vọng cho kỳ 4 giống các pattern `P01` đến `P10`, chỉ thay semester order thành `4`.

---

## 9. Example cho Kỳ 5

1. `AE-K5-01` - Happy path kỳ 5  
2. `AE-K5-02` - Một môn full kỳ 5  
3. `AE-K5-03` - Không có class section cho một subject kỳ 5  
4. `AE-K5-04` - Student đã enroll sẵn một subject kỳ 5  
5. `AE-K5-05` - Student đã waitlist sẵn một subject kỳ 5  
6. `AE-K5-06` - Ưu tiên `currentCurriculumSemester = 5`  
7. `AE-K5-07` - Tính từ `enrollmentYear` ra 5  
8. `AE-K5-08` - Dry run kỳ 5  
9. `AE-K5-09` - Chạy với `studentCodes`  
10. `AE-K5-10` - Chạy với `limit = 2`  

Chi tiết kỳ vọng cho kỳ 5 giống các pattern `P01` đến `P10`, chỉ thay semester order thành `5`.

---

## 10. Example cho Kỳ 6

1. `AE-K6-01` - Happy path kỳ 6  
2. `AE-K6-02` - Một môn full kỳ 6  
3. `AE-K6-03` - Tất cả môn full kỳ 6  
4. `AE-K6-04` - Đã enroll sẵn một subject kỳ 6  
5. `AE-K6-05` - Đã waitlist sẵn một subject kỳ 6  
6. `AE-K6-06` - Ưu tiên `currentCurriculumSemester = 6`  
7. `AE-K6-07` - Tính semester từ `enrollmentYear` ra 6  
8. `AE-K6-08` - Dry run kỳ 6  
9. `AE-K6-09` - Chạy theo `majorCodes = ["AI"]`  
10. `AE-K6-10` - `onlyStudentsWithoutEnrollments` ở kỳ 6  

Chi tiết kỳ vọng cho kỳ 6 giống các pattern `P01` đến `P10`, chỉ thay semester order thành `6`.

---

## 11. Example cho Kỳ 7

1. `AE-K7-01` - Happy path kỳ 7  
2. `AE-K7-02` - Một subject full kỳ 7  
3. `AE-K7-03` - Một subject không có lớp mở  
4. `AE-K7-04` - Đã enroll sẵn subject kỳ 7  
5. `AE-K7-05` - Đã waitlist sẵn subject kỳ 7  
6. `AE-K7-06` - Ưu tiên `currentCurriculumSemester = 7`  
7. `AE-K7-07` - Tính từ `enrollmentYear` ra 7  
8. `AE-K7-08` - Dry run kỳ 7  
9. `AE-K7-09` - Filter theo `studentCodes`  
10. `AE-K7-10` - Chạy với `limit = 1`  

Chi tiết kỳ vọng cho kỳ 7 giống các pattern `P01` đến `P10`, chỉ thay semester order thành `7`.

---

## 12. Example cho Kỳ 8

1. `AE-K8-01` - Happy path kỳ 8  
2. `AE-K8-02` - Một môn full kỳ 8  
3. `AE-K8-03` - Tất cả subject full kỳ 8  
4. `AE-K8-04` - Đã enroll sẵn một subject kỳ 8  
5. `AE-K8-05` - Đã waitlist sẵn một subject kỳ 8  
6. `AE-K8-06` - Ưu tiên `currentCurriculumSemester = 8`  
7. `AE-K8-07` - Tính từ `enrollmentYear` ra 8  
8. `AE-K8-08` - Dry run kỳ 8  
9. `AE-K8-09` - Filter theo major  
10. `AE-K8-10` - `onlyStudentsWithoutEnrollments` ở kỳ 8  

Chi tiết kỳ vọng cho kỳ 8 giống các pattern `P01` đến `P10`, chỉ thay semester order thành `8`.

---

## 13. Example cho Kỳ 9

1. `AE-K9-01` - Happy path kỳ 9  
2. `AE-K9-02` - Một subject full kỳ 9  
3. `AE-K9-03` - Không có class section cho một subject kỳ 9  
4. `AE-K9-04` - Đã enroll sẵn một subject kỳ 9  
5. `AE-K9-05` - Đã waitlist sẵn một subject kỳ 9  
6. `AE-K9-06` - Ưu tiên `currentCurriculumSemester = 9`  
7. `AE-K9-07` - Tính từ `enrollmentYear` ra 9  
8. `AE-K9-08` - Dry run kỳ 9  
9. `AE-K9-09` - Chạy theo `studentCodes`  
10. `AE-K9-10` - `limit = 1` cho nhóm student kỳ 9  

Chi tiết kỳ vọng cho kỳ 9 giống các pattern `P01` đến `P10`, chỉ thay semester order thành `9`.

---

## 14. Bộ example bổ sung ngoài 90 case theo kỳ

Đây là các case rất nên có vì chúng test đúng phần business rule sâu của service.

1. `AE-EX-01` - Student thiếu `majorCode`  
   Kỳ vọng:
   - không resolve được curriculum
   - `failed` tăng
   - log báo `Missing majorCode`

2. `AE-EX-02` - Student thiếu `enrollmentYear`, không có `currentCurriculumSemester`  
   Kỳ vọng:
   - không chọn được curriculum semester hợp lệ
   - preflight báo thiếu `enrollmentYear`

3. `AE-EX-03` - Major không có curriculum active  
   Kỳ vọng:
   - student vào nhóm `studentsWithoutCurriculumByMajor`

4. `AE-EX-04` - Có curriculum active nhưng không match `enrollmentYear`  
   Kỳ vọng:
   - log lỗi `no_curriculum_for_enrollment_year`

5. `AE-EX-05` - `CurriculumCourse.subject` bị null  
   Kỳ vọng:
   - `curriculumSubjectMappingIssues` tăng
   - log có `Curriculum course is missing linked subject data`

6. `AE-EX-06` - Semester không tồn tại  
   Request:
   - truyền `semesterId` sai  
   Kỳ vọng:
   - API trả `404`

7. `AE-EX-07` - Không có class section mở nào cho semester  
   Kỳ vọng:
   - preflight cảnh báo `No open class sections found`
   - không tạo enrollment

8. `AE-EX-08` - 2 class section cùng subject, cùng capacity, khác `classCode`  
   Kỳ vọng:
   - hệ thống chọn class có `classCode` nhỏ hơn để ổn định

9. `AE-EX-09` - 2 class section cùng subject, một lớp ít sinh viên hơn  
   Kỳ vọng:
   - hệ thống chọn lớp có `currentEnrollment` thấp hơn

10. `AE-EX-10` - Student có enrollment ở subject khác nhưng cùng semester  
    Kỳ vọng:
    - chỉ subject trùng mới bị skip duplicate
    - subject mới vẫn được xếp nếu còn chỗ

11. `AE-EX-11` - `onlyStudentsWithoutEnrollments = true` với student có enrollment `completed`  
    Kỳ vọng:
    - vì state activeSubjectIds có thể đã có dữ liệu từ enrollment đã lấy vào batch, student này không được coi là “trắng” hoàn toàn

12. `AE-EX-12` - Có waitlist cũ ở semester trước  
    Kỳ vọng:
    - waitlist của semester cũ không được xem là waitlist trùng cho semester hiện tại

13. `AE-EX-13` - Chạy lặp lại 2 lần liên tiếp  
    Kỳ vọng:
    - lần sau không tạo duplicate enrollment
    - summary có `duplicates` hoặc skip tăng

14. `AE-EX-14` - Batch có mixed result  
    Setup:
    - một số student happy path
    - một số student thiếu curriculum
    - một số student full class  
    Kỳ vọng:
    - summary có cả `studentsWithEnrollments`, `studentsWithErrors`, `waitlisted`

15. `AE-EX-15` - Dry run rồi chạy thật ngay sau đó  
    Kỳ vọng:
    - dry run không ghi DB
    - lần chạy thật mới sinh enrollment/waitlist

---

## 15. Gợi ý nhóm dữ liệu tối thiểu nếu bạn muốn demo đẹp

Nếu muốn demo trước lớp hoặc trước reviewer, nên chuẩn bị:

- 9 student chính:
  - mỗi student đại diện một `currentCurriculumSemester` từ `1` đến `9`
- 9 group class section:
  - mỗi group đại diện subject pool cho một kỳ
- 1 nhóm class đủ chỗ
- 1 nhóm class full
- 1 nhóm class không tồn tại
- 1 nhóm student thiếu `enrollmentYear`
- 1 nhóm student không có curriculum

Như vậy bạn có thể demo:

- happy path
- waitlist
- duplicate
- dry run
- filter
- preflight warning

---

## 16. Checklist chạy demo nhanh trước buổi báo cáo

1. Chọn một `Semester` đúng ở Admin `Auto Enrollment`
2. Chạy `dryRun = true` trước để xem summary/log
3. Kiểm tra:
   - `totalStudents`
   - `studentsWithEnrollments`
   - `waitlisted`
   - `duplicates`
   - `failed`
4. Chạy lại `dryRun = false`
5. Kiểm tra DB:
   - `ClassEnrollment`
   - `Waitlist`
   - `ClassSection.currentEnrollment`
6. Chụp màn hình:
   - summary
   - preflight
   - log theo từng student

---

## 17. Kết luận

Bộ tài liệu này cung cấp:

- **90 example theo từng kỳ**: từ `AE-K1-01` đến `AE-K9-10`
- **15 example bổ sung nâng cao**: từ `AE-EX-01` đến `AE-EX-15`

Tổng cộng bạn có thể dùng ngay:

- **105 example/test case**

Nếu cần bước tiếp theo, có thể làm thêm:

- file seed script tạo đúng bộ student/class theo các mã `AE-Kx-yy`
- file Postman collection cho toàn bộ case
- checklist test tay dạng bảng có cột `Pass/Fail/Note`
