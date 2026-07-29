import os
import re

def fix(path, fixes):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()
    for o, n in fixes:
        c = c.replace(o, n)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)

fix("src/app/api/plan-finance/stock-card/items/route.ts", [
    ("category: { select: { id: true, tenHang: true } }", "category: { select: { id: true, name: true } }"),
    ("category?.tenHang", "category?.name"),
    ("s.inventoryItem!", "s.inventoryItem"),
    ("s => s.inventoryItem", "s => s.inventoryItem"),
])

fix("src/app/api/plan-finance/stock-card/route.ts", [
    ("tenHang: true,", "name: true,"),
    ("item.category", "item.categoryId"), # error TS2551
    ("st.category", "st.categoryId"),
    ("st.fromWarehouse", "st.fromWarehouseId"),
    ("st.toWarehouse", "st.toWarehouseId"),
    ("inventoryItem.category?.name", "inventoryItem.categoryId"),
    ("include: { category: true, stocks: true }", "include: { category: true, stocks: true }"),
])

fix("src/app/api/production/orders/[id]/route.ts", [
    ("vt.material", "vt.inventoryItem"),
])

print("Fixed more")
