const fs = require("fs");
let content = fs.readFileSync("src/app/api/logistics/seajong-inventory/route.ts", "utf8");

const filterLogic = `
  const removeAccents = (str: string) => {
    return str ? str.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase() : '';
  };

  const [totalCount, products] = await Promise.all([
    prisma.seajongProduct.count({ where }),
    prisma.seajongProduct.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: { categories: { select: { id: true, name: true } } },
    }),
  ]);

  let filteredProducts = products;
  let total = totalCount;

  if (search) {
    const searchNormalized = removeAccents(search);
    filteredProducts = products.filter(p => {
      const nameNorm = removeAccents(p.name);
      const slugNorm = removeAccents(p.slug);
      return nameNorm.includes(searchNormalized) || slugNorm.includes(searchNormalized);
    });
    total = filteredProducts.length;
  }

  const paginated = filteredProducts.slice(skip, skip + perPage);

  const items = paginated.map(p => {
`;

// Remove search from where
content = content.replace(/  if \(search\) \{\n    where\.name = \{ contains: search \};\n  \}\n/g, "");

content = content.replace(/  const \[total, products\] = await Promise\.all\(\[\n    prisma\.seajongProduct\.count\(\{ where \}\),\n    prisma\.seajongProduct\.findMany\(\{\n      where,\n      skip,\n      take: perPage,\n      orderBy: \{ updatedAt: "desc" \},\n      include: \{ categories: \{ select: \{ id: true, name: true \} \} \},\n    \}\),\n  \]\);\n\n  const items = products\.map\(p => \{/, filterLogic);

fs.writeFileSync("src/app/api/logistics/seajong-inventory/route.ts", content);
console.log("Patched seajong-inventory");
