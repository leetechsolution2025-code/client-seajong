const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const products = await prisma.manufacturedProduct.findMany({ select: { name: true } });
  
  const keywords = {
    'Vòi nước': ['vòi lavabo', 'vòi rửa', 'vòi chậu', 'vòi lạnh'],
    'Sen tắm': ['sen tắm', 'sen cây', 'sen thuyền'],
    'Vòi xịt vệ sinh': ['vòi xịt'],
    'Chậu rửa bát, Chậu lavabo': ['chậu rửa bát', 'chậu lavabo', 'chậu inox', 'chậu rửa'],
    'Bàn đá, Tủ chậu, Gương': ['bàn đá', 'tủ chậu', 'gương', 'tủ lavabo'],
    'Linh kiện, Vật tư lắp ráp rời': ['linh kiện', 'vật tư', 'phụ tùng', 'lõi sen', 'chân sen', 'dây cấp'],
    'Phụ kiện phòng tắm': ['phụ kiện', 'kệ', 'móc', 'thanh vắt', 'lô giấy'],
  }
  
  let stats = {};
  for (const k in keywords) stats[k] = 0;
  stats['Thiết bị khác'] = 0;
  
  for (const p of products) {
    const name = p.name.toLowerCase();
    let assigned = false;
    for (const [cat, kwList] of Object.entries(keywords)) {
      if (kwList.some(kw => name.includes(kw.toLowerCase()))) {
        stats[cat]++;
        assigned = true;
        break; // only assign to first match
      }
    }
    if (!assigned) stats['Thiết bị khác']++;
  }
  
  console.log("Estimated distribution based on name matching:");
  console.log(stats);
}
main().catch(console.error).finally(() => prisma.$disconnect());
