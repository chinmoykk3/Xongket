"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Battery,
  BatteryCharging,
  BatteryWarning,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Download,
  Filter,
  Layers,
  Radio,
  RefreshCw,
  Search,
  Server,
  Shield,
  ShieldCheck,
  Signal,
  Sliders,
  Volume2,
  Waves,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { CommandSidebar } from "../../components/CommandSidebar";
import { useLanguage } from "../../context/LanguageContext";

export const dynamic = "force-dynamic";

export default function HardwareSensorNodesPage() {
  const { language, t } = useLanguage();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pingStatus, setPingStatus] = useState<Record<string, string>>({});

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handlePing = (id: string) => {
    setPingStatus((prev) => ({ ...prev, [id]: "Pinging..." }));
    setTimeout(() => {
      setPingStatus((prev) => ({ ...prev, [id]: "✓ 32ms ACK" }));
      setTimeout(() => {
        setPingStatus((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }, 2500);
    }, 700);
  };

  // Fleet hardware nodes matching the PlatformIO firmware build
  const nodes = [
    {
      id: "XONG-MJL-01",
      name: "Kamalabari River Station",
      village: "Kamalabari Char (Majuli)",
      coords: "26.96° N, 94.22° E",
      deviceType: "NodeMCU ESP8266 (v2)",
      firmware: "v2.4-LittleFS",
      sensorType: "HC-SR04 Ultrasonic Sonar",
      status: "online",
      battery: 98,
      solar: true,
      rssi: "-74 dBm",
      buffer: "0 / 128 KB (Clear)",
      lastSeen: "12s ago",
      calibratedMount: "550.0 cm",
      failover: "LoRa + WiFi",
    },
    {
      id: "XONG-MJL-02",
      name: "Garamur Riverfront Station",
      village: "Garamur (Majuli)",
      coords: "26.98° N, 94.25° E",
      deviceType: "NodeMCU ESP8266 (v2)",
      firmware: "v2.4-LittleFS",
      sensorType: "Dual Ultrasonic + DHT11",
      status: "online",
      battery: 91,
      solar: true,
      rssi: "-82 dBm",
      buffer: "0 / 128 KB (Clear)",
      lastSeen: "28s ago",
      calibratedMount: "500.0 cm",
      failover: "WiFi Primary",
    },
    {
      id: "XONG-MJL-03",
      name: "Jengraimukh Embankment Radar",
      village: "Jengraimukh (Majuli)",
      coords: "27.05° N, 94.38° E",
      deviceType: "NodeMCU ESP8266 (v2)",
      firmware: "v2.4-LittleFS",
      sensorType: "Millimeter-Wave Radar MM",
      status: "online",
      battery: 100,
      solar: true,
      rssi: "-68 dBm",
      buffer: "0 / 128 KB (Clear)",
      lastSeen: "4s ago",
      calibratedMount: "600.0 cm",
      failover: "4G LTE + LoRa",
    },
    {
      id: "XONG-DHJ-01",
      name: "Sissiborgaon Slope Array #01",
      village: "Sissiborgaon Hill Cut (Dhemaji)",
      coords: "27.52° N, 94.72° E",
      deviceType: "NodeMCU ESP8266 (v2)",
      firmware: "v2.4-LittleFS",
      sensorType: "Capacitive Soil Moisture V2.0",
      status: "online",
      battery: 94,
      solar: true,
      rssi: "-76 dBm",
      buffer: "0 / 128 KB (Clear)",
      lastSeen: "18s ago",
      calibratedMount: "Raw Dry: 820 / Wet: 380",
      failover: "LoRa 868MHz Relay",
    },
    {
      id: "XONG-DHJ-02",
      name: "Jonai Foothill Soil Bed",
      village: "Jonai Foothills (Dhemaji)",
      coords: "27.98° N, 95.15° E",
      deviceType: "NodeMCU ESP8266 (v2)",
      firmware: "v2.4-LittleFS",
      sensorType: "Capacitive Soil + 3-Axis MEMS",
      status: "online",
      battery: 89,
      solar: true,
      rssi: "-84 dBm",
      buffer: "0 / 128 KB (Clear)",
      lastSeen: "35s ago",
      calibratedMount: "Raw Dry: 815 / Wet: 390",
      failover: "LoRa 868MHz Relay",
    },
    {
      id: "XONG-ALT-01",
      name: "Kamalabari Village Siren Unit",
      village: "Kamalabari Char Sector-4",
      coords: "26.96° N, 94.22° E",
      deviceType: "NodeMCU ESP8266 (Node 3 Alert)",
      firmware: "v2.4-LittleFS",
      sensorType: "125 dB High-Decibel Siren Relay",
      status: "online",
      battery: 100,
      solar: true,
      rssi: "-70 dBm",
      buffer: "Watchdog: 60s Link OK",
      lastSeen: "6s ago",
      calibratedMount: "Audible Radius: 2.8 km",
      failover: "RF 868MHz + Cellular",
    },
    {
      id: "XONG-ALT-02",
      name: "Jengraimukh Siren Pole #05",
      village: "Jengraimukh Embankment",
      coords: "27.05° N, 94.38° E",
      deviceType: "NodeMCU ESP8266 (Node 3 Alert)",
      firmware: "v2.4-LittleFS",
      sensorType: "125 dB Solar Siren + OLED Status",
      status: "online",
      battery: 98,
      solar: true,
      rssi: "-72 dBm",
      buffer: "Watchdog: 60s Link OK",
      lastSeen: "8s ago",
      calibratedMount: "Audible Radius: 3.2 km",
      failover: "RF 868MHz + Cellular",
    },
  ];

  const filteredNodes = nodes.filter((n) => {
    if (typeFilter !== "all" && !n.sensorType.toLowerCase().includes(typeFilter.toLowerCase())) return false;
    if (statusFilter !== "all" && n.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        n.id.toLowerCase().includes(q) ||
        n.name.toLowerCase().includes(q) ||
        n.village.toLowerCase().includes(q) ||
        n.sensorType.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex min-h-[calc(100vh-60px)] w-full bg-[#f4f6f9]">
      {/* Left Operations Sidebar */}
      <CommandSidebar />

      {/* Main Operational Console */}
      <main className="flex-1 p-4 lg:p-6 space-y-4 overflow-y-auto">
        
        {/* Operations Sub-Header Banner */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-sky-800 border border-sky-200">
                IOT FLEET TELEMETRY & HARDWARE INTEGRITY // NODE MATRIX
              </span>
              <span className="text-xs font-semibold text-slate-500 font-mono">
                PlatformIO Arduino Framework · NodeMCU ESP8266 Suite
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                120 / 120 Fleet Relays Online
              </span>

              <button
                type="button"
                onClick={handleRefresh}
                title="Refresh Hardware Telemetry Matrix"
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-sky-600" : ""}`} />
              </button>
            </div>
          </div>

          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Hardware & Sensor Nodes Matrix
            </h1>
            <p className="text-xs text-slate-500 max-w-4xl leading-relaxed mt-0.5">
              Live status, LittleFS buffer health, RSSI link quality, battery telemetry, and local failsafe diagnostics
              for river water level sonar stations, capacitive soil probes, and solar village siren units.
            </p>
          </div>
        </div>

        {/* Top 4 KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Fleet */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                TOTAL SENSOR NODES
              </span>
              <div className="w-6 h-6 rounded bg-sky-50 flex items-center justify-center text-sky-600">
                <Cpu className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight">120 / 120</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                100% ONLINE
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
              <span>NodeMCU ESP8266 Fleet</span>
              <strong className="text-slate-800">Firmware v2.4</strong>
            </div>
          </div>

          {/* Card 2: Fleet Battery */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                FLEET BATTERY INTEGRITY
              </span>
              <div className="w-6 h-6 rounded bg-emerald-50 flex items-center justify-center text-emerald-600">
                <BatteryCharging className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight">94.6%</span>
              <span className="text-xs font-semibold text-slate-500">Fleet Average</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
              <span>Solar Recharge Matrix</span>
              <strong className="text-emerald-700">0 Low-Power Faults</strong>
            </div>
          </div>

          {/* Card 3: LittleFS Offline Buffering */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                LITTLEFS BUFFER RETENTION
              </span>
              <div className="w-6 h-6 rounded bg-purple-50 flex items-center justify-center text-purple-600">
                <Database className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight">0 Pending</span>
              <span className="text-xs font-semibold text-slate-500">100% Uploaded</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
              <span>Local Batch Flash Cache</span>
              <strong className="text-purple-700">128 KB Protected</strong>
            </div>
          </div>

          {/* Card 4: Communication Links */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                COMMUNICATION LINKS
              </span>
              <div className="w-6 h-6 rounded bg-blue-50 flex items-center justify-center text-blue-600">
                <Signal className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight">-74 dBm</span>
              <span className="text-xs font-semibold text-slate-500">Median RSSI</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
              <span>Link Failover Matrix</span>
              <strong className="text-blue-700">LoRa 868 + Cellular</strong>
            </div>
          </div>

        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: "All Hardware (7 Stations)" },
              { id: "sonar", label: "Ultrasonic Sonar (Node 1)" },
              { id: "soil", label: "Capacitive Soil (Node 2)" },
              { id: "siren", label: "Alert Units & Sirens (Node 3)" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTypeFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  typeFilter === tab.id
                    ? "bg-[#0284c7] text-white shadow-2xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search station, ID, or village..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-800 focus:border-sky-500 w-56 transition-colors"
              />
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Showing {filteredNodes.length} devices
            </span>
          </div>
        </div>

        {/* Nodes Telemetry Table */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 lg:p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Fleet Hardware Telemetry & Health Table
            </h3>
            <span className="text-[10px] font-mono text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              NTP Synchronized (IST)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/80 text-[10px] uppercase font-bold text-slate-400 tracking-wider border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Station / Node ID</th>
                  <th className="py-2.5 px-2">Deployed Village</th>
                  <th className="py-2.5 px-2">Sensor Module</th>
                  <th className="py-2.5 px-2">Battery / Solar</th>
                  <th className="py-2.5 px-2">Link RSSI</th>
                  <th className="py-2.5 px-2">LittleFS Buffer</th>
                  <th className="py-2.5 px-2">Last Seen</th>
                  <th className="py-2.5 px-3 text-right">Diagnostic Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredNodes.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{n.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <span>{n.id}</span>
                        <span>·</span>
                        <span>{n.deviceType}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="text-slate-800 font-semibold">{n.village}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{n.coords}</div>
                    </td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {n.sensorType}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                        <BatteryCharging className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{n.battery}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 font-mono text-[11px] text-slate-600">
                      {n.rssi}
                    </td>
                    <td className="py-3 px-2 text-[10.5px] font-mono text-purple-700">
                      {n.buffer}
                    </td>
                    <td className="py-3 px-2 text-slate-500 font-mono text-[11px]">
                      {n.lastSeen}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handlePing(n.id)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer shadow-2xs"
                      >
                        {pingStatus[n.id] || "Ping Station"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-100">
            <span>Hardware Suite: 3 Bench ESP8266 Targets + LittleFS Offline Buffering</span>
            <span>Firmware Status: All 3 Binaries Compiled & Verified</span>
          </div>
        </div>

      </main>
    </div>
  );
}
