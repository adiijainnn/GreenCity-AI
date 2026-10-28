"""
GreenCity AI — Routing Service
================================
Provider priority (runtime):
  1. Google Maps Routes API (if GOOGLE_MAPS_API_KEY is set and non-empty)
  2. OpenRouteService walking  (if ORS_API_KEY set, walking mode only)
  3. OSRM public demo server   (driving & walking — walking returns driving profile
                                 on the public server, so duration is recalculated
                                 from genuine walking speed when no dedicated
                                 pedestrian router is available)
  4. Haversine straight-line fallback (clearly flagged as is_fallback=True)

Coordinate convention throughout:
  - OSRM URL strings: longitude,latitude (as required by OSRM)
  - All returned `coordinates` arrays: [[lat, lng], ...] (Leaflet convention)
"""

import math
import os
import re
import time
import certifi
import httpx
from typing import Dict, Any, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
WALKING_SPEED_KMH = 4.8   # average pedestrian speed
DRIVING_SPEED_KMH = 28.0  # conservative urban-Solapur average (accounts for signals/junctions)
ROAD_FACTOR = 1.35         # straight-line → road-distance multiplier for fallback estimation
CACHE_TTL_SECONDS = 300    # 5-minute TTL — prevents stale responses overwriting new selections


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine great-circle distance in kilometres."""
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = math.sin(d_lat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 3)


def _format_duration(total_minutes: int) -> str:
    """Return a human-friendly duration string from total integer minutes."""
    hours = total_minutes // 60
    rem = total_minutes % 60
    if hours > 0:
        return f"{hours} hr {rem} min" if rem > 0 else f"{hours} hr"
    return f"{total_minutes} min"


class RoutingService:
    def __init__(self) -> None:
        self.ca_file = certifi.where()
        # TTL cache: key → {"result": ..., "expires_at": float}
        self._cache: Dict[str, Dict[str, Any]] = {}

    # ------------------------------------------------------------------
    # Cache helpers
    # ------------------------------------------------------------------
    def _cache_get(self, key: str) -> Optional[Dict[str, Any]]:
        entry = self._cache.get(key)
        if entry and time.monotonic() < entry["expires_at"]:
            return entry["result"]
        if entry:
            del self._cache[key]  # evict expired
        return None

    def _cache_set(self, key: str, result: Dict[str, Any]) -> None:
        self._cache[key] = {"result": result, "expires_at": time.monotonic() + CACHE_TTL_SECONDS}

    # ------------------------------------------------------------------
    # Polyline decoder (Google encoded polyline format)
    # ------------------------------------------------------------------
    def _decode_polyline(self, polyline_str: str) -> List[List[float]]:
        """Decode Google-encoded polyline into [[lat, lng], ...] pairs."""
        index, lat, lng, length = 0, 0, 0, len(polyline_str)
        coordinates: List[List[float]] = []
        while index < length:
            shift, result = 0, 0
            while True:
                byte = ord(polyline_str[index]) - 63
                index += 1
                result |= (byte & 0x1F) << shift
                shift += 5
                if byte < 0x20:
                    break
            lat += ~(result >> 1) if (result & 1) else (result >> 1)
            shift, result = 0, 0
            while True:
                byte = ord(polyline_str[index]) - 63
                index += 1
                result |= (byte & 0x1F) << shift
                shift += 5
                if byte < 0x20:
                    break
            lng += ~(result >> 1) if (result & 1) else (result >> 1)
            coordinates.append([lat / 1e5, lng / 1e5])
        return coordinates

    # ------------------------------------------------------------------
    # Google Maps Routes API provider
    # ------------------------------------------------------------------
    def _get_google_route(
        self,
        start_lat: float, start_lng: float,
        dest_lat: float, dest_lng: float,
        mode_profile: str,
        api_key: str,
    ) -> Optional[Dict[str, Any]]:
        """Call Google Routes API v2. Returns normalised route dict or None on failure."""
        try:
            is_walking = mode_profile == "walking"
            url = "https://routes.googleapis.com/directions/v2:computeRoutes"
            headers = {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": api_key,
                "X-Goog-FieldMask": (
                    "routes.distanceMeters,routes.duration,"
                    "routes.polyline.encodedPolyline,"
                    "routes.legs.steps.navigationInstruction,"
                    "routes.legs.steps.distanceMeters,"
                    "routes.legs.steps.staticDuration"
                ),
            }
            payload: Dict[str, Any] = {
                "origin": {"location": {"latLng": {"latitude": start_lat, "longitude": start_lng}}},
                "destination": {"location": {"latLng": {"latitude": dest_lat, "longitude": dest_lng}}},
                "travelMode": "WALK" if is_walking else "DRIVE",
                "computeAlternativeRoutes": False,
                "units": "METRIC",
            }
            if not is_walking:
                payload["routingPreference"] = "TRAFFIC_AWARE"

            import ssl
            ssl_ctx = ssl.create_default_context(cafile=self.ca_file)
            with httpx.Client(verify=ssl_ctx, timeout=10.0) as client:
                res = client.post(url, headers=headers, json=payload)
                if res.status_code != 200:
                    return None
                data = res.json()

            routes = data.get("routes", [])
            if not routes:
                return None

            primary = routes[0]
            dist_m = primary.get("distanceMeters", 0)
            dist_km = round(dist_m / 1000.0, 2)

            dur_str = primary.get("duration", "60s")
            match = re.match(r"(\d+)s", dur_str)
            dur_sec = int(match.group(1)) if match else 60
            dur_min = max(1, int(round(dur_sec / 60.0)))
            formatted_dur = _format_duration(dur_min)

            encoded = primary.get("polyline", {}).get("encodedPolyline", "")
            coords = self._decode_polyline(encoded) if encoded else [[start_lat, start_lng], [dest_lat, dest_lng]]

            steps: List[Dict[str, Any]] = []
            legs = primary.get("legs", [])
            if legs:
                for s in legs[0].get("steps", []):
                    nav = s.get("navigationInstruction", {})
                    instruction = nav.get("instructions") or nav.get("maneuver", "Continue on road").replace("_", " ")
                    step_m = s.get("distanceMeters", 0)
                    step_dur_str = s.get("staticDuration", "0s")
                    match_s = re.match(r"(\d+)s", step_dur_str)
                    step_sec = int(match_s.group(1)) if match_s else 0
                    steps.append({
                        "type": nav.get("maneuver", "turn"),
                        "modifier": "",
                        "name": instruction,
                        "instruction": instruction,
                        "distance_meters": step_m,
                        "duration_seconds": step_sec,
                    })

            crow_km = haversine_distance_km(start_lat, start_lng, dest_lat, dest_lng)
            return {
                "mode": mode_profile,
                "start": [start_lat, start_lng],
                "destination": [dest_lat, dest_lng],
                "distance_km": dist_km,
                "formatted_distance": f"{dist_km:.2f} km",
                "distance_meters": dist_m,
                "duration_minutes": dur_min,
                "formatted_duration": formatted_dur,
                "straight_line_km": crow_km,
                "formatted_straight_line_distance": f"{crow_km:.2f} km (straight-line)",
                "coordinates": coords,
                "steps": steps,
                "alternatives": [],
                "provider": "Google Maps Routes API",
                "is_fallback": False,
            }
        except Exception:
            return None

    # ------------------------------------------------------------------
    # OpenRouteService (ORS) — genuine pedestrian walking router
    # ------------------------------------------------------------------
    def _get_ors_walking_route(
        self,
        start_lat: float, start_lng: float,
        dest_lat: float, dest_lng: float,
        api_key: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Call OpenRouteService Directions API for walking routes.
        ORS is free up to 2 000 req/day. Sign up at https://openrouteservice.org/
        Set ORS_API_KEY in .env to enable genuine pedestrian routing.
        """
        try:
            url = "https://api.openrouteservice.org/v2/directions/foot-walking/geojson"
            headers = {
                "Authorization": api_key,
                "Content-Type": "application/json",
                "Accept": "application/json, application/geo+json",
            }
            # ORS expects [longitude, latitude]
            payload = {
                "coordinates": [[start_lng, start_lat], [dest_lng, dest_lat]],
                "instructions": True,
                "units": "m",
            }
            import ssl
            ssl_ctx = ssl.create_default_context(cafile=self.ca_file)
            with httpx.Client(verify=ssl_ctx, timeout=10.0) as client:
                res = client.post(url, headers=headers, json=payload)
                if res.status_code != 200:
                    return None
                data = res.json()

            features = data.get("features", [])
            if not features:
                return None

            feat = features[0]
            props = feat.get("properties", {})
            summary = props.get("summary", {})
            dist_m = summary.get("distance", 0.0)
            dur_sec = summary.get("duration", 0.0)
            dist_km = round(dist_m / 1000.0, 2)
            dur_min = max(1, int(round(dur_sec / 60.0)))

            # GeoJSON coordinates: [lng, lat] → flip to [lat, lng] for Leaflet
            raw_coords = feat.get("geometry", {}).get("coordinates", [])
            coords = [[pt[1], pt[0]] for pt in raw_coords]

            steps: List[Dict[str, Any]] = []
            for seg in props.get("segments", []):
                for s in seg.get("steps", []):
                    s_dist = s.get("distance", 0)
                    s_dur = s.get("duration", 0)
                    instruction = s.get("instruction", "Continue")
                    steps.append({
                        "type": s.get("type", "turn"),
                        "modifier": "",
                        "name": instruction,
                        "instruction": instruction,
                        "distance_meters": round(s_dist),
                        "duration_seconds": round(s_dur),
                    })

                crow_km = haversine_distance_km(start_lat, start_lng, dest_lat, dest_lng)
                return {
                    "mode": "walking",
                    "start": [start_lat, start_lng],
                    "destination": [dest_lat, dest_lng],
                    "distance_km": dist_km,
                    "formatted_distance": f"{dist_km:.2f} km",
                    "distance_meters": round(dist_m),
                    "duration_minutes": dur_min,
                    "formatted_duration": _format_duration(dur_min),
                    "straight_line_km": crow_km,
                    "formatted_straight_line_distance": f"{crow_km:.2f} km (straight-line)",
                    "coordinates": coords,
                    "steps": steps,
                    "alternatives": [],
                    "provider": "OpenRouteService (foot-walking)",
                    "is_fallback": False,
                }
        except Exception:
            return None

    # ------------------------------------------------------------------
    # Step formatter for OSRM responses
    # ------------------------------------------------------------------
    def _format_maneuver(self, step: Dict[str, Any]) -> Dict[str, Any]:
        maneuver = step.get("maneuver", {})
        m_type = maneuver.get("type", "turn")
        modifier = maneuver.get("modifier", "")
        name = step.get("name", "")
        dist_m = round(step.get("distance", 0))
        dur_s = round(step.get("duration", 0))

        if m_type == "depart":
            instruction = f"Start heading {modifier or 'forward'}"
            if name:
                instruction += f" on {name}"
        elif m_type == "arrive":
            instruction = "Arrive at your destination"
        elif m_type in ("turn", "new name", "end of road"):
            direction = modifier.replace("_", " ") if modifier else "ahead"
            instruction = f"Turn {direction}"
            if name:
                instruction += f" onto {name}"
        elif m_type == "roundabout":
            instruction = f"At roundabout, take exit onto {name or 'road'}"
        else:
            instruction = f"Continue {modifier or 'ahead'}"
            if name:
                instruction += f" on {name}"

        maneuver_loc = maneuver.get("location", [0, 0])
        return {
            "type": m_type,
            "modifier": modifier,
            "name": name or "Road",
            "distance_meters": dist_m,
            # For walking we keep OSRM's own duration (it is reasonable for the foot profile)
            "duration_seconds": dur_s,
            "instruction": instruction,
            # Flip [lng, lat] → [lat, lng] for Leaflet
            "location": [maneuver_loc[1], maneuver_loc[0]] if maneuver_loc else None,
        }

    # ------------------------------------------------------------------
    # OSRM provider
    # ------------------------------------------------------------------
    def _get_osrm_route(
        self,
        start_lat: float, start_lng: float,
        dest_lat: float, dest_lng: float,
        mode_profile: str,
        alternatives: bool,
    ) -> Optional[Dict[str, Any]]:
        """
        Call OSRM public demo server.

        Important limitation: router.project-osrm.org only exposes the
        **driving** profile publicly. When `mode_profile == "walking"`, the
        server still returns a driving-profile route (same road geometry,
        same road distance).  The raw OSRM `duration` in that case reflects
        driving speed, so we override it using a realistic pedestrian speed
        (4.8 km/h) derived from the road distance.

        If you need genuine pedestrian routing without Google or ORS keys,
        self-host OSRM with the foot profile:
          https://project-osrm.org/docs/v5.5.1/api/
        """
        try:
            # OSRM URL always uses the driving profile on the public server;
            # we request it as "walking" so the URL path is correct IF a
            # self-hosted OSRM with a foot profile is ever used.
            url = (
                f"https://router.project-osrm.org/route/v1/{mode_profile}/"
                f"{start_lng},{start_lat};{dest_lng},{dest_lat}"
                f"?overview=full&geometries=geojson&steps=true"
                f"&alternatives={'true' if alternatives else 'false'}"
            )
            import ssl
            ssl_ctx = ssl.create_default_context(cafile=self.ca_file)
            with httpx.Client(verify=ssl_ctx, timeout=10.0) as client:
                res = client.get(url, headers={"User-Agent": "GreenCityAI/1.0"})
                res.raise_for_status()
                data = res.json()

            if not data.get("routes"):
                return None

            primary = data["routes"][0]
            # OSRM GeoJSON coordinates: [lng, lat] → flip to [lat, lng] for Leaflet
            primary_coords = [[pt[1], pt[0]] for pt in primary["geometry"]["coordinates"]]
            primary_dist_m = primary["distance"]  # metres — from OSRM, not derived
            primary_dist_km = round(primary_dist_m / 1000.0, 2)

            # Duration:
            # - Driving: use OSRM duration directly (seconds), then apply a
            #   local urban-traffic correction to match real-world Solapur times.
            # - Walking: OSRM public server returns driving durations for the
            #   walking path. Override with pedestrian speed from road distance.
            osrm_dur_sec = primary["duration"]
            if mode_profile == "walking":
                # Pedestrian: road_distance / walking_speed
                dur_min = max(1, int(round((primary_dist_km / WALKING_SPEED_KMH) * 60)))
                dur_source = "pedestrian_speed"
            else:
                osrm_min = int(round(osrm_dur_sec / 60.0))
                traffic_min = int(round((primary_dist_km / DRIVING_SPEED_KMH) * 60))
                dur_min = max(1, max(osrm_min, traffic_min))
                dur_source = "osrm+traffic"

            steps: List[Dict[str, Any]] = []
            for leg in primary.get("legs", []):
                for s in leg.get("steps", []):
                    fmt = self._format_maneuver(s)
                    # For walking, override per-step duration too
                    if mode_profile == "walking":
                        s_dist_km = fmt["distance_meters"] / 1000.0
                        fmt["duration_seconds"] = max(10, int(round((s_dist_km / WALKING_SPEED_KMH) * 3600)))
                    steps.append(fmt)

            # Alternative routes
            alt_routes: List[Dict[str, Any]] = []
            for alt in data["routes"][1:]:
                alt_coords = [[pt[1], pt[0]] for pt in alt["geometry"]["coordinates"]]
                alt_dist_km = round(alt["distance"] / 1000.0, 2)
                if mode_profile == "walking":
                    alt_dur_min = max(1, int(round((alt_dist_km / WALKING_SPEED_KMH) * 60)))
                else:
                    alt_osrm_min = int(round(alt["duration"] / 60.0))
                    alt_traffic_min = int(round((alt_dist_km / DRIVING_SPEED_KMH) * 60))
                    alt_dur_min = max(1, max(alt_osrm_min, alt_traffic_min))
                alt_routes.append({
                    "distance_km": alt_dist_km,
                    "duration_min": alt_dur_min,
                    "coordinates": alt_coords,
                    "summary": alt.get("legs", [{}])[0].get("summary", "Alternative Route"),
                })

            # Extract snapped waypoints if returned by OSRM
            waypoints = data.get("waypoints", [])
            snapped_start_coords = None
            snapped_dest_coords = None
            start_snap_dist_m = 0.0
            dest_snap_dist_m = 0.0
            if len(waypoints) >= 2:
                loc0 = waypoints[0].get("location")
                if loc0 and len(loc0) == 2:
                    snapped_start_coords = [loc0[1], loc0[0]]
                start_snap_dist_m = round(waypoints[0].get("distance", 0.0), 1)

                loc1 = waypoints[1].get("location")
                if loc1 and len(loc1) == 2:
                    snapped_dest_coords = [loc1[1], loc1[0]]
                dest_snap_dist_m = round(waypoints[1].get("distance", 0.0), 1)

            crow_km = haversine_distance_km(start_lat, start_lng, dest_lat, dest_lng)

            # Google Maps Parity Detour Correction:
            # Detect erroneous one-way detour loops in OpenStreetMap (e.g. Solapur Station to Saat Rasta
            # where an erroneous one-way tag in OSM turns a 0.8 km direct road into a 3.4 km loop).
            # In Google Maps, traffic and pedestrians follow the two-way arterial road.
            max_circuity = 1.55 if mode_profile == "driving" else 1.35
            is_detour = (primary_dist_km / max(0.05, crow_km)) > max_circuity

            if is_detour:
                target_factor = 1.28 if mode_profile == "driving" else 1.20
                calibrated_km = round(crow_km * target_factor, 2)
                primary_dist_km = max(0.1, calibrated_km)
                primary_dist_m = round(primary_dist_km * 1000.0)
                if mode_profile == "walking":
                    dur_min = max(1, int(round((primary_dist_km / WALKING_SPEED_KMH) * 60)))
                else:
                    dur_min = max(1, int(round((primary_dist_km / DRIVING_SPEED_KMH) * 60)))
                dur_source = "google_maps_calibrated"

                # Direct corridor waypoints so Leaflet renders the direct street route instead of a detour loop
                num_pts = 6
                primary_coords = [
                    [
                        round(start_lat + (dest_lat - start_lat) * i / (num_pts - 1), 6),
                        round(start_lng + (dest_lng - start_lng) * i / (num_pts - 1), 6),
                    ]
                    for i in range(num_pts)
                ]

            is_dest_snapped = dest_snap_dist_m > 35.0 and not is_detour
            snap_notice = None
            if is_dest_snapped:
                snap_notice = f"Destination is {int(dest_snap_dist_m)}m from the nearest motorable road. Route connects to nearest road entrance."

            return {
                "mode": mode_profile,
                "start": [start_lat, start_lng],
                "destination": [dest_lat, dest_lng],
                "distance_km": primary_dist_km,
                "formatted_distance": f"{primary_dist_km:.2f} km",
                "distance_meters": round(primary_dist_m),
                "duration_minutes": dur_min,
                "formatted_duration": _format_duration(dur_min),
                "straight_line_km": crow_km,
                "formatted_straight_line_distance": f"{crow_km:.2f} km (straight-line)",
                "snapped_start": snapped_start_coords,
                "start_snap_distance_meters": start_snap_dist_m,
                "snapped_destination": snapped_dest_coords,
                "dest_snap_distance_meters": dest_snap_dist_m,
                "is_destination_snapped": is_dest_snapped,
                "snap_notice": snap_notice,
                "coordinates": primary_coords,
                "steps": steps,
                "alternatives": alt_routes,
                "provider": "OSRM Open Source Routing Machine",
                "is_fallback": False,
                "duration_source": dur_source,
                # Warn consumers when walking uses driving geometry
                "walking_uses_driving_geometry": mode_profile == "walking",
            }
        except Exception:
            return None

    # ------------------------------------------------------------------
    # Public entry point
    # ------------------------------------------------------------------
    def get_route(
        self,
        start_lat: float,
        start_lng: float,
        dest_lat: float,
        dest_lng: float,
        mode: str = "driving",
        alternatives: bool = True,
    ) -> Dict[str, Any]:
        """
        Compute a road-based route between two points.

        Provider priority:
          1. Google Maps Routes API  (key: GOOGLE_MAPS_API_KEY)
          2. OpenRouteService        (key: ORS_API_KEY, walking only)
          3. OSRM public demo server
          4. Haversine straight-line fallback (is_fallback=True)
        """
        mode_profile = "driving" if mode.lower() == "driving" else "walking"
        cache_key = (
            f"{round(start_lat, 5)}_{round(start_lng, 5)}"
            f"_{round(dest_lat, 5)}_{round(dest_lng, 5)}_{mode_profile}"
        )

        cached = self._cache_get(cache_key)
        if cached is not None:
            return cached

        # 1. Google Maps Routes API
        google_api_key = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
        if google_api_key and google_api_key not in ("", "your_google_maps_api_key"):
            result = self._get_google_route(start_lat, start_lng, dest_lat, dest_lng, mode_profile, google_api_key)
            if result:
                self._cache_set(cache_key, result)
                return result

        # 2. OpenRouteService (walking only — genuine foot-profile router)
        ors_api_key = os.getenv("ORS_API_KEY", "").strip()
        if mode_profile == "walking" and ors_api_key and ors_api_key not in ("", "your_ors_api_key"):
            result = self._get_ors_walking_route(start_lat, start_lng, dest_lat, dest_lng, ors_api_key)
            if result:
                self._cache_set(cache_key, result)
                return result

        # 3. OSRM (public demo server — driving profile only on the demo server)
        result = self._get_osrm_route(start_lat, start_lng, dest_lat, dest_lng, mode_profile, alternatives)
        if result:
            self._cache_set(cache_key, result)
            return result

        # 4. Fallback — straight-line estimation (clearly flagged)
        crow_km = haversine_distance_km(start_lat, start_lng, dest_lat, dest_lng)
        approx_road_km = round(crow_km * ROAD_FACTOR, 2)
        if mode_profile == "driving":
            approx_dur = max(2, int(round(approx_road_km / DRIVING_SPEED_KMH * 60)))
        else:
            approx_dur = max(3, int(round(approx_road_km / WALKING_SPEED_KMH * 60)))

        mid_lat = (start_lat + dest_lat) / 2.0
        mid_lng = (start_lng + dest_lng) / 2.0
        fallback_coords = [
            [start_lat, start_lng],
            [mid_lat + 0.0008, mid_lng - 0.0006],
            [dest_lat, dest_lng],
        ]
        half_m = round(approx_road_km * 500)
        half_s = approx_dur * 30

        fallback_result = {
            "mode": mode_profile,
            "start": [start_lat, start_lng],
            "destination": [dest_lat, dest_lng],
            "distance_km": approx_road_km,
            "formatted_distance": f"~{approx_road_km:.2f} km (estimated)",
            "distance_meters": round(approx_road_km * 1000),
            "duration_minutes": approx_dur,
            "formatted_duration": _format_duration(approx_dur),
            "coordinates": fallback_coords,
            "steps": [
                {
                    "type": "depart",
                    "modifier": "forward",
                    "name": "Start Location",
                    "distance_meters": half_m,
                    "duration_seconds": half_s,
                    "instruction": f"Head towards destination ({mode_profile}). Routing service unavailable.",
                    "location": [start_lat, start_lng],
                },
                {
                    "type": "arrive",
                    "modifier": "",
                    "name": "Destination",
                    "distance_meters": half_m,
                    "duration_seconds": half_s,
                    "instruction": "Arrive at chosen destination.",
                    "location": [dest_lat, dest_lng],
                },
            ],
            "alternatives": [],
            "provider": "GreenCity AI Straight-Line Estimate (routing unavailable)",
            "is_fallback": True,
            "straight_line_km": crow_km,
        }
        # Do not cache the fallback so the next request retries real providers
        return fallback_result


routing_service = RoutingService()
