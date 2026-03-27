import axiosClient from './axiosClient';

const autoEnrollmentService = {
  trigger: (semesterId, options = {}) => {
    const normalizedOptions =
      typeof options === 'boolean'
        ? { dryRun: options }
        : {
            dryRun: options.dryRun === true,
            limit: options.limit,
            majorCodes: options.majorCodes,
            onlyStudentsWithoutEnrollments: options.onlyStudentsWithoutEnrollments === true,
            excludeStudentsAlreadyAssignedInSemester:
              options.excludeStudentsAlreadyAssignedInSemester === true,
            mode: options.mode === 'retake' ? 'retake' : 'normal',
            curriculumId: options.curriculumId || undefined,
            classGroup: options.classGroup || undefined,
          };

    const codes = Array.isArray(options.studentCodes)
      ? options.studentCodes
          .map((c) => String(c || '').trim().toUpperCase())
          .filter(Boolean)
      : [];
    const body = {
      semesterId,
      ...normalizedOptions,
      ...(codes.length > 0 ? { studentCodes: codes } : {}),
    };

    return axiosClient.post('/auto-enrollment/trigger', body);
  },

  /**
   * Cùng filter với trigger nhưng trả về toàn bộ SV ứng viên (không cắt theo Student limit).
   */
  listEligibleStudents: (semesterId, options = {}) => {
    const normalized = {
      majorCodes: options.majorCodes,
      studentCodes: options.studentCodes,
      onlyStudentsWithoutEnrollments:
        options.onlyStudentsWithoutEnrollments === true,
      excludeStudentsAlreadyAssignedInSemester:
        options.excludeStudentsAlreadyAssignedInSemester === true,
      mode: options.mode === 'retake' ? 'retake' : 'normal',
      curriculumId: options.curriculumId || undefined,
      classGroup: options.classGroup || undefined,
      curriculumSemesterOrder:
        options.curriculumSemesterOrder != null &&
        options.curriculumSemesterOrder !== ''
          ? options.curriculumSemesterOrder
          : undefined,
    };
    return axiosClient.post('/auto-enrollment/eligible-students', {
      semesterId,
      ...normalized,
    });
  },

  /**
   * Gán các SV đã chọn vào một lớp học phần (cùng bộ lọc với tab Auto Enrollment).
   */
  assignToClass: (semesterId, payload) =>
    axiosClient.post('/auto-enrollment/assign-to-class', {
      semesterId,
      ...payload,
    }),

  // ── Enrollment Management ──────────────────────────────────────────────────────

  /**
   * Xem trạng thái enrolled + waitlist của sinh viên cho một HK.
   * Dùng để admin biết vì sao sinh viên bị skip trước khi reset.
   */
  getEnrollmentStatus: (params) => {
    const {
      semesterNum,
      academicYear,
      classGroup,
      curriculumId,
      curriculumSemesterOrder,
      majorCodes,
    } = params;
    const majorStr =
      Array.isArray(majorCodes) && majorCodes.length
        ? majorCodes.join(',')
        : undefined;
    return axiosClient.get('/auto-enrollment/status', {
      params: {
        semesterNum,
        academicYear,
        classGroup: classGroup || undefined,
        curriculumId: curriculumId || undefined,
        curriculumSemesterOrder:
          curriculumSemesterOrder != null && curriculumSemesterOrder !== ''
            ? curriculumSemesterOrder
            : undefined,
        majorCodes: majorStr,
      },
    });
  },

  /**
   * Xóa enrollment theo HK + classGroup (tùy chọn).
   * Dùng khi cần reset trạng thái trước khi chạy lại Auto Enrollment.
   */
  deleteEnrollments: (params) => {
    const { semesterNum, academicYear, classGroup } = params;
    return axiosClient.delete('/auto-enrollment/enrollments', {
      params: { semesterNum, academicYear, classGroup: classGroup || undefined },
    });
  },

  /**
   * Xóa waitlist theo HK + classGroup (tùy chọn).
   */
  deleteWaitlists: (params) => {
    const { semesterNum, academicYear, classGroup } = params;
    return axiosClient.delete('/auto-enrollment/waitlists', {
      params: { semesterNum, academicYear, classGroup: classGroup || undefined },
    });
  },

  /**
   * Kéo sinh viên từ waitlist lên enrolled.
   * @param {string} waitlistId
   * @param {string} [targetClassSectionId] — optional, auto-find if omitted
   */
  promoteWaitlist: (waitlistId, targetClassSectionId) =>
    axiosClient.patch(
      `/auto-enrollment/waitlists/${waitlistId}/promote`,
      targetClassSectionId ? { targetClassSectionId } : {},
    ),
};

export default autoEnrollmentService;
