import axiosClient from './axiosClient';

const revenueReportService = {
  getSummary: async (params) => {
    const response = await axiosClient.get('/revenue-reports/summary', { params });
    return response.data;
  },

  getTrend: async (params) => {
    const response = await axiosClient.get('/revenue-reports/trend', { params });
    return response.data;
  },

  getByMajor: async (params) => {
    const response = await axiosClient.get('/revenue-reports/by-major', { params });
    return response.data;
  },

  getByPaymentMethod: async (params) => {
    const response = await axiosClient.get('/revenue-reports/by-payment-method', { params });
    return response.data;
  },

  getStatusDistribution: async (params) => {
    const response = await axiosClient.get('/revenue-reports/status-distribution', { params });
    return response.data;
  },

  getTransactions: async (params) => {
    const response = await axiosClient.get('/revenue-reports/transactions', { params });
    return response.data;
  }
};

export default revenueReportService;
