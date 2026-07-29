import re
with open("src/app/api/plan-finance/sales/[id]/route.ts", "r") as f:
    c = f.read()

c = c.replace('tenHang: true,', 'name: true,')
c = c.replace('customer: { select: { name: true, name: true, dienThoai: true } },', 'customer: { select: { name: true, dienThoai: true } },')
c = c.replace('item.saleOrderItems', 'item.saleOrders')
c = c.replace('customer.customerId', 'customer.id')

with open("src/app/api/plan-finance/sales/[id]/route.ts", "w") as f:
    f.write(c)
