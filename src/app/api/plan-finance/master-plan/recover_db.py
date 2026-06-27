import re

db_path = "/Users/leanhvan/master-project/prisma/dev.db"
out_path = "/Users/leanhvan/master-project/prisma/recovered_records.txt"

with open(db_path, "rb") as f:
    data = f.read()

# Let's search for the pattern "mkt_brandingCost" in the binary data
matches = [m.start() for m in re.finditer(b'"mkt_brandingCost"', data)]

print(f"Found {len(matches)} matches in binary.")

recovered_blocks = []
for idx in matches:
    # Extract a larger window around the match
    start = max(0, idx - 15000)
    end = min(len(data), idx + 15000)
    chunk = data[start:end]
    
    # Decode with utf-8 ignoring errors
    text = chunk.decode("utf-8", errors="ignore")
    
    # We want to find a JSON string containing the yearly plan keys
    # Let's find any text matching the pattern of a JSON object
    # We can search for the start and end of the JSON object containing "revenueAgent" and "mkt_brandingCost"
    # Let's search for '"revenueAgent"' and follow it to the closing brace
    for json_match in re.finditer(r'\{"revenueAgent"', text):
        json_start = json_match.start()
        # Find the closing brace. Since it is nested, let's look for a large block containing '"mkt_monthlyThemes"'
        # and ending with '}'
        # A simple scanner for matching braces:
        brace_count = 0
        json_end = -1
        for i in range(json_start, len(text)):
            if text[i] == '{':
                brace_count += 1
            elif text[i] == '}':
                brace_count -= 1
                if brace_count == 0:
                    json_end = i + 1
                    break
        if json_end != -1:
            json_str = text[json_start:json_end]
            if "mkt_editedWeeklyAssign" in json_str and json_str not in recovered_blocks:
                recovered_blocks.append(json_str)

print(f"Recovered {len(recovered_blocks)} JSON blocks.")
with open(out_path, "w", encoding="utf-8") as out:
    for block in recovered_blocks:
        out.write(block + "\n\n=========================================\n\n")
