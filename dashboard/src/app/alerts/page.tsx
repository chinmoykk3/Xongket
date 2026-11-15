"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Flame,
  Globe,
  Lock,
  Megaphone,
  MessageCircle,
  MessageSquare,
  PhoneCall,
  Radio,
  RefreshCw,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Star,
  Volume2,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { CommandSidebar } from "../../components/CommandSidebar";
import { useLanguage } from "../../context/LanguageContext";

export const dynamic = "force-dynamic";

export default function MultiChannelAlertTerminal() {
  const { language, t } = useLanguage();

  // Composer Form States
  const [selectedDistrict, setSelectedDistrict] = useState<string>("Majuli (River Island)");
  const [selectedVillageSector, setSelectedVillageSector] = useState<string>("Kamalabari Char Sector-4 (Majuli)");
  const [selectedHazard, setSelectedHazard] = useState<"river_flood" | "flash_deluge" | "landslide" | "earthquake">("river_flood");
  const [selectedTier, setSelectedTier] = useState<"advisory" | "warning" | "danger">("danger");
  const [bypassCooldown, setBypassCooldown] = useState<boolean>(false);

  // Filter States for Queue
  const [queueFilter, setQueueFilter] = useState<"all" | "sirens">("all");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Dispatch Execution Modal
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState<boolean>(false);
  const [dispatchStep, setDispatchStep] = useState<number>(0);

  // Individual Ack State
  const [ackedItems, setAckedItems] = useState<Record<string, boolean>>({});

  const handleAck = (id: string) => {
    setAckedItems((prev) => ({ ...prev, [id]: true }));
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleStartDispatch = () => {
    setIsDispatchModalOpen(true);
    setDispatchStep(1);
    setTimeout(() => setDispatchStep(2), 600);
    setTimeout(() => setDispatchStep(3), 1300);
    setTimeout(() => setDispatchStep(4), 2100);
    setTimeout(() => setDispatchStep(5), 2800);
  };

  // Queue events matching screenshot
  const queueEvents = [
    {
      id: "#DSP-9042",
      time: "14:02:11 IST",
      target: "Kamalabari Siren Pole #02",
      targetSub: "Majuli Char Block 4",
      role: "Physical Siren",
      roleColor: "bg-red-50 text-red-700 border-red-200",
      channel: "LoRa RF 868MHz",
      channelIcon: Radio,
      relayStatus: "125 dB (180s cycle active) · Relay confirmed (4/4 solar sirens)",
      latency: "320ms",
      status: "BLARING",
      statusBadge: "bg-red-600 text-white animate-pulse",
      actionText: "Acknowledge",
      actionType: "ack",
      isSiren: true,
    },
    {
      id: "#DSP-9041",
      time: "14:02:08 IST",
      target: "Majuli Flood Response Unit",
      targetSub: "+91 94350 *****",
      role: "ASDMA Field Exec",
      roleColor: "bg-sky-50 text-sky-700 border-sky-200",
      channel: "WhatsApp API",
      channelIcon: MessageCircle,
      relayStatus: "Delivery Receipt Double-Blue (Meta MsgId: wamid.HBgM3450...)",
      latency: "510ms",
      status: "Delivered",
      statusBadge: "bg-sky-50 text-sky-700 border-sky-200",
      actionText: "Acked by Exec",
      actionType: "info",
      isSiren: false,
    },
    {
      id: "#DSP-9040",
      time: "14:02:04 IST",
      target: "Gram Pradhan (Bhaben Das)",
      targetSub: "+91 98640 *****",
      role: "Gram Panchayat",
      roleColor: "bg-purple-50 text-purple-700 border-purple-200",
      channel: "Assamese IVR",
      channelIcon: PhoneCall,
      relayStatus: "Duration 44s | Keypad '1' Pressed (Acknowledged)",
      latency: "1,240ms",
      status: "Answered (Key-1)",
      statusBadge: "bg-sky-100 text-sky-800 border-sky-300",
      actionText: "Audit Note",
      actionType: "note",
      isSiren: false,
    },
    {
      id: "#DSP-9039",
      time: "14:01:58 IST",
      target: "Village Aapda Mitra Corps (24 Vol)",
      targetSub: "State Carrier Node [BSNL/Airtel]",
      role: "Volunteer Net",
      roleColor: "bg-blue-50 text-blue-700 border-blue-200",
      channel: "Carrier SMS",
      channelIcon: MessageSquare,
      relayStatus: "23 Delivered | 1 Carrier Tower Handover Retry",
      latency: "880ms",
      status: "Retrying (1/3)",
      statusBadge: "bg-amber-50 text-amber-700 border-amber-200",
      actionText: "Force Voice IVR",
      actionType: "retry",
      isSiren: false,
    },
  ];

  const filteredEvents = queueEvents.filter((ev) => {
    if (queueFilter === "sirens") return ev.isSiren;
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
                CRITICAL TELECOM TRUNK // GATEWAY-04
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Assam C-DOT CAP V3 Protocol Engaged
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                <Star className="w-3.5 h-3.5 fill-purple-600 text-purple-600" />
                5/5 Pipelines Active
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Carrier Certs OK
              </span>
            </div>
          </div>

          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Multi-Channel Alert Dispatch Terminal
            </h1>
          </div>
        </div>

        {/* Top Section: 24-Hour Throughput + Carrier Infrastructure Status */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Card 1: 24-Hour Throughput (4 Cols) */}
          <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                24-Hour Throughput
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                98.4% Delivered
              </span>
            </div>

            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">1,482</span>
                <span className="text-xs font-semibold text-slate-500">Dispatched Alerts</span>
              </div>
            </div>

            {/* 3 Metric Pills */}
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 text-center text-xs">
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-[9.5px] uppercase font-bold text-slate-400">DELIVERED</div>
                <div className="font-extrabold text-slate-800 text-sm mt-0.5">1,458</div>
              </div>
              <div className="p-2 bg-purple-50/60 rounded-xl border border-purple-100">
                <div className="text-[9.5px] uppercase font-bold text-purple-700">RETRYING</div>
                <div className="font-extrabold text-purple-900 text-sm mt-0.5">12 <span className="text-[10px] font-normal text-purple-600">max-3</span></div>
              </div>
              <div className="p-2 bg-emerald-50/60 rounded-xl border border-emerald-100">
                <div className="text-[9.5px] uppercase font-bold text-emerald-700">SPAM DROPPED</div>
                <div className="font-extrabold text-emerald-900 text-sm mt-0.5">0 ✓</div>
              </div>
            </div>

            <div className="text-[10.5px] text-slate-500 font-mono flex items-center gap-1.5 pt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-600" />
              Per-Village Rate-Limiter Armed: <strong>300s Cooldown</strong>
            </div>
          </div>

          {/* Card 2: Carrier & Physical Infrastructure Status (8 Cols) */}
          <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Carrier & Physical Infrastructure Status
              </span>
              <span className="text-xs font-mono text-slate-500">
                Latency Avg: <strong className="text-slate-800">640ms</strong>
              </span>
            </div>

            {/* 5 Channel Tiles in a Row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              
              {/* Channel 1: Carrier SMS */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <div className="w-6 h-6 rounded bg-sky-100 flex items-center justify-center text-sky-700">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                <div className="font-bold text-slate-900 text-xs mt-1">Carrier SMS</div>
                <div className="text-[10px] text-slate-500">Twilio / DLT REST</div>
                <div className="font-mono text-[11px] font-bold text-slate-800 pt-0.5">99.1% ok</div>
              </div>

              {/* Channel 2: Voice IVR */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <div className="w-6 h-6 rounded bg-purple-100 flex items-center justify-center text-purple-700">
                    <PhoneCall className="w-3.5 h-3.5" />
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                </div>
                <div className="font-bold text-slate-900 text-xs mt-1">Voice IVR</div>
                <div className="text-[10px] text-slate-500">Assamese/Bodo TTS</div>
                <div className="font-mono text-[11px] font-bold text-purple-900 pt-0.5">42 Lines Call</div>
              </div>

              {/* Channel 3: WhatsApp */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <div className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <MessageCircle className="w-3.5 h-3.5" />
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                <div className="font-bold text-slate-900 text-xs mt-1">WhatsApp</div>
                <div className="text-[10px] text-slate-500">Meta Cloud API</div>
                <div className="font-mono text-[11px] font-bold text-emerald-900 pt-0.5">Tier-1 Limit</div>
              </div>

              {/* Channel 4: WebSockets */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center text-blue-700">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                </div>
                <div className="font-bold text-slate-900 text-xs mt-1">WebSockets</div>
                <div className="text-[10px] text-slate-500">Panchayat Clients</div>
                <div className="font-mono text-[11px] font-bold text-blue-900 pt-0.5">480 Conns</div>
              </div>

              {/* Channel 5: Village Sirens */}
              <div className="p-3 bg-red-50/60 border border-red-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <div className="w-6 h-6 rounded bg-red-100 flex items-center justify-center text-red-700">
                    <Volume2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                </div>
                <div className="font-bold text-red-950 text-xs mt-1">Village Sirens</div>
                <div className="text-[10px] text-red-700">LoRa / 4G Relay</div>
                <div className="font-mono text-[11px] font-black text-red-600 pt-0.5">118 Armed</div>
              </div>

            </div>

            {/* Footer Route Notification */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
              <span className="flex items-center gap-1.5 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Automatic Failover Route: IVR → SMS Failback enabled for remote Barpeta char areas
              </span>
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                CAP-v1.2 compliant
              </span>
            </div>
          </div>

        </div>

        {/* Middle Section: Emergency Alert Composer + Automated Multilingual Translation Engine */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Left Column (5 of 12 cols): Emergency Alert Composer */}
          <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-4 lg:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                  <Megaphone className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Emergency Alert Composer
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-bold">
                ROLE: SDMA-EXEC
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              
              {/* Target District */}
              <div>
                <label className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Target District
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["Majuli (River Island)", "Dhemaji", "Lakhimpur", "Barpeta"].map((dist) => (
                    <button
                      key={dist}
                      type="button"
                      onClick={() => setSelectedDistrict(dist)}
                      className={`py-2 px-3 rounded-lg border text-left text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                        selectedDistrict === dist
                          ? "bg-sky-50 border-sky-500 text-sky-800 shadow-2xs font-bold"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span className="truncate">{dist}</span>
                      {selectedDistrict === dist && <Check className="w-3.5 h-3.5 text-sky-600 shrink-0 ml-1" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Village / Sector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                    Target Village / Sector
                  </label>
                  <button
                    type="button"
                    onClick={() => setSelectedVillageSector("All Riverine Chars (Sectors 1-12)")}
                    className="text-[10px] font-semibold text-sky-600 hover:text-sky-700 cursor-pointer"
                  >
                    Select All Char Areas
                  </button>
                </div>
                <select
                  value={selectedVillageSector}
                  onChange={(e) => setSelectedVillageSector(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 text-xs focus:bg-white focus:border-sky-500 transition-colors"
                >
                  <option value="Kamalabari Char Sector-4 (Majuli)">Kamalabari Char Sector-4 (Majuli)</option>
                  <option value="Jengraimukh Embankment (Majuli)">Jengraimukh Embankment (Majuli)</option>
                  <option value="Garamur Riverfront Sector (Majuli)">Garamur Riverfront Sector (Majuli)</option>
                  <option value="Salmora Erosion Point (Majuli)">Salmora Erosion Point (Majuli)</option>
                  <option value="All Riverine Chars (Sectors 1-12)">All Riverine Chars (Sectors 1-12)</option>
                </select>
              </div>

              {/* Hazard Classification */}
              <div>
                <label className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Hazard Classification
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "river_flood", label: "River Flood", sub: "HC-SR04 Triggered" },
                    { id: "flash_deluge", label: "Flash Deluge", sub: "Subansiri Surge" },
                    { id: "landslide", label: "Landslide", sub: "Geotech Incline" },
                    { id: "earthquake", label: "Earthquake", sub: "3-Axis Accelerometer" },
                  ].map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setSelectedHazard(h.id as any)}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        selectedHazard === h.id
                          ? "bg-sky-50 border-sky-500 text-sky-900 shadow-2xs font-semibold"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <div className="font-bold text-xs">{h.label}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{h.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Severity Escalation Tier */}
              <div>
                <label className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Severity Escalation Tier
                </label>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { id: "advisory", label: "Advisory", sub: "Volunteers Only" },
                    { id: "warning", label: "Warning", sub: "Volunteers + GP" },
                    { id: "danger", label: "Danger", sub: "Sirens + Broadcast" },
                  ].map((tier) => {
                    const isSelected = selectedTier === tier.id;
                    const isDanger = tier.id === "danger";
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => setSelectedTier(tier.id as any)}
                        className={`py-2 px-1 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? isDanger
                              ? "bg-red-600 text-white border-red-600 shadow-xs"
                              : "bg-sky-600 text-white border-sky-600 shadow-xs"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div className="font-bold text-xs flex items-center justify-center gap-1">
                          {isDanger && <Flame className="w-3 h-3" />}
                          {tier.label}
                        </div>
                        <div className={`text-[9.5px] mt-0.5 ${isSelected ? "text-white/80" : "text-slate-400"}`}>
                          {tier.sub}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bypass Cooldown Toggle */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800 text-xs">Bypass Rate Limit Cooldown</div>
                  <div className="text-[10px] text-slate-500">District Magistrate Signed Authorization</div>
                </div>
                <button
                  type="button"
                  onClick={() => setBypassCooldown(!bypassCooldown)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    bypassCooldown ? "bg-red-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      bypassCooldown ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Big Red Button */}
              <button
                type="button"
                onClick={handleStartDispatch}
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 active:scale-98 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4 text-white" />
                <span>INITIATE EMERGENCY DISPATCH (5 CHANNELS)</span>
              </button>

              <div className="text-[10px] text-slate-400 text-center leading-tight">
                Warning: Action triggers 118 high-decibel village sirens and carrier SMS broadcast
              </div>
            </div>
          </div>

          {/* Right Column (7 of 12 cols): Automated Multilingual Translation Engine */}
          <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-4 lg:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
                  <Globe className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Automated Multilingual Translation Engine
                </h3>
              </div>
              <span className="text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                NLP Synced
              </span>
            </div>

            {/* 4 Translation Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              
              {/* Card 1: Assamese */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-900">
                    <span>অসমীয়া (Primary State)</span>
                    <span className="text-[9.5px] text-slate-500 font-mono">TTS & SMS</span>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-relaxed font-serif">
                    <strong className="text-red-600 font-bold">[বিপদ সংকেত]</strong> কমলবাৰী চৰ ৪নং খণ্ডত ব্ৰহ্মপুত্ৰৰ জলপৃষ্ঠ বিপদসীমাৰ ০.৮৫ মি. ওপৰত গৈছে। সকলো নৈপৰীয়া আৰু আশ্ৰয় শিবিৰলৈ যাবলৈ আহ্বান জনোৱা হৈছে।
                  </p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-200/60 font-mono">
                  <span>Chars: 138 | 1 SMS Segment</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                    Verified <Check className="w-3 h-3 text-emerald-600" />
                  </span>
                </div>
              </div>

              {/* Card 2: Bodo */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-900">
                    <span>बर' (Bodo - 6th Schedule)</span>
                    <span className="text-[9.5px] text-slate-500 font-mono">IVR Call</span>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-relaxed font-serif">
                    <strong className="text-red-600 font-bold">[खैफोद खौरां]</strong> कमालबारि चार-४ ओनसोलाव दै बानाया खैफोदनि सिमायाव थांगासिनो दं। गासै सुबुंफोरखौ गौथौयै रैखाथि जायगायाव थांनो खावलायनाय जाबाय।
                  </p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-200/60 font-mono">
                  <span>Audio Cache: Ready (6.4s)</span>
                  <span className="text-purple-700 font-bold flex items-center gap-0.5">
                    Synthesized <Check className="w-3 h-3 text-purple-600" />
                  </span>
                </div>
              </div>

              {/* Card 3: Bengali */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-900">
                    <span>বাংলা (Bengali - Barak & Chars)</span>
                    <span className="text-[9.5px] text-slate-500 font-mono">WhatsApp/SMS</span>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-relaxed font-serif">
                    <strong className="text-red-600 font-bold">[জরুরি সতর্কতা]</strong> কমলবাড়ি চর অঞ্চলে জলস্তর বিপদসীমা অতিক্রম করেছে (+০.৮৫ মি.)। অবিলম্বে নিকটবর্তী আশ্রয়কেন্দ্রে চলে যান।
                  </p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-200/60 font-mono">
                  <span>Chars: 122 | DLT Approved</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                    Verified <Check className="w-3 h-3 text-emerald-600" />
                  </span>
                </div>
              </div>

              {/* Card 4: English */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-900">
                    <span>English (NDRF & Inter-Agency)</span>
                    <span className="text-[9.5px] text-slate-500 font-mono">CAP XML / Push</span>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-relaxed font-sans">
                    <strong className="text-red-600 font-bold">[DANGER RED ALERT]</strong> Brahmaputra level at Kamalabari Char Sector-4 is +0.85m above Danger Level. Evacuate to elevated shelters immediately. Sirens armed.
                  </p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-200/60 font-mono">
                  <span>NDRF CAP-IN Standard</span>
                  <span className="text-sky-700 font-bold flex items-center gap-0.5">
                    Signed <Check className="w-3 h-3 text-sky-600" />
                  </span>
                </div>
              </div>

            </div>

            {/* Bottom Sensor Telemetry Feed Strip */}
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <Activity className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
                Sensor Feed: <strong className="font-semibold text-slate-900 font-mono">Node #104 (Sonar + Hydrostatic)</strong>
              </span>
              <span className="font-mono text-slate-600 text-[11px]">
                Reading: <strong className="text-red-600 font-bold">86.42m MSL (+0.12m/hr)</strong> | Reliability: 99.8%
              </span>
            </div>
          </div>

        </div>

        {/* Bottom Section: Live Dispatch Queue & Siren Relays */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 lg:p-5 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Live Dispatch Queue & Siren Relays
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Real-time packet acknowledgments from village relays, telecom switches, and acoustic alarms
              </p>
            </div>

            {/* Filter Buttons & Refresh */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setQueueFilter("all")}
                  className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    queueFilter === "all" ? "bg-[#0284c7] text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All Events
                </button>
                <button
                  type="button"
                  onClick={() => setQueueFilter("sirens")}
                  className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    queueFilter === "sirens" ? "bg-[#0284c7] text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Sirens Only (118)
                </button>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                title="Refresh dispatch queue"
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-sky-600" : ""}`} />
              </button>
            </div>
          </div>

          {/* Queue Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/80 text-[10px] uppercase font-bold text-slate-400 tracking-wider border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Event ID / Time</th>
                  <th className="py-2.5 px-2">Target / Unit</th>
                  <th className="py-2.5 px-2">Recipient Role</th>
                  <th className="py-2.5 px-2">Channel</th>
                  <th className="py-2.5 px-2">Relay / Decibel Status</th>
                  <th className="py-2.5 px-2">Latency</th>
                  <th className="py-2.5 px-2">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredEvents.map((ev) => {
                  const ChannelIcon = ev.channelIcon;
                  const isAcked = ackedItems[ev.id];
                  return (
                    <tr key={ev.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-mono font-bold text-slate-900">{ev.id}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{ev.time}</div>
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="font-semibold text-slate-900">{ev.target}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{ev.targetSub}</div>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${ev.roleColor}`}>
                          {ev.role}
                        </span>
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <ChannelIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{ev.channel}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-slate-600 text-[11px] max-w-xs">
                        {ev.relayStatus}
                      </td>
                      <td className="py-2.5 px-2 font-mono text-[11px] text-slate-600">{ev.latency}</td>
                      <td className="py-2.5 px-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isAcked ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : ev.statusBadge}`}>
                          {isAcked ? "✓ Acked" : ev.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {isAcked ? (
                          <span className="text-[11px] text-emerald-600 font-bold">Recorded</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAck(ev.id)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer shadow-2xs"
                          >
                            {ev.actionText}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Queue Footer */}
          <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-100">
            <span>Cryptographic Digest: SHA256:7f83b1657ff1...a4e4</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex items-center gap-1 text-sky-600 hover:text-sky-700 font-sans font-semibold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Audit Trail (CSV)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const all: Record<string, boolean> = {};
                  queueEvents.forEach((e) => (all[e.id] = true));
                  setAckedItems(all);
                }}
                className="text-slate-600 hover:text-slate-900 font-sans font-semibold cursor-pointer"
              >
                Batch Mark Resolved
              </button>
            </div>
          </div>
        </div>

      </main>

      {/* Emergency Dispatch 5-Channel Execution Modal */}
      {isDispatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-red-600 font-bold text-sm uppercase tracking-wider">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span>Multi-Channel Emergency Protocol Dispatch</span>
              </div>
              <button
                type="button"
                onClick={() => setIsDispatchModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Broadcasting authorized disaster flash alert to <strong className="text-slate-900">{selectedVillageSector}</strong> across 5 carriers simultaneously.
            </p>

            {/* Stepper */}
            <div className="space-y-2.5 text-xs">
              <div className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${dispatchStep >= 1 ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                <CheckCircle2 className={`w-4 h-4 ${dispatchStep >= 1 ? "text-emerald-600" : "text-slate-300"}`} />
                <span>1. Natural Language Translation generated across 4 regional scripts</span>
              </div>
              <div className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${dispatchStep >= 2 ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                <CheckCircle2 className={`w-4 h-4 ${dispatchStep >= 2 ? "text-emerald-600" : "text-slate-300"}`} />
                <span>2. Transmitted 48 carrier SMS payloads via DLT telecom pipeline</span>
              </div>
              <div className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${dispatchStep >= 3 ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                <CheckCircle2 className={`w-4 h-4 ${dispatchStep >= 3 ? "text-emerald-600" : "text-slate-300"}`} />
                <span className="font-semibold">3. Solar Village Sirens triggered at 125 dB via RF 868MHz relay</span>
              </div>
              <div className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${dispatchStep >= 4 ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                <CheckCircle2 className={`w-4 h-4 ${dispatchStep >= 4 ? "text-emerald-600" : "text-slate-300"}`} />
                <span>4. 1,480 outbound voice calls queued on carrier IVR trunk</span>
              </div>
              <div className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${dispatchStep >= 5 ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                <CheckCircle2 className={`w-4 h-4 ${dispatchStep >= 5 ? "text-emerald-600" : "text-slate-300"}`} />
                <span className="font-bold">5. CAP-IN signed packet pushed to ASDMA State Headquarters</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[11px] font-mono text-emerald-700 font-semibold">
                {dispatchStep === 5 ? "✓ 5/5 Pipelines Dispatched" : "Transmitting payloads..."}
              </span>
              <button
                type="button"
                onClick={() => setIsDispatchModalOpen(false)}
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
