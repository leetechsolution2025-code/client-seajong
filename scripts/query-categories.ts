import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const cats = await prisma.category.findMany({
    where: { type: "asset_type", isActive: true },
    select: {
      id: true,
      name: true,
      parentId: true,
      parent: {
        select: {
          name: true
        }
      }
    },
    orderBy: { sortOrder: "asc" }
  });
  console.log("Categories relations:");
  cats.forEach(c => {
    console.log(`- Name: "${c.name}", ParentId: "${c.parentId}", ParentName: "${c.parent?.name || 'None'}"`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
