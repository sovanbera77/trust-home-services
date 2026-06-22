export const config = {
  apiUrl: import.meta.env.VITE_API_URL as string || 'http://localhost:5000/api',
  appName: import.meta.env.VITE_APP_NAME as string || 'Trust Home Services',
  appVersion: import.meta.env.VITE_APP_VERSION as string || '1.0.0',
  useBackend: true, // Force useBackend to true to integrate with HRMS
};
