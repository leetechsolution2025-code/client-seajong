import re
import os

def fix(path, fixes):
    if not os.path.exists(path): return
    with open(path, "r", encoding="utf-8") as f:
        c = f.read()
    for o, n in fixes:
        c = c.replace(o, n)
    with open(path, "w", encoding="utf-8") as f:
        f.write(c)

fix("src/app/api/plan-finance/stock-card/items/route.ts", [
    ("s.material", "s.inventoryItem")
])

fix("src/app/api/plan-finance/stock-card/route.ts", [
    ("category: true", "category: true"), # No change
    ("category: item.categoryId", "category: item.categoryId"), # No change
    ("fromWarehouse: st.fromWarehouseId", "fromWarehouse: st.fromWarehouseId"),
    ("toWarehouse: st.toWarehouseId", "toWarehouse: st.toWarehouseId"),
])

# For sales route
fix("src/app/api/plan-finance/sales/[id]/route.ts", [
    ("customer.tenHang", "customer.name"),
    ("item.tenHang", "item.name"),
    ("vt.material", "vt.inventoryItem")
])

# For bom route
fix("src/app/api/production/bom/[id]/route.ts", [
    ("materialItem: true", "items: true"),
    ("item.inventoryItem", "item.items")
])

