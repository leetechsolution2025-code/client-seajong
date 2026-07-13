"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { KPICard } from "@/components/ui/KPICard";
import { ModernStepper, ModernStepItem } from "@/components/ui/ModernStepper";
import { WorkflowCard } from "@/components/ui/WorkflowCard";
import { Table, TableColumn } from "@/components/ui/Table";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { useToast } from "@/components/ui/Toast";

interface KPIData {
  pendingOrders: number;
  pendingRequests: number;
  debtReceivable: number;
  debtPayable: number;
}

export default function FinancePage() {
  const [data, setData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  // States for Sales Orders (step 1)
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [orderPage, setOrderPage] = useState(1);
  const [ordersTotalPages, setOrdersTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showItemsOffcanvas, setShowItemsOffcanvas] = useState(false);
  const [orderDetails, setOrderDetails] = useState<any[]>([]);
  const [fetchingDetails, setFetchingDetails] = useState(false);

  const handleViewItems = async () => {
    if (!selectedOrder) return;
    setShowItemsOffcanvas(true);
    setFetchingDetails(true);
    setOrderDetails([]);
    try {
      const res = await fetch(`/api/plan-finance/sales/${selectedOrder.id}`);
      if (res.ok) {
        const detail = await res.json();
        setOrderDetails((detail.saleOrderItems ?? []).map((it: any) => ({ name: it.tenHang, qty: it.soLuong, unit: it.inventoryItem?.donVi })));
      } else {
        setOrderDetails([]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setFetchingDetails(false);
    }
  };

  // States for Purchase Requests (step 2)
  const [requests, setRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestSearch, setRequestSearch] = useState("");
  const [requestStatus, setRequestStatus] = useState("");
  const [requestPage, setRequestPage] = useState(1);
  const [requestsTotalPages, setRequestsTotalPages] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [requestDetail, setRequestDetail] = useState<any | null>(null);
  const [requestDetailLoading, setRequestDetailLoading] = useState(false);
  const [decisions, setDecisions] = useState<Record<string, { purchase: boolean; production: boolean }>>({});

  // States for My Requests (step 3)
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [myRequestsLoading, setMyRequestsLoading] = useState(false);
  const [myRequestSearch, setMyRequestSearch] = useState("");
  const [myRequestStatus, setMyRequestStatus] = useState("");
  const [myRequestPage, setMyRequestPage] = useState(1);
  const [myRequestsTotalPages, setMyRequestsTotalPages] = useState(1);
  const [selectedMyRequest, setSelectedMyRequest] = useState<any | null>(null);
  const [myRequestDetail, setMyRequestDetail] = useState<any | null>(null);
  const [myRequestDetailLoading, setMyRequestDetailLoading] = useState(false);

  const isLocked = selectedOrder ? (selectedOrder.trangThaiKho !== "out_of_stock") : true;
  const isPurchase = selectedOrder && !isLocked ? (decisions[selectedOrder.id]?.purchase ?? true) : false;
  const isProduction = selectedOrder && !isLocked ? (decisions[selectedOrder.id]?.production ?? false) : false;

  const handleToggleDecision = (field: "purchase" | "production") => {
    if (!selectedOrder || isLocked) return;
    setDecisions((prev) => {
      const current = prev[selectedOrder.id] || {
        purchase: selectedOrder.trangThaiKho === "out_of_stock",
        production: false,
      };
      const newValue = !current[field];
      if (field === "purchase") {
        return {
          ...prev,
          [selectedOrder.id]: {
            purchase: newValue,
            production: newValue ? false : current.production,
          },
        };
      } else {
        return {
          ...prev,
          [selectedOrder.id]: {
            production: newValue,
            purchase: newValue ? false : current.purchase,
          },
        };
      }
    });
  };
  const toast = useToast();

  const handleApprove = async () => {
    if (!selectedOrder) return;
    try {
      const res = await fetch(`/api/plan-finance/sales/${selectedOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          keToanDuyet: "approved",
          decision: isLocked ? null : (isPurchase ? "purchase" : (isProduction ? "production" : null))
        }),
      });
      if (!res.ok) throw new Error("Thao tác thất bại");
      const updated = await res.json();
      
      // Update local state
      setOrders((prev: any[]) => prev.map(o => o.id === selectedOrder.id ? { ...o, keToanDuyet: "approved" } : o));
      setSelectedOrder((prev: any | null) => prev ? { ...prev, keToanDuyet: "approved" } : null);
      
      // Refresh KPIs count
      fetch("/api/finance/kpis")
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setData(d); });

      toast.success("Thành công", "Đã duyệt đơn hàng thành công!");
    } catch (err) {
      toast.error("Lỗi", "Không thể duyệt đơn hàng.");
    }
  };

  const handleReject = async () => {
    if (!selectedOrder) return;
    try {
      const res = await fetch(`/api/plan-finance/sales/${selectedOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keToanDuyet: "rejected" }),
      });
      if (!res.ok) throw new Error("Thao tác thất bại");
      const updated = await res.json();
      
      // Update local state
      setOrders((prev: any[]) => prev.map(o => o.id === selectedOrder.id ? { ...o, keToanDuyet: "rejected" } : o));
      setSelectedOrder((prev: any | null) => prev ? { ...prev, keToanDuyet: "rejected" } : null);
      
      // Refresh KPIs count
      fetch("/api/finance/kpis")
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setData(d); });

      toast.success("Thành công", "Đã từ chối đơn hàng.");
    } catch (err) {
      toast.error("Lỗi", "Không thể từ chối đơn hàng.");
    }
  };

  const handleApproveRequest = async () => {
    if (!selectedRequest) return;
    try {
      const res = await fetch(`/api/approvals/${selectedRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      if (!res.ok) throw new Error("Thao tác thất bại");
      
      // Update local lists
      setRequests((prev: any[]) => prev.map((r: any) => r.id === selectedRequest.id ? { ...r, status: "approved" } : r));
      setSelectedRequest((prev: any) => prev ? { ...prev, status: "approved" } : null);
      if (requestDetail) {
        if (selectedRequest.entityType === "marketing_proposal" || selectedRequest.entityType === "marketing_monthly_plan") {
          setRequestDetail((prev: any) => prev ? { ...prev, status: "approved" } : null);
        } else {
          setRequestDetail((prev: any) => prev ? { ...prev, trangThai: "ordered" } : null);
        }
      }

      // Refresh KPIs count
      fetch("/api/finance/kpis")
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setData(d); });

      const successMsg = (selectedRequest.entityType === "marketing_proposal" || selectedRequest.entityType === "marketing_monthly_plan")
        ? (selectedRequest.entityType === "marketing_proposal" ? "Đã duyệt đề xuất chi phí Marketing thành công!" : "Đã duyệt kế hoạch Marketing tháng thành công!")
        : "Đã duyệt đơn mua hàng thành công!";
      toast.success("Thành công", successMsg);
    } catch (err) {
      const errMsg = (selectedRequest.entityType === "marketing_proposal" || selectedRequest.entityType === "marketing_monthly_plan")
        ? (selectedRequest.entityType === "marketing_proposal" ? "Không thể duyệt đề xuất chi phí Marketing." : "Không thể duyệt kế hoạch Marketing tháng.")
        : "Không thể duyệt đơn mua hàng.";
      toast.error("Lỗi", errMsg);
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest) return;
    const defaultReason = (selectedRequest.entityType === "marketing_proposal" || selectedRequest.entityType === "marketing_monthly_plan")
      ? (selectedRequest.entityType === "marketing_proposal" ? "Từ chối duyệt kinh phí Marketing" : "Từ chối duyệt kế hoạch Marketing tháng")
      : "Từ chối duyệt kinh phí mua hàng";
    const reason = prompt("Nhập lý do từ chối:") || defaultReason;
    try {
      const res = await fetch(`/api/approvals/${selectedRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", rejectedReason: reason }),
      });
      if (!res.ok) throw new Error("Thao tác thất bại");
      
      // Update local lists
      setRequests((prev: any[]) => prev.map((r: any) => r.id === selectedRequest.id ? { ...r, status: "rejected", rejectedReason: reason } : r));
      setSelectedRequest((prev: any) => prev ? { ...prev, status: "rejected", rejectedReason: reason } : null);
      if (requestDetail) {
        if (selectedRequest.entityType === "marketing_proposal" || selectedRequest.entityType === "marketing_monthly_plan") {
          setRequestDetail((prev: any) => prev ? { ...prev, status: "rejected" } : null);
        } else {
          setRequestDetail((prev: any) => prev ? { ...prev, trangThai: "cancelled" } : null);
        }
      }

      // Refresh KPIs count
      fetch("/api/finance/kpis")
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setData(d); });

      const successMsg = (selectedRequest.entityType === "marketing_proposal" || selectedRequest.entityType === "marketing_monthly_plan")
        ? (selectedRequest.entityType === "marketing_proposal" ? "Đã từ chối đề xuất chi phí Marketing." : "Đã từ chối kế hoạch Marketing tháng.")
        : "Đã từ chối đơn mua hàng.";
      toast.success("Thành công", successMsg);
    } catch (err) {
      const errMsg = (selectedRequest.entityType === "marketing_proposal" || selectedRequest.entityType === "marketing_monthly_plan")
        ? (selectedRequest.entityType === "marketing_proposal" ? "Không thể từ chối đề xuất chi phí Marketing." : "Không thể từ chối kế hoạch Marketing tháng.")
        : "Không thể từ chối đơn mua hàng.";
      toast.error("Lỗi", errMsg);
    }
  };

  const handleSubmitToDirector = () => {
    toast.success("Thành công", "Đã gửi trình Giám đốc phê duyệt đơn hàng!");
  };

  const fetchKPIs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/finance/kpis");
      if (!res.ok) throw new Error("Không thể tải dữ liệu chỉ số tài chính.");
      const resData = await res.json();
      setData(resData);
      setError(null);
    } catch (err: any) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async (silent = false) => {
    if (currentStep !== 1) return;
    if (!silent) setOrdersLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(orderPage));
      if (orderSearch) params.set("search", orderSearch);
      if (orderStatus) params.set("keToanDuyet", orderStatus);

      const res = await fetch(`/api/plan-finance/sales?${params.toString()}`);
      if (!res.ok) throw new Error("Không thể tải đơn bán hàng.");
      const resData = await res.json();
      const fetchedOrders = resData.items || [];
      setOrders(fetchedOrders);
      setOrdersTotalPages(resData.totalPages || 1);
      
      setSelectedOrder((prev: any) => {
        if (prev) {
          const updated = fetchedOrders.find((o: any) => o.id === prev.id);
          return updated || prev;
        }
        return fetchedOrders.length > 0 ? fetchedOrders[0] : null;
      });
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setOrdersLoading(false);
    }
  }, [currentStep, orderSearch, orderStatus, orderPage]);

  const fetchRequests = useCallback(async (silent = false) => {
    if (currentStep !== 2) return;
    if (!silent) setRequestsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(requestPage));
      params.set("entityType", "purchase_order,marketing_proposal,marketing_monthly_plan");
      if (requestSearch) params.set("search", requestSearch);
      if (requestStatus) params.set("status", requestStatus);

      const res = await fetch(`/api/approvals?${params.toString()}`);
      if (!res.ok) throw new Error("Không thể tải yêu cầu mua hàng.");
      const resData = await res.json();
      const fetchedReqs = resData.data || [];
      setRequests(fetchedReqs);
      const limit = resData.limit || 20;
      const total = resData.total || 0;
      setRequestsTotalPages(Math.max(1, Math.ceil(total / limit)));

      setSelectedRequest((prev: any) => {
        if (prev) {
          const updated = fetchedReqs.find((r: any) => r.id === prev.id);
          return updated || prev;
        }
        return fetchedReqs.length > 0 ? fetchedReqs[0] : null;
      });
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setRequestsLoading(false);
    }
  }, [currentStep, requestSearch, requestStatus, requestPage]);

  const fetchMyRequests = useCallback(async (silent = false) => {
    if (currentStep !== 3) return;
    if (!silent) setMyRequestsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(myRequestPage));
      params.set("createdByFinance", "true");
      if (myRequestSearch) params.set("search", myRequestSearch);
      if (myRequestStatus) params.set("status", myRequestStatus);

      const res = await fetch(`/api/plan-finance/purchase-requests?${params.toString()}`);
      if (!res.ok) throw new Error("Không thể tải yêu cầu của tôi.");
      const resData = await res.json();
      const fetchedReqs = resData.items || [];
      setMyRequests(fetchedReqs);
      setMyRequestsTotalPages(resData.totalPages || 1);

      setSelectedMyRequest((prev: any) => {
        if (prev) {
          const updated = fetchedReqs.find((r: any) => r.id === prev.id);
          return updated || prev;
        }
        return fetchedReqs.length > 0 ? fetchedReqs[0] : null;
      });
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setMyRequestsLoading(false);
    }
  }, [currentStep, myRequestSearch, myRequestStatus, myRequestPage]);

  const selectedRequestRef = useRef<any>(null);
  selectedRequestRef.current = selectedRequest;

  const selectedMyRequestRef = useRef<any>(null);
  selectedMyRequestRef.current = selectedMyRequest;

  const fetchRequestDetail = useCallback(async (silent = false) => {
    const currentSelected = selectedRequestRef.current;
    if (!currentSelected) {
      setRequestDetail(null);
      return;
    }
    if (currentStep !== 2) return;
    if (!silent) {
      setRequestDetailLoading(true);
      setRequestDetail(null);
    }
    try {
      if (currentSelected.entityType === "marketing_proposal" || currentSelected.entityType === "marketing_monthly_plan") {
        const meta = currentSelected.metadata ? JSON.parse(currentSelected.metadata) : {};
        const year = meta.year || 2026;
        const month = meta.month || 1;
        const res = await fetch(`/api/plan-finance/master-plan?year=${year}`);
        const data = await res.json();
        if (data.success && data.plan) {
          const planData = JSON.parse(data.plan.planData) || {};
          const isPlan = currentSelected.entityType === "marketing_monthly_plan";
          const documentData = isPlan
            ? planData.mkt_monthly_plans?.[month]
            : planData.mkt_proposals?.[month];
          if (documentData) {
            setRequestDetail({
              ...documentData,
              entityType: currentSelected.entityType,
              pdfUrl: meta.pdfUrl || documentData.pdfUrl
            });
          } else {
            setRequestDetail(null);
          }
        } else {
          setRequestDetail(null);
        }
      } else {
        const res = await fetch(`/api/plan-finance/purchasing/${currentSelected.entityId}`);
        const data = await res.json();
        setRequestDetail(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setRequestDetailLoading(false);
    }
  }, [currentStep]);

  const fetchMyRequestDetail = useCallback(async (silent = false) => {
    const currentMySelected = selectedMyRequestRef.current;
    if (!currentMySelected) {
      setMyRequestDetail(null);
      return;
    }
    if (currentStep !== 3) return;
    if (!silent) setMyRequestDetailLoading(true);
    try {
      const res = await fetch(`/api/plan-finance/purchase-requests/${currentMySelected.id}`);
      const data = await res.json();
      setMyRequestDetail(data);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setMyRequestDetailLoading(false);
    }
  }, [currentStep]);

  // Initial KPIs fetch
  useEffect(() => {
    fetchKPIs(false);
  }, [fetchKPIs]);

  // Fetch lists on filter/page change
  useEffect(() => {
    fetchOrders(false);
  }, [fetchOrders]);

  useEffect(() => {
    fetchRequests(false);
  }, [fetchRequests]);

  useEffect(() => {
    fetchMyRequests(false);
  }, [fetchMyRequests]);

  // Fetch details on selection change
  useEffect(() => {
    fetchRequestDetail(false);
  }, [selectedRequest?.id, fetchRequestDetail]);

  useEffect(() => {
    fetchMyRequestDetail(false);
  }, [selectedMyRequest?.id, fetchMyRequestDetail]);

  // Reset selected order and page when step, filter, or search changes
  useEffect(() => {
    setSelectedOrder(null);
  }, [currentStep]);

  useEffect(() => {
    setOrderPage(1);
  }, [orderSearch, orderStatus]);

  // Reset page when step 2 filters change
  useEffect(() => {
    setRequestPage(1);
  }, [requestSearch, requestStatus]);

  // Reset page when step 3 filters change
  useEffect(() => {
    setMyRequestPage(1);
  }, [myRequestSearch, myRequestStatus]);

  // Background polling (every 5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchKPIs(true);
      if (currentStep === 1) {
        fetchOrders(true);
      } else if (currentStep === 2) {
        fetchRequests(true);
        fetchRequestDetail(true);
      } else if (currentStep === 3) {
        fetchMyRequests(true);
        fetchMyRequestDetail(true);
      }
    }, 5000); // Poll every 5s silently
    return () => clearInterval(interval);
  }, [currentStep, fetchKPIs, fetchOrders, fetchRequests, fetchRequestDetail, fetchMyRequests, fetchMyRequestDetail]);

  // Focus refresh
  useEffect(() => {
    const handleFocus = () => {
      fetchKPIs(true);
      if (currentStep === 1) {
        fetchOrders(true);
      } else if (currentStep === 2) {
        fetchRequests(true);
        fetchRequestDetail(true);
      } else if (currentStep === 3) {
        fetchMyRequests(true);
        fetchMyRequestDetail(true);
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [currentStep, fetchKPIs, fetchOrders, fetchRequests, fetchRequestDetail, fetchMyRequests, fetchMyRequestDetail]);

  const formatNumber = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "decimal",
    }).format(amount);
  };

  const formatCurrency = (amount: number) => {
    return formatNumber(amount) + " ₫";
  };

  const kpis = [
    {
      label: "Đơn hàng cần duyệt",
      value: data ? data.pendingOrders : 0,
      icon: "bi-cart-check-fill",
      accent: "#10b981", // Emerald
      description: "Đơn đặt hàng đang chờ phê duyệt",
    },
    {
      label: "Yêu cầu cần duyệt",
      value: data ? data.pendingRequests : 0,
      icon: "bi-file-earmark-check-fill",
      accent: "#8b5cf6", // Violet
      description: "Hồ sơ & đề xuất chờ phê duyệt",
    },
    {
      label: "Công nợ phải thu",
      value: data ? formatCurrency(data.debtReceivable) : "0 ₫",
      icon: "bi-arrow-down-left-circle-fill",
      accent: "#3b82f6", // Blue
      description: "Số tiền khách hàng còn nợ cần thu",
    },
    {
      label: "Công nợ phải trả",
      value: data ? formatCurrency(data.debtPayable) : "0 ₫",
      icon: "bi-arrow-up-right-circle-fill",
      accent: "#ef4444", // Red/Rose
      description: "Khoản nợ nhà cung cấp cần trả",
    },
  ];

  const stepperSteps: ModernStepItem[] = [
    {
      num: 1,
      id: "orders",
      title: "Đơn hàng",
      desc: "Quản lý đơn hàng cần duyệt",
      icon: "bi-cart-check",
    },
    {
      num: 2,
      id: "requests",
      title: "Yêu cầu",
      desc: "Phiếu yêu cầu phòng ban",
      icon: "bi-file-earmark-text",
    },
    {
      num: 3,
      id: "my-requests",
      title: "Yêu cầu của tôi",
      desc: "Đề xuất đến phòng ban khác",
      icon: "bi-send-check",
    },
  ];

  const orderStatusOptions = [
    { label: "Chờ duyệt", value: "pending" },
    { label: "Đã duyệt", value: "approved" },
    { label: "Từ chối", value: "rejected" },
  ];

  const orderColumns: TableColumn<any>[] = [
    {
      header: "Mã đơn hàng",
      render: (row) => {
        const dateStr = row.createdAt ? new Date(row.createdAt).toLocaleDateString("vi-VN") : "—";
        const creatorName = row.nguoiPhuTrachName || "Hệ thống";
        return (
          <div className="d-flex flex-column">
            <span className="fw-bold" style={{ fontFamily: "'Roboto Condensed', sans-serif", color: "var(--primary)" }}>
              {row.code || row.id}
            </span>
            <span className="text-muted d-flex align-items-center gap-1" style={{ fontSize: "10.5px", whiteSpace: "nowrap" }}>
              <i className="bi bi-calendar3" style={{ fontSize: "9.5px" }} /> {dateStr} | <i className="bi bi-person" style={{ fontSize: "11px" }} /> {creatorName}
            </span>
          </div>
        );
      },
    },
    {
      header: "Khách hàng",
      render: (row) => (
        <div className="d-flex flex-column">
          <span>{row.customer?.name || "Khách vãng lai"}</span>
          {row.customer?.address && (
            <span 
              className="text-muted text-truncate d-inline-block" 
              style={{ fontSize: "11px", maxWidth: "180px" }}
              title={row.customer.address}
            >
              {row.customer.address}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Giá trị (đ)",
      align: "right",
      render: (row) => (
        <span className="fw-semibold">
          {formatNumber(row.tongTien)}
        </span>
      ),
    },
    {
      header: "Trạng thái",
      align: "center",
      render: (row) => {
        const status = row.keToanDuyet || "pending";
        let color = "#f59e0b"; // Warning/Orange
        let bg = "rgba(245, 158, 11, 0.1)";
        let text = "Chờ duyệt";
        if (status === "approved") {
          color = "#10b981"; // Success/Green
          bg = "rgba(16, 185, 129, 0.1)";
          text = "Đã duyệt";
        } else if (status === "rejected") {
          color = "#ef4444"; // Danger/Red
          bg = "rgba(239, 68, 68, 0.1)";
          text = "Từ chối";
        }
        return (
          <span
            className="badge rounded-pill fw-bold"
            style={{
              color,
              background: bg,
              padding: "4px 12px",
              fontSize: "11px",
              border: `1px solid ${color}20`,
            }}
          >
            {text}
          </span>
        );
      },
    },
  ];

  const requestColumns: TableColumn<any>[] = [
    {
      header: "Mã yêu cầu",
      render: (row) => {
        const dateStr = row.createdAt ? new Date(row.createdAt).toLocaleDateString("vi-VN") : "—";
        return (
          <div className="d-flex flex-column">
            <span className="fw-bold" style={{ fontFamily: "'Roboto Condensed', sans-serif", color: "var(--primary)", whiteSpace: "nowrap" }}>
              {row.entityCode || row.id}
            </span>
            <span className="text-muted d-flex align-items-center gap-1" style={{ fontSize: "10.5px", whiteSpace: "nowrap" }}>
              <i className="bi bi-calendar3" style={{ fontSize: "9.5px" }} /> {dateStr}
            </span>
          </div>
        );
      },
    },
    {
      header: "Người yêu cầu",
      render: (row) => (
        <div className="d-flex flex-column">
          <span>{row.requestedByName}</span>
          <span className="text-muted" style={{ fontSize: "11px" }}>
            {row.department || "Mua hàng"}
          </span>
        </div>
      ),
    },
    {
      header: "Lý do",
      render: (row) => (
        <span className="text-muted small text-truncate d-inline-block" style={{ maxWidth: "200px" }}>
          {row.entityTitle || "—"}
        </span>
      ),
    },
    {
      header: "Trạng thái",
      align: "center",
      render: (row) => {
        const status = row.status || "pending";
        let color = "#f59e0b"; // Warning/Orange
        let bg = "rgba(245, 158, 11, 0.1)";
        let text = "Chờ duyệt";
        if (status === "approved") {
          color = "#10b981"; // Success/Green
          bg = "rgba(16, 185, 129, 0.1)";
          text = "Đã duyệt";
        } else if (status === "on_hold") {
          color = "#6366f1"; // Indigo
          bg = "rgba(99, 102, 241, 0.1)";
          text = "Tạm giữ";
        } else if (status === "rejected") {
          color = "#ef4444"; // Danger/Red
          bg = "rgba(239, 68, 68, 0.1)";
          text = "Từ chối";
        }
        return (
          <span
            className="badge rounded-pill fw-bold"
            style={{
              color,
              background: bg,
              padding: "4px 12px",
              fontSize: "11px",
              border: `1px solid ${color}20`,
            }}
          >
            {text}
          </span>
        );
      },
    },
  ];

  const myRequestColumns: TableColumn<any>[] = [
    {
      header: "Mã yêu cầu",
      render: (row) => {
        const dateStr = row.ngayTao ? new Date(row.ngayTao).toLocaleDateString("vi-VN") : "—";
        return (
          <div className="d-flex flex-column">
            <span className="fw-bold" style={{ fontFamily: "'Roboto Condensed', sans-serif", color: "var(--primary)", whiteSpace: "nowrap" }}>
              {row.code || row.id}
            </span>
            <span className="text-muted d-flex align-items-center gap-1" style={{ fontSize: "10.5px", whiteSpace: "nowrap" }}>
              <i className="bi bi-calendar3" style={{ fontSize: "9.5px" }} /> {dateStr}
            </span>
          </div>
        );
      },
    },
    {
      header: "Đơn vị nhận",
      render: (row) => (
        <span>{row.donVi || "Mua hàng"}</span>
      ),
    },
    {
      header: "Lý do",
      render: (row) => (
        <span className="text-muted small text-truncate d-inline-block" style={{ maxWidth: "200px" }}>
          {row.lyDo || "—"}
        </span>
      ),
    },
    {
      header: "Trạng thái",
      align: "center",
      render: (row) => {
        const status = row.trangThai || "chua-xu-ly";
        let color = "#f59e0b"; // Warning/Orange
        let bg = "rgba(245, 158, 11, 0.1)";
        let text = "Chờ xử lý";
        if (status === "da-xu-ly") {
          color = "#10b981"; // Success/Green
          bg = "rgba(16, 185, 129, 0.1)";
          text = "Hoàn thành";
        } else if (status === "dang-xu-ly") {
          color = "#6366f1"; // Indigo
          bg = "rgba(99, 102, 241, 0.1)";
          text = "Đang xử lý";
        } else if (status === "tu-choi") {
          color = "#ef4444"; // Danger/Red
          bg = "rgba(239, 68, 68, 0.1)";
          text = "Từ chối";
        }
        return (
          <span
            className="badge rounded-pill fw-bold"
            style={{
              color,
              background: bg,
              padding: "4px 12px",
              fontSize: "11px",
              border: `1px solid ${color}20`,
            }}
          >
            {text}
          </span>
        );
      },
    },
  ];

  return (
    <StandardPage
      title="Tài chính – Kế toán"
      description="Hệ thống quản lý tài chính, kế toán và báo cáo doanh nghiệp"
      icon="bi-cash-stack"
      color="emerald"
      useCard={false}
      paddingClassName="px-3 px-sm-4 pb-3 pb-sm-4 pt-0"
    >
      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" role="alert">
          <i className="bi bi-exclamation-triangle-fill" />
          <div>{error}</div>
        </div>
      )}

      <div className="row g-3 gy-2 mt-0">
        {loading
          ? Array(4)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="col-12 col-md-6 col-lg-3">
                  <div
                    className="p-4 rounded-4"
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      height: "140px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="bg-secondary opacity-10 rounded" style={{ width: "120px", height: "18px" }} />
                      <div className="bg-secondary opacity-10 rounded-circle" style={{ width: "36px", height: "36px" }} />
                    </div>
                    <div className="bg-secondary opacity-10 rounded" style={{ width: "160px", height: "32px" }} />
                    <div className="bg-secondary opacity-10 rounded" style={{ width: "100px", height: "14px" }} />
                  </div>
                </div>
              ))
          : kpis.map((kpi, index) => (
              <KPICard
                key={index}
                label={kpi.label}
                value={kpi.value}
                icon={kpi.icon}
                accent={kpi.accent}
                colClass="col-12 col-md-6 col-lg-3"
                subtitle={kpi.description}
              />
            ))}
      </div>

      <div className="row g-4 mt-0 flex-grow-1 flex-lg-nowrap" style={{ minHeight: 0 }}>
        {/* Vùng bên trái - chiếm tỷ lệ 7/12 */}
        <div className="col-12 col-lg-7 d-flex flex-column" style={{ minHeight: 0 }}>
          <WorkflowCard
            contentPadding="px-4 pb-4 pt-2"
            stepper={
              <ModernStepper
                steps={stepperSteps}
                currentStep={currentStep}
                onStepChange={setCurrentStep}
                paddingX={0}
                paddingY={8}
              />
            }
            toolbar={
              currentStep === 1 ? (
                <div className="d-flex align-items-center gap-2">
                  <FilterSelect
                    options={orderStatusOptions}
                    value={orderStatus}
                    onChange={setOrderStatus}
                    placeholder="Tất cả trạng thái"
                    width={180}
                  />
                  <div style={{ flex: 1 }}>
                    <SearchInput
                      value={orderSearch}
                      onChange={setOrderSearch}
                      placeholder="Tìm mã đơn hàng, tên khách hàng..."
                    />
                  </div>
                </div>
              ) : currentStep === 2 ? (
                <div className="d-flex align-items-center gap-2">
                  <FilterSelect
                    options={[
                      { label: "Chờ duyệt", value: "pending" },
                      { label: "Đã duyệt", value: "approved" },
                      { label: "Từ chối", value: "rejected" },
                    ]}
                    value={requestStatus}
                    onChange={setRequestStatus}
                    placeholder="Tất cả trạng thái"
                    width={180}
                  />
                  <div style={{ flex: 1 }}>
                    <SearchInput
                      value={requestSearch}
                      onChange={setRequestSearch}
                      placeholder="Tìm mã yêu cầu, lý do..."
                    />
                  </div>
                </div>
              ) : currentStep === 3 ? (
                <div className="d-flex align-items-center gap-2">
                  <FilterSelect
                    options={[
                      { label: "Chờ xử lý", value: "chua-xu-ly" },
                      { label: "Đang xử lý", value: "dang-xu-ly" },
                      { label: "Hoàn thành", value: "da-xu-ly" },
                      { label: "Từ chối", value: "tu-choi" },
                    ]}
                    value={myRequestStatus}
                    onChange={setMyRequestStatus}
                    placeholder="Tất cả trạng thái"
                    width={180}
                  />
                  <div style={{ flex: 1 }}>
                    <SearchInput
                      value={myRequestSearch}
                      onChange={setMyRequestSearch}
                      placeholder="Tìm mã yêu cầu, lý do..."
                    />
                  </div>
                </div>
              ) : undefined
            }
            bottomToolbar={
              currentStep === 1 && ordersTotalPages > 1 ? (
                <div className="d-flex justify-content-end w-100">
                  <Pagination
                    page={orderPage}
                    totalPages={ordersTotalPages}
                    onChange={setOrderPage}
                  />
                </div>
              ) : currentStep === 2 && requestsTotalPages > 1 ? (
                <div className="d-flex justify-content-end w-100">
                  <Pagination
                    page={requestPage}
                    totalPages={requestsTotalPages}
                    onChange={setRequestPage}
                  />
                </div>
              ) : currentStep === 3 && myRequestsTotalPages > 1 ? (
                <div className="d-flex justify-content-end w-100">
                  <Pagination
                    page={myRequestPage}
                    totalPages={myRequestsTotalPages}
                    onChange={setMyRequestPage}
                  />
                </div>
              ) : undefined
            }
          >
            {currentStep === 1 && (
              <Table
                columns={orderColumns}
                rows={orders}
                loading={ordersLoading}
                rowKey={(row) => row.id}
                emptyText="Không tìm thấy đơn hàng nào"
                compact
                onRowClick={setSelectedOrder}
              />
            )}
            {currentStep === 2 && (
              <Table
                columns={requestColumns}
                rows={requests}
                loading={requestsLoading}
                rowKey={(row) => row.id}
                emptyText="Không tìm thấy yêu cầu nào"
                compact
                onRowClick={setSelectedRequest}
              />
            )}
            {currentStep === 3 && (
              <Table
                columns={myRequestColumns}
                rows={myRequests}
                loading={myRequestsLoading}
                rowKey={(row) => row.id}
                emptyText="Không tìm thấy yêu cầu nào"
                compact
                onRowClick={setSelectedMyRequest}
              />
            )}
          </WorkflowCard>
        </div>

        {/* Vùng bên phải - chiếm tỷ lệ 5/12 */}
        <div className="col-12 col-lg-5 d-flex flex-column" style={{ minHeight: 0 }}>
          <div
            className="bg-white rounded-4 shadow-sm border p-4 flex-grow-1 d-flex flex-column overflow-hidden"
            style={{ minHeight: 0 }}
          >
            {currentStep === 1 ? (
              !selectedOrder ? (
                <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center text-muted p-5">
                  <i className="bi bi-receipt-cutoff fs-1 opacity-25 mb-3" />
                  <h6 className="fw-semibold">Chi tiết đơn hàng</h6>
                  <p className="small mb-0 opacity-75" style={{ maxWidth: "240px" }}>
                    Chọn một đơn hàng từ danh sách bên trái để xem thông tin chi tiết
                  </p>
                </div>
              ) : (
                <div className="flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
                  {/* Header */}
                  <div className="d-flex align-items-center justify-content-between border-bottom pb-3 mb-3 flex-shrink-0">
                    <div>
                      <h6 className="fw-bold text-dark mb-0" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
                        {selectedOrder.code || "Đơn hàng mới"}
                      </h6>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <button 
                        className="btn btn-sm btn-success fw-bold px-2 py-1 rounded-3 d-flex align-items-center gap-1"
                        onClick={handleApprove}
                        style={{ fontSize: "11.5px", border: "none" }}
                      >
                        <i className="bi bi-check-lg" />
                        Duyệt
                      </button>
                      <button 
                        className="btn btn-sm btn-danger fw-bold px-2 py-1 rounded-3 d-flex align-items-center gap-1"
                        onClick={handleReject}
                        style={{ fontSize: "11.5px", border: "none" }}
                      >
                        <i className="bi bi-x-lg" />
                        Từ chối
                      </button>
                      <button 
                        className="btn btn-sm btn-primary fw-bold px-2 py-1 rounded-3 d-flex align-items-center gap-1"
                        onClick={handleSubmitToDirector}
                        style={{ fontSize: "11.5px", border: "none", backgroundColor: "var(--primary)" }}
                      >
                        <i className="bi bi-send" />
                        Trình giám đốc
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-grow-1 pe-1 custom-scrollbar" style={{ overflowY: "auto", overflowX: "hidden", fontSize: "13px", minHeight: 0 }}>

                    {/* Section 2: Thông tin chi tiết */}
                    <div className="d-flex flex-column gap-3">
                      <div className="border-bottom pb-2">
                        <span className="fw-bold text-secondary text-uppercase d-block mb-2" style={{ fontSize: "10px", letterSpacing: "0.05em" }}>
                          Khách hàng
                        </span>
                        <div className="d-flex align-items-start gap-2">
                          <i className="bi bi-person text-muted mt-0.5" />
                          <div className="w-100">
                            <div className="d-flex align-items-center justify-content-between mb-1 w-100">
                              <div className="d-flex align-items-center gap-2">
                                <span className="fw-semibold text-dark">{selectedOrder.customer?.name || "Khách vãng lai"}</span>
                                {(!selectedOrder.customer || selectedOrder.customer.id === null) && (
                                  <span 
                                    className="badge bg-success bg-opacity-10 text-success fw-bold px-2 py-0.5 rounded-pill d-inline-flex align-items-center gap-1"
                                    style={{ fontSize: "10px", border: "1px solid rgba(25, 135, 84, 0.2)" }}
                                  >
                                    <i className="bi bi-plus-circle" style={{ fontSize: "9px" }} />
                                    Khách vãng lai
                                  </span>
                                )}
                              </div>
                              <button
                                className="btn btn-sm btn-outline-primary py-0 px-2 flex-shrink-0"
                                style={{ fontSize: "11px", height: "24px" }}
                                onClick={handleViewItems}
                              >
                                <i className="bi bi-box-seam me-1"></i> Xem hàng hoá
                              </button>
                            </div>
                            {selectedOrder.customer?.dienThoai && (
                              <div className="text-muted small">{selectedOrder.customer.dienThoai}</div>
                            )}
                            {selectedOrder.customer?.address && (
                              <div className="text-muted small mt-1">{selectedOrder.customer.address}</div>
                            )}

                            {/* Dữ liệu Công nợ & Hạn mức nếu khách hàng đã tồn tại */}
                            {selectedOrder.customer && selectedOrder.customer.id !== null && (
                              <div className="d-flex gap-4 mt-2.5 p-2 px-3 bg-light rounded-3 border" style={{ fontSize: "12px", borderColor: "rgba(0,0,0,0.04)" }}>
                                <div>
                                  <span className="text-muted d-block mb-0.5" style={{ fontSize: "10px" }}>Công nợ hiện tại</span>
                                  <span className="fw-bold text-danger">
                                    {formatCurrency(selectedOrder.customer.outstandingDebt || 0)}
                                  </span>
                                </div>
                                <div style={{ width: "1px", backgroundColor: "rgba(0,0,0,0.08)" }} />
                                <div>
                                  <span className="text-muted d-block mb-0.5" style={{ fontSize: "10px" }}>Hạn mức công nợ</span>
                                  <span className="fw-bold text-primary">
                                    {formatCurrency(selectedOrder.customer.creditLimit ?? 0)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="border-bottom pb-2">
                        <span className="fw-bold text-secondary text-uppercase d-block mb-2" style={{ fontSize: "10px", letterSpacing: "0.05em" }}>
                          Thông tin duyệt
                        </span>
                        <div className="d-flex flex-column gap-2">
                          <div className="d-flex align-items-center justify-content-between">
                            <span className="text-muted">Trạng thái chung:</span>
                            <span>
                              {(() => {
                                let color = "#64748b";
                                let bg = "rgba(100, 116, 139, 0.1)";
                                let text = selectedOrder.trangThai || "draft";
                                if (text === "draft") {
                                  text = "Đang tạo đơn";
                                  color = "#94a3b8";
                                  bg = "rgba(148, 163, 184, 0.1)";
                                } else if (text === "active") {
                                  text = "Đang thực hiện";
                                  color = "#3b82f6";
                                  bg = "rgba(59, 130, 246, 0.1)";
                                } else if (text === "done") {
                                  text = "Hoàn thành";
                                  color = "#10b981";
                                  bg = "rgba(16, 185, 129, 0.1)";
                                } else if (text === "cancelled") {
                                  text = "Đã huỷ";
                                  color = "#ef4444";
                                  bg = "rgba(239, 68, 68, 0.1)";
                                }
                                return (
                                  <span className="badge rounded-pill fw-bold" style={{ color, background: bg, padding: "3px 10px", fontSize: "11px" }}>
                                    {text}
                                  </span>
                                );
                              })()}
                            </span>
                          </div>
                          <div className="d-flex align-items-center justify-content-between">
                            <span className="text-muted">Trạng thái kho:</span>
                            <span>
                              {(() => {
                                const status = selectedOrder.trangThaiKho || "in_stock";
                                let color = "#10b981"; // Green
                                let bg = "rgba(16, 185, 129, 0.1)";
                                let text = "Đủ hàng";
                                if (status === "out_of_stock") {
                                  color = "#ef4444"; // Red
                                  bg = "rgba(239, 68, 68, 0.1)";
                                  text = "Thiếu hàng";
                                }
                                return (
                                  <span className="badge rounded-pill fw-bold" style={{ color, background: bg, padding: "3px 10px", fontSize: "11px" }}>
                                    {text}
                                  </span>
                                );
                              })()}
                            </span>
                          </div>
                          <div className="d-flex align-items-center justify-content-between">
                            <span className="text-muted">Người phụ trách:</span>
                            <span className="text-dark fw-medium">{selectedOrder.nguoiPhuTrachName || "Hệ thống"}</span>
                          </div>
                        </div>
                      </div>

                      {selectedOrder.ghiChu && (
                        <div>
                          <span className="fw-bold text-secondary text-uppercase d-block mb-1" style={{ fontSize: "10px", letterSpacing: "0.05em" }}>
                            Ghi chú
                          </span>
                          <div className="text-muted bg-light p-3 rounded-3 mb-0" style={{ fontSize: "12.5px" }}>
                            {(() => {
                              const match = selectedOrder.ghiChu.match(/Tên khách hàng:\s*(.*?)\s*Số điện thoại:\s*(.*?)\s*Địa chỉ giao hàng:\s*(.*)/);
                              if (match) {
                                return (
                                  <div className="d-flex flex-column gap-2">
                                    <div className="d-flex align-items-start gap-2">
                                      <i className="bi bi-person text-muted mt-0.5" style={{ fontSize: 13 }}></i>
                                      <div>
                                        <span className="text-muted d-block mb-0.5" style={{ fontSize: 10 }}>Tên khách hàng</span>
                                        <span className="fw-medium text-dark">{match[1].trim()}</span>
                                      </div>
                                    </div>
                                    <div className="d-flex align-items-start gap-2">
                                      <i className="bi bi-telephone text-muted mt-0.5" style={{ fontSize: 13 }}></i>
                                      <div>
                                        <span className="text-muted d-block mb-0.5" style={{ fontSize: 10 }}>Số điện thoại</span>
                                        <span className="fw-medium text-dark">{match[2].trim()}</span>
                                      </div>
                                    </div>
                                    <div className="d-flex align-items-start gap-2">
                                      <i className="bi bi-geo-alt text-muted mt-0.5" style={{ fontSize: 13 }}></i>
                                      <div>
                                        <span className="text-muted d-block mb-0.5" style={{ fontSize: 10 }}>Địa chỉ giao hàng</span>
                                        <span className="fw-medium text-dark">{match[3].trim()}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              return <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{selectedOrder.ghiChu}</div>;
                            })()}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-top">
                      <SectionTitle title="Vật tư sản xuất và linh kiện" className="mb-2" />
                      {selectedOrder.trangThaiKho === "out_of_stock" ? (
                        <div className="p-3 bg-danger bg-opacity-10 text-danger rounded-3 small d-flex align-items-center gap-2">
                          <i className="bi bi-exclamation-triangle-fill flex-shrink-0" style={{ fontSize: "14px" }} />
                          <span>Có vật tư, linh kiện đang thiếu trong kho. Cần tạo phiếu yêu cầu mua hàng.</span>
                        </div>
                      ) : (
                        <div className="p-3 bg-success bg-opacity-10 text-success rounded-3 small d-flex align-items-center gap-2">
                          <i className="bi bi-check-circle-fill flex-shrink-0" style={{ fontSize: "14px" }} />
                          <span>Đầy đủ vật tư, linh kiện sản xuất trong kho.</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-top">
                      <SectionTitle title="Ra quyết định" className="mb-2" />
                      <div className="d-flex flex-column gap-3 p-3 bg-light rounded-4">
                        {/* Switch 1: Mua hàng */}
                        <div 
                          className="form-check form-switch d-flex align-items-center justify-content-between p-0 m-0" 
                          onClick={() => !isLocked && handleToggleDecision('purchase')}
                          style={{ cursor: isLocked ? "not-allowed" : "pointer", opacity: isLocked ? 0.65 : 1 }}
                        >
                          <div className="d-flex align-items-center gap-2">
                            <div 
                              className="rounded-3 d-flex align-items-center justify-content-center" 
                              style={{ 
                                width: 34, 
                                height: 34,
                                backgroundColor: isPurchase ? 'rgba(67, 56, 202, 0.12)' : 'rgba(100, 116, 139, 0.1)',
                                color: isPurchase ? 'var(--primary, #4338ca)' : '#64748b'
                              }}
                            >
                              <i className="bi bi-cart-plus" style={{ fontSize: '15px' }} />
                            </div>
                            <div>
                              <span className="fw-semibold text-dark d-block" style={{ fontSize: '13px' }}>Mua hàng</span>
                              <span className="text-muted" style={{ fontSize: '11px' }}>Tạo phiếu yêu cầu mua vật tư còn thiếu</span>
                            </div>
                          </div>
                          <input 
                            className="form-check-input ms-0" 
                            type="checkbox" 
                            role="switch" 
                            checked={isPurchase}
                            disabled={isLocked}
                            onChange={() => {}} // handled by click on parent div
                            style={{ width: '28px', height: '16px', cursor: isLocked ? 'not-allowed' : 'pointer', flexShrink: 0 }}
                          />
                        </div>

                        {/* Divider */}
                        <div className="border-top" style={{ borderColor: 'rgba(0,0,0,0.06)' }} />

                        {/* Switch 2: Sản xuất lắp ráp */}
                        <div 
                          className="form-check form-switch d-flex align-items-center justify-content-between p-0 m-0" 
                          onClick={() => !isLocked && handleToggleDecision('production')}
                          style={{ cursor: isLocked ? "not-allowed" : "pointer", opacity: isLocked ? 0.65 : 1 }}
                        >
                          <div className="d-flex align-items-center gap-2">
                            <div 
                              className="rounded-3 d-flex align-items-center justify-content-center" 
                              style={{ 
                                width: 34, 
                                height: 34,
                                backgroundColor: isProduction ? 'rgba(16, 185, 129, 0.12)' : 'rgba(100, 116, 139, 0.1)',
                                color: isProduction ? '#10b981' : '#64748b'
                              }}
                            >
                              <i className="bi bi-gear-wide-connected" style={{ fontSize: '15px' }} />
                            </div>
                            <div>
                              <span className="fw-semibold text-dark d-block" style={{ fontSize: '13px' }}>Sản xuất lắp ráp</span>
                              <span className="text-muted" style={{ fontSize: '11px' }}>Chuyển thông tin lắp ráp sang bộ phận sản xuất</span>
                            </div>
                          </div>
                          <input 
                            className="form-check-input ms-0" 
                            type="checkbox" 
                            role="switch" 
                            checked={isProduction}
                            disabled={isLocked}
                            onChange={() => {}} // handled by click on parent div
                            style={{ width: '28px', height: '16px', cursor: isLocked ? 'not-allowed' : 'pointer', flexShrink: 0 }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            ) : currentStep === 2 ? (
              !selectedRequest ? (
                <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center text-muted p-5">
                  <i className="bi bi-file-earmark-plus fs-1 opacity-25 mb-3" />
                  <h6 className="fw-semibold">Chi tiết yêu cầu</h6>
                  <p className="small mb-0 opacity-75" style={{ maxWidth: "240px" }}>
                    Chọn một phiếu yêu cầu từ danh sách bên trái để xem thông tin chi tiết
                  </p>
                </div>
              ) : requestDetailLoading ? (
                <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center text-muted p-5">
                  <div className="spinner-border text-primary spinner-border-sm mb-3" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="small mb-0 opacity-75">Đang tải chi tiết yêu cầu...</p>
                </div>
              ) : !requestDetail ? (
                <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center text-danger p-5">
                  <i className="bi bi-exclamation-triangle-fill fs-2 mb-3" />
                  <p className="small mb-0">Không thể tải thông tin chi tiết yêu cầu này.</p>
                </div>
              ) : (
                <div className="flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
                  {/* Header */}
                  <div className="d-flex align-items-center justify-content-between border-bottom pb-3 mb-3 flex-shrink-0">
                    <div>
                      <h6 className="fw-bold text-dark mb-0" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
                        {requestDetail.code || "Đơn hàng mới"}
                      </h6>
                    </div>
                    {selectedRequest.status === "pending" && (
                      <div className="d-flex align-items-center gap-2">
                        <button 
                          className="btn btn-sm btn-success fw-bold px-2 py-1 rounded-3 d-flex align-items-center gap-1"
                          onClick={handleApproveRequest}
                          style={{ fontSize: "11.5px", border: "none" }}
                        >
                          <i className="bi bi-check-lg" />
                          Duyệt
                        </button>
                        <button 
                          className="btn btn-sm btn-danger fw-bold px-2 py-1 rounded-3 d-flex align-items-center gap-1"
                          onClick={handleRejectRequest}
                          style={{ fontSize: "11.5px", border: "none" }}
                        >
                          <i className="bi bi-x-lg" />
                          Từ chối
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-grow-1 pe-1 custom-scrollbar" style={{ overflowY: "auto", overflowX: "hidden", fontSize: "13px", minHeight: 0 }}>
                    <div className="d-flex flex-column gap-3">
                      {/* Section 1: Thông tin chung */}
                      <div className="border-bottom pb-2">
                        <span className="fw-bold text-secondary text-uppercase d-block mb-2" style={{ fontSize: "10px", letterSpacing: "0.05em" }}>
                          Thông tin chung
                        </span>
                        {(selectedRequest.entityType === "marketing_proposal" || selectedRequest.entityType === "marketing_monthly_plan") ? (
                          <div className="d-flex flex-column gap-2">
                            <div className="d-flex align-items-center justify-content-between">
                              <span className="text-muted">Đơn vị đề xuất:</span>
                              <span className="text-dark fw-semibold">Phòng Marketing</span>
                            </div>
                            <div className="d-flex align-items-center justify-content-between">
                              <span className="text-muted">Người đề xuất:</span>
                              <span className="text-dark fw-semibold">{requestDetail.proposerName || selectedRequest.requestedByName || "—"}</span>
                            </div>
                            <div className="d-flex align-items-center justify-content-between">
                              <span className="text-muted">Ngày đề xuất:</span>
                              <span className="text-dark fw-medium">
                                {requestDetail.date || (requestDetail.createdAt ? new Date(requestDetail.createdAt).toLocaleDateString("vi-VN") : "—")}
                              </span>
                            </div>
                            <div className="d-flex align-items-center justify-content-between">
                              <span className="text-muted">Trạng thái duyệt:</span>
                              <span>
                                {(() => {
                                  const status = selectedRequest.status || "pending";
                                  let color = "#f59e0b"; // Warning/Orange
                                  let bg = "rgba(245, 158, 11, 0.1)";
                                  let text = "Chờ duyệt";
                                  if (status === "approved") {
                                    color = "#10b981"; // Success/Green
                                    bg = "rgba(16, 185, 129, 0.1)";
                                    text = "Đã duyệt";
                                  } else if (status === "on_hold") {
                                    color = "#6366f1"; // Indigo
                                    bg = "rgba(99, 102, 241, 0.1)";
                                    text = "Tạm giữ";
                                  } else if (status === "rejected") {
                                    color = "#ef4444"; // Danger/Red
                                    bg = "rgba(239, 68, 68, 0.1)";
                                    text = "Từ chối";
                                  }
                                  return (
                                    <span className="badge rounded-pill fw-bold" style={{ color, background: bg, padding: "3px 10px", fontSize: "11px" }}>
                                      {text}
                                    </span>
                                  );
                                })()}
                              </span>
                            </div>
                            {requestDetail.pdfUrl && (
                              <div className="d-flex align-items-center justify-content-between mt-1">
                                <span className="text-muted">File đề xuất PDF:</span>
                                <a
                                  href={requestDetail.pdfUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-xs btn-outline-danger fw-bold d-inline-flex align-items-center gap-1 py-1 px-2 rounded-2"
                                  style={{ fontSize: "11px", textDecoration: "none" }}
                                >
                                  <i className="bi bi-file-earmark-pdf-fill" />
                                  Xem PDF đề xuất
                                </a>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="d-flex flex-column gap-2">
                            <div className="d-flex align-items-center justify-content-between">
                              <span className="text-muted">Nhà cung cấp:</span>
                              <span className="text-dark fw-semibold">{requestDetail.supplier?.name || "Chưa xác định"}</span>
                            </div>
                            <div className="d-flex align-items-center justify-content-between">
                              <span className="text-muted">Người yêu cầu:</span>
                              <span className="text-dark fw-semibold">{selectedRequest.requestedByName || "—"}</span>
                            </div>
                            <div className="d-flex align-items-center justify-content-between">
                              <span className="text-muted">Ngày tạo đơn:</span>
                              <span className="text-dark fw-medium">
                                {requestDetail.createdAt ? new Date(requestDetail.createdAt).toLocaleDateString("vi-VN") : "—"}
                              </span>
                            </div>
                            <div className="d-flex align-items-center justify-content-between">
                              <span className="text-muted">Ngày nhận dự kiến:</span>
                              <span className="text-dark fw-medium">
                                {requestDetail.ngayNhan ? new Date(requestDetail.ngayNhan).toLocaleDateString("vi-VN") : "—"}
                              </span>
                            </div>
                            <div className="d-flex align-items-center justify-content-between">
                              <span className="text-muted">Trạng thái duyệt:</span>
                              <span>
                                {(() => {
                                  const status = selectedRequest.status || "pending";
                                  let color = "#f59e0b"; // Warning/Orange
                                  let bg = "rgba(245, 158, 11, 0.1)";
                                  let text = "Chờ duyệt";
                                  if (status === "approved") {
                                    color = "#10b981"; // Success/Green
                                    bg = "rgba(16, 185, 129, 0.1)";
                                    text = "Đã duyệt";
                                  } else if (status === "on_hold") {
                                    color = "#6366f1"; // Indigo
                                    bg = "rgba(99, 102, 241, 0.1)";
                                    text = "Tạm giữ";
                                  } else if (status === "rejected") {
                                    color = "#ef4444"; // Danger/Red
                                    bg = "rgba(239, 68, 68, 0.1)";
                                    text = "Từ chối";
                                  }
                                  return (
                                    <span className="badge rounded-pill fw-bold" style={{ color, background: bg, padding: "3px 10px", fontSize: "11px" }}>
                                      {text}
                                    </span>
                                  );
                                })()}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Section 2: Lý do & Ghi chú */}
                      <div className="border-bottom pb-2">
                        {(selectedRequest.entityType === "marketing_proposal" || selectedRequest.entityType === "marketing_monthly_plan") ? (
                          <>
                            {requestDetail.purpose && (
                              <div className="mb-2">
                                <span className="fw-bold text-secondary text-uppercase d-block mb-1" style={{ fontSize: "10px", letterSpacing: "0.05em" }}>
                                  Mục đích đề xuất
                                </span>
                                <p className="text-dark mb-0 fw-medium" style={{ fontSize: "12.5px", lineHeight: "1.4" }}>
                                  {requestDetail.purpose}
                                </p>
                              </div>
                            )}
                            {selectedRequest.rejectedReason && (
                              <div className="mb-2">
                                <span className="fw-bold text-secondary text-uppercase d-block mb-1" style={{ fontSize: "10px", letterSpacing: "0.05em" }}>
                                  Lý do từ chối
                                </span>
                                <p className="text-danger mb-0" style={{ fontSize: "12.5px", lineHeight: "1.4" }}>
                                  {selectedRequest.rejectedReason}
                                </p>
                              </div>
                            )}
                            {requestDetail.notes && (
                              <div>
                                <span className="fw-bold text-secondary text-uppercase d-block mb-1" style={{ fontSize: "10px", letterSpacing: "0.05em" }}>
                                  Ghi chú đề xuất
                                </span>
                                <p className="text-muted mb-0" style={{ fontSize: "12.5px", lineHeight: "1.4" }}>
                                  {requestDetail.notes}
                                </p>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            {selectedRequest.entityTitle && (
                              <div className="mb-2">
                                <span className="fw-bold text-secondary text-uppercase d-block mb-1" style={{ fontSize: "10px", letterSpacing: "0.05em" }}>
                                  Nội dung yêu cầu
                                </span>
                                <p className="text-dark mb-0 fw-medium" style={{ fontSize: "12.5px", lineHeight: "1.4" }}>
                                  {selectedRequest.entityTitle}
                                </p>
                              </div>
                            )}
                            {selectedRequest.rejectedReason && (
                              <div className="mb-2">
                                <span className="fw-bold text-secondary text-uppercase d-block mb-1" style={{ fontSize: "10px", letterSpacing: "0.05em" }}>
                                  Lý do từ chối
                                </span>
                                <p className="text-danger mb-0" style={{ fontSize: "12.5px", lineHeight: "1.4" }}>
                                  {selectedRequest.rejectedReason}
                                </p>
                              </div>
                            )}
                            {requestDetail.ghiChu && (
                              <div>
                                <span className="fw-bold text-secondary text-uppercase d-block mb-1" style={{ fontSize: "10px", letterSpacing: "0.05em" }}>
                                  Ghi chú đơn hàng
                                </span>
                                <p className="text-muted mb-0" style={{ fontSize: "12.5px", lineHeight: "1.4" }}>
                                  {requestDetail.ghiChu}
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Section 3: Danh sách vật tư hoặc Hạng mục đề xuất */}
                      {(selectedRequest.entityType === "marketing_proposal" || selectedRequest.entityType === "marketing_monthly_plan") ? (
                        (() => {
                          const mktItems: any[] = [];
                          if (requestDetail.items) {
                            Object.entries(requestDetail.items).forEach(([key, mainTask]: any) => {
                              if (mainTask.subTasks && mainTask.subTasks.length > 0) {
                                mainTask.subTasks.forEach((sub: any) => {
                                  mktItems.push({
                                    id: sub.id || `${key}_${sub.label}`,
                                    name: `${mainTask.label || mainTask.name || "Hạng mục"} - ${sub.label}`,
                                    proposedAmount: sub.proposedAmount,
                                    description: sub.description
                                  });
                                });
                              } else {
                                mktItems.push({
                                  id: key,
                                  name: mainTask.label || mainTask.name || "Hạng mục",
                                  proposedAmount: mainTask.proposedAmount || 0,
                                  description: mainTask.description
                                });
                              }
                            });
                          }
                          if (requestDetail.advReserve && requestDetail.advReserve > 0) {
                            mktItems.push({
                              id: "adv_reserve",
                              name: "Ngân sách dự phòng quảng cáo (Reserve)",
                              proposedAmount: requestDetail.advReserve,
                              description: "Chi phí dự phòng phát sinh cho quảng cáo"
                            });
                          }
                          const totalMktAmount = mktItems.reduce((sum, item) => sum + (item.proposedAmount || 0), 0);

                          return (
                            <div>
                              <span className="fw-bold text-secondary text-uppercase d-block mb-2" style={{ fontSize: "10px", letterSpacing: "0.05em" }}>
                                Hạng mục đề xuất chi tiết ({mktItems.length} mục)
                              </span>
                              <div className="d-flex flex-column gap-2">
                                {mktItems.map((item: any) => (
                                  <div key={item.id} className="p-2 bg-light rounded-3 border d-flex justify-content-between align-items-center" style={{ fontSize: "12.5px" }}>
                                    <div>
                                      <span className="fw-bold text-dark d-block">{item.name}</span>
                                      {item.description && (
                                        <span className="text-muted d-block" style={{ fontSize: "10px" }}>
                                          {item.description}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-end">
                                      <span className="text-primary fw-bold" style={{ fontSize: "11.5px" }}>
                                        {formatCurrency(item.proposedAmount)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="d-flex justify-content-between align-items-center mt-3 p-2.5 bg-primary-subtle text-primary rounded-3 border border-primary-subtle">
                                <span className="fw-bold" style={{ fontSize: "12.5px" }}>Tổng kinh phí đề xuất:</span>
                                <span className="fw-extrabold" style={{ fontSize: "15px" }}>
                                  {formatCurrency(totalMktAmount)}
                                </span>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div>
                          <span className="fw-bold text-secondary text-uppercase d-block mb-2" style={{ fontSize: "10px", letterSpacing: "0.05em" }}>
                            Danh sách vật tư yêu cầu ({(Array.isArray(requestDetail.items) ? requestDetail.items.length : 0)} mặt hàng)
                          </span>
                          <div className="d-flex flex-column gap-2">
                            {Array.isArray(requestDetail.items) && requestDetail.items.map((item: any) => (
                              <div key={item.id} className="p-2 bg-light rounded-3 border d-flex justify-content-between align-items-center" style={{ fontSize: "12.5px" }}>
                                <div>
                                  <span className="fw-bold text-dark d-block">{item.tenHang}</span>
                                  <span className="text-muted" style={{ fontSize: "11px" }}>
                                    Đơn giá: {formatCurrency(item.donGia || item.donGiaDK || 0)}
                                  </span>
                                </div>
                                <div className="text-end">
                                  <span className="fw-bold text-dark d-block">
                                    x{item.soLuong} {item.donVi || "mục"}
                                  </span>
                                  <span className="text-primary fw-bold" style={{ fontSize: "11.5px" }}>
                                    {formatCurrency((item.soLuong || 0) * (item.donGia || item.donGiaDK || 0))}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="d-flex justify-content-between align-items-center mt-3 p-2.5 bg-primary-subtle text-primary rounded-3 border border-primary-subtle">
                            <span className="fw-bold" style={{ fontSize: "12.5px" }}>Tổng tiền:</span>
                            <span className="fw-extrabold" style={{ fontSize: "15px" }}>
                              {formatCurrency(requestDetail.tongTien || (Array.isArray(requestDetail.items) ? requestDetail.items.reduce((sum: number, it: any) => sum + (it.soLuong * (it.donGia || it.donGiaDK || 0)), 0) : 0))}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            ) : currentStep === 3 ? (
              !selectedMyRequest ? (
                <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center text-muted p-5">
                  <i className="bi bi-file-earmark-plus fs-1 opacity-25 mb-3" />
                  <h6 className="fw-semibold">Chi tiết yêu cầu</h6>
                  <p className="small mb-0 opacity-75" style={{ maxWidth: "240px" }}>
                    Chọn một phiếu yêu cầu từ danh sách bên trái để xem thông tin chi tiết
                  </p>
                </div>
              ) : myRequestDetailLoading ? (
                <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center text-muted p-5">
                  <div className="spinner-border text-primary spinner-border-sm mb-3" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="small mb-0 opacity-75">Đang tải chi tiết yêu cầu...</p>
                </div>
              ) : !myRequestDetail ? (
                <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center text-danger p-5">
                  <i className="bi bi-exclamation-triangle-fill fs-2 mb-3" />
                  <p className="small mb-0">Không thể tải thông tin chi tiết yêu cầu này.</p>
                </div>
              ) : (
                <div className="flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
                  {/* Header */}
                  <div className="d-flex align-items-center justify-content-between border-bottom pb-3 mb-3 flex-shrink-0">
                    <div>
                      <h6 className="fw-bold text-dark mb-0" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
                        {myRequestDetail.code || "Yêu cầu mới"}
                      </h6>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-grow-1 pe-1 custom-scrollbar" style={{ overflowY: "auto", overflowX: "hidden", fontSize: "13px", minHeight: 0 }}>
                    <div className="d-flex flex-column gap-3">
                      {/* Section 1: Thông tin chung */}
                      <div className="border-bottom pb-2">
                        <span className="fw-bold text-secondary text-uppercase d-block mb-2" style={{ fontSize: "10px", letterSpacing: "0.05em" }}>
                          Thông tin chung
                        </span>
                        <div className="d-flex flex-column gap-2">
                          <div className="d-flex align-items-center justify-content-between">
                            <span className="text-muted">Đơn vị nhận:</span>
                            <span className="text-dark fw-semibold">{myRequestDetail.donVi || "—"}</span>
                          </div>
                          <div className="d-flex align-items-center justify-content-between">
                            <span className="text-muted">Người đề xuất:</span>
                            <span className="text-dark fw-semibold">{myRequestDetail.nguoiYeuCau || "—"}</span>
                          </div>
                          <div className="d-flex align-items-center justify-content-between">
                            <span className="text-muted">Ngày tạo:</span>
                            <span className="text-dark fw-medium">
                              {myRequestDetail.ngayTao ? new Date(myRequestDetail.ngayTao).toLocaleDateString("vi-VN") : "—"}
                            </span>
                          </div>
                          <div className="d-flex align-items-center justify-content-between">
                            <span className="text-muted">Ngày cần có:</span>
                            <span className="text-dark fw-medium">
                              {myRequestDetail.ngayCanCo ? new Date(myRequestDetail.ngayCanCo).toLocaleDateString("vi-VN") : "—"}
                            </span>
                          </div>
                          <div className="d-flex align-items-center justify-content-between">
                            <span className="text-muted">Trạng thái:</span>
                            <span>
                              {(() => {
                                const status = myRequestDetail.trangThai || "chua-xu-ly";
                                let color = "#f59e0b"; // Warning/Orange
                                let bg = "rgba(245, 158, 11, 0.1)";
                                let text = "Chờ xử lý";
                                if (status === "da-xu-ly") {
                                  color = "#10b981"; // Success/Green
                                  bg = "rgba(16, 185, 129, 0.1)";
                                  text = "Hoàn thành";
                                } else if (status === "dang-xu-ly") {
                                  color = "#6366f1"; // Indigo
                                  bg = "rgba(99, 102, 241, 0.1)";
                                  text = "Đang xử lý";
                                } else if (status === "tu-choi") {
                                  color = "#ef4444"; // Danger/Red
                                  bg = "rgba(239, 68, 68, 0.1)";
                                  text = "Từ chối";
                                }
                                return (
                                  <span className="badge rounded-pill fw-bold" style={{ color, background: bg, padding: "3px 10px", fontSize: "11px" }}>
                                    {text}
                                  </span>
                                );
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Lý do & Ghi chú */}
                      {(myRequestDetail.lyDo || myRequestDetail.ghiChu) && (
                        <div className="border-bottom pb-2">
                          {myRequestDetail.lyDo && (
                            <div className="mb-2">
                              <span className="fw-bold text-secondary text-uppercase d-block mb-1" style={{ fontSize: "10px", letterSpacing: "0.05em" }}>
                                Lý do yêu cầu
                              </span>
                              <p className="text-muted mb-0" style={{ fontSize: "12.5px", lineHeight: "1.4" }}>
                                {myRequestDetail.lyDo}
                              </p>
                            </div>
                          )}
                          {myRequestDetail.ghiChu && (
                            <div>
                              <span className="fw-bold text-secondary text-uppercase d-block mb-1" style={{ fontSize: "10px", letterSpacing: "0.05em" }}>
                                Ghi chú
                              </span>
                              <p className="text-muted mb-0" style={{ fontSize: "12.5px", lineHeight: "1.4" }}>
                                {myRequestDetail.ghiChu}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Section 3: Danh sách vật tư */}
                      <div>
                        <span className="fw-bold text-secondary text-uppercase d-block mb-2" style={{ fontSize: "10px", letterSpacing: "0.05em" }}>
                          Danh sách vật tư yêu cầu ({myRequestDetail.items?.length || 0} mặt hàng)
                        </span>
                        <div className="d-flex flex-column gap-2">
                          {myRequestDetail.items?.map((item: any) => (
                            <div key={item.id} className="p-2 bg-light rounded-3 border d-flex justify-content-between align-items-center" style={{ fontSize: "12.5px" }}>
                              <div>
                                <span className="fw-bold text-dark d-block">{item.tenHang}</span>
                                <span className="text-muted" style={{ fontSize: "11px" }}>
                                  Đơn giá dự kiến: {formatCurrency(item.donGiaDK || item.donGia || 0)}
                                </span>
                              </div>
                              <div className="text-end">
                                <span className="fw-bold text-dark d-block">
                                  x{item.soLuong} {item.donVi || "mục"}
                                </span>
                                <span className="text-primary fw-bold" style={{ fontSize: "11.5px" }}>
                                  {formatCurrency((item.soLuong || 0) * (item.donGiaDK || item.donGia || 0))}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                        {myRequestDetail.items?.length > 0 && (
                          <div className="d-flex justify-content-between align-items-center mt-3 p-2.5 bg-primary-subtle text-primary rounded-3 border border-primary-subtle">
                            <span className="fw-bold" style={{ fontSize: "12.5px" }}>Tổng dự kiến:</span>
                            <span className="fw-extrabold" style={{ fontSize: "15px" }}>
                              {formatCurrency(myRequestDetail.items.reduce((sum: number, it: any) => sum + (it.soLuong * (it.donGiaDK || it.donGia || 0)), 0))}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center text-muted p-5">
                <i className="bi bi-gear fs-1 opacity-25 mb-3" />
                <h6 className="fw-semibold">Chi tiết lệnh sản xuất</h6>
                <p className="small mb-0 opacity-75" style={{ maxWidth: "240px" }}>
                  Chọn một lệnh sản xuất để xem thông tin chi tiết
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items Offcanvas */}
      {showItemsOffcanvas && (
        <div className="offcanvas-backdrop fade show" onClick={() => setShowItemsOffcanvas(false)} style={{ zIndex: 1060 }}></div>
      )}
      <div 
        className={`offcanvas offcanvas-end ${showItemsOffcanvas ? 'show' : ''}`} 
        tabIndex={-1} 
        style={{ width: 400, zIndex: 1065 }}
      >
        <div className="offcanvas-header border-bottom px-4 py-3 bg-light">
          <div>
            <h5 className="offcanvas-title fw-bold mb-1">Chi tiết hàng hoá</h5>
            <div className="text-muted" style={{ fontSize: 13 }}>
              {selectedOrder?.typeLabel} {selectedOrder?.code}
            </div>
          </div>
          <button type="button" className="btn-close" onClick={() => setShowItemsOffcanvas(false)}></button>
        </div>
        <div className="offcanvas-body p-0 custom-scrollbar bg-white">
          <div className="p-4">
            {fetchingDetails ? (
              <div className="text-center p-4 text-muted">
                <div className="spinner-border spinner-border-sm me-2"></div>
                Đang tải dữ liệu...
              </div>
            ) : orderDetails.length > 0 ? (
              <div>
                <Table
                  rows={orderDetails}
                  columns={[
                    { header: "Sản phẩm", render: (row: any) => <span className="fw-medium text-dark">{row.name}</span>, width: "70%" },
                    { header: "SL", render: (row: any) => <div className="text-end fw-bold text-primary">{row.qty} <span className="fw-normal text-muted" style={{ fontSize: 11 }}>{row.unit || "cái"}</span></div>, align: "right", width: "30%" }
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
        <div className="offcanvas-footer p-3 border-top bg-light">
          <button className="btn btn-secondary w-100" onClick={() => setShowItemsOffcanvas(false)}>
            Đóng
          </button>
        </div>
      </div>

    </StandardPage>
  );
}



