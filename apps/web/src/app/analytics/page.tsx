'use client';

import React, { useEffect, useState } from 'react';
import { Ward } from '@/lib/types';
import { api } from '@/lib/api';
import { BarChart3, ArrowRightLeft, ShieldCheck, MapPin, CheckCircle2, TreePine } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

export default function UrbanPlanningAnalyticsPage() {
  const [wards, setWards] = useState<Ward[]>([]);
  const [wardAId, setWardAId] = useState('');
  const [wardBId, setWardBId] = useState('');
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getWards().then((data) => {
      setWards(data);
      if (data.length >= 2) {
        setWardAId(data[0].id);
        setWardBId(data[1].id);
        fetchComparison(data[0].id, data[1].id);
      }
    }).finally(() => setLoading(false));
  }, []);

  const fetchComparison = (aId: string, bId: string) => {
    api.compareWards(aId, bId).then((res) => {
      setComparison(res);
    });
  };

  const handleCompare = () => {
    if (wardAId && wardBId) {
      fetchComparison(wardAId, wardBId);
    }
  };

  const compData = comparison ? [
    { metric: 'Current Greenery %', WardA: comparison.ward_a.green_coverage_pct, WardB: comparison.ward_b.green_coverage_pct },
    { metric: 'Target Greenery %', WardA: comparison.ward_a.target_coverage_pct, WardB: comparison.ward_b.target_coverage_pct },
    { metric: 'Park Health (out of 100)', WardA: comparison.ward_a.average_health_score, WardB: comparison.ward_b.average_health_score },
    { metric: 'Walking Access %', WardA: comparison.ward_a.accessibility_300m_pct, WardB: comparison.ward_b.accessibility_500m_pct },
  ] : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
            City Data & Comparison
          </span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 mt-1">Solapur Ward Greenery Comparison</h1>
        <p className="text-sm text-slate-600 mt-1">
          Compare two city zones side-by-side to see which area has more parks, healthier trees, and better walking access for residents.
        </p>
      </div>

      {/* COMPARISON CONTROLS */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
          <span>Select Any Two Zones to Compare</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">First Zone (A)</label>
            <select
              value={wardAId}
              onChange={(e) => setWardAId(e.target.value)}
              className="w-full bg-white border border-slate-300 text-xs text-slate-900 rounded-xl p-3 focus:outline-none focus:border-emerald-600"
            >
              {wards.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Second Zone (B)</label>
            <select
              value={wardBId}
              onChange={(e) => setWardBId(e.target.value)}
              className="w-full bg-white border border-slate-300 text-xs text-slate-900 rounded-xl p-3 focus:outline-none focus:border-emerald-600"
            >
              {wards.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCompare}
            className="py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
          >
            Compare Both Zones
          </button>
        </div>
      </div>

      {/* COMPARISON RESULTS */}
      {comparison && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Comparison Bar Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>Comparison Chart</span>
            </h3>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="metric" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', color: '#0f172a' }}
                  />
                  <Legend />
                  <Bar dataKey="WardA" name={comparison.ward_a.name.split('-')[1] || 'Zone A'} fill="#16a34a" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="WardB" name={comparison.ward_b.name.split('-')[1] || 'Zone B'} fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Key Findings Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TreePine className="w-4 h-4 text-emerald-600" />
              <span>Quick Summary</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <p className="font-semibold text-slate-500 uppercase text-[10px]">Zone A Greenery</p>
                <p className="text-lg font-extrabold text-emerald-700">{comparison.ward_a.green_coverage_pct}%</p>
                <p className="text-slate-600 text-[11px]">{comparison.ward_a.green_space_count} parks • {comparison.ward_a.population.toLocaleString()} residents</p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <p className="font-semibold text-slate-500 uppercase text-[10px]">Zone B Greenery</p>
                <p className="text-lg font-extrabold text-blue-700">{comparison.ward_b.green_coverage_pct}%</p>
                <p className="text-slate-600 text-[11px]">{comparison.ward_b.green_space_count} parks • {comparison.ward_b.population.toLocaleString()} residents</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
              <span className="font-bold text-emerald-900">What this means:</span>
              <p className="text-emerald-800 leading-relaxed text-[11px]">
                {comparison.ward_a.green_coverage_pct >= comparison.ward_b.green_coverage_pct
                  ? `${comparison.ward_a.name.split('-')[1] || 'Zone A'} currently has higher tree cover and better walking distance to parks.`
                  : `${comparison.ward_b.name.split('-')[1] || 'Zone B'} currently has more green areas and parks.`}
              </p>
            </div>
          </div>

        </div>
      )}

      {/* ALL WARDS OVERVIEW TABLE */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900">All Solapur Municipal Zones Overview</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase text-[10px] font-bold">
                <th className="py-3 px-4">Zone Name</th>
                <th className="py-3 px-4">Area (km²)</th>
                <th className="py-3 px-4">Population</th>
                <th className="py-3 px-4">Parks Count</th>
                <th className="py-3 px-4">Current Greenery</th>
                <th className="py-3 px-4">Target</th>
                <th className="py-3 px-4">Average Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {wards.map((w) => (
                <tr key={w.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">{w.name}</td>
                  <td className="py-3 px-4 text-slate-600">{w.area_km2}</td>
                  <td className="py-3 px-4 text-slate-600">{w.population.toLocaleString()}</td>
                  <td className="py-3 px-4 text-slate-600">{w.green_space_count}</td>
                  <td className="py-3 px-4 font-bold text-emerald-700">{w.current_green_coverage_pct}%</td>
                  <td className="py-3 px-4 text-slate-500">{w.target_green_coverage_pct}%</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px]">
                      {w.health_score}/100
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
