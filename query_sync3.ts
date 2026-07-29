import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const cat = await prisma.inventoryCategory.findMany({ where: { OR: [{code: "SP_VESINH"}, {parentId: "cmoip69860000i4al1g7lyym8"}] } }); // wait, I don't know SP_VESINH id.
  const root = await prisma.inventoryCategory.findFirst({ where: { code: "SP_VESINH" }});
  if(root) {
      const children = await prisma.inventoryCategory.findMany({ where: { parentId: root.id } });
      console.log("Root:", root);
      console.log("Children:", children);
  } else {
      console.log("No SP_VESINH found");
  }
}
main().finally(() => prisma.$disconnect());
