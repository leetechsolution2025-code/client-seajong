import re

file_path = "src/components/my/InterviewsPage.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add import
if "FullWidthTableLayout" not in content:
    content = content.replace('import { Table } from "@/components/ui/Table";', 'import { Table } from "@/components/ui/Table";\nimport { FullWidthTableLayout } from "@/components/layout/FullWidthTableLayout";')

# 2. Update Table
target_table = '''          {/* Desktop Table View */}
          <div className="d-none d-md-block">
            <Table
              rows={filteredCandidates}
              columns={columns}
              loading={loading}
              rowKey={(c) => c.id}
              fontSize={13}
              striped
              compact
            />
          </div>'''
replacement_table = '''          {/* Desktop Table View */}
          <div className="d-none d-md-block">
            <FullWidthTableLayout tableWrapperClassName="" table={
              <Table
                rows={filteredCandidates}
                columns={columns}
                loading={loading}
                rowKey={(c) => c.id}
                fontSize={13}
                striped
                compact
              />
            } />
          </div>'''
if target_table in content:
    content = content.replace(target_table, replacement_table)

# 3. Update bottomToolbar
target_toolbar = '''  const bottomToolbar = (
    <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between w-100 gap-2" style={{ minHeight: 32 }}>
      <div className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 w-100 w-md-auto">
        <div className="w-100" style={{ maxWidth: "100%" }}>
          <SearchInput
            placeholder="Tìm kiếm ứng viên hoặc vị trí..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="border-0 shadow-sm hover-bg-light transition-all h-100"
          />
        </div>
        <div className="overflow-auto py-1" style={{ maxWidth: "100%" }}>
          <FilterBadgeGroup'''
replacement_toolbar = '''  const bottomToolbar = (
    <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between w-100 gap-2" style={{ minHeight: 32 }}>
      <div className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 w-100 w-md-auto flex-grow-1">
        <div className="w-100 flex-grow-1" style={{ maxWidth: "100%" }}>
          <SearchInput
            placeholder="Tìm kiếm ứng viên hoặc vị trí..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="border-0 shadow-sm hover-bg-light transition-all h-100 w-100"
          />
        </div>
        <div className="overflow-auto py-1 flex-shrink-0" style={{ maxWidth: "100%" }}>
          <FilterBadgeGroup'''
if target_toolbar in content:
    content = content.replace(target_toolbar, replacement_toolbar)

target_footer = '''      </div>
      <div className="d-flex align-items-center gap-3 mt-1 mt-md-0">
        <div className="text-muted small fw-medium">'''
replacement_footer = '''      </div>
      <div className="d-flex align-items-center gap-3 mt-1 mt-md-0 flex-shrink-0">
        <div className="text-muted small fw-medium">'''
if target_footer in content:
    content = content.replace(target_footer, replacement_footer)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated layout successfully")
