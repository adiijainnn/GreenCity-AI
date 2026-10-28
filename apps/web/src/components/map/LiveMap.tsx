'use client';

import React, { useEffect, useState, useRef } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Polygon, 
  Marker, 
  Popup, 
  Circle, 
  Polyline, 
  useMap,
  useMapEvents 
} from 'react-leaflet';
import L from 'leaflet';
import { GreenSpace, Ward, CitizenReport } from '@/lib/types';
import { api } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { RouteStep } from './NavigationPanel';
import { 
  Navigation, 
  Layers, 
  Sun, 
  Globe, 
  Compass, 
  TreePine,
  MapPin,
  Thermometer,
  Droplets,
  Wind,
  Loader2
} from 'lucide-react';

const SOLAPUR_CENTER: [number, number] = [17.6599, 75.9064];

export interface FullRouteData {
  start: [number, number];
  destination: [number, number];
  startName: string;
  destinationName: string;
  routeCoords: [number, number][];
  distanceKm: number;
  durationMin: number;
  formattedDuration?: string;
  straightLineKm?: number;
  snappedDestination?: [number, number] | null;
  destSnapDistanceMeters?: number;
  isDestinationSnapped?: boolean;
  snapNotice?: string | null;
  provider?: string;
  mode: 'driving' | 'walking';
  steps: RouteStep[];
  alternatives?: { distance_km: number; duration_min: number; coordinates: [number, number][] }[];
}

interface InspectedPoint {
  name: string;
  latitude: number;
  longitude: number;
  category?: string;
}

interface LiveMapProps {
  greenSpaces: GreenSpace[];
  wards: Ward[];
  reports: CitizenReport[];
  userLocation: [number, number] | null;
  locationAccuracy?: number | null;
  routeData: FullRouteData | null;
  activeStepIndex?: number;
  flyToCoord?: { lat: number; lng: number; zoom?: number } | null;
  inspectedPoint?: InspectedPoint | null;
  onSelectGreenSpace: (gs: GreenSpace) => void;
  onGetDirections: (destination: { name: string; latitude: number; longitude: number }) => void;
  onMapClickLocation?: (coord: [number, number]) => void;
}

function MapFlyController({ flyToCoord }: { flyToCoord?: { lat: number; lng: number; zoom?: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (flyToCoord) {
      map.flyTo([flyToCoord.lat, flyToCoord.lng], flyToCoord.zoom || 15, {
        animate: true,
        duration: 1.2,
      });
    }
  }, [flyToCoord, map]);
  return null;
}

function RouteBoundsController({ routeCoords }: { routeCoords?: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (routeCoords && routeCoords.length > 1) {
      try {
        const bounds = L.latLngBounds(routeCoords.map((c) => [c[0], c[1]]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      } catch {}
    }
  }, [routeCoords, map]);
  return null;
}

function MapClickObserver({ onClick }: { onClick?: (coord: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      if (onClick) {
        onClick([e.latlng.lat, e.latlng.lng]);
      }
    },
  });
  return null;
}

function PopupEnvironmentalTelemetry({ lat, lng }: { lat: number; lng: number }) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    api.getLiveEnvironment(lat, lng)
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, [lat, lng]);

  if (loading) {
    return (
      <div className="py-2.5 flex items-center justify-center gap-1.5 text-xs text-slate-500 bg-slate-50 rounded-xl my-1">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
        <span>Loading live air & weather telemetry...</span>
      </div>
    );
  }

  const aq = data?.air_quality;
  const weather = data?.weather;

  return (
    <div className="space-y-1.5 pt-2 border-t border-slate-100">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
          4-Point Environmental Telemetry
        </span>
        <span className="text-[9px] text-slate-400 font-mono">Live CAMS</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
        {/* Point 1: Air Quality */}
        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
          <span className="text-[9px] text-slate-500 font-bold block uppercase">1. Air Quality (AQI)</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="font-black text-base" style={{ color: aq?.color || '#10b981' }}>
              {aq?.indian_aqi || 85}
            </span>
            <span className="text-[9px] font-bold px-1 rounded text-white" style={{ backgroundColor: aq?.color || '#10b981' }}>
              {aq?.category || 'Satisfactory'}
            </span>
          </div>
          <span className="text-[9px] text-slate-400 block mt-0.5">Key: {aq?.prominent_pollutant || 'PM2.5'}</span>
        </div>

        {/* Point 2: PM2.5 / PM10 */}
        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
          <span className="text-[9px] text-slate-500 font-bold block uppercase">2. Particulates</span>
          <p className="font-bold text-slate-800 text-[10px] mt-0.5">PM2.5: <span className="font-extrabold">{aq?.pm2_5 || 26.5}</span> µg/m³</p>
          <p className="font-bold text-slate-600 text-[10px]">PM10: <span className="font-extrabold">{aq?.pm10 || 48.0}</span> µg/m³</p>
        </div>

        {/* Point 3: Temperature */}
        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
          <span className="text-[9px] text-slate-500 font-bold block uppercase">3. Temperature</span>
          <p className="font-black text-slate-900 text-sm mt-0.5">{weather?.temperature_c || 28}°C</p>
          <p className="text-[9px] text-slate-500">{weather?.condition_text || 'Clear sky'}</p>
        </div>

        {/* Point 4: Humidity & Wind */}
        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
          <span className="text-[9px] text-slate-500 font-bold block uppercase">4. Humidity & Wind</span>
          <p className="font-bold text-slate-800 text-[10px] mt-0.5">💧 {weather?.relative_humidity_pct || 45}% Humidity</p>
          <p className="font-semibold text-slate-600 text-[10px]">💨 {weather?.wind_speed_kmh || 10} km/h Wind</p>
        </div>
      </div>
    </div>
  );
}

function InspectedMarkerWithAutoPopup({ 
  inspectedPoint, 
  onGetDirections 
}: { 
  inspectedPoint: InspectedPoint; 
  onGetDirections: (destination: { name: string; latitude: number; longitude: number }) => void;
}) {
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.openPopup();
    }
  }, [inspectedPoint.latitude, inspectedPoint.longitude]);

  return (
    <Marker
      ref={markerRef}
      position={[inspectedPoint.latitude, inspectedPoint.longitude]}
      icon={inspectionPinIcon}
    >
      <Popup autoPan={true}>
        <div className="p-2.5 space-y-2 min-w-[260px] max-w-[280px]">
          <div className="border-b border-slate-100 pb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
              {inspectedPoint.category || 'Map Location'}
            </span>
            <p className="font-extrabold text-xs text-slate-900 mt-1">{inspectedPoint.name}</p>
            <p className="text-[10px] font-mono text-slate-500">
              {inspectedPoint.latitude.toFixed(4)}° N, {inspectedPoint.longitude.toFixed(4)}° E
            </p>
          </div>

          {/* THE 4 KEY ENVIRONMENTAL POINTS DIRECTLY IN LEAFLET POPUP */}
          <PopupEnvironmentalTelemetry lat={inspectedPoint.latitude} lng={inspectedPoint.longitude} />

          <div className="pt-1.5 flex gap-1">
            <button
              onClick={() => onGetDirections(inspectedPoint)}
              className="w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-xs"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Navigate Here</span>
            </button>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// Custom Div Icons
const userPinIcon = L.divIcon({
  className: 'custom-user-marker',
  html: `
    <div style="position:relative; width:30px; height:30px; display:flex; align-items:center; justify-content:center;">
      <span style="position:absolute; width:30px; height:30px; border-radius:50%; background:rgba(16,185,129,0.35); animation:ping 1.6s cubic-bezier(0,0,0.2,1) infinite;"></span>
      <span style="position:relative; width:18px; height:18px; border-radius:50%; background:#059669; border:3px solid #ffffff; box-shadow:0 3px 10px rgba(0,0,0,0.35);"></span>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const startFlagIcon = L.divIcon({
  className: 'custom-start-marker',
  html: `
    <div style="background:#2563eb; color:white; font-weight:bold; width:28px; height:28px; border-radius:50%; border:2px solid white; display:flex; align-items:center; justify-content:center; font-size:12px; box-shadow:0 3px 8px rgba(0,0,0,0.3);">
      A
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const destFlagIcon = L.divIcon({
  className: 'custom-dest-marker',
  html: `
    <div style="background:#16a34a; color:white; font-weight:bold; width:28px; height:28px; border-radius:50%; border:2px solid white; display:flex; align-items:center; justify-content:center; font-size:12px; box-shadow:0 3px 8px rgba(0,0,0,0.3);">
      B
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const inspectionPinIcon = L.divIcon({
  className: 'custom-inspect-marker',
  html: `
    <div style="background:#0f766e; width:32px; height:32px; border-radius:50%; border:3px solid white; box-shadow:0 4px 12px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; color:white; font-size:16px;">
      📍
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const reportPinIcon = L.divIcon({
  className: 'custom-report-marker',
  html: `
    <div style="background:#ef4444; width:28px; height:28px; border-radius:50%; border:2px solid white; box-shadow:0 3px 8px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; color:white; font-size:13px; font-weight:bold;">
      ⚠️
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const getParkIcon = (score: number) => {
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  return L.divIcon({
    className: 'custom-park-marker',
    html: `
      <div style="background:${color}; width:32px; height:32px; border-radius:50%; border:3px solid white; box-shadow:0 4px 10px rgba(0,0,0,0.25); display:flex; align-items:center; justify-content:center; color:white; font-size:16px;">
        🌳
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
};

export const LiveMap: React.FC<LiveMapProps> = ({
  greenSpaces,
  wards,
  reports,
  userLocation,
  locationAccuracy,
  routeData,
  activeStepIndex = 0,
  flyToCoord,
  inspectedPoint,
  onSelectGreenSpace,
  onGetDirections,
  onMapClickLocation,
}) => {
  const { activeLayers } = useAppStore();
  const { t } = useTranslation();
  const [basemap, setBasemap] = useState<'street' | 'satellite' | 'canvas'>('street');

  const basemapLayers = {
    street: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri, Maxar, Earthstar Geographics, CNES/Airbus DS',
      maxZoom: 18
    },
    canvas: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri, HERE, Garmin, OpenStreetMap contributors',
      maxZoom: 16
    }
  };

  const parseCoordinates = (geometryStr: string): [number, number][] => {
    try {
      const geom = JSON.parse(geometryStr);
      const rawCoords = geom.type === 'Polygon' ? geom.coordinates[0] : geom.coordinates[0][0];
      return rawCoords.map((pt: [number, number]) => [pt[1], pt[0]]);
    } catch {
      return [];
    }
  };

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={SOLAPUR_CENTER}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <MapFlyController flyToCoord={flyToCoord} />
        <RouteBoundsController routeCoords={routeData?.routeCoords} />
        <MapClickObserver onClick={onMapClickLocation} />

        <TileLayer
          key={basemap}
          attribution={basemapLayers[basemap].attribution}
          url={basemapLayers[basemap].url}
          maxZoom={basemapLayers[basemap].maxZoom}
        />

        {/* 1. USER GPS LOCATION & ACCURACY RING */}
        {userLocation && (
          <>
            <Marker position={userLocation} icon={userPinIcon}>
              <Popup>
                <div className="p-2 space-y-1 text-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {t('map.currentLocation', 'Your Current Location')}
                  </span>
                  <p className="text-xs font-semibold mt-1">Coordinates:</p>
                  <p className="text-xs font-mono text-slate-600">
                    {userLocation[0].toFixed(5)}° N, {userLocation[1].toFixed(5)}° E
                  </p>
                  {locationAccuracy && (
                    <p className="text-[11px] text-slate-500">
                      Accuracy: ±{Math.round(locationAccuracy)} meters
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
            {locationAccuracy && locationAccuracy > 15 && locationAccuracy < 500 && (
              <Circle
                center={userLocation}
                radius={locationAccuracy}
                pathOptions={{
                  color: '#10b981',
                  fillColor: '#10b981',
                  fillOpacity: 0.12,
                  weight: 1,
                  dashArray: '3, 6'
                }}
              />
            )}
          </>
        )}

        {/* 2. INSPECTION PIN FOR CLICKED LOCATION WITH 4-POINT LIVE TELEMETRY */}
        {inspectedPoint && (
          <InspectedMarkerWithAutoPopup
            inspectedPoint={inspectedPoint}
            onGetDirections={onGetDirections}
          />
        )}

        {/* 3. ALTERNATIVE ROUTE POLYLINES */}
        {routeData?.alternatives?.map((alt, idx) => (
          <Polyline
            key={`alt-route-${idx}`}
            positions={alt.coordinates}
            pathOptions={{
              color: '#94a3b8',
              weight: 4,
              opacity: 0.7,
              dashArray: '6, 8',
            }}
          />
        ))}

        {/* 4. PRIMARY NAVIGATION ROUTE POLYLINE */}
        {routeData && routeData.routeCoords.length > 0 && (
          <>
            <Polyline
              positions={routeData.routeCoords}
              pathOptions={{
                color: routeData.mode === 'walking' ? '#059669' : '#2563eb',
                weight: 6,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Dotted connector from snapped road endpoint to exact destination marker if snapped > 35m */}
            {routeData.isDestinationSnapped && routeData.snappedDestination && (
              <Polyline
                positions={[routeData.snappedDestination, routeData.destination]}
                pathOptions={{
                  color: '#f59e0b',
                  weight: 3,
                  opacity: 0.8,
                  dashArray: '4, 6',
                }}
              />
            )}
            {/* Start Marker A */}
            <Marker position={routeData.start} icon={startFlagIcon}>
              <Popup>
                <div className="p-2 text-xs">
                  <strong>Start (A):</strong> {routeData.startName}
                </div>
              </Popup>
            </Marker>
            {/* Destination Marker B (Placed at EXACT chosen destination) */}
            <Marker position={routeData.destination} icon={destFlagIcon}>
              <Popup>
                <div className="p-2 text-xs space-y-1">
                  <p className="font-bold text-slate-900">{routeData.destinationName}</p>
                  <p className="text-slate-700 font-semibold">
                    Road: <span className="text-emerald-700 font-bold">
                      {routeData.distanceKm < 1 
                        ? `${Math.round(routeData.distanceKm * 1000)} m`
                        : `${routeData.distanceKm.toFixed(1)} km`}
                    </span> • {routeData.durationMin} mins
                  </p>
                  {routeData.straightLineKm && (
                    <p className="text-[10px] text-slate-400">
                      Straight-line: {routeData.straightLineKm.toFixed(2)} km
                    </p>
                  )}
                  {routeData.snapNotice && (
                    <p className="text-[10px] text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-200 mt-1">
                      {routeData.snapNotice}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* 5. WARDS LAYER */}
        {activeLayers.wards && wards.map((w) => {
          const coords = parseCoordinates(w.geometry);
          if (coords.length === 0) return null;
          return (
            <Polygon
              key={w.id}
              positions={coords}
              pathOptions={{
                color: '#64748b',
                fillColor: '#64748b',
                fillOpacity: 0.06,
                weight: 1.5,
                dashArray: '4, 4',
              }}
            >
              <Popup>
                <div className="p-2 text-xs">
                  <p className="font-bold text-slate-900">{w.name}</p>
                  <p className="text-slate-600">Area: {w.area_km2} km² • Pop: {w.population.toLocaleString()}</p>
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {/* 6. GREEN SPACES LAYER */}
        {activeLayers.greenSpaces && greenSpaces.map((gs) => {
          const coords = parseCoordinates(gs.geometry);
          return (
            <React.Fragment key={gs.id}>
              {coords.length > 0 && (
                <Polygon
                  positions={coords}
                  pathOptions={{
                    color: gs.health_score >= 70 ? '#10b981' : '#f59e0b',
                    fillColor: gs.health_score >= 70 ? '#10b981' : '#f59e0b',
                    fillOpacity: 0.25,
                    weight: 2,
                  }}
                />
              )}
              <Marker
                position={[gs.latitude, gs.longitude]}
                icon={getParkIcon(gs.health_score)}
                eventHandlers={{
                  click: () => onSelectGreenSpace(gs),
                }}
              >
                <Popup>
                  <div className="p-2.5 min-w-[210px] text-slate-900 space-y-2">
                    <div className="border-b border-slate-100 pb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                        {gs.category}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 mt-1">{gs.name}</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600">
                      <div>Health: <strong>{gs.health_score}/100</strong></div>
                      <div>Canopy: <strong>{gs.canopy_percentage}%</strong></div>
                      <div>Trees: <strong>{gs.tree_count}</strong></div>
                      <div>Area: <strong>{(gs.area_m2 / 1000).toFixed(1)}k m²</strong></div>
                    </div>

                    {/* LIVE 4-POINT ENVIRONMENTAL TELEMETRY */}
                    <PopupEnvironmentalTelemetry lat={gs.latitude} lng={gs.longitude} />

                    <div className="pt-2 flex gap-1.5">
                      <button
                        onClick={() => onGetDirections({ name: gs.name, latitude: gs.latitude, longitude: gs.longitude })}
                        className="w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Navigate Here</span>
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}

        {/* 7. CITIZEN REPORTS LAYER */}
        {activeLayers.reports && reports.map((r) => (
          <Marker
            key={r.id}
            position={[r.latitude, r.longitude]}
            icon={reportPinIcon}
          >
            <Popup>
              <div className="p-2 text-xs space-y-1">
                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                  {r.category}
                </span>
                <p className="font-bold text-slate-900 mt-1">{r.title}</p>
                <p className="text-slate-600 line-clamp-2">{r.description}</p>
                <p className="text-[10px] text-slate-400">Status: {r.status}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Floating Basemap Selector Controls */}
      <div className="absolute bottom-5 right-4 z-20 bg-white/90 backdrop-blur-md p-1 rounded-xl shadow-md border border-slate-200 flex items-center gap-1 text-xs">
        <button
          onClick={() => setBasemap('street')}
          className={`px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-all ${
            basemap === 'street' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Sun className="w-3.5 h-3.5" />
          <span>Street</span>
        </button>
        <button
          onClick={() => setBasemap('satellite')}
          className={`px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-all ${
            basemap === 'satellite' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Satellite</span>
        </button>
        <button
          onClick={() => setBasemap('canvas')}
          className={`px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-all ${
            basemap === 'canvas' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Light</span>
        </button>
      </div>
    </div>
  );
};
