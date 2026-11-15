"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Check, Clock, ExternalLink, Volume2, VolumeX } from "lucide-react";
import { Alert, AlertSeverity } from "../../lib/types";
import { api } from "../../lib/api";
import { wsService } from "../../lib/websocket";
import { AlertBadge } from "./AlertBadge";
import { useLanguage } from "../../context/LanguageContext";

interface LiveAlertFeedProps {
  initialAlerts?: Alert[];
  maxItems?: number;
}

export const LiveAlertFeed: React.FC<LiveAlertFeedProps> = ({
  initialAlerts = [],
  maxItems = 10,
}) => {
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const { t } = useLanguage();

  useEffect(() => {
    // Fetch latest active alerts on mount
    api
      .getAlerts({ status: "active", limit: maxItems })
      .then((data) => setAlerts(data))
      .catch((err) => console.error("Failed to load initial alerts", err));

    // Subscribe to real-time incoming alerts over WebSocket
    const unsubscribe = wsService.onAlert((newAlert) => {
      setAlerts((prev) => {
        // Prevent duplicate alerts in state
        const exists = prev.some((a) => a.id === newAlert.id);
        if (exists) {
          return prev.map((a) => (a.id === newAlert.id ? newAlert : a));
        }
        return [newAlert, ...prev].slice(0, maxItems * 2);
      });

      if (soundEnabled && typeof window !== "undefined") {
        try {
          const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
          audio.play().catch(() => {});
        } catch {
          // ignore
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [maxItems, soundEnabled]);

  const handleAcknowledge = async (id: number) => {
    try {
      const updated = await api.acknowledgeAlert(id, "Acknowledged from live authority feed");
      setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch (err) {
      console.error("Failed to acknowledge alert", err);
    }
  };

  const filtered = alerts.filter((a) => {
    if (filterSeverity !== "all" && a.severity !== filterSeverity) return false;
    return true;
  });

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col h-full max-h-[600px] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          <h3 className="font-extrabold text-sm tracking-wide text-slate-100 uppercase">
            {t("live_feed_title")}
          </h3>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-mono font-bold">
            {filtered.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio Chime Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
              soundEnabled
                ? "bg-teal-950 border-teal-600 text-teal-300"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
            }`}
            title={soundEnabled ? "Mute Siren Chime" : "Enable Emergency Audio Chime"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <Link
            href="/alerts"
            className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors"
          >
            <span>All Alerts</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center gap-1.5 text-xs overflow-x-auto">
        {["all", "danger", "warning", "advisory"].map((sev) => (
          <button
            key={sev}
            onClick={() => setFilterSeverity(sev)}
            className={`px-2.5 py-1 rounded-md font-semibold tracking-wide uppercase text-[10px] transition-colors cursor-pointer ${
              filterSeverity === sev
                ? "bg-slate-700 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            {sev === "all" ? t("all_severities") : t(sev)}
          </button>
        ))}
      </div>

      {/* Alert Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-800/60">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
            <Check className="w-8 h-8 text-emerald-500 mb-2 opacity-80" />
            <p className="text-sm font-medium">{t("no_active_alerts")}</p>
            <p className="text-xs text-slate-500 mt-1">Gauges actively monitoring river levels.</p>
          </div>
        ) : (
          filtered.map((alert) => {
            const timeAgo = new Date(alert.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            const isAck = alert.status === "acknowledged";

            return (
              <div
                key={alert.id}
                className={`pt-3 first:pt-0 transition-all ${
                  isAck ? "opacity-60" : "opacity-100"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <AlertBadge severity={alert.severity} size="sm" />
                      <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded uppercase">
                        {alert.hazard}
                      </span>
                      {alert.source === "ai" && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 uppercase">
                          AI Early Warning
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo}
                      </span>
                    </div>

                    <p className="text-xs text-slate-200 font-medium leading-relaxed mt-1">
                      {alert.message}
                    </p>
                  </div>

                  <div className="shrink-0">
                    {isAck ? (
                      <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        {t("acknowledged")}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
                      >
                        {t("acknowledge")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
