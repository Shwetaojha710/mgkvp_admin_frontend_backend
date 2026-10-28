import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

/** Local clone uploads served by this project's Express API */
export const uploadBaseUrl = import.meta.env.VITE_UPLOAD_BASE_URL || 'http://localhost:5000';

/** Imported MGKVP source media (read-only paths like ~/Uploads/...) */
export const mediaBaseUrl = import.meta.env.VITE_MEDIA_BASE_URL || 'https://mgkvp.ac.in';

/**
 * Resolve file/image URLs for display.
 * - Absolute http(s) URLs are returned as-is
 * - ASP.NET paths (~/Uploads/..., /Uploads/...) → https://mgkvp.ac.in/...
 * - Clone API uploads (/uploads/...) → localhost backend
 */
export function fileUrl(path) {
  if (!path) return '';

  let p = String(path).trim();
  if (/^https?:\/\//i.test(p)) return p;

  // ASP.NET app-relative: ~/Uploads/NobleAlumni/6.jpg → /Uploads/NobleAlumni/6.jpg
  if (p.startsWith('~/')) p = p.slice(1);
  else if (p.startsWith('~')) p = `/${p.slice(1)}`;

  // Source-site media folders from MGKVP_WEBSITE_MAIN import
  if (/^\/?(Uploads|UploadedFiles)\//i.test(p)) {
    if (!p.startsWith('/')) p = `/${p}`;
    return `${mediaBaseUrl.replace(/\/$/, '')}${p}`;
  }

  // Local clone storage
  if (!p.startsWith('/')) p = `/${p}`;
  return `${uploadBaseUrl.replace(/\/$/, '')}${p}`;
}
