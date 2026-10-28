'use client';

import React, { useEffect, useState } from 'react';
import { AIRecommendation } from '@/lib/types';
import { api } from '@/lib/api';
import { Sparkles, RefreshCw, AlertTriangle, ShieldCheck, CheckCircle2, ChevronRight, TreePine } from 'lucide-react';
import Link from 'next/link';

export default function AIInsightsPage() {
  const [insights, setInsights] = useState<AIRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = () => {
    api.getInsights()
      .then((data) => setInsights(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await api.regenerateInsights();
      loadInsights();
    } catch (err: any) {
      alert(err?.message || 'Error updating recommendations');
    } finally {
      setRegenerating(false);
    }
  };

  const priorityColors: Record<string, string> = {
    CRITICAL: 'bg-red-50 text-red-700 border-red-200',
    Critical: 'bg-red-50 text-red-700 border-red-200',
    HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
    High: 'bg-orange-50 text-orange-700 border-orange-200',
    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
    Medium: 'bg-amber-50 text-amber-700 border-amber-200',
    LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Smart Recommendations
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-1">Smart City Greening Suggestions</h1>
          <p className="text-sm text-slate-600 mt-1">
            Data-backed suggestions on where Solapur needs more trees, park restorations, and shaded corridors.
          </p>
        </div>

        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
          <span>{regenerating ? 'Updating suggestions...' : 'Refresh Suggestions'}</span>
        </button>
      </div>

      {/* INSIGHTS CARDS LIST */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 font-medium">Calculating smart recommendations...</div>
      ) : insights.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl text-center space-y-3 border border-slate-200 shadow-sm">
          <Sparkles className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900">No Recommendations Found</h3>
          <p className="text-xs text-slate-500">Click "Refresh Suggestions" to compute new ideas.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {insights.map((rec) => (
            <div key={rec.id} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 hover:border-emerald-300 transition-all">
              
              {/* Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${priorityColors[rec.priority] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                    Priority: {rec.priority}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">Zone / Area: <strong className="text-slate-900">{rec.affected_area}</strong></span>
                </div>
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                  Confidence: {(rec.confidence * 100).toFixed(0)}%
                </span>
              </div>

              {/* Title & Description */}
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-900">{rec.title}</h2>
                <p className="text-xs text-slate-600 leading-relaxed">{rec.description}</p>
              </div>

              {/* Reason & Explanation */}
              {rec.reason && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                  <p className="text-xs font-bold text-slate-800">Why this is recommended:</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{rec.reason}</p>
                </div>
              )}

            </div>
          ))}
        </div>
      )}

    </div>
  );
}
