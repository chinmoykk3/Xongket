import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { LanguageProvider } from "../context/LanguageContext";
import { Navbar } from "../components/Navbar";

export const metadata: Metadata = {
  title: "XONGKET — Integrated Rural Disaster Management System for Assam",
  description: "Flood, Landslide, and Earthquake Early-Warning Platform for Rural Assam using IoT, AI & Cloud",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-teal-500 selection:text-white">
        <LanguageProvider>
          <AuthProvider>
            <Suspense fallback={<div className="h-16 bg-slate-900 border-b border-slate-800" />}>
              <Navbar />
            </Suspense>
            <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 w-full">
              <Suspense fallback={<div className="py-20 text-center text-slate-400">Loading...</div>}>
                {children}
              </Suspense>
            </main>
            <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
              <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
                <span>XONGKET — Assam Early Warning & Disaster Mitigation Platform</span>
                <span className="font-mono text-[11px] text-slate-600">
                  Powered by NodeMCU ESP8266 IoT Fleet • AI HistGradientBoosting • Cloud
                </span>
              </div>
            </footer>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
