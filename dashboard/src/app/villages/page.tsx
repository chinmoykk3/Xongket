"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Building,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Headphones,
  Home,
  Layers,
  MapPin,
  Megaphone,
  Navigation,
  Phone,
  PhoneCall,
  Radio,
  Search,
  Shield,
  ShieldAlert,
  Smartphone,
  Users,
  Volume2,
  Waves,
  Wifi,
} from "lucide-react";
import { CommandSidebar } from "../../components/CommandSidebar";
import { useLanguage } from "../../context/LanguageContext";

export const dynamic = "force-dynamic";

export default function VillageCharGridPage() {
  const { language, t } = useLanguage();
  const [filterTab, setFilterTab] = useState<"all" | "chars" | "high_risk" | "shelter_full">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [callingContact, setCallingContact] = useState<string | null>(null);

  const villages = [
    {
      id: 1,
      name: "Kamalabari Char",
      district: "Majuli District",
      language: "Assamese (অসমীয়া)",
      type: "CHAR ISLAND",
      typeColor: "bg-purple-50 text-purple-700 border-purple-200",
      risk: "DANGER",
      riskBadge: "bg-red-50 text-red-700 border-red-200",
      riverLevel: "428 cm",
      riverTrend: "+14cm/5h",
      riverColor: "text-red-600",
      precip: "84 mm",
      precipNote: "Heavy Rain",
      population: "15,800",
      popNote: "Sandbar Core",
      shelter: "Kamalabari Satra Hall",
      distance: "0.8 km (Boat Ferry)",
      shelterOccupied: 350,
      shelterCapacity: 450,
      occupancyPct: 77.7,
      barColor: "bg-red-600",
      isChar: true,
      isHighRisk: true,
      isShelterFull: true,
    },
    {
      id: 2,
      name: "Simen Chapori",
      district: "Dhemaji District",
      language: "Assamese",
      type: "CHAR ISLAND",
      typeColor: "bg-purple-50 text-purple-700 border-purple-200",
      risk: "WARNING",
      riskBadge: "bg-amber-50 text-amber-700 border-amber-200",
      riverLevel: "310 cm",
      riverTrend: "+8cm/3h",
      riverColor: "text-amber-600",
      precip: "52 mm",
      precipNote: "Moderate",
      population: "1,880",
      popNote: "Transect 4",
      shelter: "Sissiborgaon LP School",
      distance: "2.1 km",
      shelterOccupied: 120,
      shelterCapacity: 250,
      occupancyPct: 48.0,
      barColor: "bg-amber-500",
      isChar: true,
      isHighRisk: false,
      isShelterFull: false,
    },
    {
      id: 3,
      name: "Kalgachia Char",
      district: "Barpeta District",
      language: "Bengali (বাংলা)",
      type: "CHAR ISLAND",
      typeColor: "bg-purple-50 text-purple-700 border-purple-200",
      risk: "ADVISORY",
      riskBadge: "bg-sky-50 text-sky-700 border-sky-200",
      riverLevel: "245 cm",
      riverTrend: "+3cm/5h",
      riverColor: "text-sky-700",
      precip: "38 mm",
      precipNote: "Light-Mod",
      population: "3,200",
      popNote: "High Silt Bed",
      shelter: "Mandia Relief Camp",
      distance: "1.4 km",
      shelterOccupied: 160,
      shelterCapacity: 500,
      occupancyPct: 32.0,
      barColor: "bg-sky-500",
      isChar: true,
      isHighRisk: false,
      isShelterFull: false,
    },
    {
      id: 4,
      name: "Garamur",
      district: "Majuli District",
      language: "Assamese",
      type: "CORE ISLAND",
      typeColor: "bg-purple-50 text-purple-700 border-purple-200",
      risk: "WARNING",
      riskBadge: "bg-amber-50 text-amber-700 border-amber-200",
      riverLevel: "362 cm",
      riverTrend: "+6cm/3h",
      riverColor: "text-amber-600",
      precip: "71 mm",
      precipNote: "Sustained",
      population: "11,000",
      popNote: "Cultural Satra",
      shelter: "Garamur High School",
      distance: "1.2 km",
      shelterOccupied: 330,
      shelterCapacity: 600,
      occupancyPct: 55.0,
      barColor: "bg-amber-500",
      isChar: false,
      isHighRisk: false,
      isShelterFull: false,
    },
    {
      id: 5,
      name: "Jonai",
      district: "Dhemaji District",
      language: "Assamese",
      type: "RIVERINE BASIN",
      typeColor: "bg-slate-100 text-slate-700 border-slate-200",
      risk: "NORMAL",
      riskBadge: "bg-emerald-50 text-emerald-700 border-emerald-200",
      riverLevel: "190 cm",
      riverTrend: "Stable",
      riverColor: "text-emerald-700",
      precip: "22 mm",
      precipNote: "Minimal",
      population: "12,500",
      popNote: "Elevated Bank",
      shelter: "Jonai Community Hall",
      distance: "1.5 km",
      shelterOccupied: 90,
      shelterCapacity: 500,
      occupancyPct: 18.0,
      barColor: "bg-emerald-500",
      isChar: false,
      isHighRisk: false,
      isShelterFull: false,
    },
    {
      id: 6,
      name: "Murkongselek",
      district: "Dhemaji District",
      language: "Bodo (बर')",
      type: "RIVERINE BASIN",
      typeColor: "bg-slate-100 text-slate-700 border-slate-200",
      risk: "NORMAL",
      riskBadge: "bg-emerald-50 text-emerald-700 border-emerald-200",
      riverLevel: "174 cm",
      riverTrend: "-2cm/4h",
      riverColor: "text-emerald-700",
      precip: "19 mm",
      precipNote: "Trace",
      population: "6,700",
      popNote: "Railhead Sector",
      shelter: "Jonai Community Hall",
      distance: "3.8 km",
      shelterOccupied: 70,
      shelterCapacity: 500,
      occupancyPct: 14.0,
      barColor: "bg-emerald-500",
      isChar: false,
      isHighRisk: false,
      isShelterFull: false,
    },
    {
      id: 7,
      name: "Baghbar",
      district: "Barpeta District",
      language: "Bengali (বাংলা)",
      type: "EMBANKMENT SPUR",
      typeColor: "bg-slate-100 text-slate-700 border-slate-200",
      risk: "NORMAL",
      riskBadge: "bg-emerald-50 text-emerald-700 border-emerald-200",
      riverLevel: "205 cm",
      riverTrend: "-1cm/3h",
      riverColor: "text-emerald-700",
      precip: "28 mm",
      precipNote: "Moderate",
      population: "9,800",
      popNote: "Shore Enclave",
      shelter: "Mandia Relief Camp",
      distance: "2.7 km",
      shelterOccupied: 150,
      shelterCapacity: 500,
      occupancyPct: 30.0,
      barColor: "bg-emerald-500",
      isChar: false,
      isHighRisk: false,
      isShelterFull: false,
    },
  ];

  // Filtering
  const filteredVillages = villages.filter((v) => {
    if (filterTab === "chars" && !v.isChar) return false;
    if (filterTab === "high_risk" && !v.isHighRisk) return false;
    if (filterTab === "shelter_full" && !v.isShelterFull) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        v.name.toLowerCase().includes(q) ||
        v.district.toLowerCase().includes(q) ||
        v.language.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCallSim = (name: string) => {
    setCallingContact(name);
    setTimeout(() => setCallingContact(null), 3500);
  };

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
                BRAHMAPUTRA ALLUVIAL MORPHOLOGY
              </span>
              <span className="text-xs font-semibold text-slate-500 font-mono">
                Telemetry Stream Epoch 14:02 IST
              </span>
            </div>

            {/* Right Quick Controls */}
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                2G/3G Audio TTS Active
              </span>

              <Link
                href="/village/1"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0284c7] hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Simulate Rural View</span>
              </Link>

              <a
                href="tel:1079"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-xs font-bold transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-rose-600" />
                <span>1079 SDMA Control Line</span>
              </a>
            </div>
          </div>

          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Village & Char Sandbar Grid
            </h1>
            <p className="text-xs text-slate-500 max-w-4xl leading-relaxed mt-0.5">
              Continuous hydrological & isolation surveillance across shifting sandbars (উভতিয়া চাপৰি)
              in Majuli, Barpeta, Dhemaji, and Lakhimpur sectors.
            </p>
          </div>
        </div>

        {/* Top 4 KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Active Sectors */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                ACTIVE SECTORS
              </span>
              <div className="w-6 h-6 rounded bg-sky-50 flex items-center justify-center text-sky-600">
                <Layers className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight">24</span>
              <span className="text-xs font-semibold text-slate-500">Villages Tracked</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
              <span>Char Sandbars:</span>
              <strong className="text-purple-700 font-bold">8 Highly Isolated</strong>
            </div>
          </div>

          {/* Card 2: Vulnerable Riverine Pop */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                VULNERABLE RIVERINE POP
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-50 text-red-700 border border-red-200">
                Severe Exposure
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight">248,000</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
              <span>Majuli / Barpeta Core:</span>
              <strong className="text-slate-800 font-semibold">142k in Char Zones</strong>
            </div>
          </div>

          {/* Card 3: Designated Flood Shelters */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                DESIGNATED FLOOD SHELTERS
              </span>
              <div className="w-6 h-6 rounded bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Home className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight">12</span>
              <span className="text-xs font-semibold text-slate-500">Shelters Operational</span>
            </div>
            <div className="space-y-1 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span>1,280 / 5,450 Occupied</span>
                <span className="font-semibold text-emerald-700">76.5% Spare</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full w-[23.5%]" />
              </div>
            </div>
          </div>

          {/* Card 4: Rural Telemetry Stack */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                RURAL TELEMETRY STACK
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold">
                Edge Sync
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight">99.2%</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
              <span>L10N Audio Engines:</span>
              <strong className="text-slate-800 font-semibold">Assamese, Bodo, Bangla</strong>
            </div>
          </div>

        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: "All Villages (7)" },
              { id: "chars", label: "Char Sandbars Only (4)" },
              { id: "high_risk", label: "High Risk / Danger (1)" },
              { id: "shelter_full", label: "Shelter > 70% Full" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  filterTab === tab.id
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
                placeholder="Search village, char, district..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-800 focus:border-sky-500 w-56 transition-colors"
              />
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Showing {filteredVillages.length} sites
            </span>
          </div>
        </div>

        {/* Grid of Village & Char Cards (3 Cols) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVillages.map((v) => (
            <div
              key={v.id}
              className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3 flex flex-col justify-between hover:shadow-xs transition-shadow"
            >
              <div className="space-y-2.5">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 tracking-tight">
                      {v.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {v.district} · Lang: {v.language}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider border ${v.typeColor}`}>
                      {v.type}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider border ${v.riskBadge}`}>
                      ● {v.risk}
                    </span>
                  </div>
                </div>

                {/* 3 Metric Columns */}
                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-center">
                  <div>
                    <div className="text-[9.5px] font-bold uppercase text-slate-400">RIVER LEVEL</div>
                    <div className={`font-black text-sm mt-0.5 ${v.riverColor}`}>{v.riverLevel}</div>
                    <div className="text-[9px] text-slate-400 font-mono">{v.riverTrend}</div>
                  </div>
                  <div>
                    <div className="text-[9.5px] font-bold uppercase text-slate-400">24H PRECIP</div>
                    <div className="font-black text-sm text-slate-900 mt-0.5">{v.precip}</div>
                    <div className="text-[9px] text-slate-400 font-mono">{v.precipNote}</div>
                  </div>
                  <div>
                    <div className="text-[9.5px] font-bold uppercase text-slate-400">POPULATION</div>
                    <div className="font-black text-sm text-slate-900 mt-0.5">{v.population}</div>
                    <div className="text-[9px] text-slate-400 font-mono">{v.popNote}</div>
                  </div>
                </div>

                {/* Shelter Box */}
                <div className="p-2.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1 truncate">
                      <Home className="w-3 h-3 text-sky-600 shrink-0" />
                      {v.shelter}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0">{v.distance}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-600">
                      <span>Occupancy: {v.shelterOccupied} / {v.shelterCapacity} cap</span>
                      <strong className={`font-semibold ${v.occupancyPct > 70 ? "text-red-600" : "text-slate-700"}`}>
                        {v.occupancyPct}% Full
                      </strong>
                    </div>
                    <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden">
                      <div className={`${v.barColor} h-full rounded-full`} style={{ width: `${v.occupancyPct}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <Link
                  href={`/village/${v.id}`}
                  className="flex-1 py-1.5 px-3 bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 text-slate-700 hover:text-sky-700 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Headphones className="w-3.5 h-3.5 text-sky-600" />
                  <span>Rural Audio View</span>
                </Link>
                <button
                  type="button"
                  onClick={() => handleCallSim(v.name)}
                  title="Call Village Field Contact"
                  className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Section: Shelter Readiness & Evacuation Capacities + Frontline Contact Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Left Column (8 of 12 cols): Shelter Readiness & Evacuation Capacities */}
          <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-4 lg:p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Shelter Readiness & Evacuation Capacities
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Real-time occupancy status fed via SDMA Block Relief Officers
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold uppercase">
                Brahmaputra Core
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              
              {/* Row 1: Kamalabari Satra Relief Hall */}
              <div className="p-3 bg-slate-50/60 border border-slate-200/80 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between font-bold">
                  <div className="flex items-center gap-2">
                    <Home className="w-3.5 h-3.5 text-red-600" />
                    <span className="text-slate-900">Kamalabari Satra Relief Hall (Majuli)</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-red-100 text-red-800">
                      CRITICAL LOAD
                    </span>
                  </div>
                  <span className="text-slate-700 font-mono">350 / 450 beds</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-red-600 h-full rounded-full w-[77.7%]" />
                </div>
                <div className="flex items-center justify-between text-[10.5px] pt-0.5">
                  <span className="text-slate-500 font-mono">Evac Route: Kamalabari Ghat Ferry Line (2 boats active)</span>
                  <span className="text-red-600 font-black">100 beds left</span>
                </div>
              </div>

              {/* Row 2: North Lakhimpur District Stadium */}
              <div className="p-3 bg-slate-50/60 border border-slate-200/80 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between font-bold">
                  <div className="flex items-center gap-2">
                    <Home className="w-3.5 h-3.5 text-sky-600" />
                    <span className="text-slate-900">North Lakhimpur District Stadium</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-sky-100 text-sky-800">
                      REGIONAL HUB
                    </span>
                  </div>
                  <span className="text-slate-700 font-mono">210 / 800 beds</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-sky-600 h-full rounded-full w-[26.2%]" />
                </div>
                <div className="flex items-center justify-between text-[10.5px] pt-0.5">
                  <span className="text-slate-500 font-mono">Evac Route: NH-15 Bypass Highway Link (Fully passable)</span>
                  <span className="text-emerald-700 font-bold">590 beds left</span>
                </div>
              </div>

              {/* Row 3: Garamur High School Complex */}
              <div className="p-3 bg-slate-50/60 border border-slate-200/80 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between font-bold">
                  <div className="flex items-center gap-2">
                    <Home className="w-3.5 h-3.5 text-purple-600" />
                    <span className="text-slate-900">Garamur High School Complex</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-purple-100 text-purple-800">
                      MAJULI NORTH
                    </span>
                  </div>
                  <span className="text-slate-700 font-mono">330 / 600 beds</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-purple-600 h-full rounded-full w-[55%]" />
                </div>
                <div className="flex items-center justify-between text-[10.5px] pt-0.5">
                  <span className="text-slate-500 font-mono">Evac Route: PWD Embankment Road (Tractor-accessible only)</span>
                  <span className="text-slate-700 font-bold">270 beds left</span>
                </div>
              </div>

              {/* Row 4: Mandia Relief Camp */}
              <div className="p-3 bg-slate-50/60 border border-slate-200/80 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between font-bold">
                  <div className="flex items-center gap-2">
                    <Home className="w-3.5 h-3.5 text-teal-600" />
                    <span className="text-slate-900">Mandia Relief Camp (Barpeta)</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-teal-100 text-teal-800">
                      CHAR BUFFER
                    </span>
                  </div>
                  <span className="text-slate-700 font-mono">510 / 1000 beds</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-teal-600 h-full rounded-full w-[51%]" />
                </div>
                <div className="flex items-center justify-between text-[10.5px] pt-0.5">
                  <span className="text-slate-500 font-mono">Evac Route: Beki River Inland Channel (NDRF Outboard boats)</span>
                  <span className="text-slate-700 font-bold">490 beds left</span>
                </div>
              </div>

            </div>
          </div>

          {/* Right Column (4 of 12 cols): Frontline Contact Matrix */}
          <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Frontline Contact Matrix
                </h3>
                <p className="text-[10.5px] text-slate-500">
                  Immediate satellite & GSM links to on-ground village responders
                </p>
              </div>

              {callingContact && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] font-semibold flex items-center gap-2 animate-pulse">
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Connecting satellite voice link to {callingContact}...</span>
                </div>
              )}

              {/* Contacts */}
              <div className="space-y-2 text-xs">
                
                {/* Contact 1 */}
                <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-800 font-bold text-[11px]">
                      PB
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">Pranab Bora</div>
                      <div className="text-[10px] text-slate-500">ASDMA Field Officer - Majuli</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCallSim("Pranab Bora (Majuli)")}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Contact 2 */}
                <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-purple-100 border border-purple-300 flex items-center justify-center text-purple-800 font-bold text-[11px]">
                      AK
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">Abdul Karim</div>
                      <div className="text-[10px] text-slate-500">Gram Panchayat Head - Kalgachia</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCallSim("Abdul Karim (Kalgachia)")}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Contact 3 */}
                <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 font-bold text-[11px]">
                      RS
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">Rituraj Saikia</div>
                      <div className="text-[10px] text-slate-500">Aapda Mitra Lead - Simen Chapori</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCallSim("Rituraj Saikia (Simen Chapori)")}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            </div>

            {/* Bottom Card: Rural Telephony Audit */}
            <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl space-y-2 text-xs mt-2">
              <div className="font-bold text-sky-950 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-sky-700" />
                <span>Rural Telephony Audit</span>
              </div>
              <p className="text-[10.5px] text-sky-900/80 leading-relaxed">
                Validate low-bandwidth rendering on extreme 2G latency with offline phonetic synthesizer fallback.
              </p>
              <Link
                href="/village/1"
                className="w-full py-1.5 px-3 bg-[#0284c7] hover:bg-sky-700 text-white rounded-lg font-bold text-[11px] transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <span>Test /village/1 Viewport</span>
              </Link>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
