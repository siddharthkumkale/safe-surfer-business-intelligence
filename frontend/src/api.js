const configuredDashboardUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, "");
const configuredApiOrigin = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "");

export const API_BASE_URL = configuredDashboardUrl
  ? configuredDashboardUrl.replace(/\/dashboard$/, "")
  : configuredApiOrigin
    ? `${configuredApiOrigin}/api`
    : "http://127.0.0.1:8000/api";

export const DASHBOARD_API_URL =
  configuredDashboardUrl || `${API_BASE_URL}/dashboard`;
