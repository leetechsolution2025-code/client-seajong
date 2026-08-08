import re

files_to_modify = [
    "src/app/(dashboard)/hr/page.tsx",
    "src/app/(dashboard)/hr/approvals/page.tsx"
]

for file_path in files_to_modify:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Import FullWidthTableLayout if not imported
    if 'import { FullWidthTableLayout }' not in content:
        content = content.replace(
            'import { Table, TableColumn } from "@/components/ui/Table";',
            'import { Table, TableColumn } from "@/components/ui/Table";\nimport { FullWidthTableLayout } from "@/components/layout/FullWidthTableLayout";'
        )

    # 2. Add "finance" to TYPE_MAP
    if '"finance":' not in content:
        content = content.replace(
            '"recruitment": { label: "Tuyển dụng", color: "#3b82f6" },',
            '"finance": { label: "Tài chính - Kế toán", color: "#eab308" },\n  "recruitment": { label: "Tuyển dụng", color: "#3b82f6" },'
        )
        
    # 3. Fix PENDING filter
    content = content.replace(
        'r.status === "PENDING"',
        'r.status.toUpperCase() === "PENDING"'
    )
    content = content.replace(
        'r.status !== "PENDING"',
        'r.status.toUpperCase() !== "PENDING"'
    )
    content = content.replace(
        'r.status === statusFilter',
        'r.status.toUpperCase() === statusFilter.toUpperCase()'
    )
    content = content.replace(
        'selectedRequest.status === "PENDING"',
        'selectedRequest.status.toUpperCase() === "PENDING"'
    )
    content = content.replace(
        'const m = map[r.status as keyof typeof map] || map.PENDING;',
        'const m = map[r.status.toUpperCase() as keyof typeof map] || map.PENDING;'
    )
    content = content.replace(
        'const m = map[selectedRequest.status as keyof typeof map] || map.PENDING;',
        'const m = map[selectedRequest.status.toUpperCase() as keyof typeof map] || map.PENDING;'
    )

    # 4. Use FullWidthTableLayout for Table
    old_table = """<Table
                rows={filteredData}
                columns={requestColumns}
                loading={loading}
                rowKey={(r) => r.id}
                onRowClick={setSelectedRequest}
                emptyText={`Không có dữ liệu trong mục ${STEP_ITEMS.find(s => s.num === currentStep)?.title}`}
                compact
                striped={false}
              />"""
    new_table = """<FullWidthTableLayout
                table={
                  <Table
                    rows={filteredData}
                    columns={requestColumns}
                    loading={loading}
                    rowKey={(r) => r.id}
                    onRowClick={setSelectedRequest}
                    emptyText={`Không có dữ liệu trong mục ${STEP_ITEMS.find(s => s.num === currentStep)?.title}`}
                    compact
                    striped={false}
                    wrapperClassName="mkt-plan-table-no-min"
                  />
                }
              />"""
    content = content.replace(old_table, new_table)
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

print("Modification done")
