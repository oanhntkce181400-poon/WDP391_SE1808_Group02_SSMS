/**
 * seed-K26-students-for-existing-classes.js
 * ───────────────────────────────────────────────────────────────────────────
 * Tạo User + Student cho khung K26_SE_2026, khớp các nhóm lớp học phần đã có
 * (ClassSection.classGroup, HK1, academicYear trùng curriculum).
 *
 * - Đọc distinct classGroup từ ClassSection (semester=1, academicYear từ khung).
 * - Mỗi nhóm: STUDENTS_PER_GROUP sinh viên, student.classSection = đúng classGroup
 *   (để auto-enrollment match theo classGroup).
 *
 * Chạy từ thư mục backend-api:
 *   node seed-K26-students-for-existing-classes.js
 *
 * Biến môi trường: MONGODB_URI, MONGODB_DB_NAME (giống các seed khác).
 * ───────────────────────────────────────────────────────────────────────────
 */
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("./src/models/user.model");
const Student = require("./src/models/student.model");
const Major = require("./src/models/major.model");
const Curriculum = require("./src/models/curriculum.model");
const ClassSection = require("./src/models/classSection.model");

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/wdp301";
const DB_NAME = process.env.MONGODB_DB_NAME || "wdp301";

const CURRICULUM_CODE = process.env.SEED_K26_CURRICULUM_CODE || "K26_SE_2026";
const MAJOR_CODE = "SE";
const COHORT = 26;
const ENROLLMENT_YEAR = 2026;
const HK_SEMESTER = 1;
/** Số SV tạo cho mỗi nhóm classGroup */
const STUDENTS_PER_GROUP = Number(process.env.SEED_STUDENTS_PER_GROUP || 6);
const PASSWORD = process.env.SEED_STUDENT_PASSWORD || "123456";

/** Nếu DB chưa có classGroup nào, dùng danh sách dự phòng (có thể sửa theo dự án) */
const FALLBACK_CLASS_GROUPS = ["SE1808-01-04", "SE1808-05-01"];

function slugForEmail(group) {
  return String(group)
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

async function main() {
  await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
  console.log("Connected:", DB_NAME, "\n");

  const curriculum = await Curriculum.findOne({ code: CURRICULUM_CODE }).lean();
  if (!curriculum) {
    console.error(`Không tìm thấy khung chương trình code="${CURRICULUM_CODE}".`);
    process.exit(1);
  }

  const major = await Major.findOne({ majorCode: MAJOR_CODE }).lean();
  if (!major) {
    console.error(`Không tìm thấy ngành majorCode="${MAJOR_CODE}". Chạy seed ngành trước.`);
    process.exit(1);
  }

  const ay = curriculum.academicYear;
  let groups = await ClassSection.distinct("classGroup", {
    academicYear: ay,
    semester: HK_SEMESTER,
    classGroup: { $nin: [null, ""] },
  });
  groups = groups.filter(Boolean).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (groups.length === 0) {
    console.warn(
      `Không có classGroup nào cho HK${HK_SEMESTER} + academicYear="${ay}". Dùng FALLBACK_CLASS_GROUPS.`,
    );
    groups = [...FALLBACK_CLASS_GROUPS];
  }

  console.log("Curriculum:", curriculum.code, "|", curriculum.name);
  console.log("Academic year (lớp học phần):", ay);
  console.log("Nhóm lớp:", groups.join(", "));
  console.log("Mỗi nhóm:", STUDENTS_PER_GROUP, "sinh viên\n");

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  let created = 0;
  let updated = 0;
  let seq = 1;

  for (const classGroup of groups) {
    const slug = slugForEmail(classGroup);
    for (let i = 1; i <= STUDENTS_PER_GROUP; i += 1) {
      const studentCode = `SE26${String(seq).padStart(4, "0")}`;
      seq += 1;
      const email = `k26.${slug}.${String(i).padStart(2, "0")}@seed.local`;
      const fullName = `Sinh viên K26 ${classGroup} #${i}`;

      const existingSt = await Student.findOne({ studentCode }).lean();
      const user = await User.findOneAndUpdate(
        { email },
        {
          $set: {
            email,
            fullName,
            authProvider: "local",
            role: "student",
            status: "active",
            isActive: true,
            mustChangePassword: false,
            password: passwordHash,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );

      const doc = {
        studentCode,
        fullName,
        email,
        majorCode: MAJOR_CODE,
        majorId: major._id,
        cohort: COHORT,
        enrollmentYear: ENROLLMENT_YEAR,
        classSection: classGroup,
        academicStatus: "enrolled",
        isActive: true,
        gender: i % 2 === 0 ? "female" : "male",
        userId: user._id,
        curriculumId: curriculum._id,
        currentCurriculumSemester: HK_SEMESTER,
      };

      if (existingSt) {
        await Student.updateOne({ _id: existingSt._id }, { $set: doc });
        updated += 1;
      } else {
        await Student.create(doc);
        created += 1;
      }
    }
  }

  const total = created + updated;
  console.log("— Xong —");
  console.log("Tạo mới:", created, "| Cập nhật:", updated, "| Tổng bản ghi (ước lượng):", total);
  console.log("Đăng nhập: email dạng k26.<nhóm>.<stt>@seed.local | mật khẩu:", PASSWORD);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
