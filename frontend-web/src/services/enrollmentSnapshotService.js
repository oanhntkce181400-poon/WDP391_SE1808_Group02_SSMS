import axiosClient from "./axiosClient";

const enrollmentSnapshotService = {
  list(params = {}) {
    return axiosClient.get("/enrollment-snapshots", { params });
  },
  getById(id) {
    return axiosClient.get(`/enrollment-snapshots/${id}`);
  },
  create(payload) {
    return axiosClient.post("/enrollment-snapshots", payload);
  },
  update(id, payload) {
    return axiosClient.put(`/enrollment-snapshots/${id}`, payload);
  },
  remove(id) {
    return axiosClient.delete(`/enrollment-snapshots/${id}`);
  },
  /** Lấy danh sách lớp (classSection) có trong snapshot */
  getClassSections(snapshotId) {
    return axiosClient.get(`/enrollment-snapshots/${snapshotId}/class-sections`);
  },
  /** Lấy roster (sinh viên) của một lớp cụ thể trong snapshot */
  getRoster(snapshotId, classSectionId, slotId) {
    const params = { classSectionId };
    if (slotId) params.slotId = slotId;
    return axiosClient.get(`/enrollment-snapshots/${snapshotId}/roster`, { params });
  },

  /** Thêm sinh viên vào snapshot — enroll vào tất cả classSections trong snapshot */
  addStudentsToSnapshot(snapshotId, studentCodes) {
    return axiosClient.post(`/enrollment-snapshots/${snapshotId}/add-students`, {
      studentCodes,
    });
  },
};

export default enrollmentSnapshotService;
