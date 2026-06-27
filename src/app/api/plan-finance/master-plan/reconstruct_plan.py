import json
import sqlite3
import shutil

db_path = "/Users/leanhvan/master-project/prisma/dev.db"

with open(db_path, "rb") as f:
    raw_bytes = f.read()

text = raw_bytes.decode("utf-8", errors="ignore")

def find_all_occurrences(sub, string):
    start = 0
    while True:
        start = string.find(sub, start)
        if start == -1: return
        yield start
        start += 1 # advance by 1 to get overlapping if any

def extract_json_object(pattern_str):
    matches = list(find_all_occurrences(pattern_str, text))
    results = []
    for idx in matches:
        start_idx = idx + len(pattern_str) - 1 # start at '{'
        brace_count = 0
        json_str = ""
        for i in range(start_idx, len(text)):
            char = text[i]
            json_str += char
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0:
                    try:
                        parsed = json.loads(json_str)
                        if parsed:
                            results.append(parsed)
                    except Exception:
                        pass
                    break
    # Return the largest parsed object
    if results:
        results.sort(key=lambda x: len(json.dumps(x)), reverse=True)
        return results[0]
    return None

def extract_json_array(pattern_str):
    matches = list(find_all_occurrences(pattern_str, text))
    results = []
    for idx in matches:
        start_idx = idx + len(pattern_str) - 1 # start at '['
        bracket_count = 0
        json_str = ""
        for i in range(start_idx, len(text)):
            char = text[i]
            json_str += char
            if char == '[':
                bracket_count += 1
            elif char == ']':
                bracket_count -= 1
                if bracket_count == 0:
                    try:
                        parsed = json.loads(json_str)
                        if parsed:
                            results.append(parsed)
                    except Exception:
                        pass
                    break
    if results:
        results.sort(key=lambda x: len(json.dumps(x)), reverse=True)
        return results[0]
    return None

# Extracting all the parts
edited_content_plan = extract_json_object('"mkt_editedContentPlan":{')
edited_ad_plan = extract_json_object('"mkt_editedAdPlan":{')
edited_weekly_assign = extract_json_object('"mkt_editedWeeklyAssign":{')
monthly_products = extract_json_object('"mkt_monthlyProducts":{')
custom_staff_ids = extract_json_array('"mkt_customStaffIds":[')
custom_content_plan_ids = extract_json_array('"mkt_customContentPlanIds":[')
custom_ad_plan_ids = extract_json_array('"mkt_customAdPlanIds":[')
monthly_themes = extract_json_array('"mkt_monthlyThemes":[')

# Also get mkt_brandingCost, mkt_travelCost, mkt_editedStaff, mkt_monthlyThemeTopic, mkt_monthlyThemeContent
def extract_field_value(pattern_str, is_num=False):
    matches = list(find_all_occurrences(pattern_str, text))
    for idx in matches:
        start_idx = idx + len(pattern_str)
        # Read until comma or closing brace
        val_str = ""
        for i in range(start_idx, len(text)):
            char = text[i]
            if char in ",}":
                break
            val_str += char
        try:
            val_str = val_str.strip()
            if val_str == "null":
                continue
            if is_num:
                return float(val_str) if "." in val_str else int(val_str)
            else:
                # remove quotes
                if val_str.startswith('"') and val_str.endswith('"'):
                    return val_str[1:-1]
                return val_str
        except Exception:
            pass
    return None

branding_cost = extract_field_value('"mkt_brandingCost":', is_num=True)
travel_cost = extract_field_value('"mkt_travelCost":', is_num=True)
edited_staff = extract_json_object('"mkt_editedStaff":{')
monthly_theme_topic = extract_field_value('"mkt_monthlyThemeTopic":"')
monthly_theme_content = extract_field_value('"mkt_monthlyThemeContent":"')

print("=== Reconstructed Marketing Plan ===")
print("mkt_brandingCost:", branding_cost)
print("mkt_travelCost:", travel_cost)
print("mkt_editedStaff keys:", list(edited_staff.keys()) if edited_staff else None)
print("mkt_customStaffIds:", custom_staff_ids)
print("mkt_editedContentPlan keys:", list(edited_content_plan.keys()) if edited_content_plan else None)
print("mkt_customContentPlanIds:", custom_content_plan_ids)
print("mkt_editedAdPlan keys:", list(edited_ad_plan.keys()) if edited_ad_plan else None)
print("mkt_customAdPlanIds:", custom_ad_plan_ids)
print("mkt_editedWeeklyAssign keys:", list(edited_weekly_assign.keys()) if edited_weekly_assign else None)
print("mkt_monthlyThemeTopic:", monthly_theme_topic)
print("mkt_monthlyThemeContent:", monthly_theme_content)
print("mkt_monthlyThemes length:", len(monthly_themes) if monthly_themes else None)
print("mkt_monthlyProducts:", monthly_products)

# Load current plan from DB
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT planData FROM MasterYearlyPlan WHERE year = 2026")
row = cursor.fetchone()
if row:
    current_plan = json.loads(row[0])
    # Update with reconstructed values
    current_plan["mkt_brandingCost"] = branding_cost
    current_plan["mkt_travelCost"] = travel_cost
    current_plan["mkt_editedStaff"] = edited_staff if edited_staff else {}
    current_plan["mkt_customStaffIds"] = custom_staff_ids if custom_staff_ids else []
    current_plan["mkt_deletedBaseStaffIds"] = []
    current_plan["mkt_editedContentPlan"] = edited_content_plan if edited_content_plan else {}
    current_plan["mkt_customContentPlanIds"] = custom_content_plan_ids if custom_content_plan_ids else []
    current_plan["mkt_editedAdPlan"] = edited_ad_plan if edited_ad_plan else {}
    current_plan["mkt_customAdPlanIds"] = custom_ad_plan_ids if custom_ad_plan_ids else []
    current_plan["mkt_editedWeeklyAssign"] = edited_weekly_assign if edited_weekly_assign else {}
    current_plan["mkt_monthlyThemeTopic"] = monthly_theme_topic if monthly_theme_topic else ""
    current_plan["mkt_monthlyThemeContent"] = monthly_theme_content if monthly_theme_content else ""
    current_plan["mkt_monthlyThemes"] = monthly_themes if monthly_themes else []
    current_plan["mkt_monthlyProducts"] = monthly_products if monthly_products else {}
    
    # Save a temp backup of the dev.db just in case!
    shutil.copy2(db_path, db_path + ".temp_backup")
    
    # Save back to database
    cursor.execute(
        "UPDATE MasterYearlyPlan SET planData = ? WHERE year = 2026",
        (json.dumps(current_plan, ensure_ascii=False),)
    )
    conn.commit()
    print("Database updated with recovered marketing plan!")
else:
    print("Error: Could not fetch master plan row for 2026.")
conn.close()
