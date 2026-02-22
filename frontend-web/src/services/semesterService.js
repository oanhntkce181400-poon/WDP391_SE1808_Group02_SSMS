import axiosClient from "./axiosClient";

const semesterService = {
  getAll(params) {
    return axiosClient.get("/semesters", { params });
  },
  getById(id) {
    return axiosClient.get(`/semesters/${id}`);
  },
  create(data) {
    return axiosClient.post("/semesters", data);
  },
  update(id, data) {
    return axiosClient.put(`/semesters/${id}`, data);
  },
  remove(id) {
    return axiosClient.delete(`/semesters/${id}`);
  },
};

export default semesterService;
