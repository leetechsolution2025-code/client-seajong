import fs from 'fs';

const path = 'src/app/api/production/bom/import-excel/route.ts';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf-8');

  // Find where it queries or creates MaterialItem and change to InventoryItem
  code = code.replace(/prisma\.materialItem/g, 'prisma.inventoryItem');
  code = code.replace(/name:\s*m\.tenVatTu/g, 'tenHang: m.tenVatTu');
  code = code.replace(/price:\s*0/g, 'giaNhap: 0');
  code = code.replace(/giaBan:\s*0/g, 'giaBan: 0,\n              loai: "vat-tu"');
  code = code.replace(/unit:\s*m\.donViTinh/g, 'donVi: m.donViTinh');
  code = code.replace(/m\.materialId/g, 'm.inventoryItemId');
  
  // DinhMuc fields
  code = code.replace(/materialItemId:\s*null/g, '');
  code = code.replace(/manufacturedProductId:\s*null/g, '');

  fs.writeFileSync(path, code);
  console.log('Patched bom/import-excel/route.ts');
}
