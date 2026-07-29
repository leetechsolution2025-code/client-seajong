import re
with open("src/app/api/logistics/inventory/import/route.ts", "r") as f:
    c = f.read()

c = c.replace('name: row.tenThanhPham', 'tenHang: row.tenThanhPham')
c = c.replace('name: row.tenVatTu', 'tenHang: row.tenVatTu')
c = c.replace('materialId_warehouseId:', 'inventoryItemId_warehouseId:')
c = c.replace('materialId:', 'inventoryItemId:')
with open("src/app/api/logistics/inventory/import/route.ts", "w") as f:
    f.write(c)

with open("src/app/api/plan-finance/sales/[id]/route.ts", "r") as f:
    c = f.read()
c = c.replace('tenHang: guest.tenHang', 'name: guest.name')
c = c.replace('tenHang: guest.name', 'name: guest.name')
c = c.replace('guest.tenHang', 'guest.name')
c = c.replace('{ id: null, tenHang', '{ id: null, name')
with open("src/app/api/plan-finance/sales/[id]/route.ts", "w") as f:
    f.write(c)

with open("src/app/api/plan-finance/stock-card/route.ts", "r") as f:
    c = f.read()
c = c.replace('stocks: mat.inventoryStock,', 'stocks: mat.stocks,')
with open("src/app/api/plan-finance/stock-card/route.ts", "w") as f:
    f.write(c)

with open("src/app/api/production/bom/[id]/route.ts", "r") as f:
    c = f.read()
c = c.replace('item.inventoryItem', 'item.items')
with open("src/app/api/production/bom/[id]/route.ts", "w") as f:
    f.write(c)

