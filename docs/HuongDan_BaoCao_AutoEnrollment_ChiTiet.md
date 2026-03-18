# Hướng Dẫn Báo Cáo Chức Năng Auto-Assign Students To Classes

## 1. Mục đích của tài liệu

Tài liệu này giải thích chi tiết chức năng **Auto Enrollment** trong dự án hiện tại theo đúng code đang chạy, để bạn có thể:

- hiểu bài toán nghiệp vụ mà chức năng này giải quyết
- hiểu luồng xử lý từ giao diện admin đến database
- hiểu vai trò của từng file, từng hàm chính
- hiểu tại sao code lại tổ chức như vậy
- biết rõ chức năng này đang làm được gì và chưa làm gì
- có sẵn ý để đi báo cáo

Phần này tập trung vào yêu cầu:

> Tự động xếp tất cả sinh viên vào các lớp học phần tương ứng với môn học trong `CurriculumSemester` của kỳ hiện tại.

Bao gồm:

- Backend: `triggerAutoEnrollment(semesterId)`
- API: `POST /api/auto-enrollment/trigger`
- Frontend: trang admin để chạy auto-enrollment và xem log kết quả

---

## 2. Chức năng này dùng để làm gì?

### 2.1. Bài toán nghiệp vụ

Trong hệ thống học vụ, mỗi sinh viên thuộc một:

- ngành học (`majorCode`)
- khóa học (`cohort`)
- năm nhập học (`enrollmentYear`)
- kỳ hiện tại trong khung chương trình (`currentCurriculumSemester` hoặc được tính từ dữ liệu)

Mỗi ngành sẽ có một **Curriculum**. Mỗi curriculum lại có các **CurriculumSemester**. Mỗi curriculum semester chứa danh sách các môn phải học ở kỳ đó.

Khi trường mở một học kỳ mới, nếu làm thủ công thì admin phải:

- xác định từng sinh viên đang học kỳ mấy trong chương trình
- lấy danh sách môn của kỳ đó
- tìm lớp học phần đang mở cho từng môn
- tạo enrollment cho từng sinh viên
- xử lý trường hợp lớp đầy hoặc sinh viên đã có enrollment rồi

Việc này rất tốn thời gian nếu số lượng sinh viên lớn.

### 2.2. Mục tiêu của Auto Enrollment

Chức năng này tự động làm các bước trên:

1. Lấy danh sách sinh viên đủ điều kiện xử lý.
2. Xác định curriculum phù hợp cho từng sinh viên.
3. Tính hoặc đọc curriculum semester hiện tại.
4. Lấy danh sách môn trong curriculum semester đó.
5. Tìm lớp học phần đang mở cho từng môn.
6. Tạo `ClassEnrollment`.
7. Nếu không còn chỗ thì đưa vào `Waitlist`.
8. Trả lại log để admin biết sinh viên nào được xếp, sinh viên nào bị lỗi, môn nào bị waitlist.

### 2.3. Giá trị của chức năng

- giảm thao tác thủ công cho admin
- giảm nguy cơ xếp sót sinh viên
- chuẩn hóa theo curriculum
- có log để kiểm tra sau khi chạy
- hỗ trợ `dry run` để chạy thử trước khi ghi DB thật

---

## 3. Context của dự án liên quan đến chức năng này

Đây là hệ thống quản lý học vụ. Trong feature này có 3 nhóm actor chính:

- **Admin/Staff**: người bấm chạy auto-enrollment
- **Backend Service**: nơi xử lý logic nghiệp vụ
- **Database MongoDB**: nơi lưu curriculum, class section, enrollment, waitlist

Chức năng này **không phải** là student tự đăng ký môn. Nó là luồng **admin chủ động chạy hàng loạt**.

Điểm rất quan trọng để đi báo cáo:

- **Student registration** là luồng sinh viên tự chọn lớp
- **Auto enrollment** là luồng hệ thống tự xếp lớp hàng loạt theo curriculum

Hai luồng này khác nhau về mục đích và logic.

---

## 4. Các file chính tham gia vào chức năng

### 4.1. Backend

- `backend-api/src/modules/autoEnrollment/autoEnrollment.routes.js`
- `backend-api/src/modules/autoEnrollment/autoEnrollment.controller.js`
- `backend-api/src/modules/autoEnrollment/autoEnrollment.service.js`
- `backend-api/src/modules/autoEnrollment/autoEnrollment.repository.js`
- `backend-api/src/models/classSection.model.js`
- `backend-api/src/models/classEnrollment.model.js`
- `backend-api/src/models/waitlist.model.js`
- `backend-api/src/models/student.model.js`
- `backend-api/src/models/semester.model.js`
- `backend-api/src/services/curriculum.service.js`
- `backend-api/src/services/paymentValidation.service.js`

### 4.2. Frontend

- `frontend-web/src/services/autoEnrollmentService.js`
- `frontend-web/src/pages/admin/AutoEnrollmentPage.jsx`
- `frontend-web/src/pages/admin/Dashboard.jsx`
- `frontend-web/src/App.jsx`

### 4.3. File liên quan nhưng không phải luồng chính

- `backend-api/src/modules/semester/semester.service.js`

File này dùng khi admin set `Semester.isCurrent = true`, hệ thống có thể tự gọi `triggerAutoEnrollment`. Đây là feature liên quan, nhưng không phải điểm bắt đầu chính của use case “admin bấm chạy auto-enrollment”.

---

## 5. Các model và dữ liệu quan trọng

### 5.1. Student

Model: `backend-api/src/models/student.model.js`

Các field quan trọng:

- `studentCode`: mã sinh viên
- `fullName`: tên sinh viên
- `majorCode`: mã ngành
- `cohort`: khóa
- `enrollmentYear`: năm nhập học
- `academicStatus`: trạng thái học tập
- `isActive`: còn hoạt động hay không
- `currentCurriculumSemester`: sinh viên đang ở kỳ mấy trong curriculum
- `userId`: liên kết sang user account

Vai trò trong feature:

- là đối tượng được auto-enroll
- dùng để xác định curriculum phù hợp
- dùng để xác định curriculum semester hiện tại

### 5.2. Semester

Model: `backend-api/src/models/semester.model.js`

Field quan trọng:

- `semesterNum`
- `academicYear`
- `isCurrent`
- `isActive`

Vai trò:

- xác định học kỳ đang xử lý
- dùng để lọc class section đúng kỳ

### 5.3. Curriculum, CurriculumSemester, CurriculumCourse

Vai trò:

- `Curriculum`: khung chương trình của ngành
- `CurriculumSemester`: kỳ số mấy trong khung chương trình
- `CurriculumCourse`: môn học thuộc một curriculum semester

Ý nghĩa:

- đây là nguồn dữ liệu để biết sinh viên trong kỳ này phải học những môn nào

### 5.4. Subject

Vai trò:

- là môn học gốc
- `CurriculumCourse` sẽ trỏ đến `Subject`
- `ClassSection` cũng trỏ đến `Subject`

### 5.5. ClassSection

Model: `backend-api/src/models/classSection.model.js`

Field quan trọng:

- `subject`
- `semester`
- `academicYear`
- `status`
- `currentEnrollment`
- `maxCapacity`
- `teacher`
- `room`
- `timeslot`

Vai trò:

- là lớp học phần thực tế mà sinh viên sẽ được xếp vào

### 5.6. ClassEnrollment

Model: `backend-api/src/models/classEnrollment.model.js`

Vai trò:

- lưu kết quả “sinh viên đã được xếp vào lớp nào”

Field quan trọng:

- `student`
- `classSection`
- `status`
- `note`
- `isOverload`

### 5.7. Waitlist

Model: `backend-api/src/models/waitlist.model.js`

Vai trò:

- nếu môn có trong curriculum semester nhưng không còn class section phù hợp hoặc class đầy thì sinh viên không bị bỏ quên
- thay vào đó, hệ thống tạo bản ghi waitlist

Field quan trọng:

- `student`
- `subject`
- `targetSemester`
- `targetAcademicYear`
- `status`
- `cancelReason`

---

## 6. Luồng tổng thể từ FE đến DB

Luồng chạy đầy đủ:

1. Admin vào trang `/admin/auto-enrollment`.
2. Admin chọn semester, nhập filter nếu cần.
3. Admin bấm nút chạy.
4. Frontend gọi `POST /api/auto-enrollment/trigger`.
5. Route nhận request.
6. Controller validate input cơ bản và chuẩn hóa filter.
7. Service `triggerAutoEnrollment()` chạy logic chính.
8. Repository đọc dữ liệu từ MongoDB.
9. Service tạo danh sách enrollment chờ ghi và waitlist chờ ghi.
10. Repository bulk upsert enrollment, tăng sĩ số lớp, bulk upsert waitlist.
11. Service trả summary + logs.
12. Frontend render summary, preflight, execution logs.

Có thể hình dung ngắn gọn như sau:

```text
Admin
  -> AutoEnrollmentPage
  -> autoEnrollmentService.trigger()
  -> POST /api/auto-enrollment/trigger
  -> controller.trigger()
  -> service.triggerAutoEnrollment()
  -> repository đọc Student/Curriculum/ClassSection/Enrollment/Waitlist
  -> service build batch enrollment + waitlist
  -> repository bulk write
  -> response summary/logs
  -> AutoEnrollmentPage hiển thị kết quả
```

---

## 7. Backend chi tiết

## 7.1. Route

File: `backend-api/src/modules/autoEnrollment/autoEnrollment.routes.js`

```js
router.post(
  '/trigger',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  controller.trigger,
);
```

### Vai trò

- khai báo endpoint API
- bắt buộc phải đăng nhập
- chỉ `admin` hoặc `staff` mới được gọi

### Tại sao cần route riêng

- để tách feature auto-enrollment thành một module độc lập
- dễ bảo trì, dễ gắn quyền truy cập

---

## 7.2. Controller

File: `backend-api/src/modules/autoEnrollment/autoEnrollment.controller.js`

### Hàm `normalizeCodeList(value)`

Vai trò:

- chuẩn hóa `majorCodes` hoặc `studentCodes`
- chấp nhận cả mảng và chuỗi
- cắt khoảng trắng, dấu phẩy, dấu chấm phẩy, xuống dòng
- uppercase để so sánh ổn định

Vì sao cần:

- frontend có thể gửi input từ text box dạng `SE, CE, DS`
- backend nên chuẩn hóa trước khi xử lý

### Hàm `trigger(req, res)`

Đây là entry point của API.

Code ý tưởng:

```js
const result = await service.triggerAutoEnrollment(semesterId, {
  dryRun: dryRun === true,
  limit: Number.isInteger(Number(limit)) ? Number(limit) : undefined,
  majorCodes: normalizeCodeList(majorCodes),
  studentCodes: normalizeCodeList(studentCodes),
  onlyStudentsWithoutEnrollments: onlyStudentsWithoutEnrollments === true,
});
```

### Vai trò

- lấy `semesterId` từ body
- kiểm tra field bắt buộc
- chuẩn hóa options
- gọi service
- trả JSON response

### Tại sao controller không chứa business logic

Vì controller chỉ nên:

- nhận request
- validate input cơ bản
- gọi service
- trả response

Nếu để toàn bộ nghiệp vụ ở controller thì:

- khó test
- khó tái sử dụng
- file controller sẽ rất phình to

---

## 7.3. Repository

File: `backend-api/src/modules/autoEnrollment/autoEnrollment.repository.js`

Repository là lớp chuyên đọc/ghi DB. Nó giúp service không phải viết query Mongo trực tiếp quá nhiều.

### Các hàm chính

| Hàm | Vai trò |
| --- | --- |
| `findSemesterById` | Lấy semester theo id |
| `findCurrentSemester` | Lấy semester hiện tại |
| `findStudentById` | Lấy student theo id |
| `findEligibleStudents` | Lấy danh sách sinh viên active và đang học |
| `findActiveCurriculums` | Lấy tất cả curriculum active |
| `findMajorsByCodes` | Lấy thông tin ngành để build alias |
| `findOpenClassSections` | Lấy các lớp đang mở (`published`, `scheduled`) |
| `findSemesterEnrollments` | Lấy enrollment hiện có trong các class section đang xét |
| `findSemesterWaitlists` | Lấy waitlist đang chờ của kỳ đó |
| `bulkUpsertEnrollments` | Ghi enrollment theo batch |
| `bulkUpsertWaitlists` | Ghi waitlist theo batch |
| `bulkIncrementClassSections` | Tăng `currentEnrollment` theo batch |
| `findClassSectionById` | Lấy class section theo id |

### Tại sao tách repository

- service tập trung vào nghiệp vụ
- repository tập trung vào query
- dễ mock/test
- thay đổi DB query sẽ ít ảnh hưởng logic chính

---

## 7.4. Service chính: `autoEnrollment.service.js`

Đây là file quan trọng nhất của feature.

File: `backend-api/src/modules/autoEnrollment/autoEnrollment.service.js`

Service này có 4 nhóm hàm:

1. Hàm helper tạo key, cache, state.
2. Hàm helper chọn class section, queue waitlist, format lỗi.
3. Hàm xử lý đơn lẻ như `previewAutoEnrollment`, `autoEnrollAfterPayment`.
4. Hàm chính `triggerAutoEnrollment`.

---

## 8. Giải thích chi tiết từng helper quan trọng

## 8.1. Nhóm helper tạo key và chuẩn hóa dữ liệu

### `buildStudentSubjectKey(studentId, subjectId)`

Trả về chuỗi:

```js
`${studentId}:${subjectId}`
```

Vai trò:

- tạo key duy nhất cho cặp `student + subject`
- dùng để kiểm tra duplicate waitlist

### `buildCurriculumSemesterKey(curriculumId, semesterOrder)`

Vai trò:

- tạo key cache cho danh sách môn của một curriculum semester

Ví dụ:

- curriculum A, semester 2
- curriculum B, semester 2

Hai key khác nhau, nên cache không bị đè.

### `normalizeCodeList(values)`

Vai trò:

- chuẩn hóa danh sách major code hoặc student code
- tránh lỗi do viết thường, trùng, khoảng trắng

### `parsePositiveInteger(value)`

Vai trò:

- dùng cho option `limit`
- chỉ chấp nhận số nguyên dương

### `incrementMapCounter(map, key, amount = 1)`

Vai trò:

- dùng để cộng dồn số lượng tăng `currentEnrollment` cho từng class
- thay vì update DB từng lần

---

## 8.2. Nhóm helper build state và pool

### `buildClassSectionPools(classSections)`

Hàm này biến danh sách class section thành 2 cấu trúc:

- `classSectionsById`
- `classSectionsBySubject`

Ý nghĩa:

- tra cứu theo `classSectionId` nhanh
- tra cứu danh sách lớp của một `subject` nhanh

Tại sao cần:

- trong batch lớn, nếu mỗi lần xử lý sinh viên lại query DB thì rất chậm
- gom dữ liệu vào `Map` giúp xử lý trong RAM nhanh hơn

### `buildStudentStateMap(existingEnrollments, classSectionsById)`

Hàm này build trạng thái hiện tại của từng sinh viên:

- `activeSubjectIds`
- `occupiedClassSectionIds`

Ý nghĩa:

- `activeSubjectIds`: sinh viên đã có enrollment active ở môn nào rồi
- `occupiedClassSectionIds`: sinh viên đã chiếm chỗ ở class section nào rồi

Tại sao cần:

- tránh enroll trùng môn
- tránh xử lý một sinh viên như thể họ đang rỗng dữ liệu

### `getOrCreateStudentState(stateByStudent, studentId)`

Vai trò:

- nếu student đã có state thì lấy ra
- nếu chưa có thì tạo state rỗng

---

## 8.3. Nhóm helper liên quan curriculum

### `buildMajorAliasesByCode(majorCodes, majors)`

Vai trò:

- build alias giữa `majorCode` và `majorName`

Ví dụ:

- `SE` có thể tương ứng với `SOFTWARE ENGINEERING`

Tại sao cần:

- trong DB curriculum, field `major` có thể lưu theo code hoặc theo tên
- nếu chỉ match cứng `SE === SE` thì có thể miss curriculum

### `buildCurriculumMatchCacheKey(student)`

Hàm dùng:

- `majorCode`
- `enrollmentYear`

để tạo key cache.

Vì sao cần:

- nhiều sinh viên có cùng ngành và cùng năm nhập học
- curriculum match của họ thường giống nhau
- cache giúp không phải tính lại nhiều lần

### `getCurriculumMatchCached(cache, student, options)`

Vai trò:

- gọi `curriculumService.getCurriculumMatchForStudent(...)`
- nhưng có cache

### `getCurriculumSemesterOrderCached(cache, student, semester, options)`

Vai trò:

- xác định sinh viên đang thuộc curriculum semester nào

Logic:

- nếu `student.currentCurriculumSemester` đã có thì ưu tiên dùng luôn
- nếu chưa có thì gọi:

```js
paymentValidationService.calculateStudentCurriculumSemester(student, semester, options)
```

Tại sao cần:

- vì auto-enrollment phải biết sinh viên cần học môn của kỳ nào trong curriculum

### `getCurriculumSemesterSubjectsCached(cache, curriculumId, curriculumSemesterOrder)`

Vai trò:

- lấy danh sách môn theo curriculum + semesterOrder
- cache lại để nhiều sinh viên cùng curriculum không phải query lặp

---

## 8.4. Nhóm helper chọn lớp và waitlist

### `pickAvailableClassSection(subjectId, classSectionsBySubject, occupiedClassSectionIds)`

Đây là helper rất quan trọng.

Logic chọn lớp:

1. Lấy tất cả class section của môn đó.
2. Bỏ qua class section mà sinh viên đã chiếm chỗ rồi.
3. Bỏ qua class section đã đầy.
4. Chọn class có `currentEnrollment` thấp nhất.
5. Nếu hòa thì chọn theo `classCode` tăng dần.

Nói dễ hiểu:

- hệ thống cố gắng chia đều sinh viên vào các lớp còn chỗ

Tại sao cần:

- tránh dồn hết sinh viên vào một lớp
- vẫn đảm bảo deterministic, tức là chạy lại sẽ dễ giải thích

### `queueWaitlistIfNeeded(...)`

Vai trò:

- không ghi `Waitlist` ngay
- chỉ push vào `pendingWaitlistDocs`
- đồng thời đánh dấu trong `waitlistSet`

Tại sao cần:

- hỗ trợ `dryRun`
- tránh ghi DB từng món
- giúp cuối cùng mới `bulkUpsertWaitlists`

### `formatAutoEnrollmentPersistenceError(error)`

Vai trò:

- format lỗi DB thành message dễ hiểu hơn
- đặc biệt xử lý trường hợp index waitlist cũ

Tại sao cần:

- nếu để raw Mongo error, admin khó hiểu
- message domain-specific sẽ dễ debug hơn

---

## 8.5. Nhóm helper log và preflight

### `formatCurriculumError(match, student)`

Vai trò:

- biến lỗi curriculum thành câu dễ đọc

Ví dụ:

- thiếu `majorCode`
- thiếu `enrollmentYear`
- không có curriculum active cho ngành
- có curriculum của ngành nhưng không khớp `enrollmentYear`

### `buildPreflightSummary(...)`

Vai trò:

- tạo phần tóm tắt trước khi xem execution logs

Nó trả các thông tin như:

- có bao nhiêu curriculum active
- có bao nhiêu open class section
- bao nhiêu sinh viên thiếu `enrollmentYear`
- major nào không có curriculum phù hợp
- warning nào cần chú ý

Tại sao cần:

- admin xem toàn cảnh trước khi soi từng sinh viên
- hỗ trợ debug dữ liệu master

---

## 9. Hàm chính `triggerAutoEnrollment(semesterId, options)`

Đây là trái tim của feature.

Signature:

```js
async function triggerAutoEnrollment(semesterId, options = {})
```

### 9.1. Input

- `semesterId`: semester cần chạy
- `options.dryRun`: chạy thử, không ghi DB
- `options.majorCodes`: chỉ chạy cho một số ngành
- `options.studentCodes`: chỉ chạy cho một số sinh viên
- `options.limit`: giới hạn số sinh viên xử lý
- `options.onlyStudentsWithoutEnrollments`: chỉ lấy sinh viên chưa có enrollment ở kỳ hiện tại

### 9.2. Output

Hàm trả object chứa:

- `success`
- `dryRun`
- `durationMs`
- `semester`
- `summary`
- `preflight`
- `filters`
- `logs`

Đây là lý do FE có thể render được bảng log rất chi tiết.

---

## 10. Phân rã `triggerAutoEnrollment` theo từng bước

## Bước 1. Chuẩn hóa option và dựng filter summary

Code đang làm:

- đọc `dryRun`
- chuẩn hóa `majorCodes`
- chuẩn hóa `studentCodes`
- parse `limit`
- build `filters`

Ý nghĩa:

- giúp response trả lại đúng “lần chạy này được cấu hình như thế nào”

---

## Bước 2. Kiểm tra semester có tồn tại hay không

```js
const semester = await repo.findSemesterById(semesterId);
if (!semester) {
  const error = new Error('Semester not found');
  error.statusCode = 404;
  throw error;
}
```

Vai trò:

- chặn từ đầu nếu input sai

Tại sao cần:

- toàn bộ logic sau đó phụ thuộc `semester.semesterNum` và `semester.academicYear`

---

## Bước 3. Load dữ liệu nền song song

Hàm load song song 4 thứ:

```js
const [candidateStudents, activeCurriculums, classSections, termsPerYear] = await Promise.all([
  repo.findEligibleStudents(...),
  repo.findActiveCurriculums(),
  repo.findOpenClassSections(...),
  paymentValidationService.resolveTermsPerYear(semester),
]);
```

### Ý nghĩa từng thành phần

- `candidateStudents`: sinh viên đủ điều kiện sơ bộ để xét
- `activeCurriculums`: toàn bộ curriculum active
- `classSections`: các lớp đang mở của semester đó
- `termsPerYear`: một năm học có bao nhiêu học kỳ, dùng để tính curriculum semester

### Tại sao dùng `Promise.all`

- giảm thời gian chờ
- các query này độc lập với nhau

---

## Bước 4. Build map để xử lý nhanh trong RAM

Sau khi load class section, service build:

- `classSectionsById`
- `classSectionsBySubject`

Sau khi load students, service còn build:

- `majorAliasesByCode`
- `curriculumLookup`

Ý nghĩa:

- tránh query DB lặp trong vòng lặp sinh viên
- đẩy phần lớn xử lý sang cấu trúc `Map` trong RAM

---

## Bước 5. Load enrollment hiện có và waitlist hiện có

Nếu có student và có class section, service load:

- `existingEnrollments`
- `existingWaitlists`

Vai trò:

- biết sinh viên đã có enrollment nào rồi
- biết sinh viên đã chờ waitlist nào rồi

Tại sao cần:

- chống duplicate
- tránh tạo waitlist trùng

---

## Bước 6. Áp filter cuối cùng lên danh sách sinh viên

Sau khi có `candidateStudents`, service có thể lọc tiếp:

- chỉ lấy sinh viên chưa có enrollment nếu `onlyStudentsWithoutEnrollments = true`
- cắt theo `limit` nếu có

Ý nghĩa:

- giúp admin có thể chạy thử một phần
- hỗ trợ debug hoặc chạy theo ngành

---

## Bước 7. Chuẩn bị các biến thống kê

Service tạo các biến:

- `logs`
- `totalEnrollments`
- `waitlisted`
- `duplicates`
- `failed`
- `studentsWithErrors`
- `studentsWithEnrollments`
- `studentsMissingEnrollmentYear`
- `curriculumSubjectMappingIssues`
- `studentsWithoutCurriculumByMajor`
- `studentsWithoutCurriculumByReason`
- `pendingEnrollmentDocs`
- `pendingWaitlistDocs`
- `classSectionIncrementMap`

Ý nghĩa:

- vừa chạy vừa cộng dồn kết quả
- cuối cùng trả summary cho FE

---

## Bước 8. Vòng lặp chính theo từng sinh viên

Mỗi sinh viên có một `studentLog` riêng:

```js
const studentLog = {
  studentId: student._id,
  studentCode: student.studentCode,
  fullName: student.fullName,
  enrolled: [],
  waitlisted: [],
  skipped: [],
  errors: [],
};
```

### Vì sao cần `studentLog`

- admin muốn xem chi tiết theo từng sinh viên
- dễ debug khi có lỗi dữ liệu

---

## Bước 9. Tìm curriculum phù hợp cho sinh viên

Service gọi:

```js
const curriculumMatch = await getCurriculumMatchCached(...)
```

Thực chất bên trong dùng:

```js
curriculumService.getCurriculumMatchForStudent(student, ...)
```

Logic match trong `curriculum.service.js`:

1. Lấy `majorCode`.
2. Build alias cho ngành.
3. Tìm toàn bộ curriculum active khớp ngành.
4. Lấy `enrollmentYear`.
5. Chọn curriculum có `academicYear` bao phủ `enrollmentYear`.

### Tại sao cần match như vậy

Vì 2 sinh viên cùng ngành nhưng khác khóa có thể phải học curriculum khác version.

### Nếu không match được

Service sẽ:

- ghi lỗi vào `studentLog.errors`
- tăng bộ đếm lỗi
- chuyển sang sinh viên tiếp theo

---

## Bước 10. Xác định curriculum semester hiện tại của sinh viên

Service gọi:

```js
const curriculumSemesterOrder = await getCurriculumSemesterOrderCached(...)
```

Logic:

- nếu `student.currentCurriculumSemester` đã có thì dùng luôn
- nếu chưa có thì tính bằng:

```js
paymentValidationService.calculateStudentCurriculumSemester(student, semester, { termsPerYear })
```

### Tại sao phải có bước này

Auto-enrollment không thể enroll mù toàn curriculum.

Nó phải biết:

- sinh viên đang ở kỳ 1, 2, 3... trong chương trình
- từ đó mới lấy đúng danh sách môn của kỳ đó

---

## Bước 11. Lấy danh sách môn của curriculum semester

Service gọi:

```js
const semesterSubjects = await getCurriculumSemesterSubjectsCached(
  curriculumSemesterSubjectsCache,
  curriculum._id,
  curriculumSemesterOrder,
);
```

Thực chất bên dưới dùng:

```js
curriculumService.getSubjectsBySemester(curriculum._id, curriculumSemesterOrder)
```

### Điều gì xảy ra nếu không có môn

Service không coi đây là lỗi hệ thống nặng.

Nó ghi:

- `studentLog.skipped`

và bỏ qua sinh viên đó.

---

## Bước 12. Duyệt từng môn trong curriculum semester

Đây là đoạn quyết định “xếp được hay không”.

### Trường hợp 1: Môn bị lỗi mapping dữ liệu

Nếu `subjectData.subject` không có `_id`:

- tăng `curriculumSubjectMappingIssues`
- tăng `failed`
- ghi lỗi vào `studentLog.errors`

Ý nghĩa:

- curriculum có bản ghi môn nhưng không link đúng sang `Subject`

### Trường hợp 2: Sinh viên đã có enrollment active ở môn đó

Nếu `studentState.activeSubjectIds.has(subjectId)`:

- tăng `duplicates`
- ghi `already enrolled`
- không enroll lại

Tại sao cần:

- tránh cùng một sinh viên bị xếp 2 lần vào cùng môn

### Trường hợp 3: Có class section khả dụng

Service gọi:

```js
const classSection = pickAvailableClassSection(...)
```

Nếu tìm thấy:

- tạo doc trong `pendingEnrollmentDocs`
- tăng `classSectionIncrementMap`
- tăng `totalEnrollments`
- tăng `classSection.currentEnrollment` trong RAM
- cập nhật `studentState.activeSubjectIds`
- cập nhật `studentState.occupiedClassSectionIds`
- push log vào `studentLog.enrolled`

### Tại sao tăng `currentEnrollment` ngay trong RAM

Rất quan trọng.

Nếu không làm vậy:

- cùng một lần chạy batch
- nhiều sinh viên có thể cùng nhìn thấy một class còn ít chỗ
- rồi cùng được xếp vào đó trong tính toán nội bộ

Việc tăng trong RAM giúp lần lặp sau thấy lớp đã đầy theo trạng thái mới nhất của batch hiện tại.

### Trường hợp 4: Không có class section phù hợp

Nếu `pickAvailableClassSection(...)` trả về `null`:

- service không bỏ qua luôn
- service đưa sinh viên vào `pendingWaitlistDocs`
- push log vào `studentLog.waitlisted`

Ý nghĩa:

- môn đó vẫn được theo dõi để xử lý sau

---

## Bước 13. Ghi dữ liệu xuống DB theo batch

Sau khi xử lý hết toàn bộ sinh viên:

```js
await repo.bulkUpsertEnrollments(pendingEnrollmentDocs);
await repo.bulkIncrementClassSections(classSectionIncrementMap);
await repo.bulkUpsertWaitlists(pendingWaitlistDocs);
```

### Tại sao không `create()` từng record ngay trong vòng lặp

Vì batch sẽ tốt hơn cho:

- hiệu năng
- số lần round-trip tới DB
- hỗ trợ `dryRun`
- dễ trả summary cuối cùng

### Ý nghĩa từng batch write

- `bulkUpsertEnrollments`: tạo enrollment nếu chưa có
- `bulkIncrementClassSections`: cập nhật sĩ số lớp
- `bulkUpsertWaitlists`: tạo waitlist nếu chưa có

### Từ khóa `upsert`

`upsert` = nếu tìm thấy bản ghi thì update, không thấy thì insert.

Ở đây mục tiêu chính là:

- chống duplicate
- chạy lại nhiều lần vẫn an toàn hơn so với `insertMany` thuần

---

## Bước 14. Build preflight summary và trả response

Sau khi ghi xong hoặc dry run xong:

- build `preflight`
- tính `durationMs`
- trả toàn bộ `summary + logs`

Kết quả cuối cùng có cấu trúc rất phù hợp để FE hiển thị.

---

## 10.5. Các service phụ trợ mà auto-enrollment phụ thuộc

Đây là phần rất quan trọng để hiểu logic sâu hơn.

### `curriculumService.resolveStudentEnrollmentYear(student)`

Vai trò:

- chuẩn hóa và đọc `enrollmentYear` từ student

Vì sao cần:

- curriculum match phụ thuộc mạnh vào năm nhập học

### `curriculumService.buildCurriculumLookup(curriculums)`

Vai trò:

- build `Map` theo `major`

Vì sao cần:

- giúp tra curriculum theo ngành nhanh hơn trong batch

### `curriculumService.getCurriculumMatchForStudent(student, options)`

Đây là hàm quyết định sinh viên thuộc curriculum nào.

Logic:

1. Lấy `majorCode`.
2. Tìm alias của ngành.
3. Lọc curriculum active theo ngành.
4. Lấy `enrollmentYear`.
5. So với `curriculum.academicYear`.
6. Chọn curriculum phù hợp nhất.

Nếu lỗi, hàm trả các reason như:

- `missing_major_code`
- `missing_enrollment_year`
- `no_active_curriculum_for_major`
- `no_curriculum_for_enrollment_year`

Ý nghĩa:

- auto-enrollment không tự invent curriculum
- nó phải dựa vào matching rule rõ ràng

### `curriculumService.getSubjectsBySemester(curriculumId, semesterOrder)`

Vai trò:

- lấy danh sách môn của đúng curriculum semester

Điểm đáng chú ý:

- service hỗ trợ cả cấu trúc relational mới và embedded cũ
- nếu dữ liệu relational bị thiếu link `subject`, service còn có cơ chế repair best-effort dựa trên `subjectCode`

Ý nghĩa:

- đây chính là nơi chuyển “khung chương trình” thành “danh sách môn cần xếp lớp”

### `paymentValidationService.resolveTermsPerYear(currentSemester)`

Vai trò:

- xác định một năm học có bao nhiêu kỳ

Logic:

- ưu tiên lấy từ env `CURRICULUM_TERMS_PER_YEAR`
- nếu không có thì đọc từ dữ liệu semester hiện có

### `paymentValidationService.calculateStudentCurriculumSemester(student, currentSemester, options)`

Vai trò:

- tính sinh viên đang thuộc curriculum semester số mấy

Logic hiện tại:

```js
curriculumSemester = academicYearsElapsed * termsPerYear + semesterIndex
```

Nói dễ hiểu:

- lấy chênh lệch năm bắt đầu của học kỳ hiện tại với năm nhập học
- nhân với số kỳ mỗi năm
- cộng thêm số thứ tự kỳ hiện tại

### `paymentValidationService.generateSemesterPaymentCode(semesterOrder, curriculumCode)`

Vai trò:

- tạo mã như `K2_SEK18`

Trong auto-enrollment, mã này chủ yếu được dùng để ghi `note` cho enrollment để trace nguồn gốc batch.

---

## 11. Tại sao code lại làm theo kiểu cache + batch + state map?

Đây là câu rất hay để đi báo cáo.

### 11.1. Cache

Cache dùng cho:

- curriculum match
- curriculum semester order
- subjects của curriculum semester

Lý do:

- nhiều sinh viên cùng ngành và cùng khóa
- nếu không cache thì backend sẽ query lặp rất nhiều

### 11.2. State map

State map dùng để:

- biết sinh viên đã có môn nào
- biết lớp nào đã bị chiếm chỗ

Lý do:

- ngăn duplicate ngay trong quá trình xử lý
- cập nhật logic nội bộ nhanh hơn DB

### 11.3. Batch write

Batch write dùng để:

- giảm số lần ghi DB
- chạy nhanh hơn
- dễ hỗ trợ `dryRun`

### 11.4. Waitlist riêng

Không phải môn nào cũng enroll được ngay.

Nếu lớp đầy hoặc chưa có lớp:

- tạo waitlist giúp hệ thống không “làm mất” nhu cầu học môn đó

---

## 12. Frontend chi tiết

## 12.1. Dashboard admin

File: `frontend-web/src/pages/admin/Dashboard.jsx`

Dashboard có card:

```js
{
  to: '/admin/auto-enrollment',
  emoji: 'AE',
  title: 'Auto Enrollment',
  desc: 'Run and monitor automatic enrollment',
}
```

Vai trò:

- tạo đường vào cho admin tới module này

---

## 12.2. Service FE gọi API

File: `frontend-web/src/services/autoEnrollmentService.js`

```js
return axiosClient.post('/auto-enrollment/trigger', {
  semesterId,
  ...normalizedOptions,
});
```

Vai trò:

- đóng gói request gọi backend
- chuẩn hóa option trước khi gửi

---

## 12.3. Trang `AutoEnrollmentPage`

File: `frontend-web/src/pages/admin/AutoEnrollmentPage.jsx`

### State chính

| State | Vai trò |
| --- | --- |
| `semesters` | danh sách semester để chọn |
| `selectedSemesterId` | semester đang được chọn |
| `dryRun` | chạy thử hay chạy thật |
| `limit` | giới hạn số sinh viên |
| `majorCodesInput` | lọc theo ngành |
| `onlyStudentsWithoutEnrollments` | chỉ xử lý sinh viên chưa có enrollment kỳ này |
| `running` | trạng thái đang chạy |
| `result` | kết quả trả về từ backend |
| `error` | lỗi hiển thị |

### `useEffect` load semester

Khi trang mở:

- FE gọi `semesterService.getAll(...)`
- lấy danh sách semester
- auto chọn semester hiện tại nếu có

Tại sao cần:

- admin thường chạy cho semester hiện tại
- giảm thao tác chọn tay

### `handleRun`

Đây là hàm quan trọng của FE.

Nó:

1. đọc form input
2. chuẩn hóa `majorCodesInput`
3. gọi `autoEnrollmentService.trigger(...)`
4. nhận response
5. set `result`

### UI render những gì

Trang hiển thị:

- `Execution Summary`
- `Preflight`
- `Execution Logs`

Nghĩa là FE không chỉ bấm chạy, mà còn là màn hình giám sát kết quả chạy.

---

## 13. Những đoạn code quan trọng nên hiểu khi đi báo cáo

## 13.1. Đoạn chọn class section còn chỗ

```js
function pickAvailableClassSection(subjectId, classSectionsBySubject, occupiedClassSectionIds) {
  const subjectKey = String(subjectId);
  const pool = classSectionsBySubject.get(subjectKey) || [];
  let selected = null;

  for (const classSection of pool) {
    if (occupiedClassSectionIds?.has(String(classSection._id))) continue;
    if (classSection.currentEnrollment >= classSection.maxCapacity) continue;

    if (
      !selected ||
      classSection.currentEnrollment < selected.currentEnrollment ||
      (classSection.currentEnrollment === selected.currentEnrollment &&
        String(classSection.classCode || '').localeCompare(String(selected.classCode || '')) < 0)
    ) {
      selected = classSection;
    }
  }

  return selected;
}
```

Ý cần nói:

- hệ thống không chọn ngẫu nhiên
- hệ thống ưu tiên lớp ít người hơn
- nếu bằng nhau thì chọn theo mã lớp

---

## 13.2. Đoạn chống duplicate enrollment

```js
if (studentState.activeSubjectIds.has(subjectId)) {
  duplicates += 1;
  studentLog.skipped.push(`${subject.subjectCode}: already enrolled`);
  continue;
}
```

Ý cần nói:

- nếu sinh viên đã có enrollment active ở môn đó thì bỏ qua
- không tạo enrollment mới

---

## 13.3. Đoạn đưa vào waitlist khi không có lớp

```js
if (!classSection) {
  const waitlistResult = queueWaitlistIfNeeded(...);
  ...
  continue;
}
```

Ý cần nói:

- không có lớp thì không fail cứng ngay
- hệ thống chuyển sang trạng thái waitlist để còn theo dõi

---

## 13.4. Đoạn ghi batch xuống DB

```js
await repo.bulkUpsertEnrollments(pendingEnrollmentDocs);
await repo.bulkIncrementClassSections(classSectionIncrementMap);
await repo.bulkUpsertWaitlists(pendingWaitlistDocs);
```

Ý cần nói:

- hệ thống gom lại rồi ghi hàng loạt
- đây là tối ưu hiệu năng cho batch lớn

---

## 14. Chức năng này hiện đang làm tốt những gì?

- chạy batch cho nhiều sinh viên
- lọc theo ngành hoặc danh sách student code
- có `dryRun`
- có preflight summary
- có log theo từng sinh viên
- chống duplicate enrollment
- xử lý lớp đầy bằng waitlist
- dùng cache để tối ưu
- có thể được gọi từ admin page hoặc từ luồng activate current semester

---

## 15. Chức năng này hiện chưa làm hoặc không phải mục tiêu chính

Đây là phần rất nên biết để báo cáo trung thực theo code hiện tại.

### 15.1. Chưa check prerequisite trong main batch auto-enrollment

`triggerAutoEnrollment()` hiện:

- lấy môn theo curriculum semester
- tìm class section
- tạo enrollment

Nó **không gọi** `validatePrerequisites()` như luồng student self-registration.

Điều này có nghĩa:

- auto-enrollment hiện đang dựa trên giả định curriculum semester là lộ trình chuẩn

### 15.2. Chưa check conflict thời khóa biểu trong main batch

Code hiện tại không có bước so lịch học giữa các class section được chọn.

### 15.3. Chưa bọc toàn bộ batch write trong một transaction lớn

Hiện tại service gọi:

- bulk enrollments
- bulk increment class sections
- bulk waitlists

theo thứ tự, nhưng **không** nằm trong một transaction duy nhất.

Trade-off hiện tại:

- ưu tiên tốc độ và đơn giản của batch
- đổi lại, nếu một bước ghi sau bị lỗi thì có khả năng sinh ra partial write

### 15.4. Chưa tối ưu chiến lược chọn lớp theo nhiều tiêu chí phức tạp

Hiện tại chiến lược chọn class section là:

- còn chỗ
- ít người nhất
- classCode nhỏ hơn nếu hòa

Chưa có các tiêu chí như:

- tối ưu thời khóa biểu
- cân bằng theo giảng viên
- ưu tiên lớp gần room nào

---

## 16. Liên hệ với feature “Activate Automatic Enrollment”

Ngoài admin bấm tay ở trang auto-enrollment, module này còn được gọi khi:

- admin set một semester thành `isCurrent = true`

Trong `backend-api/src/modules/semester/semester.service.js`, sau khi cập nhật semester hiện tại, service sẽ gọi:

```js
const autoEnrollment = await autoEnrollmentService.triggerAutoEnrollment(id);
```

Ý nghĩa:

- có thể chạy auto-enrollment tự động ngay khi mở kỳ mới

Điểm hay để báo cáo:

- cùng một engine `triggerAutoEnrollment`
- nhưng có 2 cách kích hoạt:
  - kích hoạt thủ công từ admin page
  - kích hoạt tự động khi semester trở thành current

---

## 17. Ví dụ dễ hiểu cho 1 sinh viên

Giả sử có sinh viên:

- `majorCode = SE`
- `enrollmentYear = 2024`
- `currentSemester = Học kỳ 2 năm học 2025-2026`

Service làm như sau:

1. Tìm curriculum của ngành `SE`, phù hợp với khóa vào năm 2024.
2. Tính sinh viên này đang thuộc curriculum semester nào.
3. Lấy toàn bộ môn của curriculum semester đó.
4. Với từng môn:
   - nếu đã enroll rồi thì skip
   - nếu có lớp còn chỗ thì xếp vào lớp
   - nếu không còn lớp thì tạo waitlist
5. Ghi kết quả hàng loạt xuống DB
6. Trả về log

---

## 18. Mẫu payload API để demo khi báo cáo

### Request

```json
{
  "semesterId": "699a79910ff6e0c7841cbb0e",
  "dryRun": false,
  "limit": 100,
  "majorCodes": ["SE", "DS"],
  "onlyStudentsWithoutEnrollments": true
}
```

### Response rút gọn

```json
{
  "success": true,
  "message": "Auto enrollment completed",
  "data": {
    "summary": {
      "totalStudents": 100,
      "processedStudents": 100,
      "studentsWithEnrollments": 90,
      "studentsWithErrors": 10,
      "totalEnrollments": 420,
      "waitlisted": 12,
      "duplicates": 25,
      "failed": 10
    },
    "preflight": {
      "activeCurriculumCount": 5,
      "openClassSectionCount": 120,
      "warnings": []
    },
    "logs": [
      {
        "studentCode": "SE180001",
        "enrolled": [
          {
            "subjectCode": "SE301",
            "classCode": "SE301-HK2-2025-2026-N1"
          }
        ],
        "waitlisted": [],
        "skipped": [],
        "errors": []
      }
    ]
  }
}
```

---

## 19. Các câu hỏi thầy/cô có thể hỏi và cách trả lời

### Câu 1. Vì sao không query DB cho từng sinh viên, từng môn?

Trả lời ngắn:

Vì batch lớn sẽ rất chậm. Code hiện tại preload dữ liệu cần thiết, đưa vào `Map` và cache để giảm số lần query lặp.

### Câu 2. Vì sao cần waitlist?

Trả lời ngắn:

Vì có môn nằm trong curriculum semester nhưng lớp có thể đầy hoặc chưa mở. Nếu không có waitlist thì nhu cầu học môn đó bị mất dấu.

### Câu 3. Vì sao dùng bulk write?

Trả lời ngắn:

Để giảm số lần ghi DB, tăng hiệu năng và hỗ trợ `dryRun`.

### Câu 4. Hệ thống chống enroll trùng thế nào?

Trả lời ngắn:

- check từ `studentState.activeSubjectIds`
- khi ghi DB còn dùng `upsert`
- model `ClassEnrollment` cũng có unique index theo `student + classSection`

### Câu 5. Chức năng này có kiểm tra prerequisite không?

Trả lời đúng theo code hiện tại:

Không trong main batch `triggerAutoEnrollment()`. Prerequisite hiện là logic mạnh của luồng student self-registration. Auto-enrollment hiện tập trung vào xếp môn theo curriculum semester, chống duplicate và xử lý full class bằng waitlist.

---

## 20. Một đoạn nói ngắn để bạn dùng lúc báo cáo

Bạn có thể nói theo ý này:

> Chức năng Auto Enrollment dùng để admin tự động xếp sinh viên vào các lớp học phần của học kỳ hiện tại dựa trên curriculum semester tương ứng của từng sinh viên. Luồng xử lý bắt đầu từ trang admin, gọi API `POST /api/auto-enrollment/trigger`, sau đó backend sẽ lấy danh sách sinh viên active, xác định curriculum phù hợp theo ngành và năm nhập học, tính curriculum semester hiện tại, lấy danh sách môn của kỳ đó, tìm class section đang mở cho từng môn và tạo `ClassEnrollment`. Nếu lớp đầy hoặc chưa có lớp mở thì hệ thống đưa sinh viên vào `Waitlist`. Kết quả cuối cùng trả về summary, preflight và log chi tiết để admin kiểm tra. Điểm kỹ thuật quan trọng là hệ thống dùng cache, state map và bulk write để tăng hiệu năng khi xử lý batch lớn.

---

## 21. Kết luận

Nếu tóm gọn chức năng này trong 1 câu:

**Auto Enrollment là engine xử lý batch để tự động biến dữ liệu curriculum của sinh viên thành enrollment thực tế trong class section của một semester.**

Nếu tóm gọn trong 3 ý:

1. Nó xác định sinh viên cần học môn gì dựa trên curriculum.
2. Nó tìm lớp còn chỗ để enroll.
3. Nếu không enroll được thì đưa vào waitlist và ghi log rõ ràng.

---

## 22. Gợi ý đọc code theo thứ tự

Nếu bạn muốn đọc code để chuẩn bị báo cáo nhanh nhất, nên đọc theo thứ tự sau:

1. `frontend-web/src/pages/admin/AutoEnrollmentPage.jsx`
2. `frontend-web/src/services/autoEnrollmentService.js`
3. `backend-api/src/modules/autoEnrollment/autoEnrollment.routes.js`
4. `backend-api/src/modules/autoEnrollment/autoEnrollment.controller.js`
5. `backend-api/src/modules/autoEnrollment/autoEnrollment.service.js`
6. `backend-api/src/modules/autoEnrollment/autoEnrollment.repository.js`
7. `backend-api/src/services/curriculum.service.js`
8. `backend-api/src/services/paymentValidation.service.js`

Đọc theo thứ tự này sẽ dễ hiểu hơn vì bạn đi đúng luồng từ giao diện đến business logic.

---

## 23. Phụ lục chuyên sâu: Cách hiểu dự án trước khi đọc service

Phần này dành cho trường hợp bạn gần như chưa có nền về dự án, nhưng cần nắm rất nhanh logic của feature để báo cáo.

### 23.1. Đây là loại hệ thống gì?

Đây là hệ thống quản lý đào tạo kiểu **Student Management / School Management System**. Khác với web bán hàng hay booking thông thường, dữ liệu ở đây không xoay quanh:

- sản phẩm
- giỏ hàng
- đơn hàng

Mà xoay quanh:

- sinh viên đang học ngành nào
- sinh viên thuộc khóa nào
- sinh viên đang ở kỳ mấy trong khung chương trình
- học kỳ hiện tại đang mở những lớp học phần nào
- lớp nào còn chỗ, lớp nào đầy
- nếu không còn chỗ thì phải đưa vào waitlist

### 23.2. Bài toán của feature này trong ngữ cảnh trường học

Feature này không phải “sinh viên tự chọn môn”.  
Nó là bài toán của nhà trường hoặc admin:

> Nhà trường đã biết sinh viên trong kỳ này **đáng lẽ phải học môn gì** theo curriculum. Việc của hệ thống là cố gắng biến danh sách môn “phải học” đó thành `ClassEnrollment` thực tế.

Nói ngắn gọn:

- `CurriculumSemester` = phía **nhu cầu học tập chuẩn**
- `ClassSection` = phía **nguồn cung lớp đang mở**
- `Auto Enrollment` = engine ghép nhu cầu với nguồn cung

### 23.3. Tư duy domain rất quan trọng

Khi đọc service, bạn nên luôn nghĩ theo 4 câu hỏi:

1. Sinh viên này thuộc curriculum nào?
2. Sinh viên này hiện đang ở curriculum semester nào?
3. Curriculum semester đó yêu cầu học các subject nào?
4. Trong semester hiện tại có class section nào mở cho các subject đó không?

Nếu trả lời được 4 câu đó, bạn hiểu gần hết service.

### 23.4. Business rule đặc thù của hệ quản lý đào tạo

Đây là các rule rất “đúng chất SIS”, và chính chúng làm service dài:

#### Rule 1. Curriculum là nguồn sự thật học thuật

Hệ thống không tự invent môn.

Nó không tự hỏi:

- sinh viên thích môn nào
- môn nào hot
- môn nào đang được chọn nhiều

Mà nó phải hỏi:

- curriculum của sinh viên quy định kỳ này phải học môn nào?

#### Rule 2. Semester là cửa sổ vận hành

Curriculum là chương trình học tổng. Nhưng việc xếp lớp luôn phải bám vào:

- semester number
- academic year

Ví dụ:

- curriculum yêu cầu môn A ở kỳ 2
- nhưng chỉ khi semester hiện tại là HK2 2025-2026 và có `ClassSection` mở cho môn A thì mới enroll được

#### Rule 3. Không phải subject nào cũng enroll được ngay

Một môn có thể nằm trong curriculum semester, nhưng:

- chưa có lớp mở
- lớp có mở nhưng đầy
- dữ liệu curriculum bị thiếu link sang subject

Nên kết quả không chỉ có “enroll thành công”, mà còn có:

- skipped
- waitlisted
- failed

#### Rule 4. Phải chống duplicate nhiều lớp

Trong hệ này có ít nhất 3 loại duplicate cần tránh:

1. Sinh viên đã có enrollment active ở môn đó rồi
2. Sinh viên đã nằm trong waitlist của môn đó rồi
3. Batch hiện tại vừa xếp xong một môn/lớp, vòng lặp sau không được “quên” trạng thái vừa cập nhật

#### Rule 5. Batch phải chạy được trên số lượng lớn

Đây là lý do service không viết kiểu đơn giản:

```js
for each student:
  query curriculum
  query subject
  query class
  create enrollment
```

Nếu làm vậy:

- quá nhiều query lặp
- chậm
- khó dry-run
- khó trả execution logs đẹp

Nên service buộc phải dùng:

- `Map`
- `Set`
- cache
- batch write
- state in memory

#### Rule 6. Waitlist là một phần của nghiệp vụ, không phải lỗi phụ

Trong web quản lý đào tạo, “không enroll được ngay” chưa chắc là fail hoàn toàn.

Nhiều trường hợp:

- môn đó vẫn là môn sinh viên cần học
- chỉ là lớp chưa đủ chỗ hoặc chưa mở

Lúc này `Waitlist` là cách giữ lại nhu cầu học môn đó để xử lý sau.

### 23.5. Sơ đồ tư duy nhanh của feature

```text
Student
  -> xác định curriculum
  -> xác định curriculum semester hiện tại
  -> lấy subjects của curriculum semester
  -> với mỗi subject:
       nếu đã học rồi / đã enroll rồi -> skip
       nếu có class còn chỗ -> thêm pending enrollment
       nếu không có class còn chỗ -> thêm pending waitlist
  -> cuối cùng ghi DB theo batch
  -> trả log chi tiết cho admin
```

---

## 24. Phụ lục chuyên sâu: Cách đọc `autoEnrollment.service.js` cho người mới

File `autoEnrollment.service.js` dài vì nó đang gánh 3 vai trò cùng lúc:

1. helper nội bộ
2. orchestration nghiệp vụ
3. batch processor

Nếu bạn đọc từ trên xuống mà không có “bản đồ”, rất dễ bị ngợp.  
Hãy chia file thành 6 cụm như sau:

### Cụm 1. Imports và constants

Ngay đầu file:

```js
const ClassSection = require('../../models/classSection.model');
const ClassEnrollment = require('../../models/classEnrollment.model');
const Waitlist = require('../../models/waitlist.model');
const curriculumService = require('../../services/curriculum.service');
const paymentValidationService = require('../../services/paymentValidation.service');
const repo = require('./autoEnrollment.repository');
```

Ý nghĩa:

- model trực tiếp dùng khi service phải create/update đặc biệt
- service phụ trợ dùng cho curriculum và tính semester order
- repository dùng để gom query DB

3 constant đầu file cũng nói rất nhiều về business rule:

```js
const OPEN_CLASS_STATUSES = ['published', 'scheduled'];
const ACTIVE_ENROLLMENT_STATUSES = new Set(repo.ACTIVE_ENROLLMENT_STATUSES);
const LEGACY_WAITLIST_INDEX_NAME = 'student_1_subject_1_status_1';
```

#### Tại sao cần `OPEN_CLASS_STATUSES`

Không phải class nào tồn tại trong DB cũng được phép enroll.

Chỉ các lớp có trạng thái:

- `published`
- `scheduled`

mới được coi là nguồn cung hợp lệ.

Nghĩa là:

- `draft`: chưa sẵn sàng
- `cancelled`: đã hủy
- `completed`: đã xong

không thể auto-enroll vào.

#### Tại sao `ACTIVE_ENROLLMENT_STATUSES` là `Set`

Service phải kiểm tra rất nhiều lần xem enrollment của sinh viên có phải active không.
`Set.has(...)` nhanh hơn việc `Array.includes(...)` lặp lại nhiều lần trong batch lớn.

#### Tại sao phải nhớ `LEGACY_WAITLIST_INDEX_NAME`

Đây là dấu hiệu code đang sống trong môi trường thực tế, không phải demo thuần.

Ý nghĩa:

- trước đây DB có index waitlist cũ
- nếu index đó lỗi thời thì bulk waitlist có thể fail
- service phải nhận diện đúng loại lỗi đó để trả message debug có ích

Chỉ riêng constant này đã cho thấy code đang xử lý cả vấn đề vận hành dữ liệu cũ.

### Cụm 2. Helper tạo key và state

Đây là nhóm hàm:

- `buildStudentSubjectKey`
- `buildCurriculumSemesterKey`
- `buildStudentStateMap`
- `getOrCreateStudentState`
- `buildClassSectionPools`
- `normalizeCodeList`
- `parsePositiveInteger`
- `incrementMapCounter`

Mục đích chung:

- đưa dữ liệu về dạng dễ tra cứu trong RAM
- tránh query DB lặp
- tránh duplicate

### Cụm 3. Helper liên quan curriculum

Đây là nhóm:

- `buildMajorAliasesByCode`
- `buildCurriculumMatchCacheKey`
- `getCurriculumMatchCached`
- `getCurriculumSemesterOrderCached`
- `getCurriculumSemesterSubjectsCached`

Mục tiêu:

- xác định sinh viên học curriculum nào
- xác định sinh viên đang ở semester order nào trong curriculum
- lấy subjects của đúng curriculum semester

### Cụm 4. Helper chọn lớp và xử lý waitlist

Đây là nhóm:

- `pickAvailableClassSection`
- `queueWaitlistIfNeeded`
- `findAvailableClassSection`
- `addToWaitlistIfNeeded`
- `enrollStudentInSection`

Đây là phần “biến subject thành enrollment thực tế”.

### Cụm 5. Các service đơn lẻ ngoài main batch

Bao gồm:

- `autoEnrollAfterPayment`
- `previewAutoEnrollment`

Hai hàm này giúp bạn thấy engine được tái sử dụng, chứ không chỉ có một use case admin batch.

### Cụm 6. Hàm trái tim: `triggerAutoEnrollment`

Đây là nơi orchestration toàn bộ pipeline:

- load dữ liệu nền
- build state
- loop qua sinh viên
- loop qua subject
- tạo pending docs
- persist batch
- build logs

---

## 25. Phụ lục chuyên sâu: Bảng giải nghĩa helper trong service

Phần này bổ sung sâu hơn cho mục 8 cũ.  
Mục tiêu là để bạn không chỉ biết “helper đó làm gì”, mà còn biết “nếu bỏ nó đi thì service sẽ hỏng ở đâu”.

| Helper | Vai trò kỹ thuật | Vai trò nghiệp vụ | Nếu bỏ đi sẽ xảy ra gì |
| --- | --- | --- | --- |
| `buildStudentSubjectKey(studentId, subjectId)` | tạo key chuỗi duy nhất | nhận diện một cặp sinh viên - môn | khó chống duplicate waitlist |
| `buildCurriculumSemesterKey(curriculumId, semesterOrder)` | tạo key cache | cache subjects theo curriculum semester | nhiều lần gọi `getSubjectsBySemester` lặp vô ích |
| `buildMajorAliasesByCode(...)` | map `majorCode -> aliases` | match curriculum kể cả khi DB lưu tên ngành thay vì mã ngành | có thể miss curriculum dù dữ liệu logic đúng |
| `buildStudentStateMap(...)` | build state trong RAM | biết sinh viên đang học môn nào, đã chiếm lớp nào | dễ enroll trùng môn hoặc trùng lớp |
| `getOrCreateStudentState(...)` | đảm bảo luôn có state object | xử lý cả sinh viên chưa có enrollment cũ | code lặp if-null nhiều nơi |
| `buildClassSectionPools(...)` | index class theo id và subject | tra lớp nhanh trong batch | loop subject nào cũng phải scan list toàn bộ |
| `normalizeCodeList(...)` | chuẩn hóa filter | major/student code so sánh ổn định | filter dễ sai do khoảng trắng/chữ thường |
| `parsePositiveInteger(...)` | parse limit | limit không âm, không rác | `limit` bị sai kiểu gây bug logic |
| `incrementMapCounter(...)` | cộng dồn số tăng chỗ ngồi | gom thay đổi `currentEnrollment` để ghi batch | khó bulk increment cuối kỳ |
| `buildCurriculumMatchCacheKey(...)` | key cache theo major + enrollmentYear | nhiều sinh viên giống nhau dùng chung kết quả | tính curriculum match lặp lại |
| `getCurriculumMatchCached(...)` | cache promise curriculum match | giảm gọi curriculum service | batch chậm hơn đáng kể |
| `getCurriculumSemesterOrderCached(...)` | cache kỳ hiện tại trong curriculum | nhiều sinh viên cùng cohort/semester có kết quả giống nhau | lặp tính toán semester order |
| `queueWaitlistIfNeeded(...)` | queue waitlist in-memory | không mất nhu cầu học môn khi chưa có lớp | khó hỗ trợ dry-run và batch waitlist |
| `buildFilterSummary(...)` | đóng gói filters | phản ánh đúng cấu hình lần chạy | FE khó trace batch đã chạy theo điều kiện nào |
| `pickAvailableClassSection(...)` | chọn lớp còn chỗ tốt nhất | chia đều sinh viên giữa các lớp | dễ dồn hết sinh viên vào một lớp |
| `getBulkWriteUpsertedCount(...)` | normalize format bulk result | đọc số lượng upsert ổn định | khó log chính xác khi driver đổi shape result |
| `formatAutoEnrollmentPersistenceError(...)` | đổi raw DB error thành message domain-specific | debug waitlist index cũ | admin/dev khó hiểu lỗi Mongo |
| `formatCurriculumError(...)` | đổi reason code thành message đọc được | giải thích vì sao không match curriculum | log quá khó đọc |
| `buildPreflightSummary(...)` | snapshot chất lượng dữ liệu trước batch | admin thấy rủi ro trước khi đọc logs chi tiết | khó có cái nhìn toàn cảnh |
| `getCurriculumSemesterSubjectsCached(...)` | cache subjects theo curriculum semester | nhiều sinh viên cùng curriculum không query lặp | batch chậm hơn |

### 25.1. Helper nào là “có thể bỏ”, helper nào là “rất khó bỏ”?

#### Có thể refactor gọn hơn nhưng vẫn sống được

- `buildFilterSummary`
- `getBulkWriteUpsertedCount`

#### Rất khó bỏ nếu vẫn muốn batch chạy ổn

- `buildStudentStateMap`
- `buildClassSectionPools`
- `getCurriculumMatchCached`
- `getCurriculumSemesterOrderCached`
- `queueWaitlistIfNeeded`
- `pickAvailableClassSection`

Đây là các helper mang đúng bản chất batch processor.

---

## 26. Phụ lục chuyên sâu: Mổ xẻ `triggerAutoEnrollment` như đọc một thuật toán

Phần này cố tình trình bày như “đọc thuật toán”, không chỉ mô tả nghiệp vụ.

### 26.1. Chữ ký hàm và ý nghĩa

```js
async function triggerAutoEnrollment(semesterId, options = {})
```

#### `semesterId`

Là “ngữ cảnh vận hành”.

Không có `semesterId`, mọi thứ phía sau đều mơ hồ:

- open class nào?
- academic year nào?
- waitlist target nào?
- curriculum semester phải map vào cửa sổ học nào?

#### `options`

Là tập điều khiển batch:

- có ghi DB thật không (`dryRun`)
- lọc theo ngành nào (`majorCodes`)
- lọc theo sinh viên nào (`studentCodes`)
- xử lý bao nhiêu sinh viên (`limit`)
- chỉ lấy sinh viên chưa có enrollment (`onlyStudentsWithoutEnrollments`)

### 26.2. Bước 1: Chuẩn hóa option

Code:

```js
const dryRun = options.dryRun === true;
const requestedMajorCodes = normalizeCodeList(options.majorCodes);
const requestedStudentCodes = normalizeCodeList(options.studentCodes);
const onlyStudentsWithoutEnrollments = options.onlyStudentsWithoutEnrollments === true;
const studentLimit = parsePositiveInteger(options.limit);
```

#### Tại sao không dùng thẳng `options`?

Vì service muốn từ đầu đến cuối đều làm việc với biến đã chuẩn hóa:

- boolean thật
- array chuẩn hóa
- integer dương

Đây là cách giảm bug “trôi kiểu dữ liệu”.

### 26.3. Bước 2: Load master data song song

Code:

```js
const [candidateStudents, activeCurriculums, classSections, termsPerYear] = await Promise.all([
  repo.findEligibleStudents(...),
  repo.findActiveCurriculums(),
  repo.findOpenClassSections(...),
  paymentValidationService.resolveTermsPerYear(semester),
]);
```

#### Vì sao phải preload gần như tất cả ở đầu batch?

Vì nếu bạn query theo từng student, từng subject thì batch rất chậm.

Chiến lược hiện tại là:

1. lấy đủ data nền
2. dựng index trong RAM
3. xử lý nhanh trong vòng lặp

Đây là cách rất điển hình của batch service.

### 26.4. Bước 3: Dựng các cấu trúc RAM để xử lý nhanh

Code:

```js
const { classSectionsById, classSectionsBySubject } = buildClassSectionPools(classSections);
const classSectionIds = Array.from(classSectionsById.keys());
const studentIds = candidateStudents.map((student) => student._id);
```

Đây là lúc service đổi từ “list thô” sang “cấu trúc có thể tra cứu nhanh”.

#### `classSectionsById`

Giúp:

- lấy class section theo id nhanh
- đọc ngược enrollment -> class -> subject nhanh

#### `classSectionsBySubject`

Giúp:

- từ một subject biết ngay đang có những lớp nào mở

Tư duy quan trọng:

- `CurriculumSemester` nói sinh viên **cần học subject nào**
- `classSectionsBySubject` nói hệ thống **đang mở những lớp nào cho subject đó**

### 26.5. Bước 4: Build state quá khứ của sinh viên

Code:

```js
const [existingEnrollments, existingWaitlists] = ...
const studentStateMap = buildStudentStateMap(existingEnrollments, classSectionsById);
const waitlistSet = new Set(
  existingWaitlists.map((waitlist) => buildStudentSubjectKey(waitlist.student, waitlist.subject)),
);
```

#### Đây là bước cực kỳ quan trọng

Service không thể xử lý sinh viên như một trang giấy trắng.

Nó phải biết:

- sinh viên đã có enrollment active nào rồi
- sinh viên đã occupy class section nào rồi
- sinh viên đã có waitlist môn nào rồi

Nếu không có state này, service sẽ:

- enroll trùng
- tạo waitlist trùng
- log sai

### 26.6. Bước 5: Tạo các biến thống kê và hàng đợi ghi DB

Code:

```js
const pendingEnrollmentDocs = [];
const pendingWaitlistDocs = [];
const classSectionIncrementMap = new Map();
const logs = [];
```

#### Vì sao không create DB ngay?

Vì hệ thống đang đi theo chiến lược:

- quyết định trong RAM
- persist theo batch ở cuối

Điểm lợi:

- nhanh hơn
- hỗ trợ dry-run
- dễ rollback logic nội bộ trước khi chạm DB
- dễ build logs

### 26.7. Bước 6: Với mỗi sinh viên, giải quyết 3 câu hỏi lớn

Vòng lặp chính:

```js
for (const student of students) {
  ...
}
```

Trong mỗi sinh viên, service phải lần lượt giải:

1. Sinh viên thuộc curriculum nào?
2. Sinh viên hiện ở curriculum semester nào?
3. Curriculum semester đó gồm những subject nào?

Nếu fail ở bước 1, dừng sớm.  
Nếu fail ở bước 2, dừng sớm.  
Nếu step 3 không có subject, log skipped.

### 26.8. Bước 7: Với mỗi subject, quyết định 1 trong 3 nhánh

Đây là lõi business rule:

#### Nhánh A. Đã có enrollment active -> skip

```js
if (studentState.activeSubjectIds.has(subjectId)) {
  duplicates += 1;
  studentLog.skipped.push(`${subject.subjectCode}: already enrolled`);
  continue;
}
```

Ý nghĩa:

- feature này không được tạo lại cùng một nhu cầu học đã active

#### Nhánh B. Có class còn chỗ -> pending enrollment

```js
const classSection = pickAvailableClassSection(...);
```

Nếu tìm thấy:

```js
pendingEnrollmentDocs.push({...});
incrementMapCounter(classSectionIncrementMap, classSection._id, 1);
classSection.currentEnrollment += 1;
studentState.activeSubjectIds.add(subjectId);
studentState.occupiedClassSectionIds.add(String(classSection._id));
```

Đây là đoạn rất đáng chú ý.

##### Vì sao vừa push `pendingEnrollmentDocs` vừa tăng `classSection.currentEnrollment` ngay trong RAM?

Vì trong batch hiện tại, chỗ ngồi phải được “giữ chỗ logic” ngay lập tức.

Nếu không làm vậy:

- subject của sinh viên A chọn lớp X
- vòng lặp sinh viên B vẫn nhìn thấy lớp X như chưa tăng sĩ số
- hệ thống có thể overbook trong cùng một batch

Nói ngắn:

- DB chưa ghi
- nhưng bộ nhớ RAM phải phản ánh “ghế đã được batch này chiếm”

Đây là một trong những chi tiết quan trọng nhất để hiểu service.

#### Nhánh C. Không có class phù hợp -> pending waitlist

```js
if (!classSection) {
  const waitlistResult = queueWaitlistIfNeeded(...);
  ...
}
```

Ý nghĩa:

- feature không dừng ở “không có lớp thì chịu”
- nó chuyển nhu cầu học môn đó sang waitlist

Đây là business decision, không phải technical detail nhỏ.

### 26.9. Bước 8: Persist xuống DB

Cuối batch:

```js
if (!dryRun) {
  await repo.bulkUpsertEnrollments(pendingEnrollmentDocs);
  await repo.bulkIncrementClassSections(classSectionIncrementMap);
  await repo.bulkUpsertWaitlists(pendingWaitlistDocs);
}
```

#### Thứ tự này có ý nghĩa gì?

1. ghi enrollments
2. tăng sĩ số class
3. ghi waitlists

Hàm hiện tại chọn cách “batch và đơn giản”, không bọc toàn bộ trong 1 transaction lớn.

#### Trade-off

Ưu điểm:

- đơn giản
- nhanh
- dễ scale batch

Nhược điểm:

- nếu bước 2 hoặc 3 fail sau khi bước 1 đã ghi, có thể phát sinh partial write

Tức là code hiện tại đang ưu tiên practical batch processing hơn là tính atomic tuyệt đối.

### 26.10. Bước 9: Build response để admin hiểu được batch vừa làm gì

Kết quả trả về không chỉ có `success`.

Nó còn có:

- `summary`
- `preflight`
- `filters`
- `logs`

Đây là dấu hiệu rất rõ của một module batch dành cho admin:

- không chỉ “chạy”
- mà còn phải “giải thích lại đã chạy gì”

---

## 27. Phụ lục chuyên sâu: Vì sao service phải thiết kế như vậy?

Phần này trả lời câu “sao không viết ngắn hơn?”.

### 27.1. Vì sao phải có cache?

Trong một trường học, rất nhiều sinh viên:

- cùng major
- cùng enrollment year
- cùng curriculum
- cùng curriculum semester

Nếu mỗi sinh viên đều tự tính lại:

- curriculum match
- semester order
- danh sách subject

thì logic đúng nhưng rất tốn.

Cache ở đây giúp biến:

- nhiều phép tính giống nhau

thành:

- tính một lần, dùng nhiều lần

### 27.2. Vì sao phải có `studentStateMap`?

Đây là “bộ nhớ tạm về trạng thái sinh viên”.

Nó giữ:

- môn đã active
- class section đã occupy

Nếu không có nó, service sẽ phải:

- query DB liên tục
- hoặc rất dễ tạo duplicate trong chính batch hiện tại

### 27.3. Vì sao phải queue waitlist trước, ghi sau?

Vì feature có `dryRun`.

Nếu code viết:

```js
if (!classSection) {
  await Waitlist.create(...)
}
```

thì:

- dry-run khó làm đẹp
- batch sẽ chạm DB liên tục
- log khó thống nhất

Queue vào `pendingWaitlistDocs` giúp:

- dry-run chỉ mô phỏng
- run thật thì bulk upsert cuối batch

### 27.4. Vì sao `pickAvailableClassSection` không chọn random?

Code hiện tại chọn:

1. bỏ lớp đầy
2. bỏ lớp sinh viên đã occupy
3. chọn lớp có `currentEnrollment` thấp nhất
4. hòa thì chọn `classCode` nhỏ hơn

Lý do:

- chia tải tương đối đều
- deterministic
- chạy lại dễ giải thích

Trong hệ thống quản trị, deterministic thường tốt hơn random.

### 27.5. Vì sao vẫn phải log theo từng sinh viên?

Vì batch admin mà chỉ trả summary là không đủ.

Admin cần biết:

- sinh viên nào được enroll môn nào
- sinh viên nào bị waitlist môn nào
- sinh viên nào lỗi vì không match curriculum
- sinh viên nào bị skip vì duplicate

Nên `studentLog` không phải phần phụ. Nó là một output nghiệp vụ rất quan trọng.

### 27.6. Vì sao service này không giống API CRUD thường?

Vì đây không phải CRUD đơn giản kiểu:

- tạo 1 record
- sửa 1 record
- xóa 1 record

Mà là:

- load dữ liệu nền
- suy luận curriculum
- tính semester order
- match class
- cập nhật state in-memory
- queue write
- log
- summarize

Tức là đây là **orchestration service** hay **batch domain service**, không phải service CRUD cơ bản.

---

## 28. Phụ lục chuyên sâu: Cách đọc service nhanh khi đi báo cáo

Nếu bạn có ít thời gian, hãy đọc theo đúng trình tự này:

### Vòng 1. Hiểu ý tưởng lớn

Đọc:

1. `triggerAutoEnrollment(...)`
2. `pickAvailableClassSection(...)`
3. `buildStudentStateMap(...)`
4. `getCurriculumMatchCached(...)`
5. `getCurriculumSemesterOrderCached(...)`
6. `queueWaitlistIfNeeded(...)`

Mục tiêu:

- hiểu pipeline lớn

### Vòng 2. Hiểu dữ liệu chạy trong RAM

Tập trung vào các biến:

- `classSectionsById`
- `classSectionsBySubject`
- `studentStateMap`
- `waitlistSet`
- `pendingEnrollmentDocs`
- `pendingWaitlistDocs`
- `classSectionIncrementMap`

Mục tiêu:

- hiểu batch đang “giữ trạng thái” thế nào trước khi chạm DB

### Vòng 3. Hiểu lý do nghiệp vụ

Luôn tự hỏi:

1. tại sao chỗ này phải skip?
2. tại sao chỗ này phải waitlist?
3. tại sao chỗ này phải cache?
4. tại sao chỗ này phải tăng sĩ số trong RAM?
5. tại sao chỗ này batch write chứ không create ngay?

Nếu trả lời được 5 câu đó, bạn sẽ trình bày service rất chắc.

### Vòng 4. Khi báo cáo, chỉ cần nói service theo 1 câu chuyện

Bạn có thể kể service như sau:

> Hàm `triggerAutoEnrollment` nhận semester và filter, sau đó preload dữ liệu nền gồm sinh viên, curriculum active, class section đang mở và số học kỳ trong năm. Tiếp theo service build các map và cache trong RAM để xử lý nhanh. Với mỗi sinh viên, service xác định curriculum phù hợp, tính sinh viên đang ở curriculum semester nào, lấy các subject của curriculum semester đó, rồi với từng subject sẽ hoặc skip nếu đã enroll, hoặc chọn class section còn chỗ để đưa vào `pendingEnrollmentDocs`, hoặc đưa vào `pendingWaitlistDocs` nếu không còn lớp phù hợp. Sau khi duyệt hết batch, service mới bulk ghi enrollments, tăng sĩ số lớp và bulk ghi waitlist, rồi trả về summary, preflight và logs để admin kiểm tra.

Đây là cách nói vừa đúng kỹ thuật vừa đúng nghiệp vụ.
