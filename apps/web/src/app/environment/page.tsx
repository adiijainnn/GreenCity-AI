'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import Link from 'next/link';
import { 
  CloudSun, 
  Wind, 
  Droplets, 
  Thermometer, 
  Flame, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Compass, 
  MapPin, 
  Sparkles,
  Calendar,
  Activity,
  HeartPulse,
  Users,
  Footprints,
  Clock
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend, 
  AreaChart, 
  Area 
} from 'recharts';

export default function EnvironmentalIntelligencePage() {
  const { t } = useTranslation();
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number; name: string }>({
    lat: 17.6599,
    lng: 75.9064,
    name: 'Solapur City Center (Siddheshwar Enclave)'
  });

  const [liveData, setLiveData] = useState<any | null>(null);
  const [historyData, setHistoryData] = useState<any | null>(null);
  const [suitabilityData, setSuitabilityData] = useState<any | null>(null);
  const [festivalData, setFestivalData] = useState<any | null>(null);
  const [selectedPurpose, setSelectedPurpose] = useState<string>('walking');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'festival' | 'suitability'>('overview');

  const fetchAllData = (lat: number, lng: number, forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);

    Promise.all([
      api.getLiveEnvironment(lat, lng, forceRefresh).catch(() => null),
      api.getEnvironmentalHistory(lat, lng).catch(() => null),
      api.getVisitSuitability(lat, lng, selectedPurpose).catch(() => null),
      api.getFestivalIntelligence(lat, lng).catch(() => null),
    ]).then(([live, hist, suit, fest]) => {
      if (live) setLiveData(live);
      if (hist) setHistoryData(hist);
      if (suit) setSuitabilityData(suit);
      if (fest) setFestivalData(fest);
      setLoading(false);
      setRefreshing(false);
    });
  };

  useEffect(() => {
    fetchAllData(selectedCoords.lat, selectedCoords.lng);
  }, [selectedCoords, selectedPurpose]);

  const handleAreaSelect = (areaName: string, lat: number, lng: number) => {
    setSelectedCoords({ name: areaName, lat, lng });
  };

  const weather = liveData?.weather;
  const aq = liveData?.air_quality;

  // Format historical chart data
  const chartData = (historyData?.history_trend || []).map((pt: any) => ({
    time: pt.time ? pt.time.split('T')[1]?.slice(0, 5) || pt.time : '',
    date: pt.time ? pt.time.split('T')[0]?.slice(5) : '',
    pm2_5: Math.round(pt.pm2_5 || 0),
    pm10: Math.round(pt.pm10 || 0),
    aqi: Math.round(pt.indian_aqi || 0),
  }));

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16">
      
      {/* Hero Header */}
      <div className="bg-gradient-to-b from-emerald-900 via-teal-900 to-slate-900 text-white pt-10 pb-16 px-4 sm:px-6 lg:px-8 border-b border-emerald-800/40">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {t('common.live', 'Live Observation')}
                </span>
                <span className="text-xs text-slate-400">Solapur Municipal Environmental Directorate</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mt-2 text-white">
                {t('environment.title', 'Live Environmental Intelligence')}
              </h1>
              <p className="text-slate-300 text-sm sm:text-base max-w-2xl mt-1">
                {t('environment.subtitle', 'Real-time Air Quality Index (AQI), microclimate sensors, and Diwali festival analysis.')}
              </p>
            </div>

            {/* Quick Area Shortcuts */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { name: 'Siddheshwar Lake', lat: 17.6710, lng: 75.9080 },
                { name: 'Solapur Railway Station', lat: 17.6690, lng: 75.9080 },
                { name: 'Saat Rasta Promenade', lat: 17.6690, lng: 75.8910 },
                { name: 'Hotgi Road Industrial Zone', lat: 17.6450, lng: 75.9400 },
              ].map((area) => (
                <button
                  key={area.name}
                  onClick={() => handleAreaSelect(area.name, area.lat, area.lng)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    selectedCoords.name === area.name
                      ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm'
                      : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/10'
                  }`}
                >
                  {area.name}
                </button>
              ))}
            </div>
          </div>

          {/* Current Location Badge & Refresh */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-200 font-medium">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Monitoring Location: <strong className="text-white">{selectedCoords.name}</strong> ({selectedCoords.lat.toFixed(4)}° N, {selectedCoords.lng.toFixed(4)}° E)</span>
            </div>

            <button
              onClick={() => fetchAllData(selectedCoords.lat, selectedCoords.lng, true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{t('environment.refreshButton', 'Refresh Live Data')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center gap-1 max-w-xl">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all ${
              activeTab === 'overview'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Live AQI & Weather
          </button>
          <button
            onClick={() => setActiveTab('suitability')}
            className={`flex-1 py-2 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all ${
              activeTab === 'suitability'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {t('environment.suitabilityTab', 'Visit Suitability')}
          </button>
          <button
            onClick={() => setActiveTab('festival')}
            className={`flex-1 py-2 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all ${
              activeTab === 'festival'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Diwali Pollution Watch
          </button>
          <Link
            href="/explore?tab=best-time"
            className="flex-1 py-2 px-3 text-xs sm:text-sm font-bold rounded-xl text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 transition-all text-center flex items-center justify-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Best Time</span>
          </Link>
        </div>

        {/* TAB 1: OVERVIEW & LIVE READINGS */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Environmental Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* AQI Primary Card */}
              <div className="md:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {t('environment.airQualityIndex', 'National Air Quality Index (NAQI)')}
                  </span>
                  <span 
                    className="text-xs font-bold px-2.5 py-1 rounded-full text-white shadow-2xs"
                    style={{ backgroundColor: aq?.color || '#10b981' }}
                  >
                    {aq?.category || 'Good'}
                  </span>
                </div>

                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-black tracking-tight" style={{ color: aq?.color || '#10b981' }}>
                    {aq?.indian_aqi || '--'}
                  </span>
                  <div className="text-xs text-slate-500">
                    <p className="font-semibold text-slate-700">CPCB Sub-Index Standard</p>
                    <p>Prominent Pollutant: <strong>{aq?.prominent_pollutant || 'PM2.5'}</strong></p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                  <strong>Health Advisory: </strong>{aq?.health_advisory}
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">PM2.5 Concentration</span>
                    <span className="text-base font-extrabold text-slate-900">{aq?.pm2_5} µg/m³</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">PM10 Concentration</span>
                    <span className="text-base font-extrabold text-slate-900">{aq?.pm10} µg/m³</span>
                  </div>
                </div>
              </div>

              {/* Weather & Comfort Card */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {t('environment.temperature', 'Thermal Comfort')}
                  </span>
                  <CloudSun className="w-5 h-5 text-emerald-600" />
                </div>

                <div>
                  <span className="text-4xl font-black text-slate-900">
                    {weather?.temperature_c}°C
                  </span>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Condition: <strong className="text-slate-800">{weather?.condition_text}</strong>
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Thermometer className="w-3.5 h-3.5" /> Feels Like
                    </span>
                    <span className="font-bold text-slate-800">{weather?.apparent_temperature_c}°C</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5" /> Humidity
                    </span>
                    <span className="font-bold text-slate-800">{weather?.relative_humidity_pct}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Wind className="w-3.5 h-3.5" /> Wind Speed
                    </span>
                    <span className="font-bold text-slate-800">{weather?.wind_speed_kmh} km/h</span>
                  </div>
                </div>
              </div>

              {/* Provider & Freshness Attribution */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Data Integrity & Source
                  </span>
                  <div className="mt-3 space-y-2 text-xs text-slate-600">
                    <div>
                      <p className="text-slate-400 font-medium">Provider</p>
                      <p className="font-bold text-slate-800">{aq?.provider}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">Calculation Standard</p>
                      <p className="font-medium text-slate-700">CPCB NAQI (India)</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">Observation Time</p>
                      <p className="font-bold text-slate-800">{new Date(aq?.observation_time || Date.now()).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-[11px] font-semibold flex items-center gap-1.5 border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Fresh live telemetry verified</span>
                </div>
              </div>
            </div>

            {/* Historical 72-Hour Pollution Trends Chart */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {t('environment.historicalTrends', '72-Hour Historical Pollution Trend')}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verified hourly PM2.5, PM10 and calculated Indian AQI timeline
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> Indian AQI
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span> PM2.5 (µg/m³)
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span> PM10 (µg/m³)
                  </span>
                </div>
              </div>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorAqi" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="colorPm25" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                    />
                    <Area type="monotone" dataKey="aqi" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAqi)" name="Indian AQI" />
                    <Area type="monotone" dataKey="pm2_5" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorPm25)" name="PM2.5 (µg/m³)" />
                    <Line type="monotone" dataKey="pm10" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="PM10 (µg/m³)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: OUTDOOR VISIT SUITABILITY */}
        {activeTab === 'suitability' && suitabilityData && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6 animate-in fade-in duration-200">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                Transparent Citizen Assessment Model
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-2">
                Environmental Outdoor Activity Suitability
              </h2>
              <p className="text-xs text-slate-500">
                Scientific rating based on Indian NAQI guidelines, thermal comfort index, and tree shade proxy.
              </p>
            </div>

            {/* Purpose Selectors */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'walking', label: t('environment.purposeWalking', 'Walking & Jogging'), icon: Footprints },
                { id: 'exercising', label: t('environment.purposeExercising', 'Intensive Exercise'), icon: Activity },
                { id: 'family_children', label: t('environment.purposeFamily', 'Family & Children'), icon: Users },
                { id: 'general_visit', label: t('environment.purposeGeneral', 'General Transit'), icon: Compass },
              ].map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPurpose(p.id)}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                      selectedPurpose === p.id
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-400 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold">{p.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Assessment Banner */}
            <div 
              className="p-5 rounded-2xl text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
              style={{ backgroundColor: suitabilityData.badge_color }}
            >
              <div>
                <span className="text-xs uppercase tracking-wider font-extrabold bg-black/20 px-2 py-0.5 rounded text-white/90">
                  Overall Rating
                </span>
                <h3 className="text-2xl font-black mt-1">
                  {suitabilityData.overall_rating}
                </h3>
                <p className="text-xs text-white/90 mt-1 max-w-2xl leading-relaxed">
                  {suitabilityData.explanation}
                </p>
              </div>

              <div className="shrink-0 bg-white/20 backdrop-blur-sm p-4 rounded-xl text-center min-w-[140px]">
                <p className="text-[11px] font-bold text-white/80">Air Quality</p>
                <p className="text-lg font-black">{suitabilityData.air_quality?.label}</p>
                <p className="text-[10px] text-white/70">AQI: {suitabilityData.air_quality?.aqi}</p>
              </div>
            </div>

            {/* Purpose-specific advice card */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs text-emerald-950 uppercase tracking-wider">
                  Specific Advice for {selectedPurpose.replace('_', ' ').toUpperCase()}
                </h4>
                <p className="text-xs sm:text-sm text-emerald-900 font-medium mt-1 leading-relaxed">
                  {suitabilityData.purpose_advice}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DIWALI & FESTIVAL POLLUTION WATCH */}
        {activeTab === 'festival' && festivalData && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">
                    {festivalData.festival_name}
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  Festive Season Clean-Air Telemetry & Analysis
                </h2>
                <p className="text-xs text-slate-500">
                  {t('environment.festivalSubtitle', 'Continuous monitoring of festive emissions, atmospheric inversion, and clean-air baseline.')}
                </p>
              </div>

              <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-bold shrink-0">
                Status: {festivalData.monitoring_status}
              </span>
            </div>

            {/* Comparison Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <span className="text-xs font-medium text-slate-500 block">Pre-Festival Baseline AQI</span>
                <span className="text-3xl font-black text-slate-800 mt-1 block">
                  {festivalData.baseline_comparison?.pre_festival_baseline_aqi}
                </span>
                <span className="text-[11px] text-slate-400">PM2.5: {festivalData.baseline_comparison?.pre_festival_baseline_pm25} µg/m³</span>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                <span className="text-xs font-medium text-emerald-700 block">Current Observed AQI</span>
                <span className="text-3xl font-black text-emerald-900 mt-1 block">
                  {festivalData.current_observation?.indian_aqi}
                </span>
                <span className="text-[11px] text-emerald-700">PM2.5: {festivalData.current_observation?.pm2_5} µg/m³</span>
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-center">
                <span className="text-xs font-medium text-amber-700 block">Baseline Variation</span>
                <span className="text-3xl font-black text-amber-900 mt-1 block">
                  {festivalData.baseline_comparison?.pm25_change_percentage > 0 ? '+' : ''}
                  {festivalData.baseline_comparison?.pm25_change_percentage}%
                </span>
                <span className="text-[11px] font-bold text-amber-800">
                  Trend: {festivalData.baseline_comparison?.trend_direction}
                </span>
              </div>
            </div>

            {/* Meteorological context notice */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <Wind className="w-4 h-4" />
                <span>Atmospheric Dispersion & Meteorological Factsheet</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {festivalData.meteorological_context}
              </p>
            </div>

            {/* Civic Advisories */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Official Municipal Guidance
              </h4>
              <ul className="space-y-2">
                {festivalData.advisories?.map((adv: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{adv}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Disclaimer */}
            <p className="text-[11px] text-slate-400 italic border-t border-slate-100 pt-3">
              {festivalData.disclaimer}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
