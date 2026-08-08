import re

file_path = "src/app/(dashboard)/hr/recruitment/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target = """                            const reqSkillsList = reqSkillsText.toLowerCase().split(/[\\n,]/).map(s => s.trim().replace(/[*•-]/g, '')).filter(Boolean);
                            const canSkillsList = (can.skills || "").toLowerCase().split(/[\\n,]/).map(s => s.trim().replace(/[*•-]/g, '')).filter(Boolean);"""

replacement = """                            const reqSkillsList = reqSkillsText.toLowerCase().split(/[\\n,]/).map((s: string) => s.trim().replace(/[*•-]/g, '')).filter(Boolean);
                            const canSkillsStr = Array.isArray(can.skills) ? can.skills.join('\\n') : (can.skills || "");
                            const canSkillsList = canSkillsStr.toLowerCase().split(/[\\n,]/).map((s: string) => s.trim().replace(/[*•-]/g, '')).filter(Boolean);"""

if target in content:
    content = content.replace(target, replacement)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed recruitment page 3")
else:
    print("Target not found")
