"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Radio,
  Layers,
  LogOut,
  LogIn,
  Menu,
  X,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { wsService } from "../lib/websocket";
import { LanguageToggle } from "./LanguageToggle";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [wsStatus, setWsStatus] = useState<"connected" | "disconnected" | "connecting">("connecting");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    wsService.connect();
    const unsubscribe = wsService.onStatus((status) => {
      setWsStatus(status);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const navLinks = [
    { href: "/", label: t("nav_overview"), icon: <Activity className="w-4 h-4" /> },
    { href: "/alerts", label: t("nav_alerts"), icon: <AlertTriangle className="w-4 h-4" /> },
    { href: "/nodes", label: t("nav_nodes"), icon: <Radio className="w-4 h-4" /> },
    { href: "/village/1", label: t("nav_village_mode"), icon: <Layers className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 text-slate-100 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-sky-500 flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform">
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-lg tracking-wider text-white group-hover:text-teal-400 transition-colors">
                  {t("app_title")}
                </span>
                <span className="text-[10px] text-slate-400 font-medium tracking-tight -mt-1 hidden sm:inline">
                  {t("app_subtitle")}
                </span>
              </div>
            </Link>

            {/* Live WebSocket Status Pill */}
            <div
              className={`hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                wsStatus === "connected"
                  ? "bg-emerald-950/80 border-emerald-600/60 text-emerald-300"
                  : wsStatus === "connecting"
                  ? "bg-amber-950/80 border-amber-600/60 text-amber-300"
                  : "bg-red-950/80 border-red-600/60 text-red-300"
              }`}
              title={t(wsStatus)}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  wsStatus === "connected"
                    ? "bg-emerald-400 animate-pulse"
                    : wsStatus === "connecting"
                    ? "bg-amber-400 animate-ping"
                    : "bg-red-400"
                }`}
              />
              <span className="uppercase text-[10px] tracking-wider font-semibold">
                {wsStatus === "connected" ? "LIVE" : wsStatus.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-teal-600/20 text-teal-300 border border-teal-500/30"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Actions: Language Switcher & User Profile */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageToggle />

            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-200">{user.username}</span>
                  <span className="text-[10px] text-teal-400 font-mono uppercase tracking-wider">
                    {user.role.replace("_", " ")}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                  title={t("nav_logout")}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t("nav_login")}</span>
              </Link>
            )}
          </div>

          {/* Mobile menu trigger */}
          <div className="flex md:hidden items-center gap-2">
            <LanguageToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900 px-4 pt-3 pb-4 space-y-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-base font-medium ${
                  isActive
                    ? "bg-teal-600/20 text-teal-300 border border-teal-500/30"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            );
          })}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            {user ? (
              <div className="flex items-center justify-between w-full">
                <span className="text-xs text-slate-300">
                  {user.username} ({user.role})
                </span>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="text-xs text-red-400 flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {t("nav_logout")}
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 bg-teal-600 rounded-lg text-sm font-semibold text-white"
              >
                {t("nav_login")}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
