'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AlertTriangle, Wrench, Zap, MapPin, RefreshCw } from 'lucide-react';

// ── Priority helpers ───────────────────────────────────────────────────────────
const PRIO_ORDER: Record<string, number> = {
  Critical: 0, CRITICAL: 0,
  High: 1,     HIGH: 1,
  Medium: 2,   MEDIUM: 2,
  Low: 3,      LOW: 3,
};

const PRIO_STYLE: Record<string, { dot: string; text: string; badge: string; row: string }> = {
  Critical: { dot: 'bg-red-500',    text: 'text-red-600',    badge: 'bg-red-50 border-red-300 text-red-700',       row: 'border-l-4 border-l-red-400'    },
  CRITICAL: { dot: 'bg-red-500',    text: 'text-red-600',    badge: 'bg-red-50 border-red-300 text-red-700',       row: 'border-l-4 border-l-red-400'    },
  High:     { dot: 'bg-orange-400', text: 'text-orange-600', badge: 'bg-orange-50 border-orange-300 text-orange-700', row: 'border-l-4 border-l-orange-400' },
  HIGH:     { dot: 'bg-orange-400', text: 'text-orange-600', badge: 'bg-orange-50 border-orange-300 text-orange-700', row: 'border-l-4 border-l-orange-400' },
  Medium:   { dot: 'bg-yellow-400', text: 'text-yellow-600', badge: 'bg-yellow-50 border-yellow-300 text-yellow-700', row: 'border-l-4 border-l-yellow-400' },
  MEDIUM:   { dot: 'bg-yellow-400', text: 'text-yellow-600', badge: 'bg-yellow-50 border-yellow-300 text-yellow-700', row: 'border-l-4 border-l-yellow-400' },
  Low:      { dot: 'bg-sky-400',    text: 'text-sky-600',    badge: 'bg-sky-50 border-sky-300 text-sky-700',       row: 'border-l-4 border-l-sky-400'    },
  LOW:      { dot: 'bg-sky-400',    text: 'text-sky-600',    badge: 'bg-sky-50 border-sky-300 text-sky-700',       row: 'border-l-4 border-l-sky-400'    },
};

const ps = (p: string) =>
  PRIO_STYLE[p] ?? { dot: 'bg-slate-400', text: 'text-slate-500', badge: 'bg-slate-50 border-slate-300 text-slate-600', row: 'border-l-4 border-l-slate-300' };

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

interface PrioItem {
  id: string;
  title: string;
  subtitle: string;
  area: string;
  priority: string;
  status: string;
  type: 'task' | 'report' | 'insight';
}

export default function PriorityPage() {
  const [items, setItems] = useState<PrioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'Critical' | 'High' | 'Medium' | 'Low'>('All');

  const load = () => {
    setLoading(true);
    Promise.all([
      api.getMaintenanceTasks().catch(() => []),
      api.getReports().catch(() => []),
      api.getInsights().catch(() => []),
    ]).then(([tasks, reports, insights]) => {
      const combined: PrioItem[] = [
        ...tasks.map((t: any) => ({
          id: `task-${t.id}`,
          title: t.task_type,
          subtitle: t.description || '',
          area: 'Maintenance Task',
          priority: t.priority,
          status: t.status,
          type: 'task' as const,
        })),
        ...reports.map((r: any) => ({
          id: `rep-${r.id}`,
          title: r.title,
          subtitle: r.category,
          area: r.description ? r.description.slice(0, 80) : '',
          priority: r.priority,
          status: r.status,
          type: 'report' as const,
        })),
        ...insights.map((i: any) => ({
          id: `ins-${i.id}`,
          title: i.title,
          subtitle: i.affected_area || 'Solapur',
          area: i.description ? i.description.slice(0, 80) : '',
          priority: i.priority,
          status: `Confidence: ${Math.round((i.confidence || 0) * 100)}%`,
          type: 'insight' as const,
        })),
      ];
      combined.sort((a, b) => (PRIO_ORDER[a.priority] ?? 9) - (PRIO_ORDER[b.priority] ?? 9));
      setItems(combined);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === 'All' ? items : items.filter(i => i.priority.toUpperCase() === filter.toUpperCase());

  const counts = {
    All: items.length,
    Critical: items.filter(i => ['Critical','CRITICAL'].includes(i.priority)).length,
    High: items.filter(i => ['High','HIGH'].includes(i.priority)).length,
    Medium: items.filter(i => ['Medium','MEDIUM'].includes(i.priority)).length,
    Low: items.filter(i => ['Low','LOW'].includes(i.priority)).length,
  };

  const TypeIcon = ({ type }: { type: PrioItem['type'] }) => {
    if (type === 'task')    return <Wrench className="w-4 h-4" />;
    if (type === 'insight') return <Zap className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200 uppercase tracking-wider">
              Solapur SMC
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Priority Queue</h1>
          <p className="text-sm text-slate-500 mt-1">
            All active tasks, reports & AI alerts — sorted by urgency
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['All', 'Critical', 'High', 'Medium', 'Low'] as const).map(f => {
          const style = f === 'All'
            ? { active: 'bg-slate-900 text-white border-slate-900', dot: '' }
            : { active: `${ps(f).badge} border`, dot: ps(f).dot };
          const isActive = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                isActive
                  ? f === 'All' ? 'bg-slate-900 text-white border-slate-900' : `${ps(f).badge} border`
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {f !== 'All' && <span className={`w-2 h-2 rounded-full ${ps(f).dot}`} />}
              {f}
              <span className={`min-w-[18px] h-4 px-1 rounded-full text-[9px] font-extrabold flex items-center justify-center ${
                isActive ? 'bg-white/20 text-current' : 'bg-slate-100 text-slate-500'
              }`}>
                {counts[f]}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading && (
          <div className="py-16 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center text-sm text-slate-400 font-medium">
            No items in this category
          </div>
        )}

        {!loading && filtered.map((item, idx) => {
          const style = ps(item.priority);
          return (
            <div
              key={item.id}
              className={`flex items-start gap-4 px-5 py-4 ${style.row} hover:bg-slate-50 transition-colors ${idx !== 0 ? 'border-t border-slate-100' : ''}`}
            >
              {/* Rank */}
              <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold mt-0.5 ${
                idx === 0 && filter === 'All' ? 'bg-red-500 text-white' :
                idx === 1 && filter === 'All' ? 'bg-orange-400 text-white' :
                idx === 2 && filter === 'All' ? 'bg-yellow-400 text-slate-800' :
                'bg-slate-100 text-slate-600'
              }`}>
                {idx + 1}
              </div>

              {/* Type icon */}
              <div className={`shrink-0 p-2 rounded-xl border mt-0.5 ${style.badge}`}>
                <TypeIcon type={item.type} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border flex items-center gap-1 ${style.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                    {capitalize(item.priority)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                    {item.type === 'task' ? 'Maintenance' : item.type === 'insight' ? 'AI Alert' : 'Citizen Report'}
                  </span>
                  <span className="text-[10px] text-slate-400">·</span>
                  <span className="text-[10px] text-slate-500 font-medium">{item.status}</span>
                </div>

                <p className="text-sm font-bold text-slate-900 leading-snug">{item.title}</p>

                {item.subtitle && (
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                    {item.subtitle}
                  </p>
                )}

                {item.area && (
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{item.area}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
