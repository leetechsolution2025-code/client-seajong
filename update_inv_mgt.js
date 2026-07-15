const fs = require('fs');
let code = fs.readFileSync('src/components/finance/InventoryManagement.tsx', 'utf-8');

code = code.replace(
  'mode?: "finance" | "production";',
  'mode?: "finance" | "production" | "sales" | "cs" | "board";'
);

// We need to conditionally hide the price column.
// If mode === "cs", we do NOT render the price column at all.
// If mode === "sales", we render "Giá bán" for products.
// If mode === "board" or "finance", we render "Giá vốn" or "Giá bán".
// Let's modify the columns array.

// Currently:
// const columns: ColumnDef<any>[] = [ ... ]
// We can just filter out the price column if mode === "cs".
// Wait, the columns are defined inline inside the render method.
code = code.replace(
  /const columns: ColumnDef<any>\[\] = \[/g,
  `const isCS = mode === "cs";
  const isSales = mode === "sales";
  
  let columns: ColumnDef<any>[] = [`
);

// Replace the price column block:
code = code.replace(
  /\{\s*header: isMaterial \? "Đơn giá nhập"[\s\S]*?\},/,
  `...(!isCS ? [{
      header: isMaterial ? "Đơn giá nhập" : (isProduct ? (isSales ? "Giá bán" : "Giá vốn") : (isSales ? "Giá bán" : "Đơn giá nhập")),
      width: 140,
      align: "right",
      render: (row: any) => {
        let price = 0;
        if (isMaterial) price = row.giaNhap;
        else if (isProduct) price = isSales ? row.giaBan : row.costPrice;
        else price = isSales ? row.giaBan : row.giaNhap;
        
        return (
          <span className="fw-medium text-success">
            {price ? price.toLocaleString() : "0"}
          </span>
        );
      }
    }] : []),`
);

// Now handle stats calculation for mode === "cs" (it shouldn't show "Tổng giá trị")
// We can just conditionally render the "Tổng giá trị" stat card.
code = code.replace(
  /<StatCard\s+icon="bi-cash-stack"\s+label={mode === "production" \? "Tổng giá trị \(giá bán\)" : "Tổng giá trị kho"}[\s\S]*?<\/StatCard>/,
  `{mode !== "cs" && (
          <StatCard 
            icon="bi-cash-stack" 
            label={isSales ? "Tổng giá trị (giá bán)" : "Tổng giá trị kho"} 
            value={formatVND(stats.tongGiaTri)} 
            color="emerald" 
          />
        )}`
);

fs.writeFileSync('src/components/finance/InventoryManagement.tsx', code);
console.log('Updated InventoryManagement.tsx');
