const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Đang khởi tạo dữ liệu Inventory nâng cao ---');

  // 1. Tạo các Kho hàng (bao gồm cả kho hàng lỗi ảo)
  const warehouses = [
    { id: 'cmoip699s0000i4almoh1zuqs', code: 'KHO-CHINH', name: 'Kho hàng hoá', address: 'Phú Diễn, Bắc Từ Liêm, Hà Nội', type: 'PRODUCT', isVirtual: false },
    { id: 'cmoit7ttx0000i4514gkqzm1k', code: 'KVP', name: 'Kho vật tư và phụ kiện', address: 'Khu vực lưu trữ vật tư', type: 'MATERIAL', isVirtual: false },
    { id: 'cmoip699x0002i4al9g3nkwir', code: 'KHO-LOI', name: 'Kho hàng lỗi', address: 'Khu vực cách ly kỹ thuật', type: 'DEFECT', isVirtual: false },
    { id: 'cmq0s26fg0000goaespwzfn2w', code: 'KHO-THANHPHAM', name: 'Kho thành phẩm', address: 'Cụm 4, Xã Sơn Đồng, Thành phố Hà Nội, Việt Nam', type: 'PRODUCT', isVirtual: false },
  ];

  for (const w of warehouses) {
    await prisma.warehouse.upsert({
      where: { code: w.code },
      update: { name: w.name, address: w.address, isVirtual: w.isVirtual, type: w.type },
      create: w,
    });
  }
  console.log('✓ Đã cập nhật danh sách Kho hàng.');

  // 2. Tạo Danh mục hàng hoá đa cấp (InventoryCategory)
  // Lưu ý: Prisma model InventoryCategory hiện tại không có parentId trong schema line 667-677.
  // Tuy nhiên, bảng Category (line 260) có parentId. 
  // Để đồng bộ với website và hỗ trợ đa cấp, chúng ta sẽ nạp vào bảng Category với type = 'inventory_type'.

  const catTypeDef = await prisma.categoryTypeDef.upsert({
    where: { value: 'inventory_type' },
    update: {},
    create: {
      value: 'inventory_type',
      label: 'Loại hàng hoá',
      icon: 'bi-box-seam',
      color: '#f43f5e',
      prefix: 'HHG',
      isSystem: true,
    }
  });

  const categories = [
    // Cấp 1
    { code: 'TBVS', name: 'Thiết bị vệ sinh', parentCode: 'SP_VESINH' },
    { code: 'TBNB', name: 'Thiết bị nhà bếp', parentCode: 'SP_VESINH' },
    { code: 'VTNL', name: 'Vật tư & Nguyên liệu', parentCode: null },
    
    // Cấp 2 - Thiết bị vệ sinh
    { code: 'BC',   name: 'Bồn cầu', parentCode: 'TBVS' },
    { code: 'SC',   name: 'Sen cây', parentCode: 'TBVS' },
    { code: 'LB',   name: 'Tủ Lavabo', parentCode: 'TBVS' },
    
    // Cấp 2 - Thiết bị nhà bếp
    { code: 'CRB',  name: 'Chậu rửa bát', parentCode: 'TBNB' },
    { code: 'VRB',  name: 'Vòi rửa bát', parentCode: 'TBNB' },
    { code: 'BT',   name: 'Bếp từ', parentCode: 'TBNB' },

    // Cấp 2 - Vật tư & Nguyên liệu
    { code: 'BB',   name: 'Bao bì & Đóng gói', parentCode: 'VTNL' },
    { code: 'LK',   name: 'Linh kiện lắp ráp', parentCode: 'VTNL' },
  ];

  for (const c of categories) {
    let parentId = null;
    if (c.parentCode) {
      const parent = await prisma.category.findUnique({
        where: { type_code: { type: 'inventory_type', code: c.parentCode } }
      });
      parentId = parent?.id;
    }

    await prisma.category.upsert({
      where: { type_code: { type: 'inventory_type', code: c.code } },
      update: { name: c.name, parentId: parentId },
      create: {
        type: 'inventory_type',
        code: c.code,
        name: c.name,
        parentId: parentId,
        isActive: true,
      }
    });

    // Đồng bộ sang InventoryCategory để tương thích với logic cũ
    let invParentId = null;
    if (c.parentCode) {
      const invParent = await prisma.inventoryCategory.findFirst({
        where: { code: c.parentCode }
      });
      invParentId = invParent?.id;
    }

    await prisma.inventoryCategory.upsert({
      where: { name: c.name },
      update: { code: c.code, parentId: invParentId },
      create: { name: c.name, code: c.code, parentId: invParentId }
    });
  }
  console.log('✓ Đã cập nhật danh mục đa cấp.');

  console.log('--- Hoàn tất seeding dữ liệu Inventory ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
