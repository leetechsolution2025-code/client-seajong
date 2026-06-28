import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== FIXING WAREHOUSE TYPES ===");

  // 1. Cập nhật loại kho hàng bị ngược trên server
  // Kho thành phẩm -> PRODUCT
  const kp = await prisma.warehouse.findFirst({
    where: { code: { contains: "THANHPHAM" } }
  });
  if (kp) {
    await prisma.warehouse.update({
      where: { id: kp.id },
      data: { type: "PRODUCT" }
    });
    console.log(`Updated warehouse ${kp.name} to PRODUCT`);
  }

  // Kho vật tư phụ kiện -> MATERIAL
  const kvt = await prisma.warehouse.findFirst({
    where: { code: { contains: "PHUKIEN" } }
  });
  if (kvt) {
    await prisma.warehouse.update({
      where: { id: kvt.id },
      data: { type: "MATERIAL" }
    });
    console.log(`Updated warehouse ${kvt.name} to MATERIAL`);
  }


  console.log("=== FIXING CATEGORY TREE IN DB ===");

  // 1. Đảm bảo các gốc ngành tồn tại trong InventoryCategory
  const rootVesinh = await prisma.inventoryCategory.upsert({
    where: { id: "cmq0rrootprod0000vesinh" },
    update: { name: "Ngành thiết bị vệ sinh, nhà bếp", code: "SP_VESINH", parentId: null },
    create: { id: "cmq0rrootprod0000vesinh", name: "Ngành thiết bị vệ sinh, nhà bếp", code: "SP_VESINH", parentId: null }
  });
  const rootGo = await prisma.inventoryCategory.upsert({
    where: { id: "cmq0rrootprod0001wooddoor" },
    update: { name: "Ngành sản xuất đồ gỗ xây dựng", code: "SP_GO", parentId: null },
    create: { id: "cmq0rrootprod0001wooddoor", name: "Ngành sản xuất đồ gỗ xây dựng", code: "SP_GO", parentId: null }
  });
  const rootVlxd = await prisma.inventoryCategory.upsert({
    where: { id: "cmq0rrootprod0002vlxd" },
    update: { name: "Ngành vật liệu xây dựng", code: "SP_VLXD", parentId: null },
    create: { id: "cmq0rrootprod0002vlxd", name: "Ngành vật liệu xây dựng", code: "SP_VLXD", parentId: null }
  });

  // 2. Định vị TBVS, TBNB, VTNL
  const tbvsCat = await prisma.inventoryCategory.findFirst({ where: { code: "TBVS" } });
  const tbnbCat = await prisma.inventoryCategory.findFirst({ where: { code: "TBNB" } });
  const vtnlCat = await prisma.inventoryCategory.findFirst({ where: { code: "VTNL" } });

  if (tbvsCat) {
    await prisma.inventoryCategory.update({
      where: { id: tbvsCat.id },
      data: { parentId: rootVesinh.id }
    });
    console.log("Set TBVS parent to SP_VESINH");
  }
  if (tbnbCat) {
    await prisma.inventoryCategory.update({
      where: { id: tbnbCat.id },
      data: { parentId: rootVesinh.id }
    });
    console.log("Set TBNB parent to SP_VESINH");
  }
  if (vtnlCat) {
    await prisma.inventoryCategory.update({
      where: { id: vtnlCat.id },
      data: { parentId: null } // VTNL là gốc ngoài cùng của vật tư
    });
    console.log("Set VTNL parent to null");
  }

  // 3. Quét tất cả các danh mục con trong InventoryCategory để gán chính xác theo ngành
  const allCats = await prisma.inventoryCategory.findMany();
  for (const cat of allCats) {
    // Bỏ qua các danh mục gốc
    if (["SP_VESINH", "SP_GO", "SP_VLXD", "TBVS", "TBNB", "VTNL"].includes(cat.code || "")) {
      continue;
    }

    const catNameLower = cat.name.toLowerCase();
    const catCode = cat.code || "";

    // A. Nếu thuộc ngành Gỗ
    if (["CUA_CHONG_CHAY", "CUA_KHONG_CHONG_CHAY", "LOAI_KHAC"].includes(catCode) || catNameLower.includes("cửa")) {
      await prisma.inventoryCategory.update({
        where: { id: cat.id },
        data: { parentId: rootGo.id }
      });
      console.log(`Set ${cat.name} parent to SP_GO (Gỗ)`);
      continue;
    }

    // B. Nếu thuộc ngành Vật liệu xây dựng
    if (["PROD_VLXD_THO", "PROD_VLXD_HT", "PROD_SAT_THEP", "PROD_NHOM_KHAC"].includes(catCode) || catNameLower.includes("cát") || catNameLower.includes("xi măng") || catNameLower.includes("thép")) {
      await prisma.inventoryCategory.update({
        where: { id: cat.id },
        data: { parentId: rootVlxd.id }
      });
      console.log(`Set ${cat.name} parent to SP_VLXD (VLXD)`);
      continue;
    }

    // C. Nếu thuộc nhóm Vật tư phụ / Bao bì / Linh kiện (nằm dưới VTNL)
    if (["BB", "LK"].includes(catCode) || catNameLower.includes("bao bì") || catNameLower.includes("linh kiện")) {
      await prisma.inventoryCategory.update({
        where: { id: cat.id },
        data: { parentId: vtnlCat?.id || null }
      });
      console.log(`Set ${cat.name} parent to VTNL (Vật tư)`);
      continue;
    }

    // D. Nếu thuộc Thiết bị nhà bếp (TBNB)
    if (
      catNameLower.includes("bếp") || 
      catNameLower.includes("chén") || 
      catNameLower.includes("bát") || 
      catNameLower.includes("hút mùi")
    ) {
      await prisma.inventoryCategory.update({
        where: { id: cat.id },
        data: { parentId: tbnbCat?.id || null }
      });
      console.log(`Set ${cat.name} parent to TBNB (Bếp)`);
      continue;
    }

    // E. Mặc định còn lại thuộc Thiết bị vệ sinh (TBVS)
    await prisma.inventoryCategory.update({
      where: { id: cat.id },
      data: { parentId: tbvsCat?.id || null }
    });
    console.log(`Set ${cat.name} parent to TBVS (Vệ sinh)`);
  }

  console.log("=== FINISHED FIXING CATEGORY TREE ===");
}

main().catch(console.error).finally(() => prisma.$disconnect());
