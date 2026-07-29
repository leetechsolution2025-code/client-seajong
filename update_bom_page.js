const fs = require('fs');
const file = 'src/app/(dashboard)/production/bom/page.tsx';
let content = fs.readFileSync(file, 'utf-8');

// 1. Add limit=1000 to fetchProducts
content = content.replace(
  /fetch\(\`\/api\/logistics\/inventory\?warehouseCode=KVP&search=\$\{encodeURIComponent\(search\)\}&categoryId=\$\{filterCategoryId\}\`\)/g,
  'fetch(`/api/logistics/inventory?warehouseCode=KVP&limit=1000&search=${encodeURIComponent(search)}&categoryId=${filterCategoryId}`)'
);

// 2. Add Badge to title
content = content.replace(
  /<SectionTitle title="Sản phẩm sản xuất" icon="bi-box" className="mb-0" \/>/g,
  '<SectionTitle title={<>Sản phẩm sản xuất <span className="badge bg-primary rounded-pill ms-2" style={{fontSize: "0.75rem", transform: "translateY(-2px)"}}>{products.length}</span></>} icon="bi-box" className="mb-0" />'
);

fs.writeFileSync(file, content);
console.log("Updated BOM page!");
