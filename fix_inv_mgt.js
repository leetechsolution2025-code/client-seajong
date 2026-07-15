const fs = require('fs');
let code = fs.readFileSync('src/components/finance/InventoryManagement.tsx', 'utf-8');

// Define isCS and isSales right before columns
code = code.replace(
  'const columns: TableColumn<InventoryItem | any>[] = [',
  `const isCS = mode === "cs";
  const isSales = mode === "sales";
  
  const columns: TableColumn<InventoryItem | any>[] = [`
);

// Fix the align property type error
code = code.replace(
  /align: "right",\s*render: \(row: any\) =>/g,
  'align: "right" as const,\n      render: (row: any) =>'
);

// Wait, the previous patch also messed up by adding `...(!isCS ? [{` inside the array.
// But TableColumn<InventoryItem | any>[] might not like the spread operator?
// Let's rewrite the columns definition to be just a normal array, and we filter it at the end.
code = code.replace(
  /...(!isCS \? \[{/,
  '{'
);
code = code.replace(
  /}\] : \[]\),/,
  '},'
);

code = code.replace(
  'const columns: TableColumn<InventoryItem | any>[] = [',
  `const rawColumns: TableColumn<InventoryItem | any>[] = [`
);

code = code.replace(
  /<Table\n\s*columns=\{columns\}/,
  `const columns = isCS ? rawColumns.filter(c => c.header !== "Giá bán" && c.header !== "Giá vốn" && c.header !== "Đơn giá nhập") : rawColumns;
          <Table
            columns={columns}`
);

fs.writeFileSync('src/components/finance/InventoryManagement.tsx', code);
console.log('Fixed InventoryManagement.tsx');
