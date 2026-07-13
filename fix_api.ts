import fs from 'fs';
let code = fs.readFileSync('src/app/api/logistics/inventory/route.ts', 'utf-8');

code = code.replace(
  `select: { type: true }`,
  `select: { type: true, code: true }`
);

code = code.replace(
  `let warehouseType = "ALL";`,
  `let warehouseType = "ALL";\n    let warehouseCode = "";`
);

code = code.replace(
  `if (wh) warehouseType = (wh as any).type;`,
  `if (wh) {\n        warehouseType = (wh as any).type;\n        warehouseCode = (wh as any).code || "";\n      }`
);

code = code.replace(
  `warehouseType !== "MATERIAL" ? prisma.inventoryItem.findMany({`,
  `warehouseType !== "MATERIAL" && warehouseCode !== "KHO-THANHPHAM" ? prisma.inventoryItem.findMany({`
);

code = code.replace(
  `warehouseType !== "MATERIAL" ? prisma.inventoryItem.count({ where }) : Promise.resolve(0),`,
  `warehouseType !== "MATERIAL" && warehouseCode !== "KHO-THANHPHAM" ? prisma.inventoryItem.count({ where }) : Promise.resolve(0),`
);

code = code.replace(
  `warehouseType !== "MATERIAL" && includeManufactured && search ? prisma.manufacturedProduct.findMany({`,
  `warehouseType !== "MATERIAL" && (includeManufactured || warehouseCode === "KHO-THANHPHAM") ? prisma.manufacturedProduct.findMany({`
);

code = code.replace(
  `warehouseType !== "MATERIAL" && includeManufactured && search ? prisma.manufacturedProduct.count({ where: mfpWhere }) : Promise.resolve(0),`,
  `warehouseType !== "MATERIAL" && (includeManufactured || warehouseCode === "KHO-THANHPHAM") ? prisma.manufacturedProduct.count({ where: mfpWhere }) : Promise.resolve(0),`
);

fs.writeFileSync('src/app/api/logistics/inventory/route.ts', code);
console.log("Fixed route.ts");
