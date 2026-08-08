import re

file_path = "src/app/(dashboard)/hr/recruitment/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target = '''function ScheduleInterviewOffcanvas({ onClose, onConfirm, onOpenConfig, loading, candidateCount, departmentName, candidateIds, actionType }: {'''
replacement = '''function ScheduleInterviewOffcanvas({ onClose, onConfirm, onOpenConfig, loading, candidateCount, departmentName, candidateIds, actionType, onSaveTimeLocation }: {'''

if target in content:
    content = content.replace(target, replacement)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed destructured props successfully")
else:
    print("Target not found")
