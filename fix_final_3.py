import re
with open("src/app/api/logistics/inventory/import/route.ts", "r") as f:
    c = f.read()

c = c.replace('name: item.name', 'tenHang: item.name')

with open("src/app/api/logistics/inventory/import/route.ts", "w") as f:
    f.write(c)

with open("src/app/api/production/bom/[id]/route.ts", "r") as f:
    c2 = f.read()

c2 = c2.replace('dm.inventoryItem?.code', 'dm.code') # dm doesn't include inventoryItem

with open("src/app/api/production/bom/[id]/route.ts", "w") as f:
    f.write(c2)

