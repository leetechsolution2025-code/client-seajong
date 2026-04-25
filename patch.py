import re

with open('src/components/approvals/ApprovalCenter.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

start_pattern = r"function ApprovalDetail\(\{.*?return \("
end_pattern = r"^\s*\}\s*\n*\s*function InfoRow\(\{ icon,"

# Find start of ApprovalDetail
start_idx = content.find("function ApprovalDetail({")
if start_idx == -1:
    print("start not found")
    exit(1)

# Find start of InfoRow
end_idx = content.find("function InfoRow({ icon, label")
if end_idx == -1:
    print("end not found")
    exit(1)

with open('patch_replacement.txt', 'r', encoding='utf-8') as f:
    replacement = f.read()

new_content = content[:start_idx] + replacement + "\n\n" + content[end_idx:]

with open('src/components/approvals/ApprovalCenter.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Patch applied successfully")
