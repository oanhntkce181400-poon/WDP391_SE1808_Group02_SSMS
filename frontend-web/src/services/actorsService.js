import axiosClient from './axiosClient';

const actorsService = {
  getRoles() {
    return axiosClient.get('/actors/roles');
  },
  createRole(payload) {
    return axiosClient.post('/actors/roles', payload);
  },
  updateRole(roleId, payload) {
    return axiosClient.patch(`/actors/roles/${roleId}`, payload);
  },
  getPermissions() {
    return axiosClient.get('/actors/permissions');
  },
  createPermission(payload) {
    return axiosClient.post('/actors/permissions', payload);
  },
  updatePermission(permissionId, payload) {
    return axiosClient.patch(`/actors/permissions/${permissionId}`, payload);
  },
};

export default actorsService;

