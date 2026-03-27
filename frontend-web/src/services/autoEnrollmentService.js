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
            studentCodes: options.studentCodes,
            onlyStudentsWithoutEnrollments: options.onlyStudentsWithoutEnrollments === true,
            excludeStudentsAlreadyAssignedInSemester:
              options.excludeStudentsAlreadyAssignedInSemester === true,
            mode: options.mode === 'retake' ? 'retake' : 'normal',
            curriculumId: options.curriculumId || undefined,
            classGroup: options.classGroup || undefined,
          };

    return axiosClient.post('/auto-enrollment/trigger', {
      semesterId,
      ...normalizedOptions,
    });
  },

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
