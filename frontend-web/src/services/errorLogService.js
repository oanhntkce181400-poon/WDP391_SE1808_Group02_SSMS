import axiosClient from './axiosClient';

const errorLogService = {
  // Get all error logs with pagination and filters
  getErrorLogs(params = {}) {
    return axiosClient.get('/api/error-logs', { params });
  },

  // Get a single error log by ID
  getErrorLogById(id) {
    return axiosClient.get(`/api/error-logs/${id}`);
  },

  // Get error statistics
  getErrorStats() {
    return axiosClient.get('/api/error-logs/stats');
  },

  // Clear old error logs
  clearOldLogs(days = 30) {
    return axiosClient.delete(`/api/error-logs/clear?days=${days}`);
  },
};

export default errorLogService;
