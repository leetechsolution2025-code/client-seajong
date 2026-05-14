import sqlite3
import re
import datetime
import csv
import io

def ts_to_iso(ts):
    if not ts or ts == 'NULL' or ts == '': return datetime.datetime.now().isoformat()
    try:
        ts_val = int(ts)
        if ts_val > 2000000000000: # Very far in future or ms
             return datetime.datetime.fromtimestamp(ts_val/1000.0).isoformat()
        elif ts_val > 1000000000:
             return datetime.datetime.fromtimestamp(ts_val).isoformat()
        else:
             return datetime.datetime.now().isoformat()
    except:
        return ts if '-' in ts else datetime.datetime.now().isoformat()

def parse_values(v_str):
    f = io.StringIO(v_str)
    reader = csv.reader(f, quotechar="'", skipinitialspace=True)
    return next(reader)

def restore():
    db = sqlite3.connect('prisma/dev.db')
    cursor = db.cursor()
    
    with open('scratch/marketing_dump.sql', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # MarketingYearlyPlan
    matches = re.findall(r"INSERT INTO MarketingYearlyPlan VALUES\((.*?)\);", content, re.DOTALL)
    for m in matches:
        vals = parse_values(m)
        if len(vals) >= 7:
            cursor.execute('''INSERT OR REPLACE INTO MarketingYearlyPlan 
                (id, code, year, status, createdAt, updatedAt, authorId) 
                VALUES (?,?,?,?,?,?,?)''', 
                (vals[0], vals[1], int(vals[2]), vals[3], ts_to_iso(vals[4]), ts_to_iso(vals[5]), vals[6] if vals[6]!='NULL' else None))

    # MarketingYearlyGoal
    matches = re.findall(r"INSERT INTO MarketingYearlyGoal VALUES\((.*?)\);", content, re.DOTALL)
    for m in matches:
        vals = parse_values(m)
        if len(vals) >= 9:
            cursor.execute('''INSERT OR REPLACE INTO MarketingYearlyGoal 
                (id, planId, label, description, icon, color, sortOrder, createdAt, updatedAt) 
                VALUES (?,?,?,?,?,?,?,?,?)''', 
                (vals[0], vals[1], vals[2], vals[3], vals[4], vals[5], int(vals[6]), ts_to_iso(vals[7]), ts_to_iso(vals[8])))

    # MarketingYearlyTask
    matches = re.findall(r"INSERT INTO MarketingYearlyTask VALUES\((.*?)\);", content, re.DOTALL)
    for m in matches:
        vals = parse_values(m)
        if len(vals) >= 11:
            cursor.execute('''INSERT OR REPLACE INTO MarketingYearlyTask 
                (id, planId, parentId, name, description, color, isExpanded, status, sortOrder, createdAt, updatedAt) 
                VALUES (?,?,?,?,?,?,?,?,?,?,?)''', 
                (vals[0], vals[1], vals[2] if vals[2]!='NULL' else None, vals[3], vals[4] if vals[4]!='NULL' else None, vals[5] if vals[5]!='NULL' else None, int(vals[6] or 1), vals[7] or 'pending', int(vals[8] or 0), ts_to_iso(vals[9]), ts_to_iso(vals[10])))

    # OutlineMarketingPlan
    matches = re.findall(r"INSERT INTO OutlineMarketingPlan VALUES\((.*?)\);", content, re.DOTALL)
    for m in matches:
        vals = parse_values(m)
        if len(vals) >= 5:
            # id, year, planData, createdAt, updatedAt
            cursor.execute('''INSERT OR REPLACE INTO OutlineMarketingPlan 
                (id, year, planData, createdAt, updatedAt) 
                VALUES (?,?,?,?,?)''', 
                (vals[0], int(vals[1]), vals[2], ts_to_iso(vals[3]), ts_to_iso(vals[4])))

    # Competitor
    matches = re.findall(r"INSERT INTO Competitor VALUES\((.*?)\);", content, re.DOTALL)
    for m in matches:
        vals = parse_values(m)
        if len(vals) >= 6:
            cursor.execute('''INSERT OR REPLACE INTO Competitor 
                (id, name, website, strengths, weaknesses, strategy) 
                VALUES (?,?,?,?,?,?)''', 
                (vals[0], vals[1], vals[2], vals[3], vals[4], vals[5]))

    db.commit()
    db.close()
    print("Restore complete.")

if __name__ == '__main__':
    restore()
