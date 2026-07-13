const fs = require('fs');
const file = 'src/app/api/logistics/inventory/route.ts';
let code = fs.readFileSync(file, 'utf8');

// For MaterialItem, we also need to apply the stock filter if DEFECT
code = code.replace(
`      // MATERIAL (hoặc DEFECT / ALL) móc bảng MaterialItem
      !excludeMaterials && (warehouseType === "MATERIAL" || warehouseType === "DEFECT" || warehouseType === "ALL") ? (prisma as any).materialItem.findMany({
        where: {
          ...(categoryId ? { categoryId } : (industryCategoryIds.length > 0 ? { categoryId: { in: industryCategoryIds } } : {})),
        },`,
`      // MATERIAL (hoặc DEFECT / ALL) móc bảng MaterialItem
      !excludeMaterials && (warehouseType === "MATERIAL" || warehouseType === "DEFECT" || warehouseType === "ALL") ? (prisma as any).materialItem.findMany({
        where: {
          ...(categoryId ? { categoryId } : (industryCategoryIds.length > 0 ? { categoryId: { in: industryCategoryIds } } : {})),
          ...(warehouseType === "DEFECT" && warehouseId ? { stocks: { some: { warehouseId, soLuong: { gt: 0 } } } } : {})
        },`
);

code = code.replace(
`      !excludeMaterials && (warehouseType === "MATERIAL" || warehouseType === "DEFECT" || warehouseType === "ALL") ? (prisma as any).materialItem.count({
        where: {
          ...(categoryId ? { categoryId } : (industryCategoryIds.length > 0 ? { categoryId: { in: industryCategoryIds } } : {})),
        }
      }) : Promise.resolve(0),`,
`      !excludeMaterials && (warehouseType === "MATERIAL" || warehouseType === "DEFECT" || warehouseType === "ALL") ? (prisma as any).materialItem.count({
        where: {
          ...(categoryId ? { categoryId } : (industryCategoryIds.length > 0 ? { categoryId: { in: industryCategoryIds } } : {})),
          ...(warehouseType === "DEFECT" && warehouseId ? { stocks: { some: { warehouseId, soLuong: { gt: 0 } } } } : {})
        }
      }) : Promise.resolve(0),`
);

// For ManufacturedProduct, we should NOT return them for DEFECT warehouse!
code = code.replace(
`      // PRODUCT (hoặc explicit includeManufactured) móc bảng ManufacturedProduct
      warehouseType === "PRODUCT" || warehouseType === "ALL" || includeManufactured ? prisma.manufacturedProduct.findMany({`,
`      // PRODUCT (hoặc explicit includeManufactured) móc bảng ManufacturedProduct
      (warehouseType === "PRODUCT" || warehouseType === "ALL" || includeManufactured) && warehouseType !== "DEFECT" ? prisma.manufacturedProduct.findMany({`
);

code = code.replace(
`      warehouseType === "PRODUCT" || warehouseType === "ALL" || includeManufactured ? prisma.manufacturedProduct.count({`,
`      (warehouseType === "PRODUCT" || warehouseType === "ALL" || includeManufactured) && warehouseType !== "DEFECT" ? prisma.manufacturedProduct.count({`
);

fs.writeFileSync(file, code);
