import axios from 'axios';
import { getClerkToken } from '@infrastructure/auth/clerk';

const apiClient = axios.create({
  baseURL: __DEV__
    ? 'http://localhost:3000/api/coaching'
    : 'https://mrtraining.app/api/coaching',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getClerkToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // session expired — Clerk handles re-auth
    }
    return Promise.reject(error);
  },
);

export { apiClient };
