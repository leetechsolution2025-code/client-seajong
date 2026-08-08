import re

with open("src/app/(dashboard)/sales/partners/page.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i in range(6860, 7060):
    if i < len(lines):
        if "Number(selectedPartner.step)" in lines[i]:
            lines[i] = lines[i].replace("Number(selectedPartner.step)", "Number(currentStep)")

with open("src/app/(dashboard)/sales/partners/page.tsx", "w", encoding="utf-8") as f:
    f.writelines(lines)

print("Fixed offcanvas step dependency")
