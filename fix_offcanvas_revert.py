import re

with open("src/app/(dashboard)/sales/partners/page.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i in range(6700, 7800):
    if i < len(lines):
        lines[i] = re.sub(r'Number\(currentStep\)', 'Number(selectedPartner.step)', lines[i])

with open("src/app/(dashboard)/sales/partners/page.tsx", "w", encoding="utf-8") as f:
    f.writelines(lines)

print("Reverted to selectedPartner.step")
