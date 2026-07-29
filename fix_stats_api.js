const fs = require('fs');

const file = 'src/app/api/logistics/inventory/stats/route.ts';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(/import { getCategoryIdsRecursive } from "@\/lib\/categories";\n/g, '');

content += `\n
async function getCategoryIdsRecursive(categoryId: string): Promise<string[]> {
  const prisma = require('@/lib/prisma').prisma;
  const result = [categoryId];
  const children = await prisma.inventoryCategory.findMany({ where: { parentId: categoryId }, select: { id: true } });
  for (const child of children) {
    const childIds = await getCategoryIdsRecursive(child.id);
    result.push(...childIds);
  }
  return result;
}
`;

fs.writeFileSync(file, content);
console.log("Fixed stats API!");
