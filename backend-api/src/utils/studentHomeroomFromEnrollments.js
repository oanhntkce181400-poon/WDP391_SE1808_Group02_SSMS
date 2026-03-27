/**
 * Lớp SH / nhóm hành chính suy từ ClassEnrollment (enrolled) + ClassSection.classGroup.
 * Dùng chung cho danh sách sinh viên và filter auto-enrollment để không lệch với trường
 * Student.classSection (legacy) khi đã có xếp lớp HP.
 */

const mongoose = require('mongoose');
const ClassEnrollment = require('../models/classEnrollment.model');

const ENROLLED_STATUS = 'enrolled';

/**
 * @param {import('mongoose').Types.ObjectId[]} studentIds
 * @returns {Promise<Map<string, string[]>>} studentId -> mỗi lần enrollment có classGroup khác rỗng (lặp lại để đếm mode)
 */
async function getNonEmptyClassGroupsListsByStudentIds(studentIds = []) {
  const oids = studentIds
    .map((id) =>
      id && mongoose.Types.ObjectId.isValid(String(id))
        ? new mongoose.Types.ObjectId(String(id))
        : null,
    )
    .filter(Boolean);

  const map = new Map();
  if (oids.length === 0) return map;

  const enrollments = await ClassEnrollment.find({
    student: { $in: oids },
    status: ENROLLED_STATUS,
  })
    .select('student classSection')
    .populate({ path: 'classSection', select: 'classGroup' })
    .lean();

  for (const en of enrollments) {
    const sid = String(en.student);
    const raw = en.classSection?.classGroup;
    const g = raw != null && String(raw).trim() !== '' ? String(raw).trim() : '';
    if (!g) continue;
    if (!map.has(sid)) map.set(sid, []);
    map.get(sid).push(g);
  }

  return map;
}

/**
 * Một nhãn Lớp SH để hiển thị: ưu tiên trùng Student.classSection nếu nằm trong các nhóm enrollment;
 * không thì lấy classGroup xuất hiện nhiều nhất; hòa thì chuỗi nhỏ nhất (sort).
 * Không có nhóm từ enrollment → trả về classSection lưu trên SV (legacy) hoặc rỗng.
 */
function canonicalHomeroomLabel(groups, storedClassSection) {
  const list = Array.isArray(groups) ? groups : [];
  const sc =
    storedClassSection != null && String(storedClassSection).trim() !== ''
      ? String(storedClassSection).trim()
      : '';

  const trimmed = list
    .map((x) => String(x).trim())
    .filter(Boolean);
  if (trimmed.length === 0) {
    return sc;
  }

  if (sc && trimmed.includes(sc)) {
    return sc;
  }

  const counts = {};
  for (const g of trimmed) {
    counts[g] = (counts[g] || 0) + 1;
  }
  const max = Math.max(...Object.values(counts));
  const candidates = Object.keys(counts).filter((k) => counts[k] === max);
  return candidates.sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  )[0];
}

/**
 * Filter nhóm lớp (auto-enrollment): khớp enrollment có classGroup = g, hoặc legacy Student.classSection = g,
 * hoặc "chưa có nhóm từ lớp HP" (không enrollment nào có classGroup) và classSection trên SV để trống.
 */
function studentMatchesClassGroupFilter(groups, storedClassSection, g) {
  const target = String(g || '').trim();
  if (!target) return true;

  const list = Array.isArray(groups) ? groups : [];
  const trimmed = list
    .map((x) => String(x).trim())
    .filter(Boolean);

  const sc =
    storedClassSection != null && String(storedClassSection).trim() !== ''
      ? String(storedClassSection).trim()
      : '';

  if (trimmed.includes(target) || sc === target) {
    return true;
  }

  if (trimmed.length > 0) {
    return false;
  }

  return !sc;
}

module.exports = {
  ENROLLED_STATUS,
  getNonEmptyClassGroupsListsByStudentIds,
  canonicalHomeroomLabel,
  studentMatchesClassGroupFilter,
};
