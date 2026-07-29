import re

with open("src/app/api/logistics/inventory/route.ts", "r") as f:
    c = f.read()

# Fix line 222
c = c.replace('dinhMuc: true,', 'dinhMucs: true,')

# Fix line 255
c = c.replace('productCategory: true', 'category: true')

# Fix line 443, 689 (productCategoryId)
c = c.replace('productCategoryId', 'categoryId')

# Fix line 590, 844, 845, 847 (materialId in create/update/where)
c = c.replace('materialId:', 'inventoryItemId:')
c = c.replace('materialId,', 'inventoryItemId,')

with open("src/app/api/logistics/inventory/route.ts", "w") as f:
    f.write(c)
