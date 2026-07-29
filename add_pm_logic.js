const fs = require('fs');

const file = 'src/app/api/logistics/inventory/route.ts';
let content = fs.readFileSync(file, 'utf-8');

const regexPost = /if \(!tenHang\) return NextResponse\.json\(\{ error: "Thiếu tên hàng hoá" \}, \{ status: 400 \}\);/;
const replacementPost = `if (!tenHang) return NextResponse.json({ error: "Thiếu tên hàng hoá" }, { status: 400 });

    let autoErpCategoryId = categoryId || null;
    if (maThayThe) {
      const parts = maThayThe.split('-');
      if (parts.length >= 2) {
        const pmCode = parts.slice(0, 2).join('-');
        const matchedCat = await prisma.category.findFirst({ where: { code: pmCode } });
        if (matchedCat) {
          autoErpCategoryId = matchedCat.id;
        }
      }
    }`;

if (content.includes('if (!tenHang) return NextResponse.json({ error: "Thiếu tên hàng hoá" }, { status: 400 });') && !content.includes('autoErpCategoryId')) {
  content = content.replace(regexPost, replacementPost);
  
  // Update POST calls
  content = content.replace(/erpCategoryId: categoryId \|\| null,/g, "erpCategoryId: autoErpCategoryId,");
  content = content.replace(/maThayThe: maThayThe \|\| null,/g, "maThayThe: maThayThe || null,"); // Keep maThayThe

  // Update PUT
  const regexPut = /if \(!id\) return NextResponse\.json\(\{ error: "Thiếu ID hàng hoá" \}, \{ status: 400 \}\);/;
  const replacementPut = `if (!id) return NextResponse.json({ error: "Thiếu ID hàng hoá" }, { status: 400 });

    let autoErpCategoryId = categoryId || null;
    if (maThayThe) {
      const parts = maThayThe.split('-');
      if (parts.length >= 2) {
        const pmCode = parts.slice(0, 2).join('-');
        const matchedCat = await prisma.category.findFirst({ where: { code: pmCode } });
        if (matchedCat) {
          autoErpCategoryId = matchedCat.id;
        }
      }
    }`;
  
  content = content.replace(regexPut, replacementPut);
  fs.writeFileSync(file, content);
  console.log("Patched auto-resolve PM logic!");
} else {
  console.log("Failed to patch API, maybe already patched.");
}
