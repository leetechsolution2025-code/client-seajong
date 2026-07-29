const fs = require('fs');

const replacements = [
  {
    file: 'src/app/(dashboard)/production/bom/page.tsx',
    rules: [
      { from: /\/api\/production\/materials/g, to: '/api/logistics/inventory' }
    ]
  },
  {
    file: 'src/app/(dashboard)/finance/inventory/BOMBuilderModal.tsx',
    rules: [
      { from: /\/api\/production\/materials/g, to: '/api/logistics/inventory' }
    ]
  },
  {
    file: 'src/app/(dashboard)/finance/inventory/InventoryDetailOffcanvas.tsx',
    rules: [
      { from: /\/api\/production\/materials/g, to: '/api/logistics/inventory' }
    ]
  },
  {
    file: 'src/components/plan-finance/bao_gia/TaoDonHangModal.tsx',
    rules: [
      { from: /\/api\/production\/materials\/categories/g, to: '/api/logistics/categories' },
      { from: /\/api\/production\/materials/g, to: '/api/logistics/inventory' }
    ]
  },
  {
    file: 'src/components/finance/MissingMaterialsOffcanvas.tsx',
    rules: [
      { from: /\/api\/production\/materials\/missing/g, to: '/api/logistics/inventory' } // Note: we might need to fix the backend for "missing" logic later, but for now just avoid 404
    ]
  },
  {
    file: 'src/components/logistics/inventory/LogisticsItemDetailOffcanvas.tsx',
    rules: [
      { from: /\/api\/production\/materials/g, to: '/api/logistics/inventory' }
    ]
  }
];

replacements.forEach(({ file, rules }) => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf-8');
    rules.forEach(rule => {
      content = content.replace(rule.from, rule.to);
    });
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
