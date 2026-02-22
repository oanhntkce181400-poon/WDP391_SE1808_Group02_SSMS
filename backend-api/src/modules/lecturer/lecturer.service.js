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

  if (!teacherCode || !fullName || !email || !department) {
    throw new Error(
      "required: teacherCode, fullName, email, and department are required",
    );
  }

  // Check duplicates
  const [existingTeacher, existingUser] = await Promise.all([
    repo.findTeacherByCode(teacherCode),
    repo.findUserByEmail(email),
  ]);
  if (existingTeacher) throw new Error("Teacher code already exists");
  const existingTeacherEmail = await repo.findTeacherByEmail(email);
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
        email,
        password: hashedPassword,
        fullName,
        authProvider: "local",
        role: "staff",
        status: "active",
        mustChangePassword: true,
        avatarUrl,
        createdBy: auth?.id,
      },
      session,
    );

    const teacher = await repo.createTeacher(
      {
        teacherCode,
        fullName,
        email,
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

async function updateLecturer(id, body, file) {
  const teacher = await repo.findTeacherDocById(id);
  if (!teacher) throw new Error("Lecturer not found");

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
  return formatLecturer(populated);
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
