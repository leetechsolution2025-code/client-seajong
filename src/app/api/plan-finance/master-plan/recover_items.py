import json
import re

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
        start += 1

# Extract individual content plans
content_plan_matches = list(find_all_occurrences('"cp_custom_', text))
recovered_cp = {}
for idx in content_plan_matches:
    # Find the key name, e.g. cp_custom_1782276942145
    end_key = text.find('"', idx + 1)
    if end_key == -1:
        continue
    key = text[idx+1:end_key]
    
    # Find the colon and the start of the object '{'
    start_brace = text.find('{', end_key, end_key + 10)
    if start_brace == -1:
        continue
        
    # Parse the object
    brace_count = 0
    json_str = ""
    for i in range(start_brace, len(text)):
        char = text[i]
        json_str += char
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count == 0:
                try:
                    parsed = json.loads(json_str)
                    # check it looks like a content plan
                    if parsed and "pillar" in parsed:
                        if key not in recovered_cp or len(json.dumps(parsed)) > len(json.dumps(recovered_cp[key])):
                            recovered_cp[key] = parsed
                except Exception:
                    pass
                break

# Extract individual ad plans
ad_plan_matches = list(find_all_occurrences('"ad_custom_', text))
recovered_ad = {}
for idx in ad_plan_matches:
    end_key = text.find('"', idx + 1)
    if end_key == -1:
        continue
    key = text[idx+1:end_key]
    
    start_brace = text.find('{', end_key, end_key + 10)
    if start_brace == -1:
        continue
        
    brace_count = 0
    json_str = ""
    for i in range(start_brace, len(text)):
        char = text[i]
        json_str += char
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count == 0:
                try:
                    parsed = json.loads(json_str)
                    if parsed and "objective" in parsed:
                        if key not in recovered_ad or len(json.dumps(parsed)) > len(json.dumps(recovered_ad[key])):
                            recovered_ad[key] = parsed
                except Exception:
                    pass
                break

print("=== Individual Recovered Content Plans ===")
for k, v in recovered_cp.items():
    print(f"- {k}: {v.get('pillar')} ({len(json.dumps(v))} bytes)")

print("\n=== Individual Recovered Ad Plans ===")
for k, v in recovered_ad.items():
    print(f"- {k}: {v.get('topic')} ({len(json.dumps(v))} bytes)")
