import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const categoryMapping = {
  "Thành phần chính": [
    "chậu lavabo", "chậu", "vòi lavabo", "vòi bếp", "vòi rửa", "thân sen", "củ sen", "thân củ", "thân vòi", "vòi xịt"
  ],
  "Bộ phận điều hướng và ngắt mở nước": [
    "lõi sen", "lõi", "óc nén", "ty sen", "van chuyển đổi", "cần vòi chuyển đổi", "chia nước", "ốc nén"
  ],
  "Tay cầm và tay gạt chuyển đổi": [
    "tay cầm", "tay gạt", "tay vặn", "tay núm"
  ],
  "Trục điều hướng bên trong": [
    "cần cứng", "cần mềm", "cần silicon", "cần sen", "ống suốt", "đón ty"
  ],
  "Chụp trang trí và phụ kiện bề mặt": [
    "chụp", "ốp", "chân sen", "bát sen", "dây cấp", "dây sen", "đầu phun", "đối trọng", "miệng phun", "chân vòi"
  ],
  "Chân chậu và linh kiện lắp đặt đáy": [
    "xiphông", "đuôi xả", "phễu thoát", "nút nhấn", "nút rút", "núm rút", "đầu xịt", "chân đế", "rốn ty"
  ],
  "Linh kiện khác": [
    "bi tạch", "gioăng", "ốc", "túi vải", "hộp", "lục giác", "vít", "đệm", "chốt", "khóa"
  ]
};

async function main() {
  const cats = await prisma.category.findMany({ where: { type: 'vat_tu_san_xuat' } });
  const catNameToId: Record<string, string> = {};
  cats.forEach(c => { catNameToId[c.name] = c.id; });
  
  // also map to InventoryCategory
  const invCats = await prisma.inventoryCategory.findMany();
  const invCatNameToId: Record<string, string> = {};
  invCats.forEach(c => { invCatNameToId[c.name] = c.id; });

  const materials = await (prisma as any).materialItem.findMany({
    where: { categoryId: null }
  });

  let updatedCount = 0;

  for (const mat of materials) {
    let matchedCategoryName = "Linh kiện khác"; // Default fallback if we can't find a match
    const lowerName = mat.name.toLowerCase();

    // Find the best match
    for (const [catName, keywords] of Object.entries(categoryMapping)) {
      if (keywords.some(kw => lowerName.includes(kw))) {
        matchedCategoryName = catName;
        break;
      }
    }

    const catId = catNameToId[matchedCategoryName];
    const invCatId = invCatNameToId[matchedCategoryName];

    if (catId) {
      await (prisma as any).materialItem.update({
        where: { id: mat.id },
        data: { categoryId: catId }
      });
      
      // Also update InventoryItem
      if (mat.code && invCatId) {
        await prisma.inventoryItem.updateMany({
          where: { code: mat.code, loai: 'vat-tu' },
          data: { categoryId: invCatId }
        });
      }
      
      updatedCount++;
    }
  }

  console.log(`Successfully categorized ${updatedCount} materials.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
