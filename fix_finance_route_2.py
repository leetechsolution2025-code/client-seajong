import re
with open("src/app/api/board/finance-accounting/route.ts", "r") as f:
    c = f.read()

# 1. Fix the Promise.all array for inventory items
c = re.sub(
    r'const \[inventoryItems, materialStocks\] = await Promise\.all\(\[\s*prisma\.inventoryItem\.findMany\(\{\s*include: \{ category: true \}\s*\}\),\s*prisma\.materialStock\.findMany\(\{\s*include: \{ material: true \}\s*\}\)\s*\]\);',
    r'const inventoryItems = await prisma.inventoryItem.findMany({ include: { category: true } });',
    c
)

# 2. Fix the inventoryItems loop
# Replace "sanitaryValue += itemValue;" block in inventoryItems loop
c = c.replace('''if (
        catName.includes("vệ sinh") || catName.includes("ve sinh") || 
        catName.includes("sen") || catName.includes("vòi") || catName.includes("voi") || 
        catName.includes("chậu") || catName.includes("chau") || catName.includes("lavabo") || 
        catName.includes("bồn") || catName.includes("bon") || catName.includes("phòng tắm") || catName.includes("phong tam")
      ) {
        sanitaryValue += itemValue;
      } else if (
        catName.includes("bếp") || catName.includes("bep") || 
        catName.includes("nấu") || catName.includes("nau") || 
        catName.includes("hút mùi") || catName.includes("hut mui") || 
        catName.includes("lò") || catName.includes("lo")
      ) {
        kitchenValue += itemValue;
      } else {
        // Any other finished goods are grouped into sanitary by default or ignored. Let's group them into sanitaryValue.
        sanitaryValue += itemValue;
      }''', '''if (item.loai === "vat-tu") {
        materialValue += itemValue;
      } else if (
        catName.includes("vệ sinh") || catName.includes("ve sinh") || 
        catName.includes("sen") || catName.includes("vòi") || catName.includes("voi") || 
        catName.includes("chậu") || catName.includes("chau") || catName.includes("lavabo") || 
        catName.includes("bồn") || catName.includes("bon") || catName.includes("phòng tắm") || catName.includes("phong tam")
      ) {
        sanitaryValue += itemValue;
      } else if (
        catName.includes("bếp") || catName.includes("bep") || 
        catName.includes("nấu") || catName.includes("nau") || 
        catName.includes("hút mùi") || catName.includes("hut mui") || 
        catName.includes("lò") || catName.includes("lo")
      ) {
        kitchenValue += itemValue;
      } else {
        sanitaryValue += itemValue;
      }''')

# 3. Remove materialStocks loop
c = re.sub(
    r'materialStocks\.forEach\(stock => \{.*?\n    \}\);',
    r'',
    c, flags=re.DOTALL
)

with open("src/app/api/board/finance-accounting/route.ts", "w") as f:
    f.write(c)
