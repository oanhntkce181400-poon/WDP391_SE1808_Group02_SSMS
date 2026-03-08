const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const repo = require("./lecturer.repository");
const { uploadImage } = require("../../external/cloudinary.provider");

const DEFAULT_PASSWORD = "Teacher@123";

function formatLecturer(doc) {
  return {
    _id: doc._id,
    teacherCode: doc.teacherCode,
    fullName: doc.fullName,
    email: doc.email,
    department: doc.department,
    phone: doc.phone || null,
    specialization: doc.specialization || null,
    degree: doc.degree || null,
    gender: doc.gender || null,
    avatarUrl: doc.avatarUrl || null,
    isActive: doc.isActive,
    userId: doc.userId || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function ensureTeacherUserAccount(teacher, actorId) {
  if (teacher.userId) {
    return { created: false, userId: teacher.userId };
  }

  const normalizedEmail = normalizeEmail(teacher.email);
  if (!normalizedEmail) {
    return { created: false, userId: null };
  }

  let user = await repo.findUserByEmail(normalizedEmail);
  if (!user) {
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 12);
    user = await repo.createUser({
      email: normalizedEmail,
      password: hashedPassword,
      fullName: teacher.fullName,
      authProvider: "local",
      role: "staff",
      status: teacher.isActive === false ? "inactive" : "active",
      isActive: teacher.isActive !== false,
      mustChangePassword: true,
      avatarUrl: teacher.avatarUrl || undefined,
      createdBy: actorId,
    });
    teacher.userId = user._id;
    return { created: true, userId: user._id };
  }

  teacher.userId = user._id;
  return { created: false, userId: user._id };
}

async function listLecturers(query = {}) {
  const { name, dept, status, degree, gender, page = 1, limit = 12 } = query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 12));

  const filter = {};
  if (name) {
    filter.$or = [
      { fullName: { $regex: name, $options: "i" } },
      { email: { $regex: name, $options: "i" } },
      { teacherCode: { $regex: name, $options: "i" } },
    ];
  }
  if (dept) filter.department = { $regex: dept, $options: "i" };
  if (degree) filter.degree = degree;
  if (gender) filter.gender = gender;
  if (status === "active") filter.isActive = true;
  else if (status === "inactive") filter.isActive = false;

  const [total, lecturers] = await Promise.all([
    repo.countLecturers(filter),
    repo.findLecturers(filter, { page: pageNum, limit: limitNum }),
  ]);

  return {
    data: lecturers.map(formatLecturer),
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

async function getLecturerById(id) {
  const lecturer = await repo.findLecturerById(id);
  if (!lecturer) throw new Error("Lecturer not found");
  return formatLecturer(lecturer);
}

async function createLecturer(body, file, auth) {
  const {
    teacherCode,
    fullName,
    email,
    department,
    phone,
    specialization,
    degree,
    gender,
  } = body;

  const normalizedEmail = normalizeEmail(email);

  if (!teacherCode || !fullName || !normalizedEmail || !department) {
    throw new Error(
      "required: teacherCode, fullName, email, and department are required",
    );
  }

  // Check duplicates
  const [existingTeacher, existingUser] = await Promise.all([
    repo.findTeacherByCode(teacherCode),
    repo.findUserByEmail(normalizedEmail),
  ]);
  if (existingTeacher) throw new Error("Teacher code already exists");
  const existingTeacherEmail = await repo.findTeacherByEmail(normalizedEmail);
  if (existingTeacherEmail)
    throw new Error("Email already exists in teacher profiles");
  if (existingUser) throw new Error("Email already registered as a user");

  // Upload avatar if provided
  let avatarUrl = null;
  if (file) {
    const result = await uploadImage(file.buffer, {
      folder: "ssms/lecturers",
      public_id: `teacher_${teacherCode}`,
    });
    avatarUrl = result.secure_url;
  }

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await repo.createUser(
      {
        email: normalizedEmail,
        password: hashedPassword,
        fullName,
        authProvider: "local",
        role: "staff",
        status: "active",
        mustChangePassword: true,
        avatarUrl,
        createdBy: auth?.sub || auth?.id,
      },
      session,
    );

    const teacher = await repo.createTeacher(
      {
        teacherCode,
        fullName,
        email: normalizedEmail,
        department,
        phone: phone || undefined,
        specialization: specialization || undefined,
        degree: degree || "bachelors",
        gender: gender || undefined,
        avatarUrl,
        userId: user._id,
        isActive: true,
      },
      session,
    );

    await session.commitTransaction();

    const populated = await repo.findLecturerById(teacher._id);
    return {
      ...formatLecturer(populated),
      _defaultPasswordHint: `Default password: ${DEFAULT_PASSWORD} (must change on first login)`,
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

async function updateLecturer(id, body, file, auth) {
  const teacher = await repo.findTeacherDocById(id);
  if (!teacher) throw new Error("Lecturer not found");

  const accountProvision = await ensureTeacherUserAccount(
    teacher,
    auth?.sub || auth?.id || null,
  );

  const {
    fullName,
    department,
    phone,
    specialization,
    degree,
    gender,
    isActive,
  } = body;

  if (file) {
    const result = await uploadImage(file.buffer, {
      folder: "ssms/lecturers",
      public_id: `teacher_${teacher.teacherCode}`,
      overwrite: true,
    });
    teacher.avatarUrl = result.secure_url;
    if (teacher.userId) {
      await repo.updateUserById(teacher.userId, {
        avatarUrl: result.secure_url,
      });
    }
  }

  if (fullName !== undefined) teacher.fullName = fullName;
  if (department !== undefined) teacher.department = department;
  if (phone !== undefined) teacher.phone = phone;
  if (specialization !== undefined) teacher.specialization = specialization;
  if (degree !== undefined) teacher.degree = degree;
  if (gender !== undefined) teacher.gender = gender;

  if (isActive !== undefined) {
    teacher.isActive = isActive === true || isActive === "true";
    if (teacher.userId) {
      await repo.updateUserById(teacher.userId, {
        isActive: teacher.isActive,
        status: teacher.isActive ? "active" : "inactive",
      });
    }
  }

  await repo.saveLecturerDoc(teacher);
  const populated = await repo.findLecturerById(teacher._id);
  const result = formatLecturer(populated);
  if (accountProvision.created) {
    result._defaultPasswordHint = `Default password: ${DEFAULT_PASSWORD} (must change on first login)`;
  }
  return result;
}

async function deleteLecturer(id) {
  const teacher = await repo.findTeacherDocById(id);
  if (!teacher) throw new Error("Lecturer not found");

  teacher.isActive = false;
  await repo.saveLecturerDoc(teacher);

  if (teacher.userId) {
    await repo.updateUserById(teacher.userId, {
      isActive: false,
      status: "inactive",
    });
  }

  return { message: "Lecturer deactivated successfully" };
}

module.exports = {
  listLecturers,
  getLecturerById,
  createLecturer,
  updateLecturer,
  deleteLecturer,
};
