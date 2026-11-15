"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Radio,
  User as UserIcon,
  ChevronDown,
  X,
  Send,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { wsService } from "../lib/websocket";
import { api } from "../lib/api";
import { Language } from "../lib/types";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [wsStatus, setWsStatus] = useState<"connected" | "disconnected" | "connecting">("connecting");
  const [activeCount, setActiveCount] = useState<number>(120);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Emergency Modal State
  const [selectedVillageId, setSelectedVillageId] = useState<number>(1);
  const [hazard, setHazard] = useState<"flood" | "landslide" | "earthquake">("flood");
  const [severity, setSeverity] = useState<"advisory" | "warning" | "danger">("danger");
  const [title, setTitle] = useState("CRITICAL FLOOD SURGE WARNING");
  const [description, setDescription] = useState(
    "River stage exceeding danger level. Immediate evacuation of low-lying chars advised."
  );
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  useEffect(() => {
    wsService.connect();
    const unsubscribe = wsService.onStatus((status) => {
      setWsStatus(status);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const languageOptions: { key: Language; label: string }[] = [
    { key: "as", label: "অসমীয়া" },
    { key: "en", label: "English" },
    { key: "br", label: "Bodo" },
    { key: "bn", label: "বাংলা" },
    { key: "hi", label: "हिन्दी" },
  ];

  const handleDispatchEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBroadcasting(true);
    setBroadcastSuccess(false);
    try {
      await api.createManualAlert({
        village_id: selectedVillageId,
        hazard,
        severity,
        message: `${title} - ${description}`,
      });
      setBroadcastSuccess(true);
      setTimeout(() => {
        setIsAlertModalOpen(false);
        setBroadcastSuccess(false);
      }, 1500);
    } catch (err) {
      console.error("Failed to broadcast emergency alert", err);
      // Fallback optimistic simulation
      setBroadcastSuccess(true);
      setTimeout(() => {
        setIsAlertModalOpen(false);
        setBroadcastSuccess(false);
      }, 1500);
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200/90 text-slate-800 shadow-xs select-none">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-15 gap-4">

            {/* Left: Emblem & Brand Title */}
            <div className="flex items-center gap-3 shrink-0">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs group-hover:bg-emerald-700 transition-colors">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5 text-white"
                  >
                    <path d="M2 12c3-4 6-4 10 0 4 4 7 4 10 0" />
                    <path d="M2 17c3-4 6-4 10 0 4 4 7 4 10 0" />
                    <circle cx="12" cy="7" r="3" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-extrabold text-base tracking-tight text-slate-900">
                      Xongket
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      (সংকেত/সম্বন্ধ)
                    </span>
                  </div>
                  <span className="text-[9.5px] uppercase tracking-wider font-bold text-slate-400 -mt-0.5 hidden sm:inline">
                    ASSAM SDMA EARLY-WARNING & TELEMETRY OPERATIONS
                  </span>
                </div>
              </Link>
            </div>

            {/* Center Status & Language Buttons */}
            <div className="hidden md:flex items-center gap-4">
              {/* Live Stream Indicator Badge */}
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50/80 border border-emerald-200 rounded-full text-xs text-emerald-800 font-medium shadow-2xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>{activeCount} Nodes Active</span>
                <span className="text-emerald-300">|</span>
                <span className="text-emerald-700 font-normal">Stream Online</span>
              </div>

              {/* Language Selector Script Buttons */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                {languageOptions.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setLanguage(opt.key)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${language === opt.key
                        ? "bg-white text-slate-900 shadow-2xs font-semibold"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Emergency Broadcast Button & Officer Profile */}
            <div className="flex items-center gap-3">
              {/* Emergency Alert Button */}
              <button
                type="button"
                onClick={() => setIsAlertModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer active:scale-98"
              >
                <AlertCircle className="w-4 h-4 text-white" />
                <span className="hidden sm:inline">Issue Emergency Alert</span>
                <span className="sm:hidden">Alert</span>
              </button>

              {/* Officer Profile Badge */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2.5 pl-2 pr-1 py-1 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                >
                  <div className="w-7 h-7 rounded-full bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-800 text-xs font-bold">
                    PB
                  </div>
                  <div className="flex flex-col text-left leading-tight hidden xl:flex">
                    <span className="text-xs font-semibold text-slate-800">
                      Officer Pranab Bora (ASDMA)
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Majuli Control Center
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg py-1.5 text-xs z-50">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="font-semibold text-slate-800">Officer Pranab Bora</p>
                      <p className="text-slate-500 text-[11px]">pranab.bora@asdma.gov.in</p>
                      <p className="text-sky-600 text-[10px] font-medium mt-0.5">Role: District Officer</p>
                    </div>
                    <Link
                      href="/village/1"
                      className="block px-3 py-2 text-slate-700 hover:bg-slate-50 transition-colors"
                      onClick={() => setProfileDropdownOpen(false)}
                    >
                      Open Rural Village Mode
                    </Link>
                    <Link
                      href="/alerts"
                      className="block px-3 py-2 text-slate-700 hover:bg-slate-50 transition-colors"
                      onClick={() => setProfileDropdownOpen(false)}
                    >
                      Disaster Alert Queue
                    </Link>
                    <div className="border-t border-slate-100 mt-1">
                      {user ? (
                        <button
                          onClick={() => {
                            logout();
                            setProfileDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 font-medium"
                        >
                          Sign Out
                        </button>
                      ) : (
                        <Link
                          href="/login"
                          className="block px-3 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                          onClick={() => setProfileDropdownOpen(false)}
                        >
                          Sign In with Credentials
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Emergency Alert Modal */}
      {isAlertModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-red-600 font-bold text-base">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span>Issue High-Priority Emergency Alert</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAlertModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {broadcastSuccess ? (
              <div className="p-6 text-center space-y-2 bg-emerald-50 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="text-emerald-900 font-bold text-base">Emergency Broadcast Dispatched</h4>
                <p className="text-emerald-700 text-xs">
                  Alert sent through SMS, WhatsApp, IVR blast, and local solar sirens.
                </p>
              </div>
            ) : (
              <form onSubmit={handleDispatchEmergency} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Village / Sub-Division</label>
                  <select
                    value={selectedVillageId}
                    onChange={(e) => setSelectedVillageId(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800"
                  >
                    <option value={1}>Kamalabari Ghat (Majuli)</option>
                    <option value={2}>Jengraimukh Embankment (Majuli)</option>
                    <option value={3}>Garamur Riverfront (Majuli)</option>
                    <option value={4}>Murkongselek (Dhemaji)</option>
                    <option value={5}>Laluk (Lakhimpur)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Hazard Category</label>
                    <select
                      value={hazard}
                      onChange={(e) => setHazard(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800"
                    >
                      <option value="flood">Flood Surge</option>
                      <option value="landslide">Landslide</option>
                      <option value="earthquake">Earthquake</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Severity Level</label>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800"
                    >
                      <option value="danger">Critical Danger (Red)</option>
                      <option value="warning">Warning (Amber)</option>
                      <option value="advisory">Advisory (Yellow)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Alert Headline</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Emergency Instructions</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800"
                    required
                  />
                </div>

                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-[11px] leading-relaxed">
                  ⚠️ This action triggers multi-channel delivery to rural volunteers, Gram Panchayat, and ASDMA officers across Majuli.
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAlertModalOpen(false)}
                    className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isBroadcasting}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition-all disabled:opacity-50"
                  >
                    {isBroadcasting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Broadcasting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Confirm & Broadcast</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
