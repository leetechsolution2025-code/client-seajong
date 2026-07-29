import os

# 1. src/app/api/finance/inventory/route.ts
f1 = "src/app/api/finance/inventory/route.ts"
if os.path.exists(f1):
    with open(f1, 'r') as f: content = f.read()
    content = content.replace("dinhMuc: { include: { vatTu: true } }", "dinhMucs: { include: { vatTu: true } }")
    content = content.replace("i.stocks.", "((i as any).stocks || []).")
    content = content.replace("reduce((sum, s) =>", "reduce((sum: number, s: any) =>")
    content = content.replace("s.tonHienTai", "(s.tonHienTai || 0)")
    content = content.replace("reduce((sum: any, s: any)", "reduce((sum: number, s: any)")
    with open(f1, 'w') as f: f.write(content)

# 2. src/app/api/logistics/inventory/import/route.ts
f2 = "src/app/api/logistics/inventory/import/route.ts"
if os.path.exists(f2):
    with open(f2, 'r') as f: content = f.read()
    content = content.replace("const skippedItems = [];", "const skippedItems: any[] = [];")
    with open(f2, 'w') as f: f.write(content)

# 3. src/app/api/plan-finance/inventory/bom-check/route.ts
f3 = "src/app/api/plan-finance/inventory/bom-check/route.ts"
if os.path.exists(f3):
    with open(f3, 'r') as f: content = f.read()
    content = content.replace("reduce((s, st) => s + (st.tonHienTai || 0), 0)", "reduce((s: number, st: any) => s + (st.tonHienTai || 0), 0)")
    with open(f3, 'w') as f: f.write(content)

# 4. src/app/api/plan-finance/inventory/stats/route.ts
f4 = "src/app/api/plan-finance/inventory/stats/route.ts"
if os.path.exists(f4):
    with open(f4, 'r') as f: content = f.read()
    content = content.replace("items: true", "inventoryItems: true")
    content = content.replace("c.items", "((c as any).inventoryItems || [])")
    content = content.replace("reduce((s, it) => s + (it.soLuong || 0), 0)", "reduce((s: number, it: any) => s + (it.soLuong || 0), 0)")
    with open(f4, 'w') as f: f.write(content)

# 5. src/app/api/plan-finance/sales/[id]/route.ts
f5 = "src/app/api/plan-finance/sales/[id]/route.ts"
if os.path.exists(f5):
    with open(f5, 'r') as f: content = f.read()
    content = content.replace("items: { some: { saleOrderId: id } }", "inventoryItems: { some: { saleOrderItems: { some: { saleOrderId: id } } } }")
    with open(f5, 'w') as f: f.write(content)

