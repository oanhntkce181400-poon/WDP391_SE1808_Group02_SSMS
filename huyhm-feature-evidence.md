# HuyHM Feature Evidence

Tai lieu nay tong hop bang chung GitHub cho 6 feature core tren nhanh `HuyHMSpring4`
va bo feature/tech bo sung theo danh sach `HuyHMCE181719`.

## Commit can nho

- Commit chinh: `6111ac7`
- Full hash: `6111ac71b00a43a7f0530d58eb327ec21d45012b`
- Commit/remote proof bo sung: `b32e457`
- Full hash bo sung: `b32e45721da557ce9da70a8eb8c2ae6d70cbecc9`
- Remote branch proof bo sung: `origin/feature-thattm-update`

## Dung nhanh trong 30s

1. Mo `github-ui-proof-links-huyhm.csv`.
2. Tim theo ten feature.
3. Bam link FE truoc de chi vao man hinh/page/component.
4. Bam link BE sau de chi vao controller/service xu ly.
5. Bam link commit `6111ac7` neu thay hoi "commit nao la dau vet cua em?".
6. Neu can noi nhanh ham chinh va file fallback, mo them `feature-traceability-huyhm.csv`.

## File Map

| File | Muc dich |
| --- | --- |
| `huyhm-feature-evidence.md` | Bang tom tat de nho nhanh |
| `github-ui-proof-links-huyhm.csv` | Link GitHub click-thang vao FE, BE va commit proof |
| `feature-traceability-huyhm.csv` | File traceability: file chinh, ham chinh, backend fallback, cau noi nhanh |

## Bo Sung HuyHMCE181719

Chi tiet tung dong da duoc bo sung vao 2 file CSV. Neu thay hoi theo ID trong bang assignment
thi loc theo cot `ID` la ra ngay.

| IDs | Nhom | Mo file nao truoc |
| --- | --- | --- |
| 11-13 | Tech/System/Tool | `socket.config.js`, `cloudinary.provider.js`, `database/seeds/index.js` |
| 17 | Filter/sort subjects | `frontend-web/src/pages/admin/SubjectManagement.jsx` |
| 23-24 | Configure tuition fees | `frontend-web/src/pages/admin/TuitionFeeManagement.jsx` |
| 57, 116 | Weekly timetable web | `frontend-web/src/pages/student/SchedulePage.jsx` |
| 67-69 | Request flow | `frontend-web/src/pages/admin/AdminRequestsPage.jsx`, `frontend-web/src/pages/student/StudentRequestsPage.jsx` |
| 75, 76, 123 | Attendance | `frontend-web/src/pages/admin/AttendancePage.jsx` |
| 87 | Tuition summary | `frontend-web/src/pages/student/TuitionPage.jsx`, `mobile-app/src/screens/student/TuitionFeeScreen.js` |
| 102 | Prevent schedule conflicts | `frontend-web/src/pages/student/ClassRegistrationPage.jsx` |
| 104 | Auto-generate timetables | `frontend-web/src/pages/admin/TeachingSchedulePage.jsx` |
| 120 | View class roster | `frontend-web/src/pages/student/SchedulePage.jsx` |
| 127 | Assign lecturers to classes | `frontend-web/src/pages/admin/ClassManagement.jsx` |
| 138 | Weekly timetable mobile | `mobile-app/src/screens/student/ScheduleScreen.js` |
| 153-155 | Email templates | `frontend-web/src/pages/admin/EmailTemplateManagementPage.jsx` |
| 157 | Submit lecturer evaluation | `frontend-web/src/components/features/LecturerFeedbackPortal.jsx` |

## Luu y khi phong van

- 6 feature core van bam nhanh theo commit `6111ac7`.
- Nhung ID bo sung moi duoc map theo remote proof `b32e457` tren `origin/feature-thattm-update`.
- Mot so requirement goc viet theo ten API khac, nhung trong repo hien tai duoc map vao implementation that.
- Vi vay, neu thay hoi sau, uu tien chi implementation dang co trong repo truoc.

## 6 Feature Cua HuyHM

| ID | Feature | Mo file nao truoc | Ham chinh | Xuong backend o dau |
| --- | --- | --- | --- | --- |
| 1 | View Weekly Timetable | `mobile-app/src/screens/student/ScheduleScreen.js` | `ScheduleScreen()`, `loadSchedule()` | `schedule.controller.js`, `schedule.service.js` -> `getMyWeekSchedule()` |
| 2 | Create Email Templates | `frontend-web/src/pages/admin/EmailTemplateManagementPage.jsx` | `handleSubmit()` nhanh create | `emailTemplate.controller.js`, `emailTemplate.service.js` -> `createTemplate()` |
| 3 | View Email Templates | `frontend-web/src/pages/admin/EmailTemplateManagementPage.jsx` | `loadTemplates()`, `loadTemplateDetail()` | `emailTemplate.controller.js`, `emailTemplate.service.js` -> `listTemplates()`, `getTemplateById()` |
| 4 | Update/Delete Email Templates | `frontend-web/src/pages/admin/EmailTemplateManagementPage.jsx` | `handleSubmit()` nhanh update, `handleDelete()` | `emailTemplate.controller.js`, `emailTemplate.service.js` -> `updateTemplate()`, `deleteTemplate()` |
| 5 | Submit Lecturer Evaluation | `frontend-web/src/components/features/LecturerFeedbackPortal.jsx` | `loadBaseData()`, `loadClassDetails()`, `handleSubmit()` | `feedback.controller.js`, `feedback.service.js` -> `submitFeedback()`, `createFeedback()` |
| 6 | Track Class Performance | `frontend-web/src/components/features/ClassPerformanceDashboard.jsx` | `loadClasses()`, `loadPerformance()` | `attendance.controller.js`, `attendance.service.js` -> `getTeachingClasses()`, `getClassPerformance()` |

## 3 Cau Phai Thuoc

```text
Commit em bam de tim nhanh la 6111ac7 tren nhanh HuyHMSpring4.
```

```text
Ba chuc nang Email Template deu nam chung 1 file:
frontend-web/src/pages/admin/EmailTemplateManagementPage.jsx
```

```text
Muong tim nhanh tren GitHub thi em mo commit 6111ac7,
loc dung file chinh cua feature,
roi Ctrl + F dung ten ham chinh.
```

## Chot 1 Dong / 1 Chuc Nang

- `View Weekly Timetable` -> `ScheduleScreen.js` -> `loadSchedule()`
- `Create Email Templates` -> `EmailTemplateManagementPage.jsx` -> `handleSubmit()` nhanh create
- `View Email Templates` -> `EmailTemplateManagementPage.jsx` -> `loadTemplates()`, `loadTemplateDetail()`
- `Update/Delete Email Templates` -> `EmailTemplateManagementPage.jsx` -> `handleSubmit()` nhanh update, `handleDelete()`
- `Submit Lecturer Evaluation` -> `LecturerFeedbackPortal.jsx` -> `loadBaseData()`, `loadClassDetails()`, `handleSubmit()`
- `Track Class Performance` -> `ClassPerformanceDashboard.jsx` -> `loadClasses()`, `loadPerformance()`
