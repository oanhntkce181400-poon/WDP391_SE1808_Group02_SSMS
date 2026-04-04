# Notifications 6 Functions Evidence Map

- Generated date: 2026-04-04
- Current local branch analyzed: `huyhm-fixSprint4`
- Screenshot branch requested by user: `codex/oanh-feature-evidence-submit-20260403`
- Note: branch `codex/oanh-feature-evidence-submit-20260403` was not present in local `git branch --all`, so the evidence below is mapped from the current local branch.

## 1. View Notifications

Code chinh nam o:

- [mobile-app/src/screens/student/NotificationListScreen.js:94](d:/FPT/Block8/WDP301/Project/V4/WDP391_SE1808_Group02_SSMS/mobile-app/src/screens/student/NotificationListScreen.js:94)
  - Goi API lay danh sach announcement active.
- [mobile-app/src/screens/student/NotificationListScreen.js:120](d:/FPT/Block8/WDP301/Project/V4/WDP391_SE1808_Group02_SSMS/mobile-app/src/screens/student/NotificationListScreen.js:120)
  - Lang nghe realtime de refresh danh sach.

Code lien quan:

- [mobile-app/src/services/announcementService.js:4](d:/FPT/Block8/WDP301/Project/V4/WDP391_SE1808_Group02_SSMS/mobile-app/src/services/announcementService.js:4)
- [backend-api/src/controllers/announcement.controller.js:240](d:/FPT/Block8/WDP301/Project/V4/WDP391_SE1808_Group02_SSMS/backend-api/src/controllers/announcement.controller.js:240)

Commit chinh:

- `ee290983257dbd3a66d0272e74ac417da75dcf81` - `feat: update finance and notification flows`
- Commit backend endpoint goc: `bdc619855fbcd826e8d78a576582400e0de4dfbb` - `huypvq: features of srpint 2`

## 2. View Notification Details

Code chinh nam o:

- [mobile-app/src/screens/student/NotificationDetailScreen.js:62](d:/FPT/Block8/WDP301/Project/V4/WDP391_SE1808_Group02_SSMS/mobile-app/src/screens/student/NotificationDetailScreen.js:62)
  - Load chi tiet thong bao theo `announcementId`.
- [mobile-app/src/screens/student/NotificationDetailScreen.js:49](d:/FPT/Block8/WDP301/Project/V4/WDP391_SE1808_Group02_SSMS/mobile-app/src/screens/student/NotificationDetailScreen.js:49)
  - Mo file dinh kem neu co.

Code lien quan:

- [mobile-app/src/services/announcementService.js:8](d:/FPT/Block8/WDP301/Project/V4/WDP391_SE1808_Group02_SSMS/mobile-app/src/services/announcementService.js:8)
- [backend-api/src/controllers/announcement.controller.js:128](d:/FPT/Block8/WDP301/Project/V4/WDP391_SE1808_Group02_SSMS/backend-api/src/controllers/announcement.controller.js:128)

Commit chinh:

- `ee290983257dbd3a66d0272e74ac417da75dcf81` - `feat: update finance and notification flows`
- Commit backend endpoint goc: `bdc619855fbcd826e8d78a576582400e0de4dfbb` - `huypvq: features of srpint 2`

## 3. View Application Receives New Notification

Code chinh nam o:

- [backend-api/src/controllers/announcement.controller.js:49](d:/FPT/Block8/WDP301/Project/V4/WDP391_SE1808_Group02_SSMS/backend-api/src/controllers/announcement.controller.js:49)
  - Sau khi tao announcement, backend emit `announcement-created` va `notification`.
- [backend-api/src/services/firebasePush.service.js:149](d:/FPT/Block8/WDP301/Project/V4/WDP391_SE1808_Group02_SSMS/backend-api/src/services/firebasePush.service.js:149)
  - Tao payload Firebase push cho mobile.
- [mobile-app/src/screens/student/NotificationListScreen.js:120](d:/FPT/Block8/WDP301/Project/V4/WDP391_SE1808_Group02_SSMS/mobile-app/src/screens/student/NotificationListScreen.js:120)
  - Mobile nhan event realtime va reload danh sach.

Code lien quan:

- [backend-api/src/routes/pushToken.routes.js:9](d:/FPT/Block8/WDP301/Project/V4/WDP391_SE1808_Group02_SSMS/backend-api/src/routes/pushToken.routes.js:9)
- [backend-api/src/controllers/pushToken.controller.js:3](d:/FPT/Block8/WDP301/Project/V4/WDP391_SE1808_Group02_SSMS/backend-api/src/controllers/pushToken.controller.js:3)

Commit chinh:

- `ee290983257dbd3a66d0272e74ac417da75dcf81` - `feat: update finance and notification flows`
- Commit realtime emit lien quan: `20a4b6a190c64ba864288b2b59396ba8b33735ab` - `wip: save local changes before merging main`

## 4. Send Automated Emails

Code chinh nam o:

- [backend-api/src/services/notificationEmail.service.js:23](d:/FPT/Block8/WDP301/Project/V4/WDP391_SE1808_Group02_SSMS/backend-api/src/services/notificationEmail.service.js:23)
  - Check `emailNotificationsEnabled` truoc khi gui mail.
- [backend-api/src/services/notificationEmail.service.js:45](d:/FPT/Block8/WDP301/Project/V4/WDP391_SE1808_Group02_SSMS/backend-api/src/services/notificationEmail.service.js:45)
  - Render template va goi mailer.
- [frontend-web/src/pages/admin/GeneralSettingsPage.jsx:226](d:/FPT/Block8/WDP301/Project/V4/WDP391_SE1808_Group02_SSMS/frontend-web/src/pages/admin/GeneralSettingsPage.jsx:226)
  - Checkbox bat tat email notification trong admin settings.

Code lien quan:

- [backend-api/src/services/notificationEmail.service.js:81](d:/FPT/Block8/WDP301/Project/V4/WDP391_SE1808_Group02_SSMS/backend-api/src/services/notificationEmail.service.js:81)
- [backend-api/src/services/emailTemplate.service.js:162](d:/FPT/Block8/WDP301/Project/V4/WDP391_SE1808_Group02_SSMS/backend-api/src/services/emailTemplate.service.js:162)
- [backend-api/src/external/mailer.js:94](d:/FPT/Block8/WDP301/Project/V4/WDP391_SE1808_Group02_SSMS/backend-api/src/external/mailer.js:94)

Commit chinh:

- `ee290983257dbd3a66d0272e74ac417da75dcf81` - `feat: update finance and notification flows`
- Template email: `6111ac71b00a43a7f0530d58eb327ec21d45012b` - `feat: merge main and complete schedule feedback performance`
- Mailer: `fb6d143ae7f0dd8e4278aa7503ca505df7137985` - `huypvq sprint2`

## 5. Notify Course Registration Opening

Code chinh nam o:

- [backend-api/src/controllers/registrationPeriod.controller.js:191](d:/FPT/Block8/WDP301/Project/V4/WDP391_SE1808_Group02_SSMS/backend-api/src/controllers/registrationPeriod.controller.js:191)
  - Khi doi status RegistrationPeriod, backend emit `registration-period-updated` va `notification`.
- [backend-api/src/services/realtimeNotification.service.js:1](d:/FPT/Block8/WDP301/Project/V4/WDP391_SE1808_Group02_SSMS/backend-api/src/services/realtimeNotification.service.js:1)
  - Build message "dot dang ky da mo".

Code lien quan:

- [frontend-web/src/hooks/useStudentRealtimeNotifications.js:264](d:/FPT/Block8/WDP301/Project/V4/WDP391_SE1808_Group02_SSMS/frontend-web/src/hooks/useStudentRealtimeNotifications.js:264)
- [frontend-web/src/pages/student/ClassRegistrationPage.jsx:160](d:/FPT/Block8/WDP301/Project/V4/WDP391_SE1808_Group02_SSMS/frontend-web/src/pages/student/ClassRegistrationPage.jsx:160)

Commit chinh:

- `20a4b6a190c64ba864288b2b59396ba8b33735ab` - `wip: save local changes before merging main`

## 6. Notify Student Request Status

Code chinh nam o:

- [backend-api/src/controllers/request.controller.js:251](d:/FPT/Block8/WDP301/Project/V4/WDP391_SE1808_Group02_SSMS/backend-api/src/controllers/request.controller.js:251)
  - Sau khi review request, controller emit realtime notification toi dung student.
- [backend-api/src/services/request.service.js:265](d:/FPT/Block8/WDP301/Project/V4/WDP391_SE1808_Group02_SSMS/backend-api/src/services/request.service.js:265)
  - Goi `notificationEmailService.sendRequestStatusEmail(...)`.
- [backend-api/src/services/realtimeNotification.service.js:45](d:/FPT/Block8/WDP301/Project/V4/WDP391_SE1808_Group02_SSMS/backend-api/src/services/realtimeNotification.service.js:45)
  - Build payload `student-request-status-updated`.

Code lien quan:

- [backend-api/src/services/emailTemplate.service.js:162](d:/FPT/Block8/WDP301/Project/V4/WDP391_SE1808_Group02_SSMS/backend-api/src/services/emailTemplate.service.js:162)
- [frontend-web/src/pages/student/StudentRequestsPage.jsx:160](d:/FPT/Block8/WDP301/Project/V4/WDP391_SE1808_Group02_SSMS/frontend-web/src/pages/student/StudentRequestsPage.jsx:160)
- [backend-api/src/services/request.service.js:240](d:/FPT/Block8/WDP301/Project/V4/WDP391_SE1808_Group02_SSMS/backend-api/src/services/request.service.js:240)
  - Day la ham core `reviewRequest`.

Commit chinh:

- `ee290983257dbd3a66d0272e74ac417da75dcf81` - `feat: update finance and notification flows`
- Realtime payload: `20a4b6a190c64ba864288b2b59396ba8b33735ab` - `wip: save local changes before merging main`
- Template email: `6111ac71b00a43a7f0530d58eb327ec21d45012b` - `feat: merge main and complete schedule feedback performance`
- Core request review: `5423407b0bb374037e9bf3c0c160178611da885c` - `feat: add schedule, finance, attendance, request features + merge feedback`

## Output Files

- `notifications-6-functions-evidence-summary.csv`
- `notifications-6-functions-evidence-detail.csv`
- `notifications-6-functions-evidence.md`
