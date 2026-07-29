const fs = require('fs');
const file = 'src/app/(dashboard)/production/bom/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Reverse the mapping logic I added earlier
content = content.replace(
`        const mappedProducts = (data.items || []).map((item: any) => ({
          ...item,
          dinhMucs: item.dinhMuc ? [item.dinhMuc] : []
        }));
        setProducts(mappedProducts);`,
`        setProducts(data.items || []);`
);

fs.writeFileSync(file, content);
console.log("bom/page.tsx updated!");
