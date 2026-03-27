const mongoose = require("mongoose");
const EnrollmentSnapshot = require("../../models/enrollmentSnapshot.model");
const Student = require("../../models/student.model");
const Attendance = require("../../models/attendance.model");

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
          "title description semesterId curriculumId semesterSnapshot curriculumCode curriculumSemester dryRun summary filters createdAt updatedAt",
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
      filters: result.filters || {},
      dryRun: result.dryRun === true,
      durationMs: result.durationMs,
      summary: result.summary,
      preflight: result.preflight,
      logs: Array.isArray(result.logs) ? result.logs : [],
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

    const classSections = [...map.values()].sort((a, b) =>
      (a.classCode || "").localeCompare(b.classCode || ""),
    );

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
};
