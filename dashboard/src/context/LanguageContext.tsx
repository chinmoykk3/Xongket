"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Language } from "../lib/types";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const DICTIONARY: Record<Language, Record<string, string>> = {
  en: {
    app_title: "XONGKET",
    app_subtitle: "Integrated Rural Disaster Management System — Assam",
    nav_overview: "Live Overview",
    nav_villages: "Villages & Gauges",
    nav_alerts: "Alert Management",
    nav_nodes: "Sensor Nodes",
    nav_village_mode: "Village Mode",
    village_mode: "Village Mode",
    nav_login: "Officer Sign In",
    nav_logout: "Sign Out",

    // Statuses & Severities
    normal: "Normal",
    advisory: "Advisory",
    warning: "Warning",
    danger: "Danger",
    critical: "Critical Danger",
    char_area: "Char Area (Riverine Island)",
    mainland: "Mainland",

    // Node Health
    online: "Online",
    stale: "Stale",
    offline: "Offline",
    low_battery: "Low Battery",
    healthy: "Healthy",

    // Hazards
    hazard_flood: "Flood Surge",
    hazard_landslide: "Landslide Risk",
    hazard_earthquake: "Earthquake Tremor",

    // Dashboard UI
    active_alerts: "Active Alerts",
    monitored_villages: "Monitored Villages",
    active_nodes: "Active IoT Nodes",
    evacuation_shelters: "Relief Shelters",
    live_feed_title: "Real-Time Emergency Feed",
    no_active_alerts: "All stations operating within normal thresholds.",
    connected: "Live WebSocket Connected",
    disconnected: "Disconnected (Reconnecting...)",
    connecting: "Connecting...",

    // Village Details
    village_profile: "Village Hydrological Profile",
    sensors_telemetry: "Real-Time Sensor Telemetry",
    ai_forecast_section: "AI Multi-Horizon Flood Forecast",
    forecast_lead_time: "Lead Time",
    hours_ahead: "hours ahead",
    uncertainty_range: "Uncertainty Margin (p10 - p90)",
    contributing_factors: "Driving Hydrological Factors",
    landslide_assessment: "Geotechnical Slope Stability Assessment",
    emergency_contacts: "Local Emergency Contacts",
    nearest_shelter: "Nearest Assigned Shelter",
    capacity_people: "capacity",
    call_now: "Call Emergency Contact",

    // Actions
    acknowledge: "Acknowledge Alert",
    acknowledged: "Acknowledged",
    manual_alert: "Dispatch Manual Alert",
    cancel: "Cancel",
    confirm: "Confirm & Broadcast",
    filter_by_severity: "Filter Severity",
    all_severities: "All Severities",
    all_districts: "All Districts",
  },
  as: {
    app_title: "সংকেত (XONGKET)",
    app_subtitle: "অসম গ্ৰাম্য দুৰ্যোগ প্ৰাৰম্ভিক সতৰ্কবাণী ব্যৱস্থা",
    nav_overview: "লাইভ দৃশ্যপট",
    nav_villages: "গাঁও আৰু গে'জ",
    nav_alerts: "সতৰ্কবাৰ্তা নিয়ন্ত্ৰণ",
    nav_nodes: "চেন্সৰ ন'ডসমূহ",
    nav_village_mode: "গাঁও মোড (সহজ দৰ্শন)",
    village_mode: "গাঁও মোড (সহজ দৰ্শন)",
    nav_login: "বিষয়াসকলৰ প্ৰৱেশ",
    nav_logout: "প্ৰস্থান",

    // Statuses & Severities
    normal: "স্বাভাৱিক",
    advisory: "পৰামৰ্শ",
    warning: "সতৰ্কবাণী",
    danger: "জৰুৰী বিপদ",
    critical: "চৰম সংকটকালীন",
    char_area: "চৰ-চাপৰি অঞ্চল",
    mainland: "মূল ভূখণ্ড",

    // Node Health
    online: "সক্ৰিয়",
    stale: "বিলম্বিত",
    offline: "অসক্ৰিয়",
    low_battery: "কম বেটাৰী",
    healthy: "সুস্থ",

    // Hazards
    hazard_flood: "বানপানী / নদী স্ফীতি",
    hazard_landslide: "ভূমিখলন আশংকা",
    hazard_earthquake: "ভূমিকম্পৰ কম্পন",

    // Dashboard UI
    active_alerts: "সক্ৰিয় সতৰ্কবাৰ্তা",
    monitored_villages: "নিৰীক্ষণাধীন গাঁওসমূহ",
    active_nodes: "সক্ৰিয় আইঅ'টি ন'ড",
    evacuation_shelters: "আশ্ৰয় শিবিৰ",
    live_feed_title: "প্ৰত্যক্ষ জৰুৰী বাৰ্তা প্ৰৱাহ",
    no_active_alerts: "সকলো গে'জ স্বাভাৱিক মাত্ৰাৰ ভিতৰত আছে।",
    connected: "লাইভ ৱেবছকেট সংযুক্ত",
    disconnected: "সংযোগ বিচ্ছিন্ন (পুনৰ চেষ্টা চলিছে...)",
    connecting: "সংযুক্ত হৈ আছে...",

    // Village Details
    village_profile: "গাঁওখনৰ জলবায়ু আৰু অৱস্থিতি",
    sensors_telemetry: "চেন্সৰৰ লাইভ ৰেকৰ্ডিং",
    ai_forecast_section: "AI আগজাননী (১, ৩ আৰু ৬ ঘণ্টা)",
    forecast_lead_time: "পূৰ্বানুমান সময়",
    hours_ahead: "ঘণ্টা আগত",
    uncertainty_range: "সম্ভাৱ্য তাৰতম্য সীমা (p10 - p90)",
    contributing_factors: "মূল কাৰকসমূহ",
    landslide_assessment: "মাটিৰ স্থিৰতা আৰু ভূমিস্খলন মূল্যায়ন",
    emergency_contacts: "স্থানীয় জৰুৰীকালীন যোগাযোগ",
    nearest_shelter: "নিকটৱৰ্তী আশ্ৰয় শিবিৰ",
    capacity_people: "ক্ষমতা",
    call_now: "ফোন কৰক",

    // Actions
    acknowledge: "অৱগত হওক",
    acknowledged: "অৱগত কৰা হ'ল",
    manual_alert: "মানুৱেল সংকেত প্ৰেৰণ",
    cancel: "বাতিল",
    confirm: "নিশ্চিত আৰু প্ৰেৰণ কৰক",
    filter_by_severity: "মাত্ৰা অনুসৰি বাছক",
    all_severities: "সকলো মাত্ৰা",
    all_districts: "সকলো জিলা",
  },
  br: {
    app_title: "সংকেत (XONGKET)",
    app_subtitle: "आसाम गामिया दैबाना सिगां-फोराव थांखि",
    nav_overview: "लाइभ नायनाय",
    nav_villages: "गामि आरो गे'ज",
    nav_alerts: "सिखिनाय सामलायनाय",
    nav_nodes: "सेन्सर न'डफोर",
    nav_village_mode: "गामि म'ड",
    village_mode: "गामि म'ड",
    nav_login: "हाबनाय",
    nav_logout: "ओंखारनाय",
    normal: "गाहाम",
    advisory: "सुबुं-गोसोखां",
    warning: "सावधान",
    danger: "खैफोद",
    critical: "गोबां खैफोद",
  },
  bn: {
    app_title: "সংকেত (XONGKET)",
    app_subtitle: "আসাম গ্রামীণ দুর্যোগ আগাম সতর্কবার্তা ব্যবস্থা",
    nav_overview: "লাইভ দৃশ্যপট",
    nav_villages: "গ্রাম ও গেজ",
    nav_alerts: "সতর্কবার্তা নিয়ন্ত্রণ",
    nav_nodes: "সেন্সর নোড",
    nav_village_mode: "ভিলেজ মোড",
    village_mode: "ভিলেজ মোড",
    nav_login: "প্রবেশ",
    nav_logout: "প্রস্থান",
    normal: "স্বাভাবিক",
    advisory: "পরামর্শ",
    warning: "সতর্কতা",
    danger: "বিপদ",
    critical: "চরম বিপদ",
  },
  hi: {
    app_title: "संकेत (XONGKET)",
    app_subtitle: "असम ग्रामीण आपदा पूर्व चेतावनी प्रणाली",
    nav_overview: "लाइव अवलोकन",
    nav_villages: "गांव और गेज",
    nav_alerts: "चेतावनी नियंत्रण",
    nav_nodes: "सेंसर नोड्स",
    nav_village_mode: "विलेज मोड",
    village_mode: "विलेज मोड",
    nav_login: "लॉग इन",
    nav_logout: "लॉग आउट",
    normal: "सामान्य",
    advisory: "परामर्श",
    warning: "चेतावनी",
    danger: "खतरा",
    critical: "अति गंभीर खतरा",
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key: string) => key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const saved = localStorage.getItem("xongket_lang") as Language;
    if (saved && ["en", "as", "br", "bn", "hi"].includes(saved)) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("xongket_lang", lang);
  };

  const t = (key: string): string => {
    return DICTIONARY[language]?.[key] || DICTIONARY.as?.[key] || DICTIONARY.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
