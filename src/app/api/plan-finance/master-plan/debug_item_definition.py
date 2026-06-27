db_path = "/Users/leanhvan/master-project/prisma/dev.db"

with open(db_path, "rb") as f:
    raw_bytes = f.read()

text = raw_bytes.decode("utf-8", errors="ignore")

idx = text.find('"ad_custom_1782281745614":{')
if idx != -1:
    print("Found ad_custom_1782281745614 definition at index", idx)
    # Parse the object
    brace_count = 0
    json_str = ""
    for i in range(idx + len('"ad_custom_1782281745614":{') - 1, len(text)):
        char = text[i]
        json_str += char
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count == 0:
                print("Found parsed JSON:")
                print(json_str)
                break
else:
    print("Could not find definition in text.")
