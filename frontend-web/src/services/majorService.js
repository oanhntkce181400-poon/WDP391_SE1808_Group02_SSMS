import axiosClient from "./axiosClient";

const majorService = {
  getMajors(params) {
    return axiosClient.get("/majors", { params });
  },

  createMajor(data) {
    return axiosClient.post("/majors", data);
  },

  updateMajor(id, data) {
    return axiosClient.put(`/majors/${id}`, data);
  },

  deleteMajor(id) {
    return axiosClient.delete(`/majors/${id}`);
  },

  exportMajors(params) {
    return axiosClient.get("/majors/export", {
      params,
      responseType: "blob",
    });
  },
};

export default majorService;
