'use client';

import React, { useEffect, useState } from 'react';
import { CitizenReport } from '@/lib/types';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Filter, 
  MapPin, 
  ArrowRight, 
  Lock,
  Eye
} from 'lucide-react';
import Link from 'next/link';

export default function ReportsTrackerPage() {
  const { activeRole } = useAppStore();
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeRole === 'ADMIN') {
      api.getReports()
        .then((data) => setReports(data))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [activeRole]);

  // Security & Role check: Only visible to ADMIN
  if (activeRole !== 'ADMIN') {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">Administrator Access Required</h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          The public report management queue is restricted to City Administrators and Municipal Officers. 
          If you would like to report a broken tree, garbage, or park issue, please use the Report Issue page.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link
            href="/report"
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors"
          >
            Report an Issue
          </Link>
          <Link
            href="/map"
            className="px-6 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 shadow-2xs transition-colors"
          >
            Explore Green Map
          </Link>
        </div>
      </div>
    );
  }

  const filteredReports = reports.filter((r) => {
    return statusFilter === 'ALL' || r.status === statusFilter;
  });

  const workflowSteps = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Closed'];

  const getStepIndex = (status: string) => {
    const idx = workflowSteps.indexOf(status);
    return idx >= 0 ? idx : 0;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Admin Queue</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-emerald-600" />
            <span>Citizen Issue Reports</span>
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Review and resolve environmental issues submitted by Solapur residents.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white border border-slate-200 p-1.5 rounded-xl shadow-2xs">
          <Filter className="w-4 h-4 text-slate-500 ml-2" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent text-xs text-slate-800 border-none focus:outline-none pr-3 font-semibold"
          >
            <option value="ALL">All Statuses</option>
            <option value="Submitted">Submitted</option>
            <option value="Under Review">Under Review</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 font-medium">Loading citizen reports...</div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl text-center space-y-3 border border-slate-200 shadow-sm">
          <ShieldCheck className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900">No Reports in this Filter</h3>
          <p className="text-xs text-slate-500">No issues match the selected status.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredReports.map((r) => {
            const currentStepIdx = getStepIndex(r.status);

            return (
              <div key={r.id} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                
                {/* Top Row: Ticket Number & Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-extrabold text-emerald-800 px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200">
                      {r.report_number}
                    </span>
                    <span className="text-xs font-bold text-slate-900 uppercase">{r.category}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`px-2.5 py-0.5 rounded font-bold ${
                      r.priority === 'Critical' ? 'bg-red-50 text-red-700 border border-red-200' :
                      r.priority === 'High' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                      r.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {r.priority} Priority
                    </span>
                    <span className="px-2.5 py-0.5 rounded font-semibold bg-slate-100 text-slate-700">
                      {r.status}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-2">
                    <h3 className="text-base font-bold text-slate-900">{r.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{r.description}</p>
                    <div className="pt-2 flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Coordinates: {r.latitude.toFixed(4)}° N, {r.longitude.toFixed(4)}° E</span>
                      </span>
                      <span>•</span>
                      <span>Reported: {new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {r.images && r.images.length > 0 && (
                    <div>
                      {/* Photo preview */}
                      <img 
                        src={typeof r.images[0] === 'string' ? r.images[0] : (r.images[0] as any)?.image_url} 
                        alt="Citizen Report Photo" 
                        className="w-full h-32 object-cover rounded-xl border border-slate-200"
                      />
                    </div>
                  )}
                </div>

                {/* 6-step Progress Bar */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    {workflowSteps.map((step, idx) => (
                      <span 
                        key={step} 
                        className={`text-[11px] font-semibold ${
                          idx <= currentStepIdx ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {step}
                      </span>
                    ))}
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${((currentStepIdx + 1) / workflowSteps.length) * 100}%` }}
                    />
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
