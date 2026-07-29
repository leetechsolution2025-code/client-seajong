import os
import re

files_to_fix = [
    "src/app/api/logistics/inventory/route.ts",
    "src/app/api/plan-finance/inventory/import-excel/route.ts",
    "src/app/api/plan-finance/sales/[id]/route.ts",
    "src/app/api/plan-finance/stock-card/items/route.ts",
    "src/app/api/plan-finance/stock-card/route.ts",
    "src/app/api/production/bom/[id]/route.ts",
    "src/app/api/production/bom/import-excel/route.ts",
    "src/app/api/production/bom/route.ts",
    "src/app/api/production/orders/[id]/route.ts"
]

for file_path in files_to_fix:
    if not os.path.exists(file_path):
        continue
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Generic replacements
    content = content.replace("prisma.materialStock", "prisma.inventoryStock")
    content = content.replace("prisma.materialItem", "prisma.inventoryItem")
    content = content.replace("vt.material.id", "vt.inventoryItem.id")
    content = content.replace("vt.material.name", "vt.inventoryItem.tenHang")
    content = content.replace("vt.material.code", "vt.inventoryItem.code")
    content = content.replace("vt.material.unit", "vt.inventoryItem.donVi")
    content = content.replace("v.materialId", "v.inventoryItemId")
    content = content.replace("m.materialId", "m.inventoryItemId")
    content = content.replace("item.materialItem", "item.inventoryItem")
    content = content.replace("item.materialId", "item.inventoryItemId")
    content = content.replace("item.materialStock", "item.inventoryStock")
    content = content.replace("manufacturedProductId:", "")
    content = content.replace("materialItemId:", "")
    content = content.replace("where: { name: ", "where: { tenHang: ")
    content = content.replace("data: { name: ", "data: { tenHang: ")
    content = content.replace("select: { unit: ", "select: { donVi: ")

    # Specific fixes for sales route where item is mapped from DinhMucVatTu
    content = content.replace("item.material?.category", "item.inventoryItem?.category")
    content = content.replace("item.material?.name", "item.inventoryItem?.tenHang")
    content = content.replace("item.material?.code", "item.inventoryItem?.code")
    content = content.replace("item.material?.id", "item.inventoryItem?.id")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Fixed errors")
