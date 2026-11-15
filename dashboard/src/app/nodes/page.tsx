"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Battery,
  BatteryCharging,
  BatteryWarning,
  CheckCircle,
  Clock,
  Filter,
  Radio,
  RefreshCw,
  Search,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { api } from "../../lib/api";
import { District, Node, Village } from "../../lib/types";

export const dynamic = "force-dynamic";

export default function NodesPage() {
  const { t } = useLanguage();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadNodes = async () => {
    setIsLoading(true);
    try {
      const [nodesData, villagesData, districtsData] = await Promise.all([
        api.getNodes(),
        api.getVillages(),
        api.getDistricts(),
      ]);
      setNodes(nodesData);
      setVillages(villagesData);
      setDistricts(districtsData);
    } catch (err) {
      console.error("Failed to load node fleet", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNodes();
  }, []);

  const getNodeHealth = (node: Node) => {
    const lastSeen = new Date(node.last_seen);
    const diffMinutes = (Date.now() - lastSeen.getTime()) / (1000 * 60);

    if (node.status === "offline" || diffMinutes > 240) {
      return { status: "offline", label: t("offline"), color: "bg-slate-700 text-slate-300", icon: <WifiOff className="w-3.5 h-3.5" /> };
    }
    if (diffMinutes > 60) {
      return { status: "stale", label: t("stale"), color: "bg-yellow-950 border-yellow-700 text-yellow-300", icon: <Clock className="w-3.5 h-3.5" /> };
    }
    if (node.battery_pct !== null && node.battery_pct !== undefined && node.battery_pct < 20) {
      return { status: "low_battery", label: t("low_battery"), color: "bg-orange-950 border-orange-700 text-orange-300 animate-pulse", icon: <BatteryWarning className="w-3.5 h-3.5" /> };
    }
    return { status: "online", label: t("online"), color: "bg-emerald-950 border-emerald-700 text-emerald-300", icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> };
  };

  const filteredNodes = nodes.filter((node) => {
    if (typeFilter !== "all" && node.type !== typeFilter) return false;
    const health = getNodeHealth(node);
    if (statusFilter !== "all" && health.status !== statusFilter) return false;

    if (searchQuery.trim()) {
      const vil = villages.find((v) => v.id === node.village_id);
      const query = searchQuery.toLowerCase();
      const match =
        String(node.id).includes(query) ||
        node.type.toLowerCase().includes(query) ||
        node.device_type.toLowerCase().includes(query) ||
        (vil && vil.name.toLowerCase().includes(query));
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Radio className="w-6 h-6 text-teal-400" />
            <span>{t("nav_nodes")}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Telemetry telemetry fleet diagnostics: ESP8266 hardware nodes, virtual API rain gauges, battery health, and sensor calibration.
          </p>
        </div>

        <button
          onClick={loadNodes}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-teal-400" : ""}`} />
          <span>Refresh Fleet</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Node ID, Type, Village..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-teal-500 font-medium"
          />
        </div>

        {/* Filter by Type */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 font-medium cursor-pointer"
        >
          <option value="all">Sensor Type: All</option>
          <option value="water_level">Water Level (Ultrasonic)</option>
          <option value="rain_gauge">Rain Gauge (Virtual/API)</option>
          <option value="soil_moisture">Soil Moisture (Capacitive)</option>
          <option value="temperature">Temperature (DHT11)</option>
          <option value="humidity">Humidity (DHT11)</option>
          <option value="seismic">Seismic Geophone</option>
        </select>

        {/* Filter by Status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 font-medium cursor-pointer"
        >
          <option value="all">Health: All</option>
          <option value="online">Online</option>
          <option value="stale">Stale (Delay &gt; 1h)</option>
          <option value="offline">Offline</option>
          <option value="low_battery">Low Battery (&lt; 20%)</option>
        </select>

        <span className="text-slate-400 font-mono text-xs ml-auto">
          {filteredNodes.length} nodes
        </span>
      </div>

      {/* Nodes Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Node ID & Type</th>
                <th className="px-4 py-3.5">Village Station</th>
                <th className="px-4 py-3.5">Health State</th>
                <th className="px-4 py-3.5">Battery</th>
                <th className="px-4 py-3.5">Hardware & Config</th>
                <th className="px-4 py-3.5">Last Seen</th>
                <th className="px-4 py-3.5 text-right">Station Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredNodes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    No sensor nodes found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredNodes.map((node) => {
                  const vil = villages.find((v) => v.id === node.village_id);
                  const health = getNodeHealth(node);
                  const lastSeenDate = new Date(node.last_seen);

                  return (
                    <tr key={node.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-extrabold text-sm text-slate-100 flex items-center gap-1.5">
                          <span>Node #{node.id}</span>
                          <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                            {node.device_type.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-teal-400 font-medium text-xs mt-0.5">
                          {node.type.replace("_", " ")}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-bold text-slate-200">
                          {vil?.name || `Village #${node.village_id}`}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Coords: {node.lat.toFixed(3)}, {node.lng.toFixed(3)}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-bold ${health.color}`}
                        >
                          {health.icon}
                          <span>{health.label}</span>
                        </span>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {node.battery_pct !== null && node.battery_pct !== undefined ? (
                          <div className="space-y-1 w-28">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold font-mono">{node.battery_pct}%</span>
                              <Battery className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  node.battery_pct < 20
                                    ? "bg-red-500"
                                    : node.battery_pct < 50
                                    ? "bg-amber-400"
                                    : "bg-emerald-400"
                                }`}
                                style={{ width: `${Math.min(100, node.battery_pct)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Mains / Virtual</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-[11px] text-slate-300">
                        {node.type === "water_level" && node.mount_height_cm && (
                          <div>Mount: <strong>{node.mount_height_cm} cm</strong></div>
                        )}
                        {node.type === "soil_moisture" && node.dry_calibration && (
                          <div>Cal: <strong>{node.dry_calibration} / {node.wet_calibration}</strong></div>
                        )}
                        {node.source === "api" && (
                          <div className="text-sky-400 font-semibold">Open-Meteo Virtual API</div>
                        )}
                        {node.source === "device" && (
                          <div className="text-slate-400">NodeMCU Direct Ingest</div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                        <div>{lastSeenDate.toLocaleTimeString()}</div>
                        <div className="text-[10px] text-slate-500">{lastSeenDate.toLocaleDateString()}</div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        <Link
                          href={`/villages/${node.village_id}`}
                          className="px-2.5 py-1 text-xs font-bold rounded bg-slate-800 text-teal-400 hover:bg-slate-700 hover:text-teal-300 transition-colors"
                        >
                          View Village →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
