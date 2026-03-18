# Huong dan code: Auto Enrollment, Dang ky mon, Teaching Schedule

## 1. Muc tieu tai lieu

Tai lieu nay duoc viet de giai thich code hien tai cua cac chuc nang:

1. Auto-Assign Students To Classes
2. Activate Automatic Enrollment
3. Limit Course Overload
4. Check Course Prerequisites
5. Verify Student Cohort Eligibility
6. Check Maximum Credit Limit
7. View Lecturer Timetable

Muc tieu khong chi la mo ta requirement, ma la giup ban doc code theo dung luong:

`Frontend page -> frontend service -> API route -> controller -> service -> repository/model -> database -> response -> UI`

Tai lieu nay tap trung vao:

- Vai tro nghiep vu cua tung chuc nang
- Logic xu ly chinh
- Y nghia cua cac field, term, keyword
- Vai tro tung file, ham, kieu du lieu
- Flow end-to-end luc he thong chay that

Tai lieu phan tich theo code hien tai trong repo.

---

## 2. Ban do kien truc nhanh

### 2.1 Backend dang chia tang nhu the nao

- `routes`: dinh nghia endpoint va auth/rbac
- `controller`: nhan request, validate input co ban, goi service, format response
- `service`: business logic chinh
- `repository`: truy van database, bulk write, utility truy cap model
- `model`: dinh nghia schema Mongoose

### 2.2 Frontend dang chia tang nhu the nao

- `pages`: trang giao dien
- `services`: wrapper axios goi API
- `App.jsx`: dinh nghia route
- `Dashboard.jsx`: card dieu huong vao module

Frontend dung pattern:

1. Page giu `state`
2. Page goi `service`
3. `service` goi API
4. Response duoc dua vao `state`
5. UI render theo state do

---

## 3. Bang thuat ngu va keyword

| Tu khoa | Y nghia | Dung o dau |
| --- | --- | --- |
| `Semester` | Hoc ky hoc vu cua truong | Quan ly hoc ky, auto-enrollment, teaching schedule |
| `isCurrent` | Hoc ky hien tai dang duoc he thong coi la hoc ky mac dinh | `semester.service.js`, teaching schedule, registration summary |
| `Curriculum` | Khung chuong trinh dao tao cua nganh theo cohort/enrollment year | Auto-enrollment, overload logic |
| `CurriculumSemester` | Hoc ky thu may trong khung chuong trinh | Auto-enrollment, payment validation |
| `ClassSection` | Lop hoc phan mo cho 1 mon hoc | Dang ky mon, auto-enrollment, timetable |
| `ClassEnrollment` | Ban ghi SV da vao lop hoc phan | Dang ky mon, auto-enrollment |
| `Waitlist` | Danh sach cho khi lop full hoac chua co lop phu hop | Auto-enrollment |
| `Prerequisite` | Mon tien quyet | Registration validation |
| `Overload` | Mon hoc vuot khung hoc ky hien tai trong curriculum | Registration validation, `isOverload` |
| `Cohort` | Khoa sinh vien, vi du K18, K19 | Registration period access |
| `RegistrationPeriod` | Khoang thoi gian cho phep dang ky theo loai request | Cohort eligibility |
| `dryRun` | Chay thu, khong ghi database | Auto-enrollment page/service |
| `bulkWrite` | Ghi nhieu record trong 1 lan | Auto-enrollment repository |
| `upsert` | Neu chua co thi tao moi, neu da ton tai thi tranh tao trung | Bulk enrollment/waitlist |
| `transaction` | Nhom thao tac DB can thanh cong cung nhau | Semester create/update + rollback |
| `populate` | Mongoose no them du lieu tu collection lien quan | Registration, timetable, curriculum |
| `lean()` | Lay plain object thay vi Mongoose document | Repository/service de doc nhanh hon |
| `RBAC` | Role-based access control | Route middleware |

---

## 4. File map nhanh theo chuc nang

| Chuc nang | Backend chinh | Frontend chinh |
| --- | --- | --- |
| Auto enrollment | `backend-api/src/modules/autoEnrollment/*` | `frontend-web/src/pages/admin/AutoEnrollmentPage.jsx`, `frontend-web/src/services/autoEnrollmentService.js` |
| Auto trigger khi set current semester | `backend-api/src/modules/semester/*` | `frontend-web/src/pages/admin/SemesterManagement.jsx`, `frontend-web/src/services/semesterService.js` |
| Overload limit | `backend-api/src/services/registration.service.js`, `backend-api/src/modules/classSection/classSection.service.js`, `backend-api/src/models/classEnrollment.model.js` | `frontend-web/src/pages/student/ClassRegistrationPage.jsx`, `frontend-web/src/services/registrationService.js` |
| Prerequisite | `backend-api/src/services/registration.service.js`, `backend-api/src/controllers/registration.controller.js` | `frontend-web/src/pages/student/ClassRegistrationPage.jsx` |
| Cohort eligibility | `backend-api/src/services/registrationPeriod.service.js`, `backend-api/src/models/registrationPeriod.model.js` | `frontend-web/src/pages/student/ClassRegistrationPage.jsx`, `frontend-web/src/pages/admin/RegistrationPeriodManagement.jsx` |
| Credit limit | `backend-api/src/services/registration.service.js` | `frontend-web/src/pages/student/ClassRegistrationPage.jsx` |
| Teaching schedule | `backend-api/src/modules/lecturer/teachingSchedule.*` | `frontend-web/src/pages/admin/TeachingSchedulePage.jsx`, `frontend-web/src/services/scheduleService.js` |

---

## 5. Feature 1 - Auto-Assign Students To Classes

### 5.1 Muc dich nghiep vu

Chuc nang nay tu dong xep tat ca sinh vien active vao cac lop hoc phan dung voi hoc ky curriculum cua sinh vien trong hoc ky duoc chon.

No giai bai toan:

- Khong muon staff xep tay tung sinh vien
- Can xep theo curriculum
- Neu lop full thi dua vao waitlist
- Neu SV da co enrollment cho mon do roi thi bo qua

No khong phai dang ky mon theo y thich cua sinh vien. Day la xep lop theo ke hoach dao tao.

### 5.2 File backend va vai tro

#### `backend-api/src/modules/autoEnrollment/autoEnrollment.routes.js`

- Dinh nghia endpoint `POST /api/auto-enrollment/trigger`
- Bat buoc `authMiddleware`
- Chi role `admin`, `staff` duoc chay

#### `backend-api/src/modules/autoEnrollment/autoEnrollment.controller.js`

- Nhac lai input tu `req.body`
- Chuan hoa `majorCodes`, `studentCodes`
- Kiem tra `semesterId` bat buoc
- Goi `service.triggerAutoEnrollment(semesterId, options)`
- Tra response JSON cho frontend

#### `backend-api/src/modules/autoEnrollment/autoEnrollment.repository.js`

Repository la tang chuyen truy cap DB:

- Tim hoc ky
- Tim sinh vien du dieu kien
- Tim curriculum active
- Tim lop hoc phan dang mo
- Tim enrollment da ton tai
- Tim waitlist da ton tai
- Bulk ghi enrollment
- Bulk tang `currentEnrollment`
- Bulk ghi waitlist

#### `backend-api/src/modules/autoEnrollment/autoEnrollment.service.js`

Day la trai tim cua chuc nang.

Ham trung tam:

```js
triggerAutoEnrollment(semesterId, options = {})
```

Ham nay:

1. Nap du lieu dau vao
2. Xac dinh curriculum cua tung sinh vien
3. Xac dinh hoc ky curriculum cua tung sinh vien
4. Lay danh sach mon hoc trong hoc ky curriculum do
5. Tim class section dang mo cho tung mon
6. Tao enrollment hoac waitlist
7. Tong hop log va summary

### 5.3 Cac helper quan trong trong `autoEnrollment.service.js`

#### Nhom helper tao key/cache

- `buildStudentSubjectKey(studentId, subjectId)`
  - Tao key `student:subject`
  - Dung de tranh waitlist trung lap

- `buildCurriculumSemesterKey(curriculumId, semesterOrder)`
  - Tao key cho cache subjects theo curriculum + hoc ky curriculum

- `normalizeCodeList(values)`
  - Chuan hoa danh sach code ve uppercase, bo trung

- `parsePositiveInteger(value)`
  - Parse `limit` tu frontend

#### Nhom helper xu ly student state

- `buildStudentStateMap(existingEnrollments, classSectionsById)`
  - Tao state cho moi sinh vien
  - Moi student co:

```js
{
  activeSubjectIds: Set,
  occupiedClassSectionIds: Set
}
```

- `getOrCreateStudentState(stateByStudent, studentId)`
  - Neu student chua co state thi tao moi

#### Nhom helper xu ly pool class

- `buildClassSectionPools(classSections)`
  - Chuyen danh sach class section thanh 2 map:

```js
{
  classSectionsById: Map,
  classSectionsBySubject: Map
}
```

- `pickAvailableClassSection(subjectId, classSectionsBySubject, occupiedClassSectionIds)`
  - Tim class section tot nhat cho mon hoc
  - Rule hien tai:
    - bo qua lop ma SV da dang o trong lop do
    - bo qua lop full
    - uu tien lop co `currentEnrollment` it nhat
    - neu bang nhau thi uu tien `classCode` nho hon

#### Nhom helper curriculum

- `getCurriculumMatchCached(cache, student, options)`
  - Goi `curriculumService.getCurriculumMatchForStudent(...)`
  - Co cache de tranh tinh lai cho nhieu SV cung major/cohort

- `getCurriculumSemesterOrderCached(cache, student, semester, options)`
  - Neu student co `currentCurriculumSemester` thi uu tien dung luon
  - Neu khong thi goi `paymentValidationService.calculateStudentCurriculumSemester(...)`

- `getCurriculumSemesterSubjectsCached(cache, curriculumId, curriculumSemesterOrder)`
  - Goi `curriculumService.getSubjectsBySemester(...)`
  - Cache lai theo `curriculumId + semesterOrder`

#### Nhom helper waitlist

- `queueWaitlistIfNeeded(...)`
  - Khong ghi DB ngay
  - Chi them vao `pendingWaitlistDocs`
  - Dung trong flow batch cua `triggerAutoEnrollment`

- `addToWaitlistIfNeeded(...)`
  - Ban ghi truc tiep vao DB
  - Dung o flow khac, khong phai flow batch chinh

#### Nhom helper summary/log

- `formatCurriculumError(match, student)`
  - Bien ket qua match curriculum thanh message de doc

- `buildPreflightSummary(...)`
  - Tao thong tin "truoc khi chay"
  - Gom:
    - bao nhieu curriculum active
    - bao nhieu student active
    - bao nhieu lop dang mo
    - student nao thieu enrollmentYear
    - curriculum nao dang loi mapping subject

- `formatAutoEnrollmentPersistenceError(error)`
  - Dung de format loi bulk write
  - Co detect ca loi waitlist index cu

### 5.4 Flow backend chi tiet cua `triggerAutoEnrollment`

Flow co the doc nhu sau:

#### Buoc 1: Chuan hoa input

Service doc:

- `dryRun`
- `majorCodes`
- `studentCodes`
- `onlyStudentsWithoutEnrollments`
- `limit`

Sau do build `filters` de tra ve cho frontend.

#### Buoc 2: Tim hoc ky

```js
const semester = await repo.findSemesterById(semesterId);
```

Neu khong co hoc ky thi throw `404`.

#### Buoc 3: Nap du lieu nen

Service chay `Promise.all` de lay:

- `candidateStudents`
- `activeCurriculums`
- `classSections`
- `termsPerYear`

`termsPerYear` rat quan trong vi no anh huong den cach tinh "SV dang o hoc ky thu may trong curriculum".

#### Buoc 4: Build lookup

- Build pool class sections
- Build danh sach major alias
- Build `curriculumLookup`

`curriculumLookup` den tu `curriculumService.buildCurriculumLookup(activeCurriculums)` va duoc dung de map major -> curriculums nhanh hon.

#### Buoc 5: Nap enrollment va waitlist da ton tai

Auto-enrollment khong duoc tao trung.

Vi vay service phai lay:

- enrollment cua sinh vien trong hoc ky do
- waitlist WAITING cua sinh vien trong hoc ky do

Sau do build:

- `studentStateMap`
- `waitlistSet`

#### Buoc 6: Loc danh sach sinh vien se xu ly

Neu bat `onlyStudentsWithoutEnrollments`, service chi giu lai sinh vien chua co mon nao trong hoc ky hien tai.

Neu co `limit`, service cat danh sach theo limit.

#### Buoc 7: Xu ly tung sinh vien

Voi moi student:

1. Tim curriculum phu hop bang `getCurriculumMatchCached`
2. Neu khong co curriculum:
   - ghi error vao log
   - tang counter `failed`
   - chuyen student tiep theo
3. Tinh `curriculumSemesterOrder`
4. Lay mon hoc trong hoc ky curriculum do
5. Neu hoc ky curriculum khong co mon:
   - ghi vao `skipped`
6. Duyet tung mon trong hoc ky curriculum

Khi duyet tung mon:

1. Neu mon khong co linked subject data:
   - tang `curriculumSubjectMappingIssues`
   - tang `failed`
   - ghi error
2. Neu student da co mon do roi:
   - tang `duplicates`
   - ghi `skipped`
3. Tim class section phu hop bang `pickAvailableClassSection`
4. Neu khong tim thay:
   - dua vao `waitlist`
5. Neu tim thay:
   - push 1 enrollment doc vao `pendingEnrollmentDocs`
   - tang `classSectionIncrementMap`
   - update in-memory `classSection.currentEnrollment += 1`
   - update `studentState`
   - ghi `enrolled` vao log

Luu y quan trong:

- Service tang `currentEnrollment` tren object in-memory truoc
- Muc dich la de neu 1 lop vua duoc chon cho SV A, thi toi SV B no thay si so da tang va co the chon lop khac
- Day la mot kieu "simulate state" trong batch run

#### Buoc 8: Persist DB neu khong phai dry run

Neu `dryRun === false`, service chay:

1. `repo.bulkUpsertEnrollments(pendingEnrollmentDocs)`
2. `repo.bulkIncrementClassSections(classSectionIncrementMap)`
3. `repo.bulkUpsertWaitlists(pendingWaitlistDocs)`

No dung `bulkWrite` de nhanh hon va de giam so lan round-trip toi DB.

#### Buoc 9: Tra ket qua

Service tra object:

```js
{
  success,
  dryRun,
  durationMs,
  semester: { id, code, name, semesterNum, academicYear },
  summary: {
    totalStudents,
    processedStudents,
    candidateStudents,
    studentsWithEnrollments,
    studentsWithErrors,
    totalEnrollments,
    waitlisted,
    duplicates,
    failed
  },
  preflight,
  filters,
  logs
}
```

### 5.5 Kieu du lieu quan trong

#### Input API

```json
{
  "semesterId": "mongo_object_id",
  "dryRun": false,
  "limit": 100,
  "majorCodes": ["SE", "CE"],
  "studentCodes": ["SE180001"],
  "onlyStudentsWithoutEnrollments": true
}
```

#### Mot dong log student

```json
{
  "studentId": "ObjectId",
  "studentCode": "SE180001",
  "fullName": "Nguyen Van A",
  "curriculumCode": "SEK18",
  "curriculumSemesterOrder": 3,
  "enrolled": [
    {
      "subjectCode": "PRJ301",
      "subjectName": "Java Web",
      "classSectionId": "ObjectId",
      "classCode": "PRJ301-01"
    }
  ],
  "waitlisted": [],
  "skipped": [],
  "errors": []
}
```

### 5.6 Curriculum va payment service lien quan den auto-enrollment

Auto-enrollment khong tu biet SV dang hoc hoc ky nao trong curriculum. No nho 2 service khac:

#### `backend-api/src/services/curriculum.service.js`

Ham quan trong:

- `resolveStudentEnrollmentYear(student)`
  - parse `student.enrollmentYear` thanh number

- `buildCurriculumLookup(curriculums)`
  - build `Map<major, curriculums[]>`

- `getCurriculumMatchForStudent(student, options)`
  - xac dinh curriculum dung cho SV
  - dua tren:
    - `majorCode`
    - alias cua major
    - `enrollmentYear`
    - range `academicYear` cua curriculum

- `getSubjectsBySemester(curriculumId, semesterOrder)`
  - lay mon hoc cua hoc ky curriculum
  - support ca 2 kieu:
    - embedded structure
    - relational structure
  - Neu relational course bi mat `subject`, code hien tai co co che fallback theo `subjectCode` va tu repair best-effort

#### `backend-api/src/services/paymentValidation.service.js`

Ham quan trong:

- `resolveTermsPerYear(currentSemester)`
  - xac dinh moi nam co bao nhieu hoc ky

- `calculateStudentCurriculumSemester(student, currentSemester, options)`
  - cong thuc:

```txt
academicYearsElapsed * termsPerYear + semesterIndex
```

  - Vi du:
    - SV vao 2024
    - hoc ky hien tai la HK1 nam 2025-2026
    - `academicYearsElapsed = 2025 - 2024 = 1`
    - neu `termsPerYear = 2` va `semesterIndex = 1`
    - curriculum semester = `1 * 2 + 1 = 3`

- `generateSemesterPaymentCode(semesterOrder, curriculumCode)`
  - tao ma dang:

```txt
K3_SEK18
```

  - Ma nay duoc gan vao `note` de log luong auto-enrollment

### 5.7 Frontend cho auto-enrollment

#### `frontend-web/src/pages/admin/AutoEnrollmentPage.jsx`

Trang nay la UI de admin/staff chay auto-enrollment thu cong.

State chinh:

- `semesters`
- `selectedSemesterId`
- `dryRun`
- `limit`
- `majorCodesInput`
- `onlyStudentsWithoutEnrollments`
- `result`
- `error`

Flow:

1. `useEffect` load danh sach semester
2. Mac dinh chon hoc ky `isCurrent`
3. User bam `Run auto enrollment`
4. `handleRun()` goi `autoEnrollmentService.trigger(...)`
5. Ket qua duoc set vao `result`
6. UI render:
   - execution summary
   - preflight
   - warnings
   - logs tung student

Day la noi de admin xem "log ket qua" dung nhu requirement.

#### `frontend-web/src/services/autoEnrollmentService.js`

No la wrapper axios:

```js
trigger: (semesterId, options = {}) =>
  axiosClient.post('/auto-enrollment/trigger', { semesterId, ...options })
```

### 5.8 Luu y logic quan trong

- Auto-enrollment chi xep vao class section co status `published` hoac `scheduled`
- Sinh vien active moi duoc xu ly
- Sinh vien da co mon roi thi bo qua, khong tao trung
- Lop full thi vao waitlist
- `dryRun` chi mo phong, khong ghi DB
- `summary.failed > 0` thi `success` cua job se la `false`

---

## 6. Feature 2 - Activate Automatic Enrollment khi Semester moi duoc set `isCurrent = true`

### 6.1 Muc dich nghiep vu

Khi admin danh dau 1 semester la hoc ky hien tai, he thong phai tu dong chay auto-enrollment cho semester do.

Y nghia nghiep vu:

- Dam bao semester current va enrollment di cung nhau
- Giam thao tac tay cua admin
- Khong de xay ra tinh trang "doi hoc ky roi nhung chua xep lop"

### 6.2 Backend file va vai tro

#### `backend-api/src/modules/semester/semester.repository.js`

Repository nay cung cap:

- `findCurrent()`
- `clearCurrentFlag(excludeId)`
- `create(...)`
- `updateById(...)`
- `deleteById(...)`

#### `backend-api/src/modules/semester/semester.service.js`

Day la noi xu ly chinh.

Ham quan trong:

- `normalizeBoolean(value, fallback)`
- `formatSemester(doc)`
- `buildSemesterWritePayload(doc)`
- `buildAutoEnrollmentFailure(semesterDoc, autoEnrollment)`
- `rollbackCurrentSemesterChange(...)`
- `createSemester(data)`
- `updateSemester(id, data)`

#### `backend-api/src/modules/semester/semester.controller.js`

- Nhan request CRUD semester
- `handleError` ton trong `err.statusCode`

### 6.3 Logic backend chi tiet

#### `createSemester(data)`

Flow:

1. Validate field bat buoc `code`, `name`, `semesterNum`
2. Chuan hoa `isCurrent`, `isActive`
3. Neu `isCurrent = true` ma `isActive = false` thi reject
4. Check trung `code`
5. Neu semester moi se la current:
   - lay `previousCurrentSemester`
6. Mo `mongoose session`
7. Trong transaction:
   - neu semester moi la current thi `clearCurrentFlag`
   - create semester moi
8. Sau khi transaction commit:
   - neu semester vua tao la current thi goi `autoEnrollmentService.triggerAutoEnrollment(...)`
9. Neu auto-enrollment fail:
   - goi `rollbackCurrentSemesterChange(...)`
   - xoa semester vua tao
   - restore semester current cu
   - throw loi `409`

#### `updateSemester(id, data)`

Flow tuong tu, nhung khac o cho:

1. Doc semester cu
2. Tinh `willSetCurrent`
3. Neu dang chuyen tu khong-current sang current:
   - lay `previousCurrentSemester`
4. Mo transaction
5. Trong transaction:
   - `clearCurrentFlag(id)`
   - update semester hien tai
6. Sau commit:
   - goi auto-enrollment
7. Neu auto-enrollment fail:
   - rollback semester duoc sua ve snapshot cu
   - restore semester current cu

### 6.4 Vi sao phai rollback

Neu khong rollback, he thong co the roi vao state xau:

- `Semester A` da duoc set `isCurrent = true`
- nhung auto-enrollment loi
- ket qua la hoc ky hien tai da doi, nhung SV chua duoc xep lop

Ban fix hien tai trong code giai quyet dung van de do.

### 6.5 Frontend

#### `frontend-web/src/pages/admin/SemesterManagement.jsx`

Vai tro:

- Quan ly danh sach semester
- Tao/sua/xoa semester
- Trigger auto-enrollment giap tiep khi admin set `isCurrent`

State lien quan:

- `formData.isCurrent`
- `formData.isActive`
- `autoEnrollmentResult`

Logic quan trong trong `handleSubmit`:

1. Tinh:

```js
const shouldTriggerAutoEnrollment = formData.isCurrent && !selectedSemester?.isCurrent;
```

2. Neu dung thi popup confirm:

```js
window.confirm('Dat hoc ky nay la hoc ky hien tai va chay auto-enrollment ngay bay gio?')
```

3. Goi:
   - `semesterService.create(payload)` hoac
   - `semesterService.update(id, payload)`
4. Doc `response.data.data.autoEnrollment`
5. Hien toast va panel ket qua auto-enrollment gan nhat

#### `frontend-web/src/services/semesterService.js`

CRUD wrapper cho `/semesters`.

### 6.6 Dieu can ghi nho

- Trigger auto-enrollment khong nam o controller, ma nam trong service
- Frontend chi la ben kich hoat thong qua viec submit semester
- Thanh cong that su phu thuoc backend trigger + rollback

---

## 7. Feature 3 - Limit Course Overload

### 7.1 Y nghia nghiep vu

Sinh vien khong duoc dang ky qua 2 mon hoc vuot trong cung 1 hoc ky.

Trong code hien tai, "mon vuot" duoc hieu la:

- mon da duoc danh dau `isOverload = true`, hoac
- mon khong nam trong danh sach mon cua curriculum semester hien tai cua SV

### 7.2 Model lien quan

#### `backend-api/src/models/classEnrollment.model.js`

Field quan trong:

```js
isOverload: {
  type: Boolean,
  default: false,
  index: true
}
```

Y nghia:

- `false`: mon binh thuong theo khung hoc ky
- `true`: mon hoc vuot

Model nay con co unique index:

```js
classEnrollmentSchema.index({ classSection: 1, student: 1 }, { unique: true });
```

Nen 1 student khong the vao cung 1 class section 2 lan.

### 7.3 Backend service

#### `backend-api/src/services/registration.service.js`

Ham chinh:

```js
checkOverloadLimit(studentId, semesterId, classId = null)
```

Flow:

1. Tim student
2. Neu co `classId` thi tim class section dang duoc canh bao/kiem tra
3. Resolve semester bang `resolveSemester(...)`
4. Lay enrollment trong hoc ky bang `getSemesterEnrollments(...)`
5. Lay curriculum subject set bang `getCurriculumSubjectIdSet(student, semester)`
6. Dem so overload hien tai:
   - Neu enrollment co `isOverload === true` thi tinh la overload
   - Neu khong, nhung mon do nam ngoai `subjectIdSet` cua curriculum, cung xem la overload
7. Neu dang kiem tra them 1 `classId`:
   - xac dinh mon sap dang ky co phai overload khong
   - tinh `projectedOverloadCount`
8. Tra ket qua

Ket qua tra ve:

```json
{
  "allowed": true,
  "message": "Overload limit check passed",
  "maxOverloadCourses": 2,
  "currentOverloadCount": 1,
  "projectedOverloadCount": 2,
  "enrollingCourseIsOverload": true
}
```

### 7.4 Helper rat quan trong phia sau overload logic

#### `getCurriculumSubjectIdSet(student, semester)`

Ham nay:

1. Tim curriculum cua student
2. Tinh `curriculumSemesterOrder`
3. Lay mon hoc cua hoc ky curriculum do
4. Tao `Set(subjectId)`

Set nay la chuan de so sanh:

- mon nam trong curriculum semester hien tai
- mon nao nam ngoai curriculum, xem la overload

### 7.5 Luc dang ky that thi overload duoc luu nhu the nao

#### `backend-api/src/modules/classSection/classSection.service.js`

Trong `selfEnroll(userId, classId)`:

1. Service goi `registrationService.getStudentEligibilitySummary(student._id, classId)`
2. Eligibility summary chua thong tin overload
3. Neu tat ca dieu kien deu dat, service goi:

```js
return enrollStudent(classId, student._id, {
  isOverload: eligibility.limits.overload.enrollingCourseIsOverload === true,
});
```

Sau do `enrollStudent(...)` tao `ClassEnrollment` voi:

```js
isOverload: options.isOverload === true
```

Tuc la:

- Kiem tra overload nam o `registration.service.js`
- Gan co `isOverload` nam o `classSection.service.js`

### 7.6 Frontend

#### `frontend-web/src/pages/student/ClassRegistrationPage.jsx`

Day la noi hien thi overload cho sinh vien.

UI lien quan:

- card "Your limits" hien:
  - `Overload: currentOverloadCount/2`
- neu da dat 2 overload va mon dang xem cung la overload:
  - hien canh bao mau vang
- nut `Register` se bi disable neu `validation.isEligible === false`

Data overload den tu 2 nguon:

1. `fetchEligibility()` -> `getEligibilitySummary()`
2. `preValidateClasses()` -> `validateAll(classId)` cho tung class

### 7.7 Ket noi voi `validateAll`

`registration.controller.validateAll` goi song song:

- prerequisite
- capacity
- wallet
- schedule conflict
- eligibility summary

Sau do no tra ve:

```json
{
  "isEligible": false,
  "overload": { ... },
  "credit": { ... },
  "cohortAccess": { ... },
  "validationErrors": [
    "You have exceeded the overload limit (maximum 2 courses)"
  ]
}
```

Frontend chi can doc `validation.isEligible` va `validationErrors`.

---

## 8. Feature 4 - Check Course Prerequisites

### 8.1 Y nghia nghiep vu

Sinh vien chi duoc dang ky mon moi neu da hoc va dat cac mon tien quyet.

Trong code hien tai, "dat" dang duoc hieu la:

- `ClassEnrollment.status === 'completed'`
- `grade >= 5.0`

### 8.2 Backend logic

#### `backend-api/src/services/registration.service.js`

Ham:

```js
validatePrerequisites(studentId, classId)
```

Flow:

1. Tim `ClassSection` theo `classId`
2. `populate('subject')`
3. Neu khong co class -> `eligible: false`
4. Doc `subject.prerequisites`
5. Neu mon khong co prerequisite:
   - `eligible: true`
6. Tim tat ca enrollment da hoan thanh va co diem >= 5
7. `populate classSection.subject`
8. Lay `passedSubjectCodes`
9. So sanh tung prerequisite:
   - neu code prerequisite khong nam trong `passedSubjectCodes` thi add vao `missingPrerequisites`
10. Tra ket qua

Return shape:

```json
{
  "eligible": false,
  "message": "Missing prerequisites: OOP, DSA",
  "missingPrerequisites": [
    { "code": "PRF192", "name": "Programming Fundamentals" }
  ]
}
```

### 8.3 Controller va API

#### `backend-api/src/controllers/registration.controller.js`

Endpoint:

- `POST /api/registrations/validate`

Controller:

- tim student tu auth
- goi `registrationService.validatePrerequisites(...)`
- tra `data: result`

### 8.4 Frontend

#### `frontend-web/src/services/registrationService.js`

Wrapper:

```js
validatePrerequisites: (classId) =>
  axiosClient.post('/registrations/validate', { classId })
```

#### `frontend-web/src/pages/student/ClassRegistrationPage.jsx`

Trang nay khong goi rieng `validatePrerequisites` trong flow mac dinh; no goi `validateAll(classId)` de lay tong hop tat ca validations.

UI lien quan:

- Neu `cls.subject.prerequisites.length > 0`
  - hien badge `Prerequisites required`
- Neu `validation.isEligible === false`
  - box do se show `validationErrors`
- 1 trong cac `validationErrors` co the la message prerequisite

### 8.5 Dieu can nho

- Prerequisite check dang dua tren `subjectCode`, khong so sanh theo subjectId
- Chi tinh cac mon `completed` va `grade >= 5`
- Chua co logic "dang hoc song song mon tien quyet"

---

## 9. Feature 5 - Verify Student Cohort Eligibility

### 9.1 Y nghia nghiep vu

Khong phai khoa sinh vien nao cung duoc dang ky trong moi dot.

Vi du:

- Dot dang ky nay chi mo cho K18 va K19
- K20 vao se bi chan

### 9.2 Model

#### `backend-api/src/models/registrationPeriod.model.js`

Field quan trong:

```js
allowedCohorts: {
  type: [Number],
  default: [],
  set: (cohorts) => {
    if (!Array.isArray(cohorts)) return [];
    return [...new Set(cohorts.map((c) => Number(c)).filter((c) => !Number.isNaN(c)))];
  }
}
```

Y nghia:

- Luu du lieu dang array so nguyen: `[18, 19, 20]`
- Tu dong chuan hoa va bo trung lap
- `[]` nghia la mo cho tat ca cohort

### 9.3 Backend service

#### `backend-api/src/services/registrationPeriod.service.js`

Ham cot song:

##### `checkCohortAccess(studentCohort, periodAllowedCohorts = [])`

Rule:

- Neu `allowedCohorts` rong -> cho phep tat ca
- Convert cohort ve `Number`
- So sanh membership trong array cho phep

Return shape:

```json
{
  "allowed": false,
  "message": "Cohort K20 is not allowed",
  "allowedCohorts": [18, 19]
}
```

##### `validateCurrentPeriodCohort(studentCohort)`

Flow:

1. Tim `currentPeriod` dang active
2. Neu khong co period active:
   - `allowed: true`
   - vi he thong khong co rule nao dang chan
3. Neu co period:
   - goi `checkCohortAccess`
4. Tra ket qua tong hop

Return shape:

```json
{
  "hasActivePeriod": true,
  "allowed": false,
  "message": "Cohort K20 is not allowed",
  "allowedCohorts": [18, 19],
  "period": { ... }
}
```

##### `isRegistrationOpen(requestType, studentCohort)`

Ham nay mo rong hon, dung cho cac request type nhu:

- `repeat`
- `overload`
- `change_class`
- `drop`
- `all`

No vua check:

- thoi gian period
- status active
- request type
- cohort

### 9.4 Frontend admin cau hinh cohort

#### `frontend-web/src/pages/admin/RegistrationPeriodManagement.jsx`

Admin nhap `allowedCohorts` dang string, vi du:

```txt
18, 19, 20
```

Trong `handleCreate()` va `handleUpdate()`, page parse string nay thanh array so:

```js
const cohortsArray = formData.allowedCohorts
  ? formData.allowedCohorts
      .split(',')
      .map((c) => parseInt(c.trim()))
      .filter((c) => !isNaN(c))
  : [];
```

Sau do gui len backend:

```js
allowedCohorts: cohortsArray
```

### 9.5 Frontend sinh vien

#### `frontend-web/src/pages/student/ClassRegistrationPage.jsx`

Trang nay hien:

- `Cohort: K{eligibility.student.cohort}`
- Neu cohort bi chan:
  - show alert mau do o dau trang
  - disable nut `Register`

Bien quan trong:

- `cohortInfo = eligibility?.limits?.cohortAccess`
- `isCohortBlocked = cohortInfo && !cohortInfo.allowed`

`cannotRegister` cua tung card class:

```js
const cannotRegister =
  cls.isFull ||
  isCohortBlocked ||
  (validation ? !validation.isEligible : false);
```

Tuc la cohort block la mot dieu kien global, khong phu thuoc tung mon.

---

## 10. Feature 6 - Check Maximum Credit Limit

### 10.1 Y nghia nghiep vu

Sinh vien khong duoc dang ky vuot tong so tin chi toi da trong hoc ky.

Code hien tai dang dung mac dinh:

```txt
maxCredits = 20
```

### 10.2 Backend logic

#### `backend-api/src/services/registration.service.js`

Ham:

```js
checkCreditLimit(studentId, semesterId, newCredits = 0, maxCredits = 20)
```

Flow:

1. Chuan hoa `maxCredits`
2. Chuan hoa `newCredits`
3. Resolve semester
4. Lay enrollment trong semester
5. Tong hop `currentCredits`
   - cong `classSection.subject.credits`
   - chi tinh enrollment co `status` `enrolled` hoac `completed`
6. Tinh:

```txt
projectedCredits = currentCredits + newCredits
```

7. `allowed = projectedCredits <= maxCredits`

Return shape:

```json
{
  "allowed": true,
  "message": "Credit limit check passed",
  "currentCredits": 18,
  "newCredits": 3,
  "projectedCredits": 21,
  "maxCredits": 20
}
```

Neu `projectedCredits > maxCredits`, response se la `allowed: false`.

### 10.3 Credit limit duoc tich hop vao eligibility summary

Trong `getStudentEligibilitySummary(studentId, classId)`:

1. Tim class dang duoc xem
2. Lay so tin chi cua mon do
3. Goi `checkCreditLimit(studentId, semesterId, classCredits, 20)`
4. Dua ket qua vao `limits.credit`

Sau do `canRegister` duoc tinh bang:

```js
overload.allowed && credit.allowed && cohortAccess.allowed
```

### 10.4 Frontend

#### `frontend-web/src/pages/student/ClassRegistrationPage.jsx`

UI credit:

- hien `Credits: currentCredits/maxCredits`
- progress bar:

```js
const creditPercent = Math.min(100, Math.round((creditInfo.currentCredits / creditInfo.maxCredits) * 100));
```

Neu class dang xem lam vuot tran credit, `validateAll` se tra `isEligible = false` va nut dang ky se bi disable.

### 10.5 Dieu can nho

- Credit limit hien tai la hard-coded `20` trong service eligibility
- Neu truong thay doi policy, nen dua max credit ra config/semester/major rule

---

## 11. Feature 7 - View Lecturer Timetable

### 11.1 Y nghia nghiep vu

Giang vien can xem cac lop hoc phan ma minh phu trach theo hoc ky.

Admin/staff cung can xem giup theo lecturer de dieu phoi.

### 11.2 Backend file va vai tro

#### `backend-api/src/modules/lecturer/teachingSchedule.routes.js`

Endpoint:

- `GET /api/lecturer/teaching-schedule`

Role duoc phep:

- `staff`
- `admin`
- `lecturer`

#### `backend-api/src/modules/lecturer/teachingSchedule.controller.js`

Controller:

1. Lay `userId` tu auth
2. Goi `service.getTeachingSchedule(userId, req.query)`
3. Tra response `success, message, data`

#### `backend-api/src/modules/lecturer/teachingSchedule.service.js`

Day la business logic chinh.

### 11.3 Ham `resolveTeacher(...)`

Ham nay rat quan trong vi no cho phep nhieu cach tim giang vien:

1. Neu co `teacherId` -> tim thang theo `_id`
2. Neu co `teacherCode` -> tim theo ma GV
3. Neu khong co -> tim teacher theo `userId`
4. Neu van khong co -> tim theo `email` cua user

Y nghia:

- Tai khoan lecturer co the lien ket teacher profile qua nhieu cach
- Giam loi mapping account

### 11.4 Ham `getTeachingSchedule(userId, filters = {})`

Flow:

1. Resolve teacher
2. Parse filter:
   - `teacherId`
   - `teacherCode`
   - `semester`
   - `academicYear`
   - `semesterId`
   - `includeAllClasses`
3. Neu co `semesterId`:
   - tim semester tu DB
   - lay `semesterNum`, `academicYear`
4. Neu khong co filter semester va cung khong `includeAllClasses`:
   - fallback lay `Semester.findOne({ isCurrent: true })`
5. Build `classFilter`

```js
{
  teacher: teacher._id,
  status: { $ne: 'cancelled' },
  semester,
  academicYear
}
```

6. Tim `ClassSection`
7. `populate`:
   - `subject`
   - `room`
   - `timeslot`
8. Lay `Schedule` records theo `classSection`
9. Group `schedules` theo class
10. Tra payload cho frontend

Response shape:

```json
{
  "teacher": {
    "id": "ObjectId",
    "teacherCode": "GV001",
    "fullName": "Tran Van B",
    "department": "SE"
  },
  "semester": {
    "semesterNum": 1,
    "academicYear": "2025-2026"
  },
  "classes": [
    {
      "_id": "ObjectId",
      "id": "ObjectId",
      "classCode": "PRJ301-01",
      "className": "PRJ301",
      "semester": 1,
      "academicYear": "2025-2026",
      "currentEnrollment": 35,
      "maxCapacity": 40,
      "subject": { ... },
      "room": { ... },
      "timeslot": { ... },
      "schedules": [{ ... }]
    }
  ]
}
```

### 11.5 Frontend

#### `frontend-web/src/services/scheduleService.js`

Wrapper:

```js
getTeachingSchedule: (params) =>
  axiosClient.get('/lecturer/teaching-schedule', { params })
```

#### `frontend-web/src/pages/admin/TeachingSchedulePage.jsx`

Trang nay duoc dung chung cho:

- `/admin/teaching-schedule`
- `/lecturer/teaching-schedule`

No phat hien role tu `localStorage.auth_user`.

Bien:

- `isAdminOrStaff = role === 'admin' || role === 'staff'`

Flow lien quan den "View Lecturer Timetable":

1. `fetchSchedule(teacherId = '')`
2. Neu admin/staff:
   - co dropdown chon lecturer
3. Neu lecturer:
   - co the de trong bo loc de load theo account hien tai
4. Goi `scheduleService.getTeachingSchedule(params)`
5. Luu vao `data`
6. Render thong tin lecturer

### 11.6 Luu y hien trang frontend

Backend hien tai tra ve day du `data.classes`.

Tuy nhien, phan cuoi `TeachingSchedulePage.jsx` hien tai moi render ro:

- thong tin giang vien
- bo loc lecturer
- cac cong cu generate timetable danh cho admin/staff

No chua render day du danh sach `data.classes` thanh bang/lich day chi tiet o doan cuoi file. Nghia la:

- API backend cho feature nay da day du
- state frontend da lay du lieu
- nhung phan "present full lecturer timetable" tren UI hien tai moi o muc co nen du lieu, chua hoan thien phan render chi tiet bang danh sach lop o cuoi page

Neu ban muon mo rong sau nay, bien can render them la:

```js
data.classes
```

---

## 12. Flow tong hop cua trang dang ky mon

Day la flow quan trong nhat vi no ket noi overload + credit + cohort + prerequisite.

### 12.1 Tu luc vao trang

`ClassRegistrationPage.jsx` chay:

1. `fetchEligibility()`
2. `fetchClasses()`

`fetchEligibility()` goi:

```js
registrationService.getEligibilitySummary()
```

De lay:

- thong tin sinh vien
- thong tin semester
- overload summary
- credit summary
- cohort access summary

`fetchClasses()` goi:

```js
classService.searchClasses(params)
```

Sau do voi moi class, page goi `validateAll(classId)` de pre-validate.

### 12.2 Endpoint tong hop `validate-all`

`registration.controller.validateAll` goi song song:

- `validatePrerequisites`
- `validateClassCapacity`
- `validateWallet`
- `checkScheduleConflict`
- `getStudentEligibilitySummary`

Nghia la 1 class card duoc danh gia cung luc tren nhieu rule.

Frontend nhan:

```json
{
  "isEligible": false,
  "prerequisites": { ... },
  "capacity": { ... },
  "wallet": { ... },
  "scheduleConflict": { ... },
  "overload": { ... },
  "credit": { ... },
  "cohortAccess": { ... },
  "eligibility": { ... },
  "validationErrors": [ ... ]
}
```

### 12.3 Luc bam Register

`handleRegister(cls)` trong `ClassRegistrationPage.jsx`:

1. Goi lai `checkScheduleConflictNow`
2. Neu conflict -> dung
3. Lay `validationResults[cls._id]`
4. Neu chua co thi goi `validateSingleClass`
5. Neu `!validation.isEligible` -> dung
6. Goi `classService.selfEnroll(cls._id)`

### 12.4 Trong backend `selfEnroll`

`classSection.service.js`:

1. Resolve user -> student
2. Goi song song:
   - prerequisite
   - capacity
   - wallet
   - schedule conflict
   - eligibility
3. Gom tat ca loi vao 1 mang `errors`
4. Neu co loi -> throw
5. Neu pass -> `enrollStudent(...)`
6. `enrollStudent(...)` tao `ClassEnrollment` va tang `currentEnrollment`

Tuc la frontend da pre-check, backend van re-check mot lan nua truoc khi ghi DB. Day la dung va can thiet.

---

## 13. Cac kieu du lieu ma ban nen nho

### 13.1 Eligibility summary

```json
{
  "student": {
    "id": "ObjectId",
    "studentCode": "SE180001",
    "fullName": "Nguyen Van A",
    "cohort": 18,
    "majorCode": "SE"
  },
  "semester": {
    "id": "ObjectId",
    "code": "HK1-2025",
    "name": "Hoc ky 1",
    "semesterNum": 1,
    "academicYear": "2025-2026"
  },
  "limits": {
    "overload": { "...": "..." },
    "credit": { "...": "..." },
    "cohortAccess": { "...": "..." }
  },
  "canRegister": true
}
```

### 13.2 Validation all

```json
{
  "isEligible": true,
  "prerequisites": { "eligible": true, "message": "All prerequisites passed" },
  "capacity": { "isFull": false, "current": 30, "max": 40 },
  "wallet": { "isSufficient": true, "currentBalance": 5000, "totalFee": 900 },
  "scheduleConflict": { "hasConflict": false },
  "overload": { "allowed": true, "currentOverloadCount": 1 },
  "credit": { "allowed": true, "currentCredits": 15, "projectedCredits": 18, "maxCredits": 20 },
  "cohortAccess": { "allowed": true, "message": "Cohort K18 is allowed" },
  "validationErrors": []
}
```

### 13.3 Teaching schedule

```json
{
  "teacher": { "...": "..." },
  "semester": { "...": "..." },
  "classes": [
    {
      "classCode": "PRJ301-01",
      "subject": { "subjectCode": "PRJ301" },
      "room": { "roomCode": "A203" },
      "timeslot": { "groupName": "Ca 1", "startTime": "07:00", "endTime": "09:00" },
      "schedules": [
        {
          "dayOfWeek": 2,
          "startPeriod": 1,
          "endPeriod": 3
        }
      ]
    }
  ]
}
```

---

## 14. Checklist doc code nhanh cho nguoi moi

Neu ban muon nam module nhanh, hay doc theo thu tu sau:

1. Doc `App.jsx` de biet route vao page nao
2. Doc `frontend service` de biet API nao duoc goi
3. Doc `routes` backend de biet endpoint, role, auth
4. Doc `controller` de biet input/output
5. Doc `service` de nam business logic
6. Doc `model` de hieu field va index
7. Quay lai page frontend de hieu state nao dang dung ket qua do

### Thu tu goi y cho tung cum

#### Auto-enrollment

1. `frontend-web/src/pages/admin/AutoEnrollmentPage.jsx`
2. `frontend-web/src/services/autoEnrollmentService.js`
3. `backend-api/src/modules/autoEnrollment/autoEnrollment.routes.js`
4. `backend-api/src/modules/autoEnrollment/autoEnrollment.controller.js`
5. `backend-api/src/modules/autoEnrollment/autoEnrollment.service.js`
6. `backend-api/src/modules/autoEnrollment/autoEnrollment.repository.js`
7. `backend-api/src/services/curriculum.service.js`
8. `backend-api/src/services/paymentValidation.service.js`

#### Dang ky mon

1. `frontend-web/src/pages/student/ClassRegistrationPage.jsx`
2. `frontend-web/src/services/registrationService.js`
3. `frontend-web/src/services/classService.js`
4. `backend-api/src/routes/registration.routes.js`
5. `backend-api/src/controllers/registration.controller.js`
6. `backend-api/src/services/registration.service.js`
7. `backend-api/src/modules/classSection/classSection.service.js`
8. `backend-api/src/models/classEnrollment.model.js`
9. `backend-api/src/services/registrationPeriod.service.js`
10. `backend-api/src/models/registrationPeriod.model.js`

#### Teaching schedule

1. `frontend-web/src/pages/admin/TeachingSchedulePage.jsx`
2. `frontend-web/src/services/scheduleService.js`
3. `backend-api/src/modules/lecturer/teachingSchedule.routes.js`
4. `backend-api/src/modules/lecturer/teachingSchedule.controller.js`
5. `backend-api/src/modules/lecturer/teachingSchedule.service.js`

---

## 15. Tong ket ngan gon theo tung requirement

### Auto-Assign Students To Classes

- Backend da co batch auto-enrollment day du
- Co duplicate handling
- Co waitlist handling
- Co log summary/preflight
- Frontend da co trang chay tay va xem log

### Activate Automatic Enrollment

- Khi set `isCurrent = true`, backend tu trigger auto-enrollment
- Da co rollback neu auto-enrollment fail
- Frontend co popup confirm va hien ket qua lan chay gan nhat

### Limit Course Overload

- Backend dem mon overload theo curriculum semester hien tai
- Chi cho toi da 2 mon
- `ClassEnrollment.isOverload` duoc luu luc dang ky that
- Frontend hien canh bao va chan dang ky

### Check Course Prerequisites

- Backend kiem tra enrollment `completed` va `grade >= 5`
- Frontend hien canh bao qua `validateAll`

### Verify Student Cohort Eligibility

- Backend dung `allowedCohorts` trong `RegistrationPeriod`
- `[]` nghia la tat ca cohort
- Frontend hien K cua SV va chan dang ky neu cohort khong hop le

### Check Maximum Credit Limit

- Backend tinh tong tin chi hien tai + mon moi
- Mac dinh toi da 20 tin chi
- Frontend hien progress bar va count

### View Lecturer Timetable

- Backend API da tra teacher + classes + schedules
- Frontend da goi API, chon lecturer, va hien lecturer summary
- Phan render danh sach class chi tiet tren UI co the can bo sung them neu muon hien day du nhu mot timetable hoan chinh

---

## 16. Goi y neu ban muon hoc sau hon nua

Neu ban muon nam rat sau module nay, buoc tiep theo nen lam la:

1. Dat breakpoint hoac `console.log` o `registration.controller.validateAll`
2. Dat breakpoint o `classSection.service.selfEnroll`
3. Chay 1 case dang ky that va so sanh response frontend voi DB
4. Chay 1 case auto-enrollment `dryRun = true`
5. Chay 1 case auto-enrollment `dryRun = false`
6. Theo doi su khac nhau giua `summary`, `preflight`, `logs`
7. Tao 1 cohort bi chan trong registration period va quan sat UI student

Lam theo cach nay ban se nam rat nhanh "du lieu di chuyen nhu the nao" trong he thong.
