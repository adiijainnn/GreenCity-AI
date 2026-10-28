'use client';

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { GreenSpace, Ward, CitizenReport } from '@/lib/types';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { FullRouteData } from '@/components/map/LiveMap';
import { NavigationPanel } from '@/components/map/NavigationPanel';
import { RoutePlanner } from '@/components/map/RoutePlanner';
import { PlaceSearch } from '@/components/map/PlaceSearch';
import { LocationInspectorCard } from '@/components/map/LocationInspectorCard';
import { 
  Navigation, 
  Layers, 
  MapPin, 
  LocateFixed, 
  CloudSun, 
  Compass, 
  TreePine, 
  X, 
  ChevronUp,
  ChevronDown,
  AlertTriangle
} from 'lucide-react';

interface LocationItem {
  name: string;
  latitude: number;
  longitude: number;
  category?: string;
}

// Dynamically import Leaflet Live Map (No SSR)
const LiveMap = dynamic(
  () => import('@/components/map/LiveMap').then((mod) => mod.LiveMap),
  { 
    ssr: false, 
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-emerald-800 font-semibold text-sm">
        <Compass className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
        <span>Loading Solapur Live GIS Map...</span>
      </div>
    ) 
  }
);

export default function InteractiveMapPage() {
  const { t } = useTranslation();
  const [greenSpaces, setGreenSpaces] = useState<GreenSpace[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [reports, setReports] = useState<CitizenReport[]>([]);

  // Location & Geolocation state
  const [userLocation, setUserLocation] = useState<[number, number] | null>([17.6645, 75.8935]); // Solapur Central Station exact coordinates
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Map & Flight control
  const [flyToCoord, setFlyToCoord] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  
  // Interactive Inspected Point (Shows the 4 Environmental Points)
  const [inspectedLocation, setInspectedLocation] = useState<LocationItem | null>({
    name: 'Siddheshwar Temple Lake & Sacred Promenade',
    latitude: 17.6710,
    longitude: 75.9055,
    category: 'Sacred Lake & Wetland'
  });

  // Routing State
  const [startLocation, setStartLocation] = useState<LocationItem | null>({
    name: 'Solapur Central Railway Station',
    latitude: 17.6645,
    longitude: 75.8935,
  });
  const [destinationLocation, setDestinationLocation] = useState<LocationItem | null>({
    name: 'Siddheshwar Temple Lake & Sacred Promenade',
    latitude: 17.6710,
    longitude: 75.9055,
  });

  const [routeData, setRouteData] = useState<FullRouteData | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [routePlannerOpen, setRoutePlannerOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);

  const { activeLayers, toggleLayer } = useAppStore();

  useEffect(() => {
    Promise.all([
      api.getGreenSpaces().catch(() => []),
      api.getWards().catch(() => []),
      api.getReports().catch(() => []),
    ]).then(([gsData, wardData, reportData]) => {
      setGreenSpaces(gsData);
      setWards(wardData);
      setReports(reportData);
    });

    // Auto-calculate initial source-to-destination road route (Station to Lake)
    if (startLocation && destinationLocation) {
      api.getDirections({
        startLat: startLocation.latitude,
        startLng: startLocation.longitude,
        destLat: destinationLocation.latitude,
        destLng: destinationLocation.longitude,
        mode: 'driving',
      }).then((data) => {
        setRouteData({
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
          mode: 'driving',
          steps: data.steps || [],
          alternatives: data.alternatives || [],
        });
      }).catch(() => {});
    }

    return () => {
      if (watchIdRef.current !== null && typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Request browser GPS position
  const handleLocateMe = () => {
    setGpsLoading(true);
    setGpsError(null);
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLocation([lat, lng]);
          setLocationAccuracy(pos.coords.accuracy);
          const gpsStart = {
            name: t('map.currentLocation', 'Your Current GPS Location'),
            latitude: lat,
            longitude: lng,
          };
          setStartLocation(gpsStart);
          setFlyToCoord({ lat, lng, zoom: 16 });
          setGpsLoading(false);
          setGpsError(null);

          // Immediately calculate route from user's live GPS position to destination
          if (destinationLocation) {
            api.getDirections({
              startLat: lat,
              startLng: lng,
              destLat: destinationLocation.latitude,
              destLng: destinationLocation.longitude,
              mode: 'driving',
            }).then((data) => {
              setRouteData({
                start: [lat, lng],
                destination: [destinationLocation.latitude, destinationLocation.longitude],
                startName: gpsStart.name,
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
                mode: 'driving',
                steps: data.steps || [],
                alternatives: data.alternatives || [],
              });
            }).catch(() => {});
          }
        },
        (err) => {
          let errorMsg = 'Could not retrieve your GPS location.';
          if (err.code === 1) {
            errorMsg = 'Location permission was denied. Please allow GPS access in your browser address bar.';
          } else if (err.code === 2) {
            errorMsg = 'GPS location unavailable. Please check device location settings.';
          } else if (err.code === 3) {
            errorMsg = 'Location request timed out. Please try again or select location manually.';
          }
          setGpsError(errorMsg);
          setGpsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setGpsError('Geolocation is not supported by your browser.');
      setGpsLoading(false);
    }
  };

  // Turn-by-Turn Live Navigation handler
  const handleStartNavigation = () => {
    if (!routeData) return;
    setIsNavigating(true);
    setActiveStepIndex(0);

    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLocation([lat, lng]);
          setLocationAccuracy(pos.coords.accuracy);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 3000 }
      );
    }
  };

  const handleExitNavigation = () => {
    setIsNavigating(false);
    if (watchIdRef.current !== null && typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  // When user searches for a place
  const handleSelectSearchPlace = (place: any) => {
    const loc: LocationItem = {
      name: place.name,
      latitude: place.latitude,
      longitude: place.longitude,
      category: place.category,
    };
    setInspectedLocation(loc);
    setDestinationLocation(loc);
    setFlyToCoord({ lat: loc.latitude, lng: loc.longitude, zoom: 16 });

    // Instantly calculate route from current start origin to selected destination
    const origLat = startLocation ? startLocation.latitude : (userLocation ? userLocation[0] : 17.6645);
    const origLng = startLocation ? startLocation.longitude : (userLocation ? userLocation[1] : 75.8935);
    const origName = startLocation ? startLocation.name : 'Start Location';

    api.getDirections({
      startLat: origLat,
      startLng: origLng,
      destLat: loc.latitude,
      destLng: loc.longitude,
      mode: 'driving',
    }).then((data) => {
      setRouteData({
        start: [origLat, origLng],
        destination: [loc.latitude, loc.longitude],
        startName: origName,
        destinationName: loc.name,
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
        mode: 'driving',
        steps: data.steps || [],
        alternatives: data.alternatives || [],
      });
    }).catch(() => {});
  };

  // When user clicks anywhere on map
  const handleMapClick = (coord: [number, number]) => {
    if (!isNavigating) {
      const loc: LocationItem = {
        name: `Map Pin (${coord[0].toFixed(4)}, ${coord[1].toFixed(4)})`,
        latitude: coord[0],
        longitude: coord[1],
        category: 'Selected Coordinates',
      };
      setInspectedLocation(loc);
      setFlyToCoord({ lat: coord[0], lng: coord[1], zoom: 15 });
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-slate-100 flex overflow-hidden">
      
      {/* 1. TOP FLOATING CONTROL BAR */}
      <div className="absolute top-4 left-4 right-4 sm:right-auto sm:w-96 z-30 pointer-events-auto space-y-3">
        
        {/* Search Input & GPS Locate button */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <PlaceSearch
              onSelectPlace={handleSelectSearchPlace}
              centerLat={userLocation ? userLocation[0] : 17.6599}
              centerLng={userLocation ? userLocation[1] : 75.9064}
            />
          </div>
          
          <button
            onClick={handleLocateMe}
            disabled={gpsLoading}
            title={t('map.locateMe', 'My GPS Location')}
            className="p-2.5 rounded-xl bg-white/95 backdrop-blur-md hover:bg-white text-emerald-700 hover:text-emerald-800 border border-slate-200 shadow-sm flex items-center justify-center shrink-0 transition-all active:scale-95"
          >
            <LocateFixed className={`w-4 h-4 ${gpsLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setRoutePlannerOpen(!routePlannerOpen)}
            className={`p-2.5 rounded-xl border shadow-sm flex items-center justify-center shrink-0 transition-all ${
              routePlannerOpen 
                ? 'bg-emerald-600 text-white border-emerald-600' 
                : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-white'
            }`}
            title="Toggle Route Planner"
          >
            <Navigation className="w-4 h-4" />
          </button>
        </div>

        {/* GPS Error Notification */}
        {gpsError && (
          <div className="bg-amber-50 border border-amber-300 text-amber-900 p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{gpsError}</span>
            </div>
            <button onClick={() => setGpsError(null)} className="p-1 hover:bg-amber-100 rounded text-amber-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Route Planner Panel */}
        {routePlannerOpen && !isNavigating && (
          <RoutePlanner
            userLocation={userLocation}
            startLocation={startLocation}
            destinationLocation={destinationLocation}
            onSetStartLocation={(loc) => setStartLocation(loc)}
            onSetDestinationLocation={(loc) => setDestinationLocation(loc)}
            onRouteCalculated={(route) => {
              setRouteData(route);
              if (route.routeCoords.length > 0) {
                setFlyToCoord({ lat: route.start[0], lng: route.start[1], zoom: 14 });
              }
            }}
            onStartNavigation={handleStartNavigation}
            onClose={() => setRoutePlannerOpen(false)}
          />
        )}

        {/* 2. THE 4 ENVIRONMENTAL POINTS CARD (When RoutePlanner is closed) */}
        {!routePlannerOpen && !isNavigating && inspectedLocation && (
          <LocationInspectorCard
            location={inspectedLocation}
            onNavigateHere={(loc) => {
              setDestinationLocation(loc);
              setRoutePlannerOpen(true);
            }}
            onSetAsStart={(loc) => {
              setStartLocation(loc);
              setRoutePlannerOpen(true);
            }}
            onClose={() => setInspectedLocation(null)}
          />
        )}
      </div>

      {/* 2B. THE 4 ENVIRONMENTAL POINTS DOCK (When RoutePlanner is open) */}
      {routePlannerOpen && !isNavigating && inspectedLocation && (
        <div className="absolute top-4 right-4 w-96 max-w-[calc(100vw-2rem)] z-30 pointer-events-auto">
          <LocationInspectorCard
            location={inspectedLocation}
            onNavigateHere={(loc) => {
              setDestinationLocation(loc);
            }}
            onSetAsStart={(loc) => {
              setStartLocation(loc);
            }}
            onClose={() => setInspectedLocation(null)}
          />
        </div>
      )}

      {/* 3. TURN-BY-TURN NAVIGATION HUD */}
      {isNavigating && routeData && (
        <NavigationPanel
          isNavigating={isNavigating}
          activeStepIndex={activeStepIndex}
          steps={routeData.steps}
          totalDistanceKm={routeData.distanceKm}
          totalDurationMin={routeData.durationMin}
          destinationName={routeData.destinationName}
          travelMode={routeData.mode}
          onNextStep={() => setActiveStepIndex((prev) => Math.min(routeData.steps.length - 1, prev + 1))}
          onPrevStep={() => setActiveStepIndex((prev) => Math.max(0, prev - 1))}
          onRecalculate={() => {
            if (destinationLocation && startLocation) {
              api.getDirections({
                startLat: userLocation ? userLocation[0] : startLocation.latitude,
                startLng: userLocation ? userLocation[1] : startLocation.longitude,
                destLat: destinationLocation.latitude,
                destLng: destinationLocation.longitude,
                mode: routeData.mode,
              }).then((data) => {
                setRouteData({
                  ...routeData,
                  routeCoords: data.coordinates,
                  distanceKm: data.distance_km,
                  durationMin: data.duration_minutes,
                  steps: data.steps || [],
                });
                setActiveStepIndex(0);
              });
            }
          }}
          onExitNavigation={handleExitNavigation}
        />
      )}

      {/* 4. GIS LAYERS ACCORDION CONTROL (BOTTOM LEFT) */}
      <div className="absolute bottom-5 left-4 z-20">
        <button
          onClick={() => setLayersOpen(!layersOpen)}
          className="px-3 py-2 bg-white/95 backdrop-blur-md hover:bg-white text-slate-800 text-xs font-bold rounded-xl shadow-md border border-slate-200 flex items-center gap-2 transition-all"
        >
          <Layers className="w-4 h-4 text-emerald-600" />
          <span>{t('map.layers', 'Layers')}</span>
          {layersOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>

        {layersOpen && (
          <div className="mt-2 bg-white/95 backdrop-blur-md p-3 rounded-xl shadow-lg border border-slate-200 w-52 space-y-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 hover:text-slate-900">
              <input
                type="checkbox"
                checked={activeLayers.greenSpaces}
                onChange={() => toggleLayer('greenSpaces')}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>{t('map.layerGreenSpaces', 'Parks & Gardens')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 hover:text-slate-900">
              <input
                type="checkbox"
                checked={activeLayers.wards}
                onChange={() => toggleLayer('wards')}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>{t('map.layerWards', 'Ward Boundaries')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 hover:text-slate-900">
              <input
                type="checkbox"
                checked={activeLayers.reports}
                onChange={() => toggleLayer('reports')}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>{t('map.layerReports', 'Citizen Reports')}</span>
            </label>
          </div>
        )}
      </div>

      {/* 5. LIVE GIS MAP COMPONENT */}
      <div className="w-full h-full">
        <LiveMap
          greenSpaces={greenSpaces}
          wards={wards}
          reports={reports}
          userLocation={userLocation}
          locationAccuracy={locationAccuracy}
          routeData={routeData}
          activeStepIndex={activeStepIndex}
          flyToCoord={flyToCoord}
          inspectedPoint={inspectedLocation}
          onSelectGreenSpace={(gs) => {
            const loc: LocationItem = {
              name: gs.name,
              latitude: gs.latitude,
              longitude: gs.longitude,
              category: gs.category,
            };
            setInspectedLocation(loc);
            setDestinationLocation(loc);
          }}
          onGetDirections={(dest) => {
            setDestinationLocation(dest);
            setRoutePlannerOpen(true);
          }}
          onMapClickLocation={handleMapClick}
        />
      </div>
    </div>
  );
}
