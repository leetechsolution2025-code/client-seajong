import re
with open("src/app/api/plan-finance/sales/[id]/route.ts", "r") as f:
    c = f.read()

c = c.replace('order.customer?.tenHang', 'order.customer?.name')
c = c.replace('usr?.tenHang', 'usr?.name')
c = c.replace('usr.tenHang', 'usr.name')
c = c.replace('session.user.tenHang', 'session.user.name')
c = c.replace('m.material?', 'm.inventoryItem?')
c = c.replace('m.material!', 'm.inventoryItem!')

with open("src/app/api/plan-finance/sales/[id]/route.ts", "w") as f:
    f.write(c)

