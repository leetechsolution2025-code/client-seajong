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
    ("material:", "inventoryItem:"),
    ("material.", "inventoryItem."),
])

fix("src/app/api/plan-finance/stock-card/route.ts", [
    ("tenHang: true,", ""),
    ("include: { category: true, stocks: true }", "include: { category: true, stocks: true }"),
    (".category?.name", ".category?.name"),
    ("tenHang: true,", ""),
])

fix("src/app/api/production/orders/[id]/route.ts", [
    ("vt.material?.category", "vt.inventoryItem?.category"),
    ("vt.material?.id", "vt.inventoryItem?.id"),
    ("vt.material?.code", "vt.inventoryItem?.code"),
    ("vt.material?.name", "vt.inventoryItem?.tenHang"),
    ("vt.material?.tenHang", "vt.inventoryItem?.tenHang"),
    ("vt.category?.name || vt.material?.category?.name", "vt.category?.name || vt.inventoryItem?.category?.name"),
    ("session.user.tenHang", "session.user.name")
])

fix("src/app/api/production/bom/[id]/route.ts", [
    ("include: { inventoryItem: true }", "include: { category: true }"), # removed materialItem inclusion
])

print("Fixed stock-card and order errors")
