db_path = "/Users/leanhvan/master-project/prisma/dev.db"

with open(db_path, "rb") as f:
    raw_bytes = f.read()

text = raw_bytes.decode("utf-8", errors="ignore")

# Find all occurrences of the key
matches = []
start = 0
while True:
    start = text.find('"ad_custom_1782281745614"', start)
    if start == -1:
        break
    matches.append(start)
    start += 1

print(f"Found {len(matches)} occurrences of 'ad_custom_1782281745614' in text.")
for i, idx in enumerate(matches):
    print(f"Occurrence {i} at index {idx}:")
    print(text[max(0, idx - 50):idx + 350])
