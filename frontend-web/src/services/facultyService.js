import axiosClient from "./axiosClient";

const facultyService = {
  getFaculties(params) {
    return axiosClient.get("/faculties", { params });
  },

  createFaculty(data) {
    return axiosClient.post("/faculties", data);
  },

  updateFaculty(id, data) {
    return axiosClient.put(`/faculties/${id}`, data);
  },

  deleteFaculty(id) {
    return axiosClient.delete(`/faculties/${id}`);
  },

  exportFaculties(params) {
    return axiosClient.get("/faculties/export", {
      params,
      responseType: "blob",
    });
  },
};

export default facultyService;
