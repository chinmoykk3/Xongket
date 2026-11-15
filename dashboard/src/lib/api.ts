import {
  Alert,
  Contact,
  District,
  Forecast,
  LandslideRisk,
  Node,
  Reading,
  Shelter,
  User,
  Village,
  VillageRiskSummary,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("xongket_jwt");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...getAuthHeader(),
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    let errorDetail = res.statusText;
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
    } catch {
      // ignore
    }
    throw new Error(`API Error [${res.status}]: ${errorDetail}`);
  }
  return res.json();
}

export const api = {
  // Auth
  login: async (username: string, password: string): Promise<{ access_token: string; role: string; username: string }> => {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },
  getMe: async (): Promise<User> => {
    return request("/auth/me");
  },

  // Telemetry & Spatial
  getDistricts: (): Promise<District[]> => request("/districts"),
  getVillages: (params?: { district_id?: number; is_char_area?: boolean; language?: string }): Promise<Village[]> => {
    const q = new URLSearchParams();
    if (params?.district_id) q.set("district_id", String(params.district_id));
    if (params?.is_char_area !== undefined) q.set("is_char_area", String(params.is_char_area));
    if (params?.language) q.set("language", params.language);
    return request(`/villages?${q.toString()}`);
  },
  getShelters: (): Promise<Shelter[]> => request("/shelters"),
  getNodes: (params?: { village_id?: number; type?: string; status?: string }): Promise<Node[]> => {
    const q = new URLSearchParams();
    if (params?.village_id) q.set("village_id", String(params.village_id));
    if (params?.type) q.set("type", params.type);
    if (params?.status) q.set("status", params.status);
    return request(`/nodes?${q.toString()}`);
  },
  getNodeReadings: (
    nodeId: number,
    params?: { start_ts?: string; end_ts?: string; limit?: number; downsample_interval?: string }
  ): Promise<Reading[]> => {
    const q = new URLSearchParams();
    if (params?.start_ts) q.set("start_ts", params.start_ts);
    if (params?.end_ts) q.set("end_ts", params.end_ts);
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.downsample_interval) q.set("downsample_interval", params.downsample_interval);
    return request(`/nodes/${nodeId}/readings?${q.toString()}`);
  },
  getRiskSummary: (): Promise<VillageRiskSummary[]> => request("/risk-summary"),

  // Alerts
  getAlerts: (params?: {
    village_id?: number;
    severity?: string;
    hazard?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Alert[]> => {
    const q = new URLSearchParams();
    if (params?.village_id) q.set("village_id", String(params.village_id));
    if (params?.severity) q.set("severity", params.severity);
    if (params?.hazard) q.set("hazard", params.hazard);
    if (params?.status) q.set("status", params.status);
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.offset) q.set("offset", String(params.offset));
    return request(`/alerts?${q.toString()}`);
  },
  acknowledgeAlert: (alertId: number, notes?: string): Promise<Alert> => {
    return request(`/alerts/${alertId}/acknowledge`, {
      method: "PATCH",
      body: JSON.stringify({ notes }),
    });
  },
  createManualAlert: (data: {
    village_id: number;
    severity: string;
    hazard: string;
    message: string;
  }): Promise<Alert> => {
    return request("/alerts/manual", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // AI & Geotechnical
  getNodeForecasts: (nodeId: number): Promise<Forecast[]> => {
    return request(`/nodes/${nodeId}/forecasts`);
  },
  getVillageLandslideRisk: (villageId: number, slope: string = "moderate"): Promise<LandslideRisk> => {
    return request(`/villages/${villageId}/landslide-risk?slope=${encodeURIComponent(slope)}`);
  },
  triggerForecasts: (): Promise<{ status: string; forecasts_count: number }> => {
    return request("/forecasts/trigger", { method: "POST" });
  },
};
