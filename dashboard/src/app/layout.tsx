import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { LanguageProvider } from "../context/LanguageContext";
import { Navbar } from "../components/Navbar";

export const metadata: Metadata = {
  title: "Xongket — Assam SDMA Early-Warning & Telemetry Operations",
  description: "Rural flood, landslide, and surge early-warning telemetry system for Assam using IoT, AI & Cloud",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#f4f6f9] text-slate-900 font-sans selection:bg-sky-500 selection:text-white">
        <LanguageProvider>
          <AuthProvider>
            <Suspense fallback={<div className="h-15 bg-white border-b border-slate-200" />}>
              <Navbar />
            </Suspense>
            <main className="flex-1 w-full bg-[#f4f6f9]">
              <Suspense fallback={<div className="py-20 text-center text-slate-400">Loading command console...</div>}>
                {children}
              </Suspense>
            </main>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
