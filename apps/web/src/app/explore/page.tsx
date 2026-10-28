'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import Link from 'next/link';
import { 
  Compass, 
  MapPin, 
  Navigation, 
  TreePine, 
  Footprints, 
  Car, 
  Check, 
  X, 
  ArrowRight, 
  Sparkles, 
  Layers, 
  Clock, 
  ShieldCheck, 
  Flame, 
  Filter,
  CheckCircle2,
  Wind
} from 'lucide-react';

import { useRouter } from 'next/navigation';
import { BestTimeToVisitDashboard } from '@/components/parks/BestTimeToVisitDashboard';

export default function NearbyExplorePage() {
  const { t } = useTranslation();
  const router = useRouter();

  // Active section: 'best-time' or 'discovery'
  const [activeSection, setActiveSection] = useState<'best-time' | 'discovery'>('best-time');
  const [targetParkId, setTargetParkId] = useState<string | undefined>(undefined);
  
  // Center location (defaults to Solapur Station or Siddheshwar Lake)
  const [centerLoc, setCenterLoc] = useState<{ name: string; lat: number; lng: number }>({
    name: 'Siddheshwar Lake & Temple Promenade',
    lat: 17.6710,
    lng: 75.9080,
  });

  const [radiusKm, setRadiusKm] = useState<number>(3.0);
  const [category, setCategory] = useState<string>('ALL');
  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Comparison selection
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [comparisonMatrix, setComparisonMatrix] = useState<any[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);

  // Active purpose ranking filter
  const [rankingFilter, setRankingFilter] = useState<'all' | 'walking' | 'clean_air' | 'canopy'>('all');

  // Read URL query params on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const parkParam = params.get('park_id');
      if (tabParam === 'discovery') {
        setActiveSection('discovery');
      } else if (tabParam === 'best-time') {
        setActiveSection('best-time');
      }
      if (parkParam) {
        setTargetParkId(parkParam);
      }
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    api.getNearbyPlaces(centerLoc.lat, centerLoc.lng, radiusKm, category)
      .then((data) => {
        setPlaces(data);
        setLoading(false);
      })
      .catch(() => {
        setPlaces([]);
        setLoading(false);
      });
  }, [centerLoc, radiusKm, category]);

  // Toggle place for comparison
  const toggleCompare = (placeId: string) => {
    if (selectedForCompare.includes(placeId)) {
      setSelectedForCompare(selectedForCompare.filter((id) => id !== placeId));
    } else {
      if (selectedForCompare.length < 4) {
        setSelectedForCompare([...selectedForCompare, placeId]);
      }
    }
  };

  // Open comparison modal
  const handleOpenComparison = async () => {
    const chosenPlaces = places.filter((p) => selectedForCompare.includes(p.id));
    if (chosenPlaces.length === 0) return;

    setCompareLoading(true);
    setCompareModalOpen(true);
    try {
      const matrix = await api.comparePlaces(chosenPlaces);
      setComparisonMatrix(matrix);
    } catch {
      setComparisonMatrix(chosenPlaces);
    } finally {
      setCompareLoading(false);
    }
  };

  // Sorted list based on selected ranking purpose
  const getRankedPlaces = () => {
    const list = [...places];
    if (rankingFilter === 'walking') {
      return list.sort((a, b) => a.walking_distance_km - b.walking_distance_km);
    }
    if (rankingFilter === 'canopy') {
      return list.sort((a, b) => (b.canopy_percentage || 0) - (a.canopy_percentage || 0));
    }
    if (rankingFilter === 'clean_air') {
      return list.sort((a, b) => (b.health_score || 0) - (a.health_score || 0));
    }
    return list;
  };

  const rankedList = getRankedPlaces();

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Solapur Municipal Corporation
            </span>
            <span className="text-xs text-slate-400">Green Spaces & Environmental Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            {activeSection === 'best-time' 
              ? t('bestTime.title', 'Best Time to Visit a Park') 
              : t('explore.title', 'Nearby Green Places & Discovery')}
          </h1>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl">
            {activeSection === 'best-time'
              ? t('bestTime.subtitle', 'Hour-by-hour thermal comfort, CPCB NAQI air quality, and optimal outdoor activity windows for Solapur parks')
              : t('explore.subtitle', 'Find urban green spaces, lakefront promenades, and civic amenities within your radius.')}
          </p>

          {/* Section Tabs Switcher */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveSection('best-time')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all ${
                activeSection === 'best-time'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md font-extrabold'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/10'
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-950" />
              <span>{t('bestTime.title', 'Best Time to Visit')}</span>
            </button>
            <button
              onClick={() => setActiveSection('discovery')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all ${
                activeSection === 'discovery'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md font-extrabold'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/10'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>{t('explore.title', 'Proximity Discovery & Compare')}</span>
            </button>
          </div>

          {/* Center Origin Selector (for Discovery tab) */}
          {activeSection === 'discovery' && (
            <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-300 font-semibold">Origin Point:</span>
              {[
                { name: 'Siddheshwar Lake Promenade', lat: 17.6710, lng: 75.9080 },
                { name: 'Solapur Railway Station', lat: 17.6690, lng: 75.9080 },
                { name: 'Saat Rasta Chowk', lat: 17.6690, lng: 75.8910 },
                { name: 'SMC Headquarters (Indra Bhavan)', lat: 17.6720, lng: 75.9120 },
              ].map((loc) => (
                <button
                  key={loc.name}
                  onClick={() => setCenterLoc(loc)}
                  className={`py-1.5 px-3 rounded-xl font-bold border transition-all ${
                    centerLoc.name === loc.name
                      ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm'
                      : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/10'
                  }`}
                >
                  {loc.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 space-y-6">
        
        {/* SECTION 1: BEST TIME TO VISIT A PARK */}
        {activeSection === 'best-time' && (
          <BestTimeToVisitDashboard
            initialParkId={targetParkId}
            onNavigateToMap={(lat, lng, name) => 
              router.push(`/map?dest_lat=${lat}&dest_lng=${lng}&dest_name=${encodeURIComponent(name)}`)
            }
          />
        )}

        {/* SECTION 2: PROXIMITY DISCOVERY & SIDE-BY-SIDE COMPARE */}
        {activeSection === 'discovery' && (
          <>
            {/* Controls Toolbar: Radius & Ranking Filter */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Radius Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              {t('explore.radiusLabel', 'Radius')}:
            </span>
            {[1.0, 2.0, 3.0, 5.0].map((r) => (
              <button
                key={r}
                onClick={() => setRadiusKm(r)}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                  radiusKm === r
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {r} km
              </button>
            ))}
          </div>

          {/* Ranking Mode Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Rank By:
            </span>
            <button
              onClick={() => setRankingFilter('all')}
              className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold ${
                rankingFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Default
            </button>
            <button
              onClick={() => setRankingFilter('walking')}
              className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold ${
                rankingFilter === 'walking' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Shortest Walk
            </button>
            <button
              onClick={() => setRankingFilter('canopy')}
              className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold ${
                rankingFilter === 'canopy' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Denser Shade (Canopy)
            </button>
            <button
              onClick={() => setRankingFilter('clean_air')}
              className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold ${
                rankingFilter === 'clean_air' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Health Score
            </button>
          </div>
        </div>

        {/* Floating Compare Action Bar if items selected */}
        {selectedForCompare.length > 0 && (
          <div className="sticky top-20 z-30 bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl border border-slate-700 flex items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
              <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
                {selectedForCompare.length}
              </span>
              <span>Places selected for side-by-side comparison (max 4)</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedForCompare([])}
                className="py-1.5 px-3 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={handleOpenComparison}
                className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <span>{t('explore.compareButton', 'Compare Selected Areas')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Places Grid with Loading & Empty State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="bg-white rounded-2xl p-5 border border-slate-200 animate-pulse space-y-3">
                <div className="h-4 bg-slate-200 rounded w-24"></div>
                <div className="h-6 bg-slate-200 rounded w-3/4"></div>
                <div className="h-12 bg-slate-100 rounded"></div>
                <div className="h-8 bg-slate-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : rankedList.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-3">
            <TreePine className="w-10 h-10 text-emerald-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No Green Spaces in this Radius</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Try expanding the discovery radius to 3 km or 5 km, or reset origin to Solapur City Center.
            </p>
            <button
              onClick={() => { setRadiusKm(5.0); setCenterLoc({ name: 'Siddheshwar Lake & Temple Promenade', lat: 17.6710, lng: 75.9080 }); }}
              className="py-2 px-4 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors"
            >
              Expand to 5 km at Siddheshwar Lake
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {rankedList.map((place) => {
              const isSelected = selectedForCompare.includes(place.id);
              return (
              <div
                key={place.id}
                className={`bg-white rounded-2xl p-5 shadow-sm border transition-all duration-200 flex flex-col justify-between ${
                  isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-3">
                  {/* Category & Selection Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      {place.category}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleCompare(place.id)}
                      className={`text-xs font-semibold px-2 py-1 rounded-lg border flex items-center gap-1 transition-all ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Check className={`w-3 h-3 ${isSelected ? 'opacity-100' : 'opacity-40'}`} />
                      <span>{isSelected ? 'Selected' : 'Compare'}</span>
                    </button>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 line-clamp-1">{place.name}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>Solapur Municipal Area</span>
                    </p>
                  </div>

                  {/* Distance Details: straight-line (accurate) and walking estimate (1.35× road factor) */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-semibold">
                        Straight-line distance
                      </span>
                      <span className="font-bold text-slate-800">
                        {place.straight_line_distance_km} km (as crow flies)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-semibold">
                        Est. walking distance ≈
                      </span>
                      <span className="font-bold text-emerald-700">
                        ~{place.walking_distance_km} km (~{place.walking_duration_minutes} min)
                      </span>
                    </div>
                  </div>

                  {/* Environmental & Canopy Scores */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs py-1 border-y border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Health</span>
                      <span className="font-bold text-slate-800">{place.health_score}/100</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Canopy</span>
                      <span className="font-bold text-slate-800">{place.canopy_percentage}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Trees</span>
                      <span className="font-bold text-slate-800">{place.tree_count}</span>
                    </div>
                  </div>

                  {/* Amenities */}
                  {place.amenities && place.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {place.amenities.slice(0, 3).map((am: string, i: number) => (
                        <span key={i} className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {am}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setTargetParkId(place.id);
                      setActiveSection('best-time');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t('bestTime.bestTimeToday', 'Best Time')}</span>
                  </button>
                  <Link
                    href={`/map?dest_lat=${place.latitude}&dest_lng=${place.longitude}&dest_name=${encodeURIComponent(place.name)}`}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>{t('common.directions', 'Directions')}</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  )}
    </div>

      {/* COMPARISON MODAL */}
      {compareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-lg text-slate-900">{t('explore.compareTitle', 'Side-by-Side Area Comparison')}</h3>
                <p className="text-xs text-slate-500">Live environmental and accessibility metrics comparison</p>
              </div>
              <button
                onClick={() => setCompareModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comparison Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Metric</th>
                    {comparisonMatrix.map((item, i) => (
                      <th key={i} className="py-2.5 px-3 font-bold text-slate-900">{item.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="py-3 px-3 font-semibold text-slate-500">Category</td>
                    {comparisonMatrix.map((item, i) => (
                      <td key={i} className="py-3 px-3 font-bold text-slate-900">{item.category}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold text-slate-500">Indian AQI</td>
                    {comparisonMatrix.map((item, i) => (
                      <td key={i} className="py-3 px-3">
                        <span className="font-extrabold text-sm text-emerald-700">{item.indian_aqi || 85}</span>
                        <span className="text-[10px] text-slate-400 block">{item.aqi_category || 'Satisfactory'}</span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold text-slate-500">PM2.5 (µg/m³)</td>
                    {comparisonMatrix.map((item, i) => (
                      <td key={i} className="py-3 px-3 font-bold">{item.pm2_5 || 28.5}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold text-slate-500">Temperature</td>
                    {comparisonMatrix.map((item, i) => (
                      <td key={i} className="py-3 px-3 font-bold">{item.temperature_c || 29}°C</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold text-slate-500">Tree Canopy</td>
                    {comparisonMatrix.map((item, i) => (
                      <td key={i} className="py-3 px-3 font-bold">{item.canopy_percentage}%</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-semibold text-slate-500">Walking Distance</td>
                    {comparisonMatrix.map((item, i) => (
                      <td key={i} className="py-3 px-3 font-bold text-emerald-800">
                        {item.walking_distance_km} km ({item.walking_duration_minutes} min)
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setCompareModalOpen(false)}
                className="py-2 px-5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
