import axiosClient from "./axiosClient";

const subjectService = {
  getSubjects(params) {
    return axiosClient.get("/subjects", { params });
  },
  getSubject(id) {
    return axiosClient.get(`/subjects/${id}`);
  },
  createSubject(data) {
    return axiosClient.post("/subjects", data);
  },
  updateSubject(id, data) {
    return axiosClient.put(`/subjects/${id}`, data);
  },
  deleteSubject(id) {
    return axiosClient.delete(`/subjects/${id}`);
  },
  searchSubjects(keyword) {
    return axiosClient.get("/subjects/search", { params: { keyword } });
  },
  exportSubjects() {
    return axiosClient.get("/subjects/export", { responseType: "blob" });
  },
  importSubjects(formData) {
    return axiosClient.post("/subjects/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  updatePrerequisites(id, prerequisites) {
    return axiosClient.put(`/subjects/${id}/prerequisites`, { prerequisites });
  },
  getPrerequisites(id) {
    return axiosClient.get(`/subjects/${id}/prerequisites`);
  },
};

export default subjectService;
