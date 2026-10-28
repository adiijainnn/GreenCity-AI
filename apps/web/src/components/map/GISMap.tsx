'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, LayerGroup, CircleMarker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { GreenSpace, Ward, CitizenReport } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import { MapPin, Navigation, Eye, AlertTriangle, Layers, Sun, Globe, Compass, Route } from 'lucide-react';
import Link from 'next/link';

// Solapur Center Coordinates
const SOLAPUR_CENTER: [number, number] = [17.6599, 75.9064];

export interface RouteInfo {
  start: [number, number];
  destination: [number, number];
  startName: string;
  destinationName: string;
  routeCoords: [number, number][];
  distanceKm: number;
  durationMin: number;
  mode: 'driving' | 'walking';
}

interface GISMapProps {
  greenSpaces: GreenSpace[];
  wards: Ward[];
  reports: CitizenReport[];
  onSelectGreenSpace: (gs: GreenSpace) => void;
  userLocation?: [number, number] | null;
  routeInfo?: RouteInfo | null;
  flyToCoord?: { lat: number; lng: number; zoom?: number } | null;
  onGetDirections?: (destination: GreenSpace) => void;
}

// Map flight controller component
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

// Crisp HTML Div Icons
const userPinIcon = L.divIcon({
  className: 'custom-user-marker',
  html: `
    <div style="position:relative; width:28px; height:28px; display:flex; align-items:center; justify-content:center;">
      <span style="position:absolute; width:28px; height:28px; border-radius:50%; background:rgba(37,99,235,0.35); animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></span>
      <span style="position:relative; width:18px; height:18px; border-radius:50%; background:#2563eb; border:3px solid #ffffff; box-shadow:0 3px 10px rgba(0,0,0,0.3);"></span>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const reportPinIcon = L.divIcon({
  className: 'custom-report-marker',
  html: `
    <div style="background:#ef4444; width:30px; height:30px; border-radius:50%; border:3px solid white; box-shadow:0 4px 10px rgba(0,0,0,0.25); display:flex; align-items:center; justify-content:center; color:white; font-size:14px; font-weight:bold;">
      ⚠️
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -18],
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

const destinationFlagIcon = L.divIcon({
  className: 'custom-dest-marker',
  html: `
    <div style="background:#16a34a; color:white; font-weight:bold; width:28px; height:28px; border-radius:50%; border:2px solid white; display:flex; align-items:center; justify-content:center; font-size:12px; box-shadow:0 3px 8px rgba(0,0,0,0.3);">
      B
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const getParkIcon = (score: number) => {
  const color = score >= 60 ? '#16a34a' : score >= 40 ? '#d97706' : '#dc2626';
  return L.divIcon({
    className: 'custom-park-marker',
    html: `
      <div style="background:${color}; width:32px; height:32px; border-radius:50%; border:3px solid white; box-shadow:0 4px 12px rgba(0,0,0,0.2); display:flex; align-items:center; justify-content:center; color:white; font-size:16px;">
        🌳
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
};

export const GISMap: React.FC<GISMapProps> = ({ 
  greenSpaces, 
  wards, 
  reports, 
  onSelectGreenSpace,
  userLocation,
  routeInfo,
  flyToCoord,
  onGetDirections
}) => {
  const { activeLayers } = useAppStore();
  // Default to clean street basemap (light mode with clear road names, area names, and landmarks)
  const [basemap, setBasemap] = useState<'street' | 'satellite' | 'canvas'>('street');

  const parseCoordinates = (geometryStr: string): [number, number][] => {
    try {
      const geom = JSON.parse(geometryStr);
      const rawCoords = geom.type === 'Polygon' ? geom.coordinates[0] : geom.coordinates[0][0];
      return rawCoords.map((pt: [number, number]) => [pt[1], pt[0]]);
    } catch (e) {
      return [];
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return '#16a34a'; // Strong Green
    if (score >= 60) return '#059669'; // Emerald
    if (score >= 40) return '#d97706'; // Amber
    if (score >= 20) return '#ea580c'; // Orange
    return '#dc2626'; // Red
  };

  // High-performance light & satellite tile providers
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

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={SOLAPUR_CENTER}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <MapFlyController flyToCoord={flyToCoord} />

        {/* Selected Basemap Layer */}
        <TileLayer
          key={basemap}
          attribution={basemapLayers[basemap].attribution}
          url={basemapLayers[basemap].url}
          maxZoom={basemapLayers[basemap].maxZoom}
        />

        {/* USER CURRENT GPS LOCATION MARKER */}
        {userLocation && (
          <Marker position={userLocation} icon={userPinIcon}>
            <Popup>
              <div className="p-2 space-y-1 text-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Your GPS Location
                </span>
                <p className="text-xs font-semibold mt-1">Current Coordinates:</p>
                <p className="text-xs font-mono text-slate-600">
                  {userLocation[0].toFixed(4)}° N, {userLocation[1].toFixed(4)}° E
                </p>
                <p className="text-[11px] text-slate-500">Live Solapur Location</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* START-TO-END NAVIGATION ROUTE POLYLINE */}
        {routeInfo && routeInfo.routeCoords.length > 0 && (
          <>
            <Polyline
              positions={routeInfo.routeCoords}
              pathOptions={{
                color: '#2563eb',
                weight: 6,
                opacity: 0.85,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Start point marker */}
            <Marker position={routeInfo.start} icon={startFlagIcon}>
              <Popup>
                <div className="p-2 text-xs">
                  <strong>Start:</strong> {routeInfo.startName}
                </div>
              </Popup>
            </Marker>
            {/* Destination point marker */}
            <Marker position={routeInfo.destination} icon={destinationFlagIcon}>
              <Popup>
                <div className="p-2 text-xs">
                  <strong>Destination:</strong> {routeInfo.destinationName}
                  <p className="text-emerald-700 font-semibold">{routeInfo.distanceKm} km • ~{routeInfo.durationMin} mins</p>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* WARD BOUNDARIES LAYER */}
        {activeLayers.wards && wards.map((w) => {
          const positions = parseCoordinates(w.geometry);
          if (!positions.length) return null;
          return (
            <Polygon
              key={w.id}
              positions={positions}
              pathOptions={{
                color: '#2563eb',
                weight: 2,
                dashArray: '6, 6',
                fillColor: '#3b82f6',
                fillOpacity: 0.07,
              }}
            >
              <Popup>
                <div className="p-2 space-y-1.5 text-slate-900 min-w-[200px]">
                  <div className="flex items-center gap-1.5 text-blue-700 font-bold text-xs uppercase">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Solapur Municipal Zone</span>
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-900">{w.name}</h4>
                  <div className="text-xs text-slate-600 space-y-0.5">
                    <p>Area: <strong>{w.area_km2} km²</strong> • Population: <strong>{w.population.toLocaleString()}</strong></p>
                    <p className="text-emerald-700 font-medium">Green Coverage: <strong>{w.current_green_coverage_pct}%</strong> (Target: {w.target_green_coverage_pct}%)</p>
                  </div>
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {/* GREEN SPACES POLYGONS & MARKERS */}
        {activeLayers.greenSpaces && greenSpaces.map((gs) => {
          const positions = parseCoordinates(gs.geometry);
          const fillColor = getHealthColor(gs.health_score);

          return (
            <React.Fragment key={gs.id}>
              {positions.length > 0 && (
                <Polygon
                  positions={positions}
                  pathOptions={{
                    color: fillColor,
                    weight: 2.5,
                    fillColor: fillColor,
                    fillOpacity: 0.35,
                  }}
                  eventHandlers={{
                    click: () => onSelectGreenSpace(gs),
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
                  <div className="p-2.5 space-y-2 text-slate-900 min-w-[220px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {gs.category}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        Health {gs.health_score}/100
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-slate-900 leading-snug">{gs.name}</h4>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>Exact Location: {gs.latitude.toFixed(4)}° N, {gs.longitude.toFixed(4)}° E</span>
                      </p>
                    </div>

                    <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 space-y-0.5">
                      <p>🌳 Trees: <strong>{gs.tree_count}</strong> ({gs.canopy_percentage}% Canopy)</p>
                      <p>🍃 Carbon Absorbed: <strong>{gs.carbon_estimate} Tons CO₂</strong></p>
                    </div>

                    <div className="flex flex-col gap-1.5 pt-1">
                      {onGetDirections && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onGetDirections(gs);
                          }}
                          className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Get Directions Here</span>
                        </button>
                      )}
                      
                      <button
                        onClick={() => onSelectGreenSpace(gs)}
                        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Park Details</span>
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}

        {/* CITIZEN REPORTS PINS */}
        {activeLayers.reports && reports.map((r) => (
          <Marker
            key={r.id}
            position={[r.latitude, r.longitude]}
            icon={reportPinIcon}
          >
            <Popup>
              <div className="p-2 space-y-1.5 text-slate-900 min-w-[200px]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-800">
                    {r.priority} Priority
                  </span>
                  <span className="text-xs font-semibold text-slate-500">{r.status}</span>
                </div>
                <h4 className="font-bold text-xs text-slate-900">{r.title}</h4>
                <p className="text-[11px] text-slate-600 line-clamp-2">{r.description}</p>
                <p className="text-[10px] text-slate-500 font-mono">Location: {r.latitude.toFixed(4)}° N, {r.longitude.toFixed(4)}° E</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* HEAT RISK OVERLAY */}
        {activeLayers.heatRisk && (
          <LayerGroup>
            {/* Hotgi Road Industrial Corridor */}
            <CircleMarker 
              center={[17.6450, 75.9400]} 
              radius={40} 
              pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 0.35 }} 
            >
              <Popup>
                <div className="text-xs text-slate-900 p-1">
                  <strong className="text-red-700">High Heat Zone: +3.8°C</strong>
                  <p className="text-[11px] text-slate-600 mt-0.5">Hotgi Road Industrial Area — Needs more shade trees</p>
                </div>
              </Popup>
            </CircleMarker>

            {/* Ashok Chowk */}
            <CircleMarker 
              center={[17.6870, 75.9190]} 
              radius={30} 
              pathOptions={{ color: '#ea580c', fillColor: '#f97316', fillOpacity: 0.35 }} 
            >
              <Popup>
                <div className="text-xs text-slate-900 p-1">
                  <strong className="text-orange-700">Warm Traffic Junction: +2.6°C</strong>
                  <p className="text-[11px] text-slate-600 mt-0.5">Ashok Chowk commercial zone</p>
                </div>
              </Popup>
            </CircleMarker>
          </LayerGroup>
        )}

      </MapContainer>

      {/* Floating Basemap Switcher (Top Right) */}
      <div className="absolute top-4 right-4 z-[400] bg-white/95 backdrop-blur-md border border-slate-200 p-1.5 rounded-2xl flex items-center gap-1 shadow-md">
        <button
          onClick={() => setBasemap('street')}
          title="OpenStreetMap Street View"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            basemap === 'street' 
              ? 'bg-emerald-600 text-white shadow-xs' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Street Map</span>
        </button>

        <button
          onClick={() => setBasemap('satellite')}
          title="Satellite Imagery"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            basemap === 'satellite' 
              ? 'bg-emerald-600 text-white shadow-xs' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Satellite</span>
        </button>

        <button
          onClick={() => setBasemap('canvas')}
          title="Clean Light Canvas"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            basemap === 'canvas' 
              ? 'bg-emerald-600 text-white shadow-xs' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sun className="w-3.5 h-3.5" />
          <span>Light</span>
        </button>
      </div>

      {/* Solapur City Badge (Bottom Left) */}
      <div className="absolute bottom-6 left-6 z-[400] bg-white/95 backdrop-blur-md border border-slate-200 px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 shadow-sm pointer-events-none">
        <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
        <div>
          <span className="text-slate-900 font-bold block">Solapur, Maharashtra (SMC)</span>
          <span className="text-[11px] text-slate-500">Center: 17.6599° N, 75.9064° E</span>
        </div>
      </div>
    </div>
  );
};
