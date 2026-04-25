import sqlite3

def fix_table(cursor, table):
    print(f"Fixing {table}...")
    cursor.execute(f"SELECT id, createdAt, updatedAt FROM {table}")
    rows = cursor.fetchall()
    for row in rows:
        rid, ca, ua = row
        # Standardize to YYYY-MM-DDTHH:MM:SS.mmmZ
        new_ca = ca[:23] + "Z" if ca and len(ca) > 10 else ca
        new_ua = ua[:23] + "Z" if ua and len(ua) > 10 else ua
        cursor.execute(f"UPDATE {table} SET createdAt = ?, updatedAt = ? WHERE id = ?", (new_ca, new_ua, rid))

conn = sqlite3.connect('prisma/dev.db')
cursor = conn.cursor()
for t in ['MarketingYearlyGoal', 'MarketingYearlyTask', 'OutlineMarketingPlan', 'MarketingYearlyPlan', 'User']:
    fix_table(cursor, t)
conn.commit()
conn.close()
print("All fixed!")
