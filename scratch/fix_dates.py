import sqlite3
from datetime import datetime

db_path = "prisma/dev.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [row[0] for row in cursor.fetchall() if not row[0].startswith("sqlite_")]

for table in tables:
    print(f"Checking table: {table}")
    cursor.execute(f"PRAGMA table_info({table});")
    columns = [row[1] for row in cursor.fetchall()]
    
    date_cols = [c for c in columns if c in ["createdAt", "updatedAt", "startDate", "endDate", "approvedAt", "birthDate", "nationalIdDate", "contractSignDate", "contractEndDate"]]
    
    if not date_cols:
        continue
        
    for col in date_cols:
        # Check if any value is a numeric timestamp
        cursor.execute(f"SELECT id, {col} FROM {table} WHERE typeof({col}) IN ('integer', 'real');")
        rows = cursor.fetchall()
        if rows:
            print(f"  Converting {len(rows)} rows in {table}.{col}...")
            for row_id, val in rows:
                if val:
                    try:
                        # Convert timestamp (ms) to ISO string
                        dt = datetime.fromtimestamp(val / 1000.0)
                        iso_val = dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
                        cursor.execute(f"UPDATE {table} SET {col} = ? WHERE id = ?;", (iso_val, row_id))
                    except Exception as e:
                        print(f"    Error converting {val}: {e}")

conn.commit()
conn.close()
print("Done!")
