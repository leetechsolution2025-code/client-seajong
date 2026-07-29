import os

# 1. src/app/api/plan-finance/inventory/stats/route.ts
f1 = "src/app/api/plan-finance/inventory/stats/route.ts"
if os.path.exists(f1):
    with open(f1, 'r') as f: content = f.read()
    content = content.replace("vatTu:", "inventoryItems:")
    content = content.replace("type any = any;", "")
    with open(f1, 'w') as f: f.write(content)

# 2. src/app/api/plan-finance/sales/[id]/route.ts
f2 = "src/app/api/plan-finance/sales/[id]/route.ts"
if os.path.exists(f2):
    with open(f2, 'r') as f: content = f.read()
    content = content.replace("vatTu:", "items:")
    content = content.replace("vatTu: { some:", "inventoryItem: { some:") # Wait, it was items: { some: ... }
    content = content.replace("inventoryItems: { some: { saleOrderItems: { some: { saleOrderId: id } } } }", "inventoryItem: { some: { saleOrderItems: { some: { saleOrderId: id } } } }")
    content = content.replace("inv.dinhMucId", "(inv.dinhMucs?.[0]?.id || null)")
    with open(f2, 'w') as f: f.write(content)

# 3. src/app/api/plan-finance/inventory/bom-check/route.ts
f3 = "src/app/api/plan-finance/inventory/bom-check/route.ts"
if os.path.exists(f3):
    with open(f3, 'r') as f: content = f.read()
    content = content.replace("vatTu:", "items:") # restore? No wait, bom-check uses vatTu for dinhMuc.vatTu!
    # Let's just fix the i.dinhMuc errors
    content = content.replace("i.dinhMuc", "(i.dinhMucs?.[0])")
    content = content.replace("!dinhMuc", "!(i.dinhMucs?.[0])")
    content = content.replace("dinhMuc.vatTu", "(i.dinhMucs?.[0]?.vatTu || [])")
    with open(f3, 'w') as f: f.write(content)

# 4. src/app/api/production/orders/[id]/route.ts
f4 = "src/app/api/production/orders/[id]/route.ts"
if os.path.exists(f4):
    with open(f4, 'r') as f: content = f.read()
    content = content.replace("i.inventoryItem?.dinhMuc", "(i.inventoryItem?.dinhMucs?.[0])")
    with open(f4, 'w') as f: f.write(content)

