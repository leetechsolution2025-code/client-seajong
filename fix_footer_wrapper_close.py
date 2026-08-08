import re

with open("src/app/(dashboard)/sales/partners/page.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i in range(7550, 7770):
    if '              {/* Bottom Actions */}' in lines[i]:
        # add the wrapper condition
        lines[i+1] = '              {(Number(currentStep) >= 4 || Number(selectedPartner.step) === Number(currentStep)) && (\n              <div className="p-3 border-top bg-white d-flex justify-content-between gap-2 shadow-lg animate__animated animate__slideInUp">\n'
    
    if '              </div>' in lines[i] and '            </motion.div>' in lines[i+1]:
        # close the wrapper condition
        lines[i] = '              </div>\n              )}\n'

with open("src/app/(dashboard)/sales/partners/page.tsx", "w", encoding="utf-8") as f:
    f.writelines(lines)

print("Added wrapper around bottom actions")
