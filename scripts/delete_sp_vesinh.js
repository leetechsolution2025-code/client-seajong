const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const cats = await prisma.category.findMany({
    where: { type: 'danh_muc_thanh_pham' }
  });
  const spVesinh = cats.find(c => c.code === 'SP_VESINH');
  
  if (!spVesinh) {
    console.log("No SP_VESINH found in danh_muc_thanh_pham");
    return;
  }

  function getTreeIds(parentId) {
    const children = cats.filter(c => c.parentId === parentId);
    let ids = [parentId];
    for (const c of children) ids.push(...getTreeIds(c.id));
    return ids;
  }
  
  const vesinhIds = getTreeIds(spVesinh.id);
  console.log(`Found ${vesinhIds.length} categories to delete.`);
  
  // Need to delete bottom-up to avoid foreign key constraint violations
  async function deleteNodeAndChildren(nodeId) {
    const children = cats.filter(c => c.parentId === nodeId);
    for (const c of children) {
      await deleteNodeAndChildren(c.id);
    }
    await prisma.category.delete({ where: { id: nodeId } });
    console.log(`Deleted category ${nodeId}`);
  }
  
  await deleteNodeAndChildren(spVesinh.id);
  console.log("Deleted SP_VESINH tree from danh_muc_thanh_pham");
}
main().catch(console.error).finally(() => prisma.$disconnect());
