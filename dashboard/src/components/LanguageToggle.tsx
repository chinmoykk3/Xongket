"use client";

import React from "react";
import { Languages } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export const LanguageToggle: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <button
      onClick={() => setLanguage(language === "en" ? "as" : "en")}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors shadow-sm cursor-pointer"
      title="Toggle Language / ভাষা পৰিৱৰ্তন কৰক"
      aria-label="Toggle language between English and Assamese"
    >
      <Languages className="w-3.5 h-3.5 text-teal-400" />
      <span className={language === "en" ? "font-bold text-teal-400" : "text-slate-400"}>EN</span>
      <span className="text-slate-500">|</span>
      <span className={language === "as" ? "font-bold text-teal-400" : "text-slate-400"}>অসমীয়া</span>
    </button>
  );
};
