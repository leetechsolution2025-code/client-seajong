const fs = require('fs');
const file = 'src/app/(dashboard)/finance/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Import BrandButton
content = content.replace(
  `import { ConfirmDialog } from "@/components/ui/ConfirmDialog";`,
  `import { ConfirmDialog } from "@/components/ui/ConfirmDialog";\nimport { BrandButton } from "@/components/ui/BrandButton";`
);

// 2. Update Header
content = content.replace(
  `<h5 className="offcanvas-title fw-bold">Chi tiết</h5>
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => {
                  if (currentStep === 1) setSelectedOrder(null);
                  if (currentStep === 2) setSelectedRequest(null);
                  if (currentStep === 3) setSelectedPaymentNotification(null);
                  if (currentStep === 4) setSelectedExpense(null);
                }}
              ></button>`,
  `<h5 className="offcanvas-title fw-bold">
                {showItemsOffcanvas ? "Chi tiết hàng hoá / Vật tư" : "Chi tiết"}
              </h5>
              {showItemsOffcanvas ? (
                <button type="button" className="btn btn-sm btn-light border" onClick={() => setShowItemsOffcanvas(false)}>
                  <i className="bi bi-arrow-left me-1"></i> Quay lại
                </button>
              ) : (
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => {
                    if (currentStep === 1) setSelectedOrder(null);
                    if (currentStep === 2) setSelectedRequest(null);
                    if (currentStep === 3) setSelectedPaymentNotification(null);
                    if (currentStep === 4) setSelectedExpense(null);
                  }}
                ></button>
              )}`
);

// 3. Update Body to handle items view
const itemsViewCode = `
                  {showItemsOffcanvas ? (
                    <div className="flex-grow-1 custom-scrollbar d-flex flex-column" style={{ overflowY: "auto", overflowX: "hidden", minHeight: 0 }}>
                      <div className="text-muted mb-3" style={{ fontSize: 13 }}>
                        {selectedOrder?.typeLabel} {selectedOrder?.code}
                      </div>
                      {fetchingDetails ? (
                        <div className="text-center p-5 text-muted">
                          <div className="spinner-border text-primary spinner-border-sm me-2"></div>
                          Đang tải dữ liệu...
                        </div>
                      ) : orderDetails.length > 0 ? (
                        <div className="d-flex flex-column gap-3">
                          <div className="fw-medium text-muted" style={{ fontSize: "13px" }}>Nhấn chọn hàng hoá để sản xuất</div>
                          <Table
                            rows={orderDetails}
                            columns={[
                              {
                                header: "",
                                render: (item: any) => {
                                  const isDisabled = selectedOrder?.keToanDuyet === "approved" || !item.isManufactured;
                                  const isProdChecked = productionItemIds.includes(item.id) && item.isManufactured;
                                  
                                  return (
                                    <div className="d-flex justify-content-center">
                                      <input 
                                        type="checkbox" 
                                        className="form-check-input" 
                                        style={{ cursor: isDisabled ? "not-allowed" : "pointer", width: "16px", height: "16px" }}
                                        disabled={isDisabled}
                                        checked={isProdChecked}
                                        title={!item.isManufactured ? "Hàng hoá không có định mức sản xuất, hệ thống sẽ tự tạo phiếu yêu cầu mua sắm" : ""}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setProductionItemIds(prev => [...prev, item.id]);
                                          } else {
                                            setProductionItemIds(prev => prev.filter(id => id !== item.id));
                                          }
                                        }}
                                      />
                                    </div>
                                  );
                                },
                                width: "40px"
                              },
                              {
                                header: "Sản phẩm",
                                render: (item: any) => {
                                  const hasEnoughStock = (item.missingQty || 0) <= 0;
                                  const warehouseLabel = item.warehouseCode === "KHO-CHINH" ? "Kho Hàng Hoá (KHO-CHINH)" : "Kho Vật Tư Phụ Kiện (KVP)";
                                  return (
                                    <div className="d-flex flex-column">
                                      <span className="fw-bold text-dark" style={{ fontSize: "13px" }}>{item.tenHang || item.name}</span>
                                      <span className="text-muted" style={{ fontSize: "11px" }}><i className="bi bi-box-seam me-1"></i>{warehouseLabel}</span>
                                      {!hasEnoughStock ? (
                                        <div className="d-flex flex-column mt-1">
                                          <span className="text-danger fw-semibold" style={{ fontSize: "11px" }}>
                                            <i className="bi bi-exclamation-triangle me-1"></i> Thiếu: {item.missingQty} {item.donVi || item.unit || "cái"}
                                          </span>
                                          {item.isManufactured ? (
                                            item.canProduce ? (
                                              <span className="text-success fw-medium mt-1" style={{ fontSize: "11px" }}>
                                                <i className="bi bi-check-circle me-1"></i> Đủ phụ kiện để sản xuất
                                              </span>
                                            ) : (
                                              <span className="text-warning fw-medium mt-1" style={{ fontSize: "11px" }}>
                                                <i className="bi bi-exclamation-circle me-1"></i> Thiếu phụ kiện, cần mua vật tư
                                              </span>
                                            )
                                          ) : (
                                            <span className="text-muted fw-medium mt-1" style={{ fontSize: "11px" }}>
                                              <i className="bi bi-cart-x me-1"></i> Hết hàng, cần mua
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="mt-1">
                                          <span className="text-success fw-semibold" style={{ fontSize: "11px" }}>
                                            <i className="bi bi-check-circle-fill me-1"></i> Đủ hàng trong kho
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                              },
                              {
                                header: "SL",
                                render: (item: any) => (
                                  <div className="text-end fw-bold text-primary" style={{ fontSize: "13px" }}>
                                    {item.soLuong || item.qty} <span className="fw-normal text-muted" style={{ fontSize: 11 }}>{item.donVi || item.unit || "cái"}</span>
                                  </div>
                                ),
                                align: "right",
                                width: "60px"
                              }
                            ]}
                            fixedLayout={false}
                            wrapperClassName="border rounded-3 bg-white"
                            wrapperStyle={{ overflowX: "hidden" }}
                          />
                        </div>
                      ) : (
                        <div className="text-center p-5 text-muted border border-dashed rounded-3">
                          Không tìm thấy hàng hoá nào
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
`;

const originalBodyStart = `              ) : (
                <div className="flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
                  {/* Header */}`;

content = content.replace(
  originalBodyStart,
  `              ) : (
                <div className="flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>${itemsViewCode}
                  {/* Header */}`
);

const originalBodyEnd = `                  </div>
                </div>
              )
            ) : currentStep === 2 ? (`;

content = content.replace(
  originalBodyEnd,
  `                  </div>
                    </>
                  )}
                </div>
              )
            ) : currentStep === 2 ? (`
);

// 4. Move buttons to footer and make Trình Giám Đốc/Xoá icon only
const originalFooter = `              {currentStep === 1 && selectedOrder && (
                <>
                  <button 
                    className="btn btn-primary fw-bold px-4 rounded-3 d-flex align-items-center gap-2"
                    onClick={handleSubmitToDirector}
                  >
                    <i className="bi bi-send" />
                    Trình giám đốc
                  </button>
                  <button 
                    className="btn btn-danger fw-bold px-4 rounded-3 d-flex align-items-center gap-2"
                    onClick={() => {
                      if (selectedOrder) {
                        setShowDeleteConfirm(true);
                      } else if (selectedOrderIds.length > 0) {
                        setShowDeleteConfirm(true);
                      }
                    }}
                  >
                    <i className="bi bi-trash" />
                    Xóa
                  </button>
                </>
              )}`;

const newFooter = `              {currentStep === 1 && selectedOrder && (
                <>
                  {selectedOrder.keToanDuyet !== "approved" && !showItemsOffcanvas && (
                    <>
                      <BrandButton
                        variant="outline"
                        style={{ color: "#dc3545", borderColor: "#dc3545", fontSize: 13 }}
                        onClick={handleReject}
                        title="Từ chối"
                      >
                        <i className="bi bi-x-lg" />
                        Từ chối
                      </BrandButton>
                      <BrandButton
                        onClick={handleApprove}
                        style={{ backgroundColor: "#198754", borderColor: "#198754", fontSize: 13 }}
                        title="Duyệt đơn"
                      >
                        <i className="bi bi-check-lg" />
                        Duyệt đơn
                      </BrandButton>
                    </>
                  )}
                  {!showItemsOffcanvas && (
                    <>
                      <BrandButton
                        className="px-3"
                        onClick={handleSubmitToDirector}
                        title="Trình giám đốc"
                      >
                        <i className="bi bi-send" />
                      </BrandButton>
                      <button 
                        className="btn btn-danger fw-bold px-3 rounded-3 d-flex align-items-center justify-content-center"
                        onClick={() => {
                          if (selectedOrder) {
                            setShowDeleteConfirm(true);
                          } else if (selectedOrderIds.length > 0) {
                            setShowDeleteConfirm(true);
                          }
                        }}
                        title="Xóa"
                      >
                        <i className="bi bi-trash" />
                      </button>
                    </>
                  )}
                  {showItemsOffcanvas && (
                    <button className="btn btn-secondary w-100 fw-bold" onClick={() => setShowItemsOffcanvas(false)}>
                      Đóng
                    </button>
                  )}
                </>
              )}`;

content = content.replace(originalFooter, newFooter);

// 5. Remove original Items Offcanvas
const itemsOffcanvasStart = `{/* Items Offcanvas */}`;
const itemsOffcanvasEnd = `    <ConfirmDialog`;

const startIndex = content.indexOf(itemsOffcanvasStart);
if (startIndex !== -1) {
  let endIndex = content.indexOf(itemsOffcanvasEnd, startIndex);
  if (endIndex !== -1) {
    content = content.substring(0, startIndex) + "    " + content.substring(endIndex);
  }
}

fs.writeFileSync(file, content);
console.log("Done");
