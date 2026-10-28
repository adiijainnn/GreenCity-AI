#!/usr/bin/env python3
"""
GreenCity AI — PostgreSQL Migration Script
Runs: SQLAlchemy create_all (creates all tables) + seeds data
Usage: python migrate_to_postgres.py
"""
import sys, os

# Ensure we're in the project root
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

from dotenv import load_dotenv
load_dotenv(os.path.join(project_root, '.env'))

from apps.api.database import engine, Base, SessionLocal
from apps.api.models import (
    User, Organization, Ward, GreenSpace, GreenSpaceMetric, GreenSpaceImage,
    Tree, CitizenReport, ReportImage, ReportStatusHistory, MaintenanceTask,
    EcosystemAssessment, AIRecommendation, Dataset, AuditLog
)

def run_migration():
    db_url = os.getenv("DATABASE_URL", "")
    print(f"🔗 Connecting to: {db_url.split('@')[-1] if '@' in db_url else db_url}")

    print("📦 Creating all tables in PostgreSQL...")
    Base.metadata.create_all(bind=engine)
    print("✅ All tables created successfully!\n")

    # Show created tables
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"📋 Tables created ({len(tables)}):")
    for t in sorted(tables):
        cols = [c['name'] for c in inspector.get_columns(t)]
        print(f"   ✓ {t:35s} ({len(cols)} columns)")

    print("\n🌱 Running seed data...")
    try:
        from apps.api.seed import seed_database
        seed_database()
        print("✅ Seed data inserted successfully!")
    except Exception as e:
        print(f"⚠️  Seed warning: {e}")
        print("   (You can run seed manually: python -m apps.api.seed)")

    print("\n🎉 Migration complete! Your PostgreSQL database is ready.")
    print("   Restart your FastAPI server to connect to PostgreSQL.")

if __name__ == "__main__":
    run_migration()
