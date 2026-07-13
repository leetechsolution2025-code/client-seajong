const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.manufacturedProduct.findMany({
    select: { id: true, name: true, code: true }
  });

  const categories = await prisma.category.findMany({
    where: { type: 'danh_muc_thanh_pham' }
  });

  const catMap = {};
  categories.forEach(c => catMap[c.code] = c.id);

  // Vòi nước (TP_1)
  // Sen tắm (TP_2)
  // Phụ kiện phòng tắm (TP_3)
  // Thiết bị khác (TP_4)
  // Vòi xịt vệ sinh (TP_5)
  // Bàn đá, Tủ chậu, Gương (TP_6)
  // Chậu rửa bát, Chậu lavabo (TP_7)
  // Linh kiện, Vật tư lắp ráp rời (TP_8)

  const keywords = {
    'TP_1': ['vòi lavabo', 'vòi rửa', 'vòi chậu', 'vòi lạnh', 'vòi 1 lỗ', 'vòi một lỗ', 'thân vòi', 'bộ vòi', 'củ vòi', 'vòi trúc', 'vòi đơn', 'vòi liền', 'vòi hồ'],
    'TP_2': ['sen tắm', 'sen cây', 'sen thuyền', 'củ sen', 'bát sen', 'dây sen', 'tay sen', 'bộ sen', 'sen nóng lạnh'],
    'TP_5': ['vòi xịt', 'xịt vệ sinh', 'dây xịt'],
    'TP_7': ['chậu rửa bát', 'chậu lavabo', 'chậu inox', 'chậu rửa', 'lababo'],
    'TP_6': ['bàn đá', 'tủ chậu', 'gương', 'tủ lavabo'],
    'TP_8': ['linh kiện', 'vật tư', 'phụ tùng', 'lõi sen', 'chân sen', 'dây cấp', 'ốc', 'zoăng', 'nút', 'đầu vòi'],
    'TP_3': ['phụ kiện', 'kệ', 'móc', 'thanh vắt', 'lô giấy', 'thoát sàn', 'xi phông'],
  };

  let updates = [];
  for (const p of products) {
    const name = p.name.toLowerCase();
    let targetCatCode = 'TP_4'; // Default to Thiết bị khác (Bệt, Bồn tiểu, etc.)

    for (const [code, kwList] of Object.entries(keywords)) {
      if (kwList.some(kw => name.includes(kw.toLowerCase()))) {
        targetCatCode = code;
        break;
      }
    }

    if (catMap[targetCatCode]) {
      updates.push(
        prisma.manufacturedProduct.update({
          where: { id: p.id },
          data: { productCategoryId: catMap[targetCatCode] }
        })
      );
    }
  }

  // Chạy cập nhật theo batch
  console.log(`Đang cập nhật ${updates.length} sản phẩm...`);
  // Bỏ qua lỗi unique / lock nếu có, chạy từng cục
  for (let i = 0; i < updates.length; i += 50) {
    await Promise.all(updates.slice(i, i + 50));
  }

  console.log("Cập nhật thành công!");
  
  // In thống kê
  const stats = await prisma.manufacturedProduct.groupBy({
    by: ['productCategoryId'],
    _count: true
  });
  for (const s of stats) {
    const cat = categories.find(c => c.id === s.productCategoryId);
    console.log(`${cat ? cat.name : 'Unknown'}: ${s._count}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
