const fs = require('fs');

const file = 'src/app/api/logistics/inventory/route.ts';
let content = fs.readFileSync(file, 'utf-8');

// Replace materialItem unique checks
content = content.replace(/const duplicateMaterial = await \(prisma as any\)\.materialItem\.findUnique\(\{ where: \{ code \} \}\);/g,
  'const duplicateMaterial = await prisma.inventoryItem.findUnique({ where: { code } });');

content = content.replace(/const duplicateMaterial = await \(prisma as any\)\.materialItem\.findFirst\(\{ where: \{ code, id: \{ not: id \} \} \}\);/g,
  'const duplicateMaterial = await prisma.inventoryItem.findFirst({ where: { code, id: { not: id } } });');

// Replace materialItem select
content = content.replace(/const current = await \(prisma as any\)\.materialItem\.findUnique\(\{ where: \{ id \}, select: \{ code: true \} \}\);/g,
  'const current = await prisma.inventoryItem.findUnique({ where: { id }, select: { code: true } });');

// Replace materialItem create
const createOld = `const newItem = await (prisma as any).materialItem.create({
        data: {
          name: tenHang,
          code,
          categoryId: categoryId || null,
          brand: brand || "Seajong",
          unit: donVi || "cái",
          minStock: Number(soLuongMin) || 0,
          price: Number(giaNhap) || 0,
          giaBan: Number(giaBan) || 0,
          spec: kieuDang || "",
          material: material || null,
          thongSoKyThuat: thongSoKyThuat || "",
          ghiChu: ghiChu || "",
          imageUrl: imageUrl || null,
          chieuDai: chieuDai ? parseFloat(chieuDai) : null,
          chieuRong: chieuRong ? parseFloat(chieuRong) : null,
          chieuDay: chieuDay ? parseFloat(chieuDay) : null,
        } as any,
      });`;

const createNew = `const newItem = await prisma.inventoryItem.create({
        data: {
          tenHang,
          code,
          erpCategoryId: categoryId || null,
          brand: brand || "Seajong",
          donVi: donVi || "cái",
          soLuongMin: Number(soLuongMin) || 0,
          giaNhap: Number(giaNhap) || 0,
          giaBan: Number(giaBan) || 0,
          model: kieuDang || "",
          thongSoKyThuat: thongSoKyThuat || "",
          ghiChu: ghiChu || "",
          imageUrl: imageUrl || null,
          chieuDai: chieuDai ? parseFloat(chieuDai) : null,
          chieuRong: chieuRong ? parseFloat(chieuRong) : null,
          chieuDay: chieuDay ? parseFloat(chieuDay) : null,
          loai: "vat-tu",
          trangThai: "con-hang",
          soLuong: 0
        } as any,
      });`;
content = content.replace(createOld, createNew);

// Replace materialItem update
const updateOld = `const updated = await (prisma as any).materialItem.update({
        where: { id },
        data: {
          name: tenHang,
          code,
          categoryId: categoryId || null,
          brand,
          unit: donVi,
          minStock: Number(soLuongMin) || 0,
          price: Number(giaNhap) || 0,
          giaBan: Number(giaBan) || 0,
          spec: kieuDang || "",
          material,
          thongSoKyThuat,
          ghiChu,
          imageUrl,
          chieuDai: chieuDai ? parseFloat(chieuDai) : null,
          chieuRong: chieuRong ? parseFloat(chieuRong) : null,
          chieuDay: chieuDay ? parseFloat(chieuDay) : null,
        } as any,
      });`;

const updateNew = `const updated = await prisma.inventoryItem.update({
        where: { id },
        data: {
          tenHang,
          code,
          erpCategoryId: categoryId || null,
          brand,
          donVi,
          soLuongMin: Number(soLuongMin) || 0,
          giaNhap: Number(giaNhap) || 0,
          giaBan: Number(giaBan) || 0,
          model: kieuDang || "",
          thongSoKyThuat,
          ghiChu,
          imageUrl,
          chieuDai: chieuDai ? parseFloat(chieuDai) : null,
          chieuRong: chieuRong ? parseFloat(chieuRong) : null,
          chieuDay: chieuDay ? parseFloat(chieuDay) : null,
        } as any,
      });`;
content = content.replace(updateOld, updateNew);

fs.writeFileSync(file, content);
console.log("Fixed material API logic!");
