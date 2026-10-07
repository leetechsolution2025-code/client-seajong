"use client";

import { HoverImage } from "@/components/ui/HoverImage";
import { FullWidthTableLayout } from "@/components/layout/FullWidthTableLayout";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TableToolbar } from "@/components/ui/TableToolbar";
import { TablePagination } from "@/components/ui/TablePagination";
import { toast } from "react-toastify";
import React, { useState, useEffect, useMemo } from "react";

interface BatchItemOrder {
  id: string; // Ticket ID
  ticketCode?: string;
  ticketItemId: string;
  code: string;
  customerName?: string;
  soLuongTrongDon: number;
  daNhatTrongDon?: number;
  ngayGiao?: string;
  createdAt?: string;
  assignedTo?: string;
}

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
  thucTon: number;
  ngayGiao?: string;
  orders: BatchItemOrder[];
}

interface OrderGroupItem {
  ticketItemId: string;
  inventoryItemId: string | null;
  tenHang: string;
  code?: string | null;
  imageUrl: string | null;
  images?: string[];
  viTriKho: string | null;
  soLuongYeuCau: number;
  thucTon: number;
  daNhat: number;
}

interface OrderGroup {
  id: string; // Ticket ID
  code: string; // SaleOrder Code or Ticket Code
  ticketCode: string;
  customerName?: string;
  ngayGiao?: string;
  createdAt?: string;
  assignedTo?: string;
  items: OrderGroupItem[];
}

interface Employee {
  id: string;
  fullName: string;
}

export function LogisticsBatchPacking() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [, setTotalOrders] = useState(0);

  // Chế độ xem: 'by-material' (Gom theo hàng hoá) hoặc 'by-order' (Tách theo đơn hàng)
  const [viewMode, setViewMode] = useState<"by-material" | "by-order">("by-material");

  const [isManager, setIsManager] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [ticketIdsToAssign, setTicketIdsToAssign] = useState<string[] | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  const [pickedQuantities, setPickedQuantities] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Trạng thái thu gọn cho chế độ xem tổng hợp (theo ngày)
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());

  // Trạng thái thu gọn cho chế độ xem tách theo đơn hàng (theo order id)
  const [collapsedOrders, setCollapsedOrders] = useState<Set<string>>(new Set());

  // Trạng thái xác nhận hoàn thành
  const [completingDate, setCompletingDate] = useState<string | null>(null);
  const [completingOrder, setCompletingOrder] = useState<OrderGroup | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleDate = (dateStr: string) => {
    setCollapsedDates(prev => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
  };

  const toggleOrder = (orderId: string) => {
    setCollapsedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const toggleAllOrders = (collapse: boolean) => {
    if (collapse) {
      setCollapsedOrders(new Set(allOrderGroups.map(o => o.id)));
    } else {
      setCollapsedOrders(new Set());
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
      const res = await fetch(`/api/logistics/batch-packing?t=${Date.now()}`);
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
      const res = await fetch("/api/logistics/batch-packing", {
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
        toast.success("Phân công thành công!");
        setAssignModalOpen(false);
        setTicketIdsToAssign(null);
        fetchData();
      } else {
        toast.error(data.error || "Phân công thất bại");
      }
    } catch (e) {
      toast.error("Đã xảy ra lỗi");
    }
  };

  const handleUpdateDeadline = async (dateStr: string, newDate: string) => {
    if (!newDate) return;
    const ticketIds = Array.from(new Set((groupedItems[dateStr] || []).flatMap(item => item.orders.map((o: any) => o.id))));
    try {
      const res = await fetch("/api/logistics/tickets/update-deadline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketIds, newDate })
      });
      if (res.ok) {
        toast.success("Đã cập nhật Hạn hoàn thành thành công!");
        fetchData();
      } else {
        toast.error("Cập nhật thất bại.");
      }
    } catch (e) {
      toast.error("Đã xảy ra lỗi khi cập nhật.");
    }
  };

  // Helper: Lấy số lượng đã nhặt hiện tại của một BatchItem (tổng từ các đơn hoặc giá trị nhập trực tiếp)
  const getBatchItemCurrentQty = (batchItem: BatchItem) => {
    if (pickedQuantities[batchItem.id] !== undefined) {
      return pickedQuantities[batchItem.id];
    }
    let hasOrderEdit = false;
    let sum = 0;
    batchItem.orders.forEach(o => {
      if (pickedQuantities[o.ticketItemId] !== undefined) {
        hasOrderEdit = true;
        sum += pickedQuantities[o.ticketItemId];
      } else {
        sum += (o.daNhatTrongDon || 0);
      }
    });
    return hasOrderEdit ? sum : (batchItem.tongDaNhat || 0);
  };

  const isBatchItemEdited = (batchItem: BatchItem) => {
    if (pickedQuantities[batchItem.id] !== undefined) return true;
    return batchItem.orders.some(o => pickedQuantities[o.ticketItemId] !== undefined);
  };

  // --- Handlers cho chế độ Gom theo hàng hoá ---
  const handleTogglePick = (batchItem: BatchItem) => {
    const current = getBatchItemCurrentQty(batchItem);
    const maxAllowed = Math.min(batchItem.tongSoLuong, batchItem.thucTon !== undefined ? batchItem.thucTon : batchItem.tongSoLuong);
    const target = current >= maxAllowed ? 0 : maxAllowed;
    setPickedQuantities(prev => {
      const next = { ...prev };
      if (target === 0) {
        delete next[batchItem.id];
        batchItem.orders.forEach(o => delete next[o.ticketItemId]);
      } else {
        next[batchItem.id] = target;
        let remaining = target;
        batchItem.orders.forEach(o => {
          const alloc = Math.min(remaining, o.soLuongTrongDon);
          next[o.ticketItemId] = alloc;
          remaining -= alloc;
        });
      }
      return next;
    });
  };

  const handleQuantityChange = (batchItem: BatchItem, val: string) => {
    if (val === "") {
      setPickedQuantities(prev => {
        const next = { ...prev };
        delete next[batchItem.id];
        batchItem.orders.forEach(o => delete next[o.ticketItemId]);
        return next;
      });
      return;
    }
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      const maxAllowed = Math.min(batchItem.tongSoLuong, batchItem.thucTon !== undefined ? batchItem.thucTon : batchItem.tongSoLuong);
      const clamped = Math.max(0, Math.min(num, maxAllowed));
      setPickedQuantities(prev => {
        const next = { ...prev };
        next[batchItem.id] = clamped;
        let remaining = clamped;
        batchItem.orders.forEach(o => {
          const alloc = Math.min(remaining, o.soLuongTrongDon);
          next[o.ticketItemId] = alloc;
          remaining -= alloc;
        });
        return next;
      });
    }
  };

  // --- Handlers cho chế độ Tách theo đơn hàng ---
  const handleToggleOrderItemPick = (ticketItemId: string, maxQty: number) => {
    setPickedQuantities(prev => {
      const next = { ...prev };
      const current = next[ticketItemId] !== undefined ? next[ticketItemId] : 0;
      if (current >= maxQty) {
        delete next[ticketItemId];
      } else {
        next[ticketItemId] = maxQty;
      }
      items.forEach(b => {
        if (b.orders.some(o => o.ticketItemId === ticketItemId)) {
          delete next[b.id];
        }
      });
      return next;
    });
  };

  const handleOrderItemQuantityChange = (ticketItemId: string, val: string, maxQty: number) => {
    if (val === "") {
      setPickedQuantities(prev => {
        const next = { ...prev };
        delete next[ticketItemId];
        items.forEach(b => {
          if (b.orders.some(o => o.ticketItemId === ticketItemId)) {
            delete next[b.id];
          }
        });
        return next;
      });
      return;
    }
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      setPickedQuantities(prev => {
        const next = { ...prev };
        next[ticketItemId] = Math.max(0, Math.min(num, maxQty));
        items.forEach(b => {
          if (b.orders.some(o => o.ticketItemId === ticketItemId)) {
            delete next[b.id];
          }
        });
        return next;
      });
    }
  };

  // --- Handlers hoàn thành báo cáo ---
  const handleCompleteClick = (dateStr: string) => {
    const groupItems = groupedItems[dateStr] || [];
    const pickedItemsForDate = groupItems.filter(item => isBatchItemEdited(item));
    
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
      const pickedItemsForDate = groupItems.filter(item => isBatchItemEdited(item));
      
      const payloadPickedQuantities: Record<string, number> = {};
      pickedItemsForDate.forEach(batchItem => {
        let remainingQty = getBatchItemCurrentQty(batchItem);
        batchItem.orders.forEach((order: any) => {
          if (pickedQuantities[order.ticketItemId] !== undefined) {
            payloadPickedQuantities[order.ticketItemId] = pickedQuantities[order.ticketItemId];
            remainingQty -= pickedQuantities[order.ticketItemId];
          } else {
            if (remainingQty <= 0) return;
            const fulfillQty = Math.min(remainingQty, order.soLuongTrongDon);
            payloadPickedQuantities[order.ticketItemId] = fulfillQty;
            remainingQty -= fulfillQty;
          }
        });
      });

      const res = await fetch("/api/logistics/batch-packing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete_picking", date: dateStr, pickedQuantities: payloadPickedQuantities })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Báo cáo gom hàng thành công!");
        setPickedQuantities(prev => {
          const next = { ...prev };
          pickedItemsForDate.forEach(item => {
            delete next[item.id];
            item.orders.forEach(o => delete next[o.ticketItemId]);
          });
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

  const handleOrderCompleteClick = (order: OrderGroup) => {
    const hasAnyChange = order.items.some(it => pickedQuantities[it.ticketItemId] !== undefined);
    if (!hasAnyChange) {
      toast.warning("Vui lòng tick chọn hoặc nhập số lượng đã gom cho ít nhất 1 mặt hàng trong đơn.");
      return;
    }
    setCompletingOrder(order);
  };

  const executeOrderComplete = async (order: OrderGroup) => {
    setIsSubmitting(true);
    try {
      const payload: Record<string, number> = {};
      order.items.forEach(it => {
        if (pickedQuantities[it.ticketItemId] !== undefined) {
          payload[it.ticketItemId] = pickedQuantities[it.ticketItemId];
        }
      });

      const res = await fetch("/api/logistics/batch-packing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete_picking", pickedQuantities: payload })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Đã cập nhật đơn hàng ${order.code} thành công!`);
        setPickedQuantities(prev => {
          const next = { ...prev };
          order.items.forEach(it => delete next[it.ticketItemId]);
          items.forEach(b => {
            if (b.orders.some(o => o.id === order.id)) {
              delete next[b.id];
            }
          });
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
      setCompletingOrder(null);
    }
  };

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

  // --- Chuyển đổi dữ liệu sang Danh sách Đơn hàng (Order Groups) ---
  const allOrderGroups = useMemo(() => {
    const orderMap = new Map<string, OrderGroup>();

    items.forEach(batchItem => {
      (batchItem.orders || []).forEach(order => {
        const orderId = order.id;
        if (!orderMap.has(orderId)) {
          orderMap.set(orderId, {
            id: orderId,
            code: order.code,
            ticketCode: order.ticketCode || order.code,
            customerName: order.customerName,
            ngayGiao: order.ngayGiao,
            createdAt: order.createdAt,
            assignedTo: order.assignedTo,
            items: []
          });
        }
        const group = orderMap.get(orderId)!;
        group.items.push({
          ticketItemId: order.ticketItemId,
          inventoryItemId: batchItem.inventoryItemId,
          tenHang: batchItem.tenHang,
          code: batchItem.code,
          imageUrl: batchItem.imageUrl,
          images: batchItem.images,
          viTriKho: batchItem.viTriKho,
          soLuongYeuCau: order.soLuongTrongDon,
          thucTon: batchItem.thucTon || 0,
          daNhat: order.daNhatTrongDon || 0
        });
      });
    });

    return Array.from(orderMap.values()).sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [items]);

  // --- Lọc dữ liệu ---
  // 1. Lọc mặt hàng (cho chế độ Gom theo hàng hoá)
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchSearch = !search || 
        item.tenHang.toLowerCase().includes(search.toLowerCase()) || 
        (item.code && item.code.toLowerCase().includes(search.toLowerCase())) ||
        (item.inventoryItemId && item.inventoryItemId.toLowerCase().includes(search.toLowerCase())) ||
        item.orders.some(o => o.code.toLowerCase().includes(search.toLowerCase()) || (o.customerName && o.customerName.toLowerCase().includes(search.toLowerCase())));

      let matchDate = true;
      if (filterDate) {
        if (item.ngayGiao) {
          const itemDate = new Date(item.ngayGiao).toISOString().split('T')[0];
          matchDate = itemDate === filterDate;
        } else {
          matchDate = false;
        }
      }

      let matchStatus = true;
      if (filterStatus === "pending") {
        matchStatus = item.tongDaNhat < item.tongSoLuong;
      } else if (filterStatus === "done") {
        matchStatus = item.tongDaNhat >= item.tongSoLuong;
      }

      return matchSearch && matchDate && matchStatus;
    });
  }, [items, search, filterDate, filterStatus]);

  // 2. Lọc đơn hàng (cho chế độ Tách theo đơn hàng)
  const filteredOrderGroups = useMemo(() => {
    return allOrderGroups.filter(order => {
      const matchSearch = !search ||
        order.code.toLowerCase().includes(search.toLowerCase()) ||
        order.ticketCode.toLowerCase().includes(search.toLowerCase()) ||
        (order.customerName && order.customerName.toLowerCase().includes(search.toLowerCase())) ||
        order.items.some(it => it.tenHang.toLowerCase().includes(search.toLowerCase()) || (it.code && it.code.toLowerCase().includes(search.toLowerCase())));

      let matchDate = true;
      if (filterDate) {
        if (order.ngayGiao) {
          const orderDate = new Date(order.ngayGiao).toISOString().split('T')[0];
          matchDate = orderDate === filterDate;
        } else if (order.createdAt) {
          const createdDate = new Date(order.createdAt).toISOString().split('T')[0];
          matchDate = createdDate === filterDate;
        } else {
          matchDate = false;
        }
      }

      let matchStatus = true;
      const isOrderFullyPicked = order.items.length > 0 && order.items.every(it => it.daNhat >= it.soLuongYeuCau);
      if (filterStatus === "pending") {
        matchStatus = !isOrderFullyPicked;
      } else if (filterStatus === "done") {
        matchStatus = isOrderFullyPicked;
      }

      return matchSearch && matchDate && matchStatus;
    });
  }, [allOrderGroups, search, filterDate, filterStatus]);

  // --- Phân trang cho từng chế độ ---
  const totalCount = viewMode === "by-order" ? filteredOrderGroups.length : filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Đảm bảo activePage hợp lệ
  const activePage = Math.min(currentPage, totalPages);

  const paginatedOrderGroups = useMemo(() => {
    const start = (activePage - 1) * pageSize;
    return filteredOrderGroups.slice(start, start + pageSize);
  }, [filteredOrderGroups, activePage, pageSize]);

  const paginatedItems = useMemo(() => {
    const start = (activePage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, activePage, pageSize]);

  // Gom nhóm theo ngày cho danh sách hàng hoá đã phân trang
  const groupedItems = useMemo(() => {
    return paginatedItems.reduce((acc, item) => {
      const dateStr = item.ngayGiao ? new Date(item.ngayGiao).toLocaleDateString('vi-VN') : "Không hẹn ngày";
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(item);
      return acc;
    }, {} as Record<string, BatchItem[]>);
  }, [paginatedItems]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedItems).sort((a, b) => {
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
  }, [groupedItems]);

  const allOrdersCollapsed = useMemo(() => {
    if (paginatedOrderGroups.length === 0) return false;
    return paginatedOrderGroups.every(o => collapsedOrders.has(o.id));
  }, [paginatedOrderGroups, collapsedOrders]);

  // --- Toolbar Component ---
  const headerContent = (
    <TableToolbar
      searchValue={search}
      onSearchChange={(val) => { setSearch(val); setCurrentPage(1); }}
      searchPlaceholder="Tìm tên hàng hoá, mã hàng, số đơn..."
      searchWidth={280}
      filters={
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {/* Lọc ngày */}
          <div className="d-flex align-items-center gap-1 border rounded px-2" style={{ height: 32, background: "var(--background)" }}>
            <i className="bi bi-calendar-event text-muted" style={{ fontSize: 13 }} />
            <input 
              type="date"
              style={{ height: "100%", border: "none", background: "transparent", color: "var(--foreground)", fontSize: 13, outline: "none" }}
              value={filterDate}
              onChange={e => { setFilterDate(e.target.value); setCurrentPage(1); }}
            />
            {filterDate && (
              <i 
                className="bi bi-x-circle-fill text-muted cursor-pointer" 
                style={{ fontSize: 11 }}
                onClick={() => { setFilterDate(""); setCurrentPage(1); }}
              />
            )}
          </div>

          {/* Lọc trạng thái */}
          <select
            style={{ height: 32, padding: "0 10px", fontSize: 13, borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)", outline: "none", width: 150 }}
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chưa nhặt xong</option>
            <option value="done">Đã hoàn thành</option>
          </select>
        </div>
      }
      actions={
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {/* Nút ẩn/hiện tất cả khi ở chế độ Tách theo đơn hàng */}
          {viewMode === "by-order" && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary py-1 px-2 d-flex align-items-center gap-1"
              style={{ fontSize: 12, height: 32 }}
              onClick={() => toggleAllOrders(!allOrdersCollapsed)}
              title={allOrdersCollapsed ? "Hiện tất cả hàng hoá trong các đơn" : "Ẩn tất cả hàng hoá trong các đơn"}
            >
              <i className={`bi bi-${allOrdersCollapsed ? "arrows-expand" : "arrows-collapse"}`} />
              <span>{allOrdersCollapsed ? "Hiện tất cả" : "Ẩn tất cả"}</span>
            </button>
          )}

          {/* Nút chuyển đổi: Gom tổng hợp vs Tách theo đơn hàng */}
          <div className="btn-group btn-group-sm" role="group">
            <button
              type="button"
              className={`btn ${viewMode === "by-material" ? "btn-primary" : "btn-outline-secondary"} d-flex align-items-center gap-1`}
              style={{ height: 32, fontSize: 12.5 }}
              onClick={() => { setViewMode("by-material"); setCurrentPage(1); }}
              title="Gom tổng hợp các hàng hoá cùng loại"
            >
              <i className="bi bi-box-seam" />
              <span>Tổng hợp hàng hoá</span>
            </button>
            <button
              type="button"
              className={`btn ${viewMode === "by-order" ? "btn-primary" : "btn-outline-secondary"} d-flex align-items-center gap-1`}
              style={{ height: 32, fontSize: 12.5 }}
              onClick={() => { setViewMode("by-order"); setCurrentPage(1); }}
              title="Tách danh sách hàng hoá theo từng đơn hàng"
            >
              <i className="bi bi-receipt" />
              <span>Tách theo đơn hàng</span>
            </button>
          </div>
        </div>
      }
    />
  );

  // --- Table Content ---
  const tableContent = (
    <div className="h-100 overflow-auto custom-scrollbar">
      {loading ? (
        <div className="d-flex justify-content-center align-items-center h-100 py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : totalCount === 0 ? (
        <div className="text-center p-5 mt-4">
          <div className="mx-auto mb-4 d-flex align-items-center justify-content-center position-relative" style={{ width: 90, height: 90 }}>
            <div className="position-absolute w-100 h-100" style={{ background: "#10b981", opacity: 0.1, borderRadius: "50%" }}></div>
            <div className="position-absolute" style={{ width: 64, height: 64, background: "#10b981", opacity: 0.15, borderRadius: "50%" }}></div>
            <i className="bi bi-box-seam position-relative" style={{ fontSize: 38, color: "#10b981" }} />
          </div>
          <h5 className="fw-bold" style={{ color: "#1e293b" }}>Tuyệt vời!</h5>
          <p className="text-muted">Không có hàng hoá hay lệnh gom hàng nào cần xử lý với bộ lọc hiện tại.</p>
        </div>
      ) : (
        <table className="table table-hover align-middle mb-0 bg-white" style={{ fontSize: 13.5 }}>
          {/* Header duy nhất 1 dòng - ĐÃ BỎ TIÊU ĐỀ 'SỐ LƯỢNG' */}
          <thead style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--background)" }}>
            <tr className="border-bottom">
              <th style={{ width: 50 }} className="text-center border-0 text-secondary text-uppercase fw-semibold py-3 align-middle">
                <i className="bi bi-check-all fs-6" />
              </th>
              <th style={{ minWidth: 260 }} className="border-0 text-secondary text-uppercase fw-semibold py-3 align-middle">
                Mặt hàng
              </th>
              <th style={{ width: 130 }} className="border-0 text-secondary text-uppercase fw-semibold text-center py-3 align-middle">
                Yêu cầu | Thực tồn
              </th>
              <th style={{ width: 110 }} className="border-0 text-secondary text-uppercase fw-semibold text-center py-3 align-middle">
                Đã nhặt
              </th>
              <th className="border-0 text-secondary text-uppercase fw-semibold py-3 align-middle">
                {viewMode === "by-order" ? "Trạng thái" : "Chi tiết theo phiếu"}
              </th>
            </tr>
          </thead>
          <tbody>
            {/* CHẾ ĐỘ 1: TÁCH THEO ĐƠN HÀNG */}
            {viewMode === "by-order" ? (
              paginatedOrderGroups.map(order => {
                const isCollapsed = collapsedOrders.has(order.id);
                let fullyPickedCount = 0;
                let partiallyPickedCount = 0;

                order.items.forEach(it => {
                  const qty = pickedQuantities[it.ticketItemId] !== undefined ? pickedQuantities[it.ticketItemId] : it.daNhat;
                  if (qty > 0) {
                    partiallyPickedCount++;
                    if (qty >= it.soLuongYeuCau) fullyPickedCount++;
                  }
                });

                const isOrderDone = fullyPickedCount === order.items.length && order.items.length > 0;
                const isOrderPicking = partiallyPickedCount > 0 && !isOrderDone;
                const hasPendingInput = order.items.some(it => pickedQuantities[it.ticketItemId] !== undefined);

                return (
                  <React.Fragment key={order.id}>
                    {/* Header phân nhóm cho từng Đơn hàng */}
                    <tr 
                      style={{ background: "#f8fafc", cursor: "pointer", borderTop: "2px solid #e2e8f0" }}
                      onClick={() => toggleOrder(order.id)}
                    >
                      <td colSpan={5} className="py-2 px-3 fw-bold border-bottom">
                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                          <div className="d-flex align-items-center flex-wrap gap-2">
                            {/* Nút mũi tên ẩn/hiện hàng hoá trong đơn */}
                            <button
                              type="button"
                              className="btn btn-sm btn-light border p-0 d-flex align-items-center justify-content-center me-1"
                              style={{ width: 24, height: 24, borderRadius: 6 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleOrder(order.id);
                              }}
                              title={isCollapsed ? "Hiện hàng hoá trong đơn" : "Ẩn hàng hoá trong đơn"}
                            >
                              <i className={`bi bi-chevron-${isCollapsed ? 'right' : 'down'} text-secondary`} style={{ fontSize: 11 }} />
                            </button>

                            <span className="text-dark fw-bold">
                              ĐƠN: <span className="text-primary">{order.code}</span>
                            </span>

                            {order.ticketCode && order.ticketCode !== order.code && (
                              <span className="badge bg-light text-primary border" style={{ fontSize: 11, fontWeight: 500 }}>
                                {order.ticketCode}
                              </span>
                            )}

                            {order.customerName && (
                              <span className="text-secondary fw-normal ms-2" style={{ fontSize: 12.5 }}>
                                Khách hàng: <b className="text-dark">{order.customerName}</b>
                              </span>
                            )}

                            {order.ngayGiao && (
                              <span className="text-muted ms-2 border-start ps-2" style={{ fontSize: 12 }}>
                                <i className="bi bi-calendar-event me-1 text-primary" />
                                Hạn: <b>{getRelativeDateText(new Date(order.ngayGiao).toLocaleDateString('vi-VN'))}</b>
                              </span>
                            )}

                            <span className="badge bg-white text-dark border ms-2 rounded-pill" style={{ fontWeight: 500, fontSize: 11 }}>
                              {order.items.length} mặt hàng
                            </span>

                            {/* Badge trạng thái */}
                            {isOrderDone ? (
                              <span className="badge bg-light text-success border border-success border-opacity-25 rounded-pill" style={{ fontSize: 11, fontWeight: 500 }}>
                                <i className="bi bi-check-circle-fill me-1" /> Đã gom đủ
                              </span>
                            ) : isOrderPicking ? (
                              <span className="badge bg-light text-warning border border-warning border-opacity-25 rounded-pill" style={{ fontSize: 11, fontWeight: 500 }}>
                                <i className="bi bi-exclamation-triangle-fill me-1" /> Đang gom / Thiếu
                              </span>
                            ) : (
                              <span className="badge bg-light text-muted border border-secondary border-opacity-25 rounded-pill" style={{ fontSize: 11, fontWeight: 500 }}>
                                <i className="bi bi-circle me-1" /> Chưa thực hiện
                              </span>
                            )}

                            {/* Phân công */}
                            {order.assignedTo ? (
                              <span 
                                className="badge bg-primary bg-opacity-10 text-primary border border-primary ms-1"
                                style={{ fontWeight: 500, cursor: isManager ? "pointer" : "default" }}
                                onClick={(e) => {
                                  if (isManager) {
                                    e.stopPropagation();
                                    openAssignModal(order.id);
                                  }
                                }}
                                title={isManager ? "Nhấn để phân công lại" : ""}
                              >
                                <i className="bi bi-person-fill me-1"></i>
                                {order.assignedTo}
                              </span>
                            ) : (
                              isManager && (
                                <button 
                                  className="btn btn-sm btn-outline-primary py-0 px-2 rounded-pill"
                                  style={{ fontSize: 11 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openAssignModal(order.id);
                                  }}
                                >
                                  <i className="bi bi-person-plus me-1"></i>
                                  Phân công
                                </button>
                              )
                            )}
                          </div>

                          <div className="d-flex align-items-center gap-2">
                            {/* Nút ẩn/hiện nhanh hàng hoá */}
                            <span className="text-muted fw-normal" style={{ fontSize: 11.5 }}>
                              {isCollapsed ? "(Đang ẩn hàng hoá)" : "(Đang hiển thị hàng hoá)"}
                            </span>

                            <button 
                              onClick={(e) => { e.stopPropagation(); handleOrderCompleteClick(order); }} 
                              className="btn btn-sm btn-primary py-1 px-3 shadow-sm d-flex align-items-center gap-1"
                              style={{ fontWeight: 500, fontSize: 12 }}
                              disabled={!hasPendingInput}
                              title="Báo cáo hoàn tất gom hàng cho đơn này"
                            >
                              <i className="bi bi-send"></i> Báo cáo
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Danh sách hàng hoá của đơn (khi mở) */}
                    {!isCollapsed && order.items.map(it => {
                      const currentInputQty = pickedQuantities[it.ticketItemId] !== undefined ? pickedQuantities[it.ticketItemId] : it.daNhat;
                      const isPicked = currentInputQty > 0;
                      const isFullyPicked = currentInputQty >= it.soLuongYeuCau;
                      const isEdited = pickedQuantities[it.ticketItemId] !== undefined;

                      return (
                        <tr 
                          key={it.ticketItemId}
                          style={{ transition: "all 0.2s" }} 
                          className={isFullyPicked ? "bg-success bg-opacity-10" : isPicked ? "bg-warning bg-opacity-10" : "bg-white"}
                        >
                          {/* Nút tick nhanh */}
                          <td 
                            className="text-center py-2" 
                            style={{ borderBottomColor: "rgba(0,0,0,0.05)", cursor: "pointer" }} 
                            onClick={() => handleToggleOrderItemPick(it.ticketItemId, it.soLuongYeuCau)}
                          >
                            <div 
                              className={`d-inline-flex align-items-center justify-content-center rounded-circle border ${isFullyPicked ? "bg-success border-success text-white" : isPicked ? "bg-warning border-warning text-white" : "border-secondary text-transparent"}`}
                              style={{ width: 16, height: 16, transition: "all 0.2s" }}
                            >
                              <i className="bi bi-check" style={{ fontSize: 11 }} />
                            </div>
                          </td>

                          {/* Thông tin mặt hàng */}
                          <td className="py-2" style={{ borderBottomColor: "rgba(0,0,0,0.05)" }}>
                            <div className="d-flex align-items-center gap-3">
                              <div style={{ width: 36, height: 36, borderRadius: 8, background: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "1px solid rgba(0,0,0,0.05)" }}>
                                {(it.imageUrl || (it.images && it.images.length > 0)) ? (
                                  <HoverImage 
                                    src={it.imageUrl || (it.images && it.images[0]) || ""} 
                                    alt={it.tenHang} 
                                    images={it.images?.length ? it.images : (it.imageUrl ? [it.imageUrl] : [])}
                                    style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }} 
                                  />
                                ) : (
                                  <i className="bi bi-box-seam text-muted" />
                                )}
                              </div>
                              <div>
                                <div className={`fw-bold ${isFullyPicked ? "text-success" : isPicked ? "text-warning" : "text-dark"}`}>{it.tenHang}</div>
                                <div className="d-flex align-items-center gap-2 mt-1">
                                  {it.code && (
                                    <span className="badge bg-light text-secondary border" style={{ fontSize: 10 }}>
                                      {it.code}
                                    </span>
                                  )}
                                  {it.viTriKho ? (
                                    <span className="badge bg-light text-primary border border-primary border-opacity-25" style={{ fontSize: 10, fontWeight: 500 }}>
                                      <i className="bi bi-geo-alt me-1"></i>
                                      {it.viTriKho}
                                    </span>
                                  ) : (
                                    <span className="badge bg-light text-muted border border-secondary border-opacity-25" style={{ fontSize: 10, fontWeight: 500 }}>
                                      <i className="bi bi-geo-alt-fill me-1 text-black-50"></i>
                                      Không có vị trí
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Số lượng yêu cầu & Thực tồn */}
                          <td className="text-center py-2" style={{ borderBottomColor: "rgba(0,0,0,0.05)" }}>
                            <span className="fw-semibold text-dark fs-6">{it.soLuongYeuCau}</span>
                            <span className="text-muted mx-1" style={{ fontSize: 13 }}>|</span>
                            <span className="text-muted" style={{ fontSize: 13 }} title="Số lượng thực tồn kho">{it.thucTon}</span>
                          </td>

                          {/* Ô nhập số lượng Đã nhặt */}
                          <td className="text-center py-2" style={{ borderBottomColor: "rgba(0,0,0,0.05)", width: 110 }}>
                            <input 
                              type="number"
                              className={`form-control form-control-sm text-center fw-bold ${isFullyPicked ? "text-success border-success" : isPicked ? "text-warning border-warning" : "text-muted"} ${isEdited ? "bg-warning bg-opacity-10" : ""}`}
                              value={currentInputQty > 0 || isEdited ? currentInputQty : ""}
                              onChange={e => handleOrderItemQuantityChange(it.ticketItemId, e.target.value, it.soLuongYeuCau)}
                              style={{ width: 70, margin: "0 auto" }}
                              min={0}
                              max={it.soLuongYeuCau}
                            />
                          </td>

                          {/* Trạng thái mặt hàng */}
                          <td className="py-2" style={{ borderBottomColor: "rgba(0,0,0,0.05)" }}>
                            {isFullyPicked ? (
                              <span className="badge bg-light text-success border border-success border-opacity-25" style={{ fontSize: 11, fontWeight: 500 }}>
                                <i className="bi bi-check-circle-fill me-1" /> Đủ hàng ({currentInputQty}/{it.soLuongYeuCau})
                              </span>
                            ) : isPicked ? (
                              <span className="badge bg-light text-warning border border-warning border-opacity-25" style={{ fontSize: 11, fontWeight: 500 }}>
                                <i className="bi bi-exclamation-triangle-fill me-1" /> Thiếu hàng ({currentInputQty}/{it.soLuongYeuCau})
                              </span>
                            ) : (
                              <span className="badge bg-light text-muted border border-secondary border-opacity-25" style={{ fontSize: 11, fontWeight: 500 }}>
                                <i className="bi bi-circle me-1" /> Chờ nhặt
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })
            ) : (
              /* CHẾ ĐỘ 2: TỔNG HỢP HÀNG HOÁ (GOM THEO HÀNG HOÁ) */
              sortedDates.map(dateStr => (
                <React.Fragment key={dateStr}>
                  {(() => {
                    const ticketIdsForDate = Array.from(new Set((groupedItems[dateStr] || []).flatMap(item => item.orders.map((o: any) => o.id))));
                    const dateAssignees = Array.from(new Set((groupedItems[dateStr] || []).flatMap(item => item.orders.map((o: any) => o.assignedTo).filter(Boolean))));
                    return (
                      <tr style={{ background: "var(--light)", cursor: "pointer" }} onClick={() => toggleDate(dateStr)}>
                        <td colSpan={5} className="py-2 px-3 fw-bold text-dark border-bottom" style={{ fontSize: 13, background: "#f1f5f9" }}>
                          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                            <div className="d-flex align-items-center flex-wrap gap-2">
                              <i className={`bi bi-chevron-${collapsedDates.has(dateStr) ? 'right' : 'down'} text-secondary me-2`} style={{ fontSize: 12 }} />
                              
                              {(() => {
                                const dates = (groupedItems[dateStr] || []).flatMap(i => i.orders.map(o => o.createdAt)).filter((d): d is string => !!d);
                                dates.sort();
                                const groupCreatedAtStr = dates.length > 0 ? new Date(dates[0]).toLocaleDateString('vi-VN') : "Không rõ";
                                return (
                                  <span className="me-2 text-secondary" style={{ fontSize: 12.5 }}>Ngày giao: <b>{groupCreatedAtStr}</b></span>
                                );
                              })()}

                              <i className="bi bi-calendar-event text-primary ms-2 border-start ps-3" />
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
                              <span className="badge bg-white text-dark border ms-2 rounded-pill" style={{ fontWeight: 500, fontSize: 11 }}>
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
                                  <span className="badge bg-light text-success border border-success border-opacity-25 ms-2 rounded-pill" style={{ fontSize: 11, fontWeight: 500 }}><i className="bi bi-check-circle-fill me-1" /> Đã thực hiện | Đủ hàng</span>
                                ) : isGroupPicked ? (
                                  <span className="badge bg-light text-warning border border-warning border-opacity-25 ms-2 rounded-pill" style={{ fontSize: 11, fontWeight: 500 }}><i className="bi bi-exclamation-triangle-fill me-1" /> Đã thực hiện | Thiếu hàng</span>
                                ) : (
                                  <span className="badge bg-light text-muted border border-secondary border-opacity-25 ms-2 rounded-pill" style={{ fontSize: 11, fontWeight: 500 }}><i className="bi bi-circle me-1" /> Chưa thực hiện</span>
                                );
                              })()}
                              {dateAssignees.length > 0 ? (
                                <span 
                                  className="badge bg-primary bg-opacity-10 text-primary border border-primary ms-2"
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
                                    className="btn btn-sm btn-outline-primary py-0 px-2 ms-2 rounded-pill"
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
                                disabled={!groupedItems[dateStr]?.some(item => isBatchItemEdited(item))}
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
                    const currentInputQty = getBatchItemCurrentQty(item);
                    const isPicked = currentInputQty > 0;
                    const isFullyPicked = currentInputQty >= item.tongSoLuong;
                    const isEdited = isBatchItemEdited(item);
                    
                    return (
                      <tr key={item.id} style={{ transition: "all 0.2s" }} className={isFullyPicked ? "bg-success bg-opacity-10" : isPicked ? "bg-warning bg-opacity-10" : "bg-white"}>
                        <td className="text-center py-2" style={{ borderBottomColor: "rgba(0,0,0,0.05)", cursor: "pointer" }} onClick={() => handleTogglePick(item)}>
                          <div 
                            className={`d-inline-flex align-items-center justify-content-center rounded-circle border ${isFullyPicked ? "bg-success border-success text-white" : isPicked ? "bg-warning border-warning text-white" : "border-secondary text-transparent"}`}
                            style={{ width: 16, height: 16, transition: "all 0.2s" }}
                          >
                            <i className="bi bi-check" style={{ fontSize: 11 }} />
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
                                  <span className="badge bg-light text-success border border-success border-opacity-25" style={{ fontSize: 10, fontWeight: 500 }}><i className="bi bi-check-circle-fill me-1" /> Đủ hàng ({currentInputQty}/{item.tongSoLuong})</span>
                                ) : isPicked ? (
                                  <span className="badge bg-light text-warning border border-warning border-opacity-25" style={{ fontSize: 10, fontWeight: 500 }}><i className="bi bi-exclamation-triangle-fill me-1" /> Thiếu hàng ({currentInputQty}/{item.tongSoLuong})</span>
                                ) : (
                                  <span className="badge bg-light text-muted border border-secondary border-opacity-25" style={{ fontSize: 10, fontWeight: 500 }}><i className="bi bi-circle me-1" /> Chờ nhặt</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center py-2" style={{ borderBottomColor: "rgba(0,0,0,0.05)" }}>
                          <span className="fw-semibold text-dark fs-6">{item.tongSoLuong}</span>
                          <span className="text-muted mx-1" style={{ fontSize: 13 }}>|</span>
                          <span className="text-muted" style={{ fontSize: 13 }} title="Số lượng thực tồn kho">{item.thucTon || 0}</span>
                        </td>
                        <td className="text-center py-2" style={{ borderBottomColor: "rgba(0,0,0,0.05)", width: 110 }}>
                          <input 
                            type="number"
                            className={`form-control form-control-sm text-center fw-bold ${isFullyPicked ? "text-success border-success" : isPicked ? "text-warning border-warning" : "text-muted"} ${isEdited ? "bg-warning bg-opacity-10" : ""}`}
                            value={currentInputQty > 0 || isEdited ? currentInputQty : ""}
                            onChange={e => handleQuantityChange(item, e.target.value)}
                            style={{ width: 70, margin: "0 auto" }}
                            min={0}
                            max={Math.min(item.tongSoLuong, item.thucTon || 0)}
                          />
                        </td>
                        <td className="py-2" style={{ borderBottomColor: "rgba(0,0,0,0.05)" }}>
                          <div className="d-flex flex-wrap gap-1">
                            {item.orders.map((o, idx) => {
                              const oQty = pickedQuantities[o.ticketItemId] !== undefined ? pickedQuantities[o.ticketItemId] : (o.daNhatTrongDon || 0);
                              const isODone = oQty >= o.soLuongTrongDon && o.soLuongTrongDon > 0;
                              const isOPicked = oQty > 0;
                              return (
                                <span 
                                  key={idx} 
                                  className={`badge border d-inline-flex align-items-center gap-1 ${isODone ? "bg-success bg-opacity-10 text-success border-success" : isOPicked ? "bg-warning bg-opacity-10 text-warning border-warning" : "bg-light text-dark"}`} 
                                  style={{ fontSize: 11, fontWeight: 500 }}
                                  title={`${o.code}: đã gom ${oQty}/${o.soLuongTrongDon}`}
                                >
                                  {o.code}: {oQty > 0 ? `${oQty}/${o.soLuongTrongDon}` : o.soLuongTrongDon}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))
            )}
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
        footer={
          <TablePagination
            currentCount={viewMode === "by-order" ? paginatedOrderGroups.length : paginatedItems.length}
            totalCount={totalCount}
            itemName={viewMode === "by-order" ? "đơn hàng" : "mặt hàng"}
            page={activePage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50, 100]}
            onPageSizeChange={(sz) => {
              setPageSize(sz);
              setCurrentPage(1);
            }}
          />
        }
        footerStyle={{ padding: "8px 16px", backgroundColor: "#fff" }}
      />
      
      {/* Modal Phân công */}
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

      {/* Dialog xác nhận hoàn thành theo Ngày (chế độ gom theo hàng hoá) */}
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

      {/* Dialog xác nhận hoàn thành theo Đơn (chế độ tách theo đơn hàng) */}
      <ConfirmDialog 
        open={!!completingOrder}
        title="Xác nhận báo cáo đơn"
        message={completingOrder ? `Bạn có chắc chắn muốn cập nhật trạng thái gom hàng cho đơn ${completingOrder.code} (${completingOrder.items.filter(it => pickedQuantities[it.ticketItemId] !== undefined).length} mặt hàng đã cập nhật)?` : ""}
        confirmLabel="Xác nhận"
        cancelLabel="Huỷ"
        loading={isSubmitting}
        onConfirm={() => {
          if (completingOrder) executeOrderComplete(completingOrder);
        }}
        onCancel={() => setCompletingOrder(null)}
      />
    </>
  );
}
