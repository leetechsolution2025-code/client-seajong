import re

file_path = "src/app/(dashboard)/hr/recruitment/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target = "{selectedCandidate.matchSummary || selectedCandidate.summary || "
replacement = "{(selectedCandidate as any).matchSummary || selectedCandidate.summary || "

if target in content:
    content = content.replace(target, replacement)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed recruitment page 2")
else:
    print("Target not found")
