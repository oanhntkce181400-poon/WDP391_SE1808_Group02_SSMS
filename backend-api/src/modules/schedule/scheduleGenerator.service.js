const ClassSection = require('../../models/classSection.model');
const Schedule = require('../../models/schedule.model');
const Subject = require('../../models/subject.model');
const Room = require('../../models/room.model');
const Teacher = require('../../models/teacher.model');
const Timeslot = require('../../models/timeslot.model');
const CurriculumSemester = require('../../models/curriculumSemester.model');
const CurriculumCourse = require('../../models/curriculumCourse.model');
const repo = require('./schedule.repository');

const VALID_CLASS_STATUSES = ['draft', 'scheduled', 'published', 'locked'];
const WORK_DAYS = [1, 2, 3, 4, 5, 6];

function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const [h, m] = timeStr.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function parseExpectedEnrollment(input, subject) {
  if (!input) return 40;
  if (typeof input === 'number') return Math.max(1, input);

  if (typeof input === 'object') {
    const byId = input[String(subject._id)];
    if (byId != null) return Math.max(1, Number(byId) || 40);

    const byCode = input[String(subject.subjectCode)];
    if (byCode != null) return Math.max(1, Number(byCode) || 40);
  }

  return 40;
}

function toAcademicYearSlug(academicYear) {
  return String(academicYear || '')
    .replace(/\s+/g, '')
    .replace(/\//g, '-')
    .replace(/[^0-9-]/g, '') || 'unknown';
}

async function buildClassCodeCounter(subjectCode, semester, academicYear) {
  const base = `${subjectCode}-HK${semester}-${toAcademicYearSlug(academicYear)}`;
  const regex = new RegExp(`^${base}-N(\\d+)$`, 'i');

  const existing = await ClassSection.find({ classCode: regex }).select('classCode').lean();
  let maxN = 0;
  for (const item of existing) {
    const m = String(item.classCode).match(/-N(\d+)$/i);
    if (m) maxN = Math.max(maxN, Number(m[1]) || 0);
  }

  return {
    base,
    current: maxN,
    next() {
      this.current += 1;
      return `${this.base}-N${this.current}`;
    },
  };
}

function normalizeIds(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item) => (typeof item === 'string' ? item : item?._id || item?.id))
    .filter(Boolean);
}

function normalizeTimeslots(rawTimeslots) {
  const ordered = [...rawTimeslots].sort((a, b) => {
    const ap = Number(a.startPeriod || 0);
    const bp = Number(b.startPeriod || 0);
    if (ap > 0 && bp > 0 && ap !== bp) return ap - bp;

    const at = timeToMinutes(a.startTime) ?? 9999;
    const bt = timeToMinutes(b.startTime) ?? 9999;
    if (at !== bt) return at - bt;
    return String(a.groupName || '').localeCompare(String(b.groupName || ''));
  });

  return ordered.map((slot, idx) => {
    let startPeriod = Number(slot.startPeriod);
    let endPeriod = Number(slot.endPeriod);

    if (!Number.isFinite(startPeriod) || startPeriod <= 0) {
      startPeriod = idx * 2 + 1;
    }

    if (!Number.isFinite(endPeriod) || endPeriod <= 0) {
      endPeriod = startPeriod + 1;
    }

    if (endPeriod < startPeriod) {
      endPeriod = startPeriod + 1;
    }

    return {
      ...slot,
      startPeriod,
      endPeriod,
    };
  });
}

function intervalOverlaps(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd;
}

function mapKey(entityId, dayOfWeek) {
  return `${String(entityId)}|${Number(dayOfWeek)}`;
}

function addInterval(map, entityId, dayOfWeek, startPeriod, endPeriod) {
  const key = mapKey(entityId, dayOfWeek);
  const list = map.get(key) || [];
  list.push({ startPeriod: Number(startPeriod), endPeriod: Number(endPeriod) });
  map.set(key, list);
}

function hasIntervalConflict(map, entityId, dayOfWeek, startPeriod, endPeriod) {
  const key = mapKey(entityId, dayOfWeek);
  const list = map.get(key) || [];
  return list.some((it) => intervalOverlaps(Number(startPeriod), Number(endPeriod), it.startPeriod, it.endPeriod));
}

async function getCandidateTeachers(subject) {
  let teachers = [];

  if (Array.isArray(subject.teachers) && subject.teachers.length > 0) {
    teachers = await Teacher.find({
      _id: { $in: subject.teachers },
      isActive: true,
    })
      .select('_id teacherCode fullName')
      .lean();
  }

  if (teachers.length === 0) {
    teachers = await Teacher.find({ isActive: true })
      .select('_id teacherCode fullName')
      .lean();
  }

  return teachers;
}

function buildGlobalTeacherLoadMap(existingSchedules) {
  const map = new Map();
  for (const s of existingSchedules) {
    const t = s?.classSection?.teacher;
    if (!t) continue;
    const key = String(t);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
}

function buildTeacherDayLoadMap(existingSchedules) {
  const map = new Map();
  for (const item of existingSchedules) {
    const teacherId = item?.classSection?.teacher;
    const day = item.dayOfWeek;
    if (!teacherId || !day) continue;

    const key = mapKey(teacherId, day);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
}

function sortedTeachersByLoad(teachers, teacherLoadMap, teacherDayLoadMap) {
  return [...teachers].sort((a, b) => {
    const aId = String(a._id);
    const bId = String(b._id);

    const loadA = teacherLoadMap.get(aId) || 0;
    const loadB = teacherLoadMap.get(bId) || 0;
    if (loadA !== loadB) return loadA - loadB;

    const contiguousA = WORK_DAYS.reduce((sum, d) => sum + (teacherDayLoadMap.get(mapKey(aId, d)) || 0), 0);
    const contiguousB = WORK_DAYS.reduce((sum, d) => sum + (teacherDayLoadMap.get(mapKey(bId, d)) || 0), 0);
    if (contiguousA !== contiguousB) return contiguousB - contiguousA;

    return String(a.teacherCode || '').localeCompare(String(b.teacherCode || ''));
  });
}

function dayPriorityForTeacher(teacherId, teacherDayLoadMap) {
  return [...WORK_DAYS].sort((a, b) => {
    const loadA = teacherDayLoadMap.get(mapKey(teacherId, a)) || 0;
    const loadB = teacherDayLoadMap.get(mapKey(teacherId, b)) || 0;
    if (loadA !== loadB) return loadB - loadA; // Ưu tiên xếp liền mạch cùng ngày
    return a - b;
  });
}

function sortedRoomsByCapacity(rooms, targetCapacity) {
  return [...rooms].sort((a, b) => {
    const fitA = (a.capacity || 0) >= targetCapacity ? 0 : 1;
    const fitB = (b.capacity || 0) >= targetCapacity ? 0 : 1;
    if (fitA !== fitB) return fitA - fitB;
    return (a.capacity || 0) - (b.capacity || 0);
  });
}

async function loadExistingSchedules(semester, academicYear) {
  return Schedule.find({ status: 'active' })
    .select('room dayOfWeek startPeriod endPeriod classSection')
    .populate({
      path: 'classSection',
      select: 'teacher semester academicYear status',
      match: {
        semester: Number(semester),
        academicYear,
        status: { $in: VALID_CLASS_STATUSES },
      },
    })
    .lean();
}

async function resolveSubjectIdsFromCurriculum({ subjectIds, curriculumId, curriculumSemester }) {
  if (Array.isArray(subjectIds) && subjectIds.length > 0) {
    return subjectIds;
  }

  if (!curriculumId || !curriculumSemester) {
    return [];
  }

  const semesterDoc = await CurriculumSemester.findOne({
    curriculum: curriculumId,
    semesterOrder: Number(curriculumSemester),
  })
    .select('_id')
    .lean();

  if (!semesterDoc) {
    throw new Error('Không tìm thấy học kỳ trong khung chương trình đã chọn');
  }

  const courses = await CurriculumCourse.find({ semester: semesterDoc._id })
    .select('subject')
    .lean();

  return courses.map((c) => c.subject).filter(Boolean);
}

async function autoGenerateTimetables({
  semester,
  academicYear,
  subjectIds,
  curriculumId,
  curriculumSemester,
  expectedEnrollment,
  availableRooms,
  availableTimeSlots,
  startDate,
  endDate,
}) {
  if (!semester || !academicYear) {
    throw new Error('semester và academicYear là bắt buộc');
  }

  const roomIds = normalizeIds(availableRooms);
  const timeslotIds = normalizeIds(availableTimeSlots);
  const resolvedSubjectIds = await resolveSubjectIdsFromCurriculum({
    subjectIds,
    curriculumId,
    curriculumSemester,
  });

  if (!Array.isArray(resolvedSubjectIds) || resolvedSubjectIds.length === 0) {
    throw new Error('Vui lòng chọn học phần hoặc chọn khung chương trình + học kỳ để generate');
  }

  const [subjects, rooms, timeslots, existingSchedulesRaw] = await Promise.all([
    Subject.find({
      _id: { $in: resolvedSubjectIds },
    })
      .select('_id subjectCode subjectName teachers facultyCode majorCode majorCodes majorRequirements')
      .lean(),
    Room.find({
      ...(roomIds.length > 0 ? { _id: { $in: roomIds } } : {}),
      status: 'available',
    })
      .select('_id roomCode roomName capacity')
      .lean(),
    Timeslot.find({
      ...(timeslotIds.length > 0 ? { _id: { $in: timeslotIds } } : {}),
      status: 'active',
    })
      .select('_id groupName startPeriod endPeriod startTime endTime')
      .lean(),
    loadExistingSchedules(semester, academicYear),
  ]);

  if (rooms.length === 0 || timeslots.length === 0) {
    throw new Error('Không lấy được danh sách phòng hoặc timeslot');
  }

  if (subjects.length === 0) {
    throw new Error('Không có học phần nào để tạo thời khóa biểu');
  }

  const existingSchedules = existingSchedulesRaw.filter((s) => s.classSection);

  const roomIntervals = new Map();
  const teacherIntervals = new Map();
  for (const s of existingSchedules) {
    addInterval(roomIntervals, s.room, s.dayOfWeek, s.startPeriod, s.endPeriod);
    addInterval(teacherIntervals, s.classSection.teacher, s.dayOfWeek, s.startPeriod, s.endPeriod);
  }

  const globalTeacherLoadMap = buildGlobalTeacherLoadMap(existingSchedules);
  const teacherDayLoadMap = buildTeacherDayLoadMap(existingSchedules);
  const maxRoomCapacity = Math.max(...rooms.map((r) => Number(r.capacity) || 0), 1);
  const slotOrdered = normalizeTimeslots(timeslots);

  const generated = [];
  const unassigned = [];
  const codeCounterMap = new Map();

  for (const subject of subjects) {
    const expected = parseExpectedEnrollment(expectedEnrollment, subject);
    const sectionCount = Math.max(1, Math.ceil(expected / maxRoomCapacity));

    const teacherCandidates = await getCandidateTeachers(subject);
    if (teacherCandidates.length === 0) {
      unassigned.push({
        subjectId: subject._id,
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
        reason: 'Không có giảng viên khả dụng',
      });
      continue;
    }

    const teacherLoadMap = new Map();
    teacherCandidates.forEach((t) => {
      teacherLoadMap.set(String(t._id), globalTeacherLoadMap.get(String(t._id)) || 0);
    });

    if (!codeCounterMap.has(subject.subjectCode)) {
      codeCounterMap.set(
        subject.subjectCode,
        await buildClassCodeCounter(subject.subjectCode, semester, academicYear),
      );
    }

    const codeCounter = codeCounterMap.get(subject.subjectCode);

    for (let sectionIndex = 0; sectionIndex < sectionCount; sectionIndex += 1) {
      const perSection = Math.max(1, Math.ceil(expected / sectionCount));
      const roomCandidates = sortedRoomsByCapacity(rooms, perSection);
      const teacherCandidatesSorted = sortedTeachersByLoad(teacherCandidates, teacherLoadMap, teacherDayLoadMap);

      let chosen = null;

      for (const teacher of teacherCandidatesSorted) {
        const teacherId = String(teacher._id);
        const dayOrder = dayPriorityForTeacher(teacherId, teacherDayLoadMap);

        let foundForTeacher = null;
        for (const dayOfWeek of dayOrder) {
          for (const slot of slotOrdered) {
            if (hasIntervalConflict(teacherIntervals, teacherId, dayOfWeek, slot.startPeriod, slot.endPeriod)) {
              continue;
            }

            const room = roomCandidates.find(
              (r) => !hasIntervalConflict(roomIntervals, r._id, dayOfWeek, slot.startPeriod, slot.endPeriod),
            );
            if (!room) continue;

            foundForTeacher = { teacher, dayOfWeek, slot, room };
            break;
          }
          if (foundForTeacher) break;
        }

        if (foundForTeacher) {
          chosen = foundForTeacher;
          break;
        }
      }

      if (!chosen) {
        unassigned.push({
          subjectId: subject._id,
          subjectCode: subject.subjectCode,
          subjectName: subject.subjectName,
          reason: 'Không tìm được phòng/ca phù hợp (đã conflict hoặc không đủ tài nguyên)',
        });
        continue;
      }

      const classCode = codeCounter.next();
      const classSection = await ClassSection.create({
        classCode,
        className: `${subject.subjectName} - Nhóm ${sectionIndex + 1}`,
        subject: subject._id,
        teacher: chosen.teacher._id,
        semester: Number(semester),
        academicYear,
        maxCapacity: Math.min(chosen.room.capacity, perSection),
        currentEnrollment: 0,
        status: 'scheduled',
        room: chosen.room._id,
        timeslot: chosen.slot._id,
        dayOfWeek: chosen.dayOfWeek,
      });

      const schedule = await Schedule.create({
        classSection: classSection._id,
        room: chosen.room._id,
        dayOfWeek: chosen.dayOfWeek,
        startPeriod: chosen.slot.startPeriod,
        endPeriod: chosen.slot.endPeriod,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : new Date(),
        status: 'active',
      });

      addInterval(roomIntervals, chosen.room._id, chosen.dayOfWeek, chosen.slot.startPeriod, chosen.slot.endPeriod);
      addInterval(teacherIntervals, chosen.teacher._id, chosen.dayOfWeek, chosen.slot.startPeriod, chosen.slot.endPeriod);
      teacherLoadMap.set(String(chosen.teacher._id), (teacherLoadMap.get(String(chosen.teacher._id)) || 0) + 1);
      globalTeacherLoadMap.set(String(chosen.teacher._id), (globalTeacherLoadMap.get(String(chosen.teacher._id)) || 0) + 1);
      teacherDayLoadMap.set(
        mapKey(chosen.teacher._id, chosen.dayOfWeek),
        (teacherDayLoadMap.get(mapKey(chosen.teacher._id, chosen.dayOfWeek)) || 0) + 1,
      );

      generated.push({
        classSectionId: classSection._id,
        scheduleId: schedule._id,
        classCode,
        className: classSection.className,
        subject: {
          _id: subject._id,
          subjectCode: subject.subjectCode,
          subjectName: subject.subjectName,
          facultyCode: subject.facultyCode || null,
          majorCode: subject.majorCode || null,
        },
        teacher: {
          _id: chosen.teacher._id,
          teacherCode: chosen.teacher.teacherCode,
          fullName: chosen.teacher.fullName,
        },
        room: {
          _id: chosen.room._id,
          roomCode: chosen.room.roomCode,
          roomName: chosen.room.roomName,
          capacity: chosen.room.capacity,
        },
        timeslot: {
          _id: chosen.slot._id,
          groupName: chosen.slot.groupName,
          startPeriod: chosen.slot.startPeriod,
          endPeriod: chosen.slot.endPeriod,
          startTime: chosen.slot.startTime,
          endTime: chosen.slot.endTime,
        },
        dayOfWeek: chosen.dayOfWeek,
        expectedEnrollment: expected,
      });
    }
  }

  return {
    semester: Number(semester),
    academicYear,
    summary: {
      subjectsRequested: subjects.length,
      generatedClasses: generated.length,
      unassignedClasses: unassigned.length,
    },
    generated,
    unassigned,
  };
}

async function reassignGeneratedSchedule({ scheduleId, roomId, dayOfWeek, timeslotId }) {
  const schedule = await Schedule.findById(scheduleId).populate('classSection').lean();
  if (!schedule) throw new Error('Không tìm thấy lịch học');

  const classSection = schedule.classSection;
  if (!classSection) throw new Error('Không tìm thấy lớp học phần');

  const [room, timeslot] = await Promise.all([
    Room.findById(roomId).lean(),
    Timeslot.findById(timeslotId).lean(),
  ]);

  if (!room) throw new Error('Phòng học không hợp lệ');
  if (!timeslot) throw new Error('Timeslot không hợp lệ');

  if ((classSection.maxCapacity || 0) > (room.capacity || 0)) {
    throw new Error('Phòng mới không đủ sức chứa cho lớp học phần');
  }

  const [roomConflicts, teacherConflicts] = await Promise.all([
    repo.checkRoomConflict({
      roomId,
      dayOfWeek: Number(dayOfWeek),
      startPeriod: timeslot.startPeriod,
      endPeriod: timeslot.endPeriod,
      classSectionId: classSection._id,
      semester: classSection.semester,
      academicYear: classSection.academicYear,
    }),
    repo.checkTeacherConflict({
      teacherId: classSection.teacher,
      dayOfWeek: Number(dayOfWeek),
      startPeriod: timeslot.startPeriod,
      endPeriod: timeslot.endPeriod,
      classSectionId: classSection._id,
      semester: classSection.semester,
      academicYear: classSection.academicYear,
    }),
  ]);

  if (roomConflicts.length > 0 || teacherConflicts.length > 0) {
    throw new Error('Không thể điều chỉnh do xung đột lịch phòng hoặc giảng viên');
  }

  const updatedSchedule = await Schedule.findByIdAndUpdate(
    scheduleId,
    {
      room: roomId,
      dayOfWeek: Number(dayOfWeek),
      startPeriod: timeslot.startPeriod,
      endPeriod: timeslot.endPeriod,
    },
    { new: true },
  )
    .populate('room', 'roomCode roomName capacity')
    .lean();

  await ClassSection.findByIdAndUpdate(classSection._id, {
    room: roomId,
    timeslot: timeslotId,
    dayOfWeek: Number(dayOfWeek),
  });

  return {
    schedule: updatedSchedule,
    classSectionId: classSection._id,
    room: {
      _id: room._id,
      roomCode: room.roomCode,
      roomName: room.roomName,
      capacity: room.capacity,
    },
    timeslot: {
      _id: timeslot._id,
      groupName: timeslot.groupName,
      startPeriod: timeslot.startPeriod,
      endPeriod: timeslot.endPeriod,
      startTime: timeslot.startTime,
      endTime: timeslot.endTime,
    },
    dayOfWeek: Number(dayOfWeek),
  };
}

module.exports = {
  autoGenerateTimetables,
  reassignGeneratedSchedule,
};
