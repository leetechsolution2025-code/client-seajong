const fs = require('fs');

const routeFile = 'src/app/api/logistics/inventory/route.ts';
let routeContent = fs.readFileSync(routeFile, 'utf-8');

const oldBlock = `    // DO NOT filter by physical stocks for normal warehouses to show the full catalog.
    // BUT for DEFECT warehouses (Kho hàng lỗi), we ONLY show items that actually exist in this warehouse.
    if (warehouseId && warehouseType === "DEFECT") {
      where.stocks = { some: { warehouseId, soLuong: { gt: 0 } } };
    }

    const mfpWhere: any = {};
    // Không lọc ManufacturedProduct theo categoryId vì nó dùng bảng Category khác với InventoryCategory
    // Thay vào đó, nếu không có search (tải danh sách kho) thì không trả về ManufacturedProduct để tránh loãng dữ liệu.
    // Nếu có search (tìm kiếm gợi ý) thì trả về để lọc in-memory.
    const includeManufactured = searchParams.get("includeManufactured") === "true";
    const excludeMaterials = searchParams.get("excludeMaterials") === "true";

    // Mọi kho đều hiển thị danh mục Hàng hoá (InventoryItem) - không còn phân biệt vật tư / thành phẩm.
    const [invItems, invTotal] = await Promise.all([`;

const newBlock = `    // DO NOT filter by physical stocks for normal warehouses to show the full catalog.
    // BUT for DEFECT warehouses (Kho hàng lỗi), we ONLY show items that actually exist in this warehouse.
    if (warehouseId && warehouseType === "DEFECT") {
      where.stocks = { some: { warehouseId, soLuong: { gt: 0 } } };
    }

    // Phân loại hàng hoá theo kho
    if (warehouseType === "PRODUCT_SYNC" || warehouseType === "PRODUCT") {
      where.loai = { in: ["thanh-pham", "hang-hoa"] };
    } else if (warehouseType === "MATERIAL") {
      where.loai = "vat-tu";
    }

    const mfpWhere: any = {};
    const includeManufactured = searchParams.get("includeManufactured") === "true";
    const excludeMaterials = searchParams.get("excludeMaterials") === "true";

    if (excludeMaterials && !where.loai) {
      where.loai = { not: "vat-tu" };
    }

    const [invItems, invTotal] = await Promise.all([`;

if (!routeContent.includes(oldBlock)) {
  console.log("Could not find old block");
} else {
  routeContent = routeContent.replace(oldBlock, newBlock);
  fs.writeFileSync(routeFile, routeContent);
  console.log("Patched API!");
}
