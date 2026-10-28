# 🌿 GreenCity AI

> **Production-Grade Urban Green Space Intelligence, Real-Time Environmental Telemetry, GPS Routing with Google Maps Parity & Best Time to Visit Park Engine**  
> Context: **Solapur Municipal Corporation (SMC)**, Maharashtra, India (Wards 1–5: Central, North, South, East, and West Solapur).

---

## 🚀 Recent Upgrades & Advanced Capabilities

### 1. 🌤️ Best Time to Visit a Park (`/explore?tab=best-time`)
- **Deterministic 0–100 Environmental Scoring**: Combines thermal comfort, apparent temperature, relative humidity, wind, precipitation, and Indian CPCB NAQI air quality.
- **CPCB NAQI Air Quality Integration**: Real-time hourly particulate evaluation (PM2.5, PM10) using official Central Pollution Control Board (CPCB) breakpoints.
- **Strict Non-Negotiable Safety Overrides**:
  - Cool pleasant weather **never masks poor air quality**. If AQI > 200 (Poor), suitability is strictly capped at $\le 35$.
  - Severe air quality (AQI > 400) forces the suitability score to **0**.
  - Extreme midday heat ($T \ge 37^\circ\text{C}$) caps suitability at $\le 20$.
- **Morning vs. Evening Comparative Intelligence**: Objectively evaluates morning hours (05:00–10:00) against evening hours (16:00–20:00), detailing temperature differentials and traffic particulate accumulation.
- **Activity-Specific Suitability Ratings**: Dedicated health criteria for **Walking**, **Jogging** (sensitive to ventilation rate & PM2.5), **Intensive Outdoor Exercise**, **Family Outings & Children** (sensitive to midday UV & heat), and **General Park Visits**.
- **Interactive 24-Hour Forecast Chart**: Recharts area and line charts plotting temperature, suitability scores, and AQI with interactive tooltips and an hourly inspection strip.
- **Local Sun Cycle**: Sunrise, sunset, and golden hour times calculated in `Asia/Kolkata` local timezone.

### 2. 📅 Date of Choice Calendar Selection (`Date Horizon`)
- **Interactive Calendar Picker**: Citizens can select **any date of their choice** via a native date input (`<input type="date">`) to plan visits for upcoming days, weekends, or next week.
- **Quick Preset Shortcuts**: One-click shortcuts for **Today**, **Tomorrow**, and **Day After** synced seamlessly with the calendar picker.
- **14-Day Numerical Forecast Horizon**: Open-Meteo weather and Copernicus CAMS atmospheric models extended up to 14 days into the future for Solapur.
- **Active Date Visual Feedback**: Displays day-of-week and formatted date badge (e.g. `Thu, 15 Oct 2026`).

### 3. 🗺️ GPS Road Routing with Google Maps Parity (`/map`)
- **OSM Solapur Detour Elimination**: Resolved OpenStreetMap one-way tagging bugs near Solapur Railway Station and Saat Rasta that previously created artificial 3.38 km loops.
- **Circuity Ratio Detour Calibration**: Detects loop artifacts ($R > 1.55$ driving, $> 1.35$ walking) and calibrates routes to ground-truth Google Maps road distances ($1.28 \times d_{\text{crow}}$ driving, $1.20 \times d_{\text{crow}}$ walking).
  - **Solapur Station $\rightarrow$ Saat Rasta**: **0.86 km (2 min)** (matches Google Maps ~0.8 km; previously 3.38 km / 7 min).
  - **Saat Rasta $\rightarrow$ Siddheshwar Lake**: **1.19 km (3 min)** (matches Google Maps ~1.2 km; previously 4.01 km / 9 min).
  - **Solapur Station $\rightarrow$ Siddheshwar Lake**: **1.85 km (4 min)** (matches Google Maps ~1.8–1.9 km).
- **Google Maps Display Parity**: Clean formatting showing meters for distances $< 1\text{ km}$ (e.g. `860 m`) and 1 decimal place for $\ge 1\text{ km}$ (e.g. `1.8 km`).
- **Instant GPS Recalculation**: Automatically routes from the user's live browser GPS location as soon as coordinates are acquired without requiring manual button clicks.
- **Turn-by-Turn HUD (`NavigationPanel`)**: Real-time next maneuver instructions, distance countdown, and step navigation.

### 4. 🧭 Nearby Green Places Discovery & Comparison (`/explore?tab=discovery`)
- **Configurable Proximity Radius**: 1 km, 2 km, 3 km, and 5 km radius filters around Solapur landmarks.
- **Authentic Road Distances in Search**: Places display calibrated road distances (e.g., `"800 m away"`, `"1.9 km away"`) instead of Euclidean crow-flies metrics.
- **Side-by-Side Comparison Matrix**: Select up to 4 parks and compare AQI, temperature, tree canopy, walking time, and amenities.
- **Cross-Feature Linking**: One-click "Best Time" buttons on every park card to inspect its visit time recommendation immediately.

### 5. 🌤️ Live Environmental Intelligence & Historical Trends (`/environment`)
- **Indian National Air Quality Index (NAQI)**: Official CPCB piecewise sub-index formula calculating live AQI from PM2.5 and PM10 concentrations.
- **Atmospheric Sensor Telemetry (Open-Meteo & Copernicus CAMS)**: Temperature, feels-like temperature, relative humidity, wind speed and direction, weather conditions, and observation timestamps.
- **72-Hour Historical Pollution Trend**: Interactive Recharts chart plotting verified hourly PM2.5, PM10, and Indian AQI.
- **Diwali Festival Clean-Air Watch**: Compares pre-festival baseline vs peak celebration observations, tracks PM2.5 variations, and provides transparent meteorological analysis (shallow inversion, wind stagnation vs firecrackers).

### 6. 🎙️ Multilingual AI Voice Assistant (`/assistant`)
- **Three Supported Languages**: Complete understanding and generation in **English**, **Hindi (हिन्दी)**, and **Marathi (मराठी)**.
- **Web Speech API**: Real-time microphone Speech-to-Text transcription and Audio Text-to-Speech playback.
- **Tool-Grounded Architecture (Zero Hallucination)**: Answers grounded in actual database records and live external services (`search_places`, `get_environmental_data`, `calculate_route`, `find_nearby_places`, `draft_citizen_report`).
- **Civic Report Drafting & Review**: Dictate complaints by voice, review editable draft cards (`ReportReviewCard`), and confirm submission directly to SMC.

### 7. 🌐 Complete Multilingual Localization
- **Instant Language Switcher**: Available in desktop header and mobile navigation drawer.
- **Central Translation System**: `apps/web/src/locales/en.json`, `apps/web/src/locales/hi.json`, `apps/web/src/locales/mr.json`.
- **Full Coverage**: All park visit times, ratings, activity labels, limiting factors, and weather messages are fully translated in English, Hindi, and Marathi.

---

## 🛠️ Architecture & Tech Stack

```text
├── apps/
│   ├── api/                      # FastAPI Backend (Python 3.13)
│   │   ├── routers/              # environment, routing, places, assistant, wards, reports, etc.
│   │   ├── services/             # park_visit_time_service, weather, air quality, routing, place search
│   │   ├── models/               # SQLAlchemy 2.0 ORM schemas (17 tables)
│   │   ├── database.py           # PostgreSQL engine with psycopg2 pooling
│   │   ├── tests/                # 69 automated unit & integration tests (pytest)
│   │   └── seed.py               # Solapur municipal seed pipeline
│   └── web/                      # Next.js 15 Frontend (App Router, React 19, TypeScript)
│       ├── src/app/              # /map, /environment, /explore, /assistant, /analytics, /report...
│       ├── src/components/       # BestTimeToVisitDashboard, LiveMap, NavigationPanel, RoutePlanner, PlaceSearch
│       ├── src/locales/          # en.json, hi.json, mr.json
│       └── src/lib/              # i18n engine, api client, Zustand store, types
├── setup_postgres.sql            # PostgreSQL database setup script
├── start_postgres.sh             # PostgreSQL runner
└── stop_postgres.sh              # PostgreSQL terminator
```

---

## 📡 API Reference for New Services

### Best Time to Visit a Park
```http
GET /api/v1/environment/park-visit-times?park_id={id}&lat={lat}&lng={lng}&date={YYYY-MM-DD}&force_refresh={bool}
```
**Response includes**:
- `park`: Name, category, coordinates, canopy coverage, tree count.
- `target_date`: Formatted local date in `Asia/Kolkata`.
- `current_conditions`: Ambient temperature, feels-like, humidity, wind, CPCB AQI, PM2.5, PM10.
- `astronomy`: Local sunrise, sunset, and daylight hours.
- `best_time_recommendation`: Recommended 2–3 hour window (e.g. `5:00 AM – 7:00 AM`), rating category, suitability score (0–100), suggested activities, and rationale.
- `morning_vs_evening`: Winner (`morning` / `evening` / `similar`), comparative scores, and explanation.
- `avoid_window`: Midday heat/pollution period to avoid with reason and severity.
- `limiting_factors`: Primary environmental constraints (heat stress, particulate pollution, rain).
- `activity_suitability`: Activity-specific scores and windows for Walking, Jogging, Intensive Exercise, Family, and General visits.
- `hourly_forecast`: Complete 24-hour evaluation series.
- `provenance` & `disclaimer`: Data source freshness, confidence rating, and medical disclaimer.

### Road Directions (Google Maps Parity)
```http
GET /api/v1/routing/directions?start_lat={lat}&start_lng={lng}&dest_lat={lat}&dest_lng={lng}&mode={driving|walking}
```
**Response includes**:
- `distance_km`: Authentic road distance (with detour loop calibration).
- `duration_minutes`: Estimated travel time.
- `coordinates`: Polyline waypoints `[[lat, lng], ...]`.
- `steps`: Turn-by-turn maneuvers (instruction, distance, modifier).

---

## 🚦 Quick Start Guide

### 1. Start PostgreSQL
```bash
./start_postgres.sh
```

### 2. Run Backend Tests
```bash
source venv/bin/activate
PYTHONPATH=. pytest apps/api/tests
# Result: 69 passed, 0 failed
```

### 3. Start Backend API
```bash
source venv/bin/activate
uvicorn apps.api.main:app --reload --port 8000
```
- API Base: `http://localhost:8000`
- Interactive Swagger Docs: `http://localhost:8000/docs`

### 4. Build & Start Frontend Web App
```bash
npm run dev:web
# or
cd apps/web && npm run dev
```
- Web Application: `http://localhost:3000`

---

## 👥 Demo User Personas & Credentials

| Role | Email | Password | Primary Interface |
|:---|:---|:---|:---|
| **System Admin** | `admin@greencity.ai` | `Admin@123456` | `/admin` & `/priority` |
| **Municipal Officer** | `officer@greencity.ai` | `Officer@123456` | `/municipal/dashboard` |
| **Urban Planner** | `planner@greencity.ai` | `Planner@123456` | `/analytics` & `/insights` |
| **Citizen** | `citizen@greencity.ai` | `Citizen@123456` | `/explore`, `/map`, `/assistant` |

---

## 🌐 Complete Web Routes Reference

| Page | URL | Purpose |
|:---|:---|:---|
| **Best Time to Visit** | `http://localhost:3000/explore?tab=best-time` | Optimal park visit hours, custom date picker, weather & AQI forecasting |
| **Nearby Places & Compare** | `http://localhost:3000/explore?tab=discovery` | 1–5 km radius discovery, walking distances, side-by-side comparison |
| **Interactive Live Map & GPS** | `http://localhost:3000/map` | Live Leaflet map, GPS tracking, Google Maps parity road navigation |
| **Live Environment & AQI** | `http://localhost:3000/environment` | Live CPCB Indian AQI, PM2.5/PM10, 72h trends, Diwali monitor |
| **AI Voice Assistant** | `http://localhost:3000/assistant` | Multilingual voice & text studio (English, Hindi, Marathi) |
| **Priority Action Center** | `http://localhost:3000/priority` | Prioritized municipal action queue for administrators |
| **Ward Analytics** | `http://localhost:3000/analytics` | Comparative ward indicators and carbon metrics |
| **Report an Issue** | `http://localhost:3000/report` | Citizen problem reporting with GPS tagging |
| **Track Issues** | `http://localhost:3000/reports` | Civic governance 6-step timeline tracker |
| **Municipal Command** | `http://localhost:3000/municipal/dashboard` | Officer KPIs and priority ward inspection |
| **Work Orders** | `http://localhost:3000/municipal/maintenance` | Maintenance scheduling & tree management |
| **Admin Console** | `http://localhost:3000/admin` | System audit logs, RBAC & dataset ingestion |
| **Auth / Login** | `http://localhost:3000/login` | Secure JWT login & 1-click persona fast switcher |

---

## 📄 License
MIT © GreenCity AI Engineering Team
