import axiosClient from './axiosClient';

const transcriptService = {
  /**
   * Lấy preview bảng điểm
   */
  getPreview: async (options = {}) => {
    const response = await axiosClient.get('/grades/transcript/preview', { params: options });
    return response.data;
  },

  /**
   * Tải bảng điểm PDF
   */
  downloadTranscript: async (options = {}) => {
    try {
      const response = await axiosClient.get('/grades/transcript/generate', {
        params: options,
        responseType: 'blob'
      });
      
      // Create blob URL
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `BangDiem_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Lấy preview bảng điểm của sinh viên cụ thể (Admin/Staff)
   */
  getStudentPreview: async (studentId, options = {}) => {
    const response = await axiosClient.get(`/grades/transcript/preview/${studentId}`, { params: options });
    return response.data;
  },

  /**
   * Tải bảng điểm PDF của sinh viên cụ thể (Admin/Staff)
   */
  downloadStudentTranscript: async (studentId, options = {}) => {
    try {
      const response = await axiosClient.get(`/grades/transcript/generate/${studentId}`, {
        params: options,
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `BangDiem_${studentId}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      throw error;
    }
  }
};

export default transcriptService;
