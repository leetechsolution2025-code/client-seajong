import re
with open("src/app/api/plan-finance/stock-card/route.ts", "r") as f:
    c = f.read()

# Object literal may only specify known properties, and 'tenHang' does not exist in type 'InventoryCategorySelect<DefaultArgs>'.
c = c.replace('tenHang: true,', 'name: true,')

# Property 'category' does not exist on type '{ ... }'. Did you mean to write 'categoryId'?
c = c.replace('item.category?.name', 'item.categoryId')

# Property 'stocks' does not exist on type '{ ... }'.
c = c.replace('include: { category: true, stocks: true }', 'include: { category: true, inventoryStock: true }')
c = c.replace('item.stocks', 'item.inventoryStock')

# Parameter 's' implicitly has an 'any' type.
c = c.replace('s =>', '(s: any) =>')
c = c.replace('st =>', '(st: any) =>')

# Property 'fromWarehouse' does not exist on type '{ ... }'. Did you mean 'fromWarehouseId'?
c = c.replace('st.fromWarehouse?.name', 'st.fromWarehouseId')
c = c.replace('st.toWarehouse?.name', 'st.toWarehouseId')
c = c.replace('st.fromWarehouse', 'st.fromWarehouseId')
c = c.replace('st.toWarehouse', 'st.toWarehouseId')

with open("src/app/api/plan-finance/stock-card/route.ts", "w") as f:
    f.write(c)

with open("src/app/api/plan-finance/sales/[id]/route.ts", "r") as f:
    c2 = f.read()

c2 = c2.replace('customer.tenHang', 'customer.name')
c2 = c2.replace('item.tenHang', 'item.name')
c2 = c2.replace('vt.material', 'vt.inventoryItem')
c2 = c2.replace('c.tenHang', 'c.name')

with open("src/app/api/plan-finance/sales/[id]/route.ts", "w") as f:
    f.write(c2)

