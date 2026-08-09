const fs = require('fs');
const file = 'src/app/api/production/bom/[id]/route.ts';
let content = fs.readFileSync(file, 'utf8');

const queryToReplace = `    const first = rows[0];
    const result = {`;

const newQuery = `    // Fetch stocks for all inventory items
    const inventoryItemIds = rows.map(r => r.dv_inventoryItemId).filter(Boolean);
    const stocks = await prisma.stock.findMany({
      where: { inventoryItemId: { in: inventoryItemIds } },
      include: { warehouse: true }
    });
    
    // Group stocks by inventoryItemId
    const stocksMap = {};
    for (const st of stocks) {
      if (!stocksMap[st.inventoryItemId]) stocksMap[st.inventoryItemId] = [];
      stocksMap[st.inventoryItemId].push(st);
    }

    const first = rows[0];
    const result = {`;

content = content.replace(queryToReplace, newQuery);

const mappingToReplace = `            category: (r.mi_categoryId || r.mi_erpCategoryId) ? { 
              id: r.mi_erpCategoryId || r.mi_categoryId, 
              tenHang: r.mi_erpCategoryName || r.mi_categoryName, 
              code: r.mi_erpCategoryCode || r.mi_categoryCode 
            } : null
          } : null
        }))`;

const newMapping = `            category: (r.mi_categoryId || r.mi_erpCategoryId) ? { 
              id: r.mi_erpCategoryId || r.mi_categoryId, 
              tenHang: r.mi_erpCategoryName || r.mi_categoryName, 
              code: r.mi_erpCategoryCode || r.mi_categoryCode 
            } : null,
            stocks: stocksMap[r.mi_id] || []
          } : null
        }))`;

content = content.replace(mappingToReplace, newMapping);
fs.writeFileSync(file, content);
console.log('Patched API route');
