# GreenCity AI — GIS & Geospatial Methodology

## GIS Data Model & Standards
1. **Coordinate Reference System (CRS)**: WGS 84 (EPSG:4326) for standard GeoJSON storage, projected to EPSG:3857 (Web Mercator) for geodesic area calculations.
2. **PostGIS Fields**: Native `GEOMETRY(POLYGON, 4326)` and `GEOMETRY(POINT, 4326)` with GiST spatial indexing (`CREATE INDEX ... USING GIST(geometry)`).
3. **GeoJSON Standards**: Full compliance with RFC 7946 GeoJSON specification for Feature and FeatureCollection object payloads.

## Spatial Calculations
- **Polygon Area (m²)**: Calculated via Shapely / PyProj geodesic transformation to equal-area projection.
- **Centroids**: Calculated dynamically for MapLibre/Leaflet marker pin positioning.
- **Bounding Box Queries**: `GET /green-spaces?bbox=min_lng,min_lat,max_lng,max_lat` for efficient spatial viewport filtering.
- **Accessibility Buffers**: 300m (5-min walk), 500m (8-min walk), and 1000m catchments calculated using buffer expansions.
