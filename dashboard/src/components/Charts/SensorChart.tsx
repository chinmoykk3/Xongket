"use client";

import React from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Reading } from "../../lib/types";

interface SensorChartProps {
  title: string;
  readings: Reading[];
  unit: string;
  color?: string;
  warningThreshold?: number;
  dangerThreshold?: number;
  height?: number;
}

export const SensorChart: React.FC<SensorChartProps> = ({
  title,
  readings,
  unit,
  color = "#0ea5e9",
  warningThreshold,
  dangerThreshold,
  height = 260,
}) => {
  // Format data sorted chronologically
  const chartData = [...readings]
    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
    .map((r) => {
      const dt = new Date(r.ts);
      return {
        time: dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        fullDate: dt.toLocaleString(),
        value: r.value,
        quality: r.quality_flag,
      };
    });

  if (chartData.length === 0) {
    return (
      <div
        className="w-full rounded-xl border border-slate-800 bg-slate-900/40 p-4 flex flex-col items-center justify-center text-slate-400"
        style={{ height }}
      >
        <span className="text-sm font-medium">No recent readings recorded for {title}.</span>
      </div>
    );
  }

  // Calculate domain padding
  const values = chartData.map((d) => d.value);
  const minVal = Math.min(...values, warningThreshold || Infinity, dangerThreshold || Infinity);
  const maxVal = Math.max(...values, warningThreshold || -Infinity, dangerThreshold || -Infinity);
  const yDomain = [
    Math.max(0, Math.floor(minVal * 0.9)),
    Math.ceil(maxVal * 1.1),
  ];

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-slate-200">{title}</h4>
        <span className="text-xs font-mono text-slate-400">Unit: {unit}</span>
      </div>

      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} domain={yDomain} tickLine={false} unit={` ${unit}`} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 shadow-xl text-xs font-sans text-slate-200">
                      <div className="text-slate-400 text-[10px] mb-1">{data.fullDate}</div>
                      <div className="font-bold text-base text-white">
                        {data.value} {unit}
                      </div>
                      {data.quality !== "ok" && (
                        <div className="text-amber-400 text-[10px] font-semibold mt-1">
                          Flag: {data.quality}
                        </div>
                      )}
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
                  value: `Warning (${warningThreshold}${unit})`,
                  fill: "#f59e0b",
                  fontSize: 10,
                  position: "insideTopRight",
                }}
              />
            )}
            {dangerThreshold && (
              <ReferenceLine
                y={dangerThreshold}
                stroke="#ef4444"
                strokeDasharray="4 4"
                label={{
                  value: `Danger (${dangerThreshold}${unit})`,
                  fill: "#ef4444",
                  fontSize: 10,
                  position: "insideTopRight",
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="value"
              name={title}
              stroke={color}
              strokeWidth={2.2}
              dot={{ r: 2.5, fill: color }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
