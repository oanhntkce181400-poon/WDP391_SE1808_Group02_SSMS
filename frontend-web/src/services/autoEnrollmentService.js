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
          };

    return axiosClient.post('/auto-enrollment/trigger', {
      semesterId,
      ...normalizedOptions,
    });
  },
};

export default autoEnrollmentService;
