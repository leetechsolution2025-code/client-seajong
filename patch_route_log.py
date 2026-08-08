import re

file_path = "src/app/api/hr/candidates/schedule-interview/route.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target = '''    const body = await request.json();'''
replacement = '''    const body = await request.json();
    console.log("SCHEDULE INTERVIEW API BODY:", body);'''

if target in content and "SCHEDULE INTERVIEW API BODY" not in content:
    content = content.replace(target, replacement)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched route.ts to log body")
