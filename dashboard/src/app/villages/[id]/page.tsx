"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Building,
  CheckCircle2,
  Clock,
  Droplets,
  Mountain,
  Phone,
  Radio,
  RefreshCw,
  Shield,
  Thermometer,
  Waves,
} from "lucide-react";
import { SensorChart } from "../../../components/Charts/SensorChart";
import { ForecastChart } from "../../../components/Charts/ForecastChart";
import { AlertBadge } from "../../../components/Alerts/AlertBadge";
import { useLanguage } from "../../../context/LanguageContext";
import { api } from "../../../lib/api";
import {
  Contact,
  Forecast,
  LandslideRisk,
  Node,
  Reading,
  Shelter,
  Village,
} from "../../../lib/types";

export const dynamic = "force-dynamic";

export default function VillageDetailPage() {
  const params = useParams();
  const villageId = Number(params?.id);
  const { t } = useLanguage();

  const [village, setVillage] = useState<Village | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [readingsByNode, setReadingsByNode] = useState<Record<number, Reading[]>>({});
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [landslideRisk, setLandslideRisk] = useState<LandslideRisk | null>(null);
  const [shelter, setShelter] = useState<Shelter | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVillageData = async () => {
    if (!villageId) return;
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch village details
      const allVillages = await api.getVillages();
      const currentVil = allVillages.find((v) => v.id === villageId);
      if (!currentVil) {
        throw new Error(`Village with ID #${villageId} not found.`);
      }
      setVillage(currentVil);

      // 2. Fetch nodes in this village
      const villageNodes = await api.getNodes({ village_id: villageId });
      setNodes(villageNodes);

      // 3. Fetch readings for each node (past 24h)
      const readingsMap: Record<number, Reading[]> = {};
      const waterNode = villageNodes.find((n) => n.type === "water_level");

      await Promise.all(
        villageNodes.map(async (n) => {
          try {
            const r = await api.getNodeReadings(n.id, { limit: 60 });
            readingsMap[n.id] = r;
          } catch {
            readingsMap[n.id] = [];
          }
        })
      );
      setReadingsByNode(readingsMap);

      // 4. Fetch AI forecasts if water_level node exists
      if (waterNode) {
        try {
          const fc = await api.getNodeForecasts(waterNode.id);
          setForecasts(fc);
        } catch (err) {
          console.error("Forecast fetch error", err);
        }
      }

      // 5. Fetch Landslide Risk
      try {
        const lr = await api.getVillageLandslideRisk(villageId);
        setLandslideRisk(lr);
      } catch (err) {
        console.error("Landslide risk error", err);
      }

      // 6. Fetch Nearest Shelter
      if (currentVil.nearest_shelter_id) {
        const shelters = await api.getShelters();
        const sh = shelters.find((s) => s.id === currentVil.nearest_shelter_id);
        if (sh) setShelter(sh);
      }
    } catch (err: any) {
      console.error("Error loading village detail", err);
      setError(err.message || "Failed to load station telemetry.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVillageData();
  }, [villageId]);

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-teal-400" />
        <span className="text-sm font-medium">Loading village telemetry & forecasts...</span>
      </div>
    );
  }

  if (error || !village) {
    return (
      <div className="py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-800 text-red-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">Error Loading Station</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">{error}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Overview</span>
        </Link>
      </div>
    );
  }

  // Find specific node readings
  const waterNode = nodes.find((n) => n.type === "water_level");
  const rainNode = nodes.find((n) => n.type === "rain_gauge");
  const soilNode = nodes.find((n) => n.type === "soil_moisture");
  const tempNode = nodes.find((n) => n.type === "temperature");
  const humNode = nodes.find((n) => n.type === "humidity");

  const waterReadings = waterNode ? readingsByNode[waterNode.id] || [] : [];
  const rainReadings = rainNode ? readingsByNode[rainNode.id] || [] : [];
  const soilReadings = soilNode ? readingsByNode[soilNode.id] || [] : [];
  const tempReadings = tempNode ? readingsByNode[tempNode.id] || [] : [];
  const humReadings = humNode ? readingsByNode[humNode.id] || [] : [];

  const currentWaterLevel = waterReadings.length > 0 ? waterReadings[waterReadings.length - 1].value : 230.0;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Station Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div className="space-y-1">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-teal-400 transition-colors mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t("nav_overview")}</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-white">{village.name}</h1>
            {village.is_char_area && (
              <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300 text-xs font-bold">
                ★ {t("char_area")}
              </span>
            )}
            <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-mono">
              ID: #{village.id}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Population: <strong className="text-slate-200">{village.population.toLocaleString()}</strong> |
            Language: <strong className="text-slate-200 uppercase">{village.language}</strong> |
            Coords: {village.lat.toFixed(4)}, {village.lng.toFixed(4)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/village/${village.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-300 text-xs font-bold transition-colors shadow-sm"
            title="Open simplified mobile view for villagers"
          >
            <span>📱 Village Mode</span>
          </Link>

          <button
            onClick={loadVillageData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* AI Flood Forecast Band Section */}
      {waterNode && forecasts.length > 0 && (
        <ForecastChart
          currentWaterLevel={currentWaterLevel}
          forecasts={forecasts}
          warningThreshold={400.0}
          dangerThreshold={450.0}
        />
      )}

      {/* Real-time Sensor Charts Grid */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Waves className="w-5 h-5 text-teal-400" />
          <h3 className="font-extrabold text-base text-white">Live & Historical Sensor Telemetry</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {waterNode && (
            <SensorChart
              title="Water Level (Ultrasonic Gauge)"
              readings={waterReadings}
              unit="cm"
              color="#0ea5e9"
              warningThreshold={400.0}
              dangerThreshold={450.0}
            />
          )}

          {rainNode && (
            <SensorChart
              title="Precipitation / Rainfall"
              readings={rainReadings}
              unit="mm"
              color="#3b82f6"
              warningThreshold={50.0}
              dangerThreshold={80.0}
            />
          )}

          {soilNode && (
            <SensorChart
              title="Capacitive Soil Moisture"
              readings={soilReadings}
              unit="%"
              color="#10b981"
              warningThreshold={70.0}
              dangerThreshold={85.0}
            />
          )}

          {tempNode && (
            <SensorChart
              title="Ambient Temperature"
              readings={tempReadings}
              unit="°C"
              color="#f97316"
            />
          )}
        </div>
      </div>

      {/* Geotechnical Landslide Risk, Shelter & Local Nodes Card Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Landslide Risk Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Mountain className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Landslide Susceptibility
              </h4>
            </div>
            {landslideRisk && <AlertBadge severity={landslideRisk.severity} size="sm" />}
          </div>

          {landslideRisk ? (
            <div className="space-y-3 text-xs">
              <div className="flex items-baseline justify-between">
                <span className="text-slate-400">Geotechnical Risk Score:</span>
                <span className="text-lg font-black text-white font-mono">
                  {landslideRisk.risk_score} / 100
                </span>
              </div>

              <div className="space-y-1.5 pt-1 border-t border-slate-800 text-[11px] text-slate-300">
                <div className="flex justify-between">
                  <span>Soil Moisture Saturation:</span>
                  <strong>{landslideRisk.soil_moisture_pct}%</strong>
                </div>
                <div className="flex justify-between">
                  <span>24h Rainfall:</span>
                  <strong>{landslideRisk.rainfall_24h_mm} mm</strong>
                </div>
                <div className="flex justify-between">
                  <span>72h Sustained Rain:</span>
                  <strong>{landslideRisk.rainfall_72h_mm} mm</strong>
                </div>
                <div className="flex justify-between">
                  <span>Slope Topography:</span>
                  <strong className="uppercase">{landslideRisk.slope_class}</strong>
                </div>
              </div>

              <p className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 leading-relaxed italic">
                {landslideRisk.explanation}
              </p>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-4 text-center">
              No geotechnical landslide assessment available.
            </div>
          )}
        </div>

        {/* Nearest Shelter Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <Building className="w-4 h-4 text-blue-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Assigned Evacuation Shelter
            </h4>
          </div>

          {shelter ? (
            <div className="space-y-2 text-xs">
              <div className="font-extrabold text-sm text-white">{shelter.name}</div>
              <div className="flex justify-between text-slate-300">
                <span>Maximum Capacity:</span>
                <strong className="text-blue-400">{shelter.capacity} persons</strong>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Coordinates:</span>
                <span>
                  {shelter.lat.toFixed(3)}, {shelter.lng.toFixed(3)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-900/60 text-[11px] text-blue-200">
                Designated primary evacuation assembly point for Gram Panchayat volunteers and families.
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-4 text-center">
              No primary shelter mapped to this village.
            </div>
          )}
        </div>

        {/* IoT Node Status & Health Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-teal-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Local IoT Nodes ({nodes.length})
              </h4>
            </div>
          </div>

          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
            {nodes.map((n) => (
              <div
                key={n.id}
                className="p-2 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-200 block">
                    #{n.id} {n.type}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {n.device_type.toUpperCase()} • {n.source}
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      n.status === "active"
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {n.status.toUpperCase()}
                  </span>
                  {n.battery_pct !== null && n.battery_pct !== undefined && (
                    <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                      Bat: {n.battery_pct}%
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
