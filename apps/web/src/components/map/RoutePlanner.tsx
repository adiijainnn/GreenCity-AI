'use client';

import React, { useState, useEffect } from 'react';
import { 
  Navigation, 
  Car, 
  Footprints, 
  MapPin, 
  LocateFixed, 
  ArrowUpDown, 
  X, 
  Loader2,
  AlertTriangle,
  Play,
  CornerUpRight,
  ChevronDown,
  ChevronUp,
  Search
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { FullRouteData } from './LiveMap';
import { api } from '@/lib/api';
import { PlaceSearch } from './PlaceSearch';

interface LocationItem {
  name: string;
  latitude: number;
  longitude: number;
}

interface RoutePlannerProps {
  userLocation: [number, number] | null;
  startLocation: LocationItem | null;
  destinationLocation: LocationItem | null;
  onSetStartLocation: (loc: LocationItem) => void;
  onSetDestinationLocation: (loc: LocationItem) => void;
  onRouteCalculated: (route: FullRouteData) => void;
  onStartNavigation: () => void;
  onClose: () => void;
}

export const RoutePlanner: React.FC<RoutePlannerProps> = ({
  userLocation,
  startLocation,
  destinationLocation,
  onSetStartLocation,
  onSetDestinationLocation,
  onRouteCalculated,
  onStartNavigation,
  onClose,
}) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'driving' | 'walking'>('driving');
  const [isSearchingStart, setIsSearchingStart] = useState(false);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeRoute, setActiveRoute] = useState<FullRouteData | null>(null);
  const [showSteps, setShowSteps] = useState(false);

  // Set default start location if none provided
  useEffect(() => {
    if (!startLocation) {
      if (userLocation) {
        onSetStartLocation({
          name: t('map.currentLocation', 'Your Current GPS Location'),
          latitude: userLocation[0],
          longitude: userLocation[1],
        });
      } else {
        onSetStartLocation({
          name: 'Solapur Central Railway Station',
          latitude: 17.6645,
          longitude: 75.8935,
        });
      }
    }
  }, [userLocation, startLocation]);

  const handleSwap = () => {
    if (startLocation && destinationLocation) {
      const temp = { ...startLocation };
      onSetStartLocation(destinationLocation);
      onSetDestinationLocation(temp);
      setActiveRoute(null);
    }
  };

  // Auto-calculate route as soon as origin and destination are selected
  useEffect(() => {
    if (startLocation && destinationLocation) {
      handleCalculateRoute();
    }
  }, [startLocation?.latitude, startLocation?.longitude, destinationLocation?.latitude, destinationLocation?.longitude, mode]);

  const handleCalculateRoute = async () => {
    if (!startLocation || !destinationLocation) {
      setErrorMsg('Please select both starting point and destination.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const data = await api.getDirections({
        startLat: startLocation.latitude,
        startLng: startLocation.longitude,
        destLat: destinationLocation.latitude,
        destLng: destinationLocation.longitude,
        mode,
        alternatives: true,
      });

      const fullData: FullRouteData = {
        start: [startLocation.latitude, startLocation.longitude],
        destination: [destinationLocation.latitude, destinationLocation.longitude],
        startName: startLocation.name,
        destinationName: destinationLocation.name,
        routeCoords: data.coordinates,
        distanceKm: Number(data.distance_km || 0),
        durationMin: Number(data.duration_minutes || 1),
        formattedDuration: data.formatted_duration,
        straightLineKm: data.straight_line_km,
        snappedDestination: data.snapped_destination,
        destSnapDistanceMeters: data.dest_snap_distance_meters,
        isDestinationSnapped: data.is_destination_snapped,
        snapNotice: data.snap_notice,
        provider: data.provider,
        mode,
        steps: data.steps || [],
        alternatives: data.alternatives || [],
      };

      setActiveRoute(fullData);
      onRouteCalculated(fullData);
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to calculate route. Please try another destination.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 p-4 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-emerald-600" />
          <h3 className="font-extrabold text-sm text-slate-900">
            Real Turn-by-Turn Route Navigation
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Origin & Destination Pickers */}
      <div className="space-y-2 relative">
        
        {/* START LOCATION (A) */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-blue-700 flex items-center gap-1">
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[9px]">A</span>
              Start Origin
            </span>
            <button
              onClick={() => setIsSearchingStart(!isSearchingStart)}
              className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold"
            >
              {isSearchingStart ? 'Close Search' : 'Change Location'}
            </button>
          </div>

          {isSearchingStart ? (
            <div className="mt-2">
              <PlaceSearch
                placeholder="Search start address or landmark..."
                centerLat={userLocation ? userLocation[0] : 17.6599}
                centerLng={userLocation ? userLocation[1] : 75.9064}
                onSelectPlace={(p) => {
                  onSetStartLocation({ name: p.name, latitude: p.latitude, longitude: p.longitude });
                  setIsSearchingStart(false);
                  setActiveRoute(null);
                }}
              />
            </div>
          ) : (
            <p className="text-xs font-bold text-slate-800 mt-1 truncate">
              {startLocation?.name || 'Pick starting point'}
            </p>
          )}
        </div>

        {/* SWAP BUTTON */}
        <div className="flex justify-center -my-1 relative z-10">
          <button
            onClick={handleSwap}
            title="Swap Origin and Destination"
            className="p-1.5 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-emerald-700 hover:border-emerald-300 shadow-xs transition-all active:rotate-180"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* DESTINATION (B) */}
        <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-emerald-800 flex items-center gap-1">
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[9px]">B</span>
              Destination
            </span>
            <button
              onClick={() => setIsSearchingDest(!isSearchingDest)}
              className="text-[10px] text-emerald-700 hover:text-emerald-900 font-semibold"
            >
              {isSearchingDest ? 'Close Search' : 'Change Destination'}
            </button>
          </div>

          {isSearchingDest ? (
            <div className="mt-2">
              <PlaceSearch
                placeholder="Search destination park or landmark..."
                centerLat={startLocation ? startLocation.latitude : 17.6599}
                centerLng={startLocation ? startLocation.longitude : 75.9064}
                onSelectPlace={(p) => {
                  onSetDestinationLocation({ name: p.name, latitude: p.latitude, longitude: p.longitude });
                  setIsSearchingDest(false);
                  setActiveRoute(null);
                }}
              />
            </div>
          ) : (
            <p className="text-xs font-bold text-slate-900 mt-1 truncate">
              {destinationLocation?.name || 'Click map or search destination'}
            </p>
          )}
        </div>
      </div>

      {/* Mode Selector (Drive vs Walk) */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => { setMode('driving'); setActiveRoute(null); }}
          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
            mode === 'driving'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Car className="w-4 h-4" />
          <span>Driving Car</span>
        </button>
        <button
          type="button"
          onClick={() => { setMode('walking'); setActiveRoute(null); }}
          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
            mode === 'walking'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Footprints className="w-4 h-4" />
          <span>Walking</span>
        </button>
      </div>

      {/* Error state */}
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Active Route Summary if calculated */}
      {activeRoute ? (
        <div className="space-y-3 pt-1 border-t border-slate-100">
          
          {/* Real Metrics Banner */}
          <div className="bg-slate-900 text-white rounded-xl p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div>
                <p className="text-[10px] text-slate-400 font-medium">Road Distance (Google Maps Parity)</p>
                <p className="text-xl font-black text-emerald-400">
                  {activeRoute.distanceKm < 1 
                    ? `${Math.round(activeRoute.distanceKm * 1000)} m` 
                    : `${activeRoute.distanceKm.toFixed(1)} km`}
                </p>
                <p className="text-[9px] text-slate-400">
                  {activeRoute.distanceKm.toFixed(2)} km road network
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium">Estimated Travel Time</p>
                <p className="text-xl font-black text-white">
                  {activeRoute.formattedDuration || `${activeRoute.durationMin} min`}
                </p>
                <p className="text-[9px] text-emerald-400 capitalize font-medium">
                  {activeRoute.mode === 'walking' ? 'Walking Pedestrian' : 'Driving Car'}
                </p>
              </div>
            </div>

            {activeRoute.provider && (
              <div className="border-t border-slate-800 pt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                <span>Routing Engine:</span>
                <span className="font-semibold text-emerald-400">{activeRoute.provider}</span>
              </div>
            )}
          </div>

          {/* Turn-by-Turn Steps Accordion */}
          {activeRoute.steps && activeRoute.steps.length > 0 && (
            <div>
              <button
                onClick={() => setShowSteps(!showSteps)}
                className="w-full py-1.5 px-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 flex items-center justify-between transition-colors"
              >
                <span>Turn-by-Turn Directions ({activeRoute.steps.length} turns)</span>
                {showSteps ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showSteps && (
                <div className="mt-2 max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 text-xs">
                  {activeRoute.steps.map((st, idx) => (
                    <div key={idx} className="pt-1.5 flex items-start gap-2">
                      <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800 leading-snug">{st.instruction}</p>
                        <p className="text-[10px] text-slate-400">{Math.round(st.distance_meters)} meters</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={onStartNavigation}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Start Live Navigation HUD</span>
          </button>
        </div>
      ) : (
        <button
          onClick={handleCalculateRoute}
          disabled={!startLocation || !destinationLocation || isLoading}
          className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-98"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Calculating OSRM Street Route...</span>
            </>
          ) : (
            <>
              <Navigation className="w-4 h-4" />
              <span>Get Route Directions</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};
