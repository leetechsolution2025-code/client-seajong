const fs = require('fs');
const file = "src/app/api/logistics/inventory/route.ts";
let content = fs.readFileSync(file, 'utf8');

const oldLogic = `        if (wh && (wh.type === "MATERIAL" || wh.code === "KVP")) {
          // Kho sản xuất chỉ dùng danh mục ERP nội bộ
          where.erpCategoryId = categoryId;
        }`;

const newLogic = `        if (wh && (wh.type === "MATERIAL" || wh.code === "KVP")) {
          // Kho sản xuất: Lọc theo mã nhóm PM (category code)
          const erpCat = await prisma.category.findUnique({ where: { id: categoryId } });
          if (erpCat && erpCat.code) {
            where.OR = [
              { erpCategoryId: categoryId },
              { code: { startsWith: erpCat.code } },
              { maThayThe: { startsWith: erpCat.code } }
            ];
          } else {
            where.erpCategoryId = categoryId;
          }
        }`;

if(content.includes(oldLogic)) {
    content = content.replace(oldLogic, newLogic);
    fs.writeFileSync(file, content);
    console.log("Patched successfully");
} else {
    console.log("Could not find the target code to replace.");
}
