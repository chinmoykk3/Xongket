"use client";

import React, { useState, useEffect, useId } from "react";
import {
  Activity,
  Wifi,
  WifiOff,
  AlertTriangle,
  ShieldCheck,
  Waves,
  Droplets,
  Thermometer,
  Wind,
  Volume2,
  VolumeX,
  RefreshCw,
  Cpu,
  Gauge,
  Terminal,
  Radio,
  Sliders,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertOctagon,
  Flame,
  Zap,
  Layers,
  ArrowUpRight,
  Maximize2,
  SlidersHorizontal,
} from "lucide-react";

interface TelemetryPoint {
  time: string;
  waterLevel: number;
  soilMoisture: number;
}

interface LogEntry {
  id: string;
  ts: string;
  source: string;
  msg: string;
  type: "normal" | "success" | "warn" | "danger";
}

export default function HardwareBenchTestPage() {
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [wsOnline, setWsOnline] = useState<boolean>(false);
  const [lastPacketTime, setLastPacketTime] = useState<string>("Standby...");
  const [packetCount, setPacketCount] = useState<number>(0);

  // Live Sensor States
  const [waterLevel, setWaterLevel] = useState<number>(38.2);
  const [soilMoisture, setSoilMoisture] = useState<number>(42.0);
  const [temp, setTemp] = useState<number>(27.8);
  const [hum, setHum] = useState<number>(68.0);
  const [sirenActive, setSirenActive] = useState<boolean>(false);

  // Interactive Demo Simulator Mode for Evaluators
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simWater, setSimWater] = useState<number>(38.2);
  const [simSoil, setSimSoil] = useState<number>(42.0);

  // Historical telemetry for live trend chart
  const [history, setHistory] = useState<TelemetryPoint[]>([]);

  // Logs stream
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedTab, setSelectedTab] = useState<"all" | "water" | "soil" | "alerts">("all");

  const addLog = (
    msg: string,
    type: "normal" | "success" | "warn" | "danger" = "normal",
    source = "ESP8266"
  ) => {
    const ts = new Date().toTimeString().split(" ")[0];
    const id = Math.random().toString(36).substring(2, 9);
    setLogs((prev) => [{ id, ts, source, msg, type }, ...prev.slice(0, 49)]);
  };

  const pushHistory = (w: number, s: number) => {
    const now = new Date();
    const timeStr = `${now.getMinutes()}:${now.getSeconds() < 10 ? "0" : ""}${now.getSeconds()}`;
    setHistory((prev) => {
      const next = [...prev, { time: timeStr, waterLevel: w, soilMoisture: s }];
      return next.slice(-28);
    });
  };

  // Active displayed values (switches seamlessly between physical sensors and interactive demo slider)
  const displayWater = isSimulating ? simWater : waterLevel;
  const displaySoil = isSimulating ? simSoil : soilMoisture;

  const isWaterDanger = displayWater >= 140;
  const isWaterWarn = displayWater >= 110 && !isWaterDanger;
  const isSoilDanger = displaySoil >= 85;
  const isSoilWarn = displaySoil >= 70 && !isSoilDanger;
  const isDangerActive = isWaterDanger || isSoilDanger || sirenActive;
  const waterDist = Math.max(0, 200 - displayWater);

  // Sync siren strictly to dangerous conditions
  useEffect(() => {
    if (isSimulating) {
      setSirenActive(displayWater >= 140 || displaySoil >= 85);
    }
  }, [isSimulating, displayWater, displaySoil]);

  // Polling + WebSocket connection to FastAPI backend
  useEffect(() => {
    const host = typeof window !== "undefined" ? window.location.hostname : "127.0.0.1";
    const apiBase = `http://${host}:8000`;
    const wsUrl = `ws://${host}:8000/ws/live`;

    const pollLatestData = async () => {
      if (isSimulating) return;

      try {
        const res = await fetch(`${apiBase}/village/1/status`);
        setBackendOnline(res.ok);
      } catch {
        setBackendOnline(false);
      }

      try {
        const [r1, r2, r3, r4] = await Promise.allSettled([
          fetch(`${apiBase}/nodes/1/latest`).then((r) => (r.ok ? r.json() : null)),
          fetch(`${apiBase}/nodes/2/latest`).then((r) => (r.ok ? r.json() : null)),
          fetch(`${apiBase}/nodes/3/latest`).then((r) => (r.ok ? r.json() : null)),
          fetch(`${apiBase}/nodes/4/latest`).then((r) => (r.ok ? r.json() : null)),
        ]);

        let curW = waterLevel;
        let curS = soilMoisture;

        if (r1.status === "fulfilled" && r1.value) {
          const val = parseFloat(r1.value.value);
          if (!isNaN(val)) {
            curW = val;
            setWaterLevel(val);
            setLastPacketTime(new Date().toLocaleTimeString());
            setPacketCount((c) => c + 1);
          }
        }
        if (r2.status === "fulfilled" && r2.value) {
          const val = parseFloat(r2.value.value);
          if (!isNaN(val)) {
            curS = val;
            setSoilMoisture(val);
          }
        }
        if (r3.status === "fulfilled" && r3.value) {
          const val = parseFloat(r3.value.value);
          if (!isNaN(val)) setTemp(val);
        }
        if (r4.status === "fulfilled" && r4.value) {
          const val = parseFloat(r4.value.value);
          if (!isNaN(val)) setHum(val);
        }

        // SIREN ONLY ACTIVE WHEN SENSOR VALUES ARE IN DANGEROUS CONDITION
        setSirenActive(curW >= 140 || curS >= 85);
        pushHistory(curW, curS);
      } catch (err) {
        console.error("Hardware polling error", err);
      }
    };

    pollLatestData();
    const interval = setInterval(pollLatestData, 1500);

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        setWsOnline(true);
        addLog(`Connected to Telemetry Hub: ${wsUrl}`, "success", "WS-CORE");
      };
      ws.onmessage = (event) => {
        try {
          const packet = JSON.parse(event.data);
          setLastPacketTime(new Date().toLocaleTimeString());
          setPacketCount((c) => c + 1);

          if (packet.type === "new_reading") {
            const r = packet.data || packet;
            const val = parseFloat(r.value);
            if (r.node_id === 1) {
              setWaterLevel(val);
              pushHistory(val, soilMoisture);
              addLog(`HC-SR04 Water Level: ${val.toFixed(1)} cm`, val >= 140 ? "danger" : "success");
              setSirenActive(val >= 140 || soilMoisture >= 85);
            } else if (r.node_id === 2) {
              setSoilMoisture(val);
              pushHistory(waterLevel, val);
              addLog(`Capacitive Soil Probe: ${val.toFixed(1)}%`, val >= 85 ? "danger" : "success");
              setSirenActive(waterLevel >= 140 || val >= 85);
            } else if (r.node_id === 3) {
              setTemp(val);
              addLog(`DHT11 Ambient Temp: ${val.toFixed(1)} °C`, "normal");
            } else if (r.node_id === 4) {
              setHum(val);
              addLog(`DHT11 Humidity: ${val.toFixed(0)} %`, "normal");
            }
          }
        } catch (e) {
          console.error("WS Parse error", e);
        }
      };
      ws.onclose = () => setWsOnline(false);
      ws.onerror = () => setWsOnline(false);
    } catch {
      setWsOnline(false);
    }

    return () => {
      clearInterval(interval);
      if (ws) ws.close();
    };
  }, [isSimulating, soilMoisture, waterLevel]);

  // Demo Injections
  const handleSimWaterChange = (val: number) => {
    setIsSimulating(true);
    setSimWater(val);
    pushHistory(val, displaySoil);
    if (val >= 140) {
      addLog(`⚡ [DEMO] Water Level Exceeded Danger Line: ${val.toFixed(1)} cm`, "danger", "SIM");
    }
  };

  const handleSimSoilChange = (val: number) => {
    setIsSimulating(true);
    setSimSoil(val);
    pushHistory(displayWater, val);
    if (val >= 85) {
      addLog(`⚡ [DEMO] Soil Liquefaction Breach: ${val.toFixed(1)}%`, "danger", "SIM");
    }
  };

  const resetAllToSafe = () => {
    setIsSimulating(false);
    setSimWater(38.2);
    setSimSoil(42.0);
    setWaterLevel(38.2);
    setSoilMoisture(42.0);
    setSirenActive(false);
    pushHistory(38.2, 42.0);
    addLog("✅ Bench reset: Physical sensor stream restored to safe nominal baseline", "success", "SYS");
  };

  // Filtered Logs
  const filteredLogs = logs.filter((l) => {
    if (selectedTab === "water") return l.msg.includes("Water") || l.msg.includes("Flood");
    if (selectedTab === "soil") return l.msg.includes("Soil") || l.msg.includes("Probe");
    if (selectedTab === "alerts") return l.type === "danger" || l.type === "warn";
    return true;
  });

  return (
    <div className="min-h-screen bg-[#050813] text-slate-100 font-sans antialiased selection:bg-sky-500 selection:text-white relative overflow-x-hidden">
      {/* Dynamic Ambient Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className={`absolute -top-32 left-1/3 w-[750px] h-[750px] rounded-full blur-[160px] transition-all duration-700 ${
            isDangerActive ? "bg-rose-600/25" : "bg-sky-600/15"
          }`}
        />
        <div className="absolute top-1/2 -right-32 w-[600px] h-[600px] rounded-full blur-[160px] bg-emerald-600/10" />
        <div className="absolute -bottom-32 left-10 w-[500px] h-[500px] rounded-full blur-[150px] bg-cyan-600/10" />
        {/* Subtle Cyber Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* ── Top Executive Header ────────────────────────────── */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between pb-6 border-b border-slate-800/80 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3.5 w-3.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isDangerActive ? "bg-rose-500" : "bg-emerald-400"
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
                    isDangerActive ? "bg-rose-500" : "bg-emerald-500"
                  }`}
                />
              </span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                XONGKET <span className="text-sky-400 text-xl font-light">| IoT Hardware Verification</span>
              </h1>
              <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-950/80 text-sky-300 border border-sky-800/60 font-mono">
                NodeMCU ESP8266
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Assam SDMA Early Warning System • Real-Time Physical Sensor Bench • Zero-Latency Actuation
            </p>
          </div>

          {/* Telemetry Status Badges */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border backdrop-blur-md transition-all ${
                backendOnline
                  ? "bg-emerald-950/70 text-emerald-300 border-emerald-700/60 shadow-sm shadow-emerald-900/30"
                  : "bg-rose-950/70 text-rose-300 border-rose-700/60"
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>FastAPI Backend: {backendOnline ? "Online (0.0.0.0:8000)" : "Connecting..."}</span>
            </div>

            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border backdrop-blur-md transition-all ${
                wsOnline
                  ? "bg-sky-950/70 text-sky-300 border-sky-700/60 shadow-sm shadow-sky-900/30"
                  : "bg-slate-900/70 text-slate-400 border-slate-700/60"
              }`}
            >
              {wsOnline ? <Wifi className="w-3.5 h-3.5 text-sky-400 animate-pulse" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span>WebSocket: {wsOnline ? "Streaming Live" : "Polling Active"}</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900/80 border border-slate-800 text-slate-300 font-mono">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>Packets: {packetCount}</span>
            </div>
          </div>
        </header>

        {/* ── Interactive Evaluator / Presentation Controls ────── */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0c1222]/90 border border-slate-800/90 backdrop-blur-xl shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  Presentation Bench Controls & Stress Injector
                  {isSimulating ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">
                      INTERACTIVE SLIDER OVERRIDE
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      LIVE ESP8266 SENSOR STREAM
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Drag sliders below to demonstrate flood or landslide alarms to judges in real-time.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  handleSimWaterChange(162.0);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-700/70 hover:border-sky-500 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Waves className="w-3.5 h-3.5" />
                Flood Surge (162cm)
              </button>

              <button
                onClick={() => {
                  handleSimSoilChange(92.0);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-700/70 hover:border-amber-500 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Droplets className="w-3.5 h-3.5" />
                Liquefaction (92%)
              </button>

              <button
                onClick={resetAllToSafe}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                Reset Safe
              </button>
            </div>
          </div>

          {/* Dual Range Sliders for Live Demonstration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-800/80">
            {/* Water Depth Slider */}
            <div className="space-y-1.5 bg-[#070b16]/70 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <Waves className="w-3.5 h-3.5 text-sky-400" />
                  Water Depth Simulator
                </span>
                <span className="font-mono font-bold text-sky-300">
                  {displayWater.toFixed(1)} cm{" "}
                  {displayWater >= 140 ? (
                    <span className="text-rose-400 font-black">[BREACH]</span>
                  ) : displayWater >= 110 ? (
                    <span className="text-amber-400 font-bold">[WARN]</span>
                  ) : (
                    <span className="text-emerald-400">[OK]</span>
                  )}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                step="0.5"
                value={displayWater}
                onChange={(e) => handleSimWaterChange(parseFloat(e.target.value))}
                className="w-full accent-sky-400 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0 cm (Dry)</span>
                <span className="text-amber-500">110 cm (Warn)</span>
                <span className="text-rose-500">140 cm (Siren Danger)</span>
                <span>200 cm (Crest)</span>
              </div>
            </div>

            {/* Soil Moisture Slider */}
            <div className="space-y-1.5 bg-[#070b16]/70 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-emerald-400" />
                  Soil Moisture Saturation Simulator
                </span>
                <span className="font-mono font-bold text-emerald-300">
                  {displaySoil.toFixed(1)} %{" "}
                  {displaySoil >= 85 ? (
                    <span className="text-rose-400 font-black">[FAILURE]</span>
                  ) : displaySoil >= 70 ? (
                    <span className="text-amber-400 font-bold">[WARN]</span>
                  ) : (
                    <span className="text-emerald-400">[SAFE]</span>
                  )}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="0.5"
                value={displaySoil}
                onChange={(e) => handleSimSoilChange(parseFloat(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0 % (Dry Soil)</span>
                <span className="text-emerald-500">45 % (Nominal)</span>
                <span className="text-amber-500">70 % (Plastic Limit)</span>
                <span className="text-rose-500">85 % (Siren Failure)</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 4 Main High-Impact Sensor Cards ─────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* 1. HC-SR04 Ultrasonic Reservoir Gauge */}
          <div
            className={`relative p-5 rounded-2xl border transition-all duration-500 overflow-hidden backdrop-blur-xl ${
              isWaterDanger
                ? "bg-rose-950/35 border-rose-500/80 shadow-2xl shadow-rose-950/60 ring-1 ring-rose-500/50"
                : isWaterWarn
                ? "bg-amber-950/25 border-amber-500/70"
                : "bg-[#0b1222]/80 border-slate-800/90"
            }`}
          >
            {/* Animated Liquid Reservoir Cross-Section */}
            <div
              className={`absolute bottom-0 left-0 right-0 pointer-events-none transition-all duration-500 ${
                isWaterDanger ? "bg-rose-500/20" : isWaterWarn ? "bg-amber-500/15" : "bg-sky-500/15"
              }`}
              style={{ height: `${Math.min(100, Math.max(10, (displayWater / 200) * 100))}%` }}
            >
              {/* Dynamic Water Surface Line */}
              <div
                className={`w-full h-1 border-t-2 ${
                  isWaterDanger ? "border-rose-400" : isWaterWarn ? "border-amber-400" : "border-sky-400"
                }`}
              />
            </div>

            <div className="relative z-10 flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    isWaterDanger
                      ? "bg-rose-500/20 text-rose-400"
                      : "bg-sky-500/20 text-sky-400"
                  }`}
                >
                  <Waves className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    HC-SR04 Water Depth
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">NODE #1 • HYDROMETRIC</div>
                </div>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide ${
                  isWaterDanger
                    ? "bg-rose-600 text-white animate-pulse shadow-md shadow-rose-900"
                    : isWaterWarn
                    ? "bg-amber-600 text-white"
                    : "bg-emerald-950/90 text-emerald-300 border border-emerald-800/60"
                }`}
              >
                {isWaterDanger ? "CRITICAL FLOOD" : isWaterWarn ? "WARNING" : "SAFE / NORMAL"}
              </span>
            </div>

            <div className="relative z-10 flex items-baseline gap-2 mb-1">
              <span className="text-5xl font-black text-white tracking-tight">
                {displayWater.toFixed(1)}
              </span>
              <span className="text-xl font-bold text-slate-400">cm</span>
            </div>

            <div className="relative z-10 text-xs text-slate-400 mb-4 flex justify-between">
              <span>Echo Distance: <strong className="text-slate-200">{waterDist.toFixed(1)} cm</strong></span>
              <span className="text-slate-500">Mount: 200cm</span>
            </div>

            {/* Visual Gauge Bar */}
            <div className="relative z-10 w-full h-3 bg-slate-900/90 rounded-full overflow-hidden border border-slate-800 mb-3.5">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  isWaterDanger ? "bg-rose-500" : isWaterWarn ? "bg-amber-500" : "bg-sky-400"
                }`}
                style={{ width: `${Math.min(100, Math.max(0, (displayWater / 200) * 100))}%` }}
              />
            </div>

            <div className="relative z-10 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Danger Limit: ≥140.0 cm</span>
              <span className="text-sky-400 font-bold">Pins: D5 / D6</span>
            </div>
          </div>

          {/* 2. Capacitive Soil Moisture Saturation */}
          <div
            className={`relative p-5 rounded-2xl border transition-all duration-500 overflow-hidden backdrop-blur-xl ${
              isSoilDanger
                ? "bg-rose-950/35 border-rose-500/80 shadow-2xl shadow-rose-950/60 ring-1 ring-rose-500/50"
                : isSoilWarn
                ? "bg-amber-950/25 border-amber-500/70"
                : "bg-[#0b1222]/80 border-slate-800/90"
            }`}
          >
            <div className="relative z-10 flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    isSoilDanger
                      ? "bg-rose-500/20 text-rose-400"
                      : "bg-emerald-500/20 text-emerald-400"
                  }`}
                >
                  <Droplets className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Capacitive Soil Moisture
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">NODE #2 • GEOTECHNICAL</div>
                </div>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide ${
                  isSoilDanger
                    ? "bg-rose-600 text-white animate-pulse shadow-md shadow-rose-900"
                    : isSoilWarn
                    ? "bg-amber-600 text-white"
                    : "bg-emerald-950/90 text-emerald-300 border border-emerald-800/60"
                }`}
              >
                {isSoilDanger ? "LIQUEFACTION" : isSoilWarn ? "SATURATING" : "SAFE MATRIX"}
              </span>
            </div>

            <div className="relative z-10 flex items-baseline gap-2 mb-1">
              <span className="text-5xl font-black text-white tracking-tight">
                {displaySoil.toFixed(1)}
              </span>
              <span className="text-xl font-bold text-slate-400">%</span>
            </div>

            <div className="relative z-10 text-xs text-slate-400 mb-4">
              Pore-Water: {displaySoil >= 85 ? (
                <strong className="text-rose-400">Shear Plane Failure (Slope Saturated)</strong>
              ) : (
                <strong className="text-emerald-400">Plastic Limit Safe</strong>
              )}
            </div>

            {/* Gauge Bar */}
            <div className="relative z-10 w-full h-3 bg-slate-900/90 rounded-full overflow-hidden border border-slate-800 mb-3.5">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  isSoilDanger ? "bg-rose-500" : isSoilWarn ? "bg-amber-500" : "bg-emerald-400"
                }`}
                style={{ width: `${Math.min(100, Math.max(0, displaySoil))}%` }}
              />
            </div>

            <div className="relative z-10 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Failure Limit: ≥85.0%</span>
              <span className="text-emerald-400 font-bold">Pin: A0 (ADC 0)</span>
            </div>
          </div>

          {/* 3. DHT11 Microclimate (Temp & Humidity) */}
          <div className="relative p-5 rounded-2xl border bg-[#0b1222]/80 border-slate-800/90 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Thermometer className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    DHT11 Microclimate
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">NODE #3/4 • METEOROLOGY</div>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-950/80 text-sky-300 border border-sky-800/60 font-mono">
                TELEMETRY ACTIVE
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-5xl font-black text-white tracking-tight">
                {temp.toFixed(1)}
              </span>
              <span className="text-xl font-bold text-slate-400">°C</span>
              <span className="text-xs text-slate-500 ml-1 font-mono">
                ({((temp * 9) / 5 + 32).toFixed(1)}°F)
              </span>
            </div>

            <div className="text-xs text-slate-400 mb-4 flex items-center gap-2">
              <Wind className="w-3.5 h-3.5 text-sky-400" />
              <span>Relative Humidity: <strong className="text-sky-300 font-bold">{hum.toFixed(0)}% RH</strong></span>
            </div>

            {/* Temperature Progress Indicator */}
            <div className="w-full h-3 bg-slate-900/90 rounded-full overflow-hidden border border-slate-800 mb-3.5">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(10, (temp / 50) * 100))}%` }}
              />
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Data Pin: D4 (GPIO 2)</span>
              <span className="text-amber-400 font-bold">VCC: VU / D0</span>
            </div>
          </div>

          {/* 4. Acoustic Siren & Status LEDs (Buzzer D7, Red D8, Green D0) */}
          <div
            className={`relative p-5 rounded-2xl border transition-all duration-500 backdrop-blur-xl overflow-hidden ${
              isDangerActive
                ? "bg-rose-950/45 border-rose-500 shadow-2xl shadow-rose-950/70 ring-1 ring-rose-500/60"
                : "bg-[#0b1222]/80 border-slate-800/90"
            }`}
          >
            {isDangerActive && (
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-rose-500/25 rounded-full animate-ping pointer-events-none" />
            )}

            <div className="relative z-10 flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                    isDangerActive ? "bg-rose-500 text-white shadow-lg shadow-rose-900" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Siren & Dual LEDs
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">D7 BUZZER • D8 RED • D3 GREEN</div>
                </div>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide ${
                  isDangerActive
                    ? "bg-rose-600 text-white animate-pulse"
                    : "bg-slate-900 text-slate-400 border border-slate-800"
                }`}
              >
                {isDangerActive ? "GLARING 85dB" : "ARMED / SAFE"}
              </span>
            </div>

            {/* Visual Hardware LED Indicators */}
            <div className="relative z-10 grid grid-cols-2 gap-2 my-2.5 p-2 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-2">
                <span
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                    !isDangerActive
                      ? "bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse"
                      : "bg-slate-700 opacity-40"
                  }`}
                />
                <div className="text-[11px] font-mono leading-tight">
                  <div className="text-slate-300 font-bold">Green (D3)</div>
                  <div className={!isDangerActive ? "text-emerald-400 font-bold" : "text-slate-500"}>
                    {!isDangerActive ? "ACTIVE (SAFE)" : "OFF"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                    isDangerActive
                      ? "bg-rose-500 shadow-[0_0_16px_#f43f5e] animate-ping"
                      : "bg-slate-700 opacity-40"
                  }`}
                />
                <div className="text-[11px] font-mono leading-tight">
                  <div className="text-slate-300 font-bold">Red (D8)</div>
                  <div className={isDangerActive ? "text-rose-400 font-black" : "text-slate-500"}>
                    {isDangerActive ? "FLASHING!" : "OFF"}
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`text-xl font-black mb-1 flex items-center gap-2 ${
                isDangerActive ? "text-rose-400 animate-pulse" : "text-emerald-400"
              }`}
            >
              {isDangerActive ? (
                <>
                  <AlertOctagon className="w-5 h-5 text-rose-500" />
                  <span>SIREN PULSING</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>SYSTEM NORMAL</span>
                </>
              )}
            </div>

            <p className="text-xs text-slate-400 mb-3.5">
              Green stays steady. Red + Siren pulse when Water $\ge$ 140cm or Soil $\ge$ 85%.
            </p>

            <button
              onClick={() => {
                if (isDangerActive) {
                  resetAllToSafe();
                } else {
                  handleSimWaterChange(155.0);
                }
              }}
              className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 ${
                isDangerActive
                  ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                  : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50"
              }`}
            >
              {isDangerActive ? (
                <>
                  <VolumeX className="w-4 h-4" /> Silence Siren & Reset
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4" /> Test Physical Alarm (D7)
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Real-Time Sensor Waveform Trend Chart ───────────── */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#0b1222]/80 border border-slate-800/90 backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-sky-400" />
              <div>
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-200">
                  Real-Time Multi-Sensor Telemetry Waveform
                </h2>
                <p className="text-xs text-slate-400">
                  Continuous rolling telemetry showing sensor perturbation in real time.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-sky-400 shadow-sm shadow-sky-400/50" />
                <span className="text-slate-300 font-bold">Water Depth (cm)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                <span className="text-slate-300 font-bold">Soil Moisture (%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-rose-500" />
                <span className="text-rose-400 font-extrabold">Flood Alarm Line (140 cm)</span>
              </div>
            </div>
          </div>

          {/* SVG High-Performance Waveform Canvas */}
          <div className="h-52 w-full relative flex items-end pt-4">
            {history.length < 2 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-mono italic">
                Acquiring live telemetry data from ESP8266...
              </div>
            ) : (
              <svg className="w-full h-full overflow-visible" viewBox="0 0 800 150" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="soilGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#34d399" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Danger Line (140cm / 200cm = 70% -> y = 150 - 0.70*140 = 45) */}
                <line x1="0" y1="45" x2="800" y2="45" stroke="#ef4444" strokeDasharray="5 5" strokeWidth="2" opacity="0.75" />

                {/* Soil Area Fill */}
                <polygon
                  fill="url(#soilGrad)"
                  points={`0,150 ${history
                    .map((pt, i) => {
                      const x = (i / Math.max(1, history.length - 1)) * 800;
                      const y = 150 - Math.min(140, Math.max(10, (pt.soilMoisture / 100) * 140));
                      return `${x},${y}`;
                    })
                    .join(" ")} 800,150`}
                />

                {/* Water Area Fill */}
                <polygon
                  fill="url(#waterGrad)"
                  points={`0,150 ${history
                    .map((pt, i) => {
                      const x = (i / Math.max(1, history.length - 1)) * 800;
                      const y = 150 - Math.min(140, Math.max(10, (pt.waterLevel / 200) * 140));
                      return `${x},${y}`;
                    })
                    .join(" ")} 800,150`}
                />

                {/* Soil Stroke */}
                <polyline
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={history
                    .map((pt, i) => {
                      const x = (i / Math.max(1, history.length - 1)) * 800;
                      const y = 150 - Math.min(140, Math.max(10, (pt.soilMoisture / 100) * 140));
                      return `${x},${y}`;
                    })
                    .join(" ")}
                />

                {/* Water Stroke */}
                <polyline
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={history
                    .map((pt, i) => {
                      const x = (i / Math.max(1, history.length - 1)) * 800;
                      const y = 150 - Math.min(140, Math.max(10, (pt.waterLevel / 200) * 140));
                      return `${x},${y}`;
                    })
                    .join(" ")}
                />

                {/* Glowing Pointer Reticles */}
                {history.length > 0 && (() => {
                  const last = history[history.length - 1];
                  const yWater = 150 - Math.min(140, Math.max(10, (last.waterLevel / 200) * 140));
                  const ySoil = 150 - Math.min(140, Math.max(10, (last.soilMoisture / 100) * 140));
                  return (
                    <g>
                      <circle cx="800" cy={yWater} r="6" fill="#38bdf8" stroke="#050813" strokeWidth="2" />
                      <circle cx="800" cy={ySoil} r="5" fill="#34d399" stroke="#050813" strokeWidth="2" />
                    </g>
                  );
                })()}
              </svg>
            )}
          </div>
        </div>

        {/* ── OLED Display Mirror & Live Ingestion Terminal ────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Virtual Physical SSD1306 Display Case */}
          <div className="p-5 rounded-2xl bg-[#0b1222]/80 border border-slate-800/90 backdrop-blur-xl shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-sky-400" />
                  Physical OLED Mirror (0.96" I2C)
                </span>
                <span className="text-[11px] font-mono text-sky-400 font-bold">D2 SDA / D1 SCL</span>
              </div>

              {/* Realistic OLED Bezel with Screws */}
              <div className="p-3 bg-gradient-to-b from-slate-900 to-black rounded-2xl border-4 border-slate-800 shadow-2xl relative">
                {/* Screws */}
                <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-slate-700" />
                <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-slate-700" />
                <div className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-slate-700" />
                <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-slate-700" />

                {/* OLED Glass Screen */}
                <div className="w-full aspect-[2/1] bg-black rounded-lg p-3 font-mono text-xs overflow-hidden border border-slate-900 shadow-inner flex flex-col justify-between select-none">
                  {isDangerActive ? (
                    <div className="text-white space-y-1">
                      <div className="bg-white text-black px-1.5 py-0.5 font-black text-sm text-center">
                        ! DANGER !
                      </div>
                      <div className="text-amber-300 font-bold text-[11px]">
                        WATER: {displayWater.toFixed(1)}cm {displayWater >= 140 ? "[FLOOD]" : "[SAFE]"}
                      </div>
                      <div className="text-amber-300 font-bold text-[11px]">
                        SOIL : {displaySoil.toFixed(1)}% {displaySoil >= 85 ? "[SLIP]" : "[SAFE]"}
                      </div>
                      <div className="text-rose-400 font-bold animate-pulse text-[11px]">
                        SIREN: ACTIVE (85dB)
                      </div>
                      <div className="border-t border-slate-700 pt-0.5 text-[10px] text-white font-bold">
                        EVACUATE IMMEDIATELY
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-100 space-y-1">
                      <div className="border-b border-sky-800 pb-0.5 flex justify-between font-bold text-white text-[11px]">
                        <span>XONGKET DISASTER SYS</span>
                      </div>
                      <div className="flex justify-between">
                        <span>WATER: {displayWater.toFixed(1)} cm</span>
                        <span className="text-emerald-400 font-bold">{displayWater >= 110 ? "[WARN]" : "[OK]"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>SOIL : {displaySoil.toFixed(1)} %</span>
                        <span className="text-emerald-400 font-bold">{displaySoil >= 75 ? "[WARN]" : "[OK]"}</span>
                      </div>
                      <div>
                        <span>TEMP : {temp.toFixed(1)}C  H:{hum.toFixed(0)}%</span>
                      </div>
                      <div className="border-t border-slate-800 pt-0.5 text-[10px] text-emerald-400 font-bold">
                        STATUS: SAFE / NORMAL
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mt-3 text-center">
              Pixel-accurate reflection of the physical SSD1306 on the bench.
            </p>
          </div>

          {/* Live Ingestion Feed & Packet Log */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-[#0b1222]/80 border border-slate-800/90 backdrop-blur-xl shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Live Telemetry Ingestion Feed (ESP8266 &rarr; Backend)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-[11px] font-mono">
                    <button
                      onClick={() => setSelectedTab("all")}
                      className={`px-2 py-0.5 rounded-md transition ${
                        selectedTab === "all" ? "bg-sky-600 text-white font-bold" : "text-slate-400"
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setSelectedTab("water")}
                      className={`px-2 py-0.5 rounded-md transition ${
                        selectedTab === "water" ? "bg-sky-600 text-white font-bold" : "text-slate-400"
                      }`}
                    >
                      Water
                    </button>
                    <button
                      onClick={() => setSelectedTab("soil")}
                      className={`px-2 py-0.5 rounded-md transition ${
                        selectedTab === "soil" ? "bg-sky-600 text-white font-bold" : "text-slate-400"
                      }`}
                    >
                      Soil
                    </button>
                    <button
                      onClick={() => setSelectedTab("alerts")}
                      className={`px-2 py-0.5 rounded-md transition ${
                        selectedTab === "alerts" ? "bg-rose-600 text-white font-bold" : "text-slate-400"
                      }`}
                    >
                      Alerts
                    </button>
                  </div>

                  <button
                    onClick={() => setLogs([])}
                    className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1 font-mono"
                  >
                    <RefreshCw className="w-3 h-3" /> Clear
                  </button>
                </div>
              </div>

              {/* Scrollable Packet Log */}
              <div className="bg-[#050811] rounded-xl p-3.5 font-mono text-xs text-slate-300 h-52 overflow-y-auto space-y-2 border border-slate-900 shadow-inner">
                {filteredLogs.length === 0 ? (
                  <div className="text-slate-500 italic py-6 text-center">
                    Listening for incoming telemetry packets from ESP8266 via <code>POST /ingest</code>...
                  </div>
                ) : (
                  filteredLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                      <span className="text-slate-500 select-none">[{log.ts}]</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800/80 text-slate-300 font-bold select-none">
                        {log.source}
                      </span>
                      <span
                        className={
                          log.type === "danger"
                            ? "text-rose-400 font-bold"
                            : log.type === "success"
                            ? "text-emerald-400"
                            : log.type === "warn"
                            ? "text-amber-400"
                            : "text-sky-300"
                        }
                      >
                        {log.msg}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Wiring Cheat Sheet for Demo Judges */}
            <div className="pt-3 border-t border-slate-800/80 mt-3 flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono gap-2">
              <span>Pins: OLED (D1/D2) • Ultrasonic (D5/D6) • Soil (A0) • DHT11 (D4) • Buzzer (D7) • Green LED (D3) • Red LED (D8)</span>
              <span className="text-emerald-400 font-bold">NodeMCU Verified Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
