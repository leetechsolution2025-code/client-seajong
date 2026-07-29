import re
with open("src/app/api/logistics/dashboard/route.ts", "r") as f:
    c = f.read()

c = c.replace('ms.material.name', 'ms.inventoryItem.tenHang')
c = c.replace('ms.material.spec || ms.material.thongSoKyThuat', 'ms.inventoryItem.ghiChu')
c = c.replace('ms.material.unit', 'ms.inventoryItem.donVi')

with open("src/app/api/logistics/dashboard/route.ts", "w") as f:
    f.write(c)

