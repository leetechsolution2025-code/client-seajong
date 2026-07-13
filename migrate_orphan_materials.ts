import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Get all orphan DinhMucVatTu
  const orphans = await prisma.dinhMucVatTu.findMany({
    where: { materialId: null },
    select: { id: true, tenVatTu: true, donViTinh: true }
  });

  console.log(`Found ${orphans.length} orphan BOM items.`);

  // Group by unique tenVatTu
  const uniqueNames = new Set<string>();
  for (const item of orphans) {
    if (item.tenVatTu) {
      uniqueNames.add(item.tenVatTu.trim());
    }
  }

  console.log(`Found ${uniqueNames.size} unique material names.`);

  let createdCount = 0;
  let updatedCount = 0;

  for (const name of uniqueNames) {
    // Check if material already exists
    let material = await prisma.materialItem.findFirst({
      where: { name: name }
    });

    if (!material) {
      // Estimate price
      const lowerName = name.toLowerCase();
      let price = 10000;
      if (lowerName.includes("thân sen")) price = 250000;
      else if (lowerName.includes("thân vòi")) price = 150000;
      else if (lowerName.includes("lõi")) price = 30000;
      else if (lowerName.includes("tay cầm")) price = 35000;
      else if (lowerName.includes("núm")) price = 15000;
      else if (lowerName.includes("chân vòi")) price = 40000;
      else if (lowerName.includes("ty sen")) price = 50000;
      else if (lowerName.includes("chụp")) price = 15000;
      else if (lowerName.includes("ốc")) price = 15000;
      else if (lowerName.includes("chân đế")) price = 12000;
      else if (lowerName.includes("dây cấp") || lowerName.includes("dây xịt")) price = 35000;
      else if (lowerName.includes("xịt")) price = 30000;
      else if (lowerName.includes("đầu")) price = 20000;
      else if (lowerName.includes("hộp")) price = 20000;
      else if (lowerName.includes("cài")) price = 15000;
      else price = Math.floor(Math.random() * (40000 - 10000 + 1) + 10000);

      price = Math.round(price / 1000) * 1000;
      
      const code = `VT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      material = await prisma.materialItem.create({
        data: {
          name: name,
          code: code,
          unit: "cái",
          price: price,
        }
      });
      createdCount++;
    }

    // Update all DinhMucVatTu with this name
    const updateRes = await prisma.dinhMucVatTu.updateMany({
      where: { 
        tenVatTu: name,
        materialId: null 
      },
      data: {
        materialId: material.id
      }
    });
    
    updatedCount += updateRes.count;
  }

  console.log(`Created ${createdCount} new materials.`);
  console.log(`Updated ${updatedCount} BOM items to link with materials.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
