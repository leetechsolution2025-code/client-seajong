const fs = require('fs');

const routeFile = 'src/app/api/logistics/inventory/route.ts';
let routeContent = fs.readFileSync(routeFile, 'utf-8');

const oldBlock = `    // DO NOT filter by physical stocks for normal warehouses to show the full catalog.
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
    }`;

const newBlock = `    // Hiển thị hàng hoá ĐÚNG THEO MÃ KHO ĐƯỢC CHỌN (Không phân biệt vật tư / thành phẩm)
    // Nghĩa là: Chỉ những hàng hoá có bản ghi InventoryStock thuộc về warehouseId này mới được hiển thị.
    if (warehouseId) {
      where.stocks = { some: { warehouseId } };
    }

    const mfpWhere: any = {};
    const includeManufactured = searchParams.get("includeManufactured") === "true";
    const excludeMaterials = searchParams.get("excludeMaterials") === "true";`;

if (!routeContent.includes(oldBlock)) {
  console.log("Could not find old block");
} else {
  routeContent = routeContent.replace(oldBlock, newBlock);
  fs.writeFileSync(routeFile, routeContent);
  console.log("Patched API successfully!");
}
