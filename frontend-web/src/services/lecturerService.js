import axiosClient from "./axiosClient";

const lecturerService = {
  getAll(params) {
    return axiosClient.get("/lecturers", { params });
  },
  getById(id) {
    return axiosClient.get(`/lecturers/${id}`);
  },
  /** data is FormData when avatar file is included, else plain object */
  create(data) {
    const isFormData = data instanceof FormData;
    return axiosClient.post("/lecturers", data, {
      headers: isFormData ? { "Content-Type": "multipart/form-data" } : {},
    });
  },
  /** data is FormData when avatar file is included, else plain object */
  update(id, data) {
    const isFormData = data instanceof FormData;
    return axiosClient.put(`/lecturers/${id}`, data, {
      headers: isFormData ? { "Content-Type": "multipart/form-data" } : {},
    });
  },
  toggleStatus(id, isActive) {
    return axiosClient.put(`/lecturers/${id}`, { isActive });
  },
  remove(id) {
    return axiosClient.delete(`/lecturers/${id}`);
  },
};

export default lecturerService;
