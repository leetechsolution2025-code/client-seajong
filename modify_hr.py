import re

files_to_modify = [
    "src/app/(dashboard)/hr/page.tsx",
    "src/app/(dashboard)/hr/approvals/page.tsx"
]

for file_path in files_to_modify:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # 1. Add import
    if "import { MyRequestsTab }" not in content:
        content = content.replace(
            'import { BrandButton } from "@/components/ui/BrandButton";\n',
            'import { BrandButton } from "@/components/ui/BrandButton";\nimport { MyRequestsTab } from "@/components/hr/MyRequestsTab";\n'
        )
    
    # 2. Modify WorkflowCard bottomToolbar
    content = content.replace(
        'bottomToolbar={ApprovalsBottomToolbar}',
        'bottomToolbar={activeTabId === "my-requests" ? null : ApprovalsBottomToolbar}'
    )
    
    # 3. Modify Table rendering
    old_table_code = """<Table
              rows={filteredData}
              columns={requestColumns}
              loading={loading}
              rowKey={(r) => r.id}
              onRowClick={setSelectedRequest}
              emptyText={`Không có dữ liệu trong mục ${STEP_ITEMS.find(s => s.num === currentStep)?.title}`}
              compact
              striped={false}
            />"""
    
    new_table_code = """{activeTabId === "my-requests" ? (
              <MyRequestsTab />
            ) : (
              <Table
                rows={filteredData}
                columns={requestColumns}
                loading={loading}
                rowKey={(r) => r.id}
                onRowClick={setSelectedRequest}
                emptyText={`Không có dữ liệu trong mục ${STEP_ITEMS.find(s => s.num === currentStep)?.title}`}
                compact
                striped={false}
              />
            )}"""
            
    content = content.replace(old_table_code, new_table_code)
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

print("Modification done")
