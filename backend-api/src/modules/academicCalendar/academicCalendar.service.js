const AcademicCalendar = require('../../models/academicCalendar.model');

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeYear(year) {
  const numericYear = Number(year || new Date().getFullYear());
  if (!Number.isInteger(numericYear) || numericYear < 2000 || numericYear > 2100) {
    throw createError('Year is invalid. Expected value from 2000 to 2100.');
  }
  return numericYear;
}

function parseDate(value, fieldName) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw createError(`${fieldName} is not a valid date.`);
  }
  return date;
}

function ensureDateRangeWithinYear(year, startDate, endDate) {
  const startYear = startDate.getUTCFullYear();
  const endYear = endDate.getUTCFullYear();
  if (startYear !== year || endYear !== year) {
    throw createError('startDate and endDate must be within the selected year.');
  }

  if (endDate.getTime() < startDate.getTime()) {
    throw createError('endDate must be greater than or equal to startDate.');
  }
}

function normalizeColor(color) {
  const fallback = '#f97316';
  if (!color) return fallback;
  const value = String(color).trim();
  if (!/^#([0-9A-Fa-f]{6})$/.test(value)) {
    throw createError('Color must be in hex format like #f97316.');
  }
  return value;
}

async function createEvent(adminUserId, payload = {}) {
  const name = String(payload.name || '').trim();
  if (!name) {
    throw createError('name is required.');
  }

  const startDate = parseDate(payload.startDate, 'startDate');
  const endDate = parseDate(payload.endDate, 'endDate');
  const year = normalizeYear(payload.year || startDate.getUTCFullYear());

  ensureDateRangeWithinYear(year, startDate, endDate);

  const doc = await AcademicCalendar.create({
    name,
    description: String(payload.description || '').trim(),
    holidayType: payload.holidayType || 'holiday',
    year,
    startDate,
    endDate,
    color: normalizeColor(payload.color),
    isActive: payload.isActive !== false,
    createdBy: adminUserId,
    updatedBy: adminUserId,
  });

  return doc.toObject();
}

async function listEvents(params = {}) {
  const year = normalizeYear(params.year);
  const query = { year };

  if (typeof params.isActive === 'boolean') {
    query.isActive = params.isActive;
  }

  return AcademicCalendar.find(query)
    .sort({ startDate: 1, createdAt: 1 })
    .lean();
}

async function updateEvent(eventId, adminUserId, payload = {}) {
  const event = await AcademicCalendar.findById(eventId);
  if (!event) {
    throw createError('Academic calendar event not found.', 404);
  }

  const nextYear = payload.year !== undefined ? normalizeYear(payload.year) : event.year;
  const nextStartDate = payload.startDate ? parseDate(payload.startDate, 'startDate') : event.startDate;
  const nextEndDate = payload.endDate ? parseDate(payload.endDate, 'endDate') : event.endDate;

  ensureDateRangeWithinYear(nextYear, nextStartDate, nextEndDate);

  if (payload.name !== undefined) {
    const name = String(payload.name || '').trim();
    if (!name) {
      throw createError('name cannot be empty.');
    }
    event.name = name;
  }

  if (payload.description !== undefined) {
    event.description = String(payload.description || '').trim();
  }

  if (payload.holidayType !== undefined) {
    event.holidayType = payload.holidayType;
  }

  event.year = nextYear;
  event.startDate = nextStartDate;
  event.endDate = nextEndDate;

  if (payload.color !== undefined) {
    event.color = normalizeColor(payload.color);
  }

  if (payload.isActive !== undefined) {
    event.isActive = Boolean(payload.isActive);
  }

  event.updatedBy = adminUserId;

  await event.save();
  return event.toObject();
}

async function deleteEvent(eventId) {
  const deleted = await AcademicCalendar.findByIdAndDelete(eventId).lean();
  if (!deleted) {
    throw createError('Academic calendar event not found.', 404);
  }
  return deleted;
}

module.exports = {
  createEvent,
  listEvents,
  updateEvent,
  deleteEvent,
};
