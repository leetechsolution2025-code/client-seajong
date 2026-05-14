import sqlite3
import datetime

def fix_all_dates():
    conn = sqlite3.connect('prisma/dev.db')
    cursor = conn.cursor()
    tables = ['MarketingEvent', 'MarketingEventTask', 'MarketingEventContent']
    
    for t in tables:
        print(f"Fixing table {t}...")
        cursor.execute(f"PRAGMA table_info({t})")
        cols = [r[1] for r in cursor.fetchall()]
        date_cols = [c for c in cols if 'Date' in c or 'At' in c]
        
        for col in date_cols:
            cursor.execute(f"SELECT id, {col} FROM {t}")
            rows = cursor.fetchall()
            for row in rows:
                rid, val = row
                if not val: continue
                
                new_val = None
                if isinstance(val, (int, float)):
                    # Convert timestamp to ISO
                    new_val = datetime.datetime.fromtimestamp(val/1000.0).isoformat()[:23] + "Z"
                elif isinstance(val, str) and "T" not in val and val.isdigit():
                    new_val = datetime.datetime.fromtimestamp(int(val)/1000.0).isoformat()[:23] + "Z"
                elif isinstance(val, str) and len(val) > 10 and "Z" not in val:
                    new_val = val[:23] + "Z"
                
                if new_val:
                    cursor.execute(f"UPDATE {t} SET {col} = ? WHERE id = ?", (new_val, rid))
    
    conn.commit()
    conn.close()
    print("Done fixing all dates.")

if __name__ == "__main__":
    fix_all_dates()
