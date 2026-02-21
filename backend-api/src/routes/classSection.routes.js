const express = require('express');
const classController = require('../controllers/classSection.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');

const router = express.Router();

/**
 * Public Routes (require authentication)
 */

// GET /api/classes - Get all class sections
router.get('/', authMiddleware, classController.getAllClassSections);

// GET /api/classes/:classId - Get class section details
router.get('/:classId', authMiddleware, classController.getClassSectionById);

// GET /api/classes/:classId/enrollments - Get class enrollments
router.get('/:classId/enrollments', authMiddleware, classController.getClassEnrollments);

// GET /api/classes/student/:studentId/enrollments - Get student's enrollments
router.get(
  '/student/:studentId/enrollments',
  authMiddleware,
  classController.getStudentEnrollments
);

/**
 * Admin Routes (require authentication + admin/staff role)
 */

// POST /api/classes - Create class section
router.post(
  '/',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  classController.createClassSection
);

// PATCH /api/classes/:classId - Update class section
router.patch(
  '/:classId',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  classController.updateClassSection
);

// DELETE /api/classes/:classId - Delete class section
router.delete(
  '/:classId',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  classController.deleteClassSection
);

// POST /api/classes/enrollment - Enroll student
router.post(
  '/enrollment/create',
  authMiddleware,
  rbacMiddleware(['admin', 'staff']),
  classController.enrollStudentInClass
);

// POST /api/classes/enrollment/:enrollmentId/drop - Drop course
router.post(
  '/enrollment/:enrollmentId/drop',
  authMiddleware,
  classController.dropCourse
);

module.exports = router;
