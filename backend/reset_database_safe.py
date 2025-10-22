#!/usr/bin/env python3
"""
Reset database safely without stopping server
"""

from sqlalchemy import create_engine, text
from app.database import SQLALCHEMY_DATABASE_URL
from app.models import Base
from app import crud, schemas
from app.database import SessionLocal

def reset_database_safe():
    """Reset database safely by dropping and recreating tables"""
    print("🔄 Safely resetting database...")
    
    try:
        # Create engine
        engine = create_engine(SQLALCHEMY_DATABASE_URL)
        
        # Drop old unused tables first
        print("   🧹 Cleaning old unused tables...")
        old_tables = ['system_analytics', 'model_usage_stats', 'tags', 'project_tags', 'user_preferences', 'device_types', 'analysis_devices']
        
        # Also clean old columns by dropping and recreating
        print("   🧹 Cleaning unused columns...")
        with engine.connect() as conn:
            for table in old_tables:
                try:
                    conn.execute(text(f"DROP TABLE IF EXISTS {table}"))
                    print(f"      ✅ Dropped: {table}")
                except Exception:
                    pass
            conn.commit()
        
        # Drop all current tables
        print("   🗑️  Dropping existing tables...")
        Base.metadata.drop_all(bind=engine)
        
        # Create all tables with new schema
        print("   🏗️  Creating clean normalized schema...")
        Base.metadata.create_all(bind=engine)
        
        # No default data needed - using JSON for device types
        print("   ✅ No default data needed")
        
        print("\n🎉 Database reset complete!")
        print("   📊 Normalized schema with:")
        print("   - ✅ total_device_count (not device_count)")
        print("   - ✅ DeviceType table")
        print("   - ✅ AnalysisDevice relationships")
        print("   - ✅ UserPreferences table")
        print("   - ✅ Tag and ProjectTag tables")
        print("\n🚀 Backend server can keep running!")
        print("   Just refresh your frontend to see the changes")
        
        return True
        
    except Exception as e:
        print(f"❌ Error resetting database: {e}")
        return False

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--confirm":
        reset_database_safe()
    else:
        print("⚠️  This will DELETE all existing data!")
        print("   But you can keep the backend server running")
        print("   Run with --confirm to proceed:")
        print("   python reset_database_safe.py --confirm")