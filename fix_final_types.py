import re
with open("src/app/api/plan-finance/stock-card/route.ts", "r") as f:
    c = f.read()

c = c.replace('category: { select: { id: true, tenHang: true } }', 'category: { select: { id: true, name: true } }')
c = c.replace('category: item.categoryId', 'categoryId: item.categoryId')
c = c.replace('inventoryStock:', 'stocks:')
c = c.replace('item.inventoryStock', 'item.stocks')
c = c.replace('s =>', '(s: any) =>')
c = c.replace('st =>', '(st: any) =>')
c = c.replace('st.fromWarehouse?.name', 'st.fromWarehouseId')
c = c.replace('st.toWarehouse?.name', 'st.toWarehouseId')
c = c.replace('fromWarehouse: st.fromWarehouse', 'fromWarehouseId: st.fromWarehouseId')
c = c.replace('toWarehouse: st.toWarehouse', 'toWarehouseId: st.toWarehouseId')

with open("src/app/api/plan-finance/stock-card/route.ts", "w") as f:
    f.write(c)


with open("src/app/api/production/bom/[id]/route.ts", "r") as f:
    c2 = f.read()
c2 = c2.replace('i.inventoryItem', 'i.items')
with open("src/app/api/production/bom/[id]/route.ts", "w") as f:
    f.write(c2)
