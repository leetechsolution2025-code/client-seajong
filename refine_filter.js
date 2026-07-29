const fs = require('fs');

const file = 'src/app/api/logistics/inventory/route.ts';
let content = fs.readFileSync(file, 'utf-8');

const regex = /if \(categoryId\) \{\s+const allCategoryIds = await getCategoryIdsRecursive\(categoryId\);\s+where\.OR = \[\s+\{ categoryId: \{ in: allCategoryIds \} \},\s+\{ erpCategoryId: categoryId \}\s+\];\s+\}/;

const replacement = `if (categoryId) {
      if (warehouseId) {
        const wh = await prisma.warehouse.findUnique({ where: { id: warehouseId }, select: { type: true, code: true } });
        if (wh && (wh.type === "MATERIAL" || wh.code === "KVP")) {
          // Kho sản xuất chỉ dùng danh mục ERP nội bộ
          where.erpCategoryId = categoryId;
        } else {
          // Kho thương mại chỉ dùng danh mục đồng bộ Web
          const allCategoryIds = await getCategoryIdsRecursive(categoryId);
          where.categoryId = { in: allCategoryIds };
        }
      } else {
        // Nếu không chọn kho cụ thể thì mới quét cả 2
        const allCategoryIds = await getCategoryIdsRecursive(categoryId);
        where.OR = [
          { categoryId: { in: allCategoryIds } },
          { erpCategoryId: categoryId }
        ];
      }
    }`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(file, content);
  console.log("Refined category filter logic successfully!");
} else {
  console.log("Regex did not match.");
}
