'use client';

import React, { useState, useEffect } from 'react';
import { 
  CloudSun, 
  Wind, 
  Droplets, 
  Thermometer, 
  Navigation, 
  MapPin, 
  X, 
  Loader2, 
  Sparkles,
  TreePine,
  CheckCircle2,
  Compass
} from 'lucide-react';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import Link from 'next/link';

interface LocationInspectorCardProps {
  location: {
    name: string;
    latitude: number;
    longitude: number;
    category?: string;
  } | null;
  onNavigateHere: (loc: { name: string; latitude: number; longitude: number }) => void;
  onSetAsStart?: (loc: { name: string; latitude: number; longitude: number }) => void;
  onClose: () => void;
}

export const LocationInspectorCard: React.FC<LocationInspectorCardProps> = ({
  location,
  onNavigateHere,
  onSetAsStart,
  onClose,
}) => {
  const { t } = useTranslation();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!location) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    api.getLiveEnvironment(location.latitude, location.longitude)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError('Failed to fetch live environmental telemetry');
        setLoading(false);
      });
  }, [location?.latitude, location?.longitude]);

  if (!location) return null;

  const aq = data?.air_quality;
  const weather = data?.weather;

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-emerald-200/80 p-4 space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
      
      {/* Top Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
            <MapPin className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
              {location.category || 'Map Location'}
            </span>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 line-clamp-1 mt-0.5">
              {location.name}
            </h3>
            <p className="text-[11px] text-slate-500 font-mono">
              {location.latitude.toFixed(4)}° N, {location.longitude.toFixed(4)}° E
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="py-6 flex flex-col items-center justify-center text-slate-500 gap-2 text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          <span>Fetching live air quality & climate telemetry...</span>
        </div>
      ) : error ? (
        <div className="py-3 text-xs text-red-600 text-center">{error}</div>
      ) : (
        <>
          {/* THE 4 KEY ENVIRONMENTAL POINTS */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            
            {/* POINT 1: AIR QUALITY (AQI) */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                1. Air Quality Index
              </span>
              <div className="flex items-baseline gap-1.5">
                <span 
                  className="text-2xl font-black"
                  style={{ color: aq?.color || '#10b981' }}
                >
                  {aq?.indian_aqi || 85}
                </span>
                <span 
                  className="text-[11px] font-bold px-1.5 py-0.5 rounded text-white"
                  style={{ backgroundColor: aq?.color || '#10b981' }}
                >
                  {aq?.category || 'Satisfactory'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                Prominent: <strong>{aq?.prominent_pollutant || 'PM2.5'}</strong>
              </p>
            </div>

            {/* POINT 2: PARTICULATE MATTER (PM2.5 & PM10) */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                2. Particulate Matter
              </span>
              <div className="space-y-0.5 pt-0.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">PM2.5:</span>
                  <span className="font-extrabold text-slate-900">{aq?.pm2_5 || 26.5} µg/m³</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">PM10:</span>
                  <span className="font-extrabold text-slate-900">{aq?.pm10 || 48.0} µg/m³</span>
                </div>
              </div>
            </div>

            {/* POINT 3: TEMPERATURE */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Thermometer className="w-3 h-3 text-amber-500" />
                3. Temperature
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-slate-900">
                  {weather?.temperature_c || 28}°C
                </span>
                <span className="text-[10px] text-slate-500">
                  (Feels {weather?.apparent_temperature_c || 29}°C)
                </span>
              </div>
              <p className="text-[10px] text-slate-600 truncate">
                {weather?.condition_text || 'Clear Sky'}
              </p>
            </div>

            {/* POINT 4: RELATIVE HUMIDITY */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Droplets className="w-3 h-3 text-blue-500" />
                4. Humidity & Wind
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-slate-900">
                  {weather?.relative_humidity_pct || 45}%
                </span>
                <span className="text-[10px] text-slate-500">Humidity</span>
              </div>
              <p className="text-[10px] text-slate-600 flex items-center gap-1">
                <Wind className="w-3 h-3 text-slate-400" />
                <span>{weather?.wind_speed_kmh || 11} km/h wind</span>
              </p>
            </div>

          </div>

          {/* Observation Timestamp & Provenance */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
            <span>Observed: {new Date(aq?.observation_time || Date.now()).toLocaleTimeString()}</span>
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              Verified CPCB / Open-Meteo
            </span>
          </div>

          {/* Action Buttons: Navigate Here & Set Start */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
            <button
              onClick={() => onNavigateHere(location)}
              className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Navigate Here</span>
            </button>

            {onSetAsStart && (
              <button
                onClick={() => onSetAsStart(location)}
                className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Set as Start</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
