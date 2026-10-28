# GreenCity AI — REST API Reference

API Base Path: `/api/v1`

## Key Endpoint Summary

### Auth & RBAC
- `POST /api/v1/auth/register`: Register new user account.
- `POST /api/v1/auth/login`: Authenticate and receive JWT access token.
- `GET /api/v1/auth/me`: Retrieve active authenticated user details.

### Wards & Spatial Data
- `GET /api/v1/wards`: List all municipal wards with current green coverage % and priority scores.
- `GET /api/v1/wards/geojson`: Export ward boundaries as GeoJSON FeatureCollection.
- `GET /api/v1/wards/{id}`: Retrieve detailed ward record.

### Green Spaces
- `GET /api/v1/green-spaces`: Query green spaces (supports `category`, `ward_id`, `min_health`, `bbox`).
- `GET /api/v1/green-spaces/geojson`: Export green space polygons as GeoJSON.
- `GET /api/v1/green-spaces/{id}`: Detailed green space metrics and trends.
- `POST /api/v1/green-spaces`: Create new green space (Requires `OFFICER` or `ADMIN` role).

### Citizen Reports
- `GET /api/v1/reports`: List citizen reports with status filters.
- `POST /api/v1/reports`: Submit new citizen environmental report.
- `PATCH /api/v1/reports/{id}/status`: Update report status, assign officer, issue public response (Officer role required).

### Analytics & AI Insights
- `GET /api/v1/analytics/city`: Overall city green statistics and ward ranking.
- `GET /api/v1/analytics/compare?ward_a_id=...&ward_b_id=...`: Side-by-side ward comparison.
- `GET /api/v1/insights`: List explainable AI recommendations.
- `POST /api/v1/insights/generate`: Trigger fresh AI recommendation inference.

### Admin Operations
- `GET /api/v1/admin/audit-logs`: Access security audit log entries.
- `GET /api/v1/admin/system-health`: System readiness and component health checks.
- `POST /api/v1/datasets/import`: Import GIS datasets.
