"use client";

import { HoverImage } from "@/components/ui/HoverImage";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { FullWidthTableLayout } from "@/components/layout/FullWidthTableLayout";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "react-toastify";

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
  tongDaNhat: number;
  ngayGiao?: string;
  orders: {
    id: string; // Ticket ID
    code: string;
    soLuongTrongDon: number;
    ngayGiao?: string;
    createdAt?: string;
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
  const [completingDate, setCompletingDate] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleDate = (dateStr: string) => {
    setCollapsedDates(prev => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
  };

  const handleUpdateDeadline = async (dateStr: string, newDate: string) => {
    if (!newDate) return;
    const ticketIds = Array.from(new Set(groupedItems[dateStr].flatMap(item => item.orders.map((o: any) => o.id))));
    try {
      const res = await fetch("/api/logistics/tickets/update-deadline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketIds, newDate })
      });
      if (res.ok) {
        toast.success("Đã cập nhật Hạn hoàn thành thành công!");
        fetchData(); // Reload data
      } else {
        toast.error("Cập nhật thất bại.");
      }
    } catch (e) {
      toast.error("Đã xảy ra lỗi khi cập nhật.");
    }
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
    if (items.length > 0) {
      const newCollapsed = new Set<string>();
      const groups: Record<string, BatchItem[]> = {};
      
      items.forEach(item => {
        let dateStr = "Không hẹn ngày";
        if (item.ngayGiao) {
          if (item.ngayGiao.includes("T") || item.ngayGiao.includes("-")) {
            dateStr = new Date(item.ngayGiao).toLocaleDateString('vi-VN');
          } else {
            dateStr = item.ngayGiao; 
          }
        }
        if (!groups[dateStr]) groups[dateStr] = [];
        groups[dateStr].push(item);
      });

      Object.entries(groups).forEach(([dateStr, groupItems]) => {
        let pickedCount = 0;
        groupItems.forEach(item => {
          if ((item.tongDaNhat || 0) > 0) pickedCount++;
        });
        if (pickedCount > 0) {
          newCollapsed.add(dateStr);
        }
      });
      
      setCollapsedDates(newCollapsed);
    }
  }, [items]);

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

  const handleCompleteClick = (dateStr: string) => {
    const groupItems = groupedItems[dateStr] || [];
    const pickedItemsForDate = groupItems.filter(item => pickedQuantities[item.id] !== undefined);
    
    if (pickedItemsForDate.length === 0) {
      toast.warning("Vui lòng nhập số lượng cho ít nhất 1 mặt hàng trong ngày này.");
      return;
    }
    
    setCompletingDate(dateStr);
  };

  const executeComplete = async (dateStr: string) => {
    setIsSubmitting(true);
    try {
      const groupItems = groupedItems[dateStr] || [];
      const pickedItemsForDate = groupItems.filter(item => pickedQuantities[item.id] !== undefined);
      
      const payloadPickedQuantities: Record<string, number> = {};
      pickedItemsForDate.forEach(batchItem => {
        let remainingQty = pickedQuantities[batchItem.id];
        batchItem.orders.forEach((order: any) => {
          if (remainingQty < 0) return;
          const fulfillQty = Math.min(remainingQty, order.soLuongTrongDon);
          payloadPickedQuantities[order.ticketItemId] = fulfillQty;
          remainingQty -= fulfillQty;
        });
      });

      console.log("Payload sending to backend:", payloadPickedQuantities);

      const res = await fetch("/api/logistics/material-picking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete_picking", date: dateStr, pickedQuantities: payloadPickedQuantities })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setPickedQuantities(prev => {
          const next = { ...prev };
          pickedItemsForDate.forEach(item => delete next[item.id]);
          return next;
        });
        fetchData();
      } else {
        toast.error(data.error || "Có lỗi xảy ra");
      }
    } catch (e) {
      toast.error("Có lỗi xảy ra");
    } finally {
      setIsSubmitting(false);
      setCompletingDate(null);
    }
  };

  const filteredItems = items.filter(item => 
    item.tenHang.toLowerCase().includes(search.toLowerCase()) || 
    (item.inventoryItemId && item.inventoryItemId.toLowerCase().includes(search.toLowerCase()))
  );

  const getRelativeDateText = (dateString: string) => {
    if (dateString === "Ngay lập tức" || dateString === "Không hẹn ngày") return dateString;
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      const targetDate = new Date(Number(y), Number(m) - 1, Number(d));
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return "Hôm nay";
      if (diffDays === 1) return "Ngày mai";
      if (diffDays > 1) return `${diffDays} ngày nữa`;
      if (diffDays < 0) return `Trễ ${Math.abs(diffDays)} ngày`;
    }
    return dateString;
  };

  const groupedItems = filteredItems.reduce((acc, item) => {
    let dateStr = "Không hẹn ngày";
    if (item.ngayGiao) {
      if (item.ngayGiao.includes("T") || item.ngayGiao.includes("-")) {
        dateStr = new Date(item.ngayGiao).toLocaleDateString('vi-VN');
      } else {
        dateStr = item.ngayGiao; 
      }
    }
    
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(item);
    return acc;
  }, {} as Record<string, BatchItem[]>);
  
  const sortedDates = Object.keys(groupedItems).sort((a, b) => {
    if (a === "Ngay lập tức") return -1;
    if (b === "Ngay lập tức") return 1;
    if (a === "Không hẹn ngày") return 1;
    if (b === "Không hẹn ngày") return -1;
    const partsA = a.split('/');
    const partsB = b.split('/');
    if (partsA.length === 3 && partsB.length === 3) {
      const [d1, m1, y1] = partsA;
      const [d2, m2, y2] = partsB;
      return new Date(`${y1}-${m1}-${d1}`).getTime() - new Date(`${y2}-${m2}-${d2}`).getTime();
    }
    return 0;
  });

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
          <div className="mx-auto mb-4 d-flex align-items-center justify-content-center position-relative" style={{ width: 100, height: 100 }}>
             <div className="position-absolute w-100 h-100" style={{ background: "#3b82f6", opacity: 0.1, borderRadius: "50%" }}></div>
             <div className="position-absolute" style={{ width: 70, height: 70, background: "#3b82f6", opacity: 0.15, borderRadius: "50%" }}></div>
             <i className="bi bi-clipboard2-check position-relative" style={{ fontSize: 42, color: "#3b82f6" }} />
             <div className="position-absolute bg-white rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: 28, height: 28, bottom: 15, right: 15 }}>
               <i className="bi bi-check-lg" style={{ color: "#3b82f6", fontSize: 18, fontWeight: "bold" }} />
             </div>
          </div>
          <h5 className="fw-bold" style={{ color: "#1e293b" }}>Tuyệt vời!</h5>
          <p className="text-muted">Tất cả các phiếu cấp phát vật tư hiện tại đã được hoàn tất.</p>
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
                Chi tiết theo phiếu
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
                            
                            {(() => {
                               const dates = groupedItems[dateStr].flatMap(i => i.orders.map(o => o.createdAt)).filter((d): d is string => !!d);
                               dates.sort();
                               const groupCreatedAtStr = dates.length > 0 ? new Date(dates[0]).toLocaleDateString('vi-VN') : "Không rõ";
                               return (
                                 <span className="me-3 text-secondary" style={{ fontSize: 12.5 }}>Ngày giao: <b>{groupCreatedAtStr}</b></span>
                               );
                            })()}

                            <i className="bi bi-calendar-event text-primary me-2 ms-2 border-start ps-3" />
                            <span 
                              className="text-primary fw-bolder position-relative" 
                              style={{ cursor: "pointer" }}
                              title="Nhấn để thay đổi Hạn hoàn thành"
                              onClick={(e) => {
                                e.stopPropagation();
                                const picker = document.getElementById(`date-picker-${dateStr}`) as HTMLInputElement;
                                if (picker) {
                                  try { picker.showPicker(); } catch (err) { picker.click(); }
                                }
                              }}
                            >
                              Hạn hoàn thành: <span className="ms-1">{getRelativeDateText(dateStr)}</span>
                              <input 
                                type="date" 
                                id={`date-picker-${dateStr}`}
                                style={{ opacity: 0, position: 'absolute', width: 0, height: 0, left: 0, top: 0 }}
                                onChange={(e) => handleUpdateDeadline(dateStr, e.target.value)}
                              />
                            </span>
                            <span className="text-muted ms-1" style={{ fontSize: 11 }}>| {dateStr}</span>
                            <span className="badge bg-white text-dark border ms-3 rounded-pill" style={{ fontWeight: 500, fontSize: 11 }}>
                              {groupedItems[dateStr].length} mặt hàng
                            </span>
                            {(() => {
                              const groupItems = groupedItems[dateStr];
                              let pickedCount = 0;
                              let fullyPickedCount = 0;
                              groupItems.forEach(item => {
                                const qty = pickedQuantities[item.id] !== undefined ? pickedQuantities[item.id] : (item.tongDaNhat || 0);
                                if (qty > 0) {
                                  pickedCount++;
                                  if (qty >= item.tongSoLuong) {
                                    fullyPickedCount++;
                                  }
                                }
                              });
                              const isGroupFullyPicked = fullyPickedCount === groupItems.length;
                              const isGroupPicked = pickedCount > 0;
                              return isGroupFullyPicked ? (
                                <span className="badge bg-light text-success border border-success border-opacity-25 ms-3 rounded-pill" style={{ fontSize: 11, fontWeight: 500 }}><i className="bi bi-check-circle-fill me-1" /> Đã thực hiện | Đủ hàng</span>
                              ) : isGroupPicked ? (
                                <span className="badge bg-light text-warning border border-warning border-opacity-25 ms-3 rounded-pill" style={{ fontSize: 11, fontWeight: 500 }}><i className="bi bi-exclamation-triangle-fill me-1" /> Đã thực hiện | Thiếu hàng</span>
                              ) : (
                                <span className="badge bg-light text-muted border border-secondary border-opacity-25 ms-3 rounded-pill" style={{ fontSize: 11, fontWeight: 500 }}><i className="bi bi-circle me-1" /> Chưa thực hiện</span>
                              );
                            })()}
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
                          <div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleCompleteClick(dateStr); }} 
                              className="btn btn-sm btn-primary py-1 px-3 shadow-sm"
                              style={{ fontWeight: 500, fontSize: 12 }}
                              disabled={Object.keys(pickedQuantities).filter(id => groupedItems[dateStr].find(item => item.id === id)).length === 0}
                            >
                              <i className="bi bi-send me-1"></i> Báo cáo
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })()}
                {!collapsedDates.has(dateStr) && groupedItems[dateStr].map(item => {
                  const currentInputQty = pickedQuantities[item.id] !== undefined ? pickedQuantities[item.id] : (item.tongDaNhat || 0);
                  const isPicked = currentInputQty > 0;
                  const isFullyPicked = currentInputQty === item.tongSoLuong;
                  const isEdited = pickedQuantities[item.id] !== undefined;
                  
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
                      className={`form-control form-control-sm text-center fw-bold ${isFullyPicked ? "text-success border-success" : isPicked ? "text-warning border-warning" : "text-muted"} ${isEdited ? "bg-warning bg-opacity-10" : ""}`}
                      value={currentInputQty > 0 || isEdited ? currentInputQty : ""}
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

      <ConfirmDialog 
        open={!!completingDate}
        title="Xác nhận báo cáo"
        message={completingDate ? `Bạn có chắc chắn đã hoàn tất gom ${groupedItems[completingDate]?.filter(item => pickedQuantities[item.id] !== undefined).length || 0} mặt hàng của Hạn hoàn thành: ${getRelativeDateText(completingDate)}?` : ""}
        confirmLabel="OK"
        cancelLabel="Huỷ"
        loading={isSubmitting}
        onConfirm={() => {
          if (completingDate) executeComplete(completingDate);
        }}
        onCancel={() => setCompletingDate(null)}
      />
    </>
  );
}
