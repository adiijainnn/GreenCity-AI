'use client';

import React, { useEffect, useState } from 'react';
import { MaintenanceTask, GreenSpace } from '@/lib/types';
import { api } from '@/lib/api';
import { ShieldCheck, Plus, Clock, CheckCircle2, AlertTriangle, Calendar } from 'lucide-react';

export default function MunicipalMaintenancePage() {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [greenSpaces, setGreenSpaces] = useState<GreenSpace[]>([]);
  const [loading, setLoading] = useState(true);

  // New task form state
  const [taskType, setTaskType] = useState('Irrigation & Sapling Care');
  const [description, setDescription] = useState('');
  const [greenSpaceId, setGreenSpaceId] = useState('');
  const [priority, setPriority] = useState('High');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    Promise.all([
      api.getMaintenanceTasks(),
      api.getGreenSpaces(),
    ]).then(([taskData, gsData]) => {
      setTasks(taskData);
      setGreenSpaces(gsData);
      if (gsData.length > 0 && !greenSpaceId) setGreenSpaceId(gsData[0].id);
    }).finally(() => setLoading(false));
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.createMaintenanceTask({
        task_type: taskType,
        description,
        green_space_id: greenSpaceId,
        priority,
      });
      alert('Maintenance work order created.');
      setDescription('');
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Error creating task');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await api.updateMaintenanceTask(taskId, { status: newStatus });
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Error updating task status');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
          <ShieldCheck className="w-8 h-8 text-brand-400" />
          <span>Municipal Maintenance & Field Operations</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">Schedule pruning, irrigation repair, tree sapling care, and debris clearance work orders across parks.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Create Work Order Form */}
        <form onSubmit={handleCreateTask} className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 h-fit">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-brand-400" />
            <span>Create Work Order</span>
          </h3>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Target Green Space</label>
            <select
              value={greenSpaceId}
              onChange={(e) => setGreenSpaceId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-xs text-white rounded-xl p-3 focus:outline-none"
            >
              {greenSpaces.map((gs) => (
                <option key={gs.id} value={gs.id}>{gs.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Task Type</label>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-xs text-white rounded-xl p-3 focus:outline-none"
            >
              <option value="Irrigation & Sapling Care">Irrigation & Sapling Care</option>
              <option value="Tree Pruning & Deadwood Removal">Tree Pruning & Deadwood Removal</option>
              <option value="Debris & Litter Removal">Debris & Litter Removal</option>
              <option value="Fencing & Infrastructure Repair">Fencing & Infrastructure Repair</option>
              <option value="Tree Planting Drive">Tree Planting Drive</option>
              <option value="Pest & Disease Control">Pest & Disease Control</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Task Description</label>
            <textarea
              required
              rows={3}
              placeholder="Instructions for horticulture field team..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-xs text-white rounded-xl p-3 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={creating}
            className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold text-xs shadow-glow transition-all"
          >
            {creating ? 'Creating Task...' : 'Dispatch Maintenance Task'}
          </button>
        </form>

        {/* Maintenance Tasks List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Scheduled Work Orders ({tasks.length})</h3>
          {tasks.map((t) => (
            <div key={t.id} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white text-sm">{t.task_type}</span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300">{t.priority}</span>
                  <select
                    value={t.status}
                    onChange={(e) => handleStatusChange(t.id, e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-xs text-brand-400 rounded px-2 py-1 focus:outline-none"
                  >
                    <option value="Planned">Planned</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-slate-300">{t.description}</p>
              <div className="text-[11px] text-slate-400 flex items-center gap-4 pt-2 border-t border-slate-800">
                <span>Task ID: {t.id.slice(0, 8)}</span>
                <span>Scheduled: {new Date(t.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
}
