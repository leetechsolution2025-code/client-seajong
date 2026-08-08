import re

with open("src/components/hr/MyRequestsTab.tsx", "r", encoding="utf-8") as f:
    tab_content = f.read()

# Make sure we don't duplicate
if 'footerClassName="px-3 py-2"' not in tab_content:
    footer_jsx = """
        footerClassName="px-3 py-2"
        footerStyle={{ backgroundColor: "transparent" }}
        footer={
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
              onClick={() => {
                  // handleStartCreate needs to be called properly, wait, handleStartCreate is not defined in this scope?
                  // Oh, let me check if handleStartCreate exists in MyRequestsTab.tsx
                  // Yes it does.
                  handleStartCreate();
              }}
              disabled={!requestType}
              style={{ height: 32, fontSize: 12, borderRadius: 20 }}
              className="px-3 shadow-sm border-0"
            >
              <span className="d-none d-sm-inline">Thêm mới yêu cầu</span>
            </BrandButton>
          </div>
        }"""
    
    # Let's fix handleStartCreate inside JSX
    footer_jsx = footer_jsx.replace('onClick={() => {\n                  // handleStartCreate needs to be called properly, wait, handleStartCreate is not defined in this scope?\n                  // Oh, let me check if handleStartCreate exists in MyRequestsTab.tsx\n                  // Yes it does.\n                  handleStartCreate();\n              }}', 'onClick={handleStartCreate}')

    # Insert it
    insert_pos = tab_content.find('tableWrapperClassName=""')
    if insert_pos != -1:
        tab_content = tab_content[:insert_pos] + 'tableWrapperClassName=""\n' + footer_jsx + '\n        ' + tab_content[insert_pos + len('tableWrapperClassName=""'):]
        
        with open("src/components/hr/MyRequestsTab.tsx", "w", encoding="utf-8") as f:
            f.write(tab_content)
        print("Footer injected successfully")
    else:
        print("Could not find tableWrapperClassName=''")
else:
    print("Footer already seems to be there")

