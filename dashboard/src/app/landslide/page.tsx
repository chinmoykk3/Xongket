"use client";

import React, { useState } from "react";
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
  Globe,
  Layers,
  Mountain,
  Navigation,
  Radio,
  RefreshCw,
  Sliders,
  SlidersHorizontal,
  Target,
  TrendingDown,
  Volume2,
  Waves,
  X,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CommandSidebar } from "../../components/CommandSidebar";
import { useLanguage } from "../../context/LanguageContext";

export const dynamic = "force-dynamic";

export default function LandslidePage() {
  const { language, t } = useLanguage();
  const [selectedSlopeFilter, setSelectedSlopeFilter] = useState<string>("All Slopes");
  const [isEvacuationModalOpen, setIsEvacuationModalOpen] = useState(false);
  const [evacuationStep, setEvacuationStep] = useState(0);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationSuccess, setCalibrationSuccess] = useState(false);

  // Interactive Simulator State
  const [simSoilMoisture, setSimSoilMoisture] = useState<number>(86.2);
  const [simSlopeAngle, setSimSlopeAngle] = useState<number>(38);

  // Compute FoS dynamically based on Bishop equilibrium approximation
  // FoS = (c' + (gamma*z - u)*tan(phi)) / (gamma*z*sin(beta)*cos(beta))
  const computeFoS = (moisture: number, angle: number) => {
    const moistureRatio = moisture / 100.0;
    const porePressure = (moistureRatio - 0.45) * 48.0; // kPa
    const rad = (angle * Math.PI) / 180.0;
    const baseFoS = (28.0 + (50.0 - porePressure) * Math.tan((24.5 * Math.PI) / 180)) / (50.0 * Math.sin(rad) * Math.cos(rad) + 12.0);
    return Math.max(0.45, Math.min(2.5, Number(baseFoS.toFixed(2))));
  };

  const computedFoS = computeFoS(simSoilMoisture, simSlopeAngle);
  const effectivePorePressure = Number(((simSoilMoisture / 100.0 - 0.45) * 48.0).toFixed(1));
  const instantaneousRiskIndex = Number(Math.min(99.5, Math.max(10, ((1.8 - computedFoS) / 1.35) * 100)).toFixed(1));

  // Dynamic pore-pressure vs FoS curve
  const curveData = [
    { porePressure: 0, fos: 1.85 },
    { porePressure: 5, fos: 1.62 },
    { porePressure: 10, fos: 1.38 },
    { porePressure: 15, fos: 1.14 },
    { porePressure: 18.4, fos: 0.94 },
    { porePressure: 22, fos: 0.78 },
    { porePressure: 28, fos: 0.58 },
  ];

  const handleEvacuate = () => {
    setIsEvacuationModalOpen(true);
    setEvacuationStep(1);
    setTimeout(() => setEvacuationStep(2), 600);
    setTimeout(() => setEvacuationStep(3), 1300);
    setTimeout(() => setEvacuationStep(4), 2100);
  };

  const handleCalibration = () => {
    setIsCalibrating(true);
    setCalibrationSuccess(false);
    setTimeout(() => {
      setIsCalibrating(false);
      setCalibrationSuccess(true);
      setTimeout(() => setCalibrationSuccess(false), 3000);
    }, 1200);
  };

  const matrixVillages = [
    {
      name: "Sissiborgaon Hill Cut",
      coords: "27.52° N, 94.72° E · Transect C2",
      classification: "DANGER",
      slopeCategory: "High (>38°)",
      soilMoisture: "89%",
      rain24h: "72 mm",
      riskIndex: 84,
      status: "Imminent",
      badgeColor: "bg-red-50 text-red-700 border-red-200",
      barColor: "bg-red-600",
    },
    {
      name: "Jonai Foothills",
      coords: "27.98° N, 95.15° E · Border Escarpment",
      classification: "DANGER",
      slopeCategory: "Steep (>46°)",
      soilMoisture: "84%",
      rain24h: "64 mm",
      riskIndex: 78,
      status: "Severe",
      badgeColor: "bg-red-50 text-red-700 border-red-200",
      barColor: "bg-red-600",
    },
    {
      name: "Machkhowa Ridge",
      coords: "27.32° N, 94.52° E · Riverbank Bluff",
      classification: "WARNING",
      slopeCategory: "Moderate (22°)",
      soilMoisture: "74%",
      rain24h: "42 mm",
      riskIndex: 58,
      status: "Watch",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      barColor: "bg-purple-600",
    },
    {
      name: "North Lakhimpur Slopes",
      coords: "27.23° N, 94.10° E · Embankment Zone",
      classification: "ADVISORY",
      slopeCategory: "Low (12°)",
      soilMoisture: "62%",
      rain24h: "28 mm",
      riskIndex: 38,
      status: "Stable",
      badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
      barColor: "bg-teal-500",
    },
  ];

  return (
    <div className="flex min-h-[calc(100vh-60px)] w-full bg-[#f4f6f9]">
      {/* Left Operations Sidebar */}
      <CommandSidebar />

      {/* Main Console Canvas */}
      <main className="flex-1 p-4 lg:p-6 space-y-4 overflow-y-auto">
        
        {/* Sub-Header Operations Banner */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                CRITICAL SLOPE INSTABILITY
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Dhemaji-Lakhimpur Foothills Transect M06
              </span>
            </div>

            {/* Right Action Controls */}
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
                <Radio className="w-3.5 h-3.5 text-sky-600" />
                CATCHMENT RADAR: <strong className="text-slate-900 font-semibold">Jonai-Pasighat Corridor (15m Res)</strong>
              </span>

              <button
                type="button"
                onClick={handleEvacuate}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 active:scale-98 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4 text-white" />
                <span>Dispatch Evacuation Warning</span>
              </button>
            </div>
          </div>

          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Landslide & Geotechnical Risk Telemetry
            </h1>
            <p className="text-xs text-slate-500 max-w-4xl leading-relaxed mt-0.5">
              Automated geotechnical slip computation via capacitive soil sensors, Open-Meteo catchment arrays,
              and pore-water pressure matric models across vulnerable cut slopes.
            </p>
          </div>
        </div>

        {/* Top Section: Integrated Terramechanical Risk + 4 Sensor Probe Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Card 1: Integrated Terramechanical Risk (Gauge Meter) - 4 Cols */}
          <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                MODEL COMPUTE (LIQUEFACTION RISK)
              </div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Integrated Terramechanical Risk
              </h3>
            </div>

            {/* Semicircular SVG Gauge */}
            <div className="flex flex-col items-center justify-center pt-2">
              <div className="relative w-48 h-24 flex items-end justify-center">
                <svg viewBox="0 0 200 100" className="w-full h-full">
                  {/* Gauge Arc Track */}
                  <path
                    d="M 20 100 A 80 80 0 0 1 180 100"
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="16"
                    strokeLinecap="round"
                  />
                  {/* Colored Danger Arc */}
                  <path
                    d="M 20 100 A 80 80 0 0 1 155 42"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="16"
                    strokeLinecap="round"
                    strokeDasharray="251.2"
                    strokeDashoffset="54"
                  />
                </svg>

                <div className="absolute inset-x-0 bottom-0 flex flex-col items-center leading-none">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900 tracking-tight">78.4</span>
                    <span className="text-xs font-bold text-slate-400">/ 100</span>
                  </div>
                  <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                    SEVERE DANGER LEVEL
                  </span>
                </div>
              </div>
            </div>

            {/* Limit State Details */}
            <div className="p-3 bg-red-50/50 border border-red-100 rounded-xl space-y-1 text-xs">
              <div className="flex items-center justify-between text-red-950 font-bold">
                <span>Limit State Equilibrium:</span>
                <span className="text-red-600 font-extrabold">Plastic Limit Exceeded (+8.4%)</span>
              </div>
              <p className="text-[11px] text-red-900/80 leading-relaxed">
                Subsurface pore-pressures along the Dhemaji foothills exceed basal shear capacity. Clay-silt stratigraphy
                failure plane detected at 1.8m to 2.2m depth profile.
              </p>
            </div>
          </div>

          {/* Right 4 KPI Cards (8 Cols in a 2x2 grid) */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Card 2: Slope Soil Moisture */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-bold text-slate-400 tracking-wider uppercase">
                  Probe Telemetry (Mean)
                </span>
                <div className="w-6 h-6 rounded-md bg-sky-50 flex items-center justify-center text-sky-600">
                  <Droplets className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xs font-semibold text-slate-800">Slope Soil Moisture</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#0284c7] tracking-tight">86.2%</span>
                <span className="text-[11px] font-bold text-rose-600">↗ +14.6% vs normal</span>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                <span>Calibrated: Capacitive V2.0</span>
                <span className="font-semibold text-red-600">Plastic Limit: 78.0%</span>
              </div>
            </div>

            {/* Card 3: 24h Rainfall Total */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-bold text-slate-400 tracking-wider uppercase">
                  Triggering Inflow
                </span>
                <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center text-blue-600">
                  <CloudRain className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xs font-semibold text-slate-800">24h Rainfall Total</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 tracking-tight">68.4</span>
                <span className="text-xs font-semibold text-slate-500">mm</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-50 text-red-700 border border-red-200">
                  ! Trigger: 55mm
                </span>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                <span>Open-Meteo Virtual Gauge</span>
                <span className="font-mono text-slate-700">Rate: 5.6 mm/hr</span>
              </div>
            </div>

            {/* Card 4: 72h Antecedent Precipitation */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-bold text-slate-400 tracking-wider uppercase">
                  Catchment Saturation Memory
                </span>
                <div className="w-6 h-6 rounded-md bg-purple-50 flex items-center justify-center text-purple-600">
                  <Layers className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xs font-semibold text-slate-800">72h Antecedent Precipitation</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-purple-900 tracking-tight">142.0</span>
                <span className="text-xs font-semibold text-slate-500">mm</span>
                <span className="text-[10px] font-bold text-purple-700 uppercase bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  Super-Saturated
                </span>
              </div>
              <div className="pt-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                  <span>Hydraulic load building</span>
                  <span className="font-semibold text-purple-700">91% capacity</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-purple-600 h-full rounded-full w-[91%]" />
                </div>
              </div>
            </div>

            {/* Card 5: Seismic Micro-Tremor */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-bold text-slate-400 tracking-wider uppercase">
                  Geotechnical Sensor Bed
                </span>
                <div className="w-6 h-6 rounded-md bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Activity className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xs font-semibold text-slate-800">Seismic Micro-Tremor</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 tracking-tight">0.18</span>
                <span className="text-xs font-semibold text-slate-500">g</span>
                <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  ● Baseline Nominal
                </span>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100 font-mono text-[10px]">
                <span>Dhemaji Fault Trace MZ</span>
                <span>3-Axis MEMS Sync</span>
              </div>
            </div>

          </div>

        </div>

        {/* Middle Two-Column Grid: Multi-Village Risk Matrix + Hazard Terrain Focus */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Left Column (8 of 12 cols): Multi-Village Landslide Risk Matrix Table */}
          <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-4 lg:p-5 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Multi-Village Landslide Risk Matrix
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Sub-district micro-catchments & slope-failure probability array
                </p>
              </div>

              {/* Slope Classification Filters */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                {["All Slopes", "Steep (>45°)", "High (30°-45°)", "Moderate (15°-30°)", "Low (<15°)"].map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setSelectedSlopeFilter(filter)}
                    className={`px-2.5 py-1 rounded-md text-[10.5px] font-semibold transition-all cursor-pointer ${
                      selectedSlopeFilter === filter
                        ? "bg-[#0284c7] text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50/80 text-[10px] uppercase font-bold text-slate-400 tracking-wider border-y border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Village / Cut Slope</th>
                    <th className="py-2.5 px-2">Classification</th>
                    <th className="py-2.5 px-2">Slope</th>
                    <th className="py-2.5 px-2">Soil Moisture</th>
                    <th className="py-2.5 px-2">24h Rain</th>
                    <th className="py-2.5 px-2">Risk Index</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {matrixVillages.map((v) => (
                    <tr key={v.name} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{v.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{v.coords}</div>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${v.badgeColor}`}>
                          {v.classification}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-slate-700 font-mono text-[11px]">{v.slopeCategory}</td>
                      <td className="py-2.5 px-2 font-bold text-slate-900">{v.soilMoisture}</td>
                      <td className="py-2.5 px-2 font-mono text-slate-700">{v.rain24h}</td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 w-5">{v.riskIndex}</span>
                          <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className={`${v.barColor} h-full rounded-full`} style={{ width: `${v.riskIndex}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                        {v.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column (4 of 12 cols): Hazard Terrain Focus */}
          <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Hazard Terrain Focus
                </h3>
                <span className="text-[10px] font-mono text-slate-500 uppercase">
                  Jonai Foothills Cut
                </span>
              </div>

              {/* Vector Cut Slope Inception Graphic */}
              <div className="relative w-full h-36 bg-slate-900 rounded-xl overflow-hidden border border-slate-200">
                <svg viewBox="0 0 400 160" className="w-full h-full object-cover">
                  {/* Sky/Hill Gradient */}
                  <defs>
                    <linearGradient id="hillGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1e293b" />
                      <stop offset="100%" stopColor="#0f172a" />
                    </linearGradient>
                  </defs>
                  <rect width="400" height="160" fill="url(#hillGrad)" />

                  {/* Cut Slope Stratigraphy Layers */}
                  <path d="M0,40 Q150,50 240,90 L400,140 L400,160 L0,160 Z" fill="#334155" />
                  <path d="M60,65 Q180,85 260,115 L400,150 L400,160 L60,160 Z" fill="#1e293b" opacity="0.8" />
                  
                  {/* Red Shear Failure Plane */}
                  <path
                    d="M120,55 Q200,90 280,125"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="3"
                    strokeDasharray="4 3"
                  />
                  <circle cx="200" cy="90" r="5" fill="#ef4444" />
                  <circle cx="200" cy="90" r="10" fill="#ef4444" opacity="0.4" className="animate-ping" />

                  {/* Trees & Scree */}
                  <polygon points="50,45 55,30 60,45" fill="#22c55e" />
                  <polygon points="70,50 75,35 80,50" fill="#22c55e" />
                  <polygon points="90,55 95,40 100,55" fill="#22c55e" />
                </svg>

                <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[9.5px] px-2 py-0.5 rounded font-mono flex items-center gap-1.5">
                  <span>Slope Failure Inception Zone (SF-09)</span>
                  <span className="px-1.5 py-0.2 bg-red-600 rounded text-[9px] font-bold">Unstable</span>
                </div>
              </div>

              {/* Geotechnical Specs */}
              <div className="space-y-2 text-xs divide-y divide-slate-100">
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-500">Internal Friction Angle (φ)</span>
                  <span className="font-semibold text-slate-800">24.5° (Degraded from 32°)</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-500">Factor of Safety (FoS)</span>
                  <span className="font-black text-red-600">0.92 (&lt; 1.0 Failure)</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-500">Estimated Slide Volume</span>
                  <span className="font-mono text-slate-800 font-semibold">~14,200 m³</span>
                </div>
              </div>
            </div>

            {/* GIS Link Button */}
            <button
              type="button"
              className="w-full py-2 px-3 rounded-lg border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2"
            >
              <Globe className="w-3.5 h-3.5 text-sky-600" />
              <span>Open Full Geotechnical GIS Map</span>
            </button>
          </div>

        </div>

        {/* Bottom Section: Geotechnical Sensitivity Simulator + Sensor Calibration */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Left Column (8 of 12 cols): Geotechnical Sensitivity & Pore-Pressure Simulator */}
          <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-4 lg:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Geotechnical Sensitivity & Pore-Pressure Simulator
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Real-time dynamic stress & factor-of-safety solver based on Bishop simplified equilibrium
                </p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200">
                Interactive
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Sliders Container */}
              <div className="space-y-4 text-xs">
                {/* Slider 1: Simulated Soil Moisture */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-slate-700">Simulated Soil Moisture</span>
                    <span className="font-mono text-[#0284c7] font-bold">{simSoilMoisture}%</span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="95"
                    step="0.5"
                    value={simSoilMoisture}
                    onChange={(e) => setSimSoilMoisture(Number(e.target.value))}
                    className="w-full accent-sky-600 cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-[9.5px] text-slate-400 font-mono">
                    <span>Field Cap (40%)</span>
                    <span>Plastic (70%)</span>
                    <span>Liquefaction (90%)</span>
                  </div>
                </div>

                {/* Slider 2: Slope Gradient Angle */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-slate-700">Slope Gradient Angle</span>
                    <span className="font-mono text-[#0284c7] font-bold">{simSlopeAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="55"
                    step="1"
                    value={simSlopeAngle}
                    onChange={(e) => setSimSlopeAngle(Number(e.target.value))}
                    className="w-full accent-sky-600 cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-[9.5px] text-slate-400 font-mono">
                    <span>Gentle (10°)</span>
                    <span>Mid (25°)</span>
                    <span>Steep (50°)</span>
                  </div>
                </div>

                {/* Terramechanical Outputs Box */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="text-[10px] font-bold uppercase text-slate-400">
                    COMPUTED TERRAMECHANICAL OUTPUTS
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Instantaneous Risk Index:</span>
                    <span className="font-mono text-red-600 font-black">{instantaneousRiskIndex} / 100</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Computed FoS:</span>
                    <span className={`font-mono font-black ${computedFoS < 1.0 ? "text-red-600" : "text-emerald-600"}`}>
                      {computedFoS} {computedFoS < 1.0 ? "(Critical Failure)" : "(Stable)"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Effective Pore Pressure (u):</span>
                    <span className="font-mono text-sky-700 font-bold">{effectivePorePressure} kPa</span>
                  </div>
                </div>
              </div>

              {/* Chart: Pore-water pressure vs FoS curve */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-500">
                  <span>Pore-Water Pressure vs Factor of Safety Curve</span>
                  <span className="text-sky-600">Real-time Curve</span>
                </div>
                <div className="h-44 w-full bg-slate-50/60 rounded-xl border border-slate-200 p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={curveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="porePressure" tick={{ fontSize: 9, fill: "#64748b" }} unit="kPa" />
                      <YAxis domain={[0.4, 2.0]} tick={{ fontSize: 9, fill: "#64748b" }} />
                      <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "8px" }} />
                      <ReferenceLine y={1.0} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "FoS = 1.0", fill: "#ef4444", fontSize: 9 }} />
                      <Line type="monotone" dataKey="fos" stroke="#0284c7" strokeWidth={2} dot={false} />
                      <ReferenceDot x={18.4} y={0.94} r={4} fill="#ef4444" stroke="#ffffff" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Soil Saturation: {simSoilMoisture}%</span>
                  <span className="text-red-600 font-bold">FoS Decline Trigger Zone</span>
                </div>
              </div>

            </div>
          </div>

          {/* Right Column (4 of 12 cols): Capacitive V2.0 Sensor Calibration */}
          <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Capacitive V2.0 Sensor Calibration
                </h3>
                <p className="text-[10px] text-slate-400">Embankment clay-silt probe normalization</p>
              </div>
              <Sliders className="w-4 h-4 text-sky-600" />
            </div>

            {calibrationSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Zero-balance normalization completed! Offset stored to EEPROM.</span>
              </div>
            )}

            <div className="space-y-2 text-xs">
              {/* Box 1: Dry Baseline */}
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 space-y-0.5">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-700">ADC Dry Baseline (raw_dry):</span>
                  <span className="font-mono text-slate-900">820 ADC</span>
                </div>
                <p className="text-[10px] text-slate-500">Sensor dry air reference reading in open calibration tube</p>
              </div>

              {/* Box 2: Wet Peak */}
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 space-y-0.5">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-700">ADC Saturated Peak (raw_wet):</span>
                  <span className="font-mono text-slate-900">380 ADC</span>
                </div>
                <p className="text-[10px] text-slate-500">Slurry immersed saturation calibration reference point</p>
              </div>

              {/* Current Output */}
              <div className="p-2.5 rounded-lg border border-sky-100 bg-sky-50/50 flex items-center justify-between">
                <span className="font-bold text-sky-950">Current In-Situ Output:</span>
                <span className="font-mono font-bold text-sky-800">441 ADC (86.2% Sat)</span>
              </div>
            </div>

            {/* Zero-Balance Calibration Button */}
            <button
              type="button"
              onClick={handleCalibration}
              disabled={isCalibrating}
              className="w-full py-2 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCalibrating ? "animate-spin text-sky-600" : ""}`} />
              <span>{isCalibrating ? "Calibrating Sensor Bed..." : "Zero-Balance Calibration"}</span>
            </button>

            <div className="text-[10px] text-center text-slate-400 font-mono">
              Last physical calibration: 4 hours ago via LoRa Gateway #04
            </div>
          </div>

        </div>

      </main>

      {/* Evacuation Warning Dispatch Modal */}
      {isEvacuationModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-red-600 font-bold text-sm uppercase tracking-wider">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span>Geotechnical Evacuation Protocol Execution</span>
              </div>
              <button
                type="button"
                onClick={() => setIsEvacuationModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Dispatching urgent slope instability evacuation order to foothill hamlets along Jonai & Sissiborgaon hill transects.
            </p>

            <div className="space-y-2.5 text-xs">
              <div className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${evacuationStep >= 1 ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                <CheckCircle2 className={`w-4 h-4 ${evacuationStep >= 1 ? "text-emerald-600" : "text-slate-300"}`} />
                <span>1. Triggered geo-fenced Cell Broadcast alert across Dhemaji foothills</span>
              </div>
              <div className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${evacuationStep >= 2 ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                <CheckCircle2 className={`w-4 h-4 ${evacuationStep >= 2 ? "text-emerald-600" : "text-slate-300"}`} />
                <span>2. Automated SMS sent to 48 village headmen & local emergency responders</span>
              </div>
              <div className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${evacuationStep >= 3 ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                <CheckCircle2 className={`w-4 h-4 ${evacuationStep >= 3 ? "text-emerald-600" : "text-slate-300"}`} />
                <span>3. Solar warning horn sound sequence initiated at Transect SF-09</span>
              </div>
              <div className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${evacuationStep >= 4 ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                <CheckCircle2 className={`w-4 h-4 ${evacuationStep >= 4 ? "text-emerald-600" : "text-slate-300"}`} />
                <span className="font-bold">4. Evacuation shelters at Jonai Higher Secondary School alerted</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[11px] font-mono text-emerald-700 font-semibold">
                {evacuationStep === 4 ? "✓ Evacuation warning active on network" : "Dispatching orders..."}
              </span>
              <button
                type="button"
                onClick={() => setIsEvacuationModalOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close Protocol Monitor
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
