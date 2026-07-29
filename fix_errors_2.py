import os
import re

files_to_fix = [
    "src/app/api/plan-finance/sales/[id]/route.ts",
    "src/app/api/plan-finance/stock-card/items/route.ts",
    "src/app/api/plan-finance/stock-card/route.ts",
    "src/app/api/production/bom/[id]/route.ts",
    "src/app/api/production/bom/import-excel/route.ts",
    "src/app/api/production/orders/[id]/route.ts"
]

for file_path in files_to_fix:
    if not os.path.exists(file_path):
        continue
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Generic
    content = content.replace("prisma.materialStock", "prisma.inventoryStock")
    content = content.replace("materialItem", "inventoryItem")
    content = content.replace("materialId", "inventoryItemId")
    content = content.replace("materialStock", "inventoryStock")
    
    # Specific fields mapped differently
    content = content.replace("name:", "tenHang:")
    content = content.replace("unit:", "donVi:")
    content = content.replace("price:", "giaNhap:")
    content = content.replace("minStock:", "soLuongMin:")
    
    content = content.replace(".name", ".tenHang")
    content = content.replace(".unit", ".donVi")
    content = content.replace(".price", ".giaNhap")
    content = content.replace(".minStock", ".soLuongMin")

    # For orders/[id]/route.ts
    content = content.replace("vt.material?.category", "vt.inventoryItem?.category")
    content = content.replace("vt.material?.name", "vt.inventoryItem?.tenHang")
    content = content.replace("vt.material?.code", "vt.inventoryItem?.code")
    content = content.replace("vt.material?.id", "vt.inventoryItem?.id")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Fixed more errors")
