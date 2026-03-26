import axiosClient from './axiosClient';

const registrationService = {
  validatePrerequisites: (classId) =>
    axiosClient.post('/registrations/validate', { classId }),

  validateCapacity: (classId) =>
    axiosClient.post('/registrations/validate-capacity', { classId }),

  validateWallet: (classId) =>
    axiosClient.post('/registrations/validate-wallet', { classId }),

  validateScheduleConflict: (classId, semesterId = null) =>
    axiosClient.post('/registrations/check-schedule-conflict', {
      classId,
      ...(semesterId ? { semesterId } : {}),
    }),

  validateAll: (classId, semesterId = null) =>
    axiosClient.post('/registrations/validate-all', {
      classId,
      ...(semesterId ? { semesterId } : {}),
    }),

  getEligibilitySummary: (classId = null, semesterId = null) =>
    axiosClient.get('/registrations/eligibility-summary', {
      params: {
        ...(classId ? { classId } : {}),
        ...(semesterId ? { semesterId } : {}),
      },
    }),
};

export default registrationService;
