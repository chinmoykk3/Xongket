"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  CloudRain,
  Compass,
  Cpu,
  Droplets,
  ExternalLink,
  Flame,
  LifeBuoy,
  Megaphone,
  Navigation,
  Radio,
  RefreshCw,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Waves,
  Wifi,
  X,
  Volume2,
  Anchor,
  Box,
  Target,
} from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CommandSidebar } from "../components/CommandSidebar";
import { useLanguage } from "../context/LanguageContext";

export const dynamic = "force-dynamic";

export default function OverviewPage() {
  const { language, t } = useLanguage();
  const [selectedSubDivision, setSelectedSubDivision] = useState<string>("Jengraimukh (Surge Front)");
  const [selectedHorizon, setSelectedHorizon] = useState<number>(6);
  const [selectedScript, setSelectedScript] = useState<"as" | "br" | "bn" | "hi">("as");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  
  // Modals for presentation demo
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState<boolean>(false);
  const [broadcastStep, setBroadcastStep] = useState<number>(0);
  const [isReallocateModalOpen, setIsReallocateModalOpen] = useState<boolean>(false);
  
  // Dynamic shelter status
  const [shelter1Occupancy, setShelter1Occupancy] = useState<number>(120);
  const [shelter1Boats, setShelter1Boats] = useState<number>(1);
  const [shelter2Rations, setShelter2Rations] = useState<number>(800);
  const [reallocateFeedback, setReallocateFeedback] = useState<string | null>(null);

  // Sub-divisions for Majuli
  const subDivisions = [
    { id: "kamalabari", label: "Kamalabari", status: "warning", level: 428.4, rise: "+14.2 cm/hr", dlEta: "DL (450cm) in ~1.5h", statusText: "WARNING" },
    { id: "garamur", label: "Garamur", status: "advisory", level: 388.2, rise: "+12.0 cm/hr", dlEta: "DL (450cm) in ~4.5h", statusText: "ADVISORY" },
    { id: "jengraimukh", label: "Jengraimukh (Surge Front)", status: "danger", level: 452.0, rise: "+18.5 cm/hr", dlEta: "BREACHED (+2.0cm)", statusText: "CRITICAL DANGER" },
    { id: "salmora", label: "Salmora", status: "normal", level: 340.5, rise: "+2.1 cm/hr", dlEta: "Safe (>10h)", statusText: "STABLE" },
    { id: "auniati", label: "Auniati", status: "normal", level: 325.0, rise: "+1.5 cm/hr", dlEta: "Safe (>12h)", statusText: "STABLE" },
  ];

  const currentStationData = subDivisions.find((s) => s.label === selectedSubDivision) || subDivisions[2];

  // Dynamic hydrograph data
  const getHydrographData = () => {
    const base = currentStationData.level;
    const offset1 = selectedHorizon >= 1 ? 8.2 : 0;
    const offset3 = selectedHorizon >= 3 ? 21.5 : 0;
    const offset6 = selectedHorizon >= 6 ? 33.7 : 0;

    return [
      { time: "-24h (Yesterday 14:30)", displayTime: "-24h", sonar: Number((base - 53.4).toFixed(1)), mlProjected: null, dhemajiWave: Number((base - 68.0).toFixed(1)), p10: null, p90: null },
      { time: "-18h", displayTime: "-18h", sonar: Number((base - 46.0).toFixed(1)), mlProjected: null, dhemajiWave: Number((base - 60.0).toFixed(1)), p10: null, p90: null },
      { time: "-12h (02:30 IST)", displayTime: "-12h", sonar: Number((base - 33.2).toFixed(1)), mlProjected: null, dhemajiWave: Number((base - 46.0).toFixed(1)), p10: null, p90: null },
      { time: "-6h", displayTime: "-6h", sonar: Number((base - 16.4).toFixed(1)), mlProjected: null, dhemajiWave: Number((base - 23.0).toFixed(1)), p10: null, p90: null },
      { time: "14:30 Live (428.4 cm)", displayTime: "Live", sonar: base, mlProjected: base, dhemajiWave: Number((base - 6.4).toFixed(1)), p10: base - 4.4, p90: base + 3.6 },
      { time: "+1h", displayTime: "+1h", sonar: null, mlProjected: Number((base + offset1).toFixed(1)), dhemajiWave: Number((base + offset1 + 2).toFixed(1)), p10: Number((base + offset1 - 6.1).toFixed(1)), p90: Number((base + offset1 + 5.4).toFixed(1)) },
      { time: "+3h (17:30)", displayTime: "+3h", sonar: null, mlProjected: Number((base + offset3).toFixed(1)), dhemajiWave: Number((base + offset3 + 3).toFixed(1)), p10: Number((base + offset3 - 8.7).toFixed(1)), p90: Number((base + offset3 + 8.6).toFixed(1)) },
      { time: "+6h (20:30 Crest)", displayTime: "+6h", sonar: null, mlProjected: Number((base + offset6).toFixed(1)), dhemajiWave: Number((base + offset6 + 4).toFixed(1)), p10: Number((base + offset6 - 13.6).toFixed(1)), p90: Number((base + offset6 + 13.1).toFixed(1)) },
    ];
  };

  // Localized alert dispatch templates
  const dispatchTemplates: Record<string, string> = {
    as: "মাজুলী জিলা প্ৰশাসন: ব্ৰহ্মপুত্ৰৰ জলপৃষ্ঠ বিপদসীমাৰ ওপৰত গতি কৰিছে। নৈপৰীয়া আৰু চৰবাসী ৰাইজক ওখ স্থানলৈ যাবলৈ আহ্বান জনোৱা হৈছে।",
    br: "माजुली जिल्ला खुंथाय: ब्रह्मपुत्र दैमानि दैनि बिबाङा खैफोदनि सिमा बारबाय। गामिया सुबुंफोरखौ जौसिन जायगायाव थांनो खावलायनाय जाबाय।",
    bn: "মাজুলী জেলা প্রশাসন: ব্রহ্মপুত্র নদের জলস্তর বিপদসীমার উপর দিয়ে প্রবাহিত হচ্ছে। নদী তীরবর্তী ও চরবাসীদের অবিলম্বে নিরাপদ আশ্রয়ে যাওয়ার নির্দেশ দেওয়া হচ্ছে।",
    hi: "माजुली जिला प्रशासन: ब्रह्मपुत्र नदी का जलस्तर खतरे के निशान को पार कर गया है। सभी तटीय एवं चरांचल निवासियों से ऊंचे सुरक्षित स्थानों पर जाने का अनुरोध है।",
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const playSirenTone = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.4);
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.8);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.9);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.9);
    } catch {
      // AudioContext fallback
    }
  };

  const startBroadcastSimulation = () => {
    setIsBroadcastModalOpen(true);
    setBroadcastStep(1);
    playSirenTone();
    setTimeout(() => setBroadcastStep(2), 700);
    setTimeout(() => {
      setBroadcastStep(3);
      playSirenTone();
    }, 1500);
    setTimeout(() => setBroadcastStep(4), 2200);
    setTimeout(() => setBroadcastStep(5), 2900);
  };

  return (
    <div className="flex min-h-[calc(100vh-60px)] w-full bg-[#f4f6f9]">
      {/* Persistent Left Operations Sidebar */}
      <CommandSidebar />

      {/* Main Operational Console Canvas */}
      <main className="flex-1 p-4 lg:p-6 space-y-4 overflow-y-auto">
        
        {/* Operations Sub-Header Banner */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Status tags */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                ACTIVE FLOOD SURGE ADVISORY
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium text-slate-500 bg-slate-50 border border-slate-200">
                ⚡ INSAT-3DR + HydroNet v4.1 Sync
              </span>
            </div>

            {/* Sweep Refresh & RSSI Stats */}
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1 font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Telemetry Sweep: <span className="font-semibold text-slate-700">03:00:14 ago</span> · 99.4% RSSI
              </span>
              <button
                type="button"
                onClick={handleRefresh}
                title="Refresh Telemetry Matrix"
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-sky-600" : ""}`} />
              </button>
            </div>
          </div>

          {/* Station Title & Sub-Divisions Monitored */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-baseline gap-2">
                <span>Majuli River Basin Operations</span>
                <span className="text-sm font-semibold text-slate-500">
                  (মাজুলী নদী নিয়ন্ত্ৰণ কেন্দ্ৰ)
                </span>
              </h1>
            </div>

            {/* Sub-Divisions Monitored Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                Sub-Divisions Monitored:
              </span>
              {subDivisions.map((sd) => {
                const isSelected = selectedSubDivision === sd.label;
                const isDanger = sd.status === "danger";
                return (
                  <button
                    key={sd.id}
                    type="button"
                    onClick={() => setSelectedSubDivision(sd.label)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? isDanger
                          ? "bg-red-50 text-red-700 border-2 border-red-500 shadow-2xs"
                          : "bg-sky-50 text-sky-800 border-2 border-sky-500 shadow-2xs"
                        : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {sd.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4 KPI Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Active Ultrasonic Gauges */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold text-slate-400 tracking-wider uppercase">
                Active Ultrasonic Gauges
              </span>
              <div className="w-6 h-6 rounded-md bg-sky-50 flex items-center justify-center text-sky-600">
                <Waves className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl font-black text-slate-900 tracking-tight">18 / 18</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                ONLINE
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
              <span>Telemetry Uptime: <strong className="text-slate-700 font-semibold">100%</strong></span>
              <span className="text-emerald-600 font-medium">0 Faults</span>
            </div>
          </div>

          {/* Card 2: Kamalabari Ghat Crest */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold text-slate-400 tracking-wider uppercase truncate">
                Kamalabari Ghat Crest
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                WARNING
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-amber-500 tracking-tight">428.4</span>
              <span className="text-xs font-semibold text-slate-500">cm</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
              <span className="text-amber-700 font-medium flex items-center gap-0.5">
                ↗ +14.2 cm/hr
              </span>
              <span>DL (450cm) in <strong className="text-slate-700">~1.5h</strong></span>
            </div>
            {/* Visual Level Progress Bar */}
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-amber-400 to-amber-600 h-full rounded-full w-[88%]" />
            </div>
          </div>

          {/* Card 3: Catchment Rain (24h Sync) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold text-slate-400 tracking-wider uppercase">
                Catchment Rain (24H Sync)
              </span>
              <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center text-blue-600">
                <CloudRain className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-[#1e3a8a] tracking-tight">84.6</span>
              <span className="text-xs font-semibold text-slate-500">mm</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
              <span>Soil Saturation:</span>
              <span className="font-semibold text-slate-700">82.4% Antecedent</span>
            </div>
            {/* Visual Rain Progress Bar */}
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-sky-400 to-blue-600 h-full rounded-full w-[82%]" />
            </div>
          </div>

          {/* Card 4: AI Forecast Peak */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold text-slate-400 tracking-wider uppercase">
                AI Forecast Peak
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
                DANGER
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-red-600 tracking-tight">462.1</span>
              <span className="text-xs font-semibold text-slate-500">cm</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
              <span>Quantile 80%</span>
              <span className="font-mono font-medium text-slate-700">[448.5 - 475.2 cm]</span>
            </div>
            {/* Visual Danger Progress Bar */}
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-red-600 h-full rounded-full w-[96%]" />
            </div>
          </div>

        </div>

        {/* Middle Two-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Left Column (8 of 12 cols): Hydrograph + Explainability + Telemetry Matrix */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Hydrograph & Predictive Wave Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 lg:p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Predictive Hydrograph & Surge Wave Propagation
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    HC-SR04 Live Gauge (Kamalabari) vs. Upper Dhemaji Inflow Model (+4.2h Travel Lag)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                    HistGradientBoosting
                  </span>
                  {/* Horizon Pills */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                    {[
                      { h: 1, label: "1-Hr (+8.2)" },
                      { h: 3, label: "3-Hr (+21.5)" },
                      { h: 6, label: "6-Hr (+33.7)" },
                    ].map((item) => (
                      <button
                        key={item.h}
                        type="button"
                        onClick={() => setSelectedHorizon(item.h)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                          selectedHorizon === item.h
                            ? "bg-[#0284c7] text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Hydrograph Chart Canvas */}
              <div className="h-[290px] w-full pt-2 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={getHydrographData()} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="time"
                      tick={{ fill: "#64748b", fontSize: 10.5 }}
                      axisLine={{ stroke: "#cbd5e1" }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[320, 500]}
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      axisLine={{ stroke: "#cbd5e1" }}
                      tickLine={false}
                      unit=" cm"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderColor: "#cbd5e1",
                        borderRadius: "10px",
                        fontSize: "12px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />

                    {/* Danger Level Line (450 cm) */}
                    <ReferenceLine
                      y={450}
                      stroke="#ef4444"
                      strokeDasharray="4 4"
                      label={{
                        value: "DANGER LEVEL: 450.0 cm (বিপদসীমা)",
                        fill: "#dc2626",
                        fontSize: 10,
                        position: "insideTopLeft",
                      }}
                    />

                    {/* Warning Level Line (410 cm) */}
                    <ReferenceLine
                      y={410}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      label={{
                        value: "WARNING LEVEL: 410.0 cm (সতৰ্কতা সীমা)",
                        fill: "#d97706",
                        fontSize: 10,
                        position: "insideBottomLeft",
                      }}
                    />

                    {/* Normal Level Line (350 cm) */}
                    <ReferenceLine
                      y={350}
                      stroke="#38bdf8"
                      strokeDasharray="3 3"
                      label={{
                        value: "NORMAL LEVEL: 350.0 cm",
                        fill: "#0284c7",
                        fontSize: 9.5,
                        position: "insideBottomLeft",
                      }}
                    />

                    {/* Confidence Band (p10 to p90) */}
                    <Area
                      type="monotone"
                      dataKey="p90"
                      stroke="none"
                      fill="#bae6fd"
                      fillOpacity={0.35}
                    />
                    <Area
                      type="monotone"
                      dataKey="p10"
                      stroke="none"
                      fill="#ffffff"
                      fillOpacity={1.0}
                    />

                    {/* Dhemaji Inflow Lag Wave */}
                    <Line
                      type="monotone"
                      dataKey="dhemajiWave"
                      stroke="#818cf8"
                      strokeDasharray="2 3"
                      strokeWidth={1.5}
                      dot={false}
                      name="Dhemaji Inflow Lag Wave"
                    />

                    {/* Observed Sonar Gauge (Historical) */}
                    <Line
                      type="monotone"
                      dataKey="sonar"
                      stroke="#0284c7"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#0284c7" }}
                      activeDot={{ r: 5 }}
                      name="Observed Sonar (HC-SR04)"
                    />

                    {/* Ensemble ML Projected Surge */}
                    <Line
                      type="monotone"
                      dataKey="mlProjected"
                      stroke="#dc2626"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={{ r: 3, fill: "#dc2626" }}
                      name="Ensemble ML Projected"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Chart Legend & Sensor Specs */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-[#0284c7] inline-block" />
                    Observed Sonar (HC-SR04)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 border-t-2 border-dashed border-red-600 inline-block" />
                    Ensemble ML Projected
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-sky-200 inline-block rounded-xs" />
                    p10 - p90 Confidence Interval
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 border-t-2 border-dotted border-indigo-400 inline-block" />
                    Dhemaji Inflow Lag Wave
                  </span>
                </div>
                <div className="font-mono text-slate-400 text-[10px]">
                  Sensor Resolution: ±0.2 cm · Noise Gate: Kalman ON
                </div>
              </div>
            </div>

            {/* Hydrological Explainability Box */}
            <div className="bg-[#f0f9ff] border border-sky-100 rounded-2xl p-4 shadow-2xs flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <Shield className="w-4 h-4" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="text-xs font-bold text-sky-950 uppercase tracking-wider">
                  Hydrological Explainability:
                </div>
                <p className="text-xs text-sky-900 leading-relaxed font-normal">
                  Projected danger surge (462.1 cm) in <strong className="font-semibold text-red-600">~5.2 hrs</strong> driven
                  by sustained upper-catchment precipitation (84.6 mm) combined with upstream flood crest wave propagating
                  from Dhemaji (+22.0 cm pulse).
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-white text-sky-800 border border-sky-200">
                    Rain Σ: +5.0
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-white text-sky-800 border border-sky-200">
                    Surge Δ: +2.2
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-white text-sky-800 border border-sky-200">
                    Soil Sat: 82%
                  </span>
                </div>
              </div>
            </div>

            {/* Live Telemetry Matrix & Node Health Table */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 lg:p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Live Telemetry Matrix & Node Health
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    HC-SR04 & Millimeter-Wave Radar Stations · LoRaWAN + 4G Failover
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Kalman Noise Filter: Active
                </span>
              </div>

              {/* High-density Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50/80 text-[10px] uppercase font-bold text-slate-400 tracking-wider border-y border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Station / ID</th>
                      <th className="py-2.5 px-2">Mount Ht</th>
                      <th className="py-2.5 px-2">Water Level</th>
                      <th className="py-2.5 px-2">Rate of Rise</th>
                      <th className="py-2.5 px-2">Status</th>
                      <th className="py-2.5 px-2">Quality Flags</th>
                      <th className="py-2.5 px-3 text-right">Battery / LQI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {/* Row 1: Kamalabari Ghat */}
                    <tr
                      onClick={() => setSelectedSubDivision("Kamalabari")}
                      className={`cursor-pointer transition-colors ${
                        selectedSubDivision.startsWith("Kamalabari") ? "bg-amber-50/40" : "hover:bg-slate-50/60"
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">Kamalabari Ghat</div>
                        <div className="text-[10px] text-slate-400 font-mono">XONG-MJL-01 · Sonar</div>
                      </td>
                      <td className="py-2.5 px-2 font-mono text-slate-600">550.0 cm</td>
                      <td className="py-2.5 px-2 font-bold text-amber-600">428.4 cm</td>
                      <td className="py-2.5 px-2 text-rose-600 font-semibold">↗ +14.2 cm/h</td>
                      <td className="py-2.5 px-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                          WARNING
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-emerald-700 text-[11px]">0 Stuck - OK</td>
                      <td className="py-2.5 px-3 text-right font-mono text-[11px] text-slate-600">
                        98% / -74 dBm
                      </td>
                    </tr>

                    {/* Row 2: Jengraimukh Embankment (CRITICAL DANGER Highlighted) */}
                    <tr
                      onClick={() => setSelectedSubDivision("Jengraimukh (Surge Front)")}
                      className="bg-red-50/50 hover:bg-red-50/70 border-l-4 border-l-red-500 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-red-950 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                          Jengraimukh Embankment
                        </div>
                        <div className="text-[10px] text-red-700/80 font-mono">XONG-MJL-03 · Radar MM</div>
                      </td>
                      <td className="py-2.5 px-2 font-mono text-slate-700">600.0 cm</td>
                      <td className="py-2.5 px-2 font-black text-red-600 text-sm">452.0 cm</td>
                      <td className="py-2.5 px-2 text-red-700 font-bold">↗ +18.5 cm/h</td>
                      <td className="py-2.5 px-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-600 text-white shadow-2xs">
                          CRITICAL DANGER
                        </span>
                      </td>
                      <td className="py-2.5 px-2 font-bold text-red-700 text-[11px]">Siren Armed</td>
                      <td className="py-2.5 px-3 text-right font-mono text-[11px] text-red-950 font-semibold">
                        100% / -68 dBm
                      </td>
                    </tr>

                    {/* Row 3: Garamur Riverfront */}
                    <tr
                      onClick={() => setSelectedSubDivision("Garamur")}
                      className={`cursor-pointer transition-colors ${
                        selectedSubDivision.startsWith("Garamur") ? "bg-sky-50/40" : "hover:bg-slate-50/60"
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">Garamur Riverfront</div>
                        <div className="text-[10px] text-slate-400 font-mono">XONG-MJL-02 · Dual Sonar</div>
                      </td>
                      <td className="py-2.5 px-2 font-mono text-slate-600">500.0 cm</td>
                      <td className="py-2.5 px-2 font-semibold text-slate-800">388.2 cm</td>
                      <td className="py-2.5 px-2 text-amber-600 font-medium">+12.0 cm/h</td>
                      <td className="py-2.5 px-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200">
                          ADVISORY
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-slate-600 text-[11px]">No Jitter - OK</td>
                      <td className="py-2.5 px-3 text-right font-mono text-[11px] text-slate-600">
                        91% / -82 dBm
                      </td>
                    </tr>

                    {/* Row 4: Salmora Erosion Point */}
                    <tr
                      onClick={() => setSelectedSubDivision("Salmora")}
                      className={`cursor-pointer transition-colors ${
                        selectedSubDivision.startsWith("Salmora") ? "bg-emerald-50/40" : "hover:bg-slate-50/60"
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">Salmora Erosion Point</div>
                        <div className="text-[10px] text-slate-400 font-mono">XONG-MJL-04 · Geo-Acoustic</div>
                      </td>
                      <td className="py-2.5 px-2 font-mono text-slate-600">520.0 cm</td>
                      <td className="py-2.5 px-2 font-semibold text-slate-800">340.5 cm</td>
                      <td className="py-2.5 px-2 text-emerald-600 font-medium">+2.1 cm/h</td>
                      <td className="py-2.5 px-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                          STABLE
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-emerald-700 text-[11px]">Geotech In-Range</td>
                      <td className="py-2.5 px-3 text-right font-mono text-[11px] text-slate-600">
                        86% / -88 dBm
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Table Footer Stats */}
              <div className="flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-400 pt-2 border-t border-slate-100">
                <span>Validation: 0 stuck sensor cycles</span>
                <span>Dynamic Outlier Rejection: 99.8% Pass</span>
                <span>Sampling Interval: 60 sec</span>
              </div>
            </div>

          </div>

          {/* Right Column (4 of 12 cols): Spatial Vulnerability + Rapid Dispatch + Relief Shelters */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Spatial Basin Vulnerability Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Spatial Basin Vulnerability
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                  GIS On-Grid
                </span>
              </div>

              {/* Vector Cartography of Majuli Reach */}
              <div className="relative w-full h-38 bg-[#0c1829] rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center">
                <svg viewBox="0 0 400 180" className="w-full h-full object-cover">
                  <rect width="400" height="180" fill="#0f2642" />
                  <path
                    d="M-20,40 C60,45 120,30 200,60 C280,90 340,75 420,80 L420,130 C350,120 270,140 190,110 C110,80 50,110 -20,105 Z"
                    fill="#1e4e79"
                    opacity="0.8"
                  />
                  <path
                    d="M100,55 C150,45 240,50 300,75 C290,110 220,120 140,105 C110,100 80,85 100,55 Z"
                    fill="#15362a"
                    stroke="#22c55e"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    opacity="0.9"
                  />
                  <text x="170" y="85" fill="#86efac" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
                    MAJULI ISLAND
                  </text>
                  <text x="20" y="30" fill="#7dd3fc" fontSize="9" fontFamily="monospace">
                    Brahmaputra Main Channel
                  </text>
                  <text x="260" y="160" fill="#7dd3fc" fontSize="9" fontFamily="monospace">
                    Kherkutia Xuti Channel
                  </text>
                  <ellipse cx="65" cy="75" rx="16" ry="7" fill="#b45309" opacity="0.6" />
                  <ellipse cx="340" cy="100" rx="20" ry="8" fill="#b45309" opacity="0.6" />
                  <circle cx="140" cy="98" r="4" fill="#f59e0b" />
                  <text x="146" y="102" fill="#fbbf24" fontSize="8" fontWeight="bold">Kamalabari</text>
                  <circle cx="270" cy="72" r="5" fill="#ef4444" />
                  <circle cx="270" cy="72" r="10" fill="#ef4444" opacity="0.4" className="animate-ping" />
                  <text x="210" y="65" fill="#fca5a5" fontSize="8" fontWeight="bold">Jengraimukh (Breach Zone)</text>
                </svg>

                <div className="absolute top-2 right-2 bg-red-600/90 text-white px-2 py-0.5 rounded text-[9.5px] font-bold tracking-tight shadow-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  High Inundation Risk
                </div>
                <div className="absolute bottom-1.5 left-2 text-[9px] font-mono text-slate-300 bg-slate-950/80 px-1.5 py-0.5 rounded">
                  Majuli Central Reach (26.96° N, 94.22° E)
                </div>
              </div>

              {/* Live Berth Camera Stream (Simulated Real-time Water Flow) */}
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-950">
                <div className="w-full h-24 bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 flex flex-col justify-between p-2 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:12px_12px]" />
                  <div className="flex items-center justify-between z-10">
                    <div className="bg-red-600/90 text-white text-[9px] px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      BOAT CAMERA FEED
                    </div>
                    <div className="text-[9.5px] font-mono text-emerald-400 font-semibold bg-slate-900/80 px-1.5 rounded">
                      FLOW: ~2.4 m/s (TURBULENT)
                    </div>
                  </div>
                  <div className="z-10 bg-slate-900/90 backdrop-blur-xs text-white/90 text-[10px] p-1.5 rounded border border-slate-800 flex items-center justify-between">
                    <span className="font-semibold text-slate-200">Kamalabari Ferry Ghat Berth</span>
                    <span className="font-mono text-[9px] text-amber-400">SURGE CREST: +14.2 cm/h</span>
                  </div>
                </div>
              </div>

              {/* Freeboard & Breach Probability */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Imminent Freeboard</div>
                  <div className="font-bold text-slate-800 text-sm">121.6 cm Rem.</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Breach Probability</div>
                  <div className="font-bold text-red-600 text-sm">38.4% (Severe)</div>
                </div>
              </div>
            </div>

            {/* Rapid Dispatch Unit Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-red-600 font-bold text-xs uppercase tracking-wider">
                <Radio className="w-4 h-4 text-red-600" />
                <span>Rapid Dispatch Unit</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Direct automated multichannel dissemination to vulnerable riverine Sandbars (Chars) and ferry points.
              </p>

              {/* Language Script Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                  <span>Alert Language Script</span>
                  <span className="text-sky-600 font-semibold">PREVIEW LOADED</span>
                </div>
                <div className="grid grid-cols-4 gap-1 text-xs">
                  {[
                    { key: "as", label: "অসমীয়া" },
                    { key: "br", label: "Bodo" },
                    { key: "bn", label: "বাংলা" },
                    { key: "hi", label: "हिन्दी" },
                  ].map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setSelectedScript(s.key as any)}
                      className={`py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                        selectedScript === s.key
                          ? "bg-[#0284c7] text-white shadow-2xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Localized Message Quote Bubble */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 text-xs italic leading-relaxed">
                &ldquo;{dispatchTemplates[selectedScript]}&rdquo;
              </div>

              {/* Real-time Delivery Channels List */}
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    SMS to Aapda Mitra
                  </span>
                  <span className="font-semibold font-mono text-slate-800">24 Leads Queued</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    Solar Village Siren
                  </span>
                  <span className="font-bold text-red-600">ARMED (5 Sirens)</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Assamese IVR Blast
                  </span>
                  <span className="font-semibold font-mono text-slate-800">Ready (1,480 Nos)</span>
                </div>
              </div>

              {/* Broadcast Danger Warning Button */}
              <button
                type="button"
                onClick={startBroadcastSimulation}
                className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 active:scale-98 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4 text-white" />
                <span>BROADCAST DANGER WARNING</span>
              </button>
            </div>

            {/* Designated Relief Shelters Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Designated Relief Shelters
                  </h3>
                  <p className="text-[10px] text-slate-400">Assam SDRF Majuli Ward Grid</p>
                </div>
                <LifeBuoy className="w-4 h-4 text-sky-600" />
              </div>

              {/* Shelter Item 1 */}
              <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Kamalabari Satra Hall</span>
                  <span className="px-2 py-0.5 rounded text-[9.5px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                    READY
                  </span>
                </div>
                <div className="text-[11px] text-slate-600">
                  Capacity: <strong className="text-slate-800">450</strong> · Occupancy: <strong className="text-slate-800">{shelter1Occupancy} ({((shelter1Occupancy/450)*100).toFixed(0)}%)</strong>
                </div>
                <div className="text-[10px] text-slate-500">
                  Purified Water: 3,200 L · SDRF Boats: {shelter1Boats} on-site
                </div>
              </div>

              {/* Shelter Item 2 */}
              <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Garamur High School</span>
                  <span className="px-2 py-0.5 rounded text-[9.5px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                    READY
                  </span>
                </div>
                <div className="text-[11px] text-slate-600">
                  Capacity: <strong className="text-slate-800">350</strong> · Occupancy: <strong className="text-slate-800">0 (0%)</strong>
                </div>
                <div className="text-[10px] text-slate-500">
                  Ration Kits: {shelter2Rations} Packets · Generator Powered
                </div>
              </div>

              {/* Rescue Boat Status Banner */}
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 h-16 flex items-end p-2 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900">
                <div className="relative z-10 flex items-center justify-between w-full">
                  <span className="text-[10.5px] font-bold text-white tracking-tight flex items-center gap-1.5">
                    <Anchor className="w-3.5 h-3.5 text-amber-400" />
                    SDRF Quick Response Boats Staged at Nimatighat
                  </span>
                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800">
                    4 INVENTORIED
                  </span>
                </div>
              </div>

              {/* Action Button: Opens Reallocate Modal */}
              <button
                type="button"
                onClick={() => setIsReallocateModalOpen(true)}
                className="w-full py-2 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Re-allocate Emergency Food & Boats</span>
              </button>
            </div>

          </div>

        </div>

      </main>

      {/* College Presentation Modal 1: Live Broadcast Simulation Stepper */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-red-600 font-bold text-sm uppercase tracking-wider">
                <Volume2 className="w-5 h-5 text-red-600 animate-pulse" />
                <span>Multi-Channel Broadcast Protocol Execution</span>
              </div>
              <button
                type="button"
                onClick={() => setIsBroadcastModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Broadcasting critical river breach danger warnings across Majuli Island sub-divisions in Assamese, Bodo, Bengali & Hindi.
            </p>

            {/* Stepper Progress */}
            <div className="space-y-2.5 text-xs">
              <div className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${broadcastStep >= 1 ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                <CheckCircle2 className={`w-4 h-4 ${broadcastStep >= 1 ? "text-emerald-600" : "text-slate-300"}`} />
                <span>1. Multi-lingual emergency translation engine activated (Assamese/Bodo/Bengali/Hindi)</span>
              </div>

              <div className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${broadcastStep >= 2 ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                <CheckCircle2 className={`w-4 h-4 ${broadcastStep >= 2 ? "text-emerald-600" : "text-slate-300"}`} />
                <span>2. Dispatched 24 SMS priority alerts to registered village Aapda Mitra volunteers</span>
              </div>

              <div className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${broadcastStep >= 3 ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                <CheckCircle2 className={`w-4 h-4 ${broadcastStep >= 3 ? "text-emerald-600" : "text-slate-300"}`} />
                <span className="font-semibold">3. Solar Village Sirens triggered at Kamalabari & Jengraimukh (RF 868MHz)</span>
              </div>

              <div className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${broadcastStep >= 4 ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                <CheckCircle2 className={`w-4 h-4 ${broadcastStep >= 4 ? "text-emerald-600" : "text-slate-300"}`} />
                <span>4. 1,480 automated IVR outbound voice calls initiated via carrier trunk</span>
              </div>

              <div className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${broadcastStep >= 5 ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                <CheckCircle2 className={`w-4 h-4 ${broadcastStep >= 5 ? "text-emerald-600" : "text-slate-300"}`} />
                <span className="font-bold">5. Synchronized with ASDMA Emergency Operations Center & WebSocket feed</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[11px] font-mono text-emerald-700 font-semibold">
                {broadcastStep === 5 ? "✓ All channels successfully engaged" : "Transmitting packets..."}
              </span>
              <button
                type="button"
                onClick={() => setIsBroadcastModalOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close Protocol Monitor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* College Presentation Modal 2: Re-allocate Emergency Food & Boats */}
      {isReallocateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-sky-800 font-bold text-sm uppercase tracking-wider">
                <LifeBuoy className="w-5 h-5 text-sky-600" />
                <span>SDRF Asset Re-allocation Dispatcher (Majuli Grid)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsReallocateModalOpen(false);
                  setReallocateFeedback(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Re-route motorized evacuation boats and flood ration supply kits to high-risk char zones.
            </p>

            {reallocateFeedback && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{reallocateFeedback}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              {/* Action 1: Deploy Boat */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Deploy SDRF Rescue Boat #02 to Kamalabari</div>
                  <div className="text-[11px] text-slate-500">Staged at Nimatighat · Estimated Arrival: 18 mins</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShelter1Boats((prev) => prev + 1);
                    setReallocateFeedback("SDRF Boat #02 dispatched to Kamalabari Satra Hall! Updated on console.");
                  }}
                  className="px-3 py-1.5 bg-[#0284c7] hover:bg-sky-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs"
                >
                  Deploy Boat
                </button>
              </div>

              {/* Action 2: Transfer Rations */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Transfer 200 Ration Kits to Garamur High School</div>
                  <div className="text-[11px] text-slate-500">Dry rations, water chlorine tablets, and baby food</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShelter2Rations((prev) => prev + 200);
                    setReallocateFeedback("200 Ration Kits transferred to Garamur High School! Updated on console.");
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs"
                >
                  Transfer Food
                </button>
              </div>

              {/* Action 3: Evacuation Triage */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Register 40 Evacuees at Kamalabari Satra</div>
                  <div className="text-[11px] text-slate-500">Inbound char families admitted to shelter hall</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShelter1Occupancy((prev) => Math.min(450, prev + 40));
                    setReallocateFeedback("40 evacuees registered at Kamalabari Satra Hall. Occupancy updated.");
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs"
                >
                  Log Evacuees
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsReallocateModalOpen(false);
                  setReallocateFeedback(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close Allocator
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
