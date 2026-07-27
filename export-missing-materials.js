const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');

const prisma = new PrismaClient();

async function main() {
  const missingMaterials = await prisma.dinhMucVatTu.findMany({
    where: { materialId: null },
    include: {
      dinhMuc: true
    }
  });

  const map = new Map();
  for (const item of missingMaterials) {
    const key = item.maVatTu || 'unknown';
    if (!map.has(key)) {
      map.set(key, {
        maVatTu: item.maVatTu,
        tenVatTu: item.tenVatTu,
        donViTinh: item.donViTinh,
        soLuong: 0,
        boms: new Set()
      });
    }
    const data = map.get(key);
    data.soLuong += (item.soLuong || 0);
    if (item.dinhMuc && item.dinhMuc.code) {
      data.boms.add(item.dinhMuc.code);
    }
  }

  const exportData = Array.from(map.values()).map(item => ({
    "Mã vật tư": item.maVatTu || "-",
    "Tên vật tư": item.tenVatTu || "-",
    "Đơn vị tính": item.donViTinh || "-",
    "Tổng số lượng": item.soLuong,
    "Các định mức sử dụng": Array.from(item.boms).join(", ")
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 15 },
    { wch: 40 },
    { wch: 15 },
    { wch: 15 },
    { wch: 50 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, "VatTuThieu");
  XLSX.writeFile(wb, "danh_sach_vat_tu_thieu.xlsx");
  console.log("Exported to danh_sach_vat_tu_thieu.xlsx");
}

main().catch(console.error).finally(() => prisma.$disconnect());
