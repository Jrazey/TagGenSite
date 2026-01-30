import sqlite3
import os

db_path = os.path.join("backend", "tag_manager.db")

print(f"Connecting to {db_path}...")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if column exists
    cursor.execute("PRAGMA table_info(project_states)")
    columns = [info[1] for info in cursor.fetchall()]
    
    if "settings_json" not in columns:
        print("Column 'settings_json' missing. Adding it...")
        cursor.execute("ALTER TABLE project_states ADD COLUMN settings_json VARCHAR DEFAULT '{}'")
        conn.commit()
        print("Migration successful.")
    else:
        print("Column 'settings_json' already exists.")
        
    conn.close()

except Exception as e:
    print(f"Error: {e}")
