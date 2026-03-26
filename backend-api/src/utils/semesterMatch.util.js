function normalizeAcademicYearKey(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/\//g, '-');
}

function yearBoundsFromAcademicYearString(value) {
  const parts = normalizeAcademicYearKey(value)
    .split('-')
    .map((part) => parseInt(part, 10))
    .filter((part) => !Number.isNaN(part));

  if (parts.length < 2) return null;

  return {
    startYear: Math.min(parts[0], parts[1]),
    endYear: Math.max(parts[0], parts[1]),
  };
}

function academicYearsCompatible(left, right) {
  const normalizedLeft = normalizeAcademicYearKey(left);
  const normalizedRight = normalizeAcademicYearKey(right);

  if (!normalizedLeft || !normalizedRight) return false;
  if (normalizedLeft === normalizedRight) return true;

  const leftBounds = yearBoundsFromAcademicYearString(normalizedLeft);
  const rightBounds = yearBoundsFromAcademicYearString(normalizedRight);
  if (!leftBounds || !rightBounds) return false;

  return !(
    rightBounds.endYear < leftBounds.startYear ||
    rightBounds.startYear > leftBounds.endYear
  );
}

function normalizeDateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.getTime();
}

function buildClosedDateRange(startDate, endDate) {
  const normalizedStart = normalizeDateValue(startDate);
  const normalizedEnd = normalizeDateValue(endDate);
  if (normalizedStart == null && normalizedEnd == null) return null;

  const start = normalizedStart ?? normalizedEnd;
  const end = normalizedEnd ?? normalizedStart;
  return {
    start: Math.min(start, end),
    end: Math.max(start, end),
  };
}

function isDateRangeOverlapped(startA, endA, startB, endB) {
  const left = buildClosedDateRange(startA, endA);
  const right = buildClosedDateRange(startB, endB);
  if (!left || !right) return false;

  return !(left.end < right.start || right.end < left.start);
}

function classMatchesSemesterContext(classSection, semesterContext) {
  if (!classSection || !semesterContext) return true;

  const semesterNum = Number(semesterContext.semesterNum);
  if (Number.isFinite(semesterNum) && Number(classSection.semester) !== semesterNum) {
    return false;
  }

  const targetAcademicYear = normalizeAcademicYearKey(semesterContext.academicYear);
  if (!targetAcademicYear) return true;

  if (academicYearsCompatible(classSection.academicYear, targetAcademicYear)) {
    return true;
  }

  return isDateRangeOverlapped(
    classSection.startDate,
    classSection.endDate,
    semesterContext.startDate,
    semesterContext.endDate,
  );
}

function filterClassesBySemesterContext(classes, semesterContext) {
  if (!Array.isArray(classes) || !semesterContext) return Array.isArray(classes) ? classes : [];
  return classes.filter((classSection) => classMatchesSemesterContext(classSection, semesterContext));
}

module.exports = {
  academicYearsCompatible,
  classMatchesSemesterContext,
  filterClassesBySemesterContext,
  isDateRangeOverlapped,
  normalizeAcademicYearKey,
  yearBoundsFromAcademicYearString,
};
