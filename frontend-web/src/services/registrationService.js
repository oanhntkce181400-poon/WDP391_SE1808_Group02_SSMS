import axiosClient from './axiosClient';

const registrationService = {
  validatePrerequisites: (classId) =>
    axiosClient.post('/registrations/validate', { classId }),

  validateCapacity: (classId) =>
    axiosClient.post('/registrations/validate-capacity', { classId }),

  validateWallet: (classId) =>
    axiosClient.post('/registrations/validate-wallet', { classId }),

  validateAll: (classId) =>
    axiosClient.post('/registrations/validate-all', { classId }),

  getEligibilitySummary: (classId = null) =>
    axiosClient.get('/registrations/eligibility-summary', {
      params: classId ? { classId } : {},
    }),
};

export default registrationService;
