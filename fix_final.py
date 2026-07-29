import re

def rep(file, old, new):
    with open(file, "r") as f:
        c = f.read()
    c = c.replace(old, new)
    with open(file, "w") as f:
        f.write(c)

# dashboard
rep("src/app/api/logistics/dashboard/route.ts", "m.material", "m.inventoryItem")
rep("src/app/api/logistics/dashboard/route.ts", "mat.material", "mat.inventoryItem")

# inventory import
with open("src/app/api/logistics/inventory/import/route.ts", "r") as f:
    c = f.read()
c = c.replace("prisma.manufacturedProduct", "prisma.inventoryItem")
c = c.replace("prisma.materialItem", "prisma.inventoryItem")
c = c.replace("prisma.materialStock", "prisma.inventoryStock")
c = c.replace("(prisma as any).manufacturedProduct", "prisma.inventoryItem")
c = c.replace("(prisma as any).materialItem", "prisma.inventoryItem")
c = c.replace("(prisma as any).materialStock", "prisma.inventoryStock")
with open("src/app/api/logistics/inventory/import/route.ts", "w") as f:
    f.write(c)

# inventory route
rep("src/app/api/logistics/inventory/route.ts", "productCategory: true", "category: true")

# sales route
with open("src/app/api/plan-finance/sales/[id]/route.ts", "r") as f:
    c = f.read()
c = c.replace("select: { tenHang: true }", "select: { name: true }")
c = c.replace("name: guest.name", "tenHang: guest.tenHang")
with open("src/app/api/plan-finance/sales/[id]/route.ts", "w") as f:
    f.write(c)

# stock-card
with open("src/app/api/plan-finance/stock-card/route.ts", "r") as f:
    c = f.read()
c = c.replace("id: true,  code: true, donVi: true,", "id: true, tenHang: true, code: true, donVi: true,")
c = c.replace("inventoryStock: mat.inventoryStock", "stocks: mat.stocks")
with open("src/app/api/plan-finance/stock-card/route.ts", "w") as f:
    f.write(c)

# bom
rep("src/app/api/production/bom/[id]/route.ts", "i.inventoryItem", "i.items")

