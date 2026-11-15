"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Volume2,
  VolumeX,
  PhoneCall,
  Home,
  ArrowLeft,
  RefreshCw,
  Droplets,
  CloudRain,
  MapPin,
  Radio,
} from "lucide-react";
import { api } from "@/lib/api";
import { Alert, Contact, Node, Reading, Shelter, Village } from "@/lib/types";

// Localized UI strings for low-literacy rural villagers
const STRINGS: Record<string, Record<string, string>> = {
  assamese: {
    safe_title: "গাঁৱৰ অৱস্থা শান্ত",
    safe_sub: "কোনো বিপদ নাই। সকলো স্বাভাৱিক।",
    warning_title: "সতৰ্ক থাকক!",
    warning_sub: "পানী বৃদ্ধি পাইছে। ওখ ঠাইলৈ যাবলৈ সাজু হওক।",
    danger_title: "জৰুৰী বিপদ সংকেত!",
    danger_sub: "অবিলম্বে ওখ স্থান বা আশ্ৰয় শিবিৰলৈ যাওক!",
    listen_btn: "বাৰ্তা শুনক (Audio)",
    speaking: "কথা শুনি আছোঁ...",
    stop_audio: "বন্ধ কৰক",
    shelter_heading: "নিকটৱৰ্তী আশ্ৰয় শিবিৰ",
    shelter_capacity: "ক্ষমতা",
    people: "জন",
    volunteer_call: "গাঁও প্ৰতিনিধিক কল কৰক",
    emergency_call: "ASDMA জৰুৰী হেল্পলাইন (1079)",
    latest_update: "শেষ তথ্য",
    water_level: "পানীৰ স্তৰ",
    rainfall: "বৰষুণ",
    safe_status: "সুৰক্ষিত",
    warning_status: "সতৰ্কতা",
    danger_status: "বিপদ",
    village_mode: "গাঁও মোড (সহজ দৰ্শন)",
  },
  bengali: {
    safe_title: "গ্রামের অবস্থা শান্ত",
    safe_sub: "কোনো বিপদ নেই। পরিস্থিতি স্বাভাবিক।",
    warning_title: "সতর্ক থাকুন!",
    warning_sub: "জলস্তর বৃদ্ধি পাচ্ছে। নিরাপদ আশ্রয়ে যাওয়ার প্রস্তুতি নিন।",
    danger_title: "জরুরি বিপদ সংকেত!",
    danger_sub: "অবিলম্বে নিরাপদ আশ্রয়ে বা উঁচু স্থানে যান!",
    listen_btn: "বার্তা শুনুন (Audio)",
    speaking: "বার্তা বলা হচ্ছে...",
    stop_audio: "বন্ধ করুন",
    shelter_heading: "নিকটস্থ আশ্রয় শিবির",
    shelter_capacity: "ধারণক্ষমতা",
    people: "জন",
    volunteer_call: "গ্রাম স্বেচ্ছাসেবককে কল করুন",
    emergency_call: "জরুরি হেল্পলাইন (1079)",
    latest_update: "সর্বশেষ তথ্য",
    water_level: "জলস্তর",
    rainfall: "বৃষ্টিপাত",
    safe_status: "নিরাপদ",
    warning_status: "সতর্কতা",
    danger_status: "বিপদ",
    village_mode: "গ্রাম মোড (সহজ দর্শন)",
  },
  bodo: {
    safe_title: "गामिखौ गोसो रैखाथि",
    safe_sub: "जेबो गिख्रोंथाव गैया। गासैबो मोजां।",
    warning_title: "सांग्रां जा!",
    warning_sub: "दै बांबाय। गोजौ जायगायाव थांनो थियारि जा।",
    danger_title: "गिख्रोंथाव खौरां!",
    danger_sub: "थाबैनो आश्रय जायगा एबा गोजौ जायगायाव थां!",
    listen_btn: "खौरां खोनासङ (Audio)",
    speaking: "बुंसायगासिनो...",
    stop_audio: "थादों हो",
    shelter_heading: "खाथिनि आश्रय जायगा",
    shelter_capacity: "मानसिनि बिबां",
    people: "सुबुं",
    volunteer_call: "गामिनि मदतमोनग्राखौ फोन खालाम",
    emergency_call: "ASDMA हेल्पलाइन (1079)",
    latest_update: "दासान्दि खौरां",
    water_level: "दैनि बिबां",
    rainfall: "अखा",
    safe_status: "रैखाथि",
    warning_status: "सांग्रांथि",
    danger_status: "गिख्रोंथाव",
    village_mode: "गामि म'ड",
  },
  hindi: {
    safe_title: "गाँव सुरक्षित है",
    safe_sub: "कोई खतरा नहीं है। स्थिति सामान्य है।",
    warning_title: "सतर्क रहें!",
    warning_sub: "जल स्तर बढ़ रहा है। सुरक्षित स्थान पर जाने की तैयारी रखें।",
    danger_title: "खतरे की चेतावनी!",
    danger_sub: "तुरंत सुरक्षित स्थान या नजदीकी राहत शिविर जाएं!",
    listen_btn: "संदेश सुनें (Audio)",
    speaking: "संदेश बज रहा है...",
    stop_audio: "बंद करें",
    shelter_heading: "निकटतम राहत शिविर",
    shelter_capacity: "क्षमता",
    people: "लोग",
    volunteer_call: "ग्राम प्रतिनिधि को कॉल करें",
    emergency_call: "आपदा हेल्पलाइन (1079)",
    latest_update: "ताज़ा जानकारी",
    water_level: "जल स्तर",
    rainfall: "बारिश",
    safe_status: "सुरक्षित",
    warning_status: "चेतावनी",
    danger_status: "खतरा",
    village_mode: "ग्राम मोड (सरल दृश्य)",
  },
  english: {
    safe_title: "VILLAGE IS SAFE",
    safe_sub: "No immediate disaster threat. Normal conditions.",
    warning_title: "WARNING: BE ALERT!",
    warning_sub: "Water levels rising. Prepare for relocation to higher ground.",
    danger_title: "CRITICAL DANGER!",
    danger_sub: "Evacuate immediately to higher ground or nearest shelter!",
    listen_btn: "Listen to Alert (Audio)",
    speaking: "Speaking alert...",
    stop_audio: "Stop Audio",
    shelter_heading: "Nearest Relief Shelter",
    shelter_capacity: "Capacity",
    people: "people",
    volunteer_call: "Call Village Volunteer",
    emergency_call: "ASDMA Disaster Helpline (1079)",
    latest_update: "Latest Update",
    water_level: "Water Level",
    rainfall: "Rainfall",
    safe_status: "SAFE",
    warning_status: "WARNING",
    danger_status: "DANGER",
    village_mode: "Village Mode (Simplified)",
  },
};

export default function VillageModePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const villageId = Number(id);

  const [village, setVillage] = useState<Village | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [shelter, setShelter] = useState<Shelter | null>(null);
  const [activeAlert, setActiveAlert] = useState<Alert | null>(null);
  const [waterLevel, setWaterLevel] = useState<number | null>(null);
  const [rainfall, setRainfall] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lang, setLang] = useState<string>("assamese");

  // Load essential village data with resilient fallbacks
  const loadData = async () => {
    try {
      const [v, cList, alerts, allShelters] = await Promise.all([
        api.getVillage(villageId).catch(() => null),
        api.getVillageContacts(villageId).catch(() => []),
        api.getAlerts({ village_id: villageId, status: "active", limit: 5 }).catch(() => []),
        api.getShelters().catch(() => []),
      ]);

      if (v) {
        setVillage(v);
        if (v.language && STRINGS[v.language.toLowerCase()]) {
          setLang(v.language.toLowerCase());
        }
        if (v.nearest_shelter_id) {
          const match = allShelters.find((s) => s.id === v.nearest_shelter_id);
          if (match) setShelter(match);
        } else if (allShelters.length > 0) {
          setShelter(allShelters[0]);
        }
      }

      setContacts(cList);

      if (alerts && alerts.length > 0) {
        // Pick highest severity alert: danger > warning > advisory
        const sevOrder: Record<string, number> = { danger: 3, warning: 2, advisory: 1 };
        const sorted = [...alerts].sort(
          (a, b) => (sevOrder[b.severity.toLowerCase()] || 0) - (sevOrder[a.severity.toLowerCase()] || 0)
        );
        setActiveAlert(sorted[0]);
      } else {
        setActiveAlert(null);
      }

      // Fetch latest water level and rainfall readings
      const nodes = await api.getNodes({ village_id: villageId }).catch(() => []);
      for (const n of nodes) {
        if (n.type === "water_level" && waterLevel === null) {
          const r = await api.getNodeReadings(n.id, { limit: 1 }).catch(() => []);
          if (r.length > 0) setWaterLevel(r[0].value);
        }
        if (n.type === "rain_gauge" && rainfall === null) {
          const r = await api.getNodeReadings(n.id, { limit: 1 }).catch(() => []);
          if (r.length > 0) setRainfall(r[0].value);
        }
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to load village mode data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh every 20 seconds on live connections
    const interval = setInterval(loadData, 20000);
    return () => clearInterval(interval);
  }, [villageId]);

  // Determine severity tier: "safe", "warning", "danger"
  const severity = activeAlert
    ? activeAlert.severity.toLowerCase() === "danger"
      ? "danger"
      : "warning"
    : "safe";

  const t = STRINGS[lang] || STRINGS.assamese;

  // Primary local volunteer contact
  const volunteer =
    contacts.find((c) => c.role.toLowerCase() === "volunteer") ||
    contacts.find((c) => c.role.toLowerCase() === "gram_panchayat") ||
    contacts[0];

  // Speech synthesis voice playback
  const playVoiceAlert = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Voice speech is not supported on this browser.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();

    // Compose high-clarity speech text
    let speechText = "";
    if (severity === "danger") {
      speechText = `${t.danger_title}! ${activeAlert?.message || t.danger_sub} ${
        shelter ? `${t.shelter_heading}: ${shelter.name}` : ""
      }`;
    } else if (severity === "warning") {
      speechText = `${t.warning_title}! ${activeAlert?.message || t.warning_sub}`;
    } else {
      speechText = `${village?.name || "আপোনাৰ গাঁও"}। ${t.safe_title}। ${t.safe_sub}`;
    }

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.rate = 0.9; // slightly slower for maximum rural comprehension

    // Pick best available voice matching locale
    const voices = window.speechSynthesis.getVoices();
    const langCode =
      lang === "hindi"
        ? "hi-IN"
        : lang === "bengali"
        ? "bn-IN"
        : lang === "assamese"
        ? "as-IN"
        : "en-IN";

    const matchedVoice =
      voices.find((v) => v.lang === langCode) ||
      voices.find((v) => v.lang.startsWith(langCode.slice(0, 2))) ||
      voices.find((v) => v.lang.includes("IN")) ||
      voices[0];

    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    // Audible tone chime before speech for guaranteed feedback
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(severity === "danger" ? 880 : 587, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch {
      // AudioContext optional fallback
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Color theming based on status
  const theme = {
    safe: {
      bg: "bg-emerald-950",
      cardBg: "bg-emerald-900/40 border-emerald-500",
      pill: "bg-emerald-600 text-white",
      border: "border-emerald-600",
      text: "text-emerald-400",
      btn: "bg-emerald-600 hover:bg-emerald-500 text-white",
      icon: <ShieldCheck className="w-20 h-20 text-emerald-400 animate-pulse" />,
      symbol: "✓",
    },
    warning: {
      bg: "bg-amber-950",
      cardBg: "bg-amber-900/40 border-amber-500",
      pill: "bg-amber-600 text-white",
      border: "border-amber-500",
      text: "text-amber-400",
      btn: "bg-amber-600 hover:bg-amber-500 text-white",
      icon: <AlertTriangle className="w-20 h-20 text-amber-400 animate-bounce" />,
      symbol: "▲",
    },
    danger: {
      bg: "bg-red-950",
      cardBg: "bg-red-900/60 border-red-500",
      pill: "bg-red-600 text-white animate-pulse",
      border: "border-red-500 ring-4 ring-red-600/50",
      text: "text-red-400",
      btn: "bg-red-600 hover:bg-red-500 text-white animate-pulse",
      icon: <AlertOctagon className="w-24 h-24 text-red-500 animate-pulse" />,
      symbol: "⚠",
    },
  }[severity];

  return (
    <div className={`min-h-screen ${theme.bg} text-slate-100 flex flex-col font-sans selection:bg-slate-700`}>
      {/* Top Bar for Cheap Mobile Browsers */}
      <header className="bg-black/60 border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-30 backdrop-blur-sm">
        <Link
          href={`/villages/${villageId}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>

        {/* Village Name & Language Quick Selector */}
        <div className="flex items-center gap-1.5">
          {["assamese", "bengali", "bodo", "hindi", "english"].map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`text-[11px] font-black uppercase px-2 py-1 rounded transition-colors ${
                lang === l
                  ? "bg-white text-black font-extrabold shadow"
                  : "bg-slate-900/80 text-slate-400 hover:text-white"
              }`}
            >
              {l === "assamese" ? "অসমীয়া" : l === "bengali" ? "বাংলা" : l === "bodo" ? "बर'" : l === "hindi" ? "हिन्दी" : "EN"}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content Area: Ultra-Clean, High Contrast */}
      <main className="flex-1 max-w-md mx-auto w-full p-4 flex flex-col gap-4">
        {/* Village Header Banner */}
        <div className="text-center pt-2">
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 uppercase tracking-widest font-black">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>{t.village_mode}</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-0.5 tracking-tight">
            {village?.name || `Village #${villageId}`}
          </h1>
          {village?.is_char_area && (
            <span className="inline-block mt-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-950/90 text-amber-300 border border-amber-700">
              নদীদ্বীপ চৰ অঞ্চল (Riverine Char Area)
            </span>
          )}
        </div>

        {/* Central Giant Status Card (Low-Literacy Visual Pillar) */}
        <div
          className={`rounded-3xl p-6 border-4 ${theme.cardBg} ${theme.border} text-center flex flex-col items-center justify-center shadow-2xl transition-all duration-300`}
        >
          {/* Giant Symbol & Icon */}
          <div className="mb-3 relative">
            {theme.icon}
            <span className="absolute -bottom-2 -right-2 text-2xl font-black px-2 py-0.5 rounded-full bg-black/80 border border-slate-700 text-white shadow">
              {theme.symbol}
            </span>
          </div>

          {/* Status Label */}
          <span className={`text-xs font-black uppercase px-4 py-1 rounded-full ${theme.pill} tracking-wider mb-2`}>
            {severity === "danger"
              ? t.danger_status
              : severity === "warning"
              ? t.warning_status
              : t.safe_status}
          </span>

          {/* Big Bold Headline */}
          <h2 className="text-2xl sm:text-3xl font-black text-white mt-1 leading-tight">
            {severity === "danger"
              ? t.danger_title
              : severity === "warning"
              ? t.warning_title
              : t.safe_title}
          </h2>

          {/* Simple Guidance Subtext */}
          <p className="text-base sm:text-lg font-bold text-slate-200 mt-2 leading-snug">
            {activeAlert ? activeAlert.message : severity === "safe" ? t.safe_sub : t.warning_sub}
          </p>
        </div>

        {/* Giant Voice-Readout Audio Button (Web Speech API) */}
        <button
          onClick={playVoiceAlert}
          className={`w-full py-4 px-6 rounded-2xl flex items-center justify-center gap-3 font-black text-lg sm:text-xl shadow-xl active:scale-[0.98] transition-all ${
            isSpeaking
              ? "bg-purple-600 text-white ring-4 ring-purple-400/50 animate-pulse"
              : `${theme.btn} ring-2 ring-white/20`
          }`}
          aria-label="Listen to voice readout of current alert"
        >
          {isSpeaking ? (
            <>
              <VolumeX className="w-7 h-7 animate-bounce" />
              <span>{t.stop_audio}</span>
            </>
          ) : (
            <>
              <Volume2 className="w-7 h-7" />
              <span>{t.listen_btn}</span>
            </>
          )}
        </button>

        {/* Real-time Sensor Metrics (Simplified Gauges) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-950/80 border border-blue-800/80 flex items-center justify-center text-blue-400">
              <Droplets className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase">{t.water_level}</div>
              <div className="text-xl font-black text-white">
                {waterLevel !== null ? `${waterLevel.toFixed(1)} cm` : "স্বাভাৱিক"}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-sky-950/80 border border-sky-800/80 flex items-center justify-center text-sky-400">
              <CloudRain className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase">{t.rainfall}</div>
              <div className="text-xl font-black text-white">
                {rainfall !== null ? `${rainfall.toFixed(1)} mm` : "0.0 mm"}
              </div>
            </div>
          </div>
        </div>

        {/* Shelter Guidance Card */}
        {shelter && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-950/80 border border-amber-700/80 flex items-center justify-center text-amber-400">
                <Home className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase">
                  {t.shelter_heading}
                </div>
                <div className="text-base font-extrabold text-white">{shelter.name}</div>
                <div className="text-xs text-slate-400">
                  {t.shelter_capacity}: {shelter.capacity} {t.people}
                </div>
              </div>
            </div>

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${shelter.lat},${shelter.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200"
              title="Open shelter location in maps"
            >
              <MapPin className="w-5 h-5 text-amber-400" />
            </a>
          </div>
        )}

        {/* Direct One-Touch Phone Call Buttons */}
        <div className="flex flex-col gap-2.5 mt-1">
          {volunteer && (
            <a
              href={`tel:${volunteer.phone}`}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold text-base flex items-center justify-center gap-2.5 shadow-lg active:scale-95 transition-transform"
            >
              <PhoneCall className="w-5 h-5" />
              <span>{volunteer.name} ({t.volunteer_call})</span>
            </a>
          )}

          <a
            href="tel:1079"
            className="w-full py-3.5 px-4 rounded-xl bg-red-700 hover:bg-red-600 text-white font-extrabold text-base flex items-center justify-center gap-2.5 shadow-lg active:scale-95 transition-transform"
          >
            <PhoneCall className="w-5 h-5 animate-pulse" />
            <span>{t.emergency_call}</span>
          </a>
        </div>

        {/* Footer: Live Sync & Refresh */}
        <div className="mt-2 text-center text-slate-500 text-[11px] flex items-center justify-center gap-2">
          <span>{t.latest_update}: {lastUpdated.toLocaleTimeString()}</span>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-1 rounded text-slate-400 hover:text-white"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </main>
    </div>
  );
}
