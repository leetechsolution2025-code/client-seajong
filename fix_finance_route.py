import re
with open("src/app/api/board/finance-accounting/route.ts", "r") as f:
    c = f.read()

# Replace the Promise.all
c = re.sub(
    r'const \[inventoryItems, materialStocks\] = await Promise\.all\(\[\s*prisma\.inventoryItem\.findMany\(\{\s*include: \{ category: true \}\s*\}\),\s*prisma\.materialStock\.findMany\(\{\s*include: \{ material: true \}\s*\}\)\s*\]\);',
    r'const inventoryItems = await prisma.inventoryItem.findMany({ include: { category: true } });',
    c
)

# Replace the if-else for materialValue
c = re.sub(
    r'if \(\s*catName\.includes\("vệ sinh"\).*?\)\s*\{\s*sanitaryValue \+= itemValue;\s*\} else if \(\s*catName\.includes\("bếp"\).*?\)\s*\{\s*kitchenValue \+= itemValue;\s*\} else \{\s*// Any other finished goods.*?\s*sanitaryValue \+= itemValue;\s*\}',
    r'if (item.loai === "vat-tu") {\n        materialValue += itemValue;\n      } else if (\n        catName.includes("vệ sinh") || catName.includes("ve sinh") || \n        catName.includes("sen") || catName.includes("vòi") || catName.includes("voi") || \n        catName.includes("chậu") || catName.includes("chau") || catName.includes("lavabo") || \n        catName.includes("bồn") || catName.includes("bon") || catName.includes("phòng tắm") || catName.includes("phong tam")\n      ) {\n        sanitaryValue += itemValue;\n      } else if (\n        catName.includes("bếp") || catName.includes("bep") || \n        catName.includes("nấu") || catName.includes("nau") || \n        catName.includes("hút mùi") || catName.includes("hut mui") || \n        catName.includes("lò") || catName.includes("lo")\n      ) {\n        kitchenValue += itemValue;\n      } else {\n        sanitaryValue += itemValue;\n      }',
    c, flags=re.DOTALL
)

# Remove the materialStocks loop completely
c = re.sub(
    r'materialStocks\.forEach\(.*?\}\);',
    r'',
    c, flags=re.DOTALL
)

with open("src/app/api/board/finance-accounting/route.ts", "w") as f:
    f.write(c)
