import re

with open("src/app/(dashboard)/sales/partners/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# For the generic transition button (Step 1, 2, 3)
content = content.replace(
    "{Number(currentStep) < 4 && (",
    "{Number(currentStep) < 4 && Number(selectedPartner.step) === Number(currentStep) && ("
)

# For the 'Từ bỏ' and 'Xin đặc cách' block (Step 1, 2, 6)
# Actually, the entire else block after "Number(currentStep) === 4 || Number(currentStep) === 5" is for action buttons.
# Let's replace the inner conditions
content = content.replace(
    "{Number(currentStep) === 6 ? (",
    "{Number(currentStep) === 6 && Number(selectedPartner.step) === 6 ? ("
)

content = content.replace(
    "onClick={() => handleAbandonPartner(selectedPartner)}",
    "onClick={() => handleAbandonPartner(selectedPartner)} disabled={Number(selectedPartner.step) > Number(currentStep)}"
)

content = content.replace(
    "{Number(currentStep) === 2 && (",
    "{Number(currentStep) === 2 && Number(selectedPartner.step) === 2 && ("
)

content = content.replace(
    "{Number(currentStep) === 3 && (",
    "{Number(currentStep) === 3 && Number(selectedPartner.step) === 3 && ("
)


with open("src/app/(dashboard)/sales/partners/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed footer actions to only show when selectedPartner.step === currentStep for specific buttons")
