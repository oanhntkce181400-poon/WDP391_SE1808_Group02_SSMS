// Room Service - API calls for Room CRUD operations
import axiosClient from './axiosClient';

const roomService = {
  // Get all rooms with optional pagination and filters
  getRooms(params) {
    return axiosClient.get('/api/rooms', { params });
  },

  // Get single room by ID
  getRoom(id) {
    return axiosClient.get(`/api/rooms/${id}`);
  },

  // Create new room
  createRoom(data) {
    return axiosClient.post('/api/rooms', data);
  },

  // Update existing room
  updateRoom(id, data) {
    return axiosClient.put(`/api/rooms/${id}`, data);
  },

  // Delete room
  deleteRoom(id) {
    return axiosClient.delete(`/api/rooms/${id}`);
  },

  // Search rooms by code or name
  searchRooms(keyword) {
    return axiosClient.get('/api/rooms/search', { params: { keyword } });
  },

  // Export rooms to Excel
  exportRooms() {
    return axiosClient.get('/api/rooms/export', { responseType: 'blob' });
  },

  // Import rooms from Excel
  importRooms(formData) {
    return axiosClient.post('/api/rooms/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export default roomService;
