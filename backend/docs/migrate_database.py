#!/usr/bin/env python3
"""
Simple Database Migration Script

Run this from the backend directory:
    python migrate_database.py
"""

import os
import sys
import shutil
import json
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import settings

# Bangkok timezone
bangkok_tz = timezone(timedelta(hours=7))

def backup_database():
    """Create a backup of the current database"""
    if not settings.DATABASE_URL.startswith('sqlite'):
        print("Warning: Backup only supports SQLite databases")
        return None
    
    # Extract database file path from URL
    db_path = settings.DATABASE_URL.replace('sqlite:///', '')
    
    if not os.path.exists(db_path):
        print(f"Database file not found: {db_path}")
        return None
    
    # Create backup filename with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = f"{db_path}.backup_{timestamp}"
    
    try:
        shutil.copy2(db_path, backup_path)
        print(f"✅ Database backed up to: {backup_path}")
        return backup_path
    except Exception as e:
        print(f"❌ Failed to backup database: {e}")
        return None

def create_normalized_tables():
    """Create normalized database tables"""
    engine = create_engine(settings.DATABASE_URL)
    
    # SQL for creating normalized tables
    create_tables_sql = """
    -- Create tags table
    CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        color VARCHAR(7),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Create project_tags junction table
    CREATE TABLE IF NOT EXISTS project_tags (
        project_id INTEGER,
        tag_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (project_id, tag_id),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
    
    -- Create device_types table
    CREATE TABLE IF NOT EXISTS device_types (
        id INTEGER PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        category VARCHAR(30),
        icon VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Create analysis_devices junction table
    CREATE TABLE IF NOT EXISTS analysis_devices (
        analysis_id INTEGER,
        device_type_id INTEGER,
        count INTEGER NOT NULL,
        PRIMARY KEY (analysis_id, device_type_id),
        FOREIGN KEY (analysis_id) REFERENCES ai_analysis_history(id) ON DELETE CASCADE,
        FOREIGN KEY (device_type_id) REFERENCES device_types(id) ON DELETE CASCADE
    );
    
    -- Create user_preferences table
    CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL,
        preferred_ai_model VARCHAR(100),
        theme_preference VARCHAR(20) DEFAULT 'system',
        language VARCHAR(10) DEFAULT 'th',
        auto_save_analysis BOOLEAN DEFAULT 1,
        notifications_enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CHECK (theme_preference IN ('light', 'dark', 'system')),
        CHECK (language IN ('th', 'en'))
    );
    
    -- Create model_usage_stats table
    CREATE TABLE IF NOT EXISTS model_usage_stats (
        id INTEGER PRIMARY KEY,
        model_name VARCHAR(100) UNIQUE NOT NULL,
        usage_count INTEGER DEFAULT 0,
        total_execution_time INTEGER DEFAULT 0,
        avg_execution_time INTEGER DEFAULT 0,
        success_rate INTEGER DEFAULT 100,
        last_used_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Create system_analytics table
    CREATE TABLE IF NOT EXISTS system_analytics (
        id INTEGER PRIMARY KEY,
        event_type VARCHAR(50) NOT NULL,
        user_id INTEGER,
        metadata TEXT,
        ip_address VARCHAR(45),
        user_agent VARCHAR(500),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        CHECK (event_type IN ('analysis', 'model_change', 'login', 'logout', 'project_create', 'project_delete'))
    );
    
    -- Add new columns to existing tables if they don't exist
    ALTER TABLE users ADD COLUMN last_login_at DATETIME;
    ALTER TABLE users ADD COLUMN subscription_type VARCHAR(20) DEFAULT 'free';
    
    ALTER TABLE projects ADD COLUMN is_favorite BOOLEAN DEFAULT 0;
    
    -- Add indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
    CREATE INDEX IF NOT EXISTS idx_device_types_name ON device_types(name);
    CREATE INDEX IF NOT EXISTS idx_device_types_category ON device_types(category);
    CREATE INDEX IF NOT EXISTS idx_system_analytics_event_type ON system_analytics(event_type);
    CREATE INDEX IF NOT EXISTS idx_system_analytics_user_id ON system_analytics(user_id);
    CREATE INDEX IF NOT EXISTS idx_model_usage_stats_model_name ON model_usage_stats(model_name);
    """
    
    try:
        with engine.connect() as conn:
            # Execute each statement separately
            statements = create_tables_sql.split(';')
            for statement in statements:
                statement = statement.strip()
                if statement:
                    try:
                        conn.execute(text(statement))
                    except Exception as e:
                        # Ignore "column already exists" errors
                        if "duplicate column name" not in str(e).lower():
                            print(f"Warning: {e}")
            conn.commit()
        print("✅ Normalized tables created successfully")
        return True
    except Exception as e:
        print(f"❌ Failed to create tables: {e}")
        return False

def populate_default_data():
    """Populate default data for normalized tables"""
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Create default device types
        default_device_types = [
            ('Router', 'network', 'router'),
            ('Switch', 'network', 'switch'),
            ('Firewall', 'security', 'shield'),
            ('Server', 'server', 'server'),
            ('Workstation', 'endpoint', 'monitor'),
            ('Laptop', 'endpoint', 'laptop'),
            ('Access Point', 'network', 'wifi'),
            ('Load Balancer', 'network', 'balance'),
            ('Database', 'server', 'database'),
            ('Storage', 'server', 'hard-drive'),
            ('Printer', 'peripheral', 'printer'),
            ('Camera', 'security', 'camera'),
            ('Phone', 'communication', 'phone'),
            ('Tablet', 'endpoint', 'tablet'),
            ('IoT Device', 'iot', 'cpu'),
        ]
        
        for name, category, icon in default_device_types:
            # Check if device type already exists
            result = db.execute(text("SELECT COUNT(*) FROM device_types WHERE name = :name"), {"name": name})
            if result.scalar() == 0:
                db.execute(text("""
                    INSERT INTO device_types (name, category, icon) 
                    VALUES (:name, :category, :icon)
                """), {"name": name, "category": category, "icon": icon})
        
        # Create user preferences for existing users
        result = db.execute(text("SELECT id FROM users"))
        users = result.fetchall()
        
        for user in users:
            user_id = user[0]
            # Check if preferences already exist
            pref_result = db.execute(text("SELECT COUNT(*) FROM user_preferences WHERE user_id = :user_id"), {"user_id": user_id})
            if pref_result.scalar() == 0:
                db.execute(text("""
                    INSERT INTO user_preferences (user_id, preferred_ai_model, theme_preference, language, auto_save_analysis, notifications_enabled) 
                    VALUES (:user_id, 'gpt-oss:latest', 'system', 'th', 1, 1)
                """), {"user_id": user_id})
        
        # Initialize model usage stats from existing analysis history
        result = db.execute(text("""
            SELECT model_used, COUNT(*) as usage_count, AVG(execution_time_seconds) as avg_time, 
                   SUM(execution_time_seconds) as total_time, MAX(created_at) as last_used
            FROM ai_analysis_history 
            GROUP BY model_used
        """))
        
        model_stats = result.fetchall()
        for stats in model_stats:
            model_name, usage_count, avg_time, total_time, last_used = stats
            
            # Check if stats already exist
            existing = db.execute(text("SELECT COUNT(*) FROM model_usage_stats WHERE model_name = :model_name"), {"model_name": model_name})
            if existing.scalar() == 0:
                db.execute(text("""
                    INSERT INTO model_usage_stats (model_name, usage_count, total_execution_time, avg_execution_time, last_used_at) 
                    VALUES (:model_name, :usage_count, :total_time, :avg_time, :last_used)
                """), {
                    "model_name": model_name,
                    "usage_count": usage_count or 0,
                    "total_time": int(total_time or 0),
                    "avg_time": int(avg_time or 0),
                    "last_used": last_used
                })
        
        db.commit()
        print("✅ Default data populated successfully")
        return True
        
    except Exception as e:
        print(f"❌ Failed to populate default data: {e}")
        db.rollback()
        return False
    finally:
        db.close()

def migrate_existing_data():
    """Migrate existing data to normalized format"""
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Migrate device types from analysis history
        result = db.execute(text("SELECT id, device_types, device_count FROM ai_analysis_history WHERE device_types IS NOT NULL"))
        analyses = result.fetchall()
        
        migrated_count = 0
        for analysis in analyses:
            analysis_id, device_types_json, device_count = analysis
            
            # Check if already migrated
            existing = db.execute(text("SELECT COUNT(*) FROM analysis_devices WHERE analysis_id = :analysis_id"), {"analysis_id": analysis_id})
            if existing.scalar() > 0:
                continue
            
            try:
                if device_types_json:
                    device_types_data = json.loads(device_types_json)
                    
                    for device_name, count in device_types_data.items():
                        # Get or create device type
                        device_result = db.execute(text("SELECT id FROM device_types WHERE name = :name"), {"name": device_name})
                        device_row = device_result.fetchone()
                        
                        if not device_row:
                            # Create new device type
                            db.execute(text("""
                                INSERT INTO device_types (name, category, icon) 
                                VALUES (:name, 'unknown', 'cpu')
                            """), {"name": device_name})
                            
                            device_result = db.execute(text("SELECT id FROM device_types WHERE name = :name"), {"name": device_name})
                            device_row = device_result.fetchone()
                        
                        device_type_id = device_row[0]
                        
                        # Create analysis-device relationship
                        db.execute(text("""
                            INSERT INTO analysis_devices (analysis_id, device_type_id, count) 
                            VALUES (:analysis_id, :device_type_id, :count)
                        """), {
                            "analysis_id": analysis_id,
                            "device_type_id": device_type_id,
                            "count": int(count) if isinstance(count, (int, str)) else 1
                        })
                        
                        migrated_count += 1
                else:
                    # Create generic device entry for analyses without device_types
                    router_result = db.execute(text("SELECT id FROM device_types WHERE name = 'Router'"))
                    router_row = router_result.fetchone()
                    
                    if router_row:
                        db.execute(text("""
                            INSERT INTO analysis_devices (analysis_id, device_type_id, count) 
                            VALUES (:analysis_id, :device_type_id, :count)
                        """), {
                            "analysis_id": analysis_id,
                            "device_type_id": router_row[0],
                            "count": device_count or 1
                        })
                        migrated_count += 1
                        
            except json.JSONDecodeError:
                # Handle invalid JSON
                continue
        
        db.commit()
        print(f"✅ Migrated {migrated_count} device relationships")
        return True
        
    except Exception as e:
        print(f"❌ Failed to migrate existing data: {e}")
        db.rollback()
        return False
    finally:
        db.close()

def verify_migration():
    """Verify that the migration was successful"""
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        print("\n🔍 Verifying migration...")
        
        # Check if new tables exist
        tables_to_check = [
            'tags', 'project_tags', 'device_types', 'analysis_devices',
            'user_preferences', 'model_usage_stats', 'system_analytics'
        ]
        
        for table in tables_to_check:
            try:
                result = db.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.scalar()
                print(f"✅ Table '{table}' exists with {count} records")
            except Exception as e:
                print(f"❌ Table '{table}' check failed: {e}")
                return False
        
        # Check data integrity
        print("\n📊 Checking data integrity...")
        
        # Check users
        user_count = db.execute(text("SELECT COUNT(*) FROM users")).scalar()
        print(f"✅ Users: {user_count}")
        
        # Check projects
        project_count = db.execute(text("SELECT COUNT(*) FROM projects")).scalar()
        print(f"✅ Projects: {project_count}")
        
        # Check analysis history
        analysis_count = db.execute(text("SELECT COUNT(*) FROM ai_analysis_history")).scalar()
        print(f"✅ Analysis History: {analysis_count}")
        
        # Check device relationships
        device_rel_count = db.execute(text("SELECT COUNT(*) FROM analysis_devices")).scalar()
        print(f"✅ Analysis-Device Relationships: {device_rel_count}")
        
        # Check user preferences
        pref_count = db.execute(text("SELECT COUNT(*) FROM user_preferences")).scalar()
        print(f"✅ User Preferences: {pref_count}")
        
        # Check device types
        device_type_count = db.execute(text("SELECT COUNT(*) FROM device_types")).scalar()
        print(f"✅ Device Types: {device_type_count}")
        
        print("\n🎉 Migration verification completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Migration verification failed: {e}")
        return False
    finally:
        db.close()

def main():
    print("🚀 Starting Database Normalization Migration")
    print("=" * 50)
    
    # Step 1: Backup
    print("\n📦 Step 1: Creating backup...")
    backup_path = backup_database()
    if not backup_path:
        print("❌ Backup failed. Aborting migration.")
        return
    
    # Step 2: Create normalized tables
    print("\n🔧 Step 2: Creating normalized tables...")
    if not create_normalized_tables():
        print("❌ Failed to create normalized tables.")
        return
    
    # Step 3: Populate default data
    print("\n📝 Step 3: Populating default data...")
    if not populate_default_data():
        print("❌ Failed to populate default data.")
        return
    
    # Step 4: Migrate existing data
    print("\n🔄 Step 4: Migrating existing data...")
    if not migrate_existing_data():
        print("❌ Failed to migrate existing data.")
        return
    
    # Step 5: Verification
    print("\n🔍 Step 5: Verifying migration...")
    if verify_migration():
        print("\n🎉 Database normalization completed successfully!")
        print("\n📋 Next steps:")
        print("1. Update your application to use the new normalized models")
        print("2. Test all functionality thoroughly")
        print("3. Monitor performance and optimize queries if needed")
        print(f"\n💾 Backup saved at: {backup_path}")
        print("   You can delete this backup once you're confident the migration is successful")
    else:
        print("\n❌ Migration verification failed!")
        print(f"💡 Consider restoring from backup: {backup_path}")

if __name__ == "__main__":
    main()