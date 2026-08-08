import re

file_path = "src/app/api/hr/candidates/schedule-interview/route.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target1 = '''<span style="color: #4a5568; font-size: 14px;">${config?.fromName || "Ban Nhân sự"} (${config?.fromEmail || ""})</span>'''
replacement1 = '''<span style="color: #4a5568; font-size: 14px;">${contactName || config?.fromName || "Ban Nhân sự"} (${contactPhone || config?.fromEmail || ""})</span>'''

if target1 in content:
    content = content.replace(target1, replacement1)

target2 = '''        fromName: config?.fromName || "Ban Nhân sự",'''
replacement2 = '''        fromName: contactName || config?.fromName || "Ban Nhân sự",'''

if target2 in content:
    content = content.replace(target2, replacement2)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated HTML contact successfully")
