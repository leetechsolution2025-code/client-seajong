import re
# dashboard
with open("src/app/api/logistics/dashboard/route.ts", "r") as f:
    c = f.read()
c = c.replace('material:', 'inventoryItem:')
with open("src/app/api/logistics/dashboard/route.ts", "w") as f:
    f.write(c)

# inventory/import
with open("src/app/api/logistics/inventory/import/route.ts", "r") as f:
    c = f.read()
c = c.replace('prisma.manufacturedProduct', 'prisma.inventoryItem')
c = c.replace('prisma.materialItem', 'prisma.inventoryItem')
c = c.replace('prisma.materialStock', 'prisma.inventoryStock')
with open("src/app/api/logistics/inventory/import/route.ts", "w") as f:
    f.write(c)

# inventory
with open("src/app/api/logistics/inventory/route.ts", "r") as f:
    c = f.read()
c = c.replace('dinhMucs:', 'dinhMuc:')
c = c.replace('productCategoryId', 'categoryId')
c = c.replace('materialId:', 'inventoryItemId:')
with open("src/app/api/logistics/inventory/route.ts", "w") as f:
    f.write(c)

# stock-card
with open("src/app/api/plan-finance/stock-card/route.ts", "r") as f:
    c = f.read()
c = c.replace('inventoryStock:', 'stocks:')
c = c.replace('item.inventoryStock', 'item.stocks')
c = c.replace('category: item.category', 'categoryId: item.categoryId')
with open("src/app/api/plan-finance/stock-card/route.ts", "w") as f:
    f.write(c)

# sales/[id]/route.ts
with open("src/app/api/plan-finance/sales/[id]/route.ts", "r") as f:
    c = f.read()
c = c.replace('customer?.tenHang', 'customer?.name')
c = c.replace('guest.tenHang', 'guest.name')
c = c.replace('tenHang: guest.name', 'name: guest.name')
c = c.replace('item.name', 'item.tenHang')
c = c.replace('inventoryItem?.name', 'inventoryItem?.tenHang')
c = c.replace('m.inventoryItem!.name', 'm.inventoryItem!.tenHang')
c = c.replace('m.inventoryItem!.name', 'm.inventoryItem!.tenHang')
c = c.replace('m.inventoryItem?.name', 'm.inventoryItem?.tenHang')
c = c.replace('vt.inventoryItem?.name', 'vt.inventoryItem?.tenHang')
with open("src/app/api/plan-finance/sales/[id]/route.ts", "w") as f:
    f.write(c)

# production/bom/[id]/route.ts
with open("src/app/api/production/bom/[id]/route.ts", "r") as f:
    c = f.read()
c = c.replace('i.items', 'i.inventoryItem')
c = c.replace('items: true', 'inventoryItem: true')
with open("src/app/api/production/bom/[id]/route.ts", "w") as f:
    f.write(c)

