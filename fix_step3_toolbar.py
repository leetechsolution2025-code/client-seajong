import re

with open("src/app/(dashboard)/hr/page.tsx", "r", encoding="utf-8") as f:
    hr_content = f.read()

# Replace bottomToolbar for WorkflowCard
hr_content = hr_content.replace(
    'bottomToolbar={activeTabId === "my-requests" ? null : ApprovalsBottomToolbar}',
    'bottomToolbar={activeTabId === "my-requests" ? <div id="my-requests-toolbar-portal" className="w-100" /> : ApprovalsBottomToolbar}'
)
with open("src/app/(dashboard)/hr/page.tsx", "w", encoding="utf-8") as f:
    f.write(hr_content)

with open("src/components/hr/MyRequestsTab.tsx", "r", encoding="utf-8") as f:
    tab_content = f.read()

# Make sure createPortal is imported
if 'import { createPortal }' not in tab_content:
    tab_content = tab_content.replace(
        'import React, { useState, useEffect, useMemo } from "react";',
        'import React, { useState, useEffect, useMemo } from "react";\nimport { createPortal } from "react-dom";'
    )

# Add portalTarget state
if 'const [portalTarget, setPortalTarget]' not in tab_content:
    tab_content = tab_content.replace(
        '  const [activeMobileTab, setActiveMobileTab] = useState<"left" | "right">("left");',
        '  const [activeMobileTab, setActiveMobileTab] = useState<"left" | "right">("left");\n  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);\n\n  useEffect(() => {\n    setPortalTarget(document.getElementById("my-requests-toolbar-portal"));\n  }, []);'
    )

# Extract footer from FullWidthTableLayout and convert to portal
start_footer = tab_content.find('footerClassName="bg-white"')
end_footer = tab_content.find('        table={')

if start_footer != -1 and end_footer != -1:
    # Remove the footer props from FullWidthTableLayout
    old_footer_str = tab_content[start_footer:end_footer]
    tab_content = tab_content[:start_footer] + tab_content[end_footer:]

    # Create the portal content (without the stats block and total count)
    portal_jsx = """      {portalTarget && createPortal(
        <div className="d-flex align-items-center justify-content-between gap-3 w-100">
          <div className="d-flex align-items-center gap-2">
            <FilterSelect
              placeholder="Loại yêu cầu"
              options={[
                { label: "Tuyển dụng", value: "Tuyển dụng" },
                { label: "Đào tạo", value: "Đào tạo" },
                { label: "Điều chỉnh thu nhập", value: "Điều chỉnh thu nhập" },
                { label: "Đề bạt và thuyên chuyển", value: "Đề bạt và thuyên chuyển" },
                { label: "Văn phòng phẩm và dụng cụ", value: "Văn phòng phẩm và dụng cụ" },
              ]}
              value={requestType}
              onChange={(val) => {
                setRequestType(val);
                setViewMode("view");
              }}
              width={180}
              className="border-0 shadow-sm hover-bg-light transition-all"
            />
            <SearchInput
              placeholder="Tìm kiếm nội dung..."
              value={searchQuery}
              onChange={(val) => {
                setSearchQuery(val);
                setViewMode("view");
              }}
              style={{ width: 220 }}
              className="border-0 shadow-sm transition-all"
            />
            <FilterSelect
              placeholder="Trạng thái"
              options={[
                { label: "Chờ duyệt", value: "Chờ duyệt" },
                { label: "Đã duyệt", value: "Đã duyệt" },
                { label: "Từ chối", value: "Từ chối" },
              ]}
              value={status}
              onChange={(val) => {
                setStatus(val);
                setViewMode("view");
              }}
              width={130}
              className="border-0 shadow-sm hover-bg-light transition-all"
            />
          </div>

          <BrandButton
            icon="bi-plus-lg"
            onClick={handleStartCreate}
            disabled={!requestType}
            style={{ height: 32, fontSize: 12, borderRadius: 20 }}
            className="px-3 shadow-sm border-0"
          >
            <span className="d-none d-sm-inline">Thêm mới yêu cầu</span>
          </BrandButton>
        </div>,
        portalTarget
      )}"""
    
    # Insert portal_jsx after FullWidthTableLayout
    end_layout = tab_content.find('</FullWidthTableLayout>')
    if end_layout != -1:
        insert_pos = end_layout + len('</FullWidthTableLayout>')
        tab_content = tab_content[:insert_pos] + '\n' + portal_jsx + tab_content[insert_pos:]

with open("src/components/hr/MyRequestsTab.tsx", "w", encoding="utf-8") as f:
    f.write(tab_content)

print("Modification done")
