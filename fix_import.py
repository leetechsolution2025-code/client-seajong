import re
with open("src/app/api/logistics/inventory/import/route.ts", "r") as f:
    c = f.read()

c = c.replace('tx.manufacturedProduct', 'tx.inventoryItem')
c = c.replace('tx.materialItem', 'tx.inventoryItem')
c = c.replace('tx.materialStock', 'tx.inventoryStock')

with open("src/app/api/logistics/inventory/import/route.ts", "w") as f:
    f.write(c)
