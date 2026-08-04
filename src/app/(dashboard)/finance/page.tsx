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
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // States for Sales Orders (step 1)
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [orderPage, setOrderPage] = useState(1);
  const [ordersTotalPages, setOrdersTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showItemsOffcanvas, setShowItemsOffcanvas] = useState(false);
  const [orderDetails, setOrderDetails] = useState<any[]>([]);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [productionItemIds, setProductionItemIds] = useState<string[]>([]);

  const handleViewItems = async (e: React.MouseEvent, orderToView: any) => {
    e.stopPropagation();
    if (!orderToView) return;
    setSelectedOrder(orderToView);
    setShowItemsOffcanvas(true);
    setFetchingDetails(true);
    setOrderDetails([]);
    try {
      const res = await fetch(`/api/plan-finance/sales/${orderToView.id}`);
      if (res.ok) {
        const detail = await res.json();
        setOrderDetails(detail.items || []);
        
        if (orderToView.keToanDuyet === "approved" && detail.productionItemIds) {
          // If already approved, load the actual selected items from the production task
          setProductionItemIds(detail.productionItemIds);
        } else {
          // Auto-check items that can be produced (default behavior for pending orders)
          const prodIds = (detail.items || []).filter((it: any) => it.missingQty > 0 && it.isManufactured && it.canProduce).map((it: any) => it.id);
          setProductionItemIds(prodIds);
        }
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
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [showRequestDeleteConfirm, setShowRequestDeleteConfirm] = useState(false);
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
  const [paymentNotifications, setPaymentNotifications] = useState<any[]>([]);
  const [paymentNotificationsLoading, setPaymentNotificationsLoading] = useState(false);
  const [paymentNotificationSearch, setPaymentNotificationSearch] = useState("");
  const [paymentNotificationStatus, setPaymentNotificationStatus] = useState("");
  const [paymentNotificationPage, setPaymentNotificationPage] = useState(1);
  const [paymentNotificationsTotalPages, setPaymentNotificationsTotalPages] = useState(1);
  const [selectedPaymentNotification, setSelectedPaymentNotification] = useState<any | null>(null);
  const [paymentNotificationDetail, setPaymentNotificationDetail] = useState<any | null>(null);
  const [paymentNotificationDetailLoading, setPaymentNotificationDetailLoading] = useState(false);
  const [readNotifIds, setReadNotifIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('readPaymentNotifications');
      if (stored) setReadNotifIds(JSON.parse(stored));
    } catch(e) {}
  }, []);

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
            ...current,
            purchase: newValue,
          },
        };
      } else {
        return {
          ...prev,
          [selectedOrder.id]: {
            ...current,
            production: newValue,
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
          decisions: isLocked ? null : { purchase: isPurchase, production: isProduction },
          productionItemIds: productionItemIds
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Thao tác thất bại");
      }
      const updated = await res.json();
      
      // Update local state
      setOrders((prev: any[]) => prev.map(o => o.id === selectedOrder.id ? { ...o, keToanDuyet: "approved" } : o));
      setSelectedOrder((prev: any | null) => prev ? { ...prev, keToanDuyet: "approved" } : null);
      
      // Refresh KPIs count
      fetch("/api/finance/kpis")
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setData(d); });

      toast.success("Thành công", "Đã duyệt đơn hàng thành công!");
    } catch (err: any) {
      toast.error("Lỗi", err.message || "Không thể duyệt đơn hàng.");
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
      params.set("entityType", "purchase_order,marketing_proposal,marketing_monthly_plan,purchase_request");
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

  const fetchPaymentNotifications = useCallback(async (silent = false) => {
    if (currentStep !== 3) return;
    if (!silent) setPaymentNotificationsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(paymentNotificationPage));
      params.set("createdByFinance", "true");
      if (paymentNotificationSearch) params.set("search", paymentNotificationSearch);
      if (paymentNotificationStatus) params.set("status", paymentNotificationStatus);

      const res = await fetch(`/api/finance/payment-notifications?${params.toString()}`);
      if (!res.ok) throw new Error("Không thể tải yêu cầu của tôi.");
      const resData = await res.json();
      const fetchedReqs = resData.data || [];
      
      setPaymentNotifications(prevReqs => {
        if (silent && fetchedReqs.length > 0) {
          const newItems = fetchedReqs.filter((r: any) => r.status === 'pending' && !prevReqs.find((p: any) => p.id === r.id));
          if (newItems.length > 0) {
             try {
                const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                if (AudioContext) {
                  const ctx = new AudioContext();
                  const osc = ctx.createOscillator();
                  const gain = ctx.createGain();
                  osc.connect(gain);
                  gain.connect(ctx.destination);
                  osc.type = "sine";
                  osc.frequency.setValueAtTime(1046.50, ctx.currentTime); // C6
                  osc.frequency.exponentialRampToValueAtTime(2093.00, ctx.currentTime + 0.1); // C7
                  gain.gain.setValueAtTime(0, ctx.currentTime);
                  gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
                  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
                  osc.start(ctx.currentTime);
                  osc.stop(ctx.currentTime + 0.5);
                }
             } catch(e) {}
             toast.info("Thông báo mới", "Có thông báo tiền vào mới!");
          }
        }
        return fetchedReqs;
      });
      
      setPaymentNotificationsTotalPages(resData.pagination?.totalPages || 1);

      setSelectedPaymentNotification((prev: any) => {
        if (prev) {
          const updated = fetchedReqs.find((r: any) => r.id === prev.id);
          return updated || prev;
        }
        return fetchedReqs.length > 0 ? fetchedReqs[0] : null;
      });
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setPaymentNotificationsLoading(false);
    }
  }, [currentStep, paymentNotificationSearch, paymentNotificationStatus, paymentNotificationPage]);

  const selectedRequestRef = useRef<any>(null);
  selectedRequestRef.current = selectedRequest;

  const selectedPaymentNotificationRef = useRef<any>(null);
  selectedPaymentNotificationRef.current = selectedPaymentNotification;

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
      } else if (currentSelected.entityType === "purchase_request") {
        const res = await fetch(`/api/plan-finance/purchase-requests/${currentSelected.entityId}`);
        const data = await res.json();
        setRequestDetail(data);
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

  const fetchPaymentNotificationDetail = useCallback(async (silent = false) => {
    const currentMySelected = selectedPaymentNotificationRef.current;
    if (!currentMySelected) {
      setPaymentNotificationDetail(null);
      return;
    }
    if (currentStep !== 3) return;
    setPaymentNotificationDetail(currentMySelected);
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
    fetchPaymentNotifications(false);
  }, [fetchPaymentNotifications]);

  // Fetch details on selection change
  useEffect(() => {
    fetchRequestDetail(false);
  }, [selectedRequest?.id, fetchRequestDetail]);

  useEffect(() => {
    fetchPaymentNotificationDetail(false);
  }, [selectedPaymentNotification?.id, fetchPaymentNotificationDetail]);

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
    setPaymentNotificationPage(1);
  }, [paymentNotificationSearch, paymentNotificationStatus]);

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
        fetchPaymentNotifications(true);
        fetchPaymentNotificationDetail(true);
      }
    }, 5000); // Poll every 5s silently
    return () => clearInterval(interval);
  }, [currentStep, fetchKPIs, fetchOrders, fetchRequests, fetchRequestDetail, fetchPaymentNotifications, fetchPaymentNotificationDetail]);

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
        fetchPaymentNotifications(true);
        fetchPaymentNotificationDetail(true);
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [currentStep, fetchKPIs, fetchOrders, fetchRequests, fetchRequestDetail, fetchPaymentNotifications, fetchPaymentNotificationDetail]);

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
      id: "payment-notifications",
      title: "Thông báo tiền vào",
      desc: "Xác nhận tiền khách hàng thanh toán",
      icon: "bi-cash-coin",
    },
  ];

  const orderStatusOptions = [
    { label: "Chờ duyệt", value: "pending" },
    { label: "Đã duyệt", value: "approved" },
    { label: "Từ chối", value: "rejected" },
  ];

  const orderColumns: TableColumn<any>[] = [
    {
      header: (
        <input 
          type="checkbox" 
          className="form-check-input m-0"
          checked={orders.length > 0 && selectedOrderIds.length === orders.length}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedOrderIds(orders.map(o => o.id));
            } else {
              setSelectedOrderIds([]);
            }
          }}
        />
      ),
      width: "40px",
      render: (row) => (
        <input 
          type="checkbox" 
          className="form-check-input m-0"
          checked={selectedOrderIds.includes(row.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedOrderIds(prev => [...prev, row.id]);
            } else {
              setSelectedOrderIds(prev => prev.filter(id => id !== row.id));
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      )
    },
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
      header: (
        <input 
          type="checkbox" 
          className="form-check-input m-0"
          checked={requests.length > 0 && selectedRequestIds.length === requests.length}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedRequestIds(requests.map(r => r.id));
            } else {
              setSelectedRequestIds([]);
            }
          }}
        />
      ),
      width: "40px",
      render: (row) => (
        <input 
          type="checkbox" 
          className="form-check-input m-0"
          checked={selectedRequestIds.includes(row.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedRequestIds(prev => [...prev, row.id]);
            } else {
              setSelectedRequestIds(prev => prev.filter(id => id !== row.id));
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      )
    },
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

  const paymentNotificationColumns: TableColumn<any>[] = [
    {
      header: "Số đơn hàng",
      render: (row) => {
        const dateStr = row.createdAt ? new Date(row.createdAt).toLocaleDateString("vi-VN") : "—";
        const isNew = row.status === "pending" && !readNotifIds.includes(row.id);
        return (
          <div className="d-flex flex-column position-relative">
            <div className="d-flex align-items-center gap-2">
              <span className="fw-bold" style={{ fontFamily: "'Roboto Condensed', sans-serif", color: "var(--primary)", whiteSpace: "nowrap" }}>
                {row.saleOrder?.code || row.code || "—"}
              </span>
              {isNew && (
                <span className="badge bg-danger rounded-pill shadow-sm" style={{ fontSize: "9px", padding: "3px 6px" }}>MỚI</span>
              )}
            </div>
            <span className="text-muted d-flex align-items-center gap-1" style={{ fontSize: "10.5px", whiteSpace: "nowrap" }}>
              <i className="bi bi-calendar3" style={{ fontSize: "9.5px" }} /> {dateStr}
            </span>
          </div>
        );
      },
    },
    {
      header: "Khách hàng",
      render: (row) => (
        <div className="d-flex flex-column">
          <span className="fw-semibold text-truncate d-inline-block" style={{ maxWidth: "150px" }}>
            {row.customer?.name || "Khách lẻ"}
          </span>
          {row.customer?.address && (
            <span className="text-muted text-truncate d-inline-block" style={{ fontSize: "11px", maxWidth: "150px" }}>
              <i className="bi bi-geo-alt-fill me-1"></i>
              {row.customer.address}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Số tiền",
      align: "right",
      render: (row) => (
        <span className="fw-bold" style={{ color: "var(--danger)" }}>
          {formatNumber(row.amount)} ₫
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
        let text = "Chờ xác nhận";
        if (status === "verified") {
          color = "#10b981"; // Success/Green
          bg = "rgba(16, 185, 129, 0.1)";
          text = "Đã xác nhận";
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

  return (
    <StandardPage
      title="Tài chính – Kế toán"
      description="Hệ thống quản lý tài chính, kế toán và báo cáo doanh nghiệp"
      icon="bi-cash-stack"
      color="emerald"
      useCard={false}
    >
      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" role="alert">
          <i className="bi bi-exclamation-triangle-fill" />
          <div>{error}</div>
        </div>
      )}

      <div className="row g-2 mt-0">
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

      <div className="row g-3 mt-0 flex-grow-1 flex-lg-nowrap" style={{ minHeight: 0 }}>
        {/* Vùng bên trái - chiếm tỷ lệ 7/12 */}
        <div className="col-12 col-lg-7 d-flex flex-column" style={{ minHeight: 0 }}>
          <WorkflowCard
            contentPadding="p-3 pt-2"
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
                      { label: "Chờ xác nhận", value: "pending" },
                      { label: "Đã xác nhận", value: "verified" },
                      { label: "Từ chối", value: "rejected" },
                    ]}
                    value={paymentNotificationStatus}
                    onChange={setPaymentNotificationStatus}
                    placeholder="Tất cả trạng thái"
                    width={180}
                  />
                  <div style={{ flex: 1 }}>
                    <SearchInput
                      value={paymentNotificationSearch}
                      onChange={setPaymentNotificationSearch}
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
              ) : currentStep === 3 && paymentNotificationsTotalPages > 1 ? (
                <div className="d-flex justify-content-end w-100">
                  <Pagination
                    page={paymentNotificationPage}
                    totalPages={paymentNotificationsTotalPages}
                    onChange={setPaymentNotificationPage}
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
                columns={paymentNotificationColumns}
                rows={paymentNotifications}
                loading={paymentNotificationsLoading}
                rowKey={(row) => row.id}
                emptyText="Không tìm thấy yêu cầu nào"
                compact
                onRowClick={(row) => {
                  setSelectedPaymentNotification(row);
                  if (row && row.id && !readNotifIds.includes(row.id)) {
                    const newRead = [...readNotifIds, row.id];
                    setReadNotifIds(newRead);
                    localStorage.setItem('readPaymentNotifications', JSON.stringify(newRead));
                  }
                }}
              />
            )}
          </WorkflowCard>
        </div>

        {/* Vùng bên phải - chiếm tỷ lệ 5/12 */}
        <div className="col-12 col-lg-5 d-flex flex-column" style={{ minHeight: 0 }}>
          <div
            className="bg-white rounded-4 shadow-sm border p-3 flex-grow-1 d-flex flex-column overflow-hidden"
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
                        className="btn btn-sm btn-primary fw-bold px-2 py-1 rounded-3 d-flex align-items-center gap-1"
                        onClick={handleSubmitToDirector}
                        style={{ fontSize: "11.5px", border: "none", backgroundColor: "var(--primary)" }}
                      >
                        <i className="bi bi-send" />
                        Trình giám đốc
                      </button>
                      <button 
                        className="btn btn-sm btn-danger fw-bold px-2 py-1 rounded-3 d-flex align-items-center gap-1"
                        onClick={() => {
                          if (selectedOrder) {
                            setShowDeleteConfirm(true);
                          } else if (selectedOrderIds.length > 0) {
                            setShowDeleteConfirm(true);
                          }
                        }}
                        style={{ fontSize: "11.5px", border: "none" }}
                      >
                        <i className="bi bi-trash" />
                        Xóa
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
                            {(() => {
                              let cName = selectedOrder.customer?.name;
                              let cPhone = selectedOrder.customer?.dienThoai;
                              let cAddress = selectedOrder.customer?.address;
                              
                              if (!selectedOrder.customer && selectedOrder.ghiChu) {
                                const match = selectedOrder.ghiChu.match(/Tên khách hàng:\s*(.*?)\s*Số điện thoại:\s*(.*?)\s*Địa chỉ giao hàng:\s*(.*)/);
                                if (match) {
                                  cName = match[1].trim();
                                  cPhone = match[2].trim();
                                  cAddress = match[3].trim();
                                }
                              }

                              return (
                                <div className="w-100">
                                  <div className="d-flex align-items-center justify-content-between mb-1 w-100">
                                    <div className="d-flex align-items-center gap-2">
                                      <span className="fw-semibold text-dark">{cName || "Khách vãng lai"}</span>
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
                                      onClick={(e) => handleViewItems(e, selectedOrder)}
                                    >
                                      <i className="bi bi-box-seam me-1"></i> Xem hàng hoá
                                    </button>
                                  </div>
                                  {cPhone && (
                                    <div className="text-muted small">{cPhone}</div>
                                  )}
                                  {cAddress && (
                                    <div className="text-muted small mt-1">{cAddress}</div>
                                  )}
                                </div>
                              );
                            })()}

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
                                } else if (text === "active" || text === "processing") {
                                  text = "Đang thực hiện";
                                  color = "#3b82f6";
                                  bg = "rgba(59, 130, 246, 0.1)";
                                } else if (text === "done" || text === "completed") {
                                  text = "Hoàn thành";
                                  color = "#10b981";
                                  bg = "rgba(16, 185, 129, 0.1)";
                                } else if (text === "cancelled") {
                                  text = "Đã huỷ";
                                  color = "#ef4444";
                                  bg = "rgba(239, 68, 68, 0.1)";
                                } else if (text === "in_production") {
                                  text = "Đang sản xuất";
                                  color = "#8b5cf6"; // Purple
                                  bg = "rgba(139, 92, 246, 0.1)";
                                } else if (text === "pending" || text === "unpaid") {
                                  text = "Chờ xử lý";
                                  color = "#f59e0b"; // Amber
                                  bg = "rgba(245, 158, 11, 0.1)";
                                } else if (text === "approved" || text === "confirmed") {
                                  text = "Đã duyệt";
                                  color = "#0ea5e9"; // Light Blue
                                  bg = "rgba(14, 165, 233, 0.1)";
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
                          <div className="d-flex align-items-center justify-content-between">
                            <span className="text-muted">Ngày đặt hàng:</span>
                            <span className="text-dark fw-medium">
                              {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleDateString("vi-VN") : "---"}
                            </span>
                          </div>
                          <div className="d-flex align-items-center justify-content-between">
                            <span className="text-muted">Ngày giao hàng:</span>
                            <span className="text-dark fw-medium">
                              {selectedOrder.ngayGiaoHang ? new Date(selectedOrder.ngayGiaoHang).toLocaleDateString("vi-VN") : (selectedOrder.ngayGiao ? new Date(selectedOrder.ngayGiao).toLocaleDateString("vi-VN") : "---")}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="border-bottom pb-2">
                        <span className="fw-bold text-secondary text-uppercase d-block mb-2" style={{ fontSize: "10px", letterSpacing: "0.05em" }}>
                          Thanh toán
                        </span>
                        <div className="d-flex flex-column gap-2">
                          <div className="d-flex align-items-center justify-content-between">
                            <span className="text-muted">Tổng tiền đơn hàng:</span>
                            <span className="text-dark fw-bold">{formatCurrency(selectedOrder.tongTien || 0)}</span>
                          </div>
                          <div className="d-flex align-items-center justify-content-between">
                            <span className="text-muted">Đã nhận thanh toán:</span>
                            <span className="text-success fw-bold">{formatCurrency(selectedOrder.daThanhToan || 0)}</span>
                          </div>
                          <div className="d-flex align-items-center justify-content-between">
                            <span className="text-muted">Còn phải thu:</span>
                            <span className="text-danger fw-bold">
                              {formatCurrency((selectedOrder.tongTien || 0) - (selectedOrder.daThanhToan || 0))}
                            </span>
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
                    <div className="d-flex align-items-center gap-2">
                      {selectedRequest.status === "pending" && (
                        <>
                          <button 
                            className="btn btn-sm btn-success fw-bold px-2 py-1 rounded-3 d-flex align-items-center gap-1"
                            onClick={handleApproveRequest}
                            style={{ fontSize: "11.5px", border: "none" }}
                          >
                            <i className="bi bi-check-lg" />
                            Duyệt
                          </button>
                          <button 
                            className="btn btn-sm btn-warning fw-bold px-2 py-1 rounded-3 d-flex align-items-center gap-1 text-white"
                            onClick={handleRejectRequest}
                            style={{ fontSize: "11.5px", border: "none" }}
                          >
                            <i className="bi bi-x-lg" />
                            Từ chối
                          </button>
                        </>
                      )}
                      <button 
                        className="btn btn-sm btn-danger fw-bold px-2 py-1 rounded-3 d-flex align-items-center gap-1"
                        onClick={() => {
                          if (selectedRequest) {
                            setShowRequestDeleteConfirm(true);
                          } else if (selectedRequestIds.length > 0) {
                            setShowRequestDeleteConfirm(true);
                          }
                        }}
                        style={{ fontSize: "11.5px", border: "none" }}
                      >
                        <i className="bi bi-trash" />
                        Xóa
                      </button>
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
                        ) : selectedRequest.entityType === "purchase_request" ? (
                          <div className="d-flex flex-column gap-2">
                            <div className="d-flex align-items-center justify-content-between">
                              <span className="text-muted">Đơn vị đề xuất:</span>
                              <span className="text-dark fw-semibold">{requestDetail.donVi || "—"}</span>
                            </div>
                            <div className="d-flex align-items-center justify-content-between">
                              <span className="text-muted">Người đề xuất:</span>
                              <span className="text-dark fw-semibold">{requestDetail.nguoiYeuCau || selectedRequest.requestedByName || "—"}</span>
                            </div>
                            <div className="d-flex align-items-center justify-content-between">
                              <span className="text-muted">Ngày tạo đơn:</span>
                              <span className="text-dark fw-medium">
                                {requestDetail.createdAt ? new Date(requestDetail.createdAt).toLocaleDateString("vi-VN") : "—"}
                              </span>
                            </div>
                            <div className="d-flex align-items-center justify-content-between">
                              <span className="text-muted">Ngày cần có:</span>
                              <span className="text-dark fw-medium">
                                {requestDetail.ngayCanCo ? new Date(requestDetail.ngayCanCo).toLocaleDateString("vi-VN") : "—"}
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
              !selectedPaymentNotification ? (
                <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center text-muted p-5">
                  <i className="bi bi-cash-stack fs-1 opacity-25 mb-3" />
                  <h6 className="fw-semibold">Chi tiết thông báo</h6>
                  <p className="small mb-0 opacity-75" style={{ maxWidth: "240px" }}>
                    Chọn một thông báo từ danh sách bên trái để xem thông tin chi tiết
                  </p>
                </div>
              ) : paymentNotificationDetailLoading ? (
                <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center text-muted p-5">
                  <div className="spinner-border text-primary spinner-border-sm mb-3" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="small mb-0 opacity-75">Đang tải chi tiết thông báo...</p>
                </div>
              ) : !paymentNotificationDetail ? (
                <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center text-danger p-5">
                  <i className="bi bi-exclamation-triangle-fill fs-2 mb-3" />
                  <p className="small mb-0">Không thể tải thông tin chi tiết thông báo này.</p>
                </div>
              ) : (
                <div className="flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
                  {/* Header */}
                  <div className="d-flex align-items-center justify-content-between border-bottom pb-3 mb-3 flex-shrink-0">
                    <div>
                      <h6 className="fw-bold text-dark mb-0" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
                        {paymentNotificationDetail.code || "Thông báo mới"}
                      </h6>
                      {paymentNotificationDetail.saleOrder && (
                        <div className="text-muted small mt-1">
                          Đơn hàng: <span className="fw-medium text-dark">{paymentNotificationDetail.saleOrder.code}</span>
                        </div>
                      )}
                    </div>
                    <div className="d-flex gap-2">
                      {paymentNotificationDetail.status === "pending" && (
                        <button
                          className="btn btn-sm btn-success fw-bold px-3 py-1 rounded-3 d-flex align-items-center gap-2"
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/finance/payment-notifications/${paymentNotificationDetail.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'verified' })
                              });
                              if (!res.ok) throw new Error("Lỗi khi xác nhận");
                              toast.success("Đã xác nhận tiền vào");
                              const updatedData = await res.json();
                              setPaymentNotificationDetail(updatedData);
                              setPaymentNotifications(prev => prev.map(p => p.id === updatedData.id ? updatedData : p));
                              setSelectedPaymentNotification(updatedData);
                            } catch (e: any) {
                              toast.error(e.message || "Có lỗi xảy ra");
                            }
                          }}
                        >
                          <i className="bi bi-check-circle" />
                          Xác nhận
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Body Scrollable */}
                  <div className="flex-grow-1 overflow-auto pe-2 custom-scrollbar">
                    <div className="d-flex flex-column gap-3" style={{ fontSize: "13px" }}>
                      
                      <div className="p-3 bg-light rounded-3 border">
                        <div className="d-flex flex-column gap-2">
                          <div className="d-flex align-items-center justify-content-between">
                            <span className="text-muted">Số tiền báo cáo:</span>
                            <span className="text-danger fw-bold fs-6">{formatCurrency(paymentNotificationDetail.amount || 0)}</span>
                          </div>
                          <div className="d-flex align-items-center justify-content-between">
                            <span className="text-muted">Hình thức:</span>
                            <span className="text-dark fw-semibold">
                              {paymentNotificationDetail.paymentMethod === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt'}
                            </span>
                          </div>
                          <div className="d-flex align-items-center justify-content-between">
                            <span className="text-muted">Khách hàng:</span>
                            <span className="text-dark fw-semibold">{paymentNotificationDetail.customer?.name || "Khách lẻ"}</span>
                          </div>
                          <div className="d-flex align-items-center justify-content-between">
                            <span className="text-muted">Người báo cáo:</span>
                            <span className="text-dark fw-semibold">{paymentNotificationDetail.reportedBy?.name || "—"}</span>
                          </div>
                          <div className="d-flex align-items-center justify-content-between">
                            <span className="text-muted">Thời gian báo:</span>
                            <span className="text-dark fw-medium">
                              {paymentNotificationDetail.createdAt ? new Date(paymentNotificationDetail.createdAt).toLocaleString("vi-VN") : "—"}
                            </span>
                          </div>
                          <div className="d-flex align-items-center justify-content-between">
                            <span className="text-muted">Trạng thái:</span>
                            <span>
                              {(() => {
                                const status = paymentNotificationDetail.status || "pending";
                                let color = "#f59e0b"; // Warning/Orange
                                let bg = "rgba(245, 158, 11, 0.1)";
                                let text = "Chờ xác nhận";
                                if (status === "verified") {
                                  color = "#10b981"; // Success/Green
                                  bg = "rgba(16, 185, 129, 0.1)";
                                  text = "Đã xác nhận";
                                } else if (status === "rejected") {
                                  color = "#ef4444"; // Danger/Red
                                  bg = "rgba(239, 68, 68, 0.1)";
                                  text = "Từ chối";
                                }
                                return (
                                  <span className="badge rounded-pill fw-bold" style={{ color, background: bg, padding: "4px 12px", fontSize: "12px" }}>
                                    {text}
                                  </span>
                                );
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {paymentNotificationDetail.saleOrder && (
                        <div className="p-3 bg-white rounded-3 border">
                          <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                            <i className="bi bi-cart3 text-primary"></i> Thông tin đơn hàng
                          </h6>
                          <div className="d-flex flex-column gap-2 mb-3">
                            <div className="d-flex align-items-center justify-content-between">
                              <span className="text-muted">Mã đơn hàng:</span>
                              <span className="text-dark fw-bold">{paymentNotificationDetail.saleOrder.code}</span>
                            </div>
                            <div className="d-flex align-items-center justify-content-between">
                              <span className="text-muted">Tổng giá trị:</span>
                              <span className="text-dark fw-bold">{formatCurrency(paymentNotificationDetail.saleOrder.tongTien || 0)}</span>
                            </div>
                            <div className="d-flex align-items-center justify-content-between">
                              <span className="text-muted">Đã thanh toán trước đó:</span>
                              <span className="text-success fw-bold">{formatCurrency(paymentNotificationDetail.saleOrder.daThanhToan || 0)}</span>
                            </div>
                            <div className="d-flex align-items-center justify-content-between">
                              <span className="text-muted">Công nợ còn lại (nếu duyệt):</span>
                              <span className="text-danger fw-bold">
                                {formatCurrency(Math.max(0, (paymentNotificationDetail.saleOrder.tongTien || 0) - (paymentNotificationDetail.saleOrder.daThanhToan || 0) - (paymentNotificationDetail.amount || 0)))}
                              </span>
                            </div>
                          </div>
                          
                          {paymentNotificationDetail.saleOrder.saleOrderItems && paymentNotificationDetail.saleOrder.saleOrderItems.length > 0 && (
                            <>
                              <hr className="my-2" />
                              <span className="text-muted small fw-medium mb-2 d-block">Sản phẩm trong đơn:</span>
                              <div className="d-flex flex-column gap-2">
                                {paymentNotificationDetail.saleOrder.saleOrderItems.map((item: any, idx: number) => (
                                  <div key={item.id || idx} className="d-flex justify-content-between align-items-start small p-2 bg-light rounded">
                                    <div className="pe-2">
                                      <div className="fw-medium text-dark">{item.tenHang || item.inventoryItem?.name}</div>
                                      <div className="text-muted mt-1">SL: {item.soLuong} {item.donVi || item.inventoryItem?.unit}</div>
                                    </div>
                                    <div className="fw-semibold whitespace-nowrap text-end">
                                      {formatCurrency(item.thanhTien)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}
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
            <h5 className="offcanvas-title fw-bold mb-1">Chi tiết hàng hoá / Vật tư</h5>
            <div className="text-muted" style={{ fontSize: 13 }}>
              {selectedOrder?.typeLabel} {selectedOrder?.code}
            </div>
          </div>
          <button type="button" className="btn-close" onClick={() => setShowItemsOffcanvas(false)}></button>
        </div>
        <div className="offcanvas-body p-4 custom-scrollbar bg-white">
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
                      const hasEnoughStock = (item.missingQty || 0) <= 0;
                      const isKhoChinh = item.warehouseCode === "KHO-CHINH";
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
        <div className="offcanvas-footer p-3 border-top bg-light">
          {selectedOrder && selectedOrder.keToanDuyet !== "approved" ? (
            <div className="d-flex justify-content-end gap-2 w-100">
              <button 
                className="btn btn-danger fw-bold px-4 rounded-3 d-flex align-items-center gap-2"
                onClick={handleReject}
              >
                <i className="bi bi-x-lg" />
                Từ chối
              </button>
              <button 
                className="btn btn-success fw-bold px-4 rounded-3 d-flex align-items-center gap-2"
                onClick={handleApprove}
              >
                <i className="bi bi-check-lg" />
                Duyệt đơn
              </button>
            </div>
          ) : (
            <button className="btn btn-secondary w-100" onClick={() => setShowItemsOffcanvas(false)}>
              Đóng
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Xác nhận xóa"
        message={
          <div className="text-dark">
            Bạn có chắc chắn muốn xóa {selectedOrderIds.length > 0 ? `${selectedOrderIds.length} đơn hàng đã chọn` : "đơn hàng này"} không?<br/>
            Hành động này không thể hoàn tác.
          </div>
        }
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        variant="danger"
        onConfirm={async () => {
          setShowDeleteConfirm(false);
          try {
            if (selectedOrderIds.length > 0) {
              await Promise.all(selectedOrderIds.map(id => 
                fetch(`/api/plan-finance/sales/${id}`, { method: 'DELETE' })
              ));
              setOrders(prev => prev.filter(o => !selectedOrderIds.includes(o.id)));
              if (selectedOrder && selectedOrderIds.includes(selectedOrder.id)) {
                setSelectedOrder(null);
              }
              setSelectedOrderIds([]);
            } else if (selectedOrder) {
              await fetch(`/api/plan-finance/sales/${selectedOrder.id}`, { method: 'DELETE' });
              setOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
              setSelectedOrder(null);
            }
            toast.success("Đã xóa đơn hàng thành công!");
          } catch (e) {
            toast.error("Lỗi khi xóa đơn hàng");
          }
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmDialog
        open={showRequestDeleteConfirm}
        title="Xác nhận xóa"
        message={
          <div className="text-dark">
            Bạn có chắc chắn muốn xóa {selectedRequestIds.length > 0 ? `${selectedRequestIds.length} yêu cầu đã chọn` : "yêu cầu này"} không?<br/>
            Hành động này không thể hoàn tác.
          </div>
        }
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        variant="danger"
        onConfirm={async () => {
          setShowRequestDeleteConfirm(false);
          try {
            if (selectedRequestIds.length > 0) {
              await Promise.all(selectedRequestIds.map(id => 
                fetch(`/api/approvals/${id}`, { method: 'DELETE' })
              ));
              setRequests(prev => prev.filter(r => !selectedRequestIds.includes(r.id)));
              if (selectedRequest && selectedRequestIds.includes(selectedRequest.id)) {
                setSelectedRequest(null);
              }
              setSelectedRequestIds([]);
            } else if (selectedRequest) {
              await fetch(`/api/approvals/${selectedRequest.id}`, { method: 'DELETE' });
              setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
              setSelectedRequest(null);
            }
            toast.success("Đã xóa yêu cầu thành công!");
          } catch (e) {
            toast.error("Lỗi khi xóa yêu cầu");
          }
        }}
        onCancel={() => setShowRequestDeleteConfirm(false)}
      />
    </StandardPage>
  );
}



