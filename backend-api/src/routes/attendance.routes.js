const express = require('express');
const attendanceController = require('../controllers/attendance.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');

const router = express.Router();

router.get(
  '/classes',
  authMiddleware,
  rbacMiddleware(['lecturer', 'admin', 'staff']),
  attendanceController.getClasses,
);

router.get(
  '/classes/:classId/slots',
  authMiddleware,
  rbacMiddleware(['lecturer', 'admin', 'staff']),
  attendanceController.getClassSlots,
);

router.get(
  '/classes/:classId/slots/:slotId',
  authMiddleware,
  rbacMiddleware(['lecturer', 'admin', 'staff']),
  attendanceController.getSlotAttendance,
);

router.post(
  '/bulk',
  authMiddleware,
  rbacMiddleware(['lecturer', 'admin', 'staff']),
  attendanceController.bulkSave,
);

// UC101 - canonical endpoint
router.post(
  '/mark',
  authMiddleware,
  rbacMiddleware(['lecturer', 'admin', 'staff']),
  attendanceController.bulkSave,
);

module.exports = router;
