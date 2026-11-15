"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Waves,
  Mountain,
  Radio,
  Grid,
  Cpu,
  SlidersHorizontal,
  ChevronDown,
  Activity,
  CheckCircle2,
} from "lucide-react";

interface CommandSidebarProps {
  selectedRegion?: string;
  onSelectRegion?: (region: string) => void;
}

export const CommandSidebar: React.FC<CommandSidebarProps> = ({
  selectedRegion = "Brahmaputra Basin [Upper]",
  onSelectRegion,
}) => {
  const pathname = usePathname();
  const [regionMenuOpen, setRegionMenuOpen] = useState(false);
  const [currentRegion, setCurrentRegion] = useState(selectedRegion);

  const regions = [
    "Brahmaputra Basin [Upper]",
    "Majuli Island Core & Chars",
    "Barak Valley Reach",
    "Dhemaji Sub-Catchment",
    "Kaziranga Buffer Zone",
  ];

  const handleRegionSelect = (reg: string) => {
    setCurrentRegion(reg);
    setRegionMenuOpen(false);
    if (onSelectRegion) onSelectRegion(reg);
  };

  const navItems = [
    {
      label: "River & Flood Monitoring",
      href: "/",
      icon: Waves,
      active: pathname === "/",
    },
    {
      label: "Landslide & Geotechnical",
      href: "/landslide",
      icon: Mountain,
      active: pathname.startsWith("/landslide"),
    },
    {
      label: "Multi-Channel Dispatch",
      href: "/alerts",
      icon: Radio,
      active: pathname.startsWith("/alerts"),
    },
    {
      label: "Village & Char Area Grid",
      href: "/villages",
      icon: Grid,
      active: pathname === "/villages",
    },
    {
      label: "Hardware & Sensor Nodes",
      href: "/nodes",
      icon: Cpu,
      active: pathname.startsWith("/nodes"),
    },
  ];

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-slate-200/90 flex flex-col justify-between select-none shadow-xs">
      <div className="p-4 space-y-5">
        {/* Operations Region Selector */}
        <div className="space-y-1.5 relative">
          <div className="flex items-center justify-between text-[10px] font-bold tracking-wider text-slate-500 uppercase">
            <span>Operations Region</span>
            <SlidersHorizontal className="w-3 h-3 text-slate-400" />
          </div>

          <button
            type="button"
            onClick={() => setRegionMenuOpen(!regionMenuOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors text-left"
          >
            <span className="truncate">{currentRegion}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 ml-1 shrink-0" />
          </button>

          {regionMenuOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 text-xs">
              {regions.map((reg) => (
                <button
                  key={reg}
                  onClick={() => handleRegionSelect(reg)}
                  className={`w-full text-left px-3 py-1.5 transition-colors flex items-center justify-between ${
                    currentRegion === reg
                      ? "bg-sky-50 text-sky-700 font-semibold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="truncate">{reg}</span>
                  {currentRegion === reg && <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Section */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  item.active
                    ? "bg-[#0284c7] text-white shadow-sm font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${item.active ? "text-white" : "text-slate-500"}`} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Telemetry & Diagnostics Box */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3">
        {/* Telemetry Sync Lag */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-600">
            <span className="flex items-center gap-1.5 font-medium">
              <Activity className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
              Telemetry Sync
            </span>
            <span className="font-mono text-slate-900 font-semibold">0.8s lag</span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div className="bg-sky-500 h-full rounded-full w-[94%]" />
          </div>
        </div>

        {/* Sub-nodes Status */}
        <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1">
          <span className="font-medium">Sub-nodes OK</span>
          <span className="font-mono font-semibold text-slate-800">118 / 120</span>
        </div>

        {/* Version Footnote */}
        <div className="text-[10px] font-mono text-slate-400 text-center tracking-tight pt-1">
          SDMA Assam v3.2-Glacier
        </div>
      </div>
    </aside>
  );
};
