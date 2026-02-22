import axiosClient from "./axiosClient";

const roomService = {
  getRooms(params) {
    return axiosClient.get("/rooms", { params });
  },
  getRoom(id) {
    return axiosClient.get(`/rooms/${id}`);
  },
  createRoom(data) {
    return axiosClient.post("/rooms", data);
  },
  updateRoom(id, data) {
    return axiosClient.put(`/rooms/${id}`, data);
  },
  deleteRoom(id) {
    return axiosClient.delete(`/rooms/${id}`);
  },
  searchRooms(keyword) {
    return axiosClient.get("/rooms/search", { params: { keyword } });
  },
  exportRooms() {
    return axiosClient.get("/rooms/export", { responseType: "blob" });
  },
  importRooms(formData) {
    return axiosClient.post("/rooms/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

export default roomService;
