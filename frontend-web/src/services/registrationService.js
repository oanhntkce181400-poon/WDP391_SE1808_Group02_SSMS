import axiosClient from './axiosClient';

const registrationService = {
  // UC43 - Validate Prerequisites
  validatePrerequisites: (classId) =>
    axiosClient.post('/registrations/validate', { classId }),

  // UC40 - Validate Class Capacity
  validateCapacity: (classId) =>
    axiosClient.post('/registrations/validate-capacity', { classId }),

  // UC33 - Validate Wallet Balance
  validateWallet: (classId) =>
    axiosClient.post('/registrations/validate-wallet', { classId }),

  // Combined validation
  validateAll: (classId) =>
    axiosClient.post('/registrations/validate-all', { classId }),
};

export default registrationService;
