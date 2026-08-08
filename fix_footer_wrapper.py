import re

with open("src/app/(dashboard)/sales/partners/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Replace the start of the footer
content = content.replace(
    '              {/* Bottom Actions */}\n              <div className="p-3 border-top bg-white d-flex justify-content-between gap-2 shadow-lg animate__animated animate__slideInUp">',
    '              {/* Bottom Actions */}\n              {(Number(currentStep) >= 4 || Number(selectedPartner.step) === Number(currentStep)) && (\n              <div className="p-3 border-top bg-white d-flex justify-content-between gap-2 shadow-lg animate__animated animate__slideInUp">'
)

# Replace the end of the footer wrapper (just before </AnimatePresence>)
# Let's find the exact closing tag of the footer
