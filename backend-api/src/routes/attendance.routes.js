const express = require('express');
const attendanceController = require('../controllers/attendance.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');

const router = express.Router();

router.get(
  '/classes',
  authMiddleware,
  rbacMiddleware(['lecturer']),
  attendanceController.getClasses,
);

router.get(
  '/classes/:classId/valid-attendance-dates',
  authMiddleware,
  rbacMiddleware(['lecturer']),
  attendanceController.getValidAttendanceDates,
);

router.get(
  '/classes/:classId/slots',
  authMiddleware,
  rbacMiddleware(['lecturer']),
  attendanceController.getClassSlots,
);

router.get(
  '/classes/:classId/slots/:slotId',
  authMiddleware,
  rbacMiddleware(['lecturer']),
  attendanceController.getSlotAttendance,
);

router.post(
  '/bulk',
  authMiddleware,
  rbacMiddleware(['lecturer']),
  attendanceController.bulkSave,
);

// UC101 - canonical endpoint
router.post(
  '/mark',
  authMiddleware,
  rbacMiddleware(['lecturer']),
  attendanceController.bulkSave,
);

router.get(
  '/my-attendance',
  authMiddleware,
  rbacMiddleware(['student']),
  attendanceController.getMyAttendance,
);

module.exports = router;
