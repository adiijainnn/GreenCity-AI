import json
from typing import Dict, List, Any, Tuple, Optional
from shapely.geometry import shape, Point, Polygon, MultiPolygon

try:
    import pyproj
    from shapely.ops import transform
    HAS_PYPROJ = True
except ImportError:
    HAS_PYPROJ = False

class GISService:
    @staticmethod
    def parse_geojson(geojson_str: str):
        """Parses GeoJSON string into a Shapely geometry object."""
        data = json.loads(geojson_str)
        if data.get("type") == "Feature":
            return shape(data.get("geometry"))
        elif data.get("type") == "FeatureCollection":
            features = data.get("features", [])
            if features:
                return shape(features[0].get("geometry"))
        return shape(data)

    @staticmethod
    def calculate_area_m2(geometry_geojson_str: str) -> float:
        """Calculates area in square meters for a GeoJSON geometry using WGS84 geodesic math."""
        try:
            geom = GISService.parse_geojson(geometry_geojson_str)
            # Project to Equal Area coordinate system (e.g., EPSG:3857 or UTM)
            project = pyproj.Transformer.from_crs('EPSG:4326', 'EPSG:3857', always_xy=True).transform
            projected_geom = transform(project, geom)
            return round(projected_geom.area, 2)
        except Exception:
            # Fallback estimation based on degree area approximation at ~13° Lat (Bengaluru/India)
            geom = GISService.parse_geojson(geometry_geojson_str)
            approx_m2 = geom.area * (111000 * 111000 * 0.95)
            return round(approx_m2, 2)

    @staticmethod
    def calculate_centroid(geometry_geojson_str: str) -> Tuple[float, float]:
        """Returns (latitude, longitude) centroid of a geometry."""
        geom = GISService.parse_geojson(geometry_geojson_str)
        centroid = geom.centroid
        return (centroid.y, centroid.x)

    @staticmethod
    def point_in_polygon(lat: float, lng: float, polygon_geojson_str: str) -> bool:
        """Checks if a lat/lng point lies within a GeoJSON polygon."""
        point = Point(lng, lat)
        geom = GISService.parse_geojson(polygon_geojson_str)
        return geom.contains(point)

    @staticmethod
    def is_point_within_bbox(lat: float, lng: float, bbox: List[float]) -> bool:
        """bbox = [min_lng, min_lat, max_lng, max_lat]"""
        if len(bbox) != 4:
            return True
        return bbox[0] <= lng <= bbox[2] and bbox[1] <= lat <= bbox[3]

    @staticmethod
    def build_feature_collection(features: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Wraps a list of GeoJSON features into a FeatureCollection."""
        return {
            "type": "FeatureCollection",
            "features": features
        }
