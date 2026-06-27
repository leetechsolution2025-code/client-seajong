db_path = "/Users/leanhvan/master-project/prisma/dev.db"
out_path = "/Users/leanhvan/master-project/prisma/ad_plan_matches.txt"

with open(db_path, "rb") as f:
    data = f.read()

import re
matches = [m.start() for m in re.finditer(b'"mkt_editedAdPlan"', data)]

print(f"Found {len(matches)} matches for mkt_editedAdPlan in binary.")

with open(out_path, "w", encoding="utf-8") as out:
    for i, idx in enumerate(matches):
        start = max(0, idx - 1000)
        end = min(len(data), idx + 4000)
        chunk = data[start:end]
        text = chunk.decode("utf-8", errors="ignore")
        
        out.write(f"=== MATCH {i} at binary offset {idx} ===\n")
        cleaned_text = "".join(c if (32 <= ord(c) <= 126 or ord(c) > 127 or c in "\n\r\t") else " " for c in text)
        out.write(cleaned_text + "\n\n")
