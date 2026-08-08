import re

file_path = "src/app/(dashboard)/hr/recruitment/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target = "if (canSkillsList.some(cs => cs.includes(rs) || rs.includes(cs))) matchCount++;"
replacement = "if (canSkillsList.some((cs: string) => cs.includes(rs) || rs.includes(cs))) matchCount++;"

if target in content:
    content = content.replace(target, replacement)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed recruitment page 4")
else:
    print("Target not found")
