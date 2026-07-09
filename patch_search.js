const fs = require("fs");
let content = fs.readFileSync("src/app/api/logistics/inventory/route.ts", "utf8");

// Remove search condition from where
content = content.replace(/    if \(search\) \{\n      where\.OR = \[\n        \{ tenHang: \{ contains: search \} \},\n        \{ code: \{ contains: search \} \},\n        \{ model: \{ contains: search \} \},\n      \];\n    \}\n/, "");

// Remove search from materialItem findMany
content = content.replace(/          \.\.\.\(search && \{\n            OR: \[\n              \{ name: \{ contains: search \} \},\n              \{ code: \{ contains: search \} \},\n              \{ spec: \{ contains: search \} \},\n            \]\n          \}\)/g, "");

// Remove search from materialItem count
content = content.replace(/          \.\.\.\(search && \{\n            OR: \[\n              \{ name: \{ contains: search \} \},\n              \{ code: \{ contains: search \} \},\n            \]\n          \}\)/g, "");

// Filter allItemsWithStock in memory
const filterLogic = `
    const removeAccents = (str: string) => {
      return str ? str.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase() : '';
    };

    let filteredItems = allItemsWithStock;
    if (search) {
      const searchNormalized = removeAccents(search);
      filteredItems = allItemsWithStock.filter(item => {
        const nameNorm = removeAccents(item.tenHang);
        const codeNorm = removeAccents(item.code);
        const modelNorm = removeAccents(item.model);
        return nameNorm.includes(searchNormalized) || codeNorm.includes(searchNormalized) || modelNorm.includes(searchNormalized);
      });
    }

    // Paginate manually
    const total = search ? filteredItems.length : invTotal + matTotal;
    const paginated = filteredItems.slice(skip, skip + limit);
`;

content = content.replace(/    \/\/ Paginate manually\n    const total = invTotal \+ matTotal;\n    const paginated = allItemsWithStock\.slice\(skip, skip \+ limit\);/, filterLogic);

fs.writeFileSync("src/app/api/logistics/inventory/route.ts", content);
console.log("Patched api/logistics/inventory/route.ts successfully");
