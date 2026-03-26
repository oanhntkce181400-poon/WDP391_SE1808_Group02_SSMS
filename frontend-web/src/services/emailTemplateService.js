import axiosClient from './axiosClient';

const emailTemplateService = {
  getEmailTemplates(params) {
    return axiosClient.get('/email-templates', { params });
  },

  getEmailTemplate(id) {
    return axiosClient.get(`/email-templates/${id}`);
  },

  createEmailTemplate(data) {
    return axiosClient.post('/email-templates', data);
  },

  updateEmailTemplate(id, data) {
    return axiosClient.put(`/email-templates/${id}`, data);
  },

  deleteEmailTemplate(id) {
    return axiosClient.delete(`/email-templates/${id}`);
  },
};

export default emailTemplateService;
