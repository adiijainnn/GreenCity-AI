'use client';

import React from 'react';
import { 
  Navigation, 
  CornerUpRight, 
  CornerUpLeft, 
  ArrowUp, 
  RotateCcw, 
  X, 
  MapPin, 
  Clock, 
  Milestone,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export interface RouteStep {
  type: string;
  modifier: string;
  name: string;
  distance_meters: number;
  duration_seconds: number;
  instruction: string;
  location?: [number, number] | null;
}

interface NavigationPanelProps {
  isNavigating: boolean;
  activeStepIndex: number;
  steps: RouteStep[];
  totalDistanceKm: number;
  totalDurationMin: number;
  destinationName: string;
  travelMode: 'driving' | 'walking';
  onNextStep: () => void;
  onPrevStep: () => void;
  onRecalculate: () => void;
  onExitNavigation: () => void;
}

export const NavigationPanel: React.FC<NavigationPanelProps> = ({
  isNavigating,
  activeStepIndex,
  steps,
  totalDistanceKm,
  totalDurationMin,
  destinationName,
  travelMode,
  onNextStep,
  onPrevStep,
  onRecalculate,
  onExitNavigation,
}) => {
  const { t } = useTranslation();

  if (!isNavigating || steps.length === 0) return null;

  const currentStep = steps[activeStepIndex] || steps[0];
  const nextStep = steps[activeStepIndex + 1];

  const getManeuverIcon = (modifier: string, type: string) => {
    if (type === 'arrive') return <CheckCircle2 className="w-8 h-8 text-emerald-400" />;
    if (modifier.includes('right')) return <CornerUpRight className="w-8 h-8 text-white" />;
    if (modifier.includes('left')) return <CornerUpLeft className="w-8 h-8 text-white" />;
    return <ArrowUp className="w-8 h-8 text-white" />;
  };

  const progressPct = Math.min(100, Math.round(((activeStepIndex + 1) / steps.length) * 100));

  return (
    <div className="absolute top-4 left-4 right-4 sm:left-6 sm:right-auto sm:w-96 z-30 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-700/80 overflow-hidden">
        
        {/* Navigation Top Bar */}
        <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 shadow-inner">
              {getManeuverIcon(currentStep.modifier, currentStep.type)}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-black/30 text-white">
                  {t('map.nextTurn', 'Next Turn')}
                </span>
                <span className="text-xs text-emerald-100 font-medium">
                  {currentStep.distance_meters > 1000 
                    ? `${(currentStep.distance_meters / 1000).toFixed(1)} km` 
                    : `${Math.round(currentStep.distance_meters)} m`}
                </span>
              </div>
              <p className="text-sm font-bold text-white leading-snug line-clamp-1 mt-0.5">
                {currentStep.instruction}
              </p>
            </div>
          </div>

          <button
            onClick={onExitNavigation}
            title={t('map.stopNavigation', 'Exit Navigation')}
            className="p-2 rounded-xl bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-800 h-1">
          <div 
            className="bg-emerald-400 h-1 transition-all duration-300" 
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Live Step Guidance */}
        <div className="p-4 space-y-3">
          {nextStep && (
            <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
              <Milestone className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="truncate">
                <span className="text-slate-400">Then: </span>
                <span className="font-medium text-slate-200">{nextStep.instruction}</span>
              </div>
            </div>
          )}

          {/* Route Status Summary */}
          <div className="grid grid-cols-3 gap-2 py-2 border-t border-slate-800 text-center">
            <div>
              <p className="text-[10px] text-slate-400 font-medium">{t('common.distance', 'Distance')}</p>
              <p className="text-sm font-bold text-emerald-400">
                {totalDistanceKm < 1 ? `${Math.round(totalDistanceKm * 1000)} m` : `${totalDistanceKm.toFixed(1)} km`}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium">{t('common.duration', 'ETA')}</p>
              <p className="text-sm font-bold text-white">{totalDurationMin} min</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Step</p>
              <p className="text-sm font-bold text-slate-300">{activeStepIndex + 1} / {steps.length}</p>
            </div>
          </div>

          {/* Step Navigation Controls & Recalculate */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={onPrevStep}
              disabled={activeStepIndex === 0}
              className="flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={onNextStep}
              disabled={activeStepIndex >= steps.length - 1}
              className="flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
            >
              Next Turn
            </button>
            <button
              onClick={onRecalculate}
              title={t('map.recalculateRoute', 'Recalculate Route')}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
