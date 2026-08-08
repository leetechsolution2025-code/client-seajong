import re

file_path = "/Users/leanhvan/.gemini/antigravity-ide/brain/66da6528-c6b7-434b-a347-e6a7df2dcbdb/task.md"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("- [ ]", "- [x]")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
