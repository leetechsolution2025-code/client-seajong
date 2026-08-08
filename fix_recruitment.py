import re

file_path = "src/app/(dashboard)/hr/recruitment/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target = "{selectedCandidate.skills?.split('\\n').map((line: string, i: number) => {"
replacement = "{(Array.isArray(selectedCandidate.skills) ? selectedCandidate.skills.join('\\n') : (selectedCandidate.skills || '')).split('\\n').map((line: string, i: number) => {"

if target in content:
    content = content.replace(target, replacement)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed recruitment page")
else:
    print("Target not found")
