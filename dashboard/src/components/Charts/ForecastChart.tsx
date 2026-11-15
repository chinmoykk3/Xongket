"use client";

import React from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Forecast } from "../../lib/types";

interface ForecastChartProps {
  currentWaterLevel: number;
  forecasts: Forecast[];
  warningThreshold?: number;
  dangerThreshold?: number;
  height?: number;
}

export const ForecastChart: React.FC<ForecastChartProps> = ({
  currentWaterLevel,
  forecasts,
  warningThreshold = 400.0,
  dangerThreshold = 450.0,
  height = 300,
}) => {
  // Sort forecasts by horizon
  const sorted = [...forecasts].sort((a, b) => a.horizon_hours - b.horizon_hours);

  // Construct continuous trajectory starting from t=0 (now)
  const chartData = [
    {
      horizon: "Now (0h)",
      hours: 0,
      predicted: currentWaterLevel,
      lower: currentWaterLevel,
      upper: currentWaterLevel,
      range: [currentWaterLevel, currentWaterLevel],
      isNow: true,
      explanation: "Current verified gauge level",
    },
    ...sorted.map((f) => ({
      horizon: `+${f.horizon_hours}h`,
      hours: f.horizon_hours,
      predicted: f.predicted_value,
      lower: f.lower_bound,
      upper: f.upper_bound,
      range: [f.lower_bound, f.upper_bound],
      isNow: false,
      explanation: f.explanation || "Seasonal regression forecast",
    })),
  ];

  const allVals = [
    currentWaterLevel,
    ...sorted.map((s) => s.upper_bound),
    ...sorted.map((s) => s.lower_bound),
    warningThreshold,
    dangerThreshold,
  ];
  const minVal = Math.floor(Math.min(...allVals) * 0.95);
  const maxVal = Math.ceil(Math.max(...allVals) * 1.05);

  return (
    <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-800 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
            <h3 className="font-extrabold text-base text-slate-100">
              AI Multi-Horizon Flood Surge Forecast
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            1-hour, 3-hour, and 6-hour predictive crest horizons with 80% quantile uncertainty margin (p10–p90).
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-sky-300">
            <span className="w-3 h-3 bg-sky-500/30 border border-sky-400 rounded-sm"></span>
            <span>Uncertainty Margin</span>
          </div>
          <div className="flex items-center gap-1.5 text-teal-300">
            <span className="w-3 h-1 bg-teal-400 rounded-full"></span>
            <span>Median Expected</span>
          </div>
        </div>
      </div>

      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>
          <ComposedChart data={chartData} margin={{ top: 12, right: 20, left: -5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="horizon" stroke="#94a3b8" fontSize={12} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} domain={[minVal, maxVal]} unit=" cm" tickLine={false} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-950 border border-slate-700/80 rounded-xl p-3 shadow-2xl text-xs text-slate-200 max-w-xs">
                      <div className="font-extrabold text-slate-100 text-sm mb-1 flex items-center justify-between">
                        <span>Horizon: {data.horizon}</span>
                        {data.predicted >= dangerThreshold ? (
                          <span className="text-[10px] bg-red-600 px-1.5 py-0.5 rounded font-bold text-white">DANGER</span>
                        ) : data.predicted >= warningThreshold ? (
                          <span className="text-[10px] bg-amber-500 px-1.5 py-0.5 rounded font-bold text-white">WARNING</span>
                        ) : null}
                      </div>
                      <div className="text-teal-400 font-mono text-base font-bold">
                        Expected: {data.predicted.toFixed(1)} cm
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5">
                        Range: {data.lower.toFixed(1)} – {data.upper.toFixed(1)} cm
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-300 italic">
                        {data.explanation}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            {warningThreshold && (
              <ReferenceLine
                y={warningThreshold}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value: `Warning (${warningThreshold} cm)`,
                  fill: "#f59e0b",
                  fontSize: 11,
                  position: "insideTopLeft",
                }}
              />
            )}
            {dangerThreshold && (
              <ReferenceLine
                y={dangerThreshold}
                stroke="#ef4444"
                strokeDasharray="4 4"
                label={{
                  value: `Danger (${dangerThreshold} cm)`,
                  fill: "#ef4444",
                  fontSize: 11,
                  position: "insideTopLeft",
                }}
              />
            )}
            {/* Uncertainty Band using Area */}
            <Area
              type="monotone"
              dataKey="upper"
              stroke="transparent"
              fill="#0284c7"
              fillOpacity={0.25}
            />
            <Area
              type="monotone"
              dataKey="lower"
              stroke="transparent"
              fill="#0f172a"
              fillOpacity={0.9}
            />
            {/* Median Forecast Line */}
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="#14b8a6"
              strokeWidth={3}
              dot={{ r: 4.5, fill: "#14b8a6" }}
              activeDot={{ r: 7 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Explanations Grid */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
        {sorted.map((fc) => (
          <div
            key={fc.horizon_hours}
            className={`p-3 rounded-xl border text-xs ${
              fc.predicted_value >= dangerThreshold
                ? "bg-red-950/40 border-red-800 text-red-200"
                : fc.predicted_value >= warningThreshold
                ? "bg-amber-950/40 border-amber-800 text-amber-200"
                : "bg-slate-900 border-slate-800 text-slate-300"
            }`}
          >
            <div className="flex items-center justify-between font-bold mb-1">
              <span>{fc.horizon_hours}-Hour Lead Time</span>
              <span className="font-mono text-sm">
                {fc.predicted_value.toFixed(1)} {fc.unit}
              </span>
            </div>
            <div className="text-[11px] opacity-75 mb-1.5">
              Confidence Range: {fc.lower_bound.toFixed(1)} – {fc.upper_bound.toFixed(1)} {fc.unit}
            </div>
            <p className="text-[11px] leading-relaxed line-clamp-2">
              {fc.explanation || "Forecast evaluated against historical monsoon dynamics."}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
