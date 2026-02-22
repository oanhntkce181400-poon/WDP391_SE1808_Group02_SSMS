import axiosClient from './axiosClient';

const roomService = {
  getRooms(params) {
    return axiosClient.get('/api/rooms', { params });
  },
  getRoom(id) {
    return axiosClient.get(`/api/rooms/${id}`);
  },
  createRoom(data) {
    return axiosClient.post('/api/rooms', data);
  },
  updateRoom(id, data) {
    return axiosClient.put(`/api/rooms/${id}`, data);
  },
  deleteRoom(id) {
    return axiosClient.delete(`/api/rooms/${id}`);
  },
  searchRooms(keyword) {
    return axiosClient.get('/api/rooms/search', { params: { keyword } });
  },
  exportRooms() {
    return axiosClient.get('/api/rooms/export', { responseType: 'blob' });
  },
  importRooms(formData) {
    return axiosClient.post('/api/rooms/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default roomService;
