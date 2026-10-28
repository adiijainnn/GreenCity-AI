'use client';

import React, { useEffect, useState } from 'react';
import { AuditLog, Dataset, User, Role } from '@/lib/types';
import { api } from '@/lib/api';
import { ShieldCheck, Users, Database, Activity, FileText, Upload, Plus } from 'lucide-react';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<'audit' | 'users' | 'datasets'>('audit');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Dataset import form state
  const [datasetName, setDatasetName] = useState('');
  const [datasetType, setDatasetType] = useState('GeoJSON');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = () => {
    Promise.all([
      api.getAuditLogs().catch(() => []),
      api.getUsers().catch(() => []),
      api.getDatasets().catch(() => []),
      api.getSystemHealth().catch(() => null),
    ]).then(([logData, userData, dsData, healthData]) => {
      setAuditLogs(logData);
      setUsers(userData);
      setDatasets(dsData);
      setHealth(healthData);
    }).finally(() => setLoading(false));
  };

  const handleRoleChange = async (userId: string, newRole: Role) => {
    try {
      await api.updateUserRole(userId, newRole);
      alert('User role updated successfully.');
      loadAdminData();
    } catch (err: any) {
      alert(err?.message || 'Error updating user role');
    }
  };

  const handleImportDataset = async (e: React.FormEvent) => {
    e.preventDefault();
    setImporting(true);
    try {
      await api.importDataset({
        name: datasetName,
        dataset_type: datasetType,
      });
      alert('Dataset imported successfully.');
      setDatasetName('');
      loadAdminData();
    } catch (err: any) {
      alert(err?.message || 'Error importing dataset');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
              City Administrator Console
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-1">Municipal Administration & Activity Logs</h1>
          <p className="text-sm text-slate-600 mt-1">Manage user permissions, monitor system records, and import city park datasets.</p>
        </div>

        {/* System Health Badge */}
        {health && (
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs shadow-2xs">
            <Activity className="w-4 h-4 text-emerald-600" />
            <span className="text-slate-500">System Status:</span>
            <span className="font-extrabold text-emerald-700">{health.status}</span>
            <span className="text-slate-400">({health.metrics?.total_users} Users)</span>
          </div>
        )}
      </div>

      {/* Admin Auth Notice if unauthenticated */}
      {!loading && users.length === 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold text-slate-900">Administrator Login Required</p>
              <p className="text-slate-600 mt-0.5">Live audit logs, role changes, and dataset imports require administrator credentials.</p>
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                const res = await api.login({ email: 'admin@greencity.ai', password: 'Admin@123456' });
                localStorage.setItem('greencity_token', res.access_token);
                loadAdminData();
              } catch (err: any) {
                alert(err?.message || 'Login failed');
              }
            }}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 transition-colors shadow-sm"
          >
            ⚡ Connect as Rajesh Kumar (Admin)
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'audit' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Activity Logs ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'users' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Accounts ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('datasets')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'datasets' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Park Datasets ({datasets.length})</span>
        </button>
      </div>

      {/* TAB CONTENT: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900">Recent System Activity Records</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Item</th>
                  <th className="p-3">Item ID</th>
                  <th className="p-3">IP</th>
                  <th className="p-3">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-900">{log.actor_email}</td>
                    <td className="p-3">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-600">{log.resource}</td>
                    <td className="p-3 font-mono text-slate-500">{log.resource_id ? log.resource_id.slice(0, 8) : 'N/A'}</td>
                    <td className="p-3 font-mono text-slate-500">{log.ip_address}</td>
                    <td className="p-3 text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900">User Accounts & Roles (Admin & Citizen)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Update Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-900">{u.full_name}</td>
                    <td className="p-3 font-mono">{u.email}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        u.role === 'ADMIN' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        {u.role === 'ADMIN' ? 'Admin' : 'Citizen'}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-emerald-700">ACTIVE</td>
                    <td className="p-3">
                      <select
                        value={u.role === 'ADMIN' ? 'ADMIN' : 'CITIZEN'}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                        className="bg-white border border-slate-300 text-xs text-slate-800 rounded px-2.5 py-1 focus:outline-none"
                      >
                        <option value="CITIZEN">Citizen</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: DATASET MANAGEMENT */}
      {activeTab === 'datasets' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Import Form */}
          <form onSubmit={handleImportDataset} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 h-fit">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>Import Park Dataset</span>
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Dataset Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Solapur Parks Survey 2026"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                className="w-full bg-white border border-slate-300 text-xs text-slate-900 rounded-xl p-2.5 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Format</label>
              <select
                value={datasetType}
                onChange={(e) => setDatasetType(e.target.value)}
                className="w-full bg-white border border-slate-300 text-xs text-slate-900 rounded-xl p-2.5 focus:outline-none"
              >
                <option value="GeoJSON">GeoJSON</option>
                <option value="Shapefile">ESRI Shapefile</option>
                <option value="CSV">CSV Coordinates</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={importing}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
            >
              {importing ? 'Importing...' : 'Upload & Import Dataset'}
            </button>
          </form>

          {/* Existing Datasets Table */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">Loaded City Datasets</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">Name</th>
                    <th className="p-3">Format</th>
                    <th className="p-3">Records</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {datasets.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-900">{d.name}</td>
                      <td className="p-3 font-mono">{d.dataset_type}</td>
                      <td className="p-3">{d.record_count} features</td>
                      <td className="p-3 font-bold text-emerald-700">{d.processing_status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
