import fs from 'fs';

const path = 'src/app/api/plan-finance/inventory/import-excel/route.ts';
let code = fs.readFileSync(path, 'utf-8');

code = code.replace(/prisma\.materialItem\.findFirst/g, 'prisma.inventoryItem.findFirst');
code = code.replace(/prisma\.materialItem\.create/g, 'prisma.inventoryItem.create');
code = code.replace(/prisma\.materialItem\.update/g, 'prisma.inventoryItem.update');

code = code.replace(/name:\s*v\.tenVatTu/g, 'tenHang: v.tenVatTu');
code = code.replace(/unit:\s*v\.donViTinh/g, 'donVi: v.donViTinh');
code = code.replace(/price:\s*defaultPrice/g, 'giaNhap: defaultPrice,\n                  loai: "vat-tu"');
code = code.replace(/v\.materialId\s*=\s*mat\.id;/g, 'v.inventoryItemId = mat.id;');

// Also fix parseVatTu output format
code = code.replace(/return\s*\{\s*maVatTu:\s*p\[0\],\s*tenVatTu:\s*p\[1\],\s*soLuong:\s*Number\(p\[2\]\),\s*donViTinh:\s*p\[3\]\s*\}/g, 'return { maVatTu: p[0], tenVatTu: p[1], soLuong: Number(p[2]), donViTinh: p[3] }');

fs.writeFileSync(path, code);
