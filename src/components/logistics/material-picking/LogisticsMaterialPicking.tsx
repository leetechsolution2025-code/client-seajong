
"use client";

import { HoverImage } from "@/components/ui/HoverImage";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { FullWidthTableLayout } from "@/components/layout/FullWidthTableLayout";

interface BatchItem {
  id: string;
  ticketItemId: string;
  tenHang: string;
  inventoryItemId: string | null;
  code?: string | null;
  imageUrl: string | null;
  images?: string[];
  viTriKho: string | null;
  tongSoLuong: number;
  ngayGiao?: string;
  orders: {
    id: string; // Ticket ID
    code: string;
    soLuongTrongDon: number;
    ngayGiao?: string;
    assignedTo?: string;
  }[];
}

interface Employee {
  id: string;
  fullName: string;
}

export function LogisticsMaterialPicking() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  
  const [isManager, setIsManager] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [ticketIdsToAssign, setTicketIdsToAssign] = useState<string[] | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [assigning, setAssigning] = useState(false);

  const [pickedQuantities, setPickedQuantities] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());

  const toggleDate = (dateStr: string) => {
    setCollapsedDates(prev => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/hr/employees?department=logistics&pageSize=100");
      const data = await res.json();
      if (data && Array.isArray(data.employees)) {
        setEmployees(data.employees.map((e: any) => ({ id: e.id, fullName: e.fullName })));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/logistics/material-picking");
      const data = await res.json();
      if (data.success) {
        setItems(data.items);
        setTotalOrders(data.totalOrders);
        setIsManager(data.isManager || false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (isManager && employees.length === 0) {
      fetchEmployees();
    }
  }, [isManager]);

  const openAssignModal = (ticketIds: string | string[]) => {
    setTicketIdsToAssign(Array.isArray(ticketIds) ? ticketIds : [ticketIds]);
    setAssignModalOpen(true);
  };

  const handleAssignSubmit = async () => {
    if (!ticketIdsToAssign || ticketIdsToAssign.length === 0 || !selectedEmployeeId) {
      alert("Vui lòng chọn nhân viên");
      return;
    }
    try {
      const res = await fetch("/api/logistics/material-picking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "assign_ticket", 
          ticketIds: ticketIdsToAssign, 
          employeeId: selectedEmployeeId 
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("Phân công thành công!");
        setAssignModalOpen(false);
        setTicketIdsToAssign(null);
        fetchData();
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Đã xảy ra lỗi");
    }
  };

  const handleTogglePick = (id: string, maxQuantity: number) => {
    setPickedQuantities(prev => {
      const next = { ...prev };
      if (next[id] === maxQuantity) {
        delete next[id];
      } else {
        next[id] = maxQuantity;
      }
      return next;
    });
  };

  const handleQuantityChange = (id: string, val: string, maxQuantity: number) => {
    if (val === "") {
      setPickedQuantities(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      setPickedQuantities(prev => ({
        ...prev,
        [id]: Math.max(0, Math.min(num, maxQuantity))
      }));
    }
  };

  const handleComplete = async () => {
    const pickedCount = Object.keys(pickedQuantities).length;
    if (pickedCount === 0) {
      alert("Vui lòng nhập số lượng cho ít nhất 1 mặt hàng đã gom xong.");
      return;
    }
    const confirm = window.confirm(`Bạn có chắc chắn đã hoàn tất gom ${pickedCount} mặt hàng này?`);
    if (!confirm) return;

    try {
      const res = await fetch("/api/logistics/material-picking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete_picking" }) // In a real flow, pass pickedQuantities map
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setPickedQuantities({});
        fetchData();
      } else {
        alert(data.error || "Có lỗi xảy ra");
      }
    } catch (e) {
      alert("Có lỗi xảy ra");
    }
  };

  const filteredItems = items.filter(item => 
    item.tenHang.toLowerCase().includes(search.toLowerCase()) || 
    (item.inventoryItemId && item.inventoryItemId.toLowerCase().includes(search.toLowerCase()))
  );

  const groupedItems = filteredItems.reduce((acc, item) => {
    // Nếu ngayGiao là một chuỗi ISO chuẩn, ta lấy làm "Ngày giao: dd/mm/yyyy"
    // Nếu API trả về đã là text đặc biệt (vd: "Ngay lập tức"), ta giữ nguyên
    let dateStr = "Không hẹn ngày";
    if (item.ngayGiao) {
      if (item.ngayGiao.includes("T") || item.ngayGiao.includes("-")) {
        // Có thể là ISO string
        dateStr = new Date(item.ngayGiao).toLocaleDateString('vi-VN');
      } else {
        dateStr = item.ngayGiao; // Lấy nguyên text "Ngay lập tức"
      }
    }
    
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(item);
    return acc;
  }, {} as Record<string, BatchItem[]>);
  
  // Sort dates (latest first or earliest first?) Earliest first makes sense for logistics
  const sortedDates = Object.keys(groupedItems).sort((a, b) => {
    if (a === "Ngay lập tức") return -1; // Ngay lập tức luôn ưu tiên lên đầu
    if (b === "Ngay lập tức") return 1;
    if (a === "Không hẹn ngày") return 1;
    if (b === "Không hẹn ngày") return -1;
    // a and b are vi-VN locale dates like DD/MM/YYYY. Need to parse to compare
    const partsA = a.split('/');
    const partsB = b.split('/');
    if (partsA.length === 3 && partsB.length === 3) {
      const [d1, m1, y1] = partsA;
      const [d2, m2, y2] = partsB;
      return new Date(`${y1}-${m1}-${d1}`).getTime() - new Date(`${y2}-${m2}-${d2}`).getTime();
    }
    return 0;
  });

  const pickedCount = Object.keys(pickedQuantities).length;

  const headerContent = (
    <div className="d-flex align-items-center justify-content-between w-100">
      <div className="d-flex align-items-center gap-3">
        <div className="d-flex align-items-center gap-2 bg-light px-2 py-1" style={{ borderRadius: 8 }}>
          <i className="bi bi-calendar-event text-muted ms-2" style={{ fontSize: 14 }} />
          <input 
            type="date"
            className="form-control bg-transparent border-0 px-1 py-0 shadow-none"
            style={{ width: 130, fontSize: 13 }}
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
          />
        </div>
        
        <select
          className="form-select bg-light border-0 py-1 px-3"
          style={{ width: 160, borderRadius: 8, fontSize: 13 }}
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="pending">Chưa nhặt xong</option>
          <option value="done">Đã hoàn thành</option>
        </select>
      </div>

      <div className="position-relative" style={{ width: 250 }}>
        <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" style={{ fontSize: 13 }} />
        <input 
          type="text" 
          className="form-control bg-light border-0 ps-5 py-1" 
          placeholder="Tìm tên hàng hoá, mã hàng..."
          style={{ borderRadius: 8, fontSize: 13 }}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
    </div>
  );

  const tableContent = (
    <div className="h-100 overflow-auto custom-scrollbar">
      {loading ? (
        <div className="d-flex justify-content-center align-items-center h-100">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center p-5 mt-5">
          <i className="bi bi-check2-all text-success fs-1 mb-3 d-block" />
          <h5 className="fw-bold">Tuyệt vời!</h5>
          <p className="text-muted">Tất cả các phiếu gom hàng hiện tại đã được hoàn tất.</p>
        </div>
      ) : (
        <table className="table table-hover align-middle mb-0 bg-white" style={{ fontSize: 13.5 }}>
          <thead style={{ position: "sticky", top: 0, zIndex: 1, background: "var(--background)" }}>
            <tr>
              <th rowSpan={2} style={{ width: 60, borderBottomWidth: 1, fontSize: 11, letterSpacing: 0.5 }} className="text-center border-0 text-secondary text-uppercase fw-semibold py-3 align-middle">
                <i className="bi bi-check-all fs-6" />
              </th>
              <th rowSpan={2} style={{ borderBottomWidth: 1, fontSize: 11, letterSpacing: 0.5 }} className="border-0 text-secondary text-uppercase fw-semibold py-3 align-middle">Mặt hàng</th>
              <th colSpan={2} style={{ borderBottomWidth: 1, fontSize: 11, letterSpacing: 0.5 }} className="border-0 text-secondary text-uppercase fw-semibold text-center py-2 border-bottom">SỐ LƯỢNG</th>
              <th rowSpan={2} style={{ borderBottomWidth: 1, fontSize: 11, letterSpacing: 0.5 }} className="border-0 text-secondary text-uppercase fw-semibold py-3 align-middle">
                <div className="d-flex align-items-center justify-content-between">
                  <span>Chi tiết theo phiếu</span>
                  <button onClick={handleComplete} className="btn btn-sm btn-primary py-1 px-3">Báo cáo</button>
                </div>
              </th>
            </tr>
            <tr>
              <th style={{ width: 90, borderBottomWidth: 1, fontSize: 10, letterSpacing: 0.5 }} className="border-0 text-secondary text-uppercase fw-semibold text-center py-2">Yêu cầu</th>
              <th style={{ width: 90, borderBottomWidth: 1, fontSize: 10, letterSpacing: 0.5 }} className="border-0 text-secondary text-uppercase fw-semibold text-center py-2">Đã nhặt</th>
            </tr>
          </thead>
          <tbody>
            {sortedDates.map(dateStr => (
              <React.Fragment key={dateStr}>
                {(() => {
                  const ticketIdsForDate = Array.from(new Set(groupedItems[dateStr].flatMap(item => item.orders.map((o: any) => o.id))));
                  const dateAssignees = Array.from(new Set(groupedItems[dateStr].flatMap(item => item.orders.map((o: any) => o.assignedTo).filter(Boolean))));
                  return (
                    <tr style={{ background: "var(--light)", cursor: "pointer" }} onClick={() => toggleDate(dateStr)}>
                      <td colSpan={5} className="py-2 px-3 fw-bold text-dark border-bottom" style={{ fontSize: 13, background: "#f1f5f9" }}>
                        <div className="d-flex align-items-center justify-content-between">
                          <div className="d-flex align-items-center">
                            <i className={`bi bi-chevron-${collapsedDates.has(dateStr) ? 'right' : 'down'} text-secondary me-2`} style={{ fontSize: 12 }} />
                            <i className="bi bi-calendar-event text-primary me-2" />
                            Ngày giao: <span className="ms-1 text-primary">{dateStr}</span>
                            <span className="badge bg-white text-dark border ms-3 rounded-pill" style={{ fontWeight: 500, fontSize: 11 }}>
                              {groupedItems[dateStr].length} mặt hàng
                            </span>
                            {dateAssignees.length > 0 ? (
                              <span 
                                className="badge bg-primary bg-opacity-10 text-primary border border-primary ms-3"
                                style={{ fontWeight: 500, cursor: isManager ? "pointer" : "default" }}
                                onClick={(e) => {
                                  if (isManager) {
                                    e.stopPropagation();
                                    openAssignModal(ticketIdsForDate);
                                  }
                                }}
                                title={isManager ? "Nhấn để phân công lại" : ""}
                              >
                                <i className="bi bi-person-fill me-1"></i>
                                {dateAssignees.join(", ")}
                              </span>
                            ) : (
                              isManager && (
                                <button 
                                  className="btn btn-sm btn-outline-primary py-0 px-2 ms-3 rounded-pill"
                                  style={{ fontSize: 11 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openAssignModal(ticketIdsForDate);
                                  }}
                                >
                                  <i className="bi bi-person-plus me-1"></i>
                                  Phân công
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })()}
                {!collapsedDates.has(dateStr) && groupedItems[dateStr].map(item => {
                  const pickedQty = pickedQuantities[item.id];
                  const isPicked = pickedQty !== undefined;
                  const isFullyPicked = pickedQty === item.tongSoLuong;
                  
                  return (
                    <tr key={item.id} style={{ transition: "all 0.2s" }} className={isFullyPicked ? "bg-success bg-opacity-10" : isPicked ? "bg-warning bg-opacity-10" : "bg-white"}>
                      <td className="text-center py-2" style={{ borderBottomColor: "rgba(0,0,0,0.05)", cursor: "pointer" }} onClick={() => handleTogglePick(item.id, item.tongSoLuong)}>
                    <div 
                      className={`d-inline-flex align-items-center justify-content-center rounded-circle border ${isFullyPicked ? "bg-success border-success text-white" : isPicked ? "bg-warning border-warning text-white" : "border-secondary text-transparent"}`}
                      style={{ width: 20, height: 20, transition: "all 0.2s" }}
                    >
                      <i className="bi bi-check" style={{ fontSize: 14 }} />
                    </div>
                  </td>
                  <td className="py-2" style={{ borderBottomColor: "rgba(0,0,0,0.05)" }}>
                    <div className="d-flex align-items-center gap-3">
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "1px solid rgba(0,0,0,0.05)" }}>
                        {(item.imageUrl || (item.images && item.images.length > 0)) ? (
                          <HoverImage 
                            src={item.imageUrl || (item.images && item.images[0]) || ""} 
                            alt={item.tenHang} 
                            images={item.images?.length ? item.images : (item.imageUrl ? [item.imageUrl] : [])}
                            style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }} 
                          />
                        ) : (
                          <i className="bi bi-box-seam text-muted" />
                        )}
                      </div>
                      <div>
                        <div className={`fw-bold ${isFullyPicked ? "text-success" : isPicked ? "text-warning" : "text-dark"}`}>{item.tenHang}</div>
                        <div className="d-flex align-items-center gap-2 mt-1">
                          {item.inventoryItemId && (
                            <div className="text-muted" style={{ fontSize: 11, fontFamily: "monospace" }}>{item.inventoryItemId}</div>
                          )}
                          {item.viTriKho ? (
                            <span className="badge bg-light text-primary border border-primary border-opacity-25" style={{ fontSize: 10, fontWeight: 500 }}>
                              <i className="bi bi-geo-alt me-1"></i>
                              {item.viTriKho}
                            </span>
                          ) : (
                            <span className="badge bg-light text-muted border border-secondary border-opacity-25" style={{ fontSize: 10, fontWeight: 500 }}>
                              <i className="bi bi-geo-alt-fill me-1 text-black-50"></i>
                              Không có thông tin vị trí
                            </span>
                          )}
                          {isFullyPicked ? (
                            <span className="badge bg-light text-success border border-success border-opacity-25" style={{ fontSize: 10, fontWeight: 500 }}><i className="bi bi-check-circle-fill me-1" /> Đủ hàng</span>
                          ) : isPicked ? (
                            <span className="badge bg-light text-warning border border-warning border-opacity-25" style={{ fontSize: 10, fontWeight: 500 }}><i className="bi bi-exclamation-triangle-fill me-1" /> Thiếu hàng</span>
                          ) : (
                            <span className="badge bg-light text-muted border border-secondary border-opacity-25" style={{ fontSize: 10, fontWeight: 500 }}><i className="bi bi-circle me-1" /> Chờ nhặt</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="text-center py-2" style={{ borderBottomColor: "rgba(0,0,0,0.05)" }}>
                    <span className="fw-semibold text-dark fs-6">{item.tongSoLuong}</span>
                  </td>
                  <td className="text-center py-2" style={{ borderBottomColor: "rgba(0,0,0,0.05)", width: 100 }}>
                    <input 
                      type="number"
                      className={`form-control form-control-sm text-center fw-bold ${isFullyPicked ? "text-success border-success" : isPicked ? "text-warning border-warning" : "text-muted"}`}
                      value={pickedQty !== undefined ? pickedQty : ""}
                      onChange={e => handleQuantityChange(item.id, e.target.value, item.tongSoLuong)}
                      style={{ width: 70, margin: "0 auto" }}
                      min={0}
                      max={item.tongSoLuong}
                    />
                  </td>
                  <td className="py-2" style={{ borderBottomColor: "rgba(0,0,0,0.05)" }}>
                    <div className="d-flex flex-wrap gap-1">
                      {item.orders.map((o, idx) => (
                        <span key={idx} className="badge bg-light text-dark border d-inline-flex align-items-center gap-1" style={{ fontSize: 11, fontWeight: 500 }}>
                          {o.code}: {o.soLuongTrongDon}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
            </React.Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <>
      <FullWidthTableLayout 
        header={headerContent}
        table={tableContent}
      />
      
      {assignModalOpen && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header py-2">
                <h6 className="modal-title">Phân công Phiếu điều phối</h6>
                <button type="button" className="btn-close" onClick={() => setAssignModalOpen(false)}></button>
              </div>
              <div className="modal-body">
                <label className="form-label fs-6">Chọn nhân viên kho:</label>
                <select className="form-select" value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)}>
                  <option value="">-- Chọn nhân viên --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                  ))}
                </select>
              </div>
              <div className="modal-footer py-2">
                <button type="button" className="btn btn-light btn-sm" onClick={() => setAssignModalOpen(false)}>Hủy</button>
                <button type="button" className="btn btn-primary btn-sm" onClick={handleAssignSubmit}>Phân công</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
