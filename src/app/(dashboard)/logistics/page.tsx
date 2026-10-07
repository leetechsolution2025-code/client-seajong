
"use client";

import React, { useEffect, useState, useRef } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LogisticsInventory } from "@/components/logistics/inventory/LogisticsInventory";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Table, TableColumn } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { XuatKhoModal } from "@/components/plan-finance/kho_hang/XuatKhoModal";
import { NhapKhoModal } from "@/components/plan-finance/kho_hang/NhapKhoModal";
import { useToast } from "@/components/ui/Toast";
import { DynamicTicker } from "@/components/layout/DynamicTicker";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TreeFilterSelect } from "@/components/ui/TreeFilterSelect";
import { PrintPreviewModal, printDocumentById } from "@/components/ui/PrintPreviewModal";
import { PrintLabelModal } from "@/components/ui/PrintLabelModal";
import { ModernStepper } from "@/components/ui/ModernStepper";
import { WorkflowCard } from "@/components/ui/WorkflowCard";
import { useSession } from "next-auth/react";

export default function LogisticsOverviewPage() {
  const [rawOrders, setRawOrders] = useState<any[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [readOrderIds, setReadOrderIds] = useState<Set<string>>(new Set());
  
  const { data: session } = useSession();
  const userRole = (session?.user?.role || "").toUpperCase();
  const position = (session?.user?.positionName || "").toLowerCase();
  const isThuKho = ["SUPERADMIN", "ADMIN"].includes(userRole) || position.includes("thủ kho") || position.includes("quản lý kho");
  
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [orderDetails, setOrderDetails] = useState<any[]>([]);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [showXuatKhoModal, setShowXuatKhoModal] = useState(false);
  const [xuatKhoOrderType, setXuatKhoOrderType] = useState<"so" | "wo" | "defect" | "manual">("manual");
  const [xuatKhoSoId, setXuatKhoSoId] = useState<string | undefined>(undefined);
  const [xuatKhoWoId, setXuatKhoWoId] = useState<string | undefined>(undefined);
  const [xuatKhoDefectId, setXuatKhoDefectId] = useState<string | undefined>(undefined);
  const [xuatKhoTicketId, setXuatKhoTicketId] = useState<string | undefined>(undefined);
  const [showNhapKhoModal, setShowNhapKhoModal] = useState(false);
  const [nhapKhoTaskId, setNhapKhoTaskId] = useState<string | undefined>();
  const [nhapKhoMode, setNhapKhoMode] = useState<"manual" | "po" | "production" | "return" | undefined>();
  const [nhapKhoSoBienBanQC, setNhapKhoSoBienBanQC] = useState<string>("");
  const [nhapKhoPurchaseOrderId, setNhapKhoPurchaseOrderId] = useState<string | null>(null);
  const [nhapKhoPurchaseOrderCode, setNhapKhoPurchaseOrderCode] = useState<string | null>(null);
  const [nhapKhoShippingFee, setNhapKhoShippingFee] = useState<number>(0);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPrintLabelModal, setShowPrintLabelModal] = useState(false);
  const [selectedItemIndexesForPrint, setSelectedItemIndexesForPrint] = useState<number[]>([]);
  const [printQuantities, setPrintQuantities] = useState<Record<number, any>>({});
  const [hidePrice, setHidePrice] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  useEffect(() => {
    fetch("/api/company")
      .then(r => r.json())
      .then(setCompanyInfo)
      .catch(() => {});
  }, []);

  // Auto-round print quantities to multiples of 3 after 800ms of typing inactivity
  useEffect(() => {
    if (!showPrintLabelModal) return;
    const t = setTimeout(() => {
      setPrintQuantities(prev => {
        let changed = false;
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          const key = Number(k);
          if (typeof next[key] === "number") {
            const val = next[key];
            if (val <= 0) {
              next[key] = 3;
              changed = true;
            } else if (val % 3 !== 0) {
              next[key] = Math.ceil(val / 3) * 3;
              changed = true;
            }
          }
        });
        return changed ? next : prev;
      });
    }, 800);
    return () => clearTimeout(t);
  }, [printQuantities, showPrintLabelModal]);
  
  // Mobile tab state
  const [deletedOrders, setDeletedOrders] = useState<Set<string>>(new Set());
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<"ALL" | "IMPORT" | "EXPORT">("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    setCurrentPage(1);
  }, [currentStep, typeFilter, statusFilter, searchQuery]);
  const STEPS = [
    { num: 1, id: "orders", title: "Danh sách công việc", desc: "Quản lý các lệnh xuất/nhập kho", icon: "bi-card-list" },
    { num: 2, id: "inventory", title: "Danh sách hàng hoá", desc: "Quản lý số lượng tồn kho", icon: "bi-box-seam" },
    { num: 3, id: "deleted", title: "Dữ liệu đã xoá", desc: "Các lệnh đã xoá", icon: "bi-trash" },
  ];
  
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [selectedBatchOrders, setSelectedBatchOrders] = useState<Set<string>>(new Set());
  
  const toast = useToast();
  const prevOrderIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    const fetchOrders = async (isPolling = false) => {
      try {
        const res = await fetch("/api/logistics/overview-orders");
        if (res.ok) {
          const data = await res.json();
          const mapped = data.map((d: any, index: number) => {
            const rawId = d.code || d.id;
            const parts = rawId.split('-');
            const suffix = parts[parts.length - 1] || `${index}`;
            let exportCode = `LXK-202607-${suffix}`;
            if (d.type === "material-export") exportCode = `LXK-VATTU-${suffix}`;
            if (d.type === "material-import") {
              const text = `${d.title || ""} ${d.code || ""} ${d.typeLabel || ""}`.toLowerCase();
              const isPurchaseOrder = !!d.purchaseOrderId || !!d.purchaseOrderCode || !!d.isPurchaseOrder;
              const isDefect = text.includes("hàng lỗi") || text.includes("kho-loi") || text.includes("lỗi");
              const isIQC = isPurchaseOrder || text.includes("iqc") || text.includes("vật tư");
              const prefix = isDefect ? "LNK-LOI" : (isIQC ? "LNK-IQC" : "LNK-OQC");
              exportCode = `${prefix}-${suffix}`;
            }
            if (d.type === "logistics-ticket") exportCode = d.code;
            
            return { ...d, exportCode };
          });
          
          // Update raw orders directly, grouping and collapse logic is handled in render
          if (!mounted) return;

          if (isPolling) {
            const newIds = new Set<string>(mapped.map((m: any) => m.id as string));
            if (prevOrderIds.current.size > 0) { // Only notify if it's not the initial load masquerading as polling
              const addedOrders = mapped.filter((m: any) => !prevOrderIds.current.has(m.id));
              if (addedOrders.length > 0) {
                toast.info(
                  "Lệnh xuất kho mới", 
                  `Kế toán vừa phê duyệt thêm ${addedOrders.length} lệnh xuất kho.`
                );
              }
            }
            prevOrderIds.current = newIds;
            // Dùng JSON.stringify so sánh để tránh render lại nếu data không đổi (tuỳ chọn)
            setRawOrders(mapped);
          } else {
            prevOrderIds.current = new Set<string>(mapped.map((m: any) => m.id as string));
            // Đánh dấu tất cả là đã đọc ở lần tải đầu tiên để ẩn chữ "Mới"
            setReadOrderIds(new Set<string>(mapped.map((m: any) => m.id as string)));
            setRawOrders(mapped);
            setLoading(false);
          }
        }
      } catch (error) {
        // Suppress network errors during polling (e.g. dev server restarted, offline)
        if (!isPolling) {
          console.error("Fetch export orders error:", error);
          if (mounted) setLoading(false);
        }
      }
    };

    const fetchStaff = async () => {
      try {
        const res = await fetch("/api/logistics/staff");
        if (res.ok) {
          const data = await res.json();
          setStaffList(data);
        }
      } catch (error) {
        console.error("Fetch staff error:", error);
      }
    };

    fetchOrders(false);
    fetchStaff();

    const interval = setInterval(() => {
      // Chỉ poll dữ liệu nếu tab đang hiển thị
      if (document.visibilityState === "visible") {
        fetchOrders(true);
      }
    }, 5000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchOrders(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mounted = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRowClick = async (row: any) => {
    setReadOrderIds(prev => new Set(prev).add(row.id));
    setSelectedOrder(row);
    setFetchingDetails(true);
    setOrderDetails([]);
    
    try {
      let items: any[] = [];
      if (row.type === "contract") {
        const res = await fetch(`/api/plan-finance/contracts/${row.id}`);
        if (res.ok) {
          const detail = await res.json();
          items = (detail.quotation?.items ?? []).map((it: any) => ({ name: it.tenHang, qty: it.soLuong, unit: it.donVi }));
        }
      } else if (row.type === "retail-invoice") {
        const res = await fetch(`/api/plan-finance/retail-invoices/${row.id}`);
        if (res.ok) {
          const detail = await res.json();
          items = (detail.items ?? []).map((it: any) => ({ name: it.tenHang, qty: it.soLuong, unit: it.dvt }));
        }
      } else if (row.type === "sale-order") {
        const res = await fetch(`/api/plan-finance/sales/${row.id}`);
        if (res.ok) {
          const detail = await res.json();
          if (detail.logisticsItems) {
            items = detail.logisticsItems.map((it: any) => ({ name: it.tenHang, qty: it.soLuong, unit: it.donVi, type: it.type, isShortage: it.isShortage, code: it.code || it.inventoryItem?.code, color: it.color || it.inventoryItem?.color, giaBan: it.giaBan || it.inventoryItem?.giaBan, imageUrl: it.imageUrl || it.inventoryItem?.imageUrl }));
          } else {
            items = (detail.saleOrderItems ?? []).map((it: any) => ({ name: it.tenHang, qty: it.soLuong, unit: it.inventoryItem?.donVi, code: it.inventoryItem?.code, color: it.inventoryItem?.color, giaBan: it.inventoryItem?.giaBan, imageUrl: it.inventoryItem?.imageUrl }));
          }
        }
      } else if (row.type === "material-export" || row.type === "material-import" || row.type === "logistics-ticket") {
        // Dữ liệu items đã có sẵn từ API overview-orders
        items = (row.items ?? []).map((it: any) => {
          const isLacking = row.type === "logistics-ticket" ? (it.pickedQty || 0) < (it.requestedQty || 0) : it.isShortage;
          return { 
            name: it.tenHang || it.inventoryItem?.tenHang, 
            qty: it.soLuong || it.requestedQty, 
            pickedQty: it.pickedQty,
            unit: it.donVi || it.inventoryItem?.donVi, 
            type: it.type, 
            isShortage: isLacking,
            bomCode: it.bomCode,
            dinhMucTen: it.dinhMucTen,
            code: it.code || it.inventoryItem?.code,
            color: it.color || it.inventoryItem?.color,
            giaBan: it.giaBan || it.inventoryItem?.giaBan,
            imageUrl: it.imageUrl || it.inventoryItem?.imageUrl,
            inventoryItemId: it.inventoryItemId || it.inventoryItem?.id || null,
            purchaseOrderId: it.purchaseOrderId || row.purchaseOrderId || null,
            purchaseOrderCode: it.purchaseOrderCode || row.purchaseOrderCode || null,
            shippingFee: it.shippingFee !== undefined ? it.shippingFee : (row.shippingFee ?? 0)
          };
        });
        
        // Nếu là logistics-ticket nhưng không có items (do thiếu mã vật tư khi tạo) thì fallback lấy từ đơn hàng
        if (items.length === 0 && row.type === "logistics-ticket" && row.saleOrderId) {
          const res = await fetch(`/api/plan-finance/sales/${row.saleOrderId}`);
          if (res.ok) {
            const detail = await res.json();
            if (detail.logisticsItems) {
              const filterType = row.ticketType === "MATERIAL_PICKING" ? "Kho Vật Tư Phụ Kiện (KVP)" : "Kho Hàng Hoá (KHO-CHINH)";
              items = detail.logisticsItems
                .filter((it: any) => it.type === filterType)
                .map((it: any) => ({ name: it.tenHang, qty: it.soLuong, unit: it.donVi, type: it.type, isShortage: it.isShortage, code: it.code || it.inventoryItem?.code, color: it.color || it.inventoryItem?.color, giaBan: it.giaBan || it.inventoryItem?.giaBan, imageUrl: it.imageUrl || it.inventoryItem?.imageUrl, inventoryItemId: it.inventoryItemId || it.inventoryItem?.id || null }));
            }
          }
        }
      }
      setOrderDetails(items);
    } catch (error) {
      console.error(error);
    } finally {
      setFetchingDetails(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!selectedOrder) return;
    setIsDeleting(true);
    try {
      if (selectedOrder.type === "logistics-ticket") {
        await fetch(`/api/logistics/tickets/${selectedOrder.id}`, { method: "DELETE" });
      } else {
        await fetch(`/api/board/tasks/${selectedOrder.id}`, { method: "DELETE" });
      }
      toast.success("Thành công", "Đã xóa lệnh thành công");
      setConfirmDeleteId(null);
      setSelectedOrder(null);
      fetch("/api/logistics/overview-orders").then(r => r.json()).then(setRawOrders);
    } catch (e) {
      toast.error("Lỗi", "Xóa thất bại");
    } finally {
      setIsDeleting(false);
    }
  };

  const sortedGroups = React.useMemo(() => {
    interface GroupedOrder {
      orderCode: string;
      items: any[];
      completedCount: number;
      totalTickets: number;
      groupStatusText: string;
      groupStatusColor: string;
      priority: number;
      latestDate: number;
      customerName: string | null;
      customerAddress: string | null;
      supplierName: string | null;
      purchaseOrderCode: string | null;
      purchaseOrderId: string | null;
      isPurchaseOrderGroup: boolean;
      ghiChu: string | null;
      isGroupImport: boolean;
      needsProduction: boolean;
    }

    const grouped: Record<string, any[]> = rawOrders.reduce((acc: Record<string, any[]>, curr: any) => {
      const isImport = curr.type === 'material-import';
      if (typeFilter === "IMPORT" && !isImport) return acc;
      if (typeFilter === "EXPORT" && isImport) return acc;

      // Tách riêng các lệnh kiểm định QC thành nhóm độc lập theo số hiệu biên bản QC:
      const isQc = (curr.code && curr.code.startsWith("QC-")) || (curr.title && curr.title.includes("QC-"));
      const code = isQc 
        ? curr.code 
        : (curr.saleOrderCode || curr.code || "Khác");
      if (!acc[code]) acc[code] = [];
      acc[code].push(curr);
      return acc;
    }, {});
    
    const groupArray: GroupedOrder[] = Object.keys(grouped)
      .filter((code) => code !== "Khác")
      .map((orderCode): GroupedOrder => {
        const items = grouped[orderCode];
        let completedCount = 0;
        let totalTickets = items.length;
        let latestDate = 0;
        let customerName: string | null = null;
        let customerAddress: string | null = null;
        let supplierName: string | null = null;
        let purchaseOrderCode: string | null = null;
        let purchaseOrderId: string | null = null;
        let ghiChu: string | null = null;
        
        let hasMaterialCompleted = false;
        let hasPackingCompleted = false;
        let hasPackingPacked = false;
        let allExported = totalTickets > 0;

        items.forEach((it: any) => {
          if (!customerName && it.customer && !it.customer.includes("Từ hồ sơ") && !it.customer.startsWith("ERR-")) customerName = it.customer;
          if (!customerAddress && it.customerAddress) customerAddress = it.customerAddress;
          if (!ghiChu && it.ghiChu) ghiChu = it.ghiChu;
          if (!supplierName && (it.supplierName || (it.isPurchaseOrder ? it.customer : null))) {
            supplierName = it.supplierName || it.customer;
          }
          if (!purchaseOrderCode && it.purchaseOrderCode) purchaseOrderCode = it.purchaseOrderCode;
          if (!purchaseOrderId && it.purchaseOrderId) purchaseOrderId = it.purchaseOrderId;
          
          const tStatus = (it.trangThai || '').toLowerCase();
          const isExported = tStatus === 'completed' || tStatus === 'done' || tStatus === 'delivered';
          if (isExported) {
            completedCount++;
            if (it.ticketType === 'MATERIAL_ALLOCATION' || it.type === 'material-export') hasMaterialCompleted = true;
            if (it.ticketType === 'BATCH_PACKING') hasPackingCompleted = true;
          } else {
            allExported = false;
            if (tStatus === 'packed' && it.ticketType === 'BATCH_PACKING') {
              hasPackingPacked = true;
            }
          }
          const time = new Date(it.ngayGiao || it.createdAt).getTime();
          if (time > latestDate) latestDate = time;
        });
        
        const isGroupImport = items.length > 0 && items.every((it: any) => 
          it.type === 'material-import' || 
          it.ticketType === 'MATERIAL_IMPORT' || 
          orderCode.startsWith('QC-')
        );

        // Xác định nhóm nhập kho từ đơn mua hàng
        const isPurchaseOrderGroup = isGroupImport && (
          !!purchaseOrderCode || 
          !!purchaseOrderId || 
          orderCode.includes("-DH-") || 
          orderCode.startsWith("DH-") ||
          items.some((it: any) => 
            it.isPurchaseOrder || 
            !!it.purchaseOrderCode || 
            !!it.purchaseOrderId || 
            it.supplierName ||
            it.items?.some((p: any) => p.purchaseOrderId || p.purchaseOrderCode)
          )
        );

        if (isPurchaseOrderGroup) {
          if (!supplierName && customerName) {
            supplierName = customerName;
          }
          if (!purchaseOrderCode) {
            if (orderCode.includes("-DH-") || orderCode.startsWith("DH-")) {
              purchaseOrderCode = orderCode.match(/(DH-\d+(-\d+)?)/)?.[0] || orderCode;
            } else {
              for (const it of items) {
                if (it.items && Array.isArray(it.items)) {
                  for (const p of it.items) {
                    if (p.purchaseOrderCode) {
                      purchaseOrderCode = p.purchaseOrderCode;
                      break;
                    }
                  }
                }
                if (purchaseOrderCode) break;
              }
            }
          }
        }

        const isDefectGroup = orderCode.startsWith('ERR-') || orderCode.startsWith('WR-');

        // Phân biệt chính xác loại nhập kho cho hồ sơ lỗi: Thu hồi, Hàng lỗi, Hàng trả lại
        let defectImportType = "hàng lỗi";
        if (isDefectGroup && isGroupImport) {
          const firstItem = items[0];
          const tLabel = (firstItem?.typeLabel || "").toLowerCase();
          const itTitle = (firstItem?.title || firstItem?.code || "").toLowerCase();
          if (tLabel.includes("hàng trả lại") || itTitle.includes("hàng trả lại") || itTitle.includes("trả lại")) {
            defectImportType = "hàng trả lại";
          } else if (tLabel.includes("thu hồi") || itTitle.includes("thu hồi")) {
            defectImportType = "thu hồi";
          } else {
            defectImportType = "hàng lỗi";
          }
        }

        let groupStatusText = isGroupImport 
          ? (isDefectGroup ? `Chưa nhập kho ${defectImportType}` : "Chưa nhập kho") 
          : (isDefectGroup ? "Chưa cấp phát linh kiện" : "Chưa xuất kho");
        let groupStatusColor = "bg-secondary text-white";
        
        if (totalTickets > 0) {
          if (allExported) {
            groupStatusText = isGroupImport 
              ? (isDefectGroup ? `Đã nhập kho ${defectImportType}` : "Đã nhập kho") 
              : (isDefectGroup ? "Đã cấp phát linh kiện" : "Đã xuất kho");
            groupStatusColor = "bg-success text-white";
          } else if (isDefectGroup) {
            if (completedCount > 0) {
              groupStatusText = isGroupImport ? `Đang nhập kho ${defectImportType}` : "Đang cấp phát linh kiện";
              groupStatusColor = "bg-warning text-dark";
            }
          } else if (!isGroupImport) {
             if (hasMaterialCompleted && hasPackingPacked) {
               groupStatusText = "Đã xuất VT & Gom đủ hàng";
               groupStatusColor = "bg-warning text-dark";
             } else if (hasMaterialCompleted) {
               groupStatusText = "Đã xuất vật tư";
               groupStatusColor = "bg-warning text-dark";
             } else if (hasPackingPacked) {
               groupStatusText = "Đã gom đủ hàng";
               groupStatusColor = "bg-warning text-dark";
             } else if (completedCount > 0) {
               groupStatusText = "Đã xuất một phần";
               groupStatusColor = "bg-warning text-dark";
             }
          } else {
             if (completedCount > 0) {
               groupStatusText = "Đã nhập một phần";
               groupStatusColor = "bg-warning text-dark";
             }
          }
        }
        
        // Priority: 0 for totally unexecuted, 1 for in progress / partially completed, 2 for fully completed
        let priority = 1;
        if (groupStatusText.startsWith("Chưa")) {
          priority = 0;
        } else if (groupStatusText.startsWith("Đã") && !groupStatusText.includes("một phần") && !groupStatusText.includes("VT & Gom")) {
          priority = 2;
        }

        const isSaleOrderGroup = !isDefectGroup && !isGroupImport && !orderCode.startsWith('QC-');
        const needsProduction = isSaleOrderGroup && items.some((it: any) => 
          it.hasProduction === true ||
          it.ticketType === 'MATERIAL_PICKING' ||
          it.type === 'material-export' ||
          (it.code && it.code.startsWith('CP-')) ||
          (it.typeLabel && (it.typeLabel.toLowerCase().includes('sản xuất') || it.typeLabel.toLowerCase().includes('cấp phát vật tư'))) ||
          it.trangThai === 'in_production' ||
          it.saleOrderTrangThai === 'in_production' ||
          it.saleOrderTrangThaiKho === 'out_of_stock' ||
          (it.items && Array.isArray(it.items) && it.items.some((i: any) => i.bomCode)) ||
          (it.title && (it.title.toLowerCase().includes('sản xuất') || it.title.toLowerCase().includes('xuất kho kvp')))
        );
        
        return {
          orderCode,
          items,
          completedCount,
          totalTickets,
          groupStatusText,
          groupStatusColor,
          priority,
          latestDate,
          customerName,
          customerAddress,
          supplierName,
          purchaseOrderCode,
          purchaseOrderId,
          isPurchaseOrderGroup,
          ghiChu,
          isGroupImport,
          needsProduction,
        };
      })
      .filter((group) => {
        if (currentStep === 3) {
          if (!deletedOrders.has(group.orderCode)) return false;
        } else {
          if (deletedOrders.has(group.orderCode)) return false;
        }

        if (statusFilter !== "ALL") {
          const status = group.groupStatusText;
          if (statusFilter === "PENDING" && !status.includes("Chưa")) return false;
          if (statusFilter === "EXPORTED" && !status.includes("Đã xuất")) return false;
          if (statusFilter === "IMPORTED" && !status.includes("Đã nhập")) return false;
        }

        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          (group.customerName || "").toLowerCase().includes(q) ||
          (group.customerAddress || "").toLowerCase().includes(q) ||
          group.orderCode.toLowerCase().includes(q)
        );
      });
      
    // Sort groups
    groupArray.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.latestDate - a.latestDate;
    });

    return { groupArray, grouped };
  }, [rawOrders, typeFilter, deletedOrders, currentStep, statusFilter, searchQuery]);

  const totalPages = Math.ceil(sortedGroups.groupArray.length / pageSize);

  const orders = React.useMemo(() => {
    readOrderIds; // Access it to ensure re-render when read states change

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedGroups = sortedGroups.groupArray.slice(startIndex, endIndex);

    const finalOrders: any[] = [];
    paginatedGroups.forEach((group, index) => {
      const { orderCode, items, groupStatusText, groupStatusColor, customerName, customerAddress, supplierName, purchaseOrderCode, isPurchaseOrderGroup, ghiChu, isGroupImport, latestDate, needsProduction } = group;
      
      const isToggled = collapsedGroups.has(orderCode);
      const isCollapsed = index === 0 ? isToggled : !isToggled;
      
      finalOrders.push({
        id: `group-${orderCode}`,
        isFullWidth: true,
        isGroupHeader: true,
        fullWidthContent: (
          <div 
             className="d-flex flex-column justify-content-center w-100 pe-2 py-0" 
             style={{ cursor: 'pointer', userSelect: 'none', textTransform: 'none', fontWeight: 'normal' }}
             onClick={(e) => {
                e.stopPropagation();
                setCollapsedGroups(prev => {
                  const newSet = new Set(prev);
                  if (newSet.has(orderCode)) newSet.delete(orderCode);
                  else newSet.add(orderCode);
                  return newSet;
                });
             }}
          >
            <div className="d-flex align-items-center justify-content-between mb-1">
              <div className="d-flex align-items-center gap-2">
                <i className={`bi ${isCollapsed ? 'bi-caret-right-fill' : 'bi-caret-down-fill'} text-muted`}></i> 
                <span className="fw-bold" style={{ fontSize: 12 }}>
                  {orderCode.startsWith("QC-") ? "SỐ HIỆU BIÊN BẢN QC: " : (orderCode.startsWith("ERR-") ? "SỐ HIỆU HỒ SƠ LỖI: " : "SỐ HIỆU ĐƠN HÀNG: ")}
                  <span className="text-primary">{orderCode}</span>
                </span>
                <span className={`badge ${groupStatusColor} rounded-pill fw-normal`} style={{ fontSize: 10 }}>{groupStatusText}</span>
                {needsProduction && (
                  <span 
                    className="badge rounded-pill fw-medium" 
                    style={{ 
                      fontSize: 10,
                      backgroundColor: "rgba(245, 158, 11, 0.15)",
                      color: "#b45309",
                      border: "1px solid rgba(245, 158, 11, 0.35)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 8px"
                    }}
                  >
                    <i className="bi bi-gear-wide-connected" style={{ fontSize: 9.5 }}></i>
                    Cần sản xuất
                  </span>
                )}
                {latestDate > 0 && (
                  <span className="text-muted" style={{ fontSize: 11 }}>
                    <i className="bi bi-clock me-1"></i>
                    {new Date(latestDate).toLocaleDateString("vi-VN")}
                  </span>
                )}
              </div>
              <div className="dropdown ms-3" onClick={(e) => e.stopPropagation()}>
                <button className="btn btn-sm btn-light rounded-circle shadow-none p-1" style={{ width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} data-bs-toggle="dropdown">
                  <i className="bi bi-three-dots-vertical"></i>
                </button>
                <ul className="dropdown-menu dropdown-menu-end shadow border-0" style={{ fontSize: 13 }}>
                  <li>
                    <button className="dropdown-item py-2" onClick={() => toast.success("Đã gửi", "Báo cáo sự cố đã được ghi nhận!")}>
                      <i className="bi bi-exclamation-triangle me-2 text-warning"></i>Báo cáo sự cố
                    </button>
                  </li>
                  {currentStep !== 3 && (
                    <li>
                      <button className="dropdown-item py-2 text-danger" onClick={() => setOrderToDelete(orderCode)}>
                        <i className="bi bi-trash me-2"></i>Xoá
                      </button>
                    </li>
                  )}
                  {currentStep === 3 && (
                    <li>
                      <button className="dropdown-item py-2 text-success" onClick={() => {
                        setDeletedOrders(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(orderCode);
                          return newSet;
                        });
                        toast.success("Thành công", "Đã khôi phục lệnh");
                      }}>
                        <i className="bi bi-arrow-counterclockwise me-2"></i>Khôi phục
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            </div>
            
            {isPurchaseOrderGroup ? (
              <div className="ms-4 d-flex align-items-center flex-wrap gap-1 text-muted fw-bold" style={{ fontSize: 11 }}>
                {(supplierName || customerName) && (
                  <>
                    <i className="bi bi-person me-1"></i>
                    Nhà cung cấp: <span className="fw-bold text-dark">{supplierName || customerName}</span>
                    <span className="mx-1">|</span>
                  </>
                )}
                <i className="bi bi-file-earmark-text me-1"></i>
                Theo đơn mua hàng: <span className="fw-bold text-dark">{purchaseOrderCode || "Đang xử lý"}</span>
                {customerAddress && (
                  <>
                    <span className="mx-1">|</span>
                    <i className="bi bi-geo-alt me-1"></i>
                    <span>{customerAddress}</span>
                  </>
                )}
              </div>
            ) : (
              <>
                {isGroupImport && (orderCode.includes("-DH-") || orderCode.startsWith("QC-")) && (
                  <div className="ms-4 text-muted fw-bold" style={{ fontSize: 11 }}>
                    <i className="bi bi-file-earmark-text me-1"></i>
                    {orderCode.includes("-DH-") 
                      ? `Theo đơn mua hàng số: ${orderCode.match(/(DH-\d+(-\d+)?)/)?.[0] || orderCode}` 
                      : (() => {
                          const prodOrders = Array.from(new Set(items.map(it => it.productionOrder).filter(Boolean)));
                          if (prodOrders.length > 0) {
                            return `Theo lệnh sản xuất: ${prodOrders.join(", ")}`;
                          }
                          return `Theo lệnh sản xuất: ${orderCode.replace('QC-', 'LSX-')}`;
                        })()}
                  </div>
                )}
                
                {(() => {
                  const validCustomer = customerName && !customerName.includes("Từ hồ sơ") && !customerName.startsWith("ERR-");
                  if (!validCustomer && !customerAddress) return null;
                  return (
                    <div className="ms-4 d-flex align-items-center gap-1 text-muted fw-bold" style={{ fontSize: 11 }}>
                      {validCustomer && (
                        <>
                          <i className="bi bi-person me-1"></i>
                          Khách hàng: <span className="fw-bold text-dark">{customerName}</span>
                          {customerAddress && <span className="mx-1">|</span>}
                        </>
                      )}
                      {!validCustomer && customerAddress && (
                        <i className="bi bi-geo-alt me-1"></i>
                      )}
                      {customerAddress && (
                        <span>{customerAddress}</span>
                      )}
                    </div>
                  );
                })()}
              </>
            )}
            
            {ghiChu && (
              <div className="ms-4 mt-1 text-danger" style={{ fontSize: 11 }}>
                <i className="bi bi-exclamation-triangle-fill me-1"></i>
                {ghiChu}
              </div>
            )}
          </div>
        ),
        isAssigned: true
      });
      
      if (!isCollapsed) {
        finalOrders.push(...(items as any[]));
      }
    });

    if (sortedGroups.grouped["Khác"]) {
      finalOrders.push(...(sortedGroups.grouped["Khác"] as any[]));
    }
    return finalOrders;
  }, [sortedGroups, collapsedGroups, currentPage, readOrderIds]);

  return (
    <div className="d-flex flex-column h-100" style={{ background: "var(--background)", position: "relative" }}>
      <PageHeader
        title="Quản lý hệ thống kho"
        description="Quản lý dòng chảy hàng hóa & Cảnh báo an toàn kho thời gian thực."
        icon="bi-truck"
        color="blue"
      />
      <DynamicTicker pageTitle="Quản lý hệ thống kho" />

      <div className="flex-grow-1 pb-5 pb-xl-2 pt-2 px-xl-2 px-2 d-flex flex-column" style={{ background: "color-mix(in srgb, var(--muted) 40%, transparent)", minHeight: 0 }}>
        <WorkflowCard
          contentPadding="p-0"
          stepper={
            <ModernStepper
              steps={STEPS}
              currentStep={currentStep}
              onStepChange={setCurrentStep}
              paddingX={0}
              paddingY={8}
            />
          }
        >
          <div className="flex-grow-1 d-flex flex-column overflow-hidden h-100" style={{ minHeight: 0 }}>
            {(currentStep === 1 || currentStep === 3) && (
              <div className="flex-grow-1 d-flex flex-column h-100" style={{ minHeight: 0 }}>
                <div className="flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
                <Table
                  loading={loading}
                  rows={orders}
                  onRowClick={handleRowClick}
                  columns={[
                    {
                      header: (
                        <div className="form-check m-0 d-flex justify-content-center">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            checked={orders.length > 0 && selectedBatchOrders.size === orders.filter(o => !o.isAssigned && o.type !== 'material-import').length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBatchOrders(new Set(orders.filter(o => !o.isAssigned && o.type !== 'material-import').map(o => o.id)));
                              } else {
                                setSelectedBatchOrders(new Set());
                              }
                            }}
                          />
                        </div>
                      ),
                      render: (row: any) => (
                        <div className="form-check m-0 d-flex justify-content-center" onClick={e => e.stopPropagation()}>
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            disabled={row.isAssigned || row.type === 'material-import'}
                            checked={selectedBatchOrders.has(row.id) || Boolean(row.isAssigned)}
                            onChange={(e) => {
                              const newSet = new Set(selectedBatchOrders);
                              if (e.target.checked) {
                                newSet.add(row.id);
                              } else {
                                newSet.delete(row.id);
                              }
                              setSelectedBatchOrders(newSet);
                            }}
                          />
                        </div>
                      ),
                      width: "40px",
                      align: "center"
                    },
                    { 
                      header: "Mã lệnh", 
                      noWrap: true,
                      render: (row: any) => (
                        <div className="position-relative">
                          <div className="d-flex align-items-center flex-wrap gap-2">
                            <div className="fw-bold text-primary">{row.exportCode}</div>
                            {row.requestedDate && (
                              <div className="text-muted" style={{ fontSize: 11 }}>
                                <i className="bi bi-calendar-event me-1" />
                                {new Date(row.requestedDate).toLocaleDateString('vi-VN')}
                                {row.assigneeName && <span className="ms-1 fw-medium text-dark">| {row.assigneeName}</span>}
                              </div>
                            )}
                            {!readOrderIds.has(row.id) && <span className="badge bg-danger rounded-pill" style={{ fontSize: 9, padding: "2px 6px" }}>Mới</span>}
                          </div>
                          <div className="text-muted text-truncate" style={{ fontSize: 12, maxWidth: 240 }}>
                            {row.typeLabel} {row.code?.startsWith("QC-") ? row.code : (row.saleOrderCode || row.code)} {row.customer && !row.customer.includes("Từ hồ sơ") && !row.customer.startsWith("ERR-") ? `- ${row.customer}` : ""}
                          </div>
                        </div>
                      ),
                      width: "50%" 
                    },
                    { 
                      header: "Loại", 
                      noWrap: true,
                      render: (row: any) => {
                        const isImport = row.type === 'material-import';
                        const isMaterial = row.ticketType === 'WARRANTY_MATERIAL' || row.ticketType === 'MATERIAL_PICKING' || row.type === 'material-export';
                        
                        let badgeColor = "primary";
                        let label = "Xuất kho";
                        
                        if (isImport) {
                          badgeColor = "success";
                          label = row.typeLabel?.includes("hàng lỗi") ? "Nhập hàng lỗi" : "Nhập kho";
                        } else if (isMaterial) {
                          badgeColor = "warning";
                          label = "Cấp phát vật tư";
                        }
                        
                        return (
                          <span className={`badge bg-label-${badgeColor} text-${badgeColor}`} style={{ fontSize: 11 }}>
                            {label}
                          </span>
                        );
                      },
                      width: "20%" 
                    },
                    { 
                      header: "Trạng thái", 
                      noWrap: true,
                      render: (row: any) => {
                        let statusColor = "bg-secondary";
                        let statusText = row.trangThai;
                        const lowerStatus = (row.trangThai || "").toLowerCase();
                        
                        if (lowerStatus === "active" || lowerStatus === "processing" || lowerStatus === "partial" || lowerStatus === "picking" || lowerStatus === "packing") {
                          statusColor = "bg-warning";
                          statusText = "Đang xử lý";
                        } else if (lowerStatus === "confirmed" || lowerStatus === "approved") {
                          statusColor = "bg-info";
                          statusText = "Đã xác nhận";
                        } else if (lowerStatus === "pending" || lowerStatus === "unpaid") {
                          statusColor = "bg-danger";
                          statusText = "Chờ xử lý";
                        } else if (lowerStatus === "in_production") {
                          statusColor = "bg-secondary";
                          statusText = "Đang sản xuất";
                        } else if (lowerStatus === "completed" || lowerStatus === "done") {
                          statusColor = "bg-success";
                          if (row.type === 'material-import') {
                            statusText = row.typeLabel?.includes("hàng lỗi") ? "Đã nhập hàng lỗi" : "Đã nhập kho";
                          } else if (row.ticketType === 'WARRANTY_MATERIAL' || row.ticketType === 'MATERIAL_PICKING') {
                            statusText = "Đã cấp phát";
                          } else {
                            statusText = "Đã xuất kho";
                          }
                        } else if (lowerStatus === "packed") {
                          statusColor = "bg-success";
                          statusText = "Đã gom đủ hàng";
                        }

                        return <span className={`badge ${statusColor} rounded-pill`} style={{ fontSize: 10 }}>{statusText}</span>;
                      }, 
                      width: "25%" 
                    }
                  ]}
                  emptyText="Chưa có lệnh xuất/nhập kho nào"
                  emptyIcon="bi-inbox"
                  fixedLayout={false}
                  compact={true}
                  cellStyle={() => ({ padding: "3px 8px" })}
                  wrapperClassName="mkt-plan-table-no-min flex-grow-1 table-hover"
                  wrapperStyle={{ overflowX: "hidden", cursor: "pointer" }}
                />
              </div>
              <div className="p-3 border-top bg-light mt-auto" style={{ borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
                 <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                   <div className="d-flex align-items-center flex-wrap gap-2">
                     {/* Phân trang đặt trước bộ lọc trạng thái */}
                     <div className="flex-shrink-0 d-flex align-items-center">
                       <Pagination 
                         page={currentPage} 
                         totalPages={Math.max(1, totalPages)} 
                         onChange={setCurrentPage} 
                       />
                     </div>

                     {/* Bộ lọc trạng thái */}
                     <TreeFilterSelect
                       options={[
                         { label: "Chưa xử lý", value: "PENDING" },
                         { label: "Đã xuất kho", value: "EXPORTED" },
                         { label: "Đã nhập kho", value: "IMPORTED" }
                       ]}
                       value={statusFilter === "ALL" ? "" : statusFilter}
                       onChange={val => setStatusFilter(val || "ALL")}
                       className="shadow-sm rounded-pill"
                       width={120}
                       placeholder="Trạng thái"
                       dropdownPosition="top"
                     />

                     {/* Bộ lọc loại */}
                     <TreeFilterSelect
                       options={[
                         { label: "Nhập kho", value: "IMPORT" },
                         { label: "Xuất kho", value: "EXPORT" }
                       ]}
                       value={typeFilter === "ALL" ? "" : typeFilter}
                       onChange={val => setTypeFilter((val || "ALL") as any)}
                       className="shadow-sm rounded-pill"
                       width={110}
                       placeholder="Loại"
                       dropdownPosition="top"
                     />
                     
                     {/* Hộp tìm kiếm */}
                     <div className="input-group input-group-sm shadow-sm" style={{ width: 220, borderRadius: 20, overflow: 'hidden' }}>
                       <span className="input-group-text bg-white border-end-0 text-muted px-2" style={{ borderTopLeftRadius: 20, borderBottomLeftRadius: 20 }}>
                         <i className="bi bi-search"></i>
                       </span>
                       <input 
                         type="text" 
                         className="form-control border-start-0 ps-0" 
                         placeholder="Tìm khách hàng, đơn..." 
                         value={searchQuery}
                         onChange={e => setSearchQuery(e.target.value)}
                         style={{ borderTopRightRadius: 20, borderBottomRightRadius: 20, boxShadow: 'none' }}
                       />
                     </div>
                   </div>
                   
                   {/* Giao việc gom hàng */}
                   <div 
                     className="d-flex flex-column flex-md-row align-items-md-center gap-2"
                     style={{ 
                       opacity: selectedBatchOrders.size === 0 ? 0.6 : 1, 
                       pointerEvents: selectedBatchOrders.size === 0 ? "none" : "auto",
                       transition: "all 0.3s"
                     }}
                   >
                     <div className="d-flex align-items-center gap-2 flex-grow-1">
                        <span className="text-muted fw-semibold flex-shrink-0" style={{ fontSize: 13, whiteSpace: "nowrap" }}>Người thực hiện:</span>
                        <select 
                          className="form-select form-select-sm border-secondary shadow-sm" 
                          style={{ minWidth: 150, maxWidth: 220 }}
                          value={selectedStaff}
                          onChange={e => setSelectedStaff(e.target.value)}
                        >
                           <option value="">Chọn nhân viên</option>
                           {staffList.map(staff => (
                             <option key={staff.id} value={staff.id}>{staff.fullName}</option>
                           ))}
                        </select>
                     </div>
                     <button 
                       className="btn btn-sm btn-primary px-3 fw-semibold shadow-sm"
                       disabled={!selectedStaff || selectedBatchOrders.size === 0 || !isThuKho}
                       onClick={async () => {
                         try {
                           const res = await fetch("/api/logistics/batch-packing/assign", {
                             method: "POST",
                             headers: { "Content-Type": "application/json" },
                             body: JSON.stringify({ 
                               staffId: selectedStaff, 
                               orderIds: Array.from(selectedBatchOrders) 
                             })
                           });
                           if (res.ok) {
                             toast.success("Giao việc thành công", "Đã giao việc gom hàng cho nhân viên.");
                             setSelectedBatchOrders(new Set());
                             // Trigger refetch orders
                             const resOrders = await fetch("/api/logistics/overview-orders");
                             const data = await resOrders.json();
                             const mapped = data.map((d: any, index: number) => {
                               const rawId = d.code || d.id;
                               const parts = rawId.split('-');
                               const suffix = parts[parts.length - 1] || `${index}`;
                               let exportCode = `LXK-202607-${suffix}`;
                               if (d.type === "material-import") {
                                 const text = `${d.title || ""} ${d.code || ""} ${d.typeLabel || ""}`.toLowerCase();
                                 const isPurchaseOrder = !!d.purchaseOrderId || !!d.purchaseOrderCode || !!d.isPurchaseOrder;
                                 const isDefect = text.includes("hàng lỗi") || text.includes("kho-loi") || text.includes("lỗi");
                                 const isIQC = isPurchaseOrder || text.includes("iqc") || text.includes("vật tư");
                                 const prefix = isDefect ? "LNK-LOI" : (isIQC ? "LNK-IQC" : "LNK-OQC");
                                 exportCode = `${prefix}-${suffix}`;
                               }
                               if (d.type === "logistics-ticket") exportCode = d.code;
                               return { ...d, exportCode };
                             });
                             
                             // Update raw orders
                             setRawOrders(mapped);
                           } else {
                             toast.error("Lỗi", "Không thể giao việc.");
                           }
                         } catch (e) {}
                       }}
                     >
                        <span style={{ whiteSpace: "nowrap" }} className="d-flex align-items-center">
                          Giao việc 
                          <span className="badge bg-white text-primary ms-2 rounded-circle shadow-sm d-inline-flex align-items-center justify-content-center" style={{ width: 22, height: 22, padding: 0, fontSize: 12 }}>
                            {selectedBatchOrders.size}
                          </span>
                        </span>
                     </button>
                   </div>
                 </div>
              </div>
            </div>
            )}

            {currentStep === 2 && (
              <div className="flex-grow-1 d-flex flex-column overflow-hidden h-100" style={{ minHeight: 0 }}>
                <div 
                  className="flex-grow-1 d-flex flex-column overflow-hidden"
                  style={{ minHeight: 0 }}
                >
                  <LogisticsInventory compactMode={true} hideActions={true} />
                </div>
              </div>
            )}
          </div>
        </WorkflowCard>
      </div>

      {/* Offcanvas */}
      {selectedOrder && (
        <div className="offcanvas-backdrop fade show" onClick={() => setSelectedOrder(null)} style={{ zIndex: 1040 }}></div>
      )}
      <div 
        className={`offcanvas offcanvas-end ${selectedOrder ? 'show' : ''}`} 
        tabIndex={-1} 
        style={{ width: 400, zIndex: 1045 }}
      >
        <div className="offcanvas-header border-bottom px-4 py-3 bg-light">
          <div>
            <h5 className="offcanvas-title fw-bold mb-1" style={{ fontSize: 15 }}>
              {selectedOrder?.ticketType === 'WARRANTY_MATERIAL' || selectedOrder?.ticketType === 'MATERIAL_PICKING'
                ? `Cấp phát vật tư: ${selectedOrder?.exportCode}`
                : `Lệnh ${selectedOrder?.type === 'material-import' ? 'nhập' : 'xuất'} kho: ${selectedOrder?.exportCode}`}
            </h5>
            <div className="text-muted d-flex align-items-center flex-wrap gap-1" style={{ fontSize: 13 }}>
              {selectedOrder?.ticketType === 'WARRANTY_MATERIAL' ? (
                <>
                  <span className="badge bg-light text-dark border">
                    <i className="bi bi-tools me-1 text-warning"></i>
                    {selectedOrder?.saleOrderCode || "Hồ sơ lỗi"}
                  </span>
                  {selectedOrder?.customer && !selectedOrder.customer.includes("Từ hồ sơ") && (
                    <span>• {selectedOrder.customer}</span>
                  )}
                </>
              ) : selectedOrder?.ticketType === 'MATERIAL_PICKING' || selectedOrder?.type === 'material-export' ? (
                <>
                  <span className="badge bg-light text-dark border">
                    <i className="bi bi-gear me-1 text-primary"></i>
                    {selectedOrder?.saleOrderCode ? `Đơn: ${selectedOrder.saleOrderCode}` : selectedOrder?.typeLabel}
                  </span>
                  <span 
                    className="badge rounded-pill fw-medium" 
                    style={{ 
                      fontSize: 10,
                      backgroundColor: "rgba(245, 158, 11, 0.15)",
                      color: "#b45309",
                      border: "1px solid rgba(245, 158, 11, 0.35)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 8px"
                    }}
                  >
                    <i className="bi bi-gear-wide-connected" style={{ fontSize: 9.5 }}></i>
                    Cần sản xuất
                  </span>
                  {selectedOrder?.customer && <span>• {selectedOrder.customer}</span>}
                </>
              ) : (
                <>
                  {selectedOrder?.saleOrderCode ? (
                    <span className="badge bg-light text-dark border">
                      <i className="bi bi-receipt me-1 text-primary"></i>
                      Đơn: {selectedOrder.saleOrderCode}
                    </span>
                  ) : selectedOrder?.code?.startsWith("QC-") ? (
                    <span className="badge bg-light text-dark border">
                      <i className="bi bi-shield-check me-1 text-success"></i>
                      {selectedOrder.code}
                    </span>
                  ) : (
                    <span>{selectedOrder?.typeLabel}</span>
                  )}
                  {selectedOrder?.customer && !selectedOrder.customer.includes("Từ hồ sơ") && !selectedOrder.customer.startsWith("ERR-") && <span>• {selectedOrder.customer}</span>}
                </>
              )}
            </div>
          </div>
          <button type="button" className="btn-close" onClick={() => setSelectedOrder(null)}></button>
        </div>
        <div className="offcanvas-body p-0 custom-scrollbar bg-white">
          <div className="p-4">
            <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-box-seam text-primary"></i> 
              {selectedOrder?.ticketType === 'WARRANTY_MATERIAL' || selectedOrder?.ticketType === 'MATERIAL_PICKING' 
                ? "Danh sách vật tư / linh kiện" 
                : "Danh sách hàng hoá"}
            </h6>
            
            {fetchingDetails ? (
              <div className="text-center p-4 text-muted">
                <div className="spinner-border spinner-border-sm me-2"></div>
                Đang tải dữ liệu...
              </div>
            ) : orderDetails.length > 0 ? (
              <div>
                {selectedOrder?.type === "logistics-ticket" && (
                  <div className="mb-3 p-3 bg-light rounded-3 border">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-muted" style={{ fontSize: 13 }}>
                        {selectedOrder?.ticketType === 'WARRANTY_MATERIAL' || selectedOrder?.ticketType === 'MATERIAL_PICKING' 
                          ? "Tiến độ cấp phát:" 
                          : "Tiến độ gom hàng:"}
                      </span>
                      <span className="fw-bold text-primary">
                        {orderDetails.filter(it => (it.pickedQty || 0) >= (it.qty || 0)).length} / {orderDetails.length} 
                        <span className="fw-normal text-muted ms-1" style={{ fontSize: 12 }}>mặt hàng</span>
                      </span>
                    </div>
                    <div className="progress" style={{ height: 6 }}>
                      <div 
                        className={`progress-bar ${orderDetails.filter(it => (it.pickedQty || 0) >= (it.qty || 0)).length === orderDetails.length ? 'bg-success' : 'bg-primary'}`} 
                        style={{ width: `${orderDetails.length > 0 ? Math.round((orderDetails.filter(it => (it.pickedQty || 0) >= (it.qty || 0)).length / orderDetails.length) * 100) : 0}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                <Table
                  rows={orderDetails}
                  columns={[
                    { 
                      header: "Sản phẩm", 
                      render: (row: any) => (
                        <div className="d-flex flex-column">
                          <span className="fw-semibold text-dark d-block">
                            {row.name}
                            {row.isShortage && <i className="bi bi-exclamation-circle text-danger ms-2" title="Thiếu hàng trong kho" />}
                          </span>
                          {row.bomCode && (
                            <div className="d-flex align-items-center flex-wrap gap-1 mt-1 mb-1">
                              <span className="badge" style={{ backgroundColor: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", fontSize: 10 }}>
                                <i className="bi bi-diagram-3 me-1"></i> {row.bomCode}
                              </span>
                              {row.dinhMucTen && (
                                <span className="text-muted fst-italic" style={{ fontSize: 10.5 }}>
                                  {row.dinhMucTen}
                                </span>
                              )}
                            </div>
                          )}
                          {row.type && <span className="text-muted" style={{ fontSize: 11 }}><i className="bi bi-box-seam me-1"></i>{row.type}</span>}
                        </div>
                      ), 
                      width: "70%" 
                    },
                    { 
                      header: "SL", 
                      render: (row: any) => (
                        <div className="text-end fw-bold text-primary">
                          {row.pickedQty !== undefined ? (
                            <span className={row.pickedQty < row.qty ? "text-danger" : "text-success"}>
                              {row.pickedQty} / {row.qty}
                            </span>
                          ) : (
                            row.qty
                          )}
                          <span className="fw-normal text-muted ms-1" style={{ fontSize: 11 }}>{row.unit || "cái"}</span>
                        </div>
                      ), 
                      align: "right", 
                      width: "30%" 
                    }
                  ]}
                  fixedLayout={false}
                  fontSize={12}
                  wrapperClassName="border rounded-3"
                  wrapperStyle={{ overflowX: "hidden" }}
                />
              </div>
            ) : (
              <div className="text-center p-4 text-muted border border-dashed rounded-3">
                Không tìm thấy hàng hoá nào
              </div>
            )}
          </div>
        </div>
        <div className="offcanvas-footer p-3 border-top bg-light d-flex gap-2">
          <button 
            className="btn btn-outline-danger flex-shrink-0"
            onClick={() => setConfirmDeleteId(selectedOrder.id)}
            title="Xóa lệnh này"
          >
            <i className="bi bi-trash3"></i>
          </button>
          <button 
            className="btn btn-outline-secondary flex-shrink-0"
            onClick={() => {
              const qs: Record<number, number> = {};
              orderDetails.forEach((_, idx) => { qs[idx] = 3; });
              setPrintQuantities(qs);
              setSelectedItemIndexesForPrint(orderDetails.map((_, idx) => idx));
              setShowPrintLabelModal(true);
            }}
            title="In nhãn"
          >
            <i className="bi bi-printer me-1"></i> In nhãn
          </button>
          <button 
            className="btn btn-primary w-100" 
            disabled={
              (selectedOrder?.type === "logistics-ticket" && 
                selectedOrder.trangThai !== "PACKED" && 
                !(orderDetails.length > 0 && orderDetails.every((it: any) => (it.pickedQty || 0) >= (it.qty || 0)))
              ) ||
              (selectedOrder?.trangThai?.toLowerCase() === "completed" || selectedOrder?.trangThai?.toLowerCase() === "done") ||
              !isThuKho
            }
            onClick={() => {
              if (selectedOrder?.type === "material-import") {
                setNhapKhoTaskId(selectedOrder.id);
                const isReturn = selectedOrder.typeLabel?.includes("trả lại") || 
                                 selectedOrder.typeLabel?.includes("hàng lỗi") ||
                                 selectedOrder.code?.startsWith("ERR-");
                setNhapKhoMode(isReturn ? "return" : selectedOrder.typeLabel?.toLowerCase().includes("vật tư") ? "po" : "production");
                setNhapKhoSoBienBanQC(selectedOrder.code?.startsWith("QC-") ? selectedOrder.code : "");
                setNhapKhoPurchaseOrderId(selectedOrder.purchaseOrderId || null);
                setNhapKhoPurchaseOrderCode(selectedOrder.purchaseOrderCode || null);
                setNhapKhoShippingFee(selectedOrder.shippingFee || 0);
                setShowNhapKhoModal(true);
              } else {
                const isDefect = selectedOrder?.ticketType === "WARRANTY_MATERIAL" || 
                  !!selectedOrder?.defectRecordId ||
                  (typeof selectedOrder?.saleOrderCode === "string" && selectedOrder.saleOrderCode.startsWith("ERR-")) ||
                  (typeof selectedOrder?.code === "string" && selectedOrder.code.startsWith("ERR-"));

                if (isDefect) {
                  setXuatKhoOrderType("defect");
                  setXuatKhoDefectId(selectedOrder?.defectRecordId || selectedOrder?.saleOrderCode || selectedOrder?.code || selectedOrder?.id);
                  setXuatKhoTicketId(selectedOrder?.type === "logistics-ticket" ? selectedOrder.id : undefined);
                  setShowXuatKhoModal(true);
                } else {
                  let isSo = false;
                  let targetId = selectedOrder?.id;

                  if (selectedOrder?.type === "sale-order") {
                    isSo = true;
                  } else if (selectedOrder?.type === "logistics-ticket") {
                    isSo = selectedOrder.ticketType === "BATCH_PACKING"; 
                    if (isSo) {
                      targetId = selectedOrder.saleOrderId;
                    } else {
                      targetId = selectedOrder.saleOrderCode 
                        ? selectedOrder.saleOrderCode.replace('DBH', 'LSX').replace('DHBL', 'LSX').replace('DH', 'LSX')
                        : selectedOrder.saleOrderId;
                    }
                  }
                  
                  setXuatKhoOrderType(isSo ? "so" : "wo");
                  setXuatKhoSoId(selectedOrder?.saleOrderId || (selectedOrder?.type === "sale-order" ? selectedOrder.id : undefined));
                  setXuatKhoWoId(selectedOrder?.saleOrderCode 
                    ? selectedOrder.saleOrderCode.replace('DBH', 'LSX').replace('DHBL', 'LSX').replace('DH', 'LSX')
                    : (selectedOrder?.type === "sale-order" && selectedOrder.code ? selectedOrder.code.replace('DBH', 'LSX').replace('DHBL', 'LSX').replace('DH', 'LSX') : selectedOrder?.id));
                  setXuatKhoTicketId(selectedOrder?.type === "logistics-ticket" ? selectedOrder.id : undefined);
                  setShowXuatKhoModal(true);
                }
              }
              setSelectedOrder(null);
            }}
          >
            {(() => {
              const lowerStatus = selectedOrder?.trangThai?.toLowerCase();
              if (lowerStatus === "completed" || lowerStatus === "done") {
                return selectedOrder?.type === 'material-import' ? "Đã nhập kho" : "Đã xuất kho";
              }
              if (selectedOrder?.type === "logistics-ticket") {
                const isPacked = selectedOrder.trangThai === "PACKED" || 
                  (orderDetails.length > 0 && orderDetails.every((it: any) => (it.pickedQty || 0) >= (it.qty || 0)));
                return isPacked ? "Xuất kho" : "Chưa nhặt đủ hàng";
              }
              if (selectedOrder?.type === "material-import") {
                return "Nhập kho";
              }
              return "Xuất kho";
            })()}
          </button>
        </div>
      </div>

      {showXuatKhoModal && (
        <XuatKhoModal 
          initialMode={xuatKhoOrderType}
          initialSoId={xuatKhoSoId}
          initialWoId={xuatKhoWoId}
          initialDefectId={xuatKhoDefectId}
          initialTicketId={xuatKhoTicketId}
          onClose={() => setShowXuatKhoModal(false)}
          onSaved={() => {
            // refresh data without closing modal
            fetch("/api/logistics/overview-orders").then(r => r.json()).then(setRawOrders);
            if (selectedOrder) handleRowClick(selectedOrder);
          }}
        />
      )}

      {showNhapKhoModal && (
        <NhapKhoModal 
          initialItems={orderDetails}
          initialTaskId={nhapKhoTaskId}
          initialMode={nhapKhoMode}
          initialSoBienBanQC={nhapKhoSoBienBanQC}
          initialPurchaseOrderId={nhapKhoPurchaseOrderId}
          initialPurchaseOrderCode={nhapKhoPurchaseOrderCode}
          initialShippingFee={nhapKhoShippingFee}
          onClose={() => setShowNhapKhoModal(false)}
          onSaved={() => {
            // refresh data without closing modal
            fetch("/api/logistics/overview-orders").then(r => r.json()).then(setRawOrders);
            if (selectedOrder) handleRowClick(selectedOrder);
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirmDeleteId}
        variant="danger"
        title="Xác nhận xóa lệnh"
        message="Bạn có chắc chắn muốn xóa lệnh xuất/nhập kho này? Thao tác này không thể hoàn tác."
        confirmLabel="Xóa lệnh"
        cancelLabel="Hủy"
        loading={isDeleting}
        onConfirm={handleDeleteOrder}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <ConfirmDialog
        open={!!orderToDelete}
        variant="danger"
        title="Xoá lệnh / đơn hàng?"
        message={`Bạn có chắc chắn muốn xoá đơn hàng/lệnh "${orderToDelete}"? Thao tác này sẽ xoá lệnh khỏi hệ thống.`}
        confirmLabel="Xoá"
        loading={isDeleting}
        onConfirm={async () => {
          if (orderToDelete) {
            setIsDeleting(true);
            try {
              const itemsToDelete = rawOrders.filter((o: any) => (o.saleOrderCode || o.code) === orderToDelete);
              for (const it of itemsToDelete) {
                if (it.type === "logistics-ticket") {
                  await fetch(`/api/logistics/tickets/${it.id}`, { method: "DELETE" });
                } else if (it.type === "material-import" || it.type === "material-export") {
                  await fetch(`/api/board/tasks/${it.id}`, { method: "DELETE" });
                } else if (it.type === "contract") {
                  await fetch(`/api/plan-finance/contracts/${it.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ trangThai: "cancelled" })
                  });
                }
              }
              const res = await fetch("/api/logistics/overview-orders");
              if (res.ok) {
                const data = await res.json();
                setRawOrders(data);
              }
              toast.success("Thành công", "Đã xoá lệnh khỏi hệ thống");
            } catch (err) {
              console.error("Lỗi khi xoá lệnh:", err);
              toast.error("Lỗi", "Không thể xoá lệnh");
            } finally {
              setIsDeleting(false);
              setOrderToDelete(null);
            }
          }
        }}
        onCancel={() => setOrderToDelete(null)}
      />

      <PrintLabelModal 
        open={showPrintLabelModal}
        onClose={() => setShowPrintLabelModal(false)}
        items={orderDetails as any[]}
      />
    </div>
  );
}
