require('dotenv').config();

const mongoose = require('mongoose');

const Teacher = require('../src/models/teacher.model');
const Semester = require('../src/models/semester.model');
const Subject = require('../src/models/subject.model');
const Room = require('../src/models/room.model');
const Timeslot = require('../src/models/timeslot.model');
const Student = require('../src/models/student.model');
const ClassSection = require('../src/models/classSection.model');
const Schedule = require('../src/models/schedule.model');
const ClassEnrollment = require('../src/models/classEnrollment.model');

const TARGET_EMAIL = 'dangchibangcmu@gmail.com';
const CLASS_CODE_PREFIX = 'GV1234-TS2526-HK2';
const CLASS_COUNT = 20;
const ENROLLMENTS_PER_CLASS = 8;

function pickDisplayTimeslots(timeslots) {
  const standard = timeslots
    .filter(
      (item) =>
        item.status === 'active'
        && Number(item.startPeriod) < Number(item.endPeriod)
        && String(item.startTime || '') >= '07:00'
        && String(item.endTime || '') <= '18:30',
    )
    .sort((a, b) => {
      if (Number(a.startPeriod || 0) !== Number(b.startPeriod || 0)) {
        return Number(a.startPeriod || 0) - Number(b.startPeriod || 0);
      }
      return String(a.groupName || '').localeCompare(String(b.groupName || ''));
    });

  const fallback = timeslots
    .filter((item) => item.status === 'active')
    .sort((a, b) => String(a.groupName || '').localeCompare(String(b.groupName || '')));

  const picked = (standard.length >= 4 ? standard : fallback).slice(0, 4);
  if (picked.length < 4) {
    throw new Error('Need at least 4 active timeslots to seed lecturer timetable demo');
  }
  return picked;
}

function buildCells(timeslots) {
  const days = [1, 2, 3, 4, 5];
  const cells = [];
  for (const dayOfWeek of days) {
    for (const timeslot of timeslots) {
      cells.push({ dayOfWeek, timeslot });
    }
  }
  return cells.slice(0, CLASS_COUNT);
}

function makeClassCode(index) {
  return `${CLASS_CODE_PREFIX}-${String(index + 1).padStart(2, '0')}`;
}

function buildDateRange(currentSemester) {
  const startDate = currentSemester?.startDate ? new Date(currentSemester.startDate) : new Date('2026-01-01T00:00:00.000Z');
  const endDate = currentSemester?.endDate ? new Date(currentSemester.endDate) : new Date('2026-06-30T00:00:00.000Z');
  return { startDate, endDate };
}

async function loadSubjectsForCurrentSemester(currentSemester) {
  const subjectIds = await ClassSection.distinct('subject', {
    semester: currentSemester.semesterNum,
    academicYear: currentSemester.academicYear,
  });

  let subjects = await Subject.find({ _id: { $in: subjectIds } })
    .select('subjectCode subjectName credits')
    .sort({ subjectCode: 1 })
    .lean();

  if (subjects.length < CLASS_COUNT) {
    const usedIds = subjects.map((item) => item._id);
    const moreSubjects = await Subject.find({
      _id: { $nin: usedIds },
    })
      .select('subjectCode subjectName credits')
      .sort({ subjectCode: 1 })
      .limit(CLASS_COUNT - subjects.length)
      .lean();
    subjects = [...subjects, ...moreSubjects];
  }

  if (subjects.length < CLASS_COUNT) {
    throw new Error(`Need at least ${CLASS_COUNT} subjects to seed lecturer timetable demo`);
  }

  return subjects.slice(0, CLASS_COUNT);
}

async function loadStudentPool() {
  const students = await Student.find({
    isActive: true,
    academicStatus: 'enrolled',
  })
    .select('_id studentCode fullName')
    .sort({ studentCode: 1 })
    .limit(40)
    .lean();

  if (students.length < ENROLLMENTS_PER_CLASS) {
    throw new Error(`Need at least ${ENROLLMENTS_PER_CLASS} active students to seed lecturer timetable demo`);
  }

  return students;
}

function buildEnrollments(classSectionId, studentPool, classIndex) {
  const records = [];
  for (let offset = 0; offset < ENROLLMENTS_PER_CLASS; offset += 1) {
    const student = studentPool[(classIndex * ENROLLMENTS_PER_CLASS + offset) % studentPool.length];
    records.push({
      classSection: classSectionId,
      student: student._id,
      status: 'enrolled',
      note: 'Lecturer timetable demo seed',
    });
  }
  return records;
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB_NAME,
  });

  const teacher = await Teacher.findOne({
    email: TARGET_EMAIL,
    isActive: true,
  }).lean();

  if (!teacher) {
    throw new Error(`Active lecturer not found for ${TARGET_EMAIL}`);
  }

  const currentSemester = await Semester.findOne({ isCurrent: true }).lean();
  if (!currentSemester) {
    throw new Error('Current semester not found');
  }

  const [subjects, rooms, timeslots, studentPool] = await Promise.all([
    loadSubjectsForCurrentSemester(currentSemester),
    Room.find({ status: 'available', capacity: { $gte: 25 } })
      .select('roomCode roomName capacity')
      .sort({ capacity: 1, roomCode: 1 })
      .lean(),
    Timeslot.find({ status: 'active' })
      .select('groupName startTime endTime startPeriod endPeriod status')
      .lean(),
    loadStudentPool(),
  ]);

  if (rooms.length === 0) {
    throw new Error('No available rooms found');
  }

  const selectedTimeslots = pickDisplayTimeslots(timeslots);
  const cells = buildCells(selectedTimeslots);
  const { startDate, endDate } = buildDateRange(currentSemester);

  const existingDemoClasses = await ClassSection.find({
    classCode: { $regex: `^${CLASS_CODE_PREFIX}-` },
  })
    .select('_id')
    .lean();

  const existingDemoIds = existingDemoClasses.map((item) => item._id);

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      if (existingDemoIds.length > 0) {
        await ClassEnrollment.deleteMany({ classSection: { $in: existingDemoIds } }, { session });
        await Schedule.deleteMany({ classSection: { $in: existingDemoIds } }, { session });
        await ClassSection.deleteMany({ _id: { $in: existingDemoIds } }, { session });
      }

      const classDocs = cells.map((cell, index) => {
        const subject = subjects[index];
        const room = rooms[index % rooms.length];
        const maxCapacity = Math.min(Number(room.capacity || 30), 35 + ((index % 4) * 5));
        return {
          classCode: makeClassCode(index),
          className: `Teaching Demo ${index + 1} - ${subject.subjectCode}`,
          subject: subject._id,
          teacher: teacher._id,
          room: room._id,
          timeslot: cell.timeslot._id,
          semester: currentSemester.semesterNum,
          academicYear: currentSemester.academicYear,
          maxCapacity,
          currentEnrollment: ENROLLMENTS_PER_CLASS,
          status: 'published',
          dayOfWeek: cell.dayOfWeek,
          startDate,
          endDate,
        };
      });

      const createdClasses = await ClassSection.insertMany(classDocs, { session });

      const scheduleDocs = createdClasses.map((classSection, index) => {
        const cell = cells[index];
        const room = rooms[index % rooms.length];
        return {
          classSection: classSection._id,
          room: room._id,
          dayOfWeek: cell.dayOfWeek,
          startPeriod: cell.timeslot.startPeriod,
          endPeriod: cell.timeslot.endPeriod,
          startDate,
          endDate,
          status: 'active',
        };
      });

      await Schedule.insertMany(scheduleDocs, { session });

      const enrollmentDocs = createdClasses.flatMap((classSection, index) =>
        buildEnrollments(classSection._id, studentPool, index),
      );

      await ClassEnrollment.insertMany(enrollmentDocs, { session, ordered: true });
    });
  } finally {
    await session.endSession();
  }

  const seededClasses = await ClassSection.find({
    teacher: teacher._id,
    classCode: { $regex: `^${CLASS_CODE_PREFIX}-` },
  })
    .populate('subject', 'subjectCode subjectName credits')
    .populate('room', 'roomCode capacity')
    .populate('timeslot', 'groupName startTime endTime')
    .sort({ classCode: 1 })
    .lean();

  const seededClassIds = seededClasses.map((item) => item._id);
  const seededSchedules = await Schedule.find({
    classSection: { $in: seededClassIds },
    status: 'active',
  }).lean();

  const seededEnrollments = await ClassEnrollment.countDocuments({
    classSection: { $in: seededClassIds },
    status: 'enrolled',
  });

  console.log(JSON.stringify({
    lecturer: {
      teacherId: String(teacher._id),
      teacherCode: teacher.teacherCode,
      fullName: teacher.fullName,
      email: teacher.email,
    },
    semester: {
      semesterNum: currentSemester.semesterNum,
      academicYear: currentSemester.academicYear,
      startDate,
      endDate,
    },
    seeded: {
      classCount: seededClasses.length,
      scheduleCount: seededSchedules.length,
      enrollmentCount: seededEnrollments,
      classCodePrefix: CLASS_CODE_PREFIX,
    },
    sampleClasses: seededClasses.slice(0, 5).map((item) => ({
      classCode: item.classCode,
      subjectCode: item.subject?.subjectCode,
      subjectName: item.subject?.subjectName,
      roomCode: item.room?.roomCode,
      timeslot: item.timeslot?.groupName,
      dayOfWeek: item.dayOfWeek,
      currentEnrollment: item.currentEnrollment,
      maxCapacity: item.maxCapacity,
    })),
  }, null, 2));
}

main()
  .catch((error) => {
    console.error('[seed-lecturer-timetable-demo]', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
