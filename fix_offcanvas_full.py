import re

with open("src/app/(dashboard)/sales/partners/page.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i in range(7250, 7800):
    if i < len(lines):
        if "selectedPartner.step >" in lines[i] or "selectedPartner.step <" in lines[i] or "selectedPartner.step =" in lines[i]:
            lines[i] = re.sub(r'selectedPartner\.step', 'Number(currentStep)', lines[i])

with open("src/app/(dashboard)/sales/partners/page.tsx", "w", encoding="utf-8") as f:
    f.writelines(lines)

print("Replaced selectedPartner.step with Number(currentStep) for UI toggles")
