'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { 
  Sun, 
  Sunset, 
  Sunrise, 
  Wind, 
  Droplets, 
  Thermometer, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Calendar, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  Footprints, 
  Users, 
  HeartPulse, 
  Flame, 
  RefreshCw, 
  TreePine, 
  MapPin, 
  ChevronRight,
  TrendingUp,
  AlertOctagon,
  Eye
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from 'recharts';

interface ParkVisitDashboardProps {
  initialParkId?: string;
  onNavigateToMap?: (lat: number, lng: number, name: string) => void;
}

export const BestTimeToVisitDashboard: React.FC<ParkVisitDashboardProps> = ({
  initialParkId,
  onNavigateToMap
}) => {
  const { t } = useTranslation();

  // Date strings formatted for Solapur
  const getOffsetDateStr = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().split('T')[0];
  };

  const todayStr = getOffsetDateStr(0);
  const tomorrowStr = getOffsetDateStr(1);
  const dayAfterStr = getOffsetDateStr(2);
  const minDateStr = getOffsetDateStr(-7);
  const maxDateStr = getOffsetDateStr(14);

  const [parks, setParks] = useState<any[]>([]);
  const [selectedParkId, setSelectedParkId] = useState<string>(initialParkId || '');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Data states
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selected hour for detail view
  const [selectedHour, setSelectedHour] = useState<any | null>(null);

  // 1. Load list of green spaces for the selector
  useEffect(() => {
    api.getGreenSpaces()
      .then((data) => {
        if (data && data.length > 0) {
          setParks(data);
          if (!selectedParkId) {
            setSelectedParkId(data[0].id);
          }
        }
      })
      .catch(() => {
        // Fallback default list if DB request is pending
        const defaults = [
          { id: 'ccad8dd5-3c12-47cc-9d87-100a63c8c234', name: 'Siddheshwar Temple Lake & Sacred Promenade', category: 'Wetland' },
          { id: '2b354745-135d-4882-801c-27f2439cc4af', name: 'Sambhaji Lake (Kambar Talav) Bio-Park', category: 'Wetland' },
          { id: 'deb5a90b-669d-40a8-8507-7d587dfb841c', name: 'Mahatma Gandhi National Zoo & Botanical Garden', category: 'Urban Forest' },
          { id: 'cca5a6c4-5983-45c6-8c7f-1d82f94eaa04', name: 'Indra Bhavan SMC Headquarters Heritage Garden', category: 'Institutional Green Space' },
          { id: 'f4b51ec7-fe46-4708-aafd-29cd3a52f70b', name: 'Hutatma Smruti Mandir Memorial Garden', category: 'Park' }
        ];
        setParks(defaults);
        if (!selectedParkId) {
          setSelectedParkId(defaults[0].id);
        }
      });
  }, []);

  // 2. Fetch park visit times whenever park or date changes
  const fetchVisitTimes = (parkId: string, dateStr: string, forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorMsg(null);

    api.getParkVisitTimes({
      park_id: parkId || undefined,
      date: dateStr,
      force_refresh: forceRefresh
    })
      .then((res) => {
        setDashboardData(res);
        if (res.hourly_forecast && res.hourly_forecast.length > 0) {
          setSelectedHour(res.hourly_forecast[0]);
        }
      })
      .catch((err) => {
        setErrorMsg(err.message || t('bestTime.noData', 'Unable to load forecast data. Please try again.'));
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    if (selectedParkId && selectedDate) {
      fetchVisitTimes(selectedParkId, selectedDate);
    }
  }, [selectedParkId, selectedDate]);

  // Visual helper for suitability badge
  const getSuitabilityBadge = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'excellent':
        return 'bg-emerald-500/15 text-emerald-700 border-emerald-300';
      case 'good':
        return 'bg-lime-500/15 text-lime-700 border-lime-300';
      case 'moderate':
        return 'bg-amber-500/15 text-amber-700 border-amber-300';
      case 'poor':
        return 'bg-orange-500/15 text-orange-700 border-orange-300';
      default:
        return 'bg-rose-500/15 text-rose-700 border-rose-300';
    }
  };

  return (
    <div className="space-y-6">

      {/* ------------------------------------------------------------- */}
      {/* 1. Header Toolbar & Park Selector */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Sparkles className="w-4 h-4" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {t('bestTime.title', 'Best Time to Visit a Park')}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {t('bestTime.subtitle', 'Hour-by-hour thermal comfort, CPCB NAQI air quality, and optimal outdoor activity windows for Solapur parks')}
            </p>
          </div>

          {/* Refresh Action */}
          <button
            onClick={() => fetchVisitTimes(selectedParkId, selectedDate, true)}
            disabled={refreshing || loading}
            className="self-start md:self-auto flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-all shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{refreshing ? t('common.loading', 'Loading...') : t('bestTime.refresh', 'Refresh Forecast')}</span>
          </button>
        </div>

        {/* Park & Date Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          
          {/* Park Dropdown */}
          <div className="md:col-span-2 space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <TreePine className="w-3.5 h-3.5 text-emerald-600" />
              {t('bestTime.selectPark', 'Select a Park or Garden')}
            </label>
            <select
              value={selectedParkId}
              onChange={(e) => setSelectedParkId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
            >
              {parks.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.category ? `(${p.category})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Date Selector with Quick Horizon Chips + Custom Date Picker */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                Select Date
              </label>
              {selectedDate && (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short'
                  })}
                </span>
              )}
            </div>

            {/* Quick Horizon Buttons */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className={`py-1 text-xs font-bold rounded-lg transition-all ${
                  selectedDate === todayStr
                    ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('bestTime.dateToday', 'Today')}
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(tomorrowStr)}
                className={`py-1 text-xs font-bold rounded-lg transition-all ${
                  selectedDate === tomorrowStr
                    ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('bestTime.dateTomorrow', 'Tomorrow')}
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(dayAfterStr)}
                className={`py-1 text-xs font-bold rounded-lg transition-all ${
                  selectedDate === dayAfterStr
                    ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('bestTime.dateDayAfter', 'Day After')}
              </button>
            </div>

            {/* Custom Date Input for Any User-Chosen Date */}
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={selectedDate}
                min={minDateStr}
                max={maxDateStr}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value);
                  }
                }}
                className="w-full bg-slate-50 hover:bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer shadow-2xs"
                title="Choose any specific date"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Loading Skeleton & Error State */}
      {/* ------------------------------------------------------------- */}
      {loading && !refreshing && (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center space-y-4 animate-pulse">
          <div className="w-12 h-12 rounded-full bg-emerald-100 mx-auto flex items-center justify-center text-emerald-600">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              {t('common.loading', 'Analyzing atmospheric conditions & air quality...')}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Calculating thermal comfort, CPCB NAQI index, and solar radiation windows for Solapur.
            </p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 p-6 rounded-2xl border border-red-200 flex items-start gap-3 text-red-800">
          <AlertTriangle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-bold">Failed to load visit time forecast</p>
            <p className="text-xs text-red-700">{errorMsg}</p>
            <button
              onClick={() => fetchVisitTimes(selectedParkId, selectedDate, true)}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
            >
              {t('common.retry', 'Retry')}
            </button>
          </div>
        </div>
      )}

      {dashboardData && !loading && (
        <>
          {/* ------------------------------------------------------------- */}
          {/* 2. Primary Highlight: Best Time Recommendation Card */}
          {/* ------------------------------------------------------------- */}
          <div className="bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden space-y-6">
            
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-white/10 pb-6">
              
              {/* Highlight Window Banner */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {t('bestTime.bestTimeRecommendation', 'Recommended Visit Window')}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider border ${
                    dashboardData.best_time_recommendation?.category === 'Excellent'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                      : 'bg-lime-500/20 text-lime-300 border-lime-400/40'
                  }`}>
                    {dashboardData.best_time_recommendation?.category} Conditions
                  </span>
                  <span className="text-xs text-slate-400">
                    {dashboardData.target_date} (Solapur)
                  </span>
                </div>

                <div className="flex items-baseline gap-3">
                  <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                    {dashboardData.best_time_recommendation?.window_label}
                  </h1>
                </div>

                <p className="text-sm text-emerald-100/90 max-w-2xl leading-relaxed">
                  {dashboardData.best_time_recommendation?.explanation}
                </p>
              </div>

              {/* Suitability Score Metric Circle */}
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 flex items-center gap-4 shrink-0 shadow-inner">
                <div className="text-center">
                  <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                    Suitability Score
                  </p>
                  <div className="flex items-baseline justify-center gap-1 mt-0.5">
                    <span className="text-3xl sm:text-4xl font-black text-emerald-400">
                      {dashboardData.best_time_recommendation?.average_score}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">/ 100</span>
                  </div>
                </div>
                <div className="w-px h-10 bg-white/20" />
                <div className="text-xs space-y-1">
                  <p className="text-slate-300">
                    Avg Temp: <strong className="text-white">{dashboardData.best_time_recommendation?.average_temperature_c}°C</strong>
                  </p>
                  <p className="text-slate-300">
                    Avg AQI: <strong className="text-white">{dashboardData.best_time_recommendation?.average_aqi}</strong> (CPCB)
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Insights Row: Morning vs Evening, Avoid Window, Activities */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Morning vs Evening */}
              <div className="bg-white/5 backdrop-blur-xs p-4 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    {t('bestTime.morningVsEvening', 'Morning vs Evening')}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/10 text-white">
                    {dashboardData.morning_vs_evening?.winner === 'morning' ? 'Morning is Better' : (dashboardData.morning_vs_evening?.winner === 'evening' ? 'Evening is Better' : 'Both Suitable')}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {dashboardData.morning_vs_evening?.explanation}
                </p>
                <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400 border-t border-white/10">
                  <span>Morning Score: <strong className="text-white">{dashboardData.morning_vs_evening?.morning_score}/100</strong></span>
                  <span>Evening Score: <strong className="text-white">{dashboardData.morning_vs_evening?.evening_score}/100</strong></span>
                </div>
              </div>

              {/* Recommended Activities */}
              <div className="bg-white/5 backdrop-blur-xs p-4 rounded-2xl border border-white/10 space-y-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  Suggested Activities
                </span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {dashboardData.best_time_recommendation?.suggested_activities?.map((act: string) => (
                    <span
                      key={act}
                      className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-500/30"
                    >
                      {act}
                    </span>
                  ))}
                </div>
              </div>

              {/* Avoid Window / Limiting Factor */}
              <div className="bg-amber-950/40 backdrop-blur-xs p-4 rounded-2xl border border-amber-500/30 space-y-2 text-amber-100">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  {t('bestTime.avoidWindow', 'Hours to Avoid')}
                </div>
                {dashboardData.avoid_window ? (
                  <>
                    <p className="text-sm font-extrabold text-white">
                      {dashboardData.avoid_window.window_label}
                    </p>
                    <p className="text-xs text-amber-200/90 leading-snug">
                      {dashboardData.avoid_window.reason}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-emerald-200">
                    No severe midday heat or pollution warnings for this day.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 3. Current Live Conditions & Astronomy Card */}
          {/* ------------------------------------------------------------- */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Live Temp & Comfort */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Thermometer className="w-4 h-4 text-rose-500" />
                  {t('bestTime.temperature', 'Temperature')}
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                  {dashboardData.current_conditions?.condition_text}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">
                  {dashboardData.current_conditions?.temperature_c}°C
                </span>
                <span className="text-xs text-slate-500">
                  {t('bestTime.feelsLike', 'Feels like')} {dashboardData.current_conditions?.apparent_temperature_c}°C
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 border-t border-slate-100 pt-2">
                <span className="flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-blue-500" />
                  {dashboardData.current_conditions?.humidity_pct}%
                </span>
                <span className="flex items-center gap-1">
                  <Wind className="w-3.5 h-3.5 text-teal-600" />
                  {dashboardData.current_conditions?.wind_speed_kmh} km/h
                </span>
              </div>
            </div>

            {/* Current Indian AQI */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-500" />
                  CPCB NAQI (India)
                </span>
                <span 
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ 
                    backgroundColor: `${dashboardData.current_conditions?.aqi_color}20`,
                    color: dashboardData.current_conditions?.aqi_color
                  }}
                >
                  {dashboardData.current_conditions?.aqi_category}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span 
                  className="text-3xl font-black"
                  style={{ color: dashboardData.current_conditions?.aqi_color }}
                >
                  {dashboardData.current_conditions?.indian_aqi}
                </span>
                <span className="text-xs text-slate-500">
                  PM2.5: <strong>{dashboardData.current_conditions?.pm2_5}</strong> µg/m³
                </span>
              </div>
              <p className="text-[11px] text-slate-600 line-clamp-1 border-t border-slate-100 pt-2">
                {dashboardData.current_conditions?.aqi_health_advisory}
              </p>
            </div>

            {/* Astronomy: Sunrise & Sunset */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sunrise className="w-4 h-4 text-amber-500" />
                Solapur Sun Cycle
              </span>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/60">
                  <p className="text-[10px] text-amber-700 font-bold uppercase">Sunrise</p>
                  <p className="text-sm font-black text-slate-900 mt-0.5">{dashboardData.astronomy?.sunrise}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-orange-50/60 border border-orange-200/60">
                  <p className="text-[10px] text-orange-700 font-bold uppercase">Sunset</p>
                  <p className="text-sm font-black text-slate-900 mt-0.5">{dashboardData.astronomy?.sunset}</p>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 border-t border-slate-100 pt-1.5">
                Golden hour photography: 30 min before sunset.
              </p>
            </div>

            {/* Selected Park Metadata */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <TreePine className="w-4 h-4 text-emerald-600" />
                  Park Canopy
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {dashboardData.park?.category}
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 truncate">
                  {dashboardData.park?.name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Canopy Coverage: <strong className="text-slate-800">{dashboardData.park?.canopy_percentage}%</strong>
                </p>
              </div>
              {onNavigateToMap && (
                <button
                  onClick={() => onNavigateToMap(
                    dashboardData.park?.latitude,
                    dashboardData.park?.longitude,
                    dashboardData.park?.name
                  )}
                  className="w-full py-1.5 px-3 rounded-lg text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center justify-center gap-1"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  View on Live Map
                </button>
              )}
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 4. Hourly Forecast Chart (Recharts) */}
          {/* ------------------------------------------------------------- */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  {t('bestTime.hourlyForecast', '24-Hour Suitability & Environmental Forecast')}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Compares thermal comfort, temperature (°C), and CPCB air quality throughout the day.
                </p>
              </div>

              {/* Chart Legend indicators */}
              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" /> Suitability (0–100)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-amber-500" /> Temperature (°C)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-rose-500" /> AQI
                </span>
              </div>
            </div>

            {/* Recharts Area / Line Chart */}
            <div className="w-full h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={dashboardData.hourly_forecast}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  onClick={(e) => {
                    if (e && e.activePayload && e.activePayload.length > 0) {
                      setSelectedHour(e.activePayload[0].payload);
                    }
                  }}
                >
                  <defs>
                    <linearGradient id="suitabilityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="formatted_time" 
                    tick={{ fontSize: 10, fill: '#64748b' }} 
                    interval={2}
                  />
                  <YAxis 
                    yAxisId="left" 
                    domain={[0, 100]} 
                    tick={{ fontSize: 10, fill: '#64748b' }} 
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    domain={[0, 'auto']} 
                    tick={{ fontSize: 10, fill: '#64748b' }} 
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const h = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs space-y-1.5 z-50">
                            <div className="flex items-center justify-between gap-4 font-bold border-b border-slate-800 pb-1">
                              <span>{h.formatted_time}</span>
                              <span 
                                className="px-1.5 py-0.5 rounded text-[10px]"
                                style={{ backgroundColor: h.suitability_color, color: '#fff' }}
                              >
                                {h.suitability_category} ({h.suitability_score}/100)
                              </span>
                            </div>
                            <div className="space-y-0.5 text-slate-300">
                              <p>Condition: <strong className="text-white">{h.condition_text}</strong></p>
                              <p>Temperature: <strong className="text-white">{h.temperature_c}°C</strong> (Feels like {h.apparent_temperature_c}°C)</p>
                              <p>Air Quality: <strong className="text-white">AQI {h.indian_aqi}</strong> ({h.aqi_category})</p>
                              <p>Humidity: <strong className="text-white">{h.humidity_pct}%</strong> • Wind: <strong className="text-white">{h.wind_speed_kmh} km/h</strong></p>
                            </div>
                            {h.limiting_factors && h.limiting_factors.length > 0 && (
                              <p className="text-[10px] text-amber-300 border-t border-slate-800 pt-1">
                                Limiting: {h.limiting_factors.join(', ')}
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="suitability_score"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#suitabilityGrad)"
                    name="Suitability Score"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="temperature_c"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    name="Temperature (°C)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="indian_aqi"
                    stroke="#ef4444"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    name="CPCB AQI"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Horizontal Hourly Strip Scroller */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Click hour to inspect details & activities
              </span>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {dashboardData.hourly_forecast?.map((hour: any) => {
                  const isSelected = selectedHour?.time === hour.time;
                  return (
                    <button
                      key={hour.time}
                      onClick={() => setSelectedHour(hour)}
                      className={`shrink-0 p-3 rounded-2xl border text-center transition-all ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-500/20'
                          : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100'
                      }`}
                      style={{ minWidth: '92px' }}
                    >
                      <p className="text-[11px] font-bold text-slate-600">{hour.formatted_time}</p>
                      <p className="text-sm font-black text-slate-900 mt-1">{hour.temperature_c}°C</p>
                      
                      {/* Suitability score badge */}
                      <span 
                        className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-extrabold mt-1.5"
                        style={{ backgroundColor: `${hour.suitability_color}25`, color: hour.suitability_color }}
                      >
                        {hour.suitability_score}
                      </span>

                      {/* AQI pill */}
                      <p className="text-[9px] text-slate-500 mt-1 font-medium">
                        AQI {hour.indian_aqi}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Hour Details Box */}
            {selectedHour && (
              <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-black bg-emerald-500 text-slate-950">
                      {selectedHour.formatted_time}
                    </span>
                    <span className="text-sm font-bold text-white">
                      {selectedHour.condition_text}
                    </span>
                  </div>

                  <span 
                    className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                    style={{ backgroundColor: selectedHour.suitability_color, color: '#fff' }}
                  >
                    {selectedHour.suitability_category} ({selectedHour.suitability_score}/100)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">Temp</span>
                    <p className="font-bold text-white">{selectedHour.temperature_c}°C</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Feels Like</span>
                    <p className="font-bold text-white">{selectedHour.apparent_temperature_c}°C</p>
                  </div>
                  <div>
                    <span className="text-slate-400">CPCB AQI</span>
                    <p className="font-bold" style={{ color: selectedHour.aqi_color }}>
                      {selectedHour.indian_aqi} ({selectedHour.aqi_category})
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Rain Prob</span>
                    <p className="font-bold text-white">{selectedHour.precip_prob_pct}%</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Wind</span>
                    <p className="font-bold text-white">{selectedHour.wind_speed_kmh} km/h</p>
                  </div>
                </div>

                {/* Limiting factor alert if present */}
                {selectedHour.limiting_factors && selectedHour.limiting_factors.length > 0 && (
                  <div className="bg-amber-950/60 border border-amber-500/40 p-2.5 rounded-xl text-amber-200 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>Factors affecting score: {selectedHour.limiting_factors.join(' • ')}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 5. Activity-Specific Suitability Section */}
          {/* ------------------------------------------------------------- */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                {t('bestTime.activitySuitability', 'Activity-Specific Suitability')}
              </h3>
              <p className="text-xs text-slate-500">
                Transparent health thresholds calibrated for Solapur climate and Indian CPCB air standards.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Walking */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                      <Footprints className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-bold text-slate-900">{t('bestTime.walking', 'Walking')}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                    {dashboardData.activity_suitability?.walking?.suitability_level}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Optimal Window:</p>
                  <p className="text-sm font-extrabold text-slate-900">{dashboardData.activity_suitability?.walking?.recommended_window}</p>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${dashboardData.activity_suitability?.walking?.score || 80}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  {dashboardData.activity_suitability?.walking?.criteria}
                </p>
              </div>

              {/* Jogging */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-blue-50 text-blue-700">
                      <TrendingUp className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-bold text-slate-900">{t('bestTime.jogging', 'Jogging')}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue-800">
                    {dashboardData.activity_suitability?.jogging?.suitability_level}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Optimal Window:</p>
                  <p className="text-sm font-extrabold text-slate-900">{dashboardData.activity_suitability?.jogging?.recommended_window}</p>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${dashboardData.activity_suitability?.jogging?.score || 70}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  {dashboardData.activity_suitability?.jogging?.criteria}
                </p>
              </div>

              {/* Intensive Exercise */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-rose-50 text-rose-700">
                      <HeartPulse className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-bold text-slate-900">{t('bestTime.intensiveExercise', 'Intensive Exercise')}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-800">
                    {dashboardData.activity_suitability?.intensive_exercise?.suitability_level}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Optimal Window:</p>
                  <p className="text-sm font-extrabold text-slate-900">{dashboardData.activity_suitability?.intensive_exercise?.recommended_window}</p>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-rose-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${dashboardData.activity_suitability?.intensive_exercise?.score || 65}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  {dashboardData.activity_suitability?.intensive_exercise?.criteria}
                </p>
              </div>

              {/* Family Outing */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-purple-50 text-purple-700">
                      <Users className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-bold text-slate-900">{t('bestTime.familyOuting', 'Family Outing & Children')}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800">
                    {dashboardData.activity_suitability?.family_outing?.suitability_level}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Optimal Window:</p>
                  <p className="text-sm font-extrabold text-slate-900">{dashboardData.activity_suitability?.family_outing?.recommended_window}</p>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-purple-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${dashboardData.activity_suitability?.family_outing?.score || 75}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  {dashboardData.activity_suitability?.family_outing?.criteria}
                </p>
              </div>

              {/* General Park Visits */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
                      <TreePine className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-bold text-slate-900">{t('bestTime.generalVisit', 'General Visit & Relaxation')}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800">
                    {dashboardData.activity_suitability?.general_visit?.suitability_level}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Optimal Window:</p>
                  <p className="text-sm font-extrabold text-slate-900">{dashboardData.activity_suitability?.general_visit?.recommended_window}</p>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${dashboardData.activity_suitability?.general_visit?.score || 80}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  {dashboardData.activity_suitability?.general_visit?.criteria}
                </p>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 6. Provenance & Medical Disclaimer */}
          {/* ------------------------------------------------------------- */}
          <div className="p-5 rounded-2xl bg-slate-100 border border-slate-200/80 text-xs text-slate-600 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Data Provenance & Calculation Standard
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-slate-200 text-slate-600">
                Confidence: <strong className="text-slate-900 capitalize">{dashboardData.provenance?.confidence}</strong>
              </span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              Weather: {dashboardData.provenance?.weather_provider} • Air Quality: {dashboardData.provenance?.air_quality_provider} • Standard: {dashboardData.provenance?.standard}
            </p>
            <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-200">
              {dashboardData.disclaimer}
            </p>
          </div>
        </>
      )}
    </div>
  );
};
