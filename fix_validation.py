import re

file_path = "src/app/api/hr/candidates/schedule-interview/route.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target = '''    if (!selectedInterviewers || !Array.isArray(selectedInterviewers) || selectedInterviewers.length === 0) {
      return NextResponse.json({ error: "Chưa chọn người phỏng vấn" }, { status: 400 });
    }'''

replacement = '''    if (actionType !== 'send_email' && !draftOnly) {
      if (!selectedInterviewers || !Array.isArray(selectedInterviewers) || selectedInterviewers.length === 0) {
        return NextResponse.json({ error: "Chưa chọn người phỏng vấn" }, { status: 400 });
      }
    }'''

if target in content:
    content = content.replace(target, replacement)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed validation successfully")
else:
    print("Warning: Target not found")

