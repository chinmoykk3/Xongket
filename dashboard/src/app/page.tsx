"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Home,
  Radio,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { DynamicAssamMap } from "../components/Map/DynamicMap";
import { LiveAlertFeed } from "../components/Alerts/LiveAlertFeed";
import { AlertBadge } from "../components/Alerts/AlertBadge";
import { useLanguage } from "../context/LanguageContext";
import { api } from "../lib/api";
import { District, Node, Shelter, VillageRiskSummary } from "../lib/types";

export const dynamic = "force-dynamic";

export default function OverviewPage() {
  const { t } = useLanguage();
  const [districts, setDistricts] = useState<District[]>([]);
  const [villages, setVillages] = useState<VillageRiskSummary[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [districtsData, riskData, nodesData, sheltersData] = await Promise.all([
        api.getDistricts(),
        api.getRiskSummary(),
        api.getNodes(),
        api.getShelters(),
      ]);
      setDistricts(districtsData);
      setVillages(riskData);
      setNodes(nodesData);
      setShelters(sheltersData);
    } catch (err: any) {
      console.error("Failed to load overview data", err);
      setError(err.message || "Failed to connect to disaster telemetry API.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    // Periodic refresh every 30s as safety polling fallback
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredVillages = villages.filter((v) => {
    if (selectedDistrict !== "all" && v.district_name.toLowerCase() !== selectedDistrict.toLowerCase()) {
      return false;
    }
    return true;
  });

  // Calculate metrics
  const activeAlertsCount = villages.reduce((acc, v) => acc + v.active_alerts_count, 0);
  const dangerVillagesCount = villages.filter((v) => v.risk_level === "danger").length;
  const warningVillagesCount = villages.filter((v) => v.risk_level === "warning").length;
  const charAreaCount = villages.filter((v) => v.is_char_area).length;
  const activeNodesCount = nodes.filter((n) => n.status === "active").length;
  const totalShelterCapacity = shelters.reduce((acc, s) => acc + s.capacity, 0);

  return (
    <div className="space-y-6 pb-10">
      {/* Top Banner & Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>{t("nav_overview")}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-950 border border-teal-700 text-teal-300">
              Assam Early-Warning Matrix
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time hydrological monitoring across Brahmaputra basin, river island chars, and landslide slopes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* District filter */}
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200 focus:outline-none focus:border-teal-500 cursor-pointer"
          >
            <option value="all">{t("all_districts")}</option>
            {districts.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>

          <button
            onClick={loadDashboardData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-teal-400" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Alerts */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t("active_alerts")}
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-950/60 border border-red-800 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{activeAlertsCount}</span>
            {dangerVillagesCount > 0 && (
              <span className="text-xs font-bold text-red-400">({dangerVillagesCount} Danger)</span>
            )}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {warningVillagesCount} villages under Warning threshold
          </div>
        </div>

        {/* Monitored Villages */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t("monitored_villages")}
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-950/60 border border-teal-800 flex items-center justify-center text-teal-400">
              <Home className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{villages.length}</span>
            <span className="text-xs font-semibold text-amber-400">({charAreaCount} Chars)</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Across 4 high-vulnerability districts</div>
        </div>

        {/* Active IoT Nodes */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t("active_nodes")}
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-950/60 border border-sky-800 flex items-center justify-center text-sky-400">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{activeNodesCount}</span>
            <span className="text-xs font-semibold text-slate-400">/ {nodes.length} Total</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-400 font-medium">
            Ultrasonic, Soil & Rain Virtual Nodes
          </div>
        </div>

        {/* Relief Shelters */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t("evacuation_shelters")}
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-950/60 border border-blue-800 flex items-center justify-center text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{shelters.length}</span>
            <span className="text-xs font-semibold text-blue-400">
              ({totalShelterCapacity.toLocaleString()} Cap.)
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Pre-assigned emergency capacity</div>
        </div>
      </div>

      {/* Main Geospatial & Real-time Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Map & Village Risk Matrix */}
        <div className="lg:col-span-8 space-y-6">
          <div className="relative">
            <DynamicAssamMap
              villages={filteredVillages}
              nodes={nodes}
              shelters={shelters}
            />
          </div>

          {/* Village Risk Matrix Cards */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Village Hydrological Matrix
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select a village station for in-depth time-series charts and AI flood forecasts.
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {filteredVillages.length} stations
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
              {filteredVillages.map((v) => (
                <Link
                  key={v.village_id}
                  href={`/villages/${v.village_id}`}
                  className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/50 hover:bg-slate-800/70 hover:border-slate-700 transition-all flex flex-col justify-between group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {v.district_name} District
                      </div>
                      <div className="font-extrabold text-sm text-slate-100 group-hover:text-teal-400 transition-colors flex items-center gap-1.5">
                        <span>{v.village_name}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <AlertBadge severity={v.risk_level} size="sm" />
                  </div>

                  {v.is_char_area && (
                    <span className="text-[10px] font-semibold text-amber-400 mt-1 inline-block">
                      ★ {t("char_area")}
                    </span>
                  )}

                  <div className="mt-3 pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-1 text-[11px] text-slate-300">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Water</span>
                      <strong>
                        {v.latest_water_level_cm !== null && v.latest_water_level_cm !== undefined
                          ? `${v.latest_water_level_cm.toFixed(0)}cm`
                          : "—"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Rain (1h)</span>
                      <strong>
                        {v.latest_rainfall_mm !== null && v.latest_rainfall_mm !== undefined
                          ? `${v.latest_rainfall_mm.toFixed(1)}mm`
                          : "—"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Soil</span>
                      <strong>
                        {v.latest_soil_moisture_pct !== null && v.latest_soil_moisture_pct !== undefined
                          ? `${v.latest_soil_moisture_pct.toFixed(0)}%`
                          : "—"}
                      </strong>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live WebSocket Alerts Feed */}
        <div className="lg:col-span-4 h-[680px]">
          <LiveAlertFeed />
        </div>
      </div>
    </div>
  );
}
