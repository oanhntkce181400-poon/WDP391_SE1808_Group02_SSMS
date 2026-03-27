import axiosClient from './axiosClient';

const performanceReportService = {
  getOverview: async (params = {}) => {
    const response = await axiosClient.get('/performance-reports/overview', { params });
    return response.data;
  },

  getGPADistribution: async (params = {}) => {
    const response = await axiosClient.get('/performance-reports/gpa-distribution', { params });
    return response.data;
  },

  getGPABySemester: async (params = {}) => {
    const response = await axiosClient.get('/performance-reports/gpa-by-semester', { params });
    return response.data;
  },

  getTopStudents: async (params = {}) => {
    const response = await axiosClient.get('/performance-reports/top-students', { params });
    return response.data;
  },

  getAtRiskStudents: async (params = {}) => {
    const response = await axiosClient.get('/performance-reports/at-risk-students', { params });
    return response.data;
  }
};

export default performanceReportService;
