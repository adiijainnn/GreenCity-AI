'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, TreePine, X, Loader2, Compass, CheckCircle2, Navigation } from 'lucide-react';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';

export interface PlaceResult {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  subtitle?: string;
  health_score?: number;
  is_green_space?: boolean;
  is_verified?: boolean;
  match_type?: 'exact' | 'verified_landmark' | 'municipal_greenspace' | 'google_place' | 'osm_suggested' | 'osm_approximate';
  confidence?: number;
  distance_from_center_km?: number;
  formatted_distance_from_center?: string;
  provider?: string;
}

interface PlaceSearchProps {
  onSelectPlace: (place: PlaceResult) => void;
  placeholder?: string;
  centerLat?: number;
  centerLng?: number;
}

export const PlaceSearch: React.FC<PlaceSearchProps> = ({
  onSelectPlace,
  placeholder,
  centerLat,
  centerLng,
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await api.searchPlaces(query.trim(), 8, centerLat, centerLng);
        setResults(data);
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, centerLat, centerLng]);

  const handleSelect = (place: PlaceResult) => {
    setQuery(place.name);
    setIsOpen(false);
    onSelectPlace(place);
  };

  const getBadgeStyle = (matchType?: string, isVerified?: boolean) => {
    if (matchType === 'exact') {
      return {
        bg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        label: 'Exact Match'
      };
    }
    if (isVerified || matchType === 'verified_landmark') {
      return {
        bg: 'bg-blue-100 text-blue-800 border-blue-200',
        label: 'Verified Landmark'
      };
    }
    if (matchType === 'municipal_greenspace') {
      return {
        bg: 'bg-teal-100 text-teal-800 border-teal-200',
        label: 'SMC Green Space'
      };
    }
    if (matchType === 'google_place') {
      return {
        bg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        label: 'Google Places'
      };
    }
    return {
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
      label: 'OSM Suggested'
    };
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder={placeholder || t('map.searchPlaceholder', 'Search Solapur park, landmark, or street...')}
          className="w-full pl-10 pr-9 py-2.5 bg-white/95 backdrop-blur-md text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
        />
        {isLoading ? (
          <Loader2 className="w-4 h-4 text-emerald-600 animate-spin absolute right-3" />
        ) : query ? (
          <button
            type="button"
            onClick={() => { setQuery(''); setResults([]); }}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 absolute right-2.5"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-slate-100 max-h-80 overflow-y-auto z-50 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
            <span>Solapur Location Results ({results.length})</span>
            <span className="text-[9px] text-slate-400 font-normal">Click to select destination</span>
          </div>

          {results.map((res) => {
            const badge = getBadgeStyle(res.match_type, res.is_verified);
            return (
              <button
                key={res.id}
                type="button"
                onClick={() => handleSelect(res)}
                className="w-full px-3.5 py-2.5 text-left flex items-start gap-2.5 hover:bg-emerald-50/60 transition-colors group"
              >
                <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  res.is_verified 
                    ? 'bg-emerald-100 text-emerald-800 group-hover:bg-emerald-600 group-hover:text-white' 
                    : 'bg-slate-100 text-slate-600 group-hover:bg-slate-700 group-hover:text-white'
                }`}>
                  {res.is_green_space ? (
                    <TreePine className="w-3.5 h-3.5" />
                  ) : (
                    <MapPin className="w-3.5 h-3.5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-900 truncate">
                      {res.name}
                    </p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${badge.bg}`}>
                      {badge.label}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {res.subtitle || res.category}
                  </p>
                  
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                    <span className="font-mono text-slate-500">
                      {res.latitude.toFixed(4)}° N, {res.longitude.toFixed(4)}° E
                    </span>
                    {res.formatted_distance_from_center && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-700 font-medium">{res.formatted_distance_from_center}</span>
                      </>
                    )}
                  </div>
                </div>

                {res.health_score ? (
                  <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {res.health_score}/100
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
