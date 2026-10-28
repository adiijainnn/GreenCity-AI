import json
import datetime
import bcrypt
from apps.api.database import SessionLocal, engine, Base
from apps.api.models import (
    User, Organization, Ward, GreenSpace, GreenSpaceMetric, GreenSpaceImage,
    Tree, CitizenReport, ReportImage, ReportStatusHistory, MaintenanceTask,
    EcosystemAssessment, AIRecommendation, Dataset, AuditLog
)

def hash_password(pwd: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd.encode('utf-8'), salt).decode('utf-8')

def seed_database():
    print("🌱 Initializing GreenCity AI Seed Data Pipeline (City Context: Solapur, Maharashtra)...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Clear existing data if present
        db.query(AuditLog).delete()
        db.query(AIRecommendation).delete()
        db.query(EcosystemAssessment).delete()
        db.query(MaintenanceTask).delete()
        db.query(ReportStatusHistory).delete()
        db.query(ReportImage).delete()
        db.query(CitizenReport).delete()
        db.query(Tree).delete()
        db.query(GreenSpaceImage).delete()
        db.query(GreenSpaceMetric).delete()
        db.query(GreenSpace).delete()
        db.query(Ward).delete()
        db.query(User).delete()
        db.query(Organization).delete()
        db.query(Dataset).delete()
        db.commit()

        # 1. Create Organization (Solapur Municipal Corporation)
        org = Organization(
            name="Solapur Municipal Corporation (SMC) Environmental Directorate & Tree Authority",
            code="SMC-ENV-01",
            description="Municipal corporation body responsible for urban forestry, lakefront rejuvenation, park maintenance, and climate heat resilience across Solapur, Maharashtra.",
            contact_email="environment@solapurcorporation.gov.in"
        )
        db.add(org)
        db.commit()
        db.refresh(org)

        # 2. Create Role Users
        users = [
            User(
                email="admin@greencity.ai",
                full_name="Rajesh Kumar (System Admin)",
                hashed_password=hash_password("Admin@123456"),
                role="ADMIN",
                organization_id=org.id,
                phone="+91-9876543210"
            ),
            User(
                email="officer@greencity.ai",
                full_name="Priya Sharma (Deputy Conservator of Forests)",
                hashed_password=hash_password("Officer@123456"),
                role="OFFICER",
                organization_id=org.id,
                phone="+91-9876543211"
            ),
            User(
                email="planner@greencity.ai",
                full_name="Dr. Ananya Rao (Chief GIS Planner)",
                hashed_password=hash_password("Planner@123456"),
                role="PLANNER",
                organization_id=org.id,
                phone="+91-9876543212"
            ),
            User(
                email="citizen@greencity.ai",
                full_name="Aarav Mehta (Active Citizen)",
                hashed_password=hash_password("Citizen@123456"),
                role="CITIZEN",
                phone="+91-9876543213"
            )
        ]
        db.add_all(users)
        db.commit()
        
        citizen_user = db.query(User).filter(User.role == "CITIZEN").first()
        officer_user = db.query(User).filter(User.role == "OFFICER").first()

        # 3. Create Wards in Solapur, Maharashtra (5 Administrative Zones)
        wards_data = [
            {
                "ward_number": 1,
                "name": "Zone 1 - Central Solapur / Siddheshwar Lake & Mandir Parisar",
                "code": "SMC-Z01",
                "area_km2": 4.85,
                "population": 78000,
                "target_green_coverage_pct": 30.0,
                "bbox": [75.895, 17.665, 75.920, 17.685]
            },
            {
                "ward_number": 2,
                "name": "Zone 2 - North Solapur / Ashok Chowk & Bhavani Peth",
                "code": "SMC-Z02",
                "area_km2": 5.20,
                "population": 92000,
                "target_green_coverage_pct": 25.0,
                "bbox": [75.905, 17.680, 75.935, 17.705]
            },
            {
                "ward_number": 3,
                "name": "Zone 3 - South Solapur / Jule Solapur & Dnyaneshwar Nagar",
                "code": "SMC-Z03",
                "area_km2": 6.50,
                "population": 85000,
                "target_green_coverage_pct": 28.0,
                "bbox": [75.885, 17.630, 75.915, 17.655]
            },
            {
                "ward_number": 4,
                "name": "Zone 4 - East Solapur / Hotgi Road & Saiful Industrial Corridor",
                "code": "SMC-Z04",
                "area_km2": 7.80,
                "population": 68000,
                "target_green_coverage_pct": 25.0,
                "bbox": [75.920, 17.635, 75.955, 17.665]
            },
            {
                "ward_number": 5,
                "name": "Zone 5 - West Solapur / Saat Rasta, Civil Lines & Railway Enclave",
                "code": "SMC-Z05",
                "area_km2": 4.50,
                "population": 62000,
                "target_green_coverage_pct": 35.0,
                "bbox": [75.875, 17.660, 75.900, 17.685]
            }
        ]

        db_wards = {}
        for w in wards_data:
            min_x, min_y, max_x, max_y = w["bbox"]
            geom_dict = {
                "type": "Polygon",
                "coordinates": [[
                    [min_x, min_y],
                    [max_x, min_y],
                    [max_x, max_y],
                    [min_x, max_y],
                    [min_x, min_y]
                ]]
            }
            ward_obj = Ward(
                ward_number=w["ward_number"],
                name=w["name"],
                code=w["code"],
                geometry=json.dumps(geom_dict),
                area_km2=w["area_km2"],
                population=w["population"],
                target_green_coverage_pct=w["target_green_coverage_pct"]
            )
            db.add(ward_obj)
            db.commit()
            db.refresh(ward_obj)
            db_wards[w["code"]] = ward_obj

        # 4. Create 20 Real Green Spaces across Solapur Wards
        green_spaces_seed = [
            # Zone 1 (Central Solapur - Siddheshwar & Kambar Lake)
            ("Siddheshwar Temple Lake & Sacred Promenade", "Wetland", "SMC-Z01", 17.6710, 75.9080, 420000.0, 89.0, 76.0, 1250, 380.0),
            ("Sambhaji Lake (Kambar Talav) Bio-Park", "Wetland", "SMC-Z01", 17.6625, 75.9015, 290000.0, 84.0, 71.0, 940, 260.0),
            ("Mahatma Gandhi National Zoo & Botanical Garden", "Urban Forest", "SMC-Z01", 17.6640, 75.9030, 210000.0, 88.0, 82.0, 1420, 395.0),
            ("Hutatma Smruti Mandir Memorial Garden", "Park", "SMC-Z01", 17.6750, 75.9050, 48000.0, 76.0, 62.0, 240, 21.0),
            ("Indra Bhavan SMC Headquarters Heritage Garden", "Institutional Green Space", "SMC-Z01", 17.6720, 75.9120, 35000.0, 81.0, 68.0, 190, 18.5),
            
            # Zone 2 (North Solapur - Ashok Chowk & Bhavani Peth)
            ("Ashok Chowk Children's Recreational Garden", "Park", "SMC-Z02", 17.6870, 75.9190, 42000.0, 68.0, 54.0, 180, 15.0),
            ("Bhavani Peth Municipal Garden", "Community Garden", "SMC-Z02", 17.6820, 75.9140, 26000.0, 59.0, 43.0, 110, 9.8),
            ("Rupabhavani Sacred Hill Grove & Green Belt", "Urban Forest", "SMC-Z02", 17.6950, 75.9280, 145000.0, 82.0, 74.0, 780, 195.0),
            ("North Solapur Forest Research Nursery", "Botanical Reserve", "SMC-Z02", 17.7010, 75.9220, 85000.0, 86.0, 79.0, 610, 145.0),

            # Zone 3 (South Solapur - Jule Solapur & Dnyaneshwar Nagar)
            ("Vijayanagar Udyan & Open Gym", "Park", "SMC-Z03", 17.6430, 75.8980, 52000.0, 78.0, 61.0, 280, 24.0),
            ("Dnyaneshwar Nagar Community Park", "Community Garden", "SMC-Z03", 17.6380, 75.9040, 24000.0, 67.0, 50.0, 120, 10.5),
            ("Jule Solapur Ring Road Green Corridor", "Roadside Greenery", "SMC-Z03", 17.6480, 75.8920, 38000.0, 52.0, 38.0, 190, 16.0),
            ("Anand Nagar Biophilic Eco-Park", "Park", "SMC-Z03", 17.6350, 75.9100, 45000.0, 73.0, 58.0, 220, 19.2),

            # Zone 4 (East Solapur - Hotgi Road & Saiful Corridor)
            ("Smruti Van Urban Forest & Bio-Reserve", "Urban Forest", "SMC-Z04", 17.6510, 75.9320, 180000.0, 87.0, 81.0, 1150, 310.0),
            ("Hotgi Road Industrial Green Buffer", "Green Buffer", "SMC-Z04", 17.6450, 75.9400, 65000.0, 44.0, 32.0, 260, 22.0),
            ("Saiful Sports Complex & Garden", "Playground", "SMC-Z04", 17.6580, 75.9270, 55000.0, 71.0, 55.0, 240, 20.5),
            ("Solapur Old Airport Road Tree Belt", "Roadside Greenery", "SMC-Z04", 17.6390, 75.9480, 28000.0, 48.0, 35.0, 140, 12.0),

            # Zone 5 (West Solapur - Saat Rasta & Civil Lines)
            ("Saat Rasta Central Civic Promenade & Rotary", "Park", "SMC-Z05", 17.6690, 75.8910, 68000.0, 83.0, 72.0, 380, 34.0),
            ("Railway Officers Club Heritage Garden", "Institutional Green Space", "SMC-Z05", 17.6740, 75.8840, 92000.0, 89.0, 80.0, 590, 85.0),
            ("Collector Office & District Court Green Estate", "Institutional Green Space", "SMC-Z05", 17.6650, 75.8960, 46000.0, 77.0, 65.0, 260, 23.0),
            ("Modi Khana Citizens Walking Park", "Community Garden", "SMC-Z05", 17.6780, 75.8890, 22000.0, 64.0, 48.0, 115, 9.4)
        ]

        created_green_spaces = []
        for name, cat, wcode, lat, lng, area, health, canopy, trees_cnt, carbon in green_spaces_seed:
            w_obj = db_wards[wcode]
            # Create a small realistic polygon around center (approx 0.003 degree buffer)
            delta = 0.0018
            gs_poly = {
                "type": "Polygon",
                "coordinates": [[
                    [lng - delta, lat - delta],
                    [lng + delta, lat - delta],
                    [lng + delta, lat + delta],
                    [lng - delta, lat + delta],
                    [lng - delta, lat - delta]
                ]]
            }
            gs = GreenSpace(
                name=name,
                category=cat,
                ward_id=w_obj.id,
                geometry=json.dumps(gs_poly),
                latitude=lat,
                longitude=lng,
                area_m2=area,
                tree_count=trees_cnt,
                canopy_percentage=canopy,
                health_score=health,
                accessibility_score=round(health * 0.92, 1),
                biodiversity_score=round(health * 0.88, 1),
                carbon_estimate=carbon
            )
            db.add(gs)
            db.commit()
            db.refresh(gs)
            created_green_spaces.append(gs)

            # Metric history
            metric = GreenSpaceMetric(
                green_space_id=gs.id,
                health_score=health,
                canopy_percentage=canopy,
                carbon_seq_ton_yr=round(carbon * 0.1, 2),
                tree_count=trees_cnt,
                biodiversity_index=round((health / 100.0) * 3.2, 2)
            )
            db.add(metric)

            # Images
            img_url = "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80"
            if "Wetland" in cat or "Lake" in name:
                img_url = "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80"
            elif "Forest" in cat or "Zoo" in name:
                img_url = "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop&q=80"
            
            db.add(GreenSpaceImage(green_space_id=gs.id, image_url=img_url, caption=f"{name} Primary Survey"))

            # Sample Trees (Neem, Tamarind, Gulmohar, Banyan, Subabul, Peepal)
            species_list = ["Azadirachta indica (Neem)", "Tamarindus indica (Tamarind)", "Delonix regia (Gulmohar)", "Ficus benghalensis (Banyan)", "Ficus religiosa (Peepal)", "Leucaena leucocephala (Subabul)"]
            for idx, sp in enumerate(species_list[:3]):
                tree = Tree(
                    green_space_id=gs.id,
                    ward_id=w_obj.id,
                    species=sp,
                    estimated_age_years=25 + (idx * 10),
                    height_m=8.5 + (idx * 2.5),
                    dbh_cm=22.0 + (idx * 6.0),
                    health_status="Good" if health > 60 else "Fair",
                    latitude=lat + (0.0003 * idx),
                    longitude=lng + (0.0003 * idx)
                )
                db.add(tree)

        db.commit()

        # 5. Seed Citizen Reports for Solapur
        reports_seed = [
            {
                "title": "Fallen Neem Tree Limb Blocking Saat Rasta Junction",
                "desc": "Heavy pre-monsoon storm broke a large limb from a mature Neem tree obstructing bus lane near Saat Rasta rotary.",
                "cat": "Damaged Tree",
                "wcode": "SMC-Z05",
                "lat": 17.6695,
                "lng": 75.8915,
                "status": "In Progress",
                "priority": "High"
            },
            {
                "title": "Irrigation Sprinkler System Malfunction at Kambar Talav Promenade",
                "desc": "Underground drip irrigation line damaged near the walking track. Lawn patches drying under 42°C heat.",
                "cat": "Poor Maintenance",
                "wcode": "SMC-Z01",
                "lat": 17.6630,
                "lng": 75.9020,
                "status": "Assigned",
                "priority": "Medium"
            },
            {
                "title": "Plastic Waste Dumping Near Siddheshwar Lake Shoreline",
                "desc": "Commercial vendors depositing plastic waste along the temple lake wetland edge. Water birds affected.",
                "cat": "Encroachment",
                "wcode": "SMC-Z01",
                "lat": 17.6715,
                "lng": 75.9085,
                "status": "Submitted",
                "priority": "High"
            },
            {
                "title": "Overgrown Shrubs Obstructing Streetlights on Hotgi Road",
                "desc": "Thick invasive shrubs on the median green belt are blocking nighttime visibility near MIDC entrance.",
                "cat": "Overgrown Vegetation",
                "wcode": "SMC-Z04",
                "lat": 17.6460,
                "lng": 75.9390,
                "status": "Resolved",
                "priority": "Low"
            },
            {
                "title": "Unauthorized Heritage Tamarind Tree Felling Near Bhavani Peth",
                "desc": "Private construction contractor felled a healthy roadside Tamarind tree without SMC Tree Authority permit.",
                "cat": "Illegal Cutting",
                "wcode": "SMC-Z02",
                "lat": 17.6830,
                "lng": 75.9145,
                "status": "Under Review",
                "priority": "Critical"
            }
        ]

        for idx, rep in enumerate(reports_seed):
            w = db_wards[rep["wcode"]]
            rep_num = f"REP-20261005-SMC{idx+101}"
            cr = CitizenReport(
                report_number=rep_num,
                category=rep["cat"],
                title=rep["title"],
                description=rep["desc"],
                ward_id=w.id,
                latitude=rep["lat"],
                longitude=rep["lng"],
                status=rep["status"],
                priority=rep["priority"],
                reported_by=citizen_user.id if citizen_user else None,
                assigned_to=officer_user.id if officer_user and rep["status"] in ["Assigned", "In Progress", "Resolved"] else None,
                public_response="SMC Tree Authority inspection team deployed." if rep["status"] in ["Assigned", "In Progress", "Resolved"] else None
            )
            db.add(cr)
            db.commit()
            db.refresh(cr)

            db.add(ReportImage(
                report_id=cr.id,
                image_url="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80"
            ))

            db.add(ReportStatusHistory(
                report_id=cr.id,
                changed_by=officer_user.id if officer_user else None,
                old_status="None",
                new_status=rep["status"],
                notes="Ticket initialized in Solapur SMC Central Environmental Dispatch."
            ))

        db.commit()

        # 6. Seed Maintenance Tasks in Solapur
        tasks_seed = [
            ("Irrigation & Sapling Care", "Inspect and replace micro-sprinklers along Sambhaji Lake (Kambar Talav) walking corridor.", created_green_spaces[1].id, "High", "In Progress"),
            ("Tree Pruning & Deadwood Removal", "Prune hazardous dry branches along Saat Rasta central promenade prior to monsoon.", created_green_spaces[17].id, "High", "Assigned"),
            ("Debris & Litter Removal", "Eco-cleanliness drive along Siddheshwar Lake sacred promenade perimeter.", created_green_spaces[0].id, "Medium", "Planned"),
            ("Pest & Disease Control", "Apply organic biopesticide spray for mealybug infestation on young trees in Hotgi Road buffer.", created_green_spaces[14].id, "Medium", "Planned"),
            ("Tree Planting Drive", "Plant 300 native drought-tolerant saplings (Neem, Sissoo, Karanj) in Smruti Van Urban Forest.", created_green_spaces[13].id, "Critical", "In Progress")
        ]

        for t_type, desc, gs_id, prio, st in tasks_seed:
            db.add(MaintenanceTask(
                green_space_id=gs_id,
                task_type=t_type,
                description=desc,
                priority=prio,
                status=st,
                assigned_to=officer_user.id if officer_user else None,
                scheduled_date=datetime.datetime.utcnow() + datetime.timedelta(days=2)
            ))
        db.commit()

        # 7. Seed AI Recommendations Tailored for Solapur (Semi-Arid Urban Heat & Lake Buffers)
        rec1 = AIRecommendation(
            ward_id=db_wards["SMC-Z04"].id,
            title="Accelerate Industrial Green Buffer Canopy in East Solapur (Hotgi Road)",
            description="Remote sensing detects severe urban heat island thermal anomaly (+3.8°C above baseline) along Hotgi Road MIDC manufacturing corridor.",
            reason="Canopy coverage is 14.8% below SMC Smart City guidelines, exacerbating extreme summer heatwave exposure for 68,000 residents.",
            priority="CRITICAL",
            affected_area="Hotgi Road Industrial Corridor & Saiful",
            supporting_metrics={
                "current_canopy_pct": 10.2,
                "target_canopy_pct": 25.0,
                "heat_anomaly_celsius": 3.8,
                "pm10_dust_filtration_deficit_pct": 42.0
            },
            confidence=0.94
        )

        rec2 = AIRecommendation(
            ward_id=db_wards["SMC-Z01"].id,
            title="Wetland Bio-Shield & Desiltation at Siddheshwar & Kambar Lakefronts",
            description="Establish a contiguous 50m biophilic vegetative buffer around Siddheshwar Mandir Lake and Sambhaji Lake (Kambar Talav).",
            reason="Water temperature stabilization and bio-filtration needed to safeguard aquatic biodiversity and recharge ground aquifers in Central Solapur.",
            priority="HIGH",
            affected_area="Siddheshwar Mandir & Sambhaji Lake Perimeter",
            supporting_metrics={
                "aquatic_recharge_potential_m3": 185000,
                "citizen_lake_reports": 3,
                "shannon_diversity_gain_est": 0.45
            },
            confidence=0.91
        )

        rec3 = AIRecommendation(
            ward_id=db_wards["SMC-Z03"].id,
            title="Native Micro-Forest Afforestation (Miyawaki) in Jule Solapur Residential Extensions",
            description="Deploy 3 dense urban micro-forest clusters in open municipal plots across Vijayanagar and Dnyaneshwar Nagar.",
            reason="Rapid residential sprawl has reduced walking accessibility to parks; 41% of south Solapur residents currently exceed WHO 300m pedestrian green access.",
            priority="MEDIUM",
            affected_area="Jule Solapur Sectors 2 & 4",
            supporting_metrics={
                "unserved_population_ratio": 0.41,
                "carbon_capture_potential_mt": 85.0
            },
            confidence=0.88
        )

        db.add_all([rec1, rec2, rec3])
        db.commit()

        # 8. Seed Datasets
        ds = Dataset(
            name="Solapur Municipal Corporation (SMC) Ward Boundaries & Green Canopy Survey 2026",
            description="High-resolution GIS vector polygon boundaries, tree census inventory, and remote sensing NDVI canopy metrics for Solapur, Maharashtra.",
            dataset_type="GeoJSON",
            source="Maharashtra Remote Sensing Applications Centre (MRSAC) & SMC Parks Department",
            license="Open Government Data License India",
            uploaded_by=users[0].id,
            processing_status="COMPLETED",
            record_count=25,
            metadata_json={"epsg": 4326, "provider": "SMC Spatial Data Infrastructure", "city": "Solapur", "state": "Maharashtra"}
        )
        db.add(ds)
        db.commit()

        print("✅ GreenCity AI Seed Data successfully created for Solapur, Maharashtra!")

    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
