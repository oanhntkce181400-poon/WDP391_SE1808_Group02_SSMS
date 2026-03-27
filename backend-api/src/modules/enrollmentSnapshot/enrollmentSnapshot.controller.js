const mongoose = require("mongoose");
const EnrollmentSnapshot = require("../../models/enrollmentSnapshot.model");
const Student = require("../../models/student.model");
const Attendance = require("../../models/attendance.model");
const ClassSection = require("../../models/classSection.model");
const Semester = require("../../models/semester.model");

function getUserId(req) {
  return req.auth?.sub || req.auth?.id || null;
}

/**
 * Bản snapshot cũ có thể thiếu email trong logs; fullName có thể chỉ là placeholder.
 * Khi xem chi tiết, bổ sung từ Student (và User liên kết) theo studentId.
 */
async function enrichSnapshotLogs(logs) {
  if (!Array.isArray(logs) || logs.length === 0) return logs;

  const idStrings = new Set();
  for (const row of logs) {
    const sid = row?.studentId;
    if (sid != null && mongoose.Types.ObjectId.isValid(String(sid))) {
      idStrings.add(String(sid));
    }
  }
  if (idStrings.size === 0) return logs;

  const objectIds = [...idStrings].map((id) => new mongoose.Types.ObjectId(id));
  const students = await Student.find({ _id: { $in: objectIds } })
    .select("fullName email studentCode userId")
    .populate("userId", "fullName email")
    .lean();

  const byId = Object.fromEntries(students.map((s) => [String(s._id), s]));

  return logs.map((row) => {
    const sid = row?.studentId != null ? String(row.studentId) : "";
    const s = sid ? byId[sid] : null;
    if (!s) return row;

    const u = s.userId && typeof s.userId === "object" ? s.userId : null;
    const nameFromUser = u?.fullName?.trim();
    const nameFromStudent = s.fullName?.trim();
    const fullName =
      nameFromUser || nameFromStudent || row.fullName || "";

    const emailFromLog = row.email != null ? String(row.email).trim() : "";
    const emailFromStudent = s.email != null ? String(s.email).trim() : "";
    const emailFromUser = u?.email != null ? String(u.email).trim() : "";
    const email = emailFromLog || emailFromStudent || emailFromUser || "";

    return {
      ...row,
      fullName,
      email,
      studentCode: s.studentCode || row.studentCode,
    };
  });
}

/**
 * Bổ sung classGroup / className / maxCapacity từ ClassSection vào từng mục enrolled trong logs.
 */
async function enrichEnrollmentLogsWithClassSections(logs) {
  if (!Array.isArray(logs) || logs.length === 0) return logs;
  const ids = new Set();
  for (const row of logs) {
    for (const e of row.enrolled || []) {
      const id = e?.classSectionId;
      if (id != null && mongoose.Types.ObjectId.isValid(String(id))) {
        ids.add(String(id));
      }
    }
  }
  if (ids.size === 0) return logs;

  const oidList = [...ids].map((i) => new mongoose.Types.ObjectId(i));
  const sections = await ClassSection.find({ _id: { $in: oidList } })
    .select("classCode className classGroup maxCapacity currentEnrollment")
    .lean();
  const byId = Object.fromEntries(sections.map((d) => [String(d._id), d]));

  return logs.map((row) => ({
    ...row,
    enrolled: (row.enrolled || []).map((e) => {
      const cs = byId[String(e.classSectionId)];
      if (!cs) return { ...e };
      return {
        ...e,
        classGroup: e.classGroup || cs.classGroup || "",
        className: e.className || cs.className || "",
        maxCapacity:
          e.maxCapacity != null ? e.maxCapacity : cs.maxCapacity,
      };
    }),
  }));
}

/**
 * Đặt maxCapacity cho mọi ClassSection cùng classGroup và HK hệ thống (semester + academicYear).
 * Không giảm maxCapacity dưới currentEnrollment.
 */
async function syncMaxCapacityForClassGroup({
  semesterId,
  classGroup,
  targetCapacity,
}) {
  const g = String(classGroup || "").trim();
  if (!g || !mongoose.Types.ObjectId.isValid(String(semesterId))) {
    return { updated: 0, matched: 0 };
  }
  const cap = Math.floor(Number(targetCapacity));
  if (!Number.isFinite(cap) || cap < 1) {
    return { updated: 0, matched: 0 };
  }

  const sem = await Semester.findById(semesterId).lean();
  if (!sem) return { updated: 0, matched: 0 };

  const sections = await ClassSection.find({
    classGroup: g,
    semester: sem.semesterNum,
    academicYear: String(sem.academicYear || "").trim(),
  })
    .select("_id maxCapacity currentEnrollment")
    .lean();

  let updated = 0;
  for (const sec of sections) {
    const enrolled = Number(sec.currentEnrollment) || 0;
    const newMax = Math.max(cap, enrolled, 1);
    if (Number(sec.maxCapacity) !== newMax) {
      await ClassSection.updateOne(
        { _id: sec._id },
        { $set: { maxCapacity: newMax } },
      );
      updated += 1;
    }
  }
  return { updated, matched: sections.length };
}

async function list(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 20),
    );
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      EnrollmentSnapshot.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select(
          "title description semesterId curriculumId semesterSnapshot curriculumCode curriculumSemester dryRun summary filters classGroup studentLimit maxCapacityAppliedToClassSections createdAt updatedAt",
        )
        .lean(),
      EnrollmentSnapshot.countDocuments(),
    ]);

    return res.json({
      success: true,
      data: items,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getById(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }
    const doc = await EnrollmentSnapshot.findById(id).lean();
    if (!doc) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    if (Array.isArray(doc.logs) && doc.logs.length > 0) {
      doc.logs = await enrichSnapshotLogs(doc.logs);
    }
    return res.json({ success: true, data: doc });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function create(req, res) {
  try {
    const {
      title,
      description,
      semesterId,
      curriculumId,
      curriculumCode,
      result,
      /** Nếu true: cập nhật maxCapacity trên mọi ClassSection cùng classGroup + HK (theo student limit) */
      applyMaxCapacityToClassSections,
    } = req.body || {};
    if (!title || !String(title).trim()) {
      return res
        .status(400)
        .json({ success: false, message: "title is required" });
    }
    if (!semesterId || !mongoose.Types.ObjectId.isValid(String(semesterId))) {
      return res
        .status(400)
        .json({ success: false, message: "semesterId is required" });
    }
    if (!result || typeof result !== "object") {
      return res.status(400).json({
        success: false,
        message: "result (snapshot payload) is required",
      });
    }

    let curriculumOid = null;
    if (curriculumId != null && String(curriculumId).trim() !== "") {
      const cid = String(curriculumId).trim();
      if (!mongoose.Types.ObjectId.isValid(cid)) {
        return res
          .status(400)
          .json({ success: false, message: "curriculumId không hợp lệ" });
      }
      curriculumOid = cid;
    }

    const userId = getUserId(req);

    const filters = result.filters && typeof result.filters === "object" ? result.filters : {};
    const classGroupRaw = filters.classGroup != null ? String(filters.classGroup).trim() : "";
    const classGroup = classGroupRaw || null;

    let studentLimit = null;
    if (filters.limit != null && filters.limit !== "") {
      const n = Number(filters.limit);
      if (Number.isFinite(n) && n >= 1) studentLimit = Math.floor(n);
    }

    let logs = Array.isArray(result.logs) ? [...result.logs] : [];
    logs = await enrichEnrollmentLogsWithClassSections(logs);

    let resolvedClassGroup = classGroup;
    if (!resolvedClassGroup) {
      for (const row of logs) {
        for (const e of row.enrolled || []) {
          const cg = String(e.classGroup || "").trim();
          if (cg) {
            resolvedClassGroup = cg;
            break;
          }
        }
        if (resolvedClassGroup) break;
      }
    }

    let maxCapacityAppliedToClassSections = false;
    const shouldSync =
      applyMaxCapacityToClassSections === true &&
      resolvedClassGroup &&
      studentLimit != null &&
      result.dryRun !== true;

    if (shouldSync) {
      const syncResult = await syncMaxCapacityForClassGroup({
        semesterId,
        classGroup: resolvedClassGroup,
        targetCapacity: studentLimit,
      });
      maxCapacityAppliedToClassSections = syncResult.matched > 0;
      logs = await enrichEnrollmentLogsWithClassSections(logs);
    }

    const doc = await EnrollmentSnapshot.create({
      title: String(title).trim(),
      description: description != null ? String(description).trim() : "",
      semesterId,
      curriculumId: curriculumOid,
      curriculumCode:
        curriculumCode != null ? String(curriculumCode).trim() : "",
      curriculumSemester:
        result.curriculumSemester != null
          ? Number(result.curriculumSemester)
          : null,
      semesterSnapshot: result.semester || {},
      filters,
      classGroup: resolvedClassGroup,
      studentLimit,
      maxCapacityAppliedToClassSections,
      dryRun: result.dryRun === true,
      durationMs: result.durationMs,
      summary: result.summary,
      preflight: result.preflight,
      logs,
      createdBy:
        userId && mongoose.Types.ObjectId.isValid(String(userId))
          ? userId
          : null,
    });

    return res.status(201).json({ success: true, data: doc });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }
    const { title, description, logs } = req.body || {};
    const patch = {};
    if (title != null) {
      const t = String(title).trim();
      if (!t) {
        return res
          .status(400)
          .json({ success: false, message: "title cannot be empty" });
      }
      patch.title = t;
    }
    if (description != null) patch.description = String(description).trim();
    if (Array.isArray(logs)) patch.logs = logs;

    if (Object.keys(patch).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No valid fields to update" });
    }

    const doc = await EnrollmentSnapshot.findByIdAndUpdate(
      id,
      { $set: patch },
      { new: true },
    ).lean();
    if (!doc) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    return res.json({ success: true, data: doc });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }
    const deleted = await EnrollmentSnapshot.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    return res.json({ success: true, message: "Deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Thêm sinh viên vào snapshot: tìm tất cả classSection trong logs,
 * enroll SV vào từng classSection, rồi cập nhật logs + summary.
 * body: { studentCodes: string[] }
 */
async function addStudentsToSnapshot(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid snapshot id" });
    }

    const { studentCodes } = req.body || {};
    if (!Array.isArray(studentCodes) || studentCodes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "studentCodes (array) is required",
      });
    }

    const doc = await EnrollmentSnapshot.findById(id).lean();
    if (!doc) {
      return res.status(404).json({ success: false, message: "Snapshot not found" });
    }

    if (doc.dryRun) {
      return res.status(400).json({
        success: false,
        message: "Không thể thêm sinh viên vào bản snapshot Dry run",
      });
    }

    // 1. Collect unique classSections from logs
    const classSectionMap = new Map();
    for (const row of doc.logs || []) {
      for (const e of row.enrolled || []) {
        const csId = String(e.classSectionId || "");
        if (!csId) continue;
        if (!classSectionMap.has(csId)) {
          classSectionMap.set(csId, {
            classSectionId: csId,
            classCode: e.classCode || "",
            subjectCode: e.subjectCode || "",
            subjectName: e.subjectName || "",
            className: e.className || e.classCode || "",
          });
        }
      }
    }

    const classSections = [...classSectionMap.values()];
    if (classSections.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Snapshot không chứa classSection nào trong logs",
      });
    }

    // 2. Resolve student codes to documents
    const normalizedCodes = studentCodes.map((c) => String(c).trim().toUpperCase());
    const students = await Student.find({
      studentCode: { $in: normalizedCodes },
    })
      .select("_id fullName email studentCode")
      .lean();

    const notFound = normalizedCodes.filter(
      (code) => !students.find((s) => s.studentCode?.toUpperCase() === code),
    );

    // Load models lazily to avoid circular deps
    // eslint-disable-next-line global-require
    const ClassSection = require("../../models/classSection.model");
    // eslint-disable-next-line global-require
    const ClassEnrollment = require("../../models/classEnrollment.model");
    // eslint-disable-next-line global-require
    const Waitlist = require("../../models/waitlist.model");

    const newLogs = [];
    let totalEnrollments = 0;
    let totalWaitlisted = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const student of students) {
      const studentIdStr = String(student._id);
      const existingLog = (doc.logs || []).find(
        (l) => String(l.studentId) === studentIdStr,
      );

      const enrolled = existingLog ? [...(existingLog.enrolled || [])] : [];
      const waitlisted = existingLog ? [...(existingLog.waitlisted || [])] : [];
      const skipped = existingLog ? [...(existingLog.skipped || [])] : [];
      const errors = existingLog ? [...(existingLog.errors || [])] : [];

      for (const cs of classSections) {
        const csId = cs.classSectionId;

        // Skip if already enrolled in this classSection (check from existing log)
        if (enrolled.some((e) => String(e.classSectionId) === csId)) {
          skipped.push({
            classSectionId: csId,
            classCode: cs.classCode,
            subjectCode: cs.subjectCode,
            reason: "Đã đăng ký trước đó",
          });
          totalSkipped += 1;
          continue;
        }

        try {
          const csDoc = await ClassSection.findById(csId).lean();
          if (!csDoc) {
            errors.push({
              classSectionId: csId,
              classCode: cs.classCode,
              reason: "ClassSection không tồn tại trong DB",
            });
            totalErrors += 1;
            continue;
          }

          if (csDoc.currentEnrollment >= csDoc.maxCapacity) {
            skipped.push({
              classSectionId: csId,
              classCode: cs.classCode,
              subjectCode: cs.subjectCode,
              reason: "Lớp đã đầy",
            });
            totalSkipped += 1;
            continue;
          }

          const existingEnrollment = await ClassEnrollment.findOne({
            classSection: csId,
            student: studentIdStr,
          }).lean();

          if (existingEnrollment) {
            skipped.push({
              classSectionId: csId,
              classCode: cs.classCode,
              subjectCode: cs.subjectCode,
              reason: "Đã có enrollment thực tế trong DB",
            });
            totalSkipped += 1;
            continue;
          }

          // Check waitlist
          const waitlistEntry = await Waitlist.findOne({
            student: studentIdStr,
            subject: csDoc.subject,
            targetSemester: csDoc.semester,
            targetAcademicYear: csDoc.academicYear,
            status: "WAITING",
          }).lean();

          if (waitlistEntry) {
            waitlisted.push({
              classSectionId: csId,
              classCode: cs.classCode,
              subjectCode: cs.subjectCode,
              reason: "Đang trong danh sách chờ",
            });
            totalWaitlisted += 1;
            continue;
          }

          // Enroll
          await ClassEnrollment.create({
            classSection: csId,
            student: studentIdStr,
            status: "enrolled",
            isOverload: false,
          });
          await ClassSection.findByIdAndUpdate(csId, {
            $inc: { currentEnrollment: 1 },
          });

          enrolled.push({
            classSectionId: csId,
            classCode: cs.classCode,
            subjectCode: cs.subjectCode,
            subjectName: cs.subjectName,
            className: cs.className || csDoc.className,
            classGroup: csDoc.classGroup || "",
            maxCapacity: csDoc.maxCapacity,
            enrolledAt: new Date().toISOString(),
            source: "manual-add-to-snapshot",
          });
          totalEnrollments += 1;
        } catch (err) {
          errors.push({
            classSectionId: csId,
            classCode: cs.classCode,
            subjectCode: cs.subjectCode,
            reason: err.message,
          });
          totalErrors += 1;
        }
      }

      newLogs.push({
        studentId: studentIdStr,
        studentCode: student.studentCode,
        fullName: student.fullName,
        email: student.email,
        enrolled,
        waitlisted,
        skipped,
        errors,
        addedAt: new Date().toISOString(),
      });
    }

    // 3. Build updated summary
    const originalSummary = doc.summary || {};
    const updatedSummary = {
      ...originalSummary,
      totalStudents: (originalSummary.totalStudents || 0) + students.length,
      totalEnrollments: (originalSummary.totalEnrollments || 0) + totalEnrollments,
      waitlisted: (originalSummary.waitlisted || 0) + totalWaitlisted,
      duplicates: (originalSummary.duplicates || 0) + totalSkipped,
      failed: (originalSummary.failed || 0) + totalErrors,
    };

    // 4. Update snapshot
    const timestamp = new Date().toLocaleString("vi-VN");
    await EnrollmentSnapshot.findByIdAndUpdate(id, {
      $push: { logs: { $each: newLogs } },
      $set: {
        summary: updatedSummary,
        description:
          (doc.description || "")
          + `\n[${timestamp}] Thêm ${students.length} SV (${normalizedCodes.join(", ")}): `
          + `${totalEnrollments} enroll, ${totalSkipped} skip, ${totalErrors} lỗi.`,
      },
    });

    return res.json({
      success: true,
      data: {
        studentsFound: students.length,
        studentsNotFound: notFound,
        summary: updatedSummary,
        classSectionsCount: classSections.length,
        details: newLogs.map((l) => ({
          studentCode: l.studentCode,
          fullName: l.fullName,
          enrolled: l.enrolled.length,
          skipped: l.skipped.length,
          errors: l.errors.length,
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Trả về danh sách classSection duy nhất xuất hiện trong snapshot cùng sĩ số.
 * Dùng cho điểm danh: giáo viên chọn lớp từ snapshot → lấy roster từ logs.
 */
async function getClassSections(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid snapshot id" });
    }
    const doc = await EnrollmentSnapshot.findById(id)
      .select("logs")
      .lean();
    if (!doc) {
      return res.status(404).json({ success: false, message: "Snapshot not found" });
    }

    // Gom nhóm: classSectionId → { classSectionId, classCode, subjectCode, subjectName, studentCount }
    const map = new Map();
    for (const row of doc.logs || []) {
      const sid = String(row.studentId || "");
      if (!sid) continue;
      for (const e of row.enrolled || []) {
        const csId = String(e.classSectionId || "");
        if (!csId) continue;
        if (!map.has(csId)) {
          map.set(csId, {
            classSectionId: csId,
            classCode: e.classCode || "",
            subjectCode: e.subjectCode || "",
            subjectName: e.subjectName || "",
            studentCount: 0,
          });
        }
        map.get(csId).studentCount += 1;
      }
    }

    let classSections = [...map.values()].sort((a, b) =>
      (a.classCode || "").localeCompare(b.classCode || ""),
    );

    const csIds = classSections
      .map((x) => x.classSectionId)
      .filter((id) => mongoose.Types.ObjectId.isValid(String(id)));
    if (csIds.length > 0) {
      const oids = csIds.map((id) => new mongoose.Types.ObjectId(String(id)));
      const dbSecs = await ClassSection.find({ _id: { $in: oids } })
        .select("classGroup maxCapacity currentEnrollment className")
        .lean();
      const dbById = Object.fromEntries(dbSecs.map((d) => [String(d._id), d]));
      classSections = classSections.map((row) => {
        const db = dbById[String(row.classSectionId)];
        if (!db) return row;
        return {
          ...row,
          classGroup: row.classGroup || db.classGroup || "",
          className: row.className || db.className || "",
          maxCapacity: db.maxCapacity,
          currentEnrollment: db.currentEnrollment,
        };
      });
    }

    return res.json({ success: true, data: classSections });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Trả về danh sách sinh viên đã được xếp vào classSection cụ thể trong snapshot.
 * Kết hợp dữ liệu từ logs + bổ sung thông tin sinh viên từ DB.
 * Nếu có slotId, trả về thêm trạng thái điểm danh đã lưu.
 */
async function getRoster(req, res) {
  try {
    const { id } = req.params;
    const { classSectionId, slotId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid snapshot id" });
    }
    if (!classSectionId) {
      return res.status(400).json({ success: false, message: "classSectionId is required" });
    }
    const csId = String(classSectionId);

    const doc = await EnrollmentSnapshot.findById(id)
      .select("logs")
      .lean();
    if (!doc) {
      return res.status(404).json({ success: false, message: "Snapshot not found" });
    }

    // Tách studentId để enrich
    const studentIds = [];
    const studentMap = new Map(); // studentId → logRow
    for (const row of doc.logs || []) {
      const sid = String(row.studentId || "");
      if (!sid) continue;
      for (const e of row.enrolled || []) {
        if (String(e.classSectionId || "") === csId) {
          if (!studentMap.has(sid)) {
            studentIds.push(sid);
            studentMap.set(sid, row);
          }
        }
      }
    }

    if (studentIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Enrich từ Student collection
    const objectIds = studentIds.map((sid) => new mongoose.Types.ObjectId(sid));
    const students = await Student.find({ _id: { $in: objectIds } })
      .select("fullName email studentCode userId")
      .populate("userId", "fullName email")
      .lean();
    const byId = Object.fromEntries(students.map((s) => [String(s._id), s]));

    // Nếu có slotId, lấy điểm danh đã lưu
    let attendanceMap = new Map();
    if (slotId && mongoose.Types.ObjectId.isValid(csId)) {
      const existing = await Attendance.find({
        classSection: new mongoose.Types.ObjectId(csId),
        slotId: String(slotId),
      }).lean();
      existing.forEach((r) => attendanceMap.set(String(r.student), r));
    }

    const roster = studentIds.map((sid) => {
      const logRow = studentMap.get(sid);
      const s = byId[sid];
      const u = s?.userId && typeof s.userId === "object" ? s.userId : null;
      const fullName =
        u?.fullName?.trim() || s?.fullName?.trim() || logRow?.fullName || "";
      const email =
        logRow?.email ||
        s?.email ||
        u?.email ||
        "";
      const studentCode = s?.studentCode || logRow?.studentCode || "";
      const attendance = attendanceMap.get(sid) || null;

      return {
        studentId: sid,
        studentCode,
        fullName,
        email,
        status: attendance?.status === 'Late' ? 'Present' : (attendance?.status || 'Absent'),
        note: attendance?.note || "",
        absenceWarning: attendance?.absenceWarning || false,
      };
    });

    return res.json({ success: true, data: roster });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  list,
  getById,
  getClassSections,
  getRoster,
  create,
  update,
  remove,
  addStudentsToSnapshot,
};
