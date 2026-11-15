"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { Node, Shelter, VillageRiskSummary } from "../../lib/types";
import { useLanguage } from "../../context/LanguageContext";

interface AssamMapProps {
  villages: VillageRiskSummary[];
  nodes: Node[];
  shelters: Shelter[];
  selectedVillageId?: number | null;
  onSelectVillage?: (villageId: number) => void;
}

export const AssamMap: React.FC<AssamMapProps> = ({
  villages,
  nodes,
  shelters,
  selectedVillageId,
  onSelectVillage,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Center coordinates of Assam (focusing on Brahmaputra basin: Majuli, Dhemaji, Lakhimpur, Barpeta)
      const map = L.map(mapContainerRef.current, {
        center: [26.85, 93.6],
        zoom: 8,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      // CartoDB Dark Matter / Voyager tile layer for clean calm control room visualization
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          attribution: '&copy; <a href="https://carto.com/">CartoDB</a> OpenStreetMap contributors',
          maxZoom: 18,
        }
      ).addTo(map);

      mapInstanceRef.current = map;
      layerGroupRef.current = L.layerGroup().addTo(map);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when data changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // 1. Plot Shelters
    shelters.forEach((shelter) => {
      const shelterIcon = L.divIcon({
        className: "custom-shelter-marker",
        html: `
          <div class="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white shadow-md border-2 border-white hover:scale-110 transition-transform">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([shelter.lat, shelter.lng], { icon: shelterIcon });
      marker.bindPopup(`
        <div class="p-2 text-slate-900 font-sans">
          <div class="text-[11px] font-bold uppercase tracking-wider text-blue-700">Evacuation Shelter</div>
          <div class="text-sm font-extrabold">${shelter.name}</div>
          <div class="mt-1 text-xs text-slate-600">Capacity: <span class="font-bold text-slate-800">${shelter.capacity}</span> persons</div>
          <div class="text-[11px] text-slate-500 mt-0.5">Coordinates: ${shelter.lat.toFixed(3)}, ${shelter.lng.toFixed(3)}</div>
        </div>
      `);
      marker.addTo(layerGroup);
    });

    // 2. Plot Villages with Accessible Risk Representation
    villages.forEach((v) => {
      // Accessible color configs + geometric badges
      const riskConfig = {
        danger: {
          bg: "bg-red-600",
          border: "border-red-300 ring-4 ring-red-500/40 animate-pulse",
          symbol: "⚠",
          label: "DANGER",
        },
        warning: {
          bg: "bg-amber-500",
          border: "border-amber-200 ring-2 ring-amber-400/40",
          symbol: "▲",
          label: "WARNING",
        },
        advisory: {
          bg: "bg-sky-500",
          border: "border-sky-200",
          symbol: "ℹ",
          label: "ADVISORY",
        },
        normal: {
          bg: "bg-emerald-500",
          border: "border-white",
          symbol: "✓",
          label: "NORMAL",
        },
      }[v.risk_level] || {
        bg: "bg-emerald-500",
        border: "border-white",
        symbol: "✓",
        label: "NORMAL",
      };

      const villageIcon = L.divIcon({
        className: "custom-village-marker",
        html: `
          <div class="relative group cursor-pointer">
            <div class="flex items-center justify-center w-8 h-8 rounded-full ${riskConfig.bg} text-white font-extrabold text-xs shadow-lg border-2 ${riskConfig.border} transition-transform hover:scale-125">
              <span>${riskConfig.symbol}</span>
            </div>
            ${v.is_char_area ? '<div class="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border border-slate-900" title="Char Area"></div>' : ''}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      // Approximate coordinates if not explicitly provided in risk summary
      const lat = (v as any).lat || 26.9 + (v.village_id % 7) * 0.12 - 0.2;
      const lng = (v as any).lng || 94.1 + (v.village_id % 5) * 0.15 - 0.2;

      const marker = L.marker([lat, lng], { icon: villageIcon });

      const popupContent = `
        <div class="p-2.5 text-slate-900 font-sans min-w-[210px]">
          <div class="flex items-center justify-between gap-2 border-b pb-1.5 mb-1.5">
            <div>
              <div class="text-xs font-bold uppercase text-slate-500">${v.district_name} District</div>
              <div class="text-base font-extrabold text-slate-900">${v.village_name}</div>
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase text-white ${riskConfig.bg}">
              ${riskConfig.label}
            </span>
          </div>

          ${
            v.is_char_area
              ? '<span class="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold mb-2">Char Area (River Island)</span>'
              : ''
          }

          <div class="space-y-1 text-xs text-slate-700">
            ${
              v.latest_water_level_cm !== null && v.latest_water_level_cm !== undefined
                ? `<div class="flex justify-between"><span>Water Level:</span> <strong class="text-slate-900">${v.latest_water_level_cm.toFixed(1)} cm</strong></div>`
                : ""
            }
            ${
              v.latest_rainfall_mm !== null && v.latest_rainfall_mm !== undefined
                ? `<div class="flex justify-between"><span>Rainfall:</span> <strong class="text-slate-900">${v.latest_rainfall_mm.toFixed(1)} mm</strong></div>`
                : ""
            }
            ${
              v.latest_soil_moisture_pct !== null && v.latest_soil_moisture_pct !== undefined
                ? `<div class="flex justify-between"><span>Soil Moisture:</span> <strong class="text-slate-900">${v.latest_soil_moisture_pct.toFixed(1)}%</strong></div>`
                : ""
            }
            <div class="flex justify-between"><span>Active Alerts:</span> <strong class="${v.active_alerts_count > 0 ? "text-red-600" : "text-slate-900"}">${v.active_alerts_count}</strong></div>
          </div>

          <div class="mt-3 pt-2 border-t text-center">
            <a href="/villages/${v.village_id}" class="inline-block w-full py-1.5 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-bold no-underline transition-colors">
              View Sensor Charts & Forecasts →
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on("click", () => {
        if (onSelectVillage) onSelectVillage(v.village_id);
      });

      marker.addTo(layerGroup);
    });

    // 3. Plot Nodes (Subtle IoT markers)
    nodes.forEach((node) => {
      // Determine node health icon & badge
      const lastSeen = new Date(node.last_seen);
      const diffMinutes = (Date.now() - lastSeen.getTime()) / (1000 * 60);
      const isStale = diffMinutes > 60 && diffMinutes <= 240;
      const isOffline = diffMinutes > 240 || node.status === "offline";
      const isLowBattery = node.battery_pct !== null && node.battery_pct !== undefined && node.battery_pct < 20;

      let dotColor = "bg-emerald-400";
      if (isOffline) dotColor = "bg-slate-400";
      else if (isStale) dotColor = "bg-yellow-400";
      else if (isLowBattery) dotColor = "bg-orange-500 animate-pulse";

      const nodeIcon = L.divIcon({
        className: "custom-node-marker",
        html: `
          <div class="w-3.5 h-3.5 rounded-full ${dotColor} border border-slate-900 shadow-sm" title="Node #${node.id} (${node.type})"></div>
        `,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const marker = L.marker([node.lat, node.lng], { icon: nodeIcon });
      marker.bindPopup(`
        <div class="p-2 text-slate-900 text-xs font-sans">
          <div class="font-bold text-slate-800">Node #${node.id} (${node.type})</div>
          <div>Status: <span class="font-semibold">${node.status}</span></div>
          ${node.battery_pct !== null && node.battery_pct !== undefined ? `<div>Battery: <strong>${node.battery_pct}%</strong></div>` : ""}
          <div class="text-[10px] text-slate-500 mt-1">Last Seen: ${lastSeen.toLocaleTimeString()}</div>
        </div>
      `);
      marker.addTo(layerGroup);
    });
  }, [villages, nodes, shelters, onSelectVillage]);

  return (
    <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-[400] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 shadow-lg text-slate-200 text-xs space-y-2 pointer-events-auto">
        <div className="font-bold text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1">
          Map Legend / সংকেত তালিকা
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-600 border border-white flex items-center justify-center text-[8px] font-black text-white">⚠</span>
            <span>Danger / বিপদ</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 border border-white flex items-center justify-center text-[8px] font-black text-white">▲</span>
            <span>Warning / সতৰ্ক</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-sky-500 border border-white flex items-center justify-center text-[8px] font-black text-white">ℹ</span>
            <span>Advisory / পৰামৰ্শ</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white flex items-center justify-center text-[8px] font-black text-white">✓</span>
            <span>Normal / শান্ত</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-600 border border-white"></span>
            <span>Shelter / আশ্ৰয় শিবিৰ</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-900"></span>
            <span>IoT Node / চেন্সৰ</span>
          </div>
        </div>
      </div>
    </div>
  );
};
