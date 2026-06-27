db_path = "/Users/leanhvan/master-project/prisma/dev.db"

with open(db_path, "rb") as f:
    raw_bytes = f.read()

text = raw_bytes.decode("utf-8", errors="ignore")

idx = text.find('"ad_custom_1782281745614":{')
if idx != -1:
    print("Found definition at", idx)
    # Read 5000 characters from idx
    chunk = text[idx:idx+5000]
    # Write to a file
    with open("/Users/leanhvan/master-project/prisma/debug_output.txt", "w", encoding="utf-8") as out:
        out.write(chunk)
    print("Dumped 5000 characters to prisma/debug_output.txt")
else:
    print("Not found")
