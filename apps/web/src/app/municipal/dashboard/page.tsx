'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { 
  Building2, 
  TreePine, 
  Leaf, 
  Activity, 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp, 
  BarChart2, 
  ArrowUpRight 
} from 'lucide-react';
import Link from 'next/link';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function MunicipalDashboardPage() {
  const [cityData, setCityData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCityAnalytics()
      .then((data) => setCityData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !cityData) {
    return <div className="max-w-7xl mx-auto p-12 text-center text-slate-400">Loading Municipal Command Center Analytics...</div>;
  }

  const { summary, ward_summaries } = cityData;

  const chartData = ward_summaries.map((w: any) => ({
    name: w.name.split('-')[1]?.trim() || w.name,
    coverage: w.green_coverage_pct,
    target: w.target_coverage_pct,
    health: w.average_health_score,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-wider">
              MUNICIPAL DIRECTORATE COMMAND CENTER
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-1">City Environmental Command Dashboard</h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/municipal/reports"
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Manage Citizen Reports</span>
          </Link>
          <Link
            href="/municipal/maintenance"
            className="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-slate-950 text-xs font-bold shadow-glow transition-all flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Maintenance Work Orders</span>
          </Link>
        </div>
      </div>

      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase">City Green Coverage</span>
          <p className="text-3xl font-extrabold text-brand-400">{summary.city_green_coverage_pct}%</p>
          <p className="text-[11px] text-slate-400">Total Area: {summary.total_city_area_km2} km²</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase">Green Spaces & Trees</span>
          <p className="text-3xl font-extrabold text-white">{summary.total_green_spaces} <span className="text-sm font-normal text-slate-400">Spaces</span></p>
          <p className="text-[11px] text-slate-400">Estimated Tree Inventory: {summary.total_estimated_trees.toLocaleString()}</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase">Carbon Stored</span>
          <p className="text-3xl font-extrabold text-emerald-400">{summary.total_carbon_stored_ton} <span className="text-sm font-normal text-slate-400">Tons</span></p>
          <p className="text-[11px] text-slate-400">IPCC CO2e Sequestration</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase">Citizen Tickets</span>
          <p className="text-3xl font-extrabold text-amber-400">{summary.open_reports_count} <span className="text-sm font-normal text-slate-400">Open</span></p>
          <p className="text-[11px] text-slate-400">Resolved: {summary.resolved_reports_count} Tickets</p>
        </div>
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Ward Green Coverage Comparison */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-brand-400" />
              <span>Green Coverage % by Ward vs Master Target</span>
            </h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} unit="%" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} />
                <Bar dataKey="coverage" fill="#22c55e" name="Current Coverage %" radius={[4, 4, 0, 0]} />
                <Bar dataKey="target" fill="#3b82f6" name="Master Target %" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Health Score Distribution */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-400" />
              <span>Average Green Health Index by Ward</span>
            </h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} />
                <Bar dataKey="health" fill="#14b8a6" name="Health Score (0-100)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* PRIORITY INTERVENTIONS RANKING TABLE */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-400" />
              <span>Priority Interventions Ranking Engine</span>
            </h3>
            <p className="text-xs text-slate-400">Ranked by calculated intervention urgency score (Deficit + Health + Complaint Density).</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3">Ward Name</th>
                <th className="p-3">Green Coverage</th>
                <th className="p-3">Target</th>
                <th className="p-3">Health Score</th>
                <th className="p-3">Open Reports</th>
                <th className="p-3">Priority Score</th>
                <th className="p-3">Intervention Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {ward_summaries.map((w: any) => (
                <tr key={w.ward_id} className="hover:bg-slate-900/50">
                  <td className="p-3 font-semibold text-white">{w.name}</td>
                  <td className="p-3 font-mono">{w.green_coverage_pct}%</td>
                  <td className="p-3 font-mono text-slate-400">{w.target_coverage_pct}%</td>
                  <td className="p-3 font-bold text-brand-400">{w.average_health_score} / 100</td>
                  <td className="p-3 font-mono">{w.open_reports_count} Tickets</td>
                  <td className="p-3 font-mono font-bold text-amber-400">{w.priority_score}</td>
                  <td className="p-3">
                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                      w.priority_level === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      w.priority_level === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                      'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {w.priority_level}
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
