'use client';

import React from 'react';
import { 
  Globe2, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  HeartPulse, 
  TreePine, 
  Building2, 
  CloudSun 
} from 'lucide-react';
import Link from 'next/link';

export default function SDGImpactPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      
      {/* Header */}
      <div className="border-b border-slate-800 pb-8 space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
          <Globe2 className="w-4 h-4" />
          <span>United Nations Sustainable Development Goals</span>
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Sustainability & SDG Impact Alignment</h1>
        <p className="text-slate-400 text-sm leading-relaxed max-w-3xl">
          GreenCity AI operationalizes quantifiable urban indicators aligned with the UN 2030 Agenda for Sustainable Development. Transform global sustainability pledges into measurable municipal actions.
        </p>
      </div>

      {/* Quick Nav Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-wrap gap-2 text-xs">
        <a href="#sdg-11" className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors">SDG 11: Sustainable Cities</a>
        <a href="#sdg-13" className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors">SDG 13: Climate Action</a>
        <a href="#sdg-3" className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors">SDG 3: Good Health & Well-Being</a>
        <a href="#sdg-15" className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors">SDG 15: Life on Land</a>
      </div>

      <div className="space-y-8">
        
        {/* SDG 11 */}
        <div id="sdg-11" className="glass-panel p-8 rounded-3xl border border-slate-800 space-y-5 scroll-mt-24">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 font-extrabold text-2xl flex items-center justify-center border border-amber-500/40 shrink-0">
              11
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">SDG 11: Sustainable Cities and Communities</h2>
              <p className="text-xs text-brand-400 font-semibold mt-0.5">Target 11.7: Universal Access to Safe, Inclusive & Accessible Green Public Spaces</p>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            GreenCity AI calculates 300m, 500m, and 1000m pedestrian walking buffers around all mapped public parks. By highlighting underserved residential zones, city planners can prioritize new park construction and micro-parks where green accessibility falls below the WHO standard of 9m² per capita.
          </p>
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2 text-xs">
            <span className="font-bold text-white block uppercase tracking-wider text-[11px] text-amber-400">Platform Measurable Indicators:</span>
            <p className="text-slate-300 font-mono">• <strong>Green Space Accessibility Index:</strong> % of ward population within 300m walking buffer</p>
            <p className="text-slate-300 font-mono">• <strong>Urban Canopy Coverage:</strong> Current ward green coverage vs 25% National Urban Forestry goal</p>
            <p className="text-slate-300 font-mono">• <strong>Public Park Distribution Equity:</strong> Gini coefficient of green space distribution across municipal wards</p>
          </div>
        </div>

        {/* SDG 13 */}
        <div id="sdg-13" className="glass-panel p-8 rounded-3xl border border-slate-800 space-y-5 scroll-mt-24">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 font-extrabold text-2xl flex items-center justify-center border border-emerald-500/40 shrink-0">
              13
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">SDG 13: Climate Action</h2>
              <p className="text-xs text-emerald-400 font-semibold mt-0.5">Target 13.1: Strengthen Resilience and Adaptive Capacity to Climate Hazards</p>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Urban heat islands present severe health hazards during extreme summer heatwaves. GreenCity AI identifies low-canopy industrial corridors and calculates carbon sequestration potential to optimize urban canopy growth, stormwater absorption, and microclimate temperature moderation.
          </p>
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2 text-xs">
            <span className="font-bold text-white block uppercase tracking-wider text-[11px] text-emerald-400">Platform Measurable Indicators:</span>
            <p className="text-slate-300 font-mono">• <strong>Carbon Storage:</strong> Metric tons of CO₂ equivalent stored in woody biomass</p>
            <p className="text-slate-300 font-mono">• <strong>Annual Sequestration Rate:</strong> Net atmospheric CO₂ captured per year</p>
            <p className="text-slate-300 font-mono">• <strong>Urban Heat Island Risk Index:</strong> Surface temperature anomaly correlation with canopy deficit</p>
          </div>
        </div>

        {/* SDG 3 */}
        <div id="sdg-3" className="glass-panel p-8 rounded-3xl border border-slate-800 space-y-5 scroll-mt-24">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 font-extrabold text-2xl flex items-center justify-center border border-rose-500/40 shrink-0">
              3
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">SDG 3: Good Health and Well-Being</h2>
              <p className="text-xs text-rose-400 font-semibold mt-0.5">Target 3.9: Substantially Reduce Deaths and Illnesses from Hazardous Chemicals and Air Pollution</p>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Accessible urban green spaces filter particulate matter (PM2.5, PM10) from high-density traffic corridors and provide psychological restorative benefits, directly decreasing respiratory conditions and heat-related mortality.
          </p>
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2 text-xs">
            <span className="font-bold text-white block uppercase tracking-wider text-[11px] text-rose-400">Platform Measurable Indicators:</span>
            <p className="text-slate-300 font-mono">• <strong>Particulate Filtration Proxy:</strong> Estimated kg PM2.5/PM10 intercepted per hectare of canopy</p>
            <p className="text-slate-300 font-mono">• <strong>Mental Well-Being Exposure Factor:</strong> Proximity of schools and elderly care facilities to biophilic green zones</p>
          </div>
        </div>

        {/* SDG 15 */}
        <div id="sdg-15" className="glass-panel p-8 rounded-3xl border border-slate-800 space-y-5 scroll-mt-24">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-500/20 text-teal-400 font-extrabold text-2xl flex items-center justify-center border border-teal-500/40 shrink-0">
              15
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">SDG 15: Life on Land</h2>
              <p className="text-xs text-teal-400 font-semibold mt-0.5">Target 15.5: Halt the Loss of Biodiversity and Protect Native Habitats</p>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            GreenCity AI maps contiguous green ecological corridors across Solapur (Siddheshwar Lake, Sambhaji Lake/Kambar Talav, Smruti Van, Rupabhavani Grove) to protect avian corridors, native pollinator habitats, and heritage trees from fragmentation caused by rapid road expansions.
          </p>
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2 text-xs">
            <span className="font-bold text-white block uppercase tracking-wider text-[11px] text-teal-400">Platform Measurable Indicators:</span>
            <p className="text-slate-300 font-mono">• <strong>Shannon Biodiversity Proxy Index:</strong> Ecological species richness across parks</p>
            <p className="text-slate-300 font-mono">• <strong>Heritage Tree Registry:</strong> Spatial tracking of venerable native tree species</p>
            <p className="text-slate-300 font-mono">• <strong>Canopy Connectivity Corridors:</strong> Morphological spatial pattern analysis (MSPA) of green links</p>
          </div>
        </div>

      </div>

      <div className="flex justify-between items-center pt-6 border-t border-slate-800">
        <Link href="/methodology" className="text-xs text-brand-400 hover:underline flex items-center gap-1.5 font-bold">
          <span>Read Scientific Calculation Methodology</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <Link href="/map" className="px-5 py-2.5 rounded-xl bg-brand-500 text-slate-950 font-bold text-xs shadow-glow hover:bg-brand-600 transition-colors">
          Explore GIS Live Map
        </Link>
      </div>

    </div>
  );
}
