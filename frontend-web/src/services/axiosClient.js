// Axios client with interceptors (Refresh Token - Task #2)
import axios from 'axios';

const axiosClient = axios.create({
  baseURL: '/api',
});

axiosClient.interceptors.request.use((config) => {
  // TODO: attach access token
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // TODO: handle refresh token logic
    throw error;
  },
);

export default axiosClient;
