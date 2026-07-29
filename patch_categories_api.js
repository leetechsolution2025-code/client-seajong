const fs = require('fs');
const file = 'src/app/api/logistics/categories/route.ts';
let content = fs.readFileSync(file, 'utf-8');

// Always use InventoryCategory for ALL warehouse types since we unified everything
const oldBlock = `    if (type === "MATERIAL") {
      const allCats = await prisma.category.findMany({
        where: { type: "vat_tu_san_xuat", isActive: true },
        orderBy: { sortOrder: "asc" }
      });
      result = buildCategoryTree(allCats);
    } else if (type === "PRODUCT") {
      const cats = await prisma.category.findMany({
        where: { type: "nhom_san_pham", isActive: true },
        orderBy: { sortOrder: "asc" }
      });
      result = buildCategoryTree(cats);
    } else if (type === "DEFECT") {
      const cats = await prisma.category.findMany({
        where: { type: "defects", isActive: true },
        orderBy: { sortOrder: "asc" }
      });
      result = buildCategoryTree(cats);
    } else {
      // Default / PRODUCT_SYNC: InventoryCategory
      const industryProductCodeMap: Record<string, string> = {
        "sanitary": "SP_VESINH",
        "building_materials": "SP_VLXD"
      };
      const prodRootCode = industryProductCodeMap[activeIndustryCode] || "SP_GO";

      const rootCategory = await prisma.inventoryCategory.findFirst({
        where: { code: prodRootCode, parentId: null, isActive: true }
      });
      
      const allCats = await prisma.inventoryCategory.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" }
      });

      // Lọc cây chuyên biệt nếu cần
      if (rootCategory) {
        // Chỉ lấy con của rootCategory nếu muốn phân tách rõ
        const flatDescendants = getDescendants(allCats, rootCategory.id);
        result = buildCategoryTree(allCats, rootCategory.id);
        
        // Hoặc trả về toàn bộ nếu không cần chia:
        // result = buildCategoryTree(allCats);
      } else {
        result = buildCategoryTree(allCats);
      }
    }`;

const newBlock = `    // UNIFIED: Mọi loại kho đều dùng chung bảng InventoryCategory
    const allCats = await prisma.inventoryCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" }
    });
    result = buildCategoryTree(allCats);`;

if (content.includes(oldBlock)) {
  content = content.replace(oldBlock, newBlock);
  fs.writeFileSync(file, content);
  console.log("Patched categories API successfully!");
} else {
  console.log("Could not find block in categories API");
}
