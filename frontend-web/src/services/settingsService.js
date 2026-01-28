import axiosClient from './axiosClient';

const settingsService = {
  // Get system settings
  getSettings: () => {
    return axiosClient.get('/settings');
  },

  // Update system settings
  updateSettings: (data, file) => {
    const formData = new FormData();
    
    // Add fields
    Object.keys(data).forEach((key) => {
      if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key]);
      }
    });

    // Add logo file if provided
    if (file) {
      formData.append('logo', file);
    }

    return axiosClient.patch('/settings', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export default settingsService;
