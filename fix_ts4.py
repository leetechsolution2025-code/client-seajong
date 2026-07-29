import os

files_to_fix = [
    "src/app/api/finance/inventory/route.ts",
    "src/app/api/plan-finance/inventory/[id]/route.ts",
    "src/app/api/plan-finance/inventory/bom-check/route.ts",
    "src/app/api/plan-finance/inventory/route.ts",
    "src/app/api/plan-finance/inventory/stats/route.ts",
    "src/app/api/plan-finance/sales/[id]/route.ts",
    "src/app/api/production/orders/[id]/route.ts",
]

for f in files_to_fix:
    if not os.path.exists(f): continue
    with open(f, 'r') as file: content = file.read()
    
    content = content.replace("dinhMuc: true", "dinhMucs: true")
    content = content.replace("dinhMuc: {", "dinhMucs: {")
    content = content.replace("i.stocks", "((i as any).stocks || [])")
    content = content.replace("i.dinhMuc", "(i.dinhMucs && i.dinhMucs.length > 0 ? i.dinhMucs[0] : null)")
    content = content.replace("inv.dinhMucId", "(inv.dinhMucs && inv.dinhMucs.length > 0 ? inv.dinhMucs[0].id : null)")
    content = content.replace("items: true", "inventoryItems: true")
    content = content.replace("items: { some:", "inventoryItems: { some:")
    content = content.replace("type any = any;", "") # Fix "Type alias name cannot be 'any'"
    content = content.replace("reduce((s, st) =>", "reduce((s: number, st: any) =>")
    content = content.replace("reduce((s, it) =>", "reduce((s: number, it: any) =>")
    content = content.replace("(vt: any)", "vt")
    content = content.replace("items: {", "vatTu: {") # Fix "items does not exist in DinhMucWhereInput"

    with open(f, 'w') as file: file.write(content)

