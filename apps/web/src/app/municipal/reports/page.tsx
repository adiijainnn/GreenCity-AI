'use client';

import React, { useEffect, useState } from 'react';
import { CitizenReport } from '@/lib/types';
import { api } from '@/lib/api';
import { AlertTriangle, CheckCircle2, UserCheck, MessageSquare, ShieldCheck } from 'lucide-react';

export default function MunicipalReportsManagementPage() {
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<CitizenReport | null>(null);
  const [status, setStatus] = useState<string>('');
  const [priority, setPriority] = useState<string>('');
  const [publicResponse, setPublicResponse] = useState<string>('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = () => {
    api.getReports().then((data) => {
      setReports(data);
      if (data.length > 0 && !selectedReport) {
        setSelectedReport(data[0]);
        setStatus(data[0].status);
        setPriority(data[0].priority);
        setPublicResponse(data[0].public_response || '');
      }
    });
  };

  const handleUpdate = async () => {
    if (!selectedReport) return;
    setUpdating(true);
    try {
      await api.updateReportStatus(selectedReport.id, {
        status,
        priority,
        public_response: publicResponse,
      });
      alert('Report status updated and audit logged.');
      loadReports();
    } catch (err: any) {
      alert(err?.message || 'Error updating report');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
          <AlertTriangle className="w-8 h-8 text-amber-400" />
          <span>Municipal Citizen Ticket Verification & Dispatch</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">Review public environmental complaints, update statuses, assign field officers, and issue public responses.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Reports Queue List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Report Queue ({reports.length})</h3>
          {reports.map((r) => (
            <div
              key={r.id}
              onClick={() => {
                setSelectedReport(r);
                setStatus(r.status);
                setPriority(r.priority);
                setPublicResponse(r.public_response || '');
              }}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                selectedReport?.id === r.id
                  ? 'bg-brand-500/10 border-brand-500/40 text-white shadow-glow'
                  : 'glass-panel border-slate-800 text-slate-300 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-mono font-bold text-brand-400">{r.report_number}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-200">{r.status}</span>
              </div>
              <h4 className="font-bold text-sm leading-snug">{r.title}</h4>
              <p className="text-xs text-slate-400 line-clamp-1 mt-1">{r.category}</p>
            </div>
          ))}
        </div>

        {/* Selected Report Inspection & Status Update Form */}
        {selectedReport ? (
          <div className="lg:col-span-2 glass-panel p-8 rounded-3xl border border-slate-800 space-y-6">
            
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-brand-400">{selectedReport.report_number}</span>
                <h2 className="text-xl font-bold text-white mt-0.5">{selectedReport.title}</h2>
              </div>
              <span className="px-3 py-1 rounded text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Priority: {selectedReport.priority}
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase">Issue Description</label>
              <p className="text-xs text-slate-200 bg-slate-900 p-4 rounded-xl border border-slate-800 leading-relaxed">
                {selectedReport.description}
              </p>
            </div>

            {/* Officer Action Form */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-brand-400" />
                <span>Officer Verification & Workflow Dispatch</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Update Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-100 rounded-xl p-3 focus:outline-none focus:border-brand-500"
                  >
                    <option value="Submitted">Submitted</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Update Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-100 rounded-xl p-3 focus:outline-none focus:border-brand-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Official Public Response to Citizen</label>
                <textarea
                  rows={3}
                  placeholder="Enter response visible to citizen on report timeline..."
                  value={publicResponse}
                  onChange={(e) => setPublicResponse(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-100 rounded-xl p-3 focus:outline-none focus:border-brand-500"
                />
              </div>

              <button
                onClick={handleUpdate}
                disabled={updating}
                className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold text-xs shadow-glow transition-all"
              >
                {updating ? 'Saving Changes...' : 'Save & Log Workflow Transition'}
              </button>

            </div>

          </div>
        ) : (
          <div className="lg:col-span-2 glass-panel p-8 rounded-3xl text-center text-slate-400">Select a report from the queue to review details.</div>
        )}

      </div>

    </div>
  );
}
