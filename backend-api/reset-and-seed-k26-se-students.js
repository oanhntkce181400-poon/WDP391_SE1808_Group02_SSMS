/**
 * reset-and-seed-k26-se-students.js
 * ───────────────────────────────────────────────────────────────────────────
 * Xóa sinh viên K26 ngành SE gắn khung K26_SE_2026 (và dữ liệu liên quan),
 * rồi tạo lại danh sách mới (mặc định 40 SV), chia đều theo classGroup HK1.
 *
 * Chạy từ backend-api:
 *   RESET_K26_SE_CONFIRM=yes node reset-and-seed-k26-se-students.js
 *
 * Biến môi trường:
 *   MONGODB_URI, MONGODB_DB_NAME
 *   RESET_K26_SE_CONFIRM=yes   (bắt buộc để thực sự xóa + tạo)
 *   SEED_K26_TOTAL_STUDENTS=40 (mặc định 40)
 *   SEED_K26_CURRICULUM_CODE=K26_SE_2026
 *   SEED_STUDENT_PASSWORD=123456
 *   SEED_ONLY_SEED_EMAIL=true   (chỉ xóa email *@seed.local — thu hẹp phạm vi)
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
const ClassEnrollment = require("./src/models/classEnrollment.model");
const Waitlist = require("./src/models/waitlist.model");
const Wallet = require("./src/models/wallet.model");
const WalletTransaction = require("./src/models/walletTransaction.model");
const Attendance = require("./src/models/attendance.model");
const TuitionBill = require("./src/models/tuitionBill.model");
const Payment = require("./src/models/payment.model");
const PaymentOrder = require("./src/models/paymentOrder.model");
const CourseWishlist = require("./src/models/courseWishlist.model");

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/wdp301";
const DB_NAME = process.env.MONGODB_DB_NAME || "wdp301";
const CURRICULUM_CODE = process.env.SEED_K26_CURRICULUM_CODE || "K26_SE_2026";
const MAJOR_CODE = "SE";
const COHORT = 26;
const ENROLLMENT_YEAR = 2026;
const HK_SEMESTER = 1;
const TOTAL_STUDENTS = Math.max(1, Number(process.env.SEED_K26_TOTAL_STUDENTS || 40));
const PASSWORD = process.env.SEED_STUDENT_PASSWORD || "123456";
const ONLY_SEED_EMAIL = String(process.env.SEED_ONLY_SEED_EMAIL || "").toLowerCase() === "true";
const FALLBACK_CLASS_GROUPS = ["SE1808-01-04", "SE1808-05-01"];

function slugForEmail(group) {
  return String(group)
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

const SEED_K26_SEQ_START = Number(process.env.SEED_K26_SEQ_START) || null;

async function cleanupStudentRelated(studentIds, userIds) {
  if (!studentIds.length) {
    return { enrollmentsAdjusted: 0, docsDeletedApprox: 0 };
  }

  const enrollments = await ClassEnrollment.find({ student: { $in: studentIds } }).lean();
  for (const e of enrollments) {
    if (e.status === "enrolled" && e.classSection) {
      const sec = await ClassSection.findById(e.classSection).select("currentEnrollment").lean();
      const cur = sec?.currentEnrollment ?? 0;
      await ClassSection.updateOne(
        { _id: e.classSection },
        { $set: { currentEnrollment: Math.max(0, cur - 1) } },
      );
    }
  }

  const del = async (Model, filter) => {
    const r = await Model.deleteMany(filter);
    return r.deletedCount || 0;
  };

  let n = 0;
  n += await del(ClassEnrollment, { student: { $in: studentIds } });
  n += await del(Waitlist, { student: { $in: studentIds } });
  n += await del(Attendance, { student: { $in: studentIds } });
  n += await del(TuitionBill, { student: { $in: studentIds } });
  n += await del(Payment, { student: { $in: studentIds } });
  n += await del(PaymentOrder, { studentId: { $in: studentIds } });
  n += await del(CourseWishlist, { student: { $in: studentIds } });

  const wallets = await Wallet.find({ userId: { $in: userIds } }).select("_id").lean();
  const walletIds = wallets.map((w) => w._id);
  if (walletIds.length) {
    n += await del(WalletTransaction, { wallet: { $in: walletIds } });
  }
  n += await del(Wallet, { userId: { $in: userIds } });

  n += await del(Student, { _id: { $in: studentIds } });
  n += await del(User, { _id: { $in: userIds } });

  return { enrollmentsAdjusted: enrollments.length, docsDeletedApprox: n };
}

async function main() {
  if (process.env.RESET_K26_SE_CONFIRM !== "yes") {
    console.error(
      "Thiếu RESET_K26_SE_CONFIRM=yes — không chạy xóa/seed. Ví dụ:\n" +
        "  RESET_K26_SE_CONFIRM=yes node reset-and-seed-k26-se-students.js",
    );
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
  console.log("Connected:", DB_NAME, "\n");

  const curriculum = await Curriculum.findOne({ code: CURRICULUM_CODE }).lean();
  if (!curriculum) {
    console.error(`Không tìm thấy khung chương trình code="${CURRICULUM_CODE}".`);
    process.exit(1);
  }

  const major = await Major.findOne({ majorCode: MAJOR_CODE }).lean();
  if (!major) {
    console.error(`Không tìm thấy ngành majorCode="${MAJOR_CODE}".`);
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
    console.warn(`Không có classGroup cho HK${HK_SEMESTER} + "${ay}". Dùng FALLBACK_CLASS_GROUPS.`);
    groups = [...FALLBACK_CLASS_GROUPS];
  }

  const match = {
    curriculumId: curriculum._id,
    majorCode: MAJOR_CODE,
    cohort: COHORT,
  };
  if (ONLY_SEED_EMAIL) {
    match.email = { $regex: /@seed\.local$/i };
  }

  const toRemove = await Student.find(match).select("_id userId email studentCode").lean();
  const studentIds = toRemove.map((s) => s._id);
  const userIds = toRemove.map((s) => s.userId).filter(Boolean);

  console.log("Curriculum:", curriculum.code, "| Nhóm lớp:", groups.join(", "));
  console.log("Sẽ xóa:", toRemove.length, "sinh viên (filter:", JSON.stringify(match), ")");
  if (toRemove.length) {
    const sample = toRemove.slice(0, 5).map((s) => s.studentCode);
    console.log("  Mẫu mã SV:", sample.join(", "), toRemove.length > 5 ? "..." : "");
  }

  const cleanup = await cleanupStudentRelated(studentIds, userIds);
  console.log("Đã dọn: enrollment chỉnh currentEnrollment,", cleanup.docsDeletedApprox, "thao tác xóa (ước lượng tổng).");

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const base = Math.floor(TOTAL_STUDENTS / groups.length);
  const remainder = TOTAL_STUDENTS % groups.length;

  const seqStart = SEED_K26_SEQ_START || (await (async () => {
    const last = await Student.find({ studentCode: { $regex: /^SE26\d{4}$/ } })
      .sort({ studentCode: -1 }).limit(1).select("studentCode").lean();
    if (!last.length) return 1;
    const n = parseInt(String(last[0].studentCode).replace(/^SE26/i, ""), 10);
    return Number.isFinite(n) ? n + 1 : 1;
  })());
  console.log("Sequence start:", seqStart, SEED_K26_SEQ_START ? "(forced)" : "(auto from DB)");
  let seq = seqStart;
  let created = 0;

  for (let gi = 0; gi < groups.length; gi += 1) {
    const classGroup = groups[gi];
    const nHere = base + (gi < remainder ? 1 : 0);
    const slug = slugForEmail(classGroup);
    for (let i = 1; i <= nHere; i += 1) {
      const studentCode = `SE26${String(seq).padStart(4, "0")}`;
      seq += 1;
      const email = `k26.${slug}.${String(i).padStart(2, "0")}@seed.local`;
      const fullName = `Sinh viên K26 ${classGroup} #${i}`;

      const dup = await Student.findOne({
        $or: [{ studentCode }, { email }],
      })
        .select("_id")
        .lean();
      if (dup) {
        console.warn("Bỏ qua (trùng mã/email):", studentCode, email);
        continue;
      }

      const user = await User.create({
        email,
        fullName,
        authProvider: "local",
        role: "student",
        status: "active",
        isActive: true,
        mustChangePassword: false,
        password: passwordHash,
      });

      await Student.create({
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
      });
      created += 1;
    }
  }

  console.log("\n— Xong —");
  console.log("Đã tạo mới:", created, "/", TOTAL_STUDENTS, "sinh viên");
  console.log("Đăng nhập: k26.<nhóm>.<stt>@seed.local | mật khẩu:", PASSWORD);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
