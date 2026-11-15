export type Language = "en" | "as";

export type UserRole = "admin" | "district_officer" | "volunteer";

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  district_id?: number | null;
  is_active: boolean;
}

export interface District {
  id: number;
  name: string;
  state: string;
}

export interface Shelter {
  id: number;
  name: string;
  lat: number;
  lng: number;
  capacity: number;
}

export interface Village {
  id: number;
  district_id: number;
  name: string;
  lat: number;
  lng: number;
  population: number;
  language: "assamese" | "bodo" | "bengali" | "hindi";
  is_char_area: boolean;
  nearest_shelter_id?: number | null;
}

export type NodeType = "water_level" | "rain_gauge" | "soil_moisture" | "seismic" | "temperature" | "humidity";
export type NodeStatus = "active" | "offline" | "maintenance" | "error";

export interface Node {
  id: number;
  village_id: number;
  type: NodeType;
  lat: number;
  lng: number;
  status: NodeStatus;
  battery_pct?: number | null;
  last_seen: string;
  device_type: "esp8266" | "esp32";
  source: string;
  mount_height_cm?: number | null;
  dry_calibration?: number | null;
  wet_calibration?: number | null;
}

export interface Reading {
  id: number;
  node_id: number;
  ts: string;
  value: number;
  unit: string;
  quality_flag: string;
}

export type AlertSeverity = "advisory" | "warning" | "danger";
export type AlertHazard = "flood" | "landslide" | "earthquake";
export type AlertStatus = "active" | "acknowledged" | "resolved";

export interface AlertDelivery {
  id: number;
  alert_id: number;
  channel: "sms" | "ivr" | "whatsapp" | "siren" | "dashboard";
  status: "pending" | "sent" | "delivered" | "failed";
  sent_at?: string | null;
}

export interface Alert {
  id: number;
  village_id: number;
  village_name?: string;
  district_name?: string;
  severity: AlertSeverity;
  hazard: AlertHazard;
  message: string;
  created_at: string;
  status: AlertStatus;
  source: "rule" | "ai" | "manual";
  deliveries?: AlertDelivery[];
  lead_time_hours?: number;
  explanation?: string;
}

export interface VillageRiskSummary {
  village_id: number;
  village_name: string;
  district_name: string;
  is_char_area: boolean;
  language: string;
  risk_level: "normal" | "advisory" | "warning" | "danger";
  active_alerts_count: number;
  highest_severity?: AlertSeverity | null;
  latest_water_level_cm?: number | null;
  latest_rainfall_mm?: number | null;
  latest_soil_moisture_pct?: number | null;
}

export interface Forecast {
  id: number;
  node_id: number;
  generated_at: string;
  target_ts: string;
  horizon_hours: number;
  predicted_value: number;
  lower_bound: number;
  upper_bound: number;
  unit: string;
  model_name: string;
  explanation?: string;
}

export interface LandslideRisk {
  village_id: number;
  village_name: string;
  risk_score: number;
  severity: "normal" | "advisory" | "warning" | "danger";
  soil_moisture_pct: number;
  rainfall_24h_mm: number;
  rainfall_72h_mm: number;
  slope_class: string;
  explanation: string;
  contributing_factors: Record<string, any>;
}

export interface Contact {
  id: number;
  village_id: number;
  name: string;
  phone: string;
  role: "volunteer" | "gram_panchayat" | "asdma";
}
