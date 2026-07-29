with open('src/app/api/logistics/inventory/route.ts', 'r') as f:
    content = f.read()

# Add getErpCategoryIdsRecursive
erp_func = '''async function getErpCategoryIdsRecursive(categoryId: string): Promise<string[]> {
  const ids = [categoryId];
  const children = await prisma.category.findMany({
    where: { parentId: categoryId } as any,
    select: { id: true },
  });

  for (const child of children) {
    const childIds = await getErpCategoryIdsRecursive(child.id);
    ids.push(...childIds);
  }
  return ids;
}
'''
content = content.replace('async function getCategoryIdsRecursive', erp_func + '\nasync function getCategoryIdsRecursive')

# Fix where.categoryId logic
old_logic = '''    } else if (categoryId) {
      const allCategoryIds = await getCategoryIdsRecursive(categoryId);
      where.categoryId = { in: allCategoryIds };
    }'''

new_logic = '''    } else if (categoryId) {
      if (warehouseType === "MATERIAL" || warehouseType === "PRODUCT") {
        const allCategoryIds = await getErpCategoryIdsRecursive(categoryId);
        where.erpCategoryId = { in: allCategoryIds };
      } else {
        const allCategoryIds = await getCategoryIdsRecursive(categoryId);
        where.categoryId = { in: allCategoryIds };
      }
    }'''

content = content.replace(old_logic, new_logic)

with open('src/app/api/logistics/inventory/route.ts', 'w') as f:
    f.write(content)
