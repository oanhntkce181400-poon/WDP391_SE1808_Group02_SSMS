const express = require('express');
const router = express.Router();
const timeslotController = require('../controllers/timeslot.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rbacMiddleware = require('../middlewares/rbac.middleware');

// All routes require authentication
router.use(authMiddleware);

// GET /timeslots - Available to all authenticated users (students, staff)
router.get('/', timeslotController.getTimeslots);

// Protected routes (require Admin/Staff role)
router.use(rbacMiddleware(['admin', 'staff']));

// GET /api/timeslots/:id - Get single timeslot by ID
router.get('/:id', timeslotController.getTimeslot);

// POST /api/timeslots - Create new timeslot
router.post('/', timeslotController.createTimeslot);

// PUT /api/timeslots/:id - Update timeslot
router.put('/:id', timeslotController.updateTimeslot);

// DELETE /api/timeslots/:id - Delete timeslot
router.delete('/:id', timeslotController.deleteTimeslot);

module.exports = router;
