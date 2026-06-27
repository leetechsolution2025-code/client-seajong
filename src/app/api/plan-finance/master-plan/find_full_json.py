import re
import json

db_path = "/Users/leanhvan/master-project/prisma/dev.db"

with open(db_path, "rb") as f:
    raw_bytes = f.read()

text = raw_bytes.decode("utf-8", errors="ignore")

# Let's search for all substrings starting with '{"revenueAgent"' and ending with '}'
# that contain '"mkt_editedContentPlan"'
pattern = re.compile(r'\{"revenueAgent"[^{}]*?(?:\{[^{}]*?(?:\{[^{}]*?\}[^{}]*?)*\}[^{}]*?)*?\}')

# Since regex on huge strings can be slow or overflow, let's search for indices of '{"revenueAgent"'
start_indices = [m.start() for m in re.finditer(r'\{"revenueAgent"', text)]
print(f"Found {len(start_indices)} potential start points.")

for idx in start_indices:
    # Try parsing starting from this index by matching braces
    brace_count = 0
    json_str = ""
    for i in range(idx, len(text)):
        char = text[i]
        json_str += char
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count == 0:
                # Try to parse
                try:
                    parsed = json.loads(json_str)
                    mkt = parsed.get("mkt_editedContentPlan", {})
                    mkt_themes = parsed.get("mkt_monthlyThemes", [])
                    print(f"Start index {idx}, length {len(json_str)}, valid JSON: Yes!")
                    print(f"  mkt_editedContentPlan size: {len(mkt)}")
                    print(f"  mkt_monthlyThemes size: {len(mkt_themes)}")
                    # Let's print the dict keys
                    print(f"  keys: {list(parsed.keys())[-15:]}")
                except Exception as e:
                    pass
                break
