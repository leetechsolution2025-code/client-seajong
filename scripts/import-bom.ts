import * as xlsx from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Loading Excel file...");
    const workbook = xlsx.readFile('doc/data/dinhmuc_da_xoa_trung.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    console.log(`Parsed ${data.length} rows.`);

    // Fetch products and materials
    const products = await prisma.manufacturedProduct.findMany({ select: { id: true, code: true } });
    const productMap = new Map(products.filter(p => p.code).map(p => [p.code, p.id]));
    
    const materials = await prisma.materialItem.findMany({ select: { id: true, code: true } });
    const materialMap = new Map(materials.filter(m => m.code).map(m => [m.code, m.id]));

    let currentDinhMuc: any = null;
    let bomsCreated = 0;
    let materialsCreated = 0;
    let missingProducts = new Set();
    let missingMaterials = new Set();

    for (let i = 1; i < data.length; i++) {
      const row: any = data[i];
      
      const pCode = row['DANH SÁCH VẬT TƯ, HÀNG HÓA, DỊCH VỤ'];
      const pName = row['__EMPTY'];
      
      // If there's a new product code, create a new DinhMuc
      if (pCode) {
        const productId = productMap.get(pCode);
        if (productId) {
          const bomCode = `DM-${pCode}-01`;
          currentDinhMuc = await prisma.dinhMuc.upsert({
            where: { code: bomCode },
            update: {
              tenDinhMuc: `Định mức ${pName || pCode}`,
              manufacturedProductId: productId,
            },
            create: {
              code: bomCode,
              tenDinhMuc: `Định mức ${pName || pCode}`,
              manufacturedProductId: productId,
            }
          });
          bomsCreated++;
        } else {
          missingProducts.add(pCode);
          currentDinhMuc = null; // Skip materials for this product
        }
      }

      // If we have a valid current DinhMuc, add the material
      if (currentDinhMuc) {
        const mCode = row['__EMPTY_3'];
        const mName = row['__EMPTY_4'];
        const mUnit = row['__EMPTY_5'];
        const mQty = parseFloat(row['__EMPTY_6']) || 0;

        if (mCode && mName) {
          const materialId = materialMap.get(mCode);
          if (!materialId) {
            missingMaterials.add(mCode);
          }

          await prisma.dinhMucVatTu.create({
            data: {
              dinhMucId: currentDinhMuc.id,
              materialId: materialId || null,
              tenVatTu: mName,
              donViTinh: mUnit || null,
              soLuong: mQty
            }
          });
          materialsCreated++;
        }
      }
    }

    console.log(`\nImport complete!`);
    console.log(`- Created ${bomsCreated} DinhMuc records.`);
    console.log(`- Created ${materialsCreated} DinhMucVatTu records.`);
    
    if (missingProducts.size > 0) {
      console.log(`- WARNING: ${missingProducts.size} product codes not found in DB:`, Array.from(missingProducts).slice(0, 10));
    }
    if (missingMaterials.size > 0) {
      console.log(`- WARNING: ${missingMaterials.size} material codes not found in DB (but were still added to BOMs by name):`, Array.from(missingMaterials).slice(0, 10));
    }
    
  } catch (e) {
    console.error("Import failed:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
