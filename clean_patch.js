const fs = require('fs');
let code = fs.readFileSync('src/components/finance/InventoryManagement.tsx', 'utf-8');

// 1. Update Props
code = code.replace(
  'mode?: "finance" | "production";',
  'mode?: "finance" | "production" | "sales" | "cs" | "board";'
);

// 2. Add isCS and isSales right after the states
code = code.replace(
  'const [trangThai, setTrangThai] = useState("");',
  `const [trangThai, setTrangThai] = useState("");

  const isCS = mode === "cs";
  const isSales = mode === "sales";`
);

// 3. Update the price header and render
code = code.replace(
  'header: isMaterial ? "Đơn giá nhập" : (isProduct ? "Giá thành" : (mode === "production" ? "Giá bán (đồng)" : "Đơn giá nhập")),',
  'header: isMaterial ? "Đơn giá nhập" : (isProduct ? (isSales ? "Giá bán (đồng)" : "Giá thành") : (isSales ? "Giá bán (đồng)" : "Đơn giá nhập")),'
);

code = code.replace(
  'const price = isMaterial ? row.giaNhap : (isProduct ? row.costPrice : (mode === "production" ? row.giaBan : row.giaNhap));',
  'const price = isMaterial ? row.giaNhap : (isProduct ? (isSales ? row.giaBan : row.costPrice) : (isSales ? row.giaBan : row.giaNhap));'
);

code = code.replace(
  'align: "right",',
  'align: "right" as const,'
);

// 4. Update the columns definition to filter out price for CS
code = code.replace(
  'const columns: TableColumn<InventoryItem | any>[] = [',
  'const rawColumns: TableColumn<InventoryItem | any>[] = ['
);

code = code.replace(
  '<Table\n            columns={columns}',
  `const columns = isCS ? rawColumns.filter(c => !["Đơn giá nhập", "Giá thành", "Giá bán (đồng)"].includes(c.header as string)) : rawColumns;
          <Table
            columns={columns}`
);

// 5. Update StatCard logic
code = code.replace(
  '<StatCard \n          icon="bi-cash-stack" \n          label={mode === "production" ? "Tổng giá trị (giá bán)" : "Tổng giá trị kho"}',
  `{mode !== "cs" && (
        <StatCard 
          icon="bi-cash-stack" 
          label={isSales ? "Tổng giá trị (giá bán)" : (mode === "production" ? "Tổng giá trị (giá bán)" : "Tổng giá trị kho")}`
);

code = code.replace(
  'value={formatVND(stats.tongGiaTri)} \n          color="emerald" \n        />',
  `value={formatVND(stats.tongGiaTri)} 
          color="emerald" 
        />
      )}`
);

fs.writeFileSync('src/components/finance/InventoryManagement.tsx', code);
console.log('Done clean patch');
