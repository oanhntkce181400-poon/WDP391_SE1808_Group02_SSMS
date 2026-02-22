import axiosClient from "./axiosClient";

const timeslotService = {
  getTimeslots(params) {
    return axiosClient.get("/timeslots", { params });
  },
  getTimeslot(id) {
    return axiosClient.get(`/timeslots/${id}`);
  },
  createTimeslot(data) {
    return axiosClient.post("/timeslots", data);
  },
  updateTimeslot(id, data) {
    return axiosClient.put(`/timeslots/${id}`, data);
  },
  deleteTimeslot(id) {
    return axiosClient.delete(`/timeslots/${id}`);
  },
  searchTimeslots(keyword) {
    return axiosClient.get("/timeslots/search", { params: { keyword } });
  },
};

export default timeslotService;
