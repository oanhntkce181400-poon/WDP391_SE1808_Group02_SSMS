// Axios client for mobile app (with refresh token)
import axios from 'axios';

const axiosClient = axios.create({
  baseURL: 'https://your-api-base-url.com/api',
});

axiosClient.interceptors.request.use((config) => {
  // TODO: attach access token from AsyncStorage/store
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
