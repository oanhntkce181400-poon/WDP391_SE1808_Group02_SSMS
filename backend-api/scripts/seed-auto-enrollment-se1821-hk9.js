const path = require("path");
const mongoose = require("mongoose");

require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
});

const Curriculum = require("../src/models/curriculum.model");
const Semester = require("../src/models/semester.model");
const ClassSection = require("../src/models/classSection.model");
const Student = require("../src/models/student.model");
require("../src/models/subject.model");

const TARGET = {
  curriculumCode: "K26_SE_2026",
  curriculumSemesterOrder: 9,
  classGroup: "SE1821-01",
  institutionalAcademicYear: "2029-2030",
  institutionalSemesterNum: 9,
  studentPrefix: "SE26AE9",
  count: 3,
};

function buildSeedStudent(index, curriculumId) {
  const suffix = String(index).padStart(2, "0");
  return {
    studentCode: `${TARGET.studentPrefix}${suffix}`,
    fullName: `Auto Enrollment HK9 Seed ${suffix}`,
    email: `se26ae9.${suffix.toLowerCase()}@fpt.edu.vn`,
    majorCode: "SE",
    cohort: 26,
    enrollmentYear: 2026,
    classSection: TARGET.classGroup,
    academicStatus: "enrolled",
    isActive: true,
    curriculumId,
    currentCurriculumSemester: TARGET.curriculumSemesterOrder,
  };
}

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI or MONGO_URI in backend-api/.env");
  }

  await mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB_NAME || "wdp301",
    appName: "seed-auto-enrollment-se1821-hk9",
  });

  const curriculum = await Curriculum.findOne({
    code: TARGET.curriculumCode,
    status: "active",
  }).lean();
  if (!curriculum) {
    throw new Error(`Curriculum ${TARGET.curriculumCode} not found or inactive`);
  }

  const targetSemester = await Semester.findOne({
    semesterNum: TARGET.institutionalSemesterNum,
    academicYear: TARGET.institutionalAcademicYear,
    code: `${TARGET.institutionalAcademicYear}_${TARGET.institutionalSemesterNum}`,
  }).lean();

  const groupSections = await ClassSection.find({
    curriculum: curriculum._id,
    curriculumSemesterOrder: TARGET.curriculumSemesterOrder,
    classGroup: TARGET.classGroup,
  })
    .select("classCode status semester academicYear subject")
    .populate("subject", "subjectCode")
    .sort({ classCode: 1 })
    .lean();

  if (groupSections.length === 0) {
    throw new Error(
      `No class sections found for ${TARGET.classGroup} in curriculum semester ${TARGET.curriculumSemesterOrder}`,
    );
  }

  const seedResults = [];
  for (let index = 1; index <= TARGET.count; index += 1) {
    const payload = buildSeedStudent(index, curriculum._id);
    const student = await Student.findOneAndUpdate(
      { studentCode: payload.studentCode },
      { $set: payload },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();

    seedResults.push({
      studentCode: student.studentCode,
      fullName: student.fullName,
      currentCurriculumSemester: student.currentCurriculumSemester,
      classSection: student.classSection,
      curriculumId: String(student.curriculumId),
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        curriculum: {
          id: String(curriculum._id),
          code: curriculum.code,
          academicYear: curriculum.academicYear,
        },
        targetSemester: targetSemester
          ? {
              id: String(targetSemester._id),
              code: targetSemester.code,
              name: targetSemester.name,
              semesterNum: targetSemester.semesterNum,
              academicYear: targetSemester.academicYear,
            }
          : null,
        groupSections: groupSections.map((section) => ({
          classCode: section.classCode,
          status: section.status,
          semester: section.semester,
          academicYear: section.academicYear,
          subjectCode: section.subject?.subjectCode,
        })),
        seededStudents: seedResults,
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch (_) {
    // no-op
  }
  process.exit(1);
});
