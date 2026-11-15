"use client";

import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { AlertSeverity } from "../../lib/types";
import { useLanguage } from "../../context/LanguageContext";

interface AlertBadgeProps {
  severity: AlertSeverity | "normal";
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

export const AlertBadge: React.FC<AlertBadgeProps> = ({
  severity,
  size = "md",
  showIcon = true,
}) => {
  const { t } = useLanguage();

  const configs = {
    danger: {
      bg: "bg-red-950/80 border-red-500 text-red-200",
      dot: "bg-red-500 animate-pulse",
      icon: <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />,
      label: t("danger"),
      aria: "Critical Danger",
    },
    warning: {
      bg: "bg-amber-950/80 border-amber-500 text-amber-200",
      dot: "bg-amber-400",
      icon: <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
      label: t("warning"),
      aria: "Warning Alert",
    },
    advisory: {
      bg: "bg-sky-950/80 border-sky-500 text-sky-200",
      dot: "bg-sky-400",
      icon: <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />,
      label: t("advisory"),
      aria: "Advisory Notice",
    },
    normal: {
      bg: "bg-emerald-950/80 border-emerald-500 text-emerald-200",
      dot: "bg-emerald-400",
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
      label: t("normal"),
      aria: "Normal / Safe",
    },
  };

  const current = configs[severity] || configs.normal;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1 font-semibold",
    md: "px-2.5 py-1 text-xs gap-1.5 font-bold tracking-wide",
    lg: "px-3.5 py-1.5 text-sm gap-2 font-bold tracking-wide",
  }[size];

  return (
    <span
      role="status"
      aria-label={current.aria}
      className={`inline-flex items-center rounded-md border shadow-sm ${current.bg} ${sizeClasses}`}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${current.dot}`} />
      {showIcon && current.icon}
      <span>{current.label.toUpperCase()}</span>
    </span>
  );
};
