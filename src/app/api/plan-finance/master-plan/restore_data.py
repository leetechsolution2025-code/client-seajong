import re
import json
import sqlite3

db_path = "/Users/leanhvan/master-project/prisma/dev.db"

with open(db_path, "rb") as f:
    data = f.read()

# Search for the string pattern '"mkt_brandingCost"' directly
matches = [m.start() for m in re.finditer(b'"mkt_brandingCost"', data)]
print(f"Found {len(matches)} binary matches containing 'mkt_brandingCost'.")

recovered_json = None
for idx in matches:
    # Scan backward to find the start of the JSON object '{'
    # We scan up to 30,000 bytes backward
    start_search = max(0, idx - 30000)
    chunk = data[start_search:idx + 5000]
    text = chunk.decode("utf-8", errors="ignore")
    
    # Find all open braces '{' in the text
    for brace_match in re.finditer(r'\{', text):
        brace_idx = brace_match.start()
        # Find matching closing brace from this open brace
        brace_count = 0
        json_str = ""
        for i in range(brace_idx, len(text)):
            char = text[i]
            json_str += char
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0:
                    try:
                        parsed = json.loads(json_str)
                        mkt_plan = parsed.get("mkt_editedContentPlan", {})
                        if mkt_plan and len(mkt_plan) > 0:
                            print(f"Found valid marketing plan at brace index {brace_idx} (offset {start_search + brace_idx})!")
                            print(f"Content Plan keys: {list(mkt_plan.keys())}")
                            if not recovered_json or len(json.dumps(mkt_plan)) > len(json.dumps(recovered_json.get("mkt_editedContentPlan", {}))):
                                recovered_json = parsed
                    except Exception:
                        pass
                    break

if recovered_json:
    print("Successfully selected best recovered JSON block!")
    
    # Save a backup of the current dev.db just in case!
    import shutil
    shutil.copy2(db_path, db_path + ".temp_backup")
    
    # Update SQLite database row
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    plan_data_str = json.dumps(recovered_json, ensure_ascii=False)
    cursor.execute(
        "UPDATE MasterYearlyPlan SET planData = ? WHERE year = 2026",
        (plan_data_str,)
    )
    conn.commit()
    conn.close()
    print("Database updated successfully with recovered marketing plan data!")
else:
    print("Could not find any non-empty marketing plan data blocks.")
