import re

file_path = "src/app/(dashboard)/finance/debts/DebtReconciliationModal.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target = 'const isReceivable = debt ? (debt.type?.toUpperCase() === "RECEIVABLE" || debt.type === "phai-thu") : true;'
replacement = '''const typeUpper = debt?.type?.toUpperCase() || "";
  const isReceivable = debt ? (typeUpper === "RECEIVABLE" || typeUpper === "PHAI-THU" || typeUpper === "PHAI_THU") : true;'''

if target in content:
    content = content.replace(target, replacement)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated isReceivable check successfully.")
else:
    print("Target string not found!")
