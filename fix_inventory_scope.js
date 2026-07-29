const fs = require('fs');
const file = 'src/app/api/logistics/inventory/route.ts';
let content = fs.readFileSync(file, 'utf-8');

// 1. Remove it from inside the if (id) block
content = content.replace(
  /\/\/ Kiểm tra xem categoryId thuộc về InventoryCategory hay Category\n\s*const isInventoryCategory = categoryId \? await prisma\.inventoryCategory\.findUnique\({\n\s*where: { id: categoryId }\n\s*}\) : null;\n\n/,
  ""
);

// 2. Add it to the top of the POST function, right after parsing the body
content = content.replace(
  /export async function POST\(req: Request\) \{\n\s*try \{\n\s*const body = await req\.json\(\);\n\s*const \{\n\s*id, tenHang, code, categoryId, brand, donVi, soLuongMin, giaNhap, giaBan, kieuDang, thongSoKyThuat, ghiChu, imageUrl, source,\n\s*chieuDai, chieuRong, chieuDay, warehouseId, maThayThe\n\s*\} = body;/,
  `export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      id, tenHang, code, categoryId, brand, donVi, soLuongMin, giaNhap, giaBan, kieuDang, thongSoKyThuat, ghiChu, imageUrl, source,
      chieuDai, chieuRong, chieuDay, warehouseId, maThayThe
    } = body;

    // Kiểm tra xem categoryId thuộc về InventoryCategory hay Category
    const isInventoryCategory = categoryId ? await prisma.inventoryCategory.findUnique({
      where: { id: categoryId }
    }) : null;`
);

fs.writeFileSync(file, content);
console.log("Fixed scope!");
