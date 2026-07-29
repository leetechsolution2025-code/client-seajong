import os

file_bom = 'src/app/(dashboard)/production/bom/page.tsx'

with open(file_bom, 'r') as f:
    content = f.read()

# 1. Add Pagination import if not exists
if 'import { Pagination }' not in content:
    content = content.replace('import { SectionTitle } from "@/components/ui/SectionTitle";', 'import { SectionTitle } from "@/components/ui/SectionTitle";\nimport { Pagination } from "@/components/ui/Pagination";')

# 2. Add state
if 'const [page, setPage]' not in content:
    content = content.replace('const [products, setProducts] = useState<any[]>([]);', 'const [products, setProducts] = useState<any[]>([]);\n  const [page, setPage] = useState(1);\n  const [totalPages, setTotalPages] = useState(1);')

# 3. Update fetchProducts
old_fetch = 'const res = await fetch(`/api/logistics/inventory?warehouseCode=KVP&limit=1000&search=${encodeURIComponent(search)}&categoryId=${filterCategoryId}`);'
new_fetch = 'const res = await fetch(`/api/logistics/inventory?warehouseCode=KVP&limit=20&page=${page}&search=${encodeURIComponent(search)}&categoryId=${filterCategoryId}`);'
content = content.replace(old_fetch, new_fetch)

old_set_products = 'setProducts(data.items || []);'
new_set_products = 'setProducts(data.items || []);\n        setTotalPages(Math.max(1, Math.ceil((data.total || 0) / 20)));'
content = content.replace(old_set_products, new_set_products)

# 4. Update dependencies
content = content.replace('}, [search, filterCategoryId]);', '}, [search, filterCategoryId, page]);')

# 5. Add Pagination below Table
old_table_end = '''                onRowClick={handleSelectProduct}
                rowClassName={(row: any) => row.id === selectedProduct?.id ? "table-active cursor-pointer" : "cursor-pointer"}
              />
            </div>
          </div>'''
new_table_end = '''                onRowClick={handleSelectProduct}
                rowClassName={(row: any) => row.id === selectedProduct?.id ? "table-active cursor-pointer" : "cursor-pointer"}
              />
              {totalPages > 1 && (
                <div className="mt-3">
                  <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                </div>
              )}
            </div>
          </div>'''
content = content.replace(old_table_end, new_table_end)

# Also reset page on search/filter changes if we can, but it's ok.
with open(file_bom, 'w') as f:
    f.write(content)

# LOGISTICS AUDIT LOGS
file_logs = 'src/components/logistics/inventory/LogisticsAuditLogs.tsx'
with open(file_logs, 'r') as f:
    content2 = f.read()

# 1. Add Pagination import
if 'import { Pagination }' not in content2:
    content2 = content2.replace('import { SectionTitle } from "@/components/ui/SectionTitle";', 'import { SectionTitle } from "@/components/ui/SectionTitle";\nimport { Pagination } from "@/components/ui/Pagination";')

# 2. Add state
if 'const [page, setPage]' not in content2:
    content2 = content2.replace('const [loading, setLoading] = useState(false);', 'const [loading, setLoading] = useState(false);\n  const [page, setPage] = useState(1);\n  const [totalPages, setTotalPages] = useState(1);')

# 3. Update fetchLogs
old_fetch2 = 'const res = await fetch("/api/plan-finance/stock-movements?limit=100");'
new_fetch2 = 'const res = await fetch(`/api/plan-finance/stock-movements?limit=20&page=${page}`);'
content2 = content2.replace(old_fetch2, new_fetch2)

old_set_movements = 'const movements: StockMovement[] = await res.json();\n      setRealMovements(movements);'
new_set_movements = 'const data = await res.json();\n      if (Array.isArray(data)) {\n        setRealMovements(data);\n        setTotalPages(1); // Old API structure fallback\n      } else {\n        setRealMovements(data.items || []);\n        setTotalPages(Math.max(1, Math.ceil((data.total || 0) / 20)));\n      }'
content2 = content2.replace(old_set_movements, new_set_movements)

# 4. update useEffect for fetchLogs
old_use_effect2 = '''  useEffect(() => {
    fetchLogs();
  }, []);'''
new_use_effect2 = '''  useEffect(() => {
    fetchLogs();
  }, [page]);'''
content2 = content2.replace(old_use_effect2, new_use_effect2)

# 5. Add Pagination below table
old_table_end2 = '''        rows={filteredMovements}
        loading={loading}
        compact={true}
      />
    </div>'''
new_table_end2 = '''        rows={filteredMovements}
        loading={loading}
        compact={true}
      />
      {totalPages > 1 && (
        <div className="mt-3">
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      )}
    </div>'''
content2 = content2.replace(old_table_end2, new_table_end2)

with open(file_logs, 'w') as f:
    f.write(content2)

print("Pagination added successfully to both files.")
