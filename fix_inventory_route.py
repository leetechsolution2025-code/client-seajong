import re
with open("src/app/api/logistics/inventory/route.ts", "r") as f:
    c = f.read()

# Replace all manufacturedProduct with inventoryItem where it makes sense
c = c.replace('prisma.manufacturedProduct', 'prisma.inventoryItem')
c = c.replace('prisma.materialItem', 'prisma.inventoryItem')
c = c.replace('prisma.materialStock', 'prisma.inventoryStock')

with open("src/app/api/logistics/inventory/route.ts", "w") as f:
    f.write(c)

with open("src/app/api/logistics/inventory/import/route.ts", "r") as f:
    c2 = f.read()

c2 = c2.replace('prisma.manufacturedProduct', 'prisma.inventoryItem')
c2 = c2.replace('prisma.materialItem', 'prisma.inventoryItem')
c2 = c2.replace('prisma.materialStock', 'prisma.inventoryStock')

with open("src/app/api/logistics/inventory/import/route.ts", "w") as f:
    f.write(c2)

with open("src/app/api/logistics/dashboard/route.ts", "r") as f:
    c3 = f.read()

c3 = c3.replace('prisma.manufacturedProduct', 'prisma.inventoryItem')
c3 = c3.replace('prisma.materialItem', 'prisma.inventoryItem')
c3 = c3.replace('prisma.materialStock', 'prisma.inventoryStock')

with open("src/app/api/logistics/dashboard/route.ts", "w") as f:
    f.write(c3)

with open("src/app/api/logistics/warehouses/[id]/route.ts", "r") as f:
    c4 = f.read()
c4 = c4.replace('prisma.materialStock', 'prisma.inventoryStock')

with open("src/app/api/logistics/warehouses/[id]/route.ts", "w") as f:
    f.write(c4)
