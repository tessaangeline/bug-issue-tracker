import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    Accept: "application/json",
  },
});

type RetryConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

let refreshInProgress: Promise<string> | null = null;

api.interceptors.request.use((config) => {
  const accessToken = sessionStorage.getItem("access_token");

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryConfig | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/refresh") ||
      originalRequest.url?.includes("/auth/logout")
    ) {
      return Promise.reject(error);
    }

    const refreshToken = sessionStorage.getItem("refresh_token");

    if (!refreshToken) {
      sessionStorage.removeItem("access_token");
      window.location.href = "/login";
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshInProgress) {
        refreshInProgress = axios
          .post(
            `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
            null,
            {
              params: { refresh_token: refreshToken },
              headers: { Accept: "application/json" },
            }
          )
          .then((response) => {
            const newAccessToken = response.data.access_token as string;
            sessionStorage.setItem("access_token", newAccessToken);
            return newAccessToken;
          })
          .finally(() => {
            refreshInProgress = null;
          });
      }

      const newAccessToken = await refreshInProgress;
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      sessionStorage.removeItem("access_token");
      sessionStorage.removeItem("refresh_token");
      window.location.href = "/login";
      return Promise.reject(refreshError);
    }
  }
);

export default api;
