import re

file_path = "src/app/(dashboard)/hr/recruitment/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update filter in line 2040 (approx)
target1 = '''const interviewReqs = requests.filter(r => (r.candidates || []).some(c => ["DeptApproved", "Interviewing"].includes(c.status)));'''
replacement1 = '''const interviewReqs = requests.filter(r => (r.candidates || []).some(c => ["DeptApproved", "Interviewing", "Đã gửi thư mời"].includes(c.status)));'''
if target1 in content:
    content = content.replace(target1, replacement1)

# 2. Update filter in line 2054 (approx)
target2 = '''(req.candidates || []).filter(c => ["DeptApproved", "Interviewing"].includes(c.status)).forEach(can => {'''
replacement2 = '''(req.candidates || []).filter(c => ["DeptApproved", "Interviewing", "Đã gửi thư mời"].includes(c.status)).forEach(can => {'''
if target2 in content:
    content = content.replace(target2, replacement2)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated filters successfully")
