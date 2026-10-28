'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { 
  TreePine, 
  MapPin, 
  ShieldCheck, 
  BarChart3, 
  AlertTriangle, 
  ArrowRight, 
  Leaf, 
  Wind, 
  Compass,
  Navigation,
  CloudSun,
  Mic,
  Sparkles,
  Flame,
  CheckCircle2
} from 'lucide-react';

export default function LandingPage() {
  const { t } = useTranslation();

  return (
    <div className="bg-slate-50 text-slate-800">
      
      {/* HERO SECTION */}
      <section className="relative pt-16 pb-20 lg:pt-24 lg:pb-28 overflow-hidden bg-gradient-to-b from-emerald-50/50 via-slate-50 to-slate-50">
        
        {/* Subtle ambient lighting */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-100/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-teal-100/40 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6">
          
          {/* Municipal Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-300 text-emerald-900 text-xs font-bold tracking-wide shadow-2xs">
            <TreePine className="w-4 h-4 text-emerald-700" />
            <span>Solapur Municipal Corporation • Smart Green City Portal</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight max-w-4xl mx-auto">
            Live City GIS, Environmental Intelligence &{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-700 bg-clip-text text-transparent">
              Multilingual Voice AI
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Explore Solapur's parks and sacred lakefronts with live turn-by-turn navigation, monitor real-time air quality (AQI) and festive pollution trends, and speak in Marathi, Hindi, or English to file municipal reports.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Link
              href="/map"
              className="px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
            >
              <Navigation className="w-4 h-4" />
              <span>{t('nav.map', 'Open Live Map & Navigation')}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/environment"
              className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm border border-slate-200 shadow-sm transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
            >
              <CloudSun className="w-4 h-4 text-emerald-600" />
              <span>{t('nav.environment', 'Live Environment & AQI')}</span>
            </Link>

            <Link
              href="/assistant"
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-teal-700 to-emerald-800 hover:from-teal-800 hover:to-emerald-900 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
            >
              <Mic className="w-4 h-4 text-emerald-300" />
              <span>{t('nav.assistant', 'Voice Assistant Studio')}</span>
            </Link>
          </div>

          {/* 4 Feature Highlights Grid */}
          <div className="pt-12 grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto text-left">
            
            <Link href="/map" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-300 transition-all group">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
                <Navigation className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700">Turn-by-Turn GPS</h4>
              <p className="text-xs text-slate-500 mt-1">Driving and walking routes via OSRM street engine with live instructions.</p>
            </Link>

            <Link href="/environment" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-300 transition-all group">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                <CloudSun className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700">Live Indian AQI</h4>
              <p className="text-xs text-slate-500 mt-1">CPCB breakpoints for PM2.5 & PM10 with 72-hour pollution history.</p>
            </Link>

            <Link href="/explore" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-300 transition-all group">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center mb-3">
                <Compass className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700">Nearby Discovery</h4>
              <p className="text-xs text-slate-500 mt-1">Find parks within 1–5 km radius with side-by-side area comparisons.</p>
            </Link>

            <Link href="/assistant" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-300 transition-all group">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center mb-3">
                <Mic className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700">Voice AI in 3 Languages</h4>
              <p className="text-xs text-slate-500 mt-1">Talk in Marathi, Hindi, or English to prepare verified civic reports.</p>
            </Link>

          </div>

        </div>
      </section>

      {/* DETAILED CIVIC SERVICES SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-200">
        <div className="text-center space-y-2 mb-12 max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold text-slate-900">Practical Civic Technology for Solapur</h2>
          <p className="text-sm text-slate-600">
            Engineered for ordinary citizens, municipal officers, and urban environmental planners.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Diwali & Festival Clean-Air Watch</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Track atmospheric inversion and emission spikes transparently. Compare festival levels against pre-festival baselines without fabricated metrics.
            </p>
            <Link href="/environment" className="inline-flex items-center gap-1 text-xs font-bold text-orange-700 pt-1">
              <span>View Festival Trends</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TreePine className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Green Space Health & Canopy</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Discover 20+ municipal gardens, sacred groves, and lakefront bioparks across all 5 SMC zones with verified canopy and tree counts.
            </p>
            <Link href="/explore" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 pt-1">
              <span>Explore Parks</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Civic Reporting & Maintenance</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Encountered a fallen branch, watering issue, or waste dump? Draft complaints via voice or form with GPS tagging and municipal tracking.
            </p>
            <Link href="/report" className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 pt-1">
              <span>Submit Issue Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ALL LOCALHOST LINKS LAUNCHPAD DIRECTORY */}
      <section className="bg-slate-900 text-white py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Single Launchpad
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
                GreenCity AI • Complete System Directory
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                Direct one-click access to every live application module, municipal tool, and API service.
              </p>
            </div>
            <div className="text-xs text-slate-400">
              Active Environment: <span className="font-mono text-emerald-400">http://localhost:3000</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Group 1: GIS, Navigation & Discovery */}
            <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 space-y-3">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                GIS & Spatial Intelligence
              </span>
              <div className="space-y-1.5 text-xs">
                <Link href="/map" className="block p-2 rounded-xl bg-slate-900/60 hover:bg-emerald-600 text-slate-200 hover:text-white transition-all font-semibold">
                  🗺️ /map • Live GIS Map & Navigation
                </Link>
                <Link href="/explore" className="block p-2 rounded-xl bg-slate-900/60 hover:bg-emerald-600 text-slate-200 hover:text-white transition-all font-semibold">
                  🧭 /explore • Nearby Places Discovery
                </Link>
                <Link href="/priority" className="block p-2 rounded-xl bg-slate-900/60 hover:bg-emerald-600 text-slate-200 hover:text-white transition-all font-semibold">
                  ⚡ /priority • Priority Action Center
                </Link>
              </div>
            </div>

            {/* Group 2: Environmental Telemetry & AI */}
            <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 space-y-3">
              <span className="text-[10px] uppercase font-bold text-teal-400 tracking-wider">
                Environment & Voice AI
              </span>
              <div className="space-y-1.5 text-xs">
                <Link href="/environment" className="block p-2 rounded-xl bg-slate-900/60 hover:bg-teal-600 text-slate-200 hover:text-white transition-all font-semibold">
                  🌤️ /environment • Live AQI & Trends
                </Link>
                <Link href="/assistant" className="block p-2 rounded-xl bg-slate-900/60 hover:bg-teal-600 text-slate-200 hover:text-white transition-all font-semibold">
                  🎙️ /assistant • Voice AI Studio (3 Langs)
                </Link>
                <Link href="/insights" className="block p-2 rounded-xl bg-slate-900/60 hover:bg-teal-600 text-slate-200 hover:text-white transition-all font-semibold">
                  💡 /insights • AI Ecological Insights
                </Link>
              </div>
            </div>

            {/* Group 3: Citizen Reporting & Maintenance */}
            <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 space-y-3">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                Citizen Reporting & Actions
              </span>
              <div className="space-y-1.5 text-xs">
                <Link href="/report" className="block p-2 rounded-xl bg-slate-900/60 hover:bg-amber-600 text-slate-200 hover:text-white transition-all font-semibold">
                  📝 /report • File Civic Complaint
                </Link>
                <Link href="/reports" className="block p-2 rounded-xl bg-slate-900/60 hover:bg-amber-600 text-slate-200 hover:text-white transition-all font-semibold">
                  📋 /reports • Citizen Reports Tracker
                </Link>
                <Link href="/municipal/maintenance" className="block p-2 rounded-xl bg-slate-900/60 hover:bg-amber-600 text-slate-200 hover:text-white transition-all font-semibold">
                  🛠️ /municipal/maintenance • Work Orders
                </Link>
              </div>
            </div>

            {/* Group 4: Municipal Operations & API */}
            <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 space-y-3">
              <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
                Municipal Ops & API
              </span>
              <div className="space-y-1.5 text-xs">
                <Link href="/municipal/dashboard" className="block p-2 rounded-xl bg-slate-900/60 hover:bg-blue-600 text-slate-200 hover:text-white transition-all font-semibold">
                  🏛️ /municipal/dashboard • SMC Command
                </Link>
                <Link href="/analytics" className="block p-2 rounded-xl bg-slate-900/60 hover:bg-blue-600 text-slate-200 hover:text-white transition-all font-semibold">
                  📊 /analytics • Ward Analytics
                </Link>
                <Link href="/sdg" className="block p-2 rounded-xl bg-slate-900/60 hover:bg-blue-600 text-slate-200 hover:text-white transition-all font-semibold">
                  🌍 /sdg • UN SDG 11.7 Benchmarks
                </Link>
                <a 
                  href="http://localhost:8000/docs" 
                  target="_blank" 
                  rel="noreferrer"
                  className="block p-2 rounded-xl bg-blue-950/60 hover:bg-blue-600 text-blue-300 hover:text-white transition-all font-semibold border border-blue-900/60"
                >
                  ⚡ http://localhost:8000/docs • Swagger API
                </a>
              </div>
            </div>

          </div>

        </div>
      </section>

    </div>
  );
}
