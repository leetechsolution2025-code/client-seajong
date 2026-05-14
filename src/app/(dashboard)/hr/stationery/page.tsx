"use client";

import React, { useState, useEffect } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { KPICard } from "@/components/ui/KPICard";
import { useToast } from "@/components/ui/Toast";
import { ModernStepper, ModernStepItem } from "@/components/ui/ModernStepper";
import { Table, TableColumn } from "@/components/ui/Table";
import { WorkflowCard } from "@/components/ui/WorkflowCard";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { SearchInput } from "@/components/ui/SearchInput";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { BrandButton } from "@/components/ui/BrandButton";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ───────────────────────────────────────────────────────────────────
interface RequestItem {
  id: string;
  item: {
    name: string;
  };
  quantity: number;
}

interface Request {
  id: string;
  code: string;
  status: "PENDING" | "APPROVED" | "DELIVERED" | "REJECTED" | "OVER_NORM";
  type: string;
  createdAt: string;
  note?: string;
  requester: {
    fullName: string;
  };
  department: {
    id: string;
    nameVi: string;
  };
  items: RequestItem[];
}

interface InventoryItem {
  id: string;
  name: string;
  code: string | null;
  categoryId: string;
  category: { id: string; name: string };
  unit: string | null;
  currentStock: number;
  minStock: number;
  price: number;
  isAsset: boolean;
  note: string | null;
  createdAt: string;
  status?: "NORMAL" | "LOW_STOCK" | "OUT_OF_STOCK";
}

interface Stats {
  pendingCount: number;
  lowStockCount: number;
  totalValue: number;
  assetsInUse: number;
}

interface DeptBudget {
  id: string | null;
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  monthlyBudget: number;
  spentAmount: number;
}

interface HandoverAsset {
  handoverId: string;
  assetId: string;
  assetName: string;
  assetCode: string | null;
  handoverDate: string;
  returnDate: string | null;
  condition: string;
  note?: string;
  status: string;
}

interface EmployeeHandover {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentName: string;
  assets: HandoverAsset[];
}

interface ItemNorm {
  itemId: string;
  itemName: string;
  itemCode: string | null;
  categoryName: string;
  unit: string | null;
  limitQty: number;
  limitAmount: number;
}

// ── Components ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Request["status"] }) {
  const map: Record<Request["status"], { label: string; cls: string }> = {
    PENDING: { label: "Chờ duyệt", cls: "bg-warning-subtle text-warning border-warning-subtle" },
    APPROVED: { label: "Đã duyệt", cls: "bg-info-subtle text-info border-info-subtle" },
    DELIVERED: { label: "Đã cấp phát", cls: "bg-success-subtle text-success border-success-subtle" },
    REJECTED: { label: "Từ chối", cls: "bg-danger-subtle text-danger border-danger-subtle" },
    OVER_NORM: { label: "Vượt định mức", cls: "bg-danger text-white" },
  };
  const m = map[status] || { label: status, cls: "bg-secondary-subtle text-secondary" };
  return (
    <span className={`badge border px-2 py-1 ${m.cls}`} style={{ fontSize: 11, fontWeight: 600 }}>
      {m.label}
    </span>
  );
}

// ── Constants ──────────────────────────────────────────────────────────────
const STEP_ITEMS: ModernStepItem[] = [
  { num: 1, id: "requests", title: "Yêu cầu & Cấp phát", desc: "Phê duyệt và bàn giao", icon: "bi-clipboard-check" },
  { num: 2, id: "inventory", title: "Quản lý tồn kho", desc: "Theo dõi số lượng hàng", icon: "bi-box-seam" },
  { num: 3, id: "norms", title: "Định mức phòng ban", desc: "Quản lý hạn mức sử dụng", icon: "bi-diagram-3" },
  { num: 4, id: "assets", title: "Theo dõi dụng cụ", desc: "Quản lý tài sản cá nhân", icon: "bi-person-badge" },
  { num: 5, id: "transactions", title: "Theo dõi xuất-nhập", desc: "Lịch sử biến động kho", icon: "bi-arrow-left-right" },
];

export default function StationeryToolsPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const { success, error: toastError } = useToast();

  // Filters
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  const [requests, setRequests] = useState<Request[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [departments, setDepartments] = useState<{ id: string; nameVi: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  // Modal States
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCat, setNewCat] = useState({ name: "", code: "" });
  const [isSubmittingCat, setIsSubmittingCat] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeletingCat, setIsDeletingCat] = useState(false);

  // Item Panel States
  const [showItemPanel, setShowItemPanel] = useState(false);
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [isDeleteItemConfirmOpen, setIsDeleteItemConfirmOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [itemForm, setItemForm] = useState({
    name: "",
    code: "",
    categoryId: "",
    unit: "cái",
    minStock: 0,
    currentStock: 0,
    price: 0,
    isAsset: false,
    note: ""
  });

  // Inventory Filters
  const [catFilter, setCatFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [stats, setStats] = useState<Stats>({
    pendingCount: 0,
    lowStockCount: 0,
    totalValue: 0,
    assetsInUse: 0
  });

  const [budgets, setBudgets] = useState<DeptBudget[]>([]);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editingBudgetVal, setEditingBudgetVal] = useState<number>(0);
  const [isUpdatingBudget, setIsUpdatingBudget] = useState(false);

  // Budget Filter States
  const [budgetSearch, setBudgetSearch] = useState("");
  const [budgetDeptFilter, setBudgetDeptFilter] = useState("");
  const [budgetStatusFilter, setBudgetStatusFilter] = useState("all");
  const [budgetMonthFilter, setBudgetMonthFilter] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM

  // Per-item Quota Offcanvas States
  const [showNormPanel, setShowNormPanel] = useState(false);
  const [selectedDeptForNorm, setSelectedDeptForNorm] = useState<DeptBudget | null>(null);
  const [itemNorms, setItemNorms] = useState<ItemNorm[]>([]);
  const [isLoadingNorms, setIsLoadingNorms] = useState(false);
  const [editingNormId, setEditingNormId] = useState<string | null>(null);
  const [editingNormVal, setEditingNormVal] = useState<number>(0);
  const [normSearch, setNormSearch] = useState("");

  // Step 4 - Asset Handover States
  const [handovers, setHandovers] = useState<EmployeeHandover[]>([]);
  const [handoverSearch, setHandoverSearch] = useState("");
  const [assetSearchQuery, setAssetSearchQuery] = useState("");
  const [handoverDeptFilter, setHandoverDeptFilter] = useState("");
  const [showHandoverPanel, setShowHandoverPanel] = useState(false);
  const [selectedEmpForHandover, setSelectedEmpForHandover] = useState<EmployeeHandover | null>(null);
  const [isLoadingHandovers, setIsLoadingHandovers] = useState(false);

  // Assignment Form States
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignForm, setAssignForm] = useState({
    assetId: "",
    condition: "Bình thường",
    note: "",
    handoverDate: new Date().toISOString().split('T')[0],
    returnDate: ""
  });

  const [selectedHandovers, setSelectedHandovers] = useState<string[]>([]);

  const activeTabId = STEP_ITEMS.find(s => s.num === currentStep)?.id || "requests";

  // Filtering Logic
  const filteredNorms = itemNorms.filter(n => 
    n.itemName.toLowerCase().includes(normSearch.toLowerCase()) ||
    n.categoryName.toLowerCase().includes(normSearch.toLowerCase())
  );

  const filteredBudgets = budgets.filter(b => {
    const matchesSearch = b.departmentName.toLowerCase().includes(budgetSearch.toLowerCase());
    const matchesDept = !budgetDeptFilter || b.departmentId === budgetDeptFilter;
    
    const percent = b.monthlyBudget > 0 ? (b.spentAmount / b.monthlyBudget) * 100 : 0;
    let matchesStatus = true;
    if (budgetStatusFilter === "over") matchesStatus = percent >= 100;
    else if (budgetStatusFilter === "near") matchesStatus = percent >= 80 && percent < 100;
    else if (budgetStatusFilter === "under") matchesStatus = percent < 80;
    else if (budgetStatusFilter === "unset") matchesStatus = b.monthlyBudget === 0;

    return matchesSearch && matchesDept && matchesStatus;
  });

  const filteredHandovers = handovers.filter(h => {
    const matchesSearch = h.employeeName.toLowerCase().includes(handoverSearch.toLowerCase()) || h.employeeCode.toLowerCase().includes(handoverSearch.toLowerCase());
    const matchesDept = !handoverDeptFilter || h.departmentName === departments.find(d => d.id === handoverDeptFilter)?.nameVi;
    
    // Asset search logic
    const matchesAsset = !assetSearchQuery || h.assets.some(a => 
      a.assetName.toLowerCase().includes(assetSearchQuery.toLowerCase()) || 
      (a.assetCode && a.assetCode.toLowerCase().includes(assetSearchQuery.toLowerCase()))
    );

    return matchesSearch && matchesDept && matchesAsset;
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqRes, itemRes, statRes, deptRes, catRes, budgetRes] = await Promise.all([
        fetch("/api/hr/stationery/requests"),
        fetch("/api/hr/stationery/items"),
        fetch("/api/hr/stationery/stats"),
        fetch("/api/hr/departments"),
        fetch("/api/hr/stationery/categories"),
        fetch("/api/hr/stationery/budgets")
      ]);

      const reqData = reqRes.ok ? await reqRes.json() : [];
      const itemData = itemRes.ok ? await itemRes.json() : [];
      const statData = statRes.ok ? await statRes.json() : { pendingCount: 0, lowStockCount: 0, totalValue: 0, assetsInUse: 0 };
      const deptData = deptRes.ok ? await deptRes.json() : { departments: [] };
      const catData = catRes.ok ? await catRes.json() : [];
      const budgetData = budgetRes.ok ? await budgetRes.json() : [];

      if (Array.isArray(reqData)) setRequests(reqData);
      if (Array.isArray(itemData)) setInventory(itemData);
      setStats(statData);
      setBudgets(Array.isArray(budgetData) ? budgetData : []);
      if (deptData && Array.isArray(deptData.departments)) setDepartments(deptData.departments);
      if (Array.isArray(catData)) setCategories(catData);
    } catch (err) {
      console.error("Fetch data error:", err);
      toastError("Lỗi", "Không thể tải dữ liệu văn phòng phẩm");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.name) return;

    setIsSubmittingCat(true);
    try {
      const res = await fetch("/api/hr/stationery/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCat)
      });

      if (res.ok) {
        const addedCat = await res.json();
        setCategories(prev => [...prev, addedCat]);
        success("Thành công", "Đã thêm nhóm mới");
        setShowCatModal(false);
        setNewCat({ name: "", code: "" });
      } else {
        toastError("Lỗi", "Không thể thêm nhóm");
      }
    } catch (err) {
      toastError("Lỗi", "Có lỗi xảy ra khi thêm nhóm");
    } finally {
      setIsSubmittingCat(false);
    }
  };

  const handleDeleteCategory = () => {
    if (!catFilter) return;
    setIsDeleteConfirmOpen(true);
  };

  const confirmedDeleteCategory = async () => {
    setIsDeletingCat(true);
    try {
      const res = await fetch(`/api/hr/stationery/categories/${catFilter}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setCategories(prev => prev.filter(c => c.id !== catFilter));
        setCatFilter("");
        success("Thành công", "Đã xóa nhóm vật tư");
        setIsDeleteConfirmOpen(false);
      } else {
        const msg = await res.text();
        toastError("Lỗi", msg || "Không thể xóa nhóm");
      }
    } catch (err) {
      toastError("Lỗi", "Có lỗi xảy ra khi xóa nhóm");
    } finally {
      setIsDeletingCat(false);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.name || !itemForm.categoryId) {
      toastError("Lỗi", "Vui lòng nhập đủ thông tin bắt buộc");
      return;
    }

    setIsSubmittingItem(true);
    try {
      const isEdit = !!editingItem;
      const res = await fetch("/api/hr/stationery/items", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { ...itemForm, id: editingItem.id } : itemForm)
      });

      if (res.ok) {
        success("Thành công", isEdit ? "Đã cập nhật thông tin" : "Đã thêm vật tư mới");
        fetchData();
        setShowItemPanel(false);
        setEditingItem(null);
        setItemForm({
          name: "", code: "", categoryId: "", unit: "cái",
          minStock: 0, currentStock: 0, price: 0, isAsset: false, note: ""
        });
      } else {
        const errMsg = await res.text();
        toastError("Lỗi", errMsg || "Có lỗi xảy ra");
      }
    } catch (err) {
      toastError("Lỗi", "Có lỗi xảy ra");
    } finally {
      setIsSubmittingItem(false);
    }
  };

  const openCreatePanel = () => {
    setEditingItem(null);
    setItemForm({
      name: "",
      code: "",
      categoryId: "",
      unit: "cái",
      minStock: 0,
      currentStock: 0,
      price: 0,
      isAsset: false,
      note: ""
    });
    setShowItemPanel(true);
  };

  const openEditPanel = (item: InventoryItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      code: item.code || "",
      categoryId: item.categoryId,
      unit: item.unit || "cái",
      minStock: item.minStock,
      currentStock: item.currentStock,
      price: item.price,
      isAsset: item.isAsset,
      note: item.note || ""
    });
    setShowItemPanel(true);
  };

  const handleDeleteItem = async () => {
    if (!editingItem) return;
    setIsDeletingItem(true);
    try {
      const res = await fetch(`/api/hr/stationery/items?id=${editingItem.id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        success("Thành công", "Đã xóa vật tư");
        fetchData();
        setShowItemPanel(false);
        setEditingItem(null);
        setIsDeleteItemConfirmOpen(false);
      } else {
        const msg = await res.text();
        toastError("Lỗi", msg || "Không thể xóa vật tư");
      }
    } catch (err) {
      toastError("Lỗi", "Có lỗi xảy ra khi xóa");
    } finally {
      setIsDeletingItem(false);
    }
  };

  const fetchNextCode = async (catId: string) => {
    if (!catId) return;
    try {
      const res = await fetch(`/api/hr/stationery/items/next-code?categoryId=${catId}`);
      if (res.ok) {
        const { nextCode } = await res.json();
        setItemForm(prev => ({ ...prev, code: nextCode }));
      }
    } catch (err) {
      console.error("Failed to fetch next code", err);
    }
  };

  const handleSaveBudget = async (deptId: string, val: number) => {
    setIsUpdatingBudget(true);
    try {
      const res = await fetch("/api/hr/stationery/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departmentId: deptId, monthlyBudget: val })
      });

      if (res.ok) {
        const updated = await res.json();
        setBudgets(prev => prev.map(b => b.departmentId === deptId ? { ...b, monthlyBudget: val, id: updated.id } : b));
        setEditingBudgetId(null);
        success("Thành công", "Đã cập nhật định mức ngân sách");
      } else {
        toastError("Lỗi", "Không thể cập nhật định mức");
      }
    } catch (err) {
      toastError("Lỗi", "Có lỗi xảy ra");
    } finally {
      setIsUpdatingBudget(false);
    }
  };

  const fetchItemNorms = async (deptId: string) => {
    setIsLoadingNorms(true);
    try {
      const res = await fetch(`/api/hr/stationery/norms?departmentId=${deptId}`);
      if (res.ok) {
        const data = await res.json();
        setItemNorms(data);
      }
    } catch (err) {
      toastError("Lỗi", "Không thể tải định mức vật tư");
    } finally {
      setIsLoadingNorms(false);
    }
  };

  const handleSaveNorm = async (itemId: string, val: number) => {
    if (!selectedDeptForNorm) return;
    try {
      const res = await fetch("/api/hr/stationery/norms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departmentId: selectedDeptForNorm.departmentId, itemId, limitQty: val })
      });
      if (res.ok) {
        setItemNorms(prev => prev.map(n => n.itemId === itemId ? { ...n, limitQty: val } : n));
        setEditingNormId(null);
        success("Thành công", "Đã cập nhật định mức vật tư");
      }
    } catch (err) {
      toastError("Lỗi", "Không thể cập nhật định mức");
    }
  };

  const fetchHandovers = async () => {
    setIsLoadingHandovers(true);
    try {
      const res = await fetch("/api/hr/stationery/handovers");
      if (res.ok) {
        const data = await res.json();
        setHandovers(data);
      }
    } catch (err) {
      toastError("Lỗi", "Không thể tải danh sách bàn giao");
    } finally {
      setIsLoadingHandovers(false);
    }
  };

  useEffect(() => {
    if (showHandoverPanel) {
      fetchAvailableAssets();
    }
  }, [showHandoverPanel]);

  const fetchAvailableAssets = async () => {
    try {
      const res = await fetch("/api/hr/stationery/assets/available");
      if (res.ok) {
        const data = await res.json();
        setAvailableAssets(data);
      }
    } catch (err) {
      console.error("Fetch assets error", err);
    }
  };

  const handleAssignAsset = async () => {
    if (!selectedEmpForHandover) return;
    
    const { assetId } = assignForm;
    const { employeeId } = selectedEmpForHandover;

    if (!assetId) {
      toastError("Lỗi", "Vui lòng chọn thiết bị cần bàn giao");
      return;
    }

    if (!assignForm.handoverDate) {
      toastError("Lỗi", "Vui lòng nhập ngày bàn giao");
      return;
    }

    setIsAssigning(true);
    try {
      const res = await fetch("/api/hr/stationery/handovers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employeeId,
          assetId: assetId,
          condition: assignForm.condition,
          note: assignForm.note,
          handoverDate: assignForm.handoverDate
        })
      });
      if (res.ok) {
        success("Thành công", "Đã bàn giao dụng cụ");
        fetchHandovers();
        fetchData();
        
        const newAsset = availableAssets.find(a => a.id === assetId);
        if (newAsset && selectedEmpForHandover) {
          const handoverData: HandoverAsset = {
            handoverId: Date.now().toString(),
            assetId: newAsset.id,
            assetName: newAsset.tenTaiSan,
            assetCode: newAsset.code,
            handoverDate: assignForm.handoverDate,
            returnDate: null,
            condition: assignForm.condition,
            note: assignForm.note,
            status: "USING"
          };
          setSelectedEmpForHandover({
            ...selectedEmpForHandover,
            assets: [handoverData, ...selectedEmpForHandover.assets]
          });
        }
        setAssignForm({ 
          assetId: "", 
          condition: "Bình thường", 
          note: "", 
          handoverDate: new Date().toISOString().split('T')[0], 
          returnDate: "" 
        });
      } else {
        const data = await res.json();
        toastError("Lỗi", data.error || "Không thể thực hiện bàn giao");
      }
    } catch (err) {
      toastError("Lỗi", "Lỗi kết nối máy chủ");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRecoverAsset = async (handoverId: string, returnDate: string) => {
    if (!handoverId) return;
    try {
      const res = await fetch("/api/hr/stationery/handovers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handoverId, returnDate })
      });

      if (res.ok) {
        // Success handled by bulk caller
        return true;
      }
      return false;
    } catch (err) {
      console.error("Recover error:", err);
      return false;
    }
  };

  const handleBulkRecover = async () => {
    if (selectedHandovers.length === 0) return;
    if (!assignForm.returnDate) {
      toastError("Lỗi", "Vui lòng nhập ngày thu hồi trước khi thực hiện");
      return;
    }
    
    setIsAssigning(true);
    let successCount = 0;
    
    try {
      for (const id of selectedHandovers) {
        const ok = await handleRecoverAsset(id, assignForm.returnDate);
        if (ok) successCount++;
      }
      
      if (successCount > 0) {
        success("Thành công", `Đã thu hồi ${successCount} dụng cụ và hoàn kho`);
        fetchHandovers();
        fetchData();
        setSelectedHandovers([]); // Clear selection
        
        // Refresh local panel data
        if (selectedEmpForHandover) {
          const updated = await fetch(`/api/hr/stationery/handovers?employeeId=${selectedEmpForHandover.employeeId}`).then(r => r.json());
          const empData = updated.find((e: any) => e.employeeId === selectedEmpForHandover.employeeId);
          if (empData) setSelectedEmpForHandover(empData);
        }
      }
    } finally {
      setIsAssigning(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (currentStep === 4) fetchHandovers();
  }, [currentStep]);

  // Filtered Data
  const filteredRequests = requests.filter(r => {
    if (deptFilter && r.department.id !== deptFilter) return false;
    if (statusFilter && r.status !== statusFilter) return false;
    if (monthFilter) {
      const rMonth = new Date(r.createdAt).toISOString().slice(0, 7);
      if (rMonth !== monthFilter) return false;
    }
    return true;
  });

  const filteredInventory = inventory.filter(i => {
    if (catFilter && i.category.id !== catFilter) return false;
    if (stockFilter === "low" && i.currentStock > i.minStock) return false;
    if (stockFilter === "available" && i.currentStock <= 0) return false;
    if (searchQuery && !i.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Aggregates
  const counts = {
    PENDING: requests.filter(r => r.status === "PENDING").length,
    APPROVED: requests.filter(r => r.status === "APPROVED").length,
    DELIVERED: requests.filter(r => r.status === "DELIVERED").length,
    REJECTED: requests.filter(r => r.status === "REJECTED").length,
    OVER_NORM: requests.filter(r => r.status === "OVER_NORM").length,
  };

  // Month Options (Last 6 months)
  const monthOptions = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const val = d.toISOString().slice(0, 7);
    const label = `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
    return { label, value: val };
  });


  // Bottom Toolbar Component for Step 3 (Budgets)
  const BudgetBottomToolbar = (
    <div className="d-flex align-items-center justify-content-between w-100" style={{ minHeight: 32 }}>
      <div className="d-flex align-items-center gap-2">
        <div style={{ width: 180 }}>
          <SearchInput
            placeholder="Tìm tên phòng ban..."
            value={budgetSearch}
            onChange={setBudgetSearch}
            className="border-0 shadow-sm hover-bg-light transition-all h-100"
          />
        </div>
        <FilterSelect
          placeholder="Phòng ban"
          options={departments.map(d => ({ label: d.nameVi, value: d.id }))}
          value={budgetDeptFilter}
          onChange={setBudgetDeptFilter}
          width={150}
          className="border-0 shadow-sm hover-bg-light transition-all"
        />
        <FilterSelect
          placeholder="Trạng thái"
          options={[
            { label: "Tất cả trạng thái", value: "all" },
            { label: "Vượt định mức", value: "over" },
            { label: "Sắp hết", value: "near" },
            { label: "Trong định mức", value: "under" },
            { label: "Chưa thiết lập", value: "unset" },
          ]}
          value={budgetStatusFilter}
          onChange={setBudgetStatusFilter}
          width={130}
          className="border-0 shadow-sm hover-bg-light transition-all"
        />
        <div className="d-flex align-items-center gap-2 bg-white px-2 rounded shadow-sm border hover-bg-light transition-all" style={{ height: 32 }}>
          <i className="bi bi-calendar3 text-primary opacity-75 ms-1" style={{ fontSize: 10 }} />
          <input 
            type="month" 
            className="border-0 bg-transparent small fw-bold"
            value={budgetMonthFilter}
            onChange={e => setBudgetMonthFilter(e.target.value)}
            style={{ outline: "none", fontSize: 11 }}
          />
        </div>
      </div>

      <div className="d-flex align-items-center gap-3 h-100">
        <div className="text-muted d-flex align-items-center" style={{ height: 20, fontSize: 11 }}>
          <i className="bi bi-info-circle me-1 text-primary opacity-75" />
          <span className="fw-medium">Tổng: {filteredBudgets.length} phòng ban</span>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-link btn-sm text-decoration-none p-0 text-muted hover-text-primary transition-all" style={{ fontSize: 11 }}><i className="bi bi-question-circle me-1" /> Hướng dẫn</button>
        </div>
      </div>
    </div>
  );

  // Bottom Toolbar Component for Step 4 (Assets)
  const HandoverBottomToolbar = (
    <div className="d-flex align-items-center justify-content-between w-100" style={{ minHeight: 32 }}>
      <div className="d-flex align-items-center gap-2">
        <FilterSelect
          placeholder="Tất cả phòng ban"
          options={departments.map(d => ({ label: d.nameVi, value: d.id }))}
          value={handoverDeptFilter}
          onChange={setHandoverDeptFilter}
          width={150}
          className="border-0 shadow-sm hover-bg-light transition-all"
        />
        <div style={{ width: 180 }}>
          <SearchInput
            placeholder="Tìm nhân viên..."
            value={handoverSearch}
            onChange={setHandoverSearch}
            className="border-0 shadow-sm hover-bg-light transition-all h-100"
          />
        </div>
        <div style={{ width: 180 }}>
          <SearchInput
            placeholder="Tìm dụng cụ..."
            value={assetSearchQuery}
            onChange={setAssetSearchQuery}
            className="border-0 shadow-sm hover-bg-light transition-all h-100"
          />
        </div>
      </div>

      <div className="d-flex align-items-center gap-3 h-100">
        <div className="text-muted d-flex align-items-center" style={{ height: 20, fontSize: 11 }}>
          <i className="bi bi-person-badge me-1 text-primary opacity-75" />
          <span className="fw-medium">Đang theo dõi: {filteredHandovers.length} nhân viên</span>
        </div>
      </div>
    </div>
  );

  // Bottom Toolbar Component for Step 1
  const RequestBottomToolbar = (
    <div className="d-flex align-items-center justify-content-between w-100" style={{ minHeight: 32 }}>
      <div className="d-flex align-items-center gap-2">
        <FilterSelect
          placeholder="Tất cả phòng ban"
          options={departments.map(d => ({ label: d.nameVi, value: d.id }))}
          value={deptFilter}
          onChange={setDeptFilter}
          width={160}
          className="border-0 shadow-sm hover-bg-light transition-all"
        />
        <FilterSelect
          placeholder="Trạng thái"
          options={[
            { label: "Chờ duyệt", value: "PENDING" },
            { label: "Đã duyệt", value: "APPROVED" },
            { label: "Đã cấp phát", value: "DELIVERED" },
            { label: "Từ chối", value: "REJECTED" },
            { label: "Vượt định mức", value: "OVER_NORM" },
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
          width={130}
          className="border-0 shadow-sm hover-bg-light transition-all"
        />
        <FilterSelect
          placeholder="Tháng"
          options={monthOptions}
          value={monthFilter}
          onChange={setMonthFilter}
          width={110}
          className="border-0 shadow-sm hover-bg-light transition-all"
        />
      </div>

      <div className="d-flex align-items-center gap-3 h-100">
        <div className="d-flex align-items-center gap-2 bg-white rounded-pill px-3 py-0 border shadow-sm" style={{ fontSize: 11, height: 32 }}>
          <span className="text-muted fw-medium">Tổng hợp:</span>
          <span className="text-warning fw-bold">{counts.PENDING} chờ</span>
          <span className="text-info fw-bold">{counts.APPROVED} duyệt</span>
          <span className="text-success fw-bold">{counts.DELIVERED} cấp</span>
          <span className="text-danger fw-bold">{counts.REJECTED + counts.OVER_NORM} lỗi</span>
        </div>
        <div className="text-muted border-start ps-3 d-flex align-items-center" style={{ height: 20 }}>
          <i className="bi bi-info-circle me-1 text-primary opacity-75" />
          <span className="fw-medium">Tổng: {filteredRequests.length}/{requests.length}</span>
        </div>
      </div>
    </div>
  );

  // Bottom Toolbar Component for Step 2
  const InventoryBottomToolbar = (
    <div className="d-flex align-items-center justify-content-between w-100" style={{ minHeight: 32 }}>
      <div className="d-flex align-items-center gap-2">
        <SearchInput
          placeholder="Tìm tên vật tư..."
          value={searchQuery}
          onChange={setSearchQuery}
          style={{ width: 220 }}
          className="shadow-sm"
        />
        <div className="d-flex align-items-center gap-1 ms-2">
          <FilterSelect
            placeholder="Tất cả nhóm"
            options={categories.map(c => ({ label: c.name, value: c.id }))}
            value={catFilter}
            onChange={setCatFilter}
            width={160}
            className="border-0 shadow-sm hover-bg-light transition-all"
          />
          <button
            className="btn btn-light btn-sm border-0 shadow-sm px-2"
            style={{ height: 32, borderRadius: 8 }}
            onClick={() => setShowCatModal(true)}
            title="Thêm nhóm mới"
          >
            <i className="bi bi-plus-lg" />
          </button>

          {catFilter && (
            <button
              className="btn btn-outline-danger btn-sm border-0 shadow-sm px-2 hover-bg-danger transition-all"
              style={{ height: 32, borderRadius: 8 }}
              onClick={handleDeleteCategory}
              title="Xóa nhóm đang chọn"
            >
              <i className="bi bi-trash" />
            </button>
          )}
        </div>
        <FilterSelect
          placeholder="Trạng thái tồn kho"
          options={[
            { label: "Sắp hết hàng", value: "low" },
            { label: "Còn hàng", value: "available" },
          ]}
          value={stockFilter}
          onChange={setStockFilter}
          width={150}
          className="border-0 shadow-sm hover-bg-light transition-all"
        />
      </div>

      <div className="d-flex align-items-center gap-2 h-100">
        <BrandButton
          variant="outline"
          icon="bi-cart-plus"
          style={{ height: 32, fontSize: 12, padding: "0 12px" }}
        >
          Mua hàng
        </BrandButton>
        <BrandButton
          icon="bi-plus-circle"
          style={{ height: 32, fontSize: 12, padding: "0 12px" }}
          onClick={openCreatePanel}
        >
          Tạo mới
        </BrandButton>
      </div>
    </div>
  );

  // Define Table Columns
  const requestColumns: TableColumn<Request>[] = [
    { header: "Mã yêu cầu", render: (r) => <span className="fw-bold text-primary">{r.code}</span>, width: "120px" },
    {
      header: "Người yêu cầu",
      render: (r) => (
        <div>
          <div className="fw-bold" style={{ fontSize: 13 }}>{r.requester.fullName}</div>
          <div className="text-muted" style={{ fontSize: 11 }}>{r.department.nameVi}</div>
        </div>
      )
    },
    {
      header: "Nội dung vật tư",
      render: (r) => (
        <span style={{ fontSize: 13 }}>
          {r.items.map(i => `${i.item.name} (${i.quantity})`).join(", ")}
        </span>
      )
    },
    {
      header: "Ngày tạo",
      render: (r) => (
        <span className="text-muted" style={{ fontSize: 12 }}>
          {new Date(r.createdAt).toLocaleDateString("vi-VN")}
        </span>
      )
    },
    { header: "Trạng thái", render: (r) => <StatusBadge status={r.status} />, width: "120px" },
    {
      header: "Thao tác",
      align: "right",
      render: (r) => (
        <div className="dropdown">
          <button className="btn btn-light btn-sm rounded-circle shadow-none p-0" style={{ width: 28, height: 28 }} data-bs-toggle="dropdown">
            <i className="bi bi-three-dots-vertical" />
          </button>
          <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0 rounded-3">
            <li><button className="dropdown-item py-2" style={{ fontSize: 12 }}><i className="bi bi-eye me-2" />Xem chi tiết</button></li>
            {r.status === "PENDING" && (
              <li><button className="dropdown-item py-2 text-success" style={{ fontSize: 12 }}><i className="bi bi-check-circle me-2" />Duyệt yêu cầu</button></li>
            )}
            {r.status === "APPROVED" && (
              <li><button className="dropdown-item py-2 text-primary" style={{ fontSize: 12 }}><i className="bi bi-truck me-2" />Xác nhận cấp phát</button></li>
            )}
            <li><hr className="dropdown-divider" /></li>
            <li><button className="dropdown-item py-2 text-danger" style={{ fontSize: 12 }}><i className="bi bi-x-circle me-2" />Từ chối</button></li>
          </ul>
        </div>
      ),
      width: "80px"
    },
  ];

  const inventoryColumns: TableColumn<InventoryItem>[] = [
    {
      header: (
        <input 
          type="checkbox" 
          className="form-check-input shadow-none cursor-pointer" 
          checked={inventory.length > 0 && selectedItems.length === inventory.length}
          onChange={e => {
            if (e.target.checked) setSelectedItems(inventory.map(i => i.id));
            else setSelectedItems([]);
          }}
        />
      ),
      render: (i) => (
        <input 
          type="checkbox" 
          className="form-check-input shadow-none cursor-pointer" 
          checked={selectedItems.includes(i.id)}
          onChange={() => {
            setSelectedItems(prev => 
              prev.includes(i.id) ? prev.filter(id => id !== i.id) : [...prev, i.id]
            );
          }}
        />
      ),
      width: "40px",
      align: "center"
    },
    { 
      header: "Tên vật tư / dụng cụ", 
      render: (i) => (
        <div className="d-flex flex-column">
          <span className="fw-bold" style={{ fontSize: 13 }}>{i.name}</span>
          {i.note && (
            <div className="text-muted d-flex align-items-center gap-1" style={{ fontSize: 10.5, fontWeight: 400, marginTop: 1 }}>
              <i className="bi bi-info-circle" style={{ fontSize: 9 }} />
              <span className="text-truncate" style={{ maxWidth: 250 }}>{i.note}</span>
            </div>
          )}
        </div>
      )
    },
    { header: "Danh mục", render: (i) => <span className="badge bg-light text-dark border fw-normal">{i.category.name}</span> },
    { header: "Đơn vị", render: (i) => i.unit, width: "80px" },
    {
      header: "Tồn kho",
      align: "center",
      render: (i) => <span className={`fw-bold ${i.currentStock < i.minStock ? "text-danger" : ""}`}>{i.currentStock}</span>,
      width: "100px"
    },
    { header: "Tối thiểu", align: "center", render: (i) => <span className="text-muted">{i.minStock}</span>, width: "100px" },
    { header: "Đơn giá", align: "right", render: (i) => <span className="fw-bold">{i.price.toLocaleString("vi-VN")}đ</span> },
    {
      header: "Tình trạng",
      align: "right",
      render: (i) => (
        itemStatusBadge(i.currentStock, i.minStock)
      ),
      width: "120px"
    },
  ];

  const itemStatusBadge = (stock: number, min: number) => {
    if (stock <= 0) return <span className="text-danger" style={{ fontSize: 11, fontWeight: 700 }}>HẾT HÀNG</span>;
    if (stock < min) return <span className="text-warning" style={{ fontSize: 11, fontWeight: 700 }}>SẮP HẾT</span>;
    return <span className="text-success" style={{ fontSize: 11, fontWeight: 700 }}>SẴN SÀNG</span>;
  };

  const budgetColumns: TableColumn<DeptBudget>[] = [
    { 
      header: "Phòng ban", 
      render: (b) => (
        <div className="d-flex flex-column">
          <span className="fw-bold" style={{ fontSize: 13 }}>{b.departmentName}</span>
        </div>
      )
    },
    {
      header: "Ngân sách tháng",
      render: (b) => {
        const isEditing = editingBudgetId === b.departmentId;
        return (
          <div className="d-flex align-items-center gap-2">
            {isEditing ? (
              <div className="d-flex align-items-center gap-1">
                <input
                  type="number"
                  className="form-control form-control-sm shadow-sm"
                  style={{ width: 120, fontSize: 13, fontWeight: 600 }}
                  value={editingBudgetVal}
                  onChange={e => setEditingBudgetVal(Number(e.target.value))}
                  autoFocus
                />
                <button 
                  className="btn btn-primary btn-sm px-2" 
                  onClick={() => handleSaveBudget(b.departmentId, editingBudgetVal)}
                  disabled={isUpdatingBudget}
                >
                  {isUpdatingBudget ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-check-lg" />}
                </button>
                <button className="btn btn-light btn-sm px-2" onClick={() => setEditingBudgetId(null)} disabled={isUpdatingBudget}>
                  <i className="bi bi-x-lg" />
                </button>
              </div>
            ) : (
              <div 
                className="fw-bold text-primary cursor-pointer hover-text-dark transition-all d-flex align-items-center gap-2"
                onClick={() => {
                  setEditingBudgetId(b.departmentId);
                  setEditingBudgetVal(b.monthlyBudget);
                }}
              >
                {b.monthlyBudget.toLocaleString("vi-VN")}đ
                <i className="bi bi-pencil-square opacity-50" style={{ fontSize: 11 }} />
              </div>
            )}
          </div>
        );
      },
      width: "200px"
    },
    {
      header: "Đã sử dụng",
      render: (b) => {
        const percent = b.monthlyBudget > 0 ? Math.round((b.spentAmount / b.monthlyBudget) * 100) : 0;
        let color = "bg-success";
        if (percent > 90) color = "bg-danger";
        else if (percent > 70) color = "bg-warning";

        return (
          <div className="w-100" style={{ maxWidth: 200 }}>
            <div className="d-flex justify-content-between mb-1" style={{ fontSize: 11 }}>
              <span className="fw-bold">{b.spentAmount.toLocaleString("vi-VN")}đ</span>
              <span className="text-muted">{percent}%</span>
            </div>
            <div className="progress" style={{ height: 4, borderRadius: 2 }}>
              <div 
                className={`progress-bar ${color} transition-all`} 
                role="progressbar" 
                style={{ width: `${Math.min(percent, 100)}%` }} 
              />
            </div>
          </div>
        );
      }
    },
    {
      header: "Còn lại",
      render: (b) => {
        const remaining = b.monthlyBudget - b.spentAmount;
        return (
          <span className={`fw-bold ${remaining < 0 ? "text-danger" : "text-dark"}`}>
            {remaining.toLocaleString("vi-VN")}đ
          </span>
        );
      },
      width: "140px",
      align: "right"
    },
    {
      header: "Tình trạng",
      render: (b) => {
        if (b.monthlyBudget === 0) return <span className="badge bg-light text-muted border fw-normal">Chưa thiết lập</span>;
        if (b.spentAmount >= b.monthlyBudget) return <span className="badge bg-danger-subtle text-danger border border-danger-subtle fw-bold">VƯỢT ĐỊNH MỨC</span>;
        if (b.spentAmount > b.monthlyBudget * 0.8) return <span className="badge bg-warning-subtle text-warning border border-warning-subtle fw-bold">SẮP HẾT</span>;
        return <span className="badge bg-success-subtle text-success border border-success-subtle fw-bold">AN TOÀN</span>;
      },
      width: "120px",
      align: "right"
    }
  ];

  const normColumns: TableColumn<ItemNorm>[] = [
    { 
      header: "Vật tư", 
      render: (n) => (
        <div>
          <div className="fw-bold">{n.itemName}</div>
          <div className="text-muted" style={{ fontSize: 10 }}>{n.categoryName}</div>
        </div>
      ) 
    },
    { header: "Đơn vị", render: (n) => n.unit, width: "70px", align: "center" },
    {
      header: "Định mức/Tháng",
      render: (n) => {
        const isEditing = editingNormId === n.itemId;
        return (
          <div className="d-flex align-items-center gap-2">
            {isEditing ? (
              <div className="d-flex align-items-center gap-1">
                <input
                  type="number"
                  className="form-control form-control-sm"
                  style={{ width: 60 }}
                  value={editingNormVal}
                  onChange={e => setEditingNormVal(Number(e.target.value))}
                  autoFocus
                />
                <button className="btn btn-primary btn-sm px-2" onClick={() => handleSaveNorm(n.itemId, editingNormVal)}>
                  <i className="bi bi-check-lg" />
                </button>
              </div>
            ) : (
              <div 
                className="fw-bold text-primary cursor-pointer d-flex align-items-center gap-2"
                onClick={() => {
                  setEditingNormId(n.itemId);
                  setEditingNormVal(n.limitQty);
                }}
              >
                {n.limitQty}
                <i className="bi bi-pencil-square opacity-50" style={{ fontSize: 11 }} />
              </div>
            )}
          </div>
        );
      },
      width: "120px"
    }
  ];

  const handoverDetailColumns: TableColumn<HandoverAsset>[] = [
    {
      header: (
        <input 
          type="checkbox" 
          className="form-check-input" 
          checked={selectedHandovers.length > 0 && selectedHandovers.length === selectedEmpForHandover?.assets.filter(a => a.status === 'USING').length}
          onChange={(e) => {
            if (e.target.checked) {
              const activeIds = selectedEmpForHandover?.assets.filter(a => a.status === 'USING').map(a => a.handoverId) || [];
              setSelectedHandovers(activeIds);
            } else {
              setSelectedHandovers([]);
            }
          }}
        />
      ),
      render: (a) => (
        <input 
          type="checkbox" 
          className="form-check-input shadow-none"
          disabled={a.status !== 'USING'}
          checked={selectedHandovers.includes(a.handoverId)}
          onChange={(e) => {
            if (e.target.checked) setSelectedHandovers(prev => [...prev, a.handoverId]);
            else setSelectedHandovers(prev => prev.filter(id => id !== a.handoverId));
          }}
        />
      ),
      width: "40px"
    },
    { header: "Tên dụng cụ", render: (a) => a.assetName },
    { 
      header: "Trạng thái", 
      render: (a) => (
        <span className={`badge ${a.status?.toUpperCase() === 'USING' ? 'bg-primary-subtle text-primary' : 'bg-secondary-subtle text-secondary'} border rounded-pill`} style={{ fontSize: 10 }}>
          {a.status?.toUpperCase() === 'USING' ? 'Đang dùng' : 'Đã trả'}
        </span>
      ),
      width: "100px",
      align: "right"
    }
  ];

  const handoverColumns: TableColumn<EmployeeHandover>[] = [
    {
      header: "Nhân viên",
      render: (h) => (
        <div className="d-flex align-items-center gap-2">
          <div className="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width: 32, height: 32, fontSize: 12, fontWeight: "bold" }}>
            {h.employeeName.split(" ").pop()?.charAt(0)}
          </div>
          <div>
            <div className="fw-bold">{h.employeeName}</div>
            <div className="text-muted" style={{ fontSize: 10 }}>{h.employeeCode}</div>
          </div>
        </div>
      ),
      width: "220px"
    },
    { header: "Phòng ban", render: (h) => h.departmentName, width: "180px" },
    {
      header: "Dụng cụ đang giữ",
      render: (h) => {
        const activeAssets = h.assets.filter(a => a.status?.toUpperCase() === 'USING');
        return (
          <div className="d-flex flex-wrap gap-1">
            {activeAssets.map(a => (
              <span key={a.handoverId} className="badge bg-light text-dark border fw-normal" style={{ fontSize: 10 }}>
                <i className="bi bi-laptop me-1 text-primary opacity-75" />
                {a.assetName}
              </span>
            ))}
            {activeAssets.length === 0 && <span className="text-muted opacity-50 italic">Chưa có dữ liệu</span>}
          </div>
        );
      }
    },
    {
      header: "Số lượng",
      render: (h) => {
        const activeCount = h.assets.filter(a => a.status?.toUpperCase() === 'USING').length;
        return <span className={`badge rounded-pill ${activeCount > 0 ? 'bg-primary' : 'bg-secondary'}`}>{activeCount}</span>;
      },
      width: "100px",
      align: "center"
    }
  ];



  return (
    <StandardPage
      title="Văn phòng phẩm và dụng cụ"
      description="Quản lý định mức, phê duyệt và cấp phát vật tư doanh nghiệp"
      icon="bi-archive"
      color="rose"
      useCard={false}
    >
      {/* ── KPI Cards ── */}
      <div className="row g-3 mb-3">
        <KPICard
          label="Yêu cầu chờ duyệt"
          value={loading ? "—" : stats.pendingCount}
          icon="bi-clock-history"
          accent="#f59e0b"
          subtitle="Cần xử lý ngay"
          colClass="col-12 col-md-3"
        />
        <KPICard
          label="Vật tư dưới mức tối thiểu"
          value={loading ? "—" : stats.lowStockCount}
          icon="bi-exclamation-triangle"
          accent="#ef4444"
          subtitle="Cần nhập hàng thêm"
          colClass="col-12 col-md-3"
        />
        <KPICard
          label="Giá trị tồn kho"
          value={loading ? "—" : stats.totalValue.toLocaleString("vi-VN")}
          suffix="đ"
          icon="bi-currency-dollar"
          accent="#10b981"
          subtitle="Tổng giá trị tài sản"
          colClass="col-12 col-md-3"
        />
        <KPICard
          label="Dụng cụ đang bàn giao"
          value={loading ? "—" : stats.assetsInUse}
          icon="bi-person-check"
          accent="#6366f1"
          subtitle="Đang được sử dụng"
          colClass="col-12 col-md-3"
        />
      </div>

      {/* ── Workflow Card ── */}
      <WorkflowCard
        contentPadding="p-0"
        toolbar={null}
        bottomToolbar={
          activeTabId === "requests" ? RequestBottomToolbar : (
            activeTabId === "inventory" ? InventoryBottomToolbar : (
              activeTabId === "norms" ? BudgetBottomToolbar : (
                activeTabId === "assets" ? HandoverBottomToolbar : (
                  activeTabId === "transactions" ? (
                    <div className="d-flex align-items-center justify-content-between w-100" style={{ minHeight: 32 }}>
                      <div className="d-flex align-items-center gap-2">
                        <div className="d-flex align-items-center gap-2 bg-white px-2 rounded shadow-sm border" style={{ height: 32 }}>
                          <i className="bi bi-calendar3 text-primary opacity-75 ms-1" style={{ fontSize: 10 }} />
                          <input type="date" className="border-0 bg-transparent small fw-bold" style={{ outline: "none", fontSize: 11 }} />
                          <span className="text-muted small">đến</span>
                          <input type="date" className="border-0 bg-transparent small fw-bold" style={{ outline: "none", fontSize: 11 }} />
                        </div>
                        <FilterSelect
                          placeholder="Loại giao dịch"
                          options={[
                            { label: "Tất cả", value: "all" },
                            { label: "Nhập kho", value: "import" },
                            { label: "Xuất kho", value: "export" },
                          ]}
                          value=""
                          onChange={() => {}}
                          width={130}
                          className="border-0 shadow-sm hover-bg-light transition-all"
                        />
                        <div style={{ width: 180 }}>
                          <SearchInput placeholder="Tìm vật tư / người thực hiện..." className="border-0 shadow-sm" />
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-3 h-100">
                        <button className="btn btn-outline-primary btn-sm rounded-pill px-3" style={{ fontSize: 11, height: 28 }}>
                          <i className="bi bi-file-earmark-excel me-1" /> Xuất báo cáo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="d-flex align-items-center justify-content-between text-muted w-100" style={{ fontSize: 12, minHeight: 32 }}>
                      <div className="d-flex align-items-center gap-3">
                        <span className="d-flex align-items-center"><i className="bi bi-info-circle me-1 text-primary opacity-75" /> {`Tổng số bản ghi`}</span>
                      </div>
                      <div className="d-flex gap-2">
                        <button className="btn btn-link btn-sm text-decoration-none p-0 text-muted hover-text-primary transition-all" style={{ fontSize: 12 }}><i className="bi bi-question-circle me-1" /> Hướng dẫn</button>
                      </div>
                    </div>
                  )
                )
              )
            )
          )
        }
        stepper={
          <ModernStepper
            steps={STEP_ITEMS}
            currentStep={currentStep}
            onStepChange={setCurrentStep}
            paddingX={0}
          />
        }
      >
        {activeTabId === "requests" && (
          <Table
            rows={filteredRequests}
            columns={requestColumns}
            loading={loading}
            rowKey={(r) => r.id}
          />
        )}

        {activeTabId === "inventory" && (
          <div className="table-dense-container">
            <Table
              rows={filteredInventory}
              columns={inventoryColumns}
              loading={loading}
              rowKey={(i) => i.id}
              onRowClick={(i) => openEditPanel(i)}
            />
          </div>
        )}

        {activeTabId === "norms" && (
          <div className="table-dense-container h-100">
            <Table
              rows={filteredBudgets}
              columns={budgetColumns}
              loading={loading}
              rowKey={(b) => b.departmentId}
              onRowClick={(row) => {
                setSelectedDeptForNorm(row);
                setShowNormPanel(true);
                fetchItemNorms(row.departmentId);
              }}
            />
          </div>
        )}

        {activeTabId === "assets" && (
          <div className="table-dense-container h-100">
            <Table
              rows={filteredHandovers}
              columns={handoverColumns}
              loading={loading || isLoadingHandovers}
              rowKey={(h) => h.employeeId}
              onRowClick={(row) => {
                setSelectedEmpForHandover(row);
                setShowHandoverPanel(true);
              }}
            />
          </div>
        )}

        {activeTabId === "transactions" && (
          <div className="table-dense-container h-100">
            <Table
              rows={[]} // TODO: Hook actual transactions data
              columns={[
                { header: "Ngày giao dịch", render: () => <span className="text-muted">13/05/2026</span>, width: "140px" },
                { header: "Vật tư", render: () => <span className="fw-bold">Giấy A4 Double A</span> },
                { header: "Loại", render: () => <span className="badge bg-success-subtle text-success border border-success-subtle">NHẬP KHO</span>, width: "120px" },
                { header: "Số lượng", render: () => <span className="fw-bold text-success">+50</span>, width: "100px", align: "center" },
                { header: "Người thực hiện", render: () => <span>Admin</span> },
                { header: "Ghi chú", render: () => <span className="text-muted small">Nhập kho định kỳ</span> },
              ]}
              loading={false}
              rowKey={(t: any) => t.id}
            />
            <div className="p-5 text-center text-muted">
              <i className="bi bi-clock-history fs-1 opacity-25 d-block mb-3" />
              <p>Chưa có lịch sử biến động kho trong thời gian này.</p>
            </div>
          </div>
        )}
      </WorkflowCard>

      <style jsx global>{`
        .hover-bg-light:hover {
          background-color: var(--bs-light) !important;
        }
        .transition-all {
          transition: all 0.2s ease-in-out;
        }
        .table-dense-container .table td, 
        .table-dense-container .table th {
          padding-top: 6px !important;
          padding-bottom: 6px !important;
          font-size: 13px;
        }
      `}</style>

      {/* ── Delete Item Confirmation ── */}
      <ConfirmDialog
        open={isDeleteItemConfirmOpen}
        title="Xác nhận xóa vật tư"
        message={
          <>
            Bạn có chắc chắn muốn xóa vật tư <b>{editingItem?.name}</b>? 
            Thao tác này sẽ gỡ bỏ hoàn toàn dữ liệu kho của vật tư này.
          </>
        }
        confirmLabel="Xóa vĩnh viễn"
        variant="danger"
        loading={isDeletingItem}
        onConfirm={handleDeleteItem}
        onCancel={() => setIsDeleteItemConfirmOpen(false)}
      />

      {/* ── Add Category Modal ── */}
      {showCatModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 16 }}>
              <form onSubmit={handleAddCategory}>
                <div className="modal-header border-0 pb-0">
                  <h6 className="modal-title fw-bold">Thêm nhóm vật tư</h6>
                  <button type="button" className="btn-close" onClick={() => setShowCatModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-muted">Tên nhóm <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control form-control-sm border-0 bg-light"
                      placeholder="VD: Văn phòng phẩm"
                      required
                      value={newCat.name}
                      onChange={e => {
                        const val = e.target.value;
                        const code = val
                          .normalize("NFD")
                          .replace(/[\u0300-\u036f]/g, "")
                          .replace(/[đĐ]/g, "d")
                          .replace(/[^a-zA-Z0-9 ]/g, "")
                          .replace(/\s+/g, "")
                          .toUpperCase();
                        setNewCat({ name: val, code });
                      }}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <BrandButton variant="outline" type="button" onClick={() => setShowCatModal(false)} disabled={isSubmittingCat}>
                    Hủy
                  </BrandButton>
                  <BrandButton type="submit" loading={isSubmittingCat} icon="bi-check-lg">
                    Lưu lại
                  </BrandButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Dialog ── */}
      <ConfirmDialog
        open={isDeleteConfirmOpen}
        title="Xác nhận xóa nhóm"
        message={
          <>
            Bạn có chắc chắn muốn xóa nhóm <b>{categories.find(c => c.id === catFilter)?.name}</b>?
            Thao tác này không thể hoàn tác.
          </>
        }
        confirmLabel="Xóa vĩnh viễn"
        variant="danger"
        loading={isDeletingCat}
        onConfirm={confirmedDeleteCategory}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />

      {/* ── Add Item Offcanvas Panel ── */}
      <AnimatePresence>
        {showItemPanel && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowItemPanel(false)}
              className="position-fixed inset-0" 
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)", zIndex: 10000, top: 0, left: 0, right: 0, bottom: 0 }}
            />
            {/* Panel */}
            <motion.div 
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 250 }}
              className="position-fixed top-0 bottom-0 right-0 shadow-lg border-start"
              style={{ 
                width: 400, 
                zIndex: 10001, 
                right: 0, 
                background: "var(--card)", 
                overflow: "hidden"
              }}
            >
              <div className="h-100 d-flex flex-column">
                {/* Header */}
                <div className="p-3 px-4 border-bottom d-flex align-items-center justify-content-between bg-light/30">
                  <div className="d-flex align-items-center gap-3">
                    <div className="text-primary fs-5">
                      <i className={`bi ${editingItem ? "bi-pencil-square" : "bi-box-seam"}`} />
                    </div>
                    <h6 className="mb-0 fw-bold">{editingItem ? "Chỉnh sửa văn phòng phẩm, dụng cụ" : "Thêm văn phòng phẩm, dụng cụ"}</h6>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    {editingItem && (
                      <button 
                        className="btn btn-outline-danger btn-sm rounded-circle border-0 shadow-none hover-bg-danger-subtle" 
                        onClick={() => setIsDeleteItemConfirmOpen(true)}
                        title="Xóa vật tư này"
                        type="button"
                      >
                        <i className="bi bi-trash" />
                      </button>
                    )}
                    <button className="btn btn-light btn-sm rounded-circle shadow-sm" onClick={() => {
                      setShowItemPanel(false);
                      setEditingItem(null);
                    }}>
                      <i className="bi bi-x-lg" />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="flex-grow-1 overflow-hidden p-4">
                  <form id="addItemForm" onSubmit={handleSaveItem} className="h-100 d-flex flex-column">
                    <div className="mb-2">
                      <label className="form-label fw-bold small text-muted mb-1">Tên vật tư / Dụng cụ <span className="text-danger">*</span></label>
                      <input 
                        className="form-control border p-2 px-3 rounded-2 shadow-none" 
                        placeholder="VD: Giấy in Double A A4" 
                        required
                        style={{ height: 38, fontSize: 13.5, background: "var(--background)" }}
                        value={itemForm.name}
                        onChange={e => {
                          const val = e.target.value;
                          setItemForm(p => ({ ...p, name: val }));
                        }}
                      />
                    </div>

                    <div className="row g-2 mb-2">
                      <div className="col-8">
                        <label className="form-label fw-bold small text-muted mb-1">Mã vật tư</label>
                        <input className="form-control bg-light border-0 p-2 px-3 fw-bold text-primary rounded-2 shadow-none" readOnly style={{ height: 38, fontSize: 13 }} value={itemForm.code} />
                      </div>
                      <div className="col-4">
                        <label className="form-label fw-bold small text-muted mb-1">Đơn vị</label>
                        <select className="form-select border p-2 px-3 rounded-2 shadow-none" style={{ height: 38, fontSize: 13.5, background: "var(--background)" }} value={itemForm.unit} onChange={e => setItemForm(p => ({ ...p, unit: e.target.value }))}>
                          {["cái", "hộp", "ram", "quyển", "tờ", "bộ", "cuộn", "gói"].map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="mb-2">
                      <label className="form-label fw-bold small text-muted mb-1">Thuộc nhóm <span className="text-danger">*</span></label>
                      <select 
                        className="form-select border p-2 px-3 rounded-2 shadow-none" 
                        required
                        style={{ height: 38, fontSize: 13.5, background: "var(--background)" }}
                        value={itemForm.categoryId}
                        onChange={e => {
                          const catId = e.target.value;
                          setItemForm(p => ({ ...p, categoryId: catId }));
                          fetchNextCode(catId);
                        }}
                      >
                        <option value="">Chọn nhóm</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>

                    <div className="row g-2 mb-2 align-items-end">
                      <div className="col-8">
                        <label className="form-label fw-bold small text-muted mb-1">Đơn giá tham khảo (vnđ)</label>
                        <input 
                          type="text" 
                          className="form-control border p-2 px-3 rounded-2 shadow-none" 
                          style={{ height: 38, background: "var(--background)" }} 
                          value={itemForm.price.toLocaleString("vi-VN")} 
                          onChange={e => {
                            const val = e.target.value.replace(/[^0-9]/g, "");
                            setItemForm(p => ({ ...p, price: Number(val) }));
                          }} 
                        />
                      </div>
                      <div className="col-4">
                        <div className="form-check form-switch d-flex flex-column align-items-start p-0 m-0">
                          <label className="form-check-label fw-bold small text-muted mb-1" htmlFor="isAsset">Dụng cụ</label>
                          <input 
                            className="form-check-input ms-0 shadow-none" 
                            type="checkbox" 
                            id="isAsset" 
                            checked={itemForm.isAsset}
                            onChange={e => setItemForm(p => ({ ...p, isAsset: e.target.checked }))}
                            style={{ width: 40, height: 20, cursor: "pointer" }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <label className="form-label fw-bold small text-muted mb-1">Tồn kho ban đầu</label>
                        <input type="number" className="form-control border p-2 px-3 rounded-2 shadow-none" style={{ height: 38, background: "var(--background)" }} value={itemForm.currentStock} onChange={e => setItemForm(p => ({ ...p, currentStock: Number(e.target.value) }))} />
                      </div>
                      <div className="col-6">
                        <label className="form-label fw-bold small text-muted mb-1">Tồn kho tối thiểu</label>
                        <input type="number" className="form-control border p-2 px-3 rounded-2 shadow-none" style={{ height: 38, background: "var(--background)" }} value={itemForm.minStock} onChange={e => setItemForm(p => ({ ...p, minStock: Number(e.target.value) }))} />
                      </div>
                    </div>

                    <div className="flex-grow-1 d-flex flex-column min-h-0">
                      <label className="form-label fw-bold small text-muted mb-1">Ghi chú thêm</label>
                      <textarea 
                        className="form-control border p-3 rounded-2 shadow-none flex-grow-1" 
                        placeholder="Nhập ghi chú hoặc mô tả chi tiết nếu có..."
                        style={{ background: "var(--background)", fontSize: 13, resize: "none" }}
                        value={itemForm.note}
                        onChange={e => setItemForm(p => ({ ...p, note: e.target.value }))}
                      />
                    </div>
                  </form>
                </div>

                {/* Footer */}
                <div className="p-4 border-top">
                  <div className="row g-2">
                    <div className="col-6">
                      <BrandButton variant="outline" className="w-100" style={{ height: 40, borderRadius: 8, fontSize: 13 }} onClick={() => setShowItemPanel(false)} disabled={isSubmittingItem}>
                        Hủy bỏ
                      </BrandButton>
                    </div>
                    <div className="col-6">
                      <BrandButton className="w-100" style={{ height: 40, borderRadius: 8, fontSize: 13 }} type="submit" form="addItemForm" loading={isSubmittingItem}>
                        {editingItem ? "Cập nhật" : "Xác nhận"}
                      </BrandButton>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Per-item Quota Offcanvas Panel ── */}
      <AnimatePresence>
        {showNormPanel && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowNormPanel(false)}
              className="position-fixed inset-0" 
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)", zIndex: 10000, top: 0, left: 0, right: 0, bottom: 0 }}
            />
            {/* Panel */}
            <motion.div 
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 250 }}
              className="position-fixed top-0 bottom-0 right-0 shadow-lg border-start bg-white"
              style={{ 
                width: 400, 
                zIndex: 10001, 
                right: 0, 
                background: "var(--card)", 
                overflow: "hidden"
              }}
            >
              <div className="h-100 d-flex flex-column">
                {/* Header */}
                <div className="p-3 px-4 border-bottom d-flex align-items-center justify-content-between bg-light/30">
                  <div className="d-flex align-items-center gap-3">
                    <div className="text-primary fs-5">
                      <i className="bi bi-box-seam" />
                    </div>
                    <div>
                      <h6 className="mb-0 fw-bold">Định mức vật tư chi tiết</h6>
                      <div className="text-muted" style={{ fontSize: 11 }}>{selectedDeptForNorm?.departmentName}</div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <button className="btn btn-light btn-sm rounded-circle shadow-sm" onClick={() => setShowNormPanel(false)}>
                      <i className="bi bi-x-lg" />
                    </button>
                  </div>
                </div>

                {/* Content Area */}
                <div className="flex-grow-1 d-flex flex-column overflow-hidden">
                  {/* Internal Search */}
                  <div className="p-3 border-bottom bg-white">
                    <div className="position-relative">
                      <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" style={{ fontSize: 13 }} />
                      <input 
                        type="text"
                        className="form-control form-control-sm ps-5 border-0 bg-light"
                        style={{ borderRadius: 8, height: 36 }}
                        placeholder="Tìm kiếm vật tư..."
                        value={normSearch}
                        onChange={e => setNormSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Table Wrapper */}
                  <div className="flex-grow-1 overflow-auto">
                    <Table
                      rows={filteredNorms}
                      columns={normColumns}
                      loading={isLoadingNorms}
                      rowKey={(n) => n.itemId}
                      compact
                      fontSize={12}
                      striped={false}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="p-3 px-4 border-top bg-light/30 d-flex justify-content-end">
                  <BrandButton variant="outline" className="px-4" onClick={() => setShowNormPanel(false)}>
                    Đóng
                  </BrandButton>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Asset Handover Offcanvas Panel ── */}
      <AnimatePresence mode="wait">
        {showHandoverPanel && (
          <React.Fragment key="handover-panel">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowHandoverPanel(false)}
              className="position-fixed inset-0" 
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)", zIndex: 10000, top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <motion.div 
              initial={{ x: "100%" }} 
              animate={{ x: 0 }} 
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 250 }}
              className="position-fixed top-0 bottom-0 right-0 shadow-lg border-start bg-white"
              style={{ width: 400, zIndex: 10001, right: 0, background: "var(--card)", overflow: "hidden" }}
            >
              <div className="h-100 d-flex flex-column">
                <div className="p-3 px-4 border-bottom d-flex align-items-center justify-content-between bg-light/30">
                  <div className="d-flex align-items-center gap-3">
                    <div className="text-primary fs-5"><i className="bi bi-person-badge" /></div>
                    <div>
                      <h6 className="mb-0 fw-bold">Chi tiết dụng cụ bàn giao</h6>
                      <div className="text-muted" style={{ fontSize: 11 }}>
                        {selectedEmpForHandover?.employeeName} ({selectedEmpForHandover?.employeeCode})
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-light btn-sm rounded-circle shadow-sm" onClick={() => setShowHandoverPanel(false)}>
                    <i className="bi bi-x-lg" />
                  </button>
                </div>

                <div className="flex-grow-1 overflow-auto p-4 custom-scrollbar">
                  <SectionTitle title="Dữ liệu công cụ" className="mb-3" />
                  <div className="bg-light p-3 rounded-3 mb-4 shadow-sm border border-light">
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label fw-bold small text-muted mb-1">Thiết bị bàn giao</label>
                        <FilterSelect
                          placeholder="Chọn thiết bị từ kho..."
                          options={availableAssets.map(a => ({ 
                            label: a.tenTaiSan, 
                            value: a.id 
                          }))}
                          value={assignForm.assetId}
                          onChange={val => {
                            setAssignForm(p => ({ ...p, assetId: val }));
                          }}
                          width="100%"
                          className="border shadow-none"
                        />
                      </div>
                      
                      <div className="col-6">
                        <label className="form-label fw-bold small text-muted mb-1">Ngày bàn giao</label>
                        <input 
                          type="date" 
                          className="form-control form-control-sm border shadow-none" 
                          style={{ borderRadius: 8 }} 
                          value={assignForm.handoverDate}
                          onChange={e => setAssignForm(p => ({ ...p, handoverDate: e.target.value }))}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label fw-bold small text-muted mb-1">Ngày thu hồi</label>
                        <input type="date" className="form-control form-control-sm border shadow-none" style={{ borderRadius: 8 }} />
                      </div>
                      
                      <div className="col-12">
                        <label className="form-label fw-bold small text-muted mb-1">Trạng thái & Tình trạng</label>
                        <div className="input-group input-group-sm">
                          <select className="form-select border shadow-none" style={{ maxWidth: 120, borderRadius: "8px 0 0 8px" }}>
                            <option value="USING">Đang dùng</option>
                            <option value="RETURNED">Đã thu hồi</option>
                            <option value="BROKEN">Hỏng</option>
                          </select>
                          <input 
                            type="text" 
                            className="form-control border shadow-none" 
                            placeholder="Mô tả tình trạng..."
                            value={assignForm.condition}
                            onChange={e => setAssignForm(p => ({ ...p, condition: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <SectionTitle title="Tài sản đang nắm giữ" className="mb-3" />
                  <div className="bg-white mb-4 border rounded overflow-hidden">
                    <Table
                      rows={selectedEmpForHandover?.assets || []}
                      columns={handoverDetailColumns}
                      compact
                      fontSize={11}
                      striped={true}
                      onRowClick={(row) => {
                        setAssignForm({
                          assetId: row.assetId,
                          condition: row.condition || "Bình thường",
                          note: row.note || "",
                          handoverDate: row.handoverDate ? row.handoverDate.split('T')[0] : "",
                          returnDate: row.returnDate ? row.returnDate.split('T')[0] : ""
                        });
                      }}
                    />
                    {(!selectedEmpForHandover?.assets || selectedEmpForHandover.assets.length === 0) && (
                      <div className="p-4 text-center text-muted small italic">Chưa có dữ liệu bàn giao</div>
                    )}
                  </div>
                </div>

                <div className="p-3 px-4 border-top bg-light/30 d-flex gap-2">
                  <BrandButton 
                    variant="outline" 
                    className="flex-grow-1 text-danger" 
                    style={{ height: 40, borderRadius: 8, fontSize: 13 }}
                    disabled={selectedHandovers.length === 0}
                    onClick={handleBulkRecover}
                    loading={isAssigning && selectedHandovers.length > 0}
                  >
                    <i className="bi bi-arrow-return-left me-2" />Thu hồi ({selectedHandovers.length})
                  </BrandButton>
                  <BrandButton className="flex-grow-1" style={{ height: 40, borderRadius: 8, fontSize: 13 }} onClick={handleAssignAsset} loading={isAssigning && selectedHandovers.length === 0}>
                    <i className="bi bi-plus-lg me-2" />Bàn giao
                  </BrandButton>
                </div>
              </div>
            </motion.div>
          </React.Fragment>
        )}
      </AnimatePresence>
    </StandardPage>
  );
}
