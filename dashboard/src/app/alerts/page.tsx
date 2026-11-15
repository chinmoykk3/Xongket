"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Filter,
  PlusCircle,
  Radio,
  RefreshCw,
  Send,
  ShieldAlert,
} from "lucide-react";
import { AlertBadge } from "../../components/Alerts/AlertBadge";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { api } from "../../lib/api";
import { Alert, AlertHazard, AlertSeverity, District, Village } from "../../lib/types";

export const dynamic = "force-dynamic";

export default function AlertsPage() {
  const { t } = useLanguage();
  const { user, canDispatchAlerts } = useAuth();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [hazardFilter, setHazardFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedVillageFilter, setSelectedVillageFilter] = useState<string>("all");

  // Modal State: Create Manual Alert
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newVillageId, setNewVillageId] = useState<number | "">("");
  const [newSeverity, setNewSeverity] = useState<AlertSeverity>("warning");
  const [newHazard, setNewHazard] = useState<AlertHazard>("flood");
  const [newMessage, setNewMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Modal State: Acknowledge Alert
  const [ackAlertId, setAckAlertId] = useState<number | null>(null);
  const [ackNotes, setAckNotes] = useState("");

  const loadAlerts = async () => {
    setIsLoading(true);
    try {
      const [alertsData, villagesData, districtsData] = await Promise.all([
        api.getAlerts({ limit: 100 }),
        api.getVillages(),
        api.getDistricts(),
      ]);
      setAlerts(alertsData);
      setVillages(villagesData);
      setDistricts(districtsData);
    } catch (err) {
      console.error("Failed to load alerts", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleAcknowledge = async () => {
    if (!ackAlertId) return;
    try {
      const updated = await api.acknowledgeAlert(ackAlertId, ackNotes || "Acknowledged by duty officer");
      setAlerts((prev) => prev.map((a) => (a.id === ackAlertId ? updated : a)));
      setAckAlertId(null);
      setAckNotes("");
    } catch (err: any) {
      alert(`Error acknowledging alert: ${err.message}`);
    }
  };

  const handleCreateManualAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVillageId || !newMessage.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const created = await api.createManualAlert({
        village_id: Number(newVillageId),
        severity: newSeverity,
        hazard: newHazard,
        message: newMessage.trim(),
      });
      setAlerts((prev) => [created, ...prev]);
      setShowCreateModal(false);
      setNewMessage("");
    } catch (err: any) {
      setSubmitError(err.message || "Failed to dispatch manual alert.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (severityFilter !== "all" && a.severity !== severityFilter) return false;
    if (hazardFilter !== "all" && a.hazard !== hazardFilter) return false;
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (selectedVillageFilter !== "all" && String(a.village_id) !== selectedVillageFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-red-500" />
            <span>{t("nav_alerts")}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Official emergency broadcast log, multi-channel siren delivery, and response acknowledgements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canDispatchAlerts && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/20 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t("manual_alert")}</span>
            </button>
          )}

          <button
            onClick={loadAlerts}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-teal-400" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase tracking-wider text-[11px] mr-2">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>

        {/* Severity */}
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 font-medium cursor-pointer"
        >
          <option value="all">Severity: All</option>
          <option value="danger">Danger</option>
          <option value="warning">Warning</option>
          <option value="advisory">Advisory</option>
        </select>

        {/* Hazard */}
        <select
          value={hazardFilter}
          onChange={(e) => setHazardFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 font-medium cursor-pointer"
        >
          <option value="all">Hazard: All</option>
          <option value="flood">Flood</option>
          <option value="landslide">Landslide</option>
          <option value="earthquake">Earthquake</option>
        </select>

        {/* Status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 font-medium cursor-pointer"
        >
          <option value="all">Status: All</option>
          <option value="active">Active Only</option>
          <option value="acknowledged">Acknowledged Only</option>
        </select>

        {/* Village */}
        <select
          value={selectedVillageFilter}
          onChange={(e) => setSelectedVillageFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 font-medium cursor-pointer max-w-xs"
        >
          <option value="all">All Villages</option>
          {villages.map((v) => (
            <option key={v.id} value={String(v.id)}>
              {v.name}
            </option>
          ))}
        </select>

        <span className="ml-auto text-slate-400 font-mono text-xs">
          Showing {filteredAlerts.length} of {alerts.length} alerts
        </span>
      </div>

      {/* Alerts Table / Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Severity</th>
                <th className="px-4 py-3.5">Station / Village</th>
                <th className="px-4 py-3.5">Hazard & Source</th>
                <th className="px-4 py-3.5">Disaster Message</th>
                <th className="px-4 py-3.5">Channel Delivery</th>
                <th className="px-4 py-3.5">Timestamp</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    No disaster alerts match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => {
                  const villageObj = villages.find((v) => v.id === alert.village_id);
                  const isAck = alert.status === "acknowledged";

                  return (
                    <tr
                      key={alert.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isAck ? "opacity-60" : "bg-slate-900"
                      }`}
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <AlertBadge severity={alert.severity} size="sm" />
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-bold text-slate-100">
                          {villageObj?.name || `Village #${alert.village_id}`}
                        </div>
                        {villageObj?.is_char_area && (
                          <span className="text-[10px] text-amber-400 font-semibold block">
                            Char Area
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-bold uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 block w-fit">
                          {alert.hazard}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          Source: {alert.source.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 max-w-md">
                        <p className="font-medium text-slate-200 line-clamp-2">{alert.message}</p>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {["sms", "ivr", "whatsapp", "siren", "dashboard"].map((ch) => (
                            <span
                              key={ch}
                              className="text-[9px] font-bold uppercase px-1 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/80 text-emerald-300"
                              title={`${ch.toUpperCase()} broadcast sent`}
                            >
                              {ch}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-400 text-[11px] font-mono">
                        {new Date(alert.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        {isAck ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {t("acknowledged")}
                          </span>
                        ) : (
                          <button
                            onClick={() => setAckAlertId(alert.id)}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-teal-600/20 text-teal-300 border border-teal-500/40 hover:bg-teal-600 hover:text-white transition-colors cursor-pointer"
                          >
                            {t("acknowledge")}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Alert Dispatch Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="text-base font-extrabold text-white">
                  Dispatch Manual Emergency Warning
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManualAlert} className="space-y-4 text-xs">
              {submitError && (
                <div className="p-3 rounded-lg bg-red-950/80 border border-red-800 text-red-300 text-xs font-medium">
                  {submitError}
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Target Village Station *</label>
                <select
                  required
                  value={newVillageId}
                  onChange={(e) => setNewVillageId(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200"
                >
                  <option value="">Select Target Village</option>
                  {villages.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.language.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Hazard Category</label>
                  <select
                    value={newHazard}
                    onChange={(e) => setNewHazard(e.target.value as AlertHazard)}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200"
                  >
                    <option value="flood">Flood</option>
                    <option value="landslide">Landslide</option>
                    <option value="earthquake">Earthquake</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Severity Level</label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as AlertSeverity)}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200"
                  >
                    <option value="danger">Danger (Critical)</option>
                    <option value="warning">Warning (Moderate)</option>
                    <option value="advisory">Advisory (Notice)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Official Warning Message *</label>
                <textarea
                  required
                  rows={3}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Enter localized warning message for villagers and volunteers..."
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 cursor-pointer"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer"
                >
                  {isSubmitting ? "Broadcasting..." : t("confirm")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Acknowledge Notes Modal */}
      {ackAlertId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <h3 className="font-extrabold text-sm text-white">
              Acknowledge Alert #{ackAlertId}
            </h3>
            <div className="space-y-1 text-xs">
              <label className="text-slate-400 font-medium">Responder Verification Notes</label>
              <textarea
                rows={2}
                value={ackNotes}
                onChange={(e) => setAckNotes(e.target.value)}
                placeholder="e.g. ASDMA volunteer dispatched, evacuation in progress."
                className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200"
              />
            </div>
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setAckAlertId(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAcknowledge}
                className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 font-bold text-white"
              >
                Confirm Acknowledgement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
