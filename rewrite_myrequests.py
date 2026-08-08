import re

with open("src/components/hr/MyRequestsTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# We need to replace everything from "return (" down to "export default function RecruitmentManagementPage()"
# with our custom layout.

# First, let's find the start of the return statement in RecruitmentManagementContent
start_idx = content.find("  return (\n    <SplitLayoutPage")

if start_idx == -1:
    print("Could not find the return statement")
    exit(1)

# Find the end of the return statement
# We know the file ends with export default function RecruitmentManagementPage()
end_idx = content.find("export default function RecruitmentManagementPage()")

if end_idx == -1:
    print("Could not find the end of the file")
    exit(1)

# Extract leftContent and rightContent from the original
original_return = content[start_idx:end_idx]

# I will craft the new return statement manually
new_return = """  return (
    <div className="d-flex flex-column gap-2 h-100 overflow-hidden bg-white p-3 position-relative">
      <style>{`
        .app-responsive-table-wrapper {
          width: 100% !important;
          max-width: 100% !important;
          overflow-x: auto !important;
        }
      `}</style>
      
      {/* Filters & Actions */}
      <div className="d-flex flex-column gap-2">
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
            width="250px"
          />
          <FilterSelect
            placeholder="Trạng thái"
            options={[
              { label: "Đang thực hiện", value: "Đang thực hiện" },
              { label: "Đã thực hiện", value: "Đã thực hiện" },
              { label: "Tạm dừng", value: "Tạm dừng" },
              { label: "Huỷ bỏ", value: "Huỷ bỏ" },
            ]}
            value={status}
            onChange={(val) => {
              setStatus(val);
              setViewMode("view");
            }}
            width="180px"
          />
          <SearchInput
            placeholder="Tìm kiếm nội dung..."
            value={searchQuery}
            onChange={(val) => {
              setSearchQuery(val);
              setViewMode("view");
            }}
            style={{ width: "300px" }}
          />
          <div className="ms-auto">
            <BrandButton
              icon="bi-plus-lg"
              onClick={handleStartCreate}
              disabled={!requestType}
              style={{ height: 36 }}
            >
              <span className="d-none d-sm-inline">Thêm mới yêu cầu</span>
            </BrandButton>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-grow-1 bg-white border rounded-3 mt-2" style={{ minHeight: 0, width: "100%", overflow: "hidden" }}>
        {loading ? (
          <div className="p-4 text-center text-muted" style={{ fontSize: "13px" }}>
            Đang tải danh sách yêu cầu...
          </div>
        ) : (
          <Table
            rows={filteredData}
            rowKey={(r) => r.id}
            fontSize={12.5}
            striped={true}
            fixedLayout={false}
            wrapperClassName="mkt-plan-table-no-min"
            wrapperStyle={{ overflowX: "hidden" }}
            onRowClick={(row) => {
              setSelectedRequest(row);
              setViewMode("view");
            }}
            columns={[
              {
                header: "Nội dung yêu cầu",
                render: (row) => {
                  const isSelected = selectedRequest?.id === row.id;
                  return (
                    <div>
                      <div className={`fw-bold mb-1 ${isSelected ? "text-primary" : "text-dark"}`} style={{ lineHeight: "1.3", transition: "color 0.15s ease" }}>
                        {row.content}
                      </div>
                      <span className="text-muted" style={{ fontSize: "10.5px" }}>
                        Phân loại: {row.type}
                      </span>
                    </div>
                  );
                }
              },
              {
                header: "Trạng thái",
                width: "120px",
                align: "center",
                render: (row) => <StatusBadge status={row.status} />
              }
            ]}
          />
        )}
      </div>

      {/* Offcanvas cho Chi tiết / Form Tạo mới */}
      {(viewMode === "create" || selectedRequest) && (
        <div className="offcanvas offcanvas-end show" style={{ visibility: "visible", width: 450, zIndex: 1045 }}>
          <div className="offcanvas-header border-bottom bg-light d-flex justify-content-between align-items-center">
            <h6 className="offcanvas-title fw-bold">
              {viewMode === "create" ? `Tạo mới: ${requestType}` : "Chi tiết yêu cầu"}
            </h6>
            <button 
              type="button" 
              className="btn-close shadow-none" 
              onClick={() => {
                setViewMode("view");
                setSelectedRequest(null);
              }}
            />
          </div>
          <div className="offcanvas-body p-0 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={viewMode === "create" ? `create-${requestType}` : (selectedRequest ? selectedRequest.id : "empty")}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
                className="h-100"
              >
                {viewMode === "create" ? renderCreateForm() : renderRightPanel()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}
      
      {/* Backdrop */}
      {(viewMode === "create" || selectedRequest) && (
        <div 
          className="modal-backdrop fade show" 
          style={{ zIndex: 1040 }}
          onClick={() => {
            setViewMode("view");
            setSelectedRequest(null);
          }}
        />
      )}
    </div>
  );
}

export function MyRequestsTab() {
  return (
    <Suspense fallback={<div className="p-5 text-center">Đang tải...</div>}>
      <RecruitmentManagementContent />
    </Suspense>
  );
}
"""

new_content = content[:start_idx] + new_return
with open("src/components/hr/MyRequestsTab.tsx", "w", encoding="utf-8") as f:
    f.write(new_content)

print("Rewrite successful")
