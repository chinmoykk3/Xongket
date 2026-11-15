"use client";

import dynamic from "next/dynamic";
import React from "react";
import { Loader2 } from "lucide-react";

export const DynamicAssamMap = dynamic(
  () => import("./AssamMap").then((mod) => mod.AssamMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[520px] rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
        <span className="text-sm font-medium">Loading Assam Geospatial Disaster Map...</span>
      </div>
    ),
  }
);
