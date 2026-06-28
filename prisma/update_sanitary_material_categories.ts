import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== UPDATING SANITARY MATERIAL CATEGORIES ===");

  const rootId = "cmq0rroot0000vesinh123456";

  // 1. Tạo/cập nhật danh mục gốc
  const root = await prisma.category.upsert({
    where: { id: rootId },
    update: { name: "Ngành thiết bị vệ sinh, nhà bếp", code: "VTSX_VESINH", type: "vat_tu_san_xuat", parentId: null },
    create: { id: rootId, name: "Ngành thiết bị vệ sinh, nhà bếp", code: "VTSX_VESINH", type: "vat_tu_san_xuat", parentId: null }
  });
  console.log(`Root Category: ${root.name} (${root.id})`);

  // 2. Định nghĩa 7 danh mục mới
  const newCategories = [
    { name: "Thành phần chính", code: "VT_TP_CHINH" },
    { name: "Bộ phận điều hướng/ngắt mở nước", code: "VT_BP_DIEU_HUONG" },
    { name: "Tay cầm và tay gạt chuyển đổi", code: "VT_TAY_CAM" },
    { name: "Trục điều hướng bên trong", code: "VT_TRUC_DIEU_HUONG" },
    { name: "Chụp trang trí và phụ kiện bề mặt", code: "VT_CHUP_TRANG_TRI" },
    { name: "Chân chậu và linh kiện lắp đặt đáy", code: "VT_CHAN_CHAU" },
    { name: "Linh kiện khác", code: "VT_LINH_KIEN_KHAC" }
  ];

  const createdCategories: any[] = [];

  // Tạo 7 danh mục mới này dưới root VTSX_VESINH
  for (const [idx, item] of newCategories.entries()) {
    const cat = await prisma.category.upsert({
      where: { 
        type_code: {
          type: "vat_tu_san_xuat",
          code: item.code
        }
      },
      update: { name: item.name, parentId: rootId, sortOrder: idx },
      create: { name: item.name, code: item.code, type: "vat_tu_san_xuat", parentId: rootId, sortOrder: idx }
    });
    createdCategories.push(cat);
    console.log(`- Created/Updated: ${cat.name} (${cat.code})`);
  }

  // Linh kiện khác làm fallback
  const fallbackCat = createdCategories.find(c => c.code === "VT_LINH_KIEN_KHAC");
  if (!fallbackCat) throw new Error("Fallback category not found");

  // 3. Tìm toàn bộ danh mục cũ của ngành thiết bị vệ sinh (thuộc root thiết bị vệ sinh nhưng không nằm trong 7 danh mục mới)
  const allCats = await prisma.category.findMany({
    where: { type: "vat_tu_san_xuat" }
  });

  const newCodes = newCategories.map(c => c.code);

  // Tìm tất cả danh mục con thuộc nhánh VTSX_VESINH (trừ root và 7 danh mục mới)
  const getSubcategoryIds = (parentId: string): string[] => {
    const ids: string[] = [];
    const children = allCats.filter(c => c.parentId === parentId && !newCodes.includes(c.code || ""));
    for (const child of children) {
      ids.push(child.id);
      ids.push(...getSubcategoryIds(child.id));
    }
    return ids;
  };

  const oldCatIds = getSubcategoryIds(rootId);
  console.log(`Found ${oldCatIds.length} old categories to migrate/delete.`);

  // 4. Di chuyển MaterialItem từ danh mục cũ sang danh mục mới "Linh kiện khác"
  if (oldCatIds.length > 0) {
    const affectedMaterials = await (prisma as any).materialItem.updateMany({
      where: { categoryId: { in: oldCatIds } },
      data: { categoryId: fallbackCat.id }
    });
    console.log(`Re-associated ${affectedMaterials.count} MaterialItems to Fallback Category.`);

    // 5. Xóa các danh mục cũ
    // Xóa từ lá lên gốc để tránh lỗi khóa ngoại parentId
    const oldCatsToDelete = allCats.filter(c => oldCatIds.includes(c.id));
    
    // Sort by level (deepest first)
    const getDepth = (id: string | null): number => {
      if (!id) return 0;
      const parent = allCats.find(c => c.id === id);
      return 1 + getDepth(parent ? parent.parentId : null);
    };

    oldCatsToDelete.sort((a, b) => getDepth(b.id) - getDepth(a.id));

    for (const cat of oldCatsToDelete) {
      await prisma.category.delete({
        where: { id: cat.id }
      });
      console.log(`Deleted old category: ${cat.name} (${cat.code})`);
    }
  }

  console.log("=== COMPLETED SANITARY MATERIAL CATEGORIES UPDATE ===");
}

main().catch(console.error).finally(() => prisma.$disconnect());
