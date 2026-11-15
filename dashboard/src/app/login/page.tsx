"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Lock, LogIn, Shield, User, UserCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

export default function LoginPage() {
  const router = useRouter();
  const { user, login, logout, isLoading } = useAuth();
  const { t } = useLanguage();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setError(null);
    setIsSubmitting(true);
    try {
      await login(username, password);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Invalid credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
    setIsSubmitting(true);
    try {
      await login(u, p);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Quick login failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user) {
    return (
      <div className="max-w-md mx-auto py-16 px-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-teal-950 border border-teal-600 text-teal-400 flex items-center justify-center mx-auto">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Signed In</h2>
            <p className="text-xs text-slate-400 mt-1">
              Active Officer Session: <strong className="text-teal-400">{user.username}</strong>
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-left text-xs space-y-1.5 text-slate-300">
            <div className="flex justify-between">
              <span>Assigned Role:</span>
              <strong className="uppercase text-teal-400">{user.role}</strong>
            </div>
            <div className="flex justify-between">
              <span>Permissions:</span>
              <span>{user.role === "volunteer" ? "Read-Only Dashboard" : "Full Broadcast Authorization"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => router.push("/")}
              className="flex-1 py-2 rounded-lg bg-teal-600 text-white font-bold text-xs hover:bg-teal-500 cursor-pointer"
            >
              Go to Overview
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 rounded-lg bg-slate-800 text-red-400 font-bold text-xs hover:bg-slate-700 cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-sky-500 flex items-center justify-center mx-auto shadow-lg shadow-teal-500/20">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-black text-white">{t("nav_login")}</h1>
        <p className="text-xs text-slate-400">
          Authorized personnel authentication for emergency broadcast dispatch & sensor management.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        {error && (
          <div className="p-3 rounded-lg bg-red-950/80 border border-red-800 text-red-300 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-slate-300">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter officer username..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-teal-500 font-medium"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-300">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-teal-500 font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs shadow-lg shadow-teal-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <LogIn className="w-4 h-4" />
            <span>{isSubmitting ? "Authenticating..." : "Sign In to Control Room"}</span>
          </button>
        </form>

        {/* Demo Fast Login Buttons */}
        <div className="pt-4 border-t border-slate-800 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center">
            Demo Authority Roles
          </div>

          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => handleQuickLogin("admin", "adminpass123")}
              className="w-full p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-xs text-left transition-colors cursor-pointer"
            >
              <div>
                <span className="font-bold text-slate-200 block">State Admin (ASDMA)</span>
                <span className="text-[10px] text-teal-400">admin / adminpass123</span>
              </div>
              <span className="text-[10px] bg-red-950 text-red-300 border border-red-800 px-1.5 py-0.5 rounded font-bold uppercase">
                All Access
              </span>
            </button>

            <button
              onClick={() => handleQuickLogin("officer_majuli", "majulipass123")}
              className="w-full p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-xs text-left transition-colors cursor-pointer"
            >
              <div>
                <span className="font-bold text-slate-200 block">District Officer (Majuli)</span>
                <span className="text-[10px] text-teal-400">officer_majuli / majulipass123</span>
              </div>
              <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.5 rounded font-bold uppercase">
                Officer
              </span>
            </button>

            <button
              onClick={() => handleQuickLogin("volunteer_jonai", "jonaipass123")}
              className="w-full p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-xs text-left transition-colors cursor-pointer"
            >
              <div>
                <span className="font-bold text-slate-200 block">Gram Panchayat Volunteer</span>
                <span className="text-[10px] text-teal-400">volunteer_jonai / jonaipass123</span>
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold uppercase">
                Read-Only
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
