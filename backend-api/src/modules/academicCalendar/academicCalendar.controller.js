const { normalizeRole } = require('../../utils/role.util');
const academicCalendarService = require('./academicCalendar.service');

function parseAuthUserId(req) {
  return req.auth?.sub || req.auth?.id;
}

function isAdminOrStaff(req) {
  const role = normalizeRole(req.auth?.role, '');
  return ['admin', 'staff', 'academic-admin'].includes(role);
}

async function listEvents(req, res) {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const isActive = includeInactive && isAdminOrStaff(req) ? undefined : true;

    const data = await academicCalendarService.listEvents({
      year: req.query.year,
      isActive,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[AcademicCalendarController] listEvents error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to load academic calendar events.',
    });
  }
}

async function createEvent(req, res) {
  try {
    const userId = parseAuthUserId(req);
    const data = await academicCalendarService.createEvent(userId, req.body || {});

    return res.status(201).json({
      success: true,
      message: 'Academic calendar event created successfully.',
      data,
    });
  } catch (error) {
    console.error('[AcademicCalendarController] createEvent error:', error);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Failed to create academic calendar event.',
    });
  }
}

async function updateEvent(req, res) {
  try {
    const userId = parseAuthUserId(req);
    const data = await academicCalendarService.updateEvent(req.params.id, userId, req.body || {});

    return res.status(200).json({
      success: true,
      message: 'Academic calendar event updated successfully.',
      data,
    });
  } catch (error) {
    console.error('[AcademicCalendarController] updateEvent error:', error);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Failed to update academic calendar event.',
    });
  }
}

async function deleteEvent(req, res) {
  try {
    await academicCalendarService.deleteEvent(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Academic calendar event deleted successfully.',
    });
  } catch (error) {
    console.error('[AcademicCalendarController] deleteEvent error:', error);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Failed to delete academic calendar event.',
    });
  }
}

module.exports = {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
};
