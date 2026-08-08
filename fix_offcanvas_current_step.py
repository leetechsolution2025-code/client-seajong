import re

with open("src/app/(dashboard)/sales/partners/page.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i in range(6700, 7800):
    if i < len(lines):
        # We replace Number(selectedPartner.step) with Number(currentStep) for layout conditions
        if "Number(selectedPartner.step) ===" in lines[i] or "Number(selectedPartner.step) >=" in lines[i] or "Number(selectedPartner.step) <" in lines[i] or "Number(selectedPartner.step) !==" in lines[i]:
            # Do NOT replace inside isStep2TransitionAllowed
            if "isStep2TransitionAllowed" not in lines[i]:
                lines[i] = re.sub(r'Number\(selectedPartner\.step\)', 'Number(currentStep)', lines[i])

with open("src/app/(dashboard)/sales/partners/page.tsx", "w", encoding="utf-8") as f:
    f.writelines(lines)

print("Applied currentStep to offcanvas")
