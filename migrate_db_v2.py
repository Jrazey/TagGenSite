import sqlite3
import os

# Try both potential locations just to be sure
candidates = ["project_data.db", "backend/project_data.db"]

found = False
for db_path in candidates:
    if os.path.exists(db_path):
        print(f"Found DB at: {db_path}")
        found = True
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Check project_states
            cursor.execute("PRAGMA table_info(project_states)")
            columns = [info[1] for info in cursor.fetchall()]
            
            if "settings_json" not in columns:
                print(f"Adding 'settings_json' to {db_path}...")
                cursor.execute("ALTER TABLE project_states ADD COLUMN settings_json VARCHAR DEFAULT '{}'")
                conn.commit()
                print("Migration successful.")
            else:
                print(f"'settings_json' already exists in {db_path}.")
            conn.close()
        except Exception as e:
            print(f"Error migrating {db_path}: {e}")

if not found:
    print("No project_data.db found in root or backend/.")
