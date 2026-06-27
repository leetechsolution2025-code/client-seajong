db_path = "/Users/leanhvan/master-project/prisma/dev.db"

with open(db_path, "rb") as f:
    raw_bytes = f.read()

text = raw_bytes.decode("utf-8", errors="ignore")

idx = text.find('"ad_custom_1782281745614"')
if idx != -1:
    print("Found ad_custom_1782281745614 at index", idx)
    # Print the next 2000 chars
    chunk = text[idx:idx+2000]
    print(chunk)
else:
    print("Could not find key in text.")
