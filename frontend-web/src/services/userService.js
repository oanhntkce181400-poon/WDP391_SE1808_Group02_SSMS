import axiosClient from './axiosClient';

const userService = {
  importUsers(formData) {
    return axiosClient.post('/users/import', formData);
  },
  getUsers(params) {
    return axiosClient.get('/users', { params });
  },
  // Get current user profile
  getProfile: () => {
    return axiosClient.get('/users/profile');
  },

  // Update user by admin (role, status)
  updateUser: (userId, data) => {
    return axiosClient.patch(`/users/${userId}`, data);
  },

  // Delete user by admin
  deleteUser: (userId) => {
    return axiosClient.delete(`/users/${userId}`);
  },

  // Update user avatar
  updateAvatar: (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('avatar', file);

    return axiosClient.patch('/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onUploadProgress,
    });
  },

  // Update user profile
  updateProfile: (data) => {
    return axiosClient.patch('/users/profile', data);
  },
};

export default userService;
