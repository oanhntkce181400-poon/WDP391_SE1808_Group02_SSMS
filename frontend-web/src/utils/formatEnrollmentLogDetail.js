/**
 * Chuỗi hiển thị cột Detail trong bảng log auto enrollment / snapshot.
 * Ưu tiên: lỗi → chờ → bỏ qua → toàn bộ mã môn đã enroll.
 */
export function formatEnrollmentLogDetail(row) {
  if (!row || typeof row !== "object") return "-";

  const errs = (row.errors || []).filter(Boolean);
  if (errs.length) return errs.join("; ");

  const wl = row.waitlisted || [];
  if (wl.length) {
    const msgs = wl.map((w) => w?.message).filter(Boolean);
    if (msgs.length) return msgs.join("; ");
    const codes = wl.map((w) => w?.subjectCode).filter(Boolean);
    if (codes.length) return codes.join(", ");
  }

  const skipped = (row.skipped || []).filter(Boolean);
  if (skipped.length) return skipped.join("; ");

  const codes = (row.enrolled || []).map((e) => e?.subjectCode).filter(Boolean);
  if (codes.length) return codes.join(", ");

  return "-";
}

/** Gom tất cả mã học phần đã enroll trong logs (unique, sắp xếp). */
export function collectUniqueEnrolledSubjectCodes(logs) {
  const set = new Set();
  for (const row of logs || []) {
    for (const e of row?.enrolled || []) {
      if (e?.subjectCode) set.add(String(e.subjectCode).trim());
    }
  }
  return [...set].sort();
}
