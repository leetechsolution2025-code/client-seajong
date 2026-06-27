"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { SplitLayoutPage } from "@/components/layout/SplitLayoutPage";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { SearchInput } from "@/components/ui/SearchInput";
import { BrandButton } from "@/components/ui/BrandButton";
import { Table, TableColumn } from "@/components/ui/Table";
import { motion, AnimatePresence } from "framer-motion";

const INITIAL_MOCK_DATA: any[] = [];

const StatusBadge = ({ status }: { status: string }) => {
  const cfg: Record<string, { bg: string; color: string }> = {
    "Đang thực hiện": { bg: "#e0f2fe", color: "#0369a1" },
    "Đã thực hiện": { bg: "#dcfce7", color: "#166534" },
    "Tạm dừng": { bg: "#fef9c3", color: "#854d0e" },
    "Huỷ bỏ": { bg: "#fee2e2", color: "#991b1b" },
  };
  const c = cfg[status] || { bg: "#f1f5f9", color: "#475569" };
  return (
    <span style={{ padding: "4px 8px", fontSize: "11px", fontWeight: 600, borderRadius: "6px", backgroundColor: c.bg, color: c.color, display: "inline-block", whiteSpace: "nowrap" }}>
      {status}
    </span>
  );
};

const formatDateTime = (val: string) => {
  if (!val) return "";
  try {
    if (/^\d{2}\/\d{2}\/\d{4}/.test(val)) {
      return val;
    }
    const normalized = val.includes("T") ? val : val.replace(" ", "T");
    const d = new Date(normalized);
    if (isNaN(d.getTime())) return val;
    const pad = (n: number) => String(n).padStart(2, "0");
    const dateStr = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return `${dateStr} ${timeStr}`;
  } catch (e) {
    return val;
  }
};

const formatNumber = (num: number) => {
  if (num === 0) return "0";
  if (!num) return "";
  return num.toLocaleString("vi-VN");
};

const parseNumber = (str: string) => {
  const clean = str.replace(/\D/g, "");
  return clean ? parseInt(clean, 10) : 0;
};

const formatSalaryInput = (val: string) => {
  if (!val) return "";
  if (val.includes("-")) {
    const parts = val.split("-");
    const formattedParts = parts.map((part, index) => {
      if (index > 1) return "";
      const num = part.replace(/\D/g, "");
      if (!num) return "";
      return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    });
    if (parts[1] !== undefined && !parts[1].replace(/\D/g, "")) {
      return `${formattedParts[0]} -`;
    }
    return formattedParts.filter(p => p !== "").join(" - ");
  } else {
    const num = val.replace(/\D/g, "");
    if (!num) return "";
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
};

const calculateRatio = (current: number, proposed: number) => {
  if (!current && !proposed) return { text: "0%", color: "var(--muted-foreground)" };
  if (!current) return { text: `+100%`, color: "#198754" };
  const pct = ((proposed - current) / current) * 100;
  if (pct > 0) {
    return { text: `+${pct.toFixed(1).replace(".0", "")}%`, color: "#198754" };
  } else if (pct < 0) {
    return { text: `${pct.toFixed(1).replace(".0", "")}%`, color: "#dc3545" };
  } else {
    return { text: "0%", color: "var(--muted-foreground)" };
  }
};

function RecruitmentManagementContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const typeParam = searchParams.get("type");
  const idParam = searchParams.get("id");

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestType, setRequestType] = useState("");
  const [status, setStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"view" | "create">("view");
  const [activeMobileTab, setActiveMobileTab] = useState<"left" | "right">("left");

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/my/recruitment");
      if (!res.ok) throw new Error("Failed to fetch requests");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Error loading requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    let resolvedType = "";
    if (typeParam) {
      resolvedType = typeParam;
    } else if (tab) {
      const mapping: Record<string, string> = {
        PROMOTION: "Đề bạt và thuyên chuyển",
        TRANSFER: "Đề bạt và thuyên chuyển",
        RECRUITMENT: "Tuyển dụng",
        TRAINING: "Đào tạo",
        SALARY: "Điều chỉnh thu nhập"
      };
      resolvedType = mapping[tab] || "";
    }
    if (resolvedType) {
      setRequestType(resolvedType);
    }
  }, [tab, typeParam]);

  useEffect(() => {
    if (idParam && data.length > 0) {
      const found = data.find(item => item.id === idParam || item.originalId === idParam);
      if (found) {
        setSelectedRequest(found);
        setViewMode("view");
      }
    }
  }, [idParam, data]);

  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isSelectDeptMode, setIsSelectDeptMode] = useState(false);
  const [selectedTrainers, setSelectedTrainers] = useState<any[]>([]);
  const [trainerSearch, setTrainerSearch] = useState("");
  const [isTrainerDropdownOpen, setIsTrainerDropdownOpen] = useState(false);
  const [stationeryInventory, setStationeryInventory] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/hr/stationery/items")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setStationeryInventory(data);
      })
      .catch(console.error);
  }, []);

  const { data: session } = useSession();
  const [stationeryNorms, setStationeryNorms] = useState<any[]>([]);

  useEffect(() => {
    const deptCode = session?.user?.departmentCode;
    if (!deptCode || departments.length === 0) return;

    // Find the department category ID matching the department code (case-insensitive)
    const myDept = departments.find(
      d => d.code?.toLowerCase() === deptCode.toLowerCase()
    );
    if (!myDept?.id) return;

    // Fetch norms for this department
    fetch(`/api/hr/stationery/norms?departmentId=${myDept.id}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setStationeryNorms(data);
      })
      .catch(console.error);
  }, [session, departments]);

  const getItemNormInfo = (itemId: string, currentFormQty: number = 0) => {
    // Find the norm for this item
    const norm = stationeryNorms.find(n => n.itemId === itemId);
    const limitQty = norm ? norm.limitQty : 0;

    // Calculate quantity already requested this month (or in active requests)
    const activeRequests = data.filter(r =>
      r.type === "Văn phòng phẩm và dụng cụ" &&
      r.status !== "Huỷ bỏ" &&
      r.status !== "Từ chối"
    );

    let requestedQty = 0;
    activeRequests.forEach(req => {
      const items = req.details?.items || [];
      items.forEach((item: any) => {
        if (item.itemId === itemId) {
          requestedQty += (item.quantity || 0);
        }
      });
    });

    const remaining = Math.max(0, limitQty - requestedQty - currentFormQty);

    return {
      hasNorm: !!norm,
      limitQty,
      remaining
    };
  };

  useEffect(() => {
    fetch("/api/notifications/recipients")
      .then(res => res.json())
      .then(data => {
        if (data) {
          if (Array.isArray(data.users)) {
            const mapped = data.users.map((u: any) => ({
              id: u.id,
              name: u.name,
              role: u.position || "Nhân viên",
              dept: u.department || "",
              baseSalary: u.baseSalary || 0,
              mealAllowance: u.mealAllowance || 0,
              fuelAllowance: u.fuelAllowance || 0,
              phoneAllowance: u.phoneAllowance || 0,
              seniorityAllowance: u.seniorityAllowance || 0,
            }));
            setEmployees(mapped);
          }
          if (Array.isArray(data.departments)) {
            setDepartments(data.departments);
          }
        }
      })
      .catch(err => {
        console.error("Error fetching employees:", err);
      });
  }, []);

  const filteredEmployees = employees
    .filter(emp => !selectedTrainers.some(selected => selected.id === emp.id))
    .filter(emp =>
      emp.name.toLowerCase().includes(trainerSearch.toLowerCase()) ||
      emp.role.toLowerCase().includes(trainerSearch.toLowerCase()) ||
      emp.dept.toLowerCase().includes(trainerSearch.toLowerCase())
    );

  const handleSelectTrainer = (emp: any) => {
    const isAlreadySelected = selectedTrainers.some(t => t.id === emp.id);
    let updated;
    if (isAlreadySelected) {
      updated = selectedTrainers.filter(t => t.id !== emp.id);
    } else {
      updated = [...selectedTrainers, emp];
    }
    setSelectedTrainers(updated);
    setFormState({
      ...formState,
      trainer: updated.map(t => t.name).join(", ")
    });
    setTrainerSearch("");
  };

  const handleRemoveTrainer = (id: string) => {
    const updated = selectedTrainers.filter(t => t.id !== id);
    setSelectedTrainers(updated);
    setFormState({
      ...formState,
      trainer: updated.map(t => t.name).join(", ")
    });
  };

  const [selectedParticipants, setSelectedParticipants] = useState<any[]>([]);
  const [participantSearch, setParticipantSearch] = useState("");
  const [isParticipantDropdownOpen, setIsParticipantDropdownOpen] = useState(false);
  const [activeSupplyDropdown, setActiveSupplyDropdown] = useState<{ id: string, field: "department" | "source" } | null>(null);
  const [isProposalEmployeeDropdownOpen, setIsProposalEmployeeDropdownOpen] = useState(false);

  const filteredDepts = departments
    .filter(dept => !selectedParticipants.some(selected => selected.isDept && selected.code === dept.code))
    .filter(dept => dept.name.toLowerCase().includes(participantSearch.toLowerCase()));

  const filteredParticipantEmployees = employees
    .filter(emp => !selectedParticipants.some(selected => !selected.isDept && selected.id === emp.id))
    .filter(emp => !selectedTrainers.some(selected => selected.id === emp.id))
    .filter(emp =>
      emp.name.toLowerCase().includes(participantSearch.toLowerCase()) ||
      emp.role.toLowerCase().includes(participantSearch.toLowerCase()) ||
      emp.dept.toLowerCase().includes(participantSearch.toLowerCase())
    );

  const handleSelectParticipant = (item: any, isDept: boolean) => {
    const itemId = isDept ? item.code : item.id;
    const isAlreadySelected = selectedParticipants.some(p => p.id === itemId && p.isDept === isDept);
    let updated;
    if (isAlreadySelected) {
      updated = selectedParticipants.filter(p => !(p.id === itemId && p.isDept === isDept));
    } else {
      const newItem = isDept 
        ? { id: item.code, code: item.code, name: item.name, isDept: true }
        : { id: item.id, name: item.name, role: item.role, dept: item.dept, isDept: false };
      updated = [...selectedParticipants, newItem];
    }
    setSelectedParticipants(updated);
    setFormState({
      ...formState,
      participants: updated.map(p => p.isDept ? `Toàn bộ nhân viên ${p.name}` : p.name).join(", ")
    });
    setParticipantSearch("");
  };

  const handleRemoveParticipant = (id: string, isDept: boolean) => {
    const updated = selectedParticipants.filter(p => !(p.id === id && p.isDept === isDept));
    setSelectedParticipants(updated);
    setFormState({
      ...formState,
      participants: updated.map(p => p.isDept ? `Toàn bộ nhân viên ${p.name}` : p.name).join(", ")
    });
  };

  const handleUpdateIncomeDetail = (key: string, field: "current" | "proposed", value: number) => {
    const updated = (formState.incomeDetails || [
      { key: "basic", label: "Lương cơ bản", current: 0, proposed: 0 },
      { key: "lunch", label: "Phụ cấp ăn trưa", current: 0, proposed: 0 },
      { key: "gas", label: "Phụ cấp xăng xe", current: 0, proposed: 0 },
      { key: "phone", label: "Phụ cấp điện thoại", current: 0, proposed: 0 },
      { key: "seniority", label: "Phụ cấp thâm niên", current: 0, proposed: 0 }
    ]).map((item: any) => {
      if (item.key === key) {
        return { ...item, [field]: value };
      }
      return item;
    });

    const totalCurrent = updated.reduce((sum: number, item: any) => sum + (Number(item.current) || 0), 0);
    const totalProposed = updated.reduce((sum: number, item: any) => sum + (Number(item.proposed) || 0), 0);

    setFormState({
      ...formState,
      incomeDetails: updated,
      currentSalary: totalCurrent.toLocaleString("vi-VN") + " VNĐ",
      proposedSalary: totalProposed.toLocaleString("vi-VN") + " VNĐ"
    });
  };

  const [formState, setFormState] = useState<any>({
    position: "",
    quantity: "1",
    salary: "",
    deadline: "",
    description: "",
    requirements: "",
    topic: "",
    trainingType: "Định kỳ",
    trainer: "",
    time: "",
    startTime: "",
    endTime: "",
    location: "",
    participants: "",
    trainingContent: "",
    equipment: "",
    department: "",
    trainingSupplies: [{ id: "1", department: "", equipment: "", source: "" }],
    employee: "",
    currentSalary: "",
    proposedSalary: "",
    effectiveDate: "",
    reason: "",
    currentRole: "",
    proposedRole: "",
    targetDepartment: "",
    adjustmentType: "Tăng lương",
    incomeDetails: [
      { key: "basic", label: "Lương cơ bản", current: 0, proposed: 0 },
      { key: "lunch", label: "Phụ cấp ăn trưa", current: 0, proposed: 0 },
      { key: "gas", label: "Phụ cấp xăng xe", current: 0, proposed: 0 },
      { key: "phone", label: "Phụ cấp điện thoại", current: 0, proposed: 0 },
      { key: "seniority", label: "Phụ cấp thâm niên", current: 0, proposed: 0 }
    ],
    isTransfer: false,
    requestDate: new Date().toISOString().split("T")[0],
    level: "Nhân viên",
    workType: "Toàn thời gian",
    experience: "",
    trainingTime: "",
    trainingLocation: "",
    trainingParticipants: "",
    stationeryItems: [{ itemId: "", quantity: 1, searchText: "", showSuggestions: false }],
    note: "",
  });

  const handleAddStationeryItemRow = () => {
    const newRow = {
      itemId: "",
      quantity: 1,
      searchText: "",
      showSuggestions: false
    };
    setFormState({
      ...formState,
      stationeryItems: [...(formState.stationeryItems || []), newRow]
    });
  };

  const handleUpdateStationeryItemRow = (idx: number, field: "itemId" | "quantity", value: any) => {
    const updated = [...(formState.stationeryItems || [])];
    updated[idx] = {
      ...updated[idx],
      [field]: value
    };
    setFormState({
      ...formState,
      stationeryItems: updated
    });
  };

  const handleRemoveStationeryItemRow = (idx: number) => {
    const filtered = (formState.stationeryItems || []).filter((_: any, i: number) => i !== idx);
    setFormState({
      ...formState,
      stationeryItems: filtered
    });
  };

  const detailsItemColumns: TableColumn<any>[] = [
    {
      header: "Tên vật tư / dụng cụ",
      width: "60%",
      render: (item: any) => <span className="fw-semibold text-dark">{item.name}</span>
    },
    {
      header: "Số lượng",
      width: "40%",
      align: "center",
      render: (item: any) => <span className="fw-bold text-dark">{item.quantity} {item.unit || "cái"}</span>
    }
  ];

  const getFilteredStationerySuggestions = (searchText: string) => {
    if (!searchText) return stationeryInventory;
    const query = searchText.toLowerCase().trim();
    return stationeryInventory.filter(item =>
      item.name.toLowerCase().includes(query)
    );
  };

  const creationTableColumns: TableColumn<any>[] = [
    {
      header: "Tên vật tư / dụng cụ",
      width: "50%",
      render: (row: any, idx: number) => {
        const filteredSuggestions = getFilteredStationerySuggestions(row.searchText || "");
        return (
          <div className="position-relative" style={{ minWidth: "180px" }}>
            <input
              type="text"
              className="form-control form-control-sm"
              value={row.searchText || ""}
              required
              onChange={e => {
                const val = e.target.value;
                const matchingItem = stationeryInventory.find(
                  item => item.name.toLowerCase() === val.toLowerCase().trim()
                );
                const updated = [...(formState.stationeryItems || [])];
                updated[idx] = {
                  ...updated[idx],
                  searchText: val,
                  itemId: matchingItem ? matchingItem.id : "",
                  showSuggestions: true
                };
                setFormState({
                  ...formState,
                  stationeryItems: updated
                });
              }}
              onFocus={() => {
                const updated = [...(formState.stationeryItems || [])];
                updated[idx] = {
                  ...updated[idx],
                  showSuggestions: true
                };
                setFormState({
                  ...formState,
                  stationeryItems: updated
                });
              }}
              onBlur={() => {
                setTimeout(() => {
                  const updated = [...(formState.stationeryItems || [])];
                  if (updated[idx]) {
                    updated[idx] = {
                      ...updated[idx],
                      showSuggestions: false
                    };
                    setFormState({
                      ...formState,
                      stationeryItems: updated
                    });
                  }
                }, 200);
              }}
              placeholder="Tìm vật tư..."
              style={{ fontSize: "12px" }}
            />
            {row.itemId && (
              (() => {
                const normInfo = getItemNormInfo(row.itemId, Number(row.quantity) || 0);
                return (
                  <div className="text-muted ps-1" style={{ fontSize: "10px", marginTop: "3px" }}>
                    Định mức: {normInfo.hasNorm ? normInfo.limitQty : "—"} · Còn lại: {normInfo.hasNorm ? normInfo.remaining : "—"}
                  </div>
                );
              })()
            )}
            {row.showSuggestions && filteredSuggestions.length > 0 && (
              <div
                className="position-absolute border rounded shadow-sm bg-white overflow-auto w-100"
                style={{
                  top: "100%",
                  left: 0,
                  zIndex: 9999,
                  maxHeight: "200px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                }}
              >
                {filteredSuggestions.map(item => {
                  const normInfo = getItemNormInfo(item.id);
                  return (
                    <div
                      key={item.id}
                      className="p-2 border-bottom"
                      style={{ cursor: "pointer", transition: "background 0.1s", fontSize: "12px" }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                      }}
                      onClick={() => {
                        const updated = [...(formState.stationeryItems || [])];
                        updated[idx] = {
                          ...updated[idx],
                          itemId: item.id,
                          searchText: item.name,
                          showSuggestions: false
                        };
                        setFormState({
                          ...formState,
                          stationeryItems: updated
                        });
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#f1f5f9")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <div className="text-dark">{item.name}</div>
                      <div className="text-muted" style={{ fontSize: "10px", marginTop: "2px" }}>
                        Định mức: {normInfo.hasNorm ? normInfo.limitQty : "—"} · Còn lại: {normInfo.hasNorm ? normInfo.remaining : "—"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      }
    },
    {
      header: "Đơn vị",
      width: "15%",
      align: "center",
      render: (row: any) => {
        const item = stationeryInventory.find(i => i.id === row.itemId);
        return <span className="text-muted small">{item?.unit || "—"}</span>;
      }
    },
    {
      header: "Số lượng",
      width: "20%",
      align: "center",
      render: (row: any, idx: number) => (
        <input
          type="number"
          className="form-control form-control-sm text-center"
          min={1}
          required
          value={row.quantity}
          onChange={e => handleUpdateStationeryItemRow(idx, "quantity", Number(e.target.value))}
          style={{ fontSize: "12px" }}
        />
      )
    },
    {
      header: "Xóa",
      width: "15%",
      align: "center",
      render: (row: any, idx: number) => (
        <button
          type="button"
          className="btn btn-outline-danger btn-sm border-0 rounded-circle shadow-none p-0"
          style={{ width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => handleRemoveStationeryItemRow(idx)}
        >
          <i className="bi bi-trash-fill" />
        </button>
      )
    }
  ];

  const filteredProposalEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes((formState.employee || "").toLowerCase()) ||
    emp.role.toLowerCase().includes((formState.employee || "").toLowerCase()) ||
    emp.dept.toLowerCase().includes((formState.employee || "").toLowerCase())
  );

  const handleSelectProposalEmployee = (emp: any) => {
    const basicVal = emp.baseSalary || 0;
    const lunchVal = emp.mealAllowance || 0;
    const gasVal = emp.fuelAllowance || 0;
    const phoneVal = emp.phoneAllowance || 0;
    const seniorityVal = emp.seniorityAllowance || 0;

    const updatedDetails = [
      { key: "basic", label: "Lương cơ bản", current: basicVal, proposed: basicVal },
      { key: "lunch", label: "Phụ cấp ăn trưa", current: lunchVal, proposed: lunchVal },
      { key: "gas", label: "Phụ cấp xăng xe", current: gasVal, proposed: gasVal },
      { key: "phone", label: "Phụ cấp điện thoại", current: phoneVal, proposed: phoneVal },
      { key: "seniority", label: "Phụ cấp thâm niên", current: seniorityVal, proposed: seniorityVal }
    ];
    const totalCurrent = updatedDetails.reduce((sum: number, item: any) => sum + (Number(item.current) || 0), 0);
    const totalProposed = updatedDetails.reduce((sum: number, item: any) => sum + (Number(item.proposed) || 0), 0);

    setFormState({
      ...formState,
      employee: `${emp.name} - ${emp.dept}`,
      currentRole: emp.dept || "",
      incomeDetails: updatedDetails,
      currentSalary: totalCurrent.toLocaleString("vi-VN") + " VNĐ",
      proposedSalary: totalProposed.toLocaleString("vi-VN") + " VNĐ"
    });
    setIsProposalEmployeeDropdownOpen(false);
  };

  const filteredData = data.filter(item => {
    const matchType = !requestType || item.type === requestType;
    const matchStatus = !status || item.status === status;
    const matchSearch = !searchQuery || item.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchStatus && matchSearch;
  });

  useEffect(() => {
    if (filteredData.length > 0) {
      const isStillVisible = filteredData.some(item => item.id === selectedRequest?.id);
      if (!isStillVisible) {
        setSelectedRequest(filteredData[0]);
      }
    } else {
      setSelectedRequest(null);
    }
  }, [data, requestType, status, searchQuery, selectedRequest]);

  const handleStartCreate = () => {
    setViewMode("create");
    setActiveMobileTab("right");
  };

  const handleAddSupplyRow = () => {
    const newRow = {
      id: String(Date.now()),
      department: "",
      equipment: "",
      source: ""
    };
    setFormState({
      ...formState,
      trainingSupplies: [...(formState.trainingSupplies || []), newRow]
    });
  };

  const handleUpdateSupplyRow = (id: string, field: "department" | "equipment" | "source", value: string) => {
    const updated = (formState.trainingSupplies || []).map((row: any) => {
      if (row.id === id) {
        return { ...row, [field]: value };
      }
      return row;
    });
    setFormState({
      ...formState,
      trainingSupplies: updated
    });
  };

  const handleRemoveSupplyRow = (id: string) => {
    if ((formState.trainingSupplies || []).length <= 1) return;
    const filtered = formState.trainingSupplies.filter((row: any) => row.id !== id);
    setFormState({
      ...formState,
      trainingSupplies: filtered
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let details: any = {};
    if (requestType === "Tuyển dụng") {
      if (!formState.position.trim()) return alert("Vui lòng nhập vị trí tuyển dụng");
      details = {
        position: formState.position,
        requestDate: formState.requestDate,
        deadline: formState.deadline,
        quantity: formState.quantity,
        level: formState.level,
        workType: formState.workType,
        salary: formState.salary,
        experience: formState.experience,
        description: formState.description,
        requirements: formState.requirements,
        trainingTime: formState.trainingTime,
        trainingLocation: formState.trainingLocation,
        trainingParticipants: formState.trainingParticipants,
        trainingContent: formState.trainingContent
      };
    } else if (requestType === "Đào tạo") {
      if (!formState.topic.trim()) return alert("Vui lòng nhập chuyên đề đào tạo");
      details = {
        topic: formState.topic,
        trainingType: formState.trainingType,
        trainer: formState.trainer,
        startTime: formState.startTime,
        endTime: formState.endTime,
        location: formState.location,
        participants: formState.participants,
        trainingContent: formState.trainingContent,
        equipment: formState.equipment,
        department: formState.department,
        trainingSupplies: formState.trainingSupplies
      };
    } else if (requestType === "Điều chỉnh thu nhập") {
      if (!formState.employee.trim()) return alert("Vui lòng nhập họ tên nhân viên");
      const empName = formState.employee.split(" - ")[0].trim();
      const selectedEmp = employees.find(emp => emp.name === empName);
      if (!selectedEmp) return alert("Không tìm thấy nhân viên phù hợp");
      
      details = {
        employeeId: selectedEmp.id,
        employee: formState.employee,
        adjustmentType: formState.adjustmentType,
        effectiveDate: formState.effectiveDate,
        reason: formState.reason,
        incomeDetails: formState.incomeDetails
      };
    } else if (requestType === "Đề bạt và thuyên chuyển") {
      if (!formState.employee.trim()) return alert("Vui lòng nhập họ tên nhân viên");
      const empName = formState.employee.split(" - ")[0].trim();
      const selectedEmp = employees.find(emp => emp.name === empName);
      if (!selectedEmp) return alert("Không tìm thấy nhân viên phù hợp");

      if (formState.isTransfer && !formState.targetDepartment.trim()) {
        return alert("Vui lòng chọn bộ phận đích");
      }
      if (!formState.isTransfer && !formState.proposedRole.trim()) {
        return alert("Vui lòng nhập chức danh mới");
      }

      details = {
        employeeId: selectedEmp.id,
        employee: formState.employee,
        isTransfer: formState.isTransfer,
        currentRole: formState.currentRole,
        targetDepartment: formState.targetDepartment,
        proposedRole: formState.proposedRole,
        effectiveDate: formState.effectiveDate,
        reason: formState.reason
      };
    } else if (requestType === "Văn phòng phẩm và dụng cụ") {
      if (!formState.note || !formState.note.trim()) {
        return alert("Vui lòng nhập lý do/ghi chú đề xuất");
      }
      const validItems = (formState.stationeryItems || []).filter((i: any) => i.itemId);
      if (validItems.length === 0) {
        return alert("Vui lòng chọn ít nhất một vật tư");
      }
      if (validItems.some((i: any) => i.quantity <= 0)) {
        return alert("Số lượng vật tư phải lớn hơn 0");
      }
      details = {
        note: formState.note,
        stationeryItems: validItems
      };
    }

    try {
      const res = await fetch("/api/my/recruitment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: requestType, details })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Gửi yêu cầu thất bại");
      }

      const responseData = await res.json();
      await fetchRequests(); // reload list
      setViewMode("view");
      setActiveMobileTab("left");
      setSelectedTrainers([]);
      setSelectedParticipants([]);

      // Reset Form
      setFormState({
        position: "",
        quantity: "1",
        salary: "",
        deadline: "",
        description: "",
        requirements: "",
        topic: "",
        trainingType: "Định kỳ",
        trainer: "",
        time: "",
        startTime: "",
        endTime: "",
        location: "",
        participants: "",
        trainingContent: "",
        equipment: "",
        department: "",
        trainingSupplies: [{ id: "1", department: "", equipment: "", source: "" }],
        employee: "",
        currentSalary: "",
        proposedSalary: "",
        effectiveDate: "",
        reason: "",
        currentRole: "",
        proposedRole: "",
        targetDepartment: "",
        adjustmentType: "Tăng lương",
        incomeDetails: [
          { key: "basic", label: "Lương cơ bản", current: 0, proposed: 0 },
          { key: "lunch", label: "Phụ cấp ăn trưa", current: 0, proposed: 0 },
          { key: "gas", label: "Phụ cấp xăng xe", current: 0, proposed: 0 },
          { key: "phone", label: "Phụ cấp điện thoại", current: 0, proposed: 0 },
          { key: "seniority", label: "Phụ cấp thâm niên", current: 0, proposed: 0 }
        ],
        isTransfer: false,
        requestDate: new Date().toISOString().split("T")[0],
        level: "Nhân viên",
        workType: "Toàn thời gian",
        experience: "",
        trainingTime: "",
        trainingLocation: "",
        trainingParticipants: "",
        stationeryItems: [{ itemId: "", quantity: 1, searchText: "", showSuggestions: false }],
        note: "",
      });
    } catch (err: any) {
      alert(err.message || "Đã xảy ra lỗi khi gửi yêu cầu");
    }
  };

  const formGroupStyle = {
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px"
  };

  const labelStyle = {
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--muted-foreground)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.02em",
    marginBottom: "2px"
  };

  const inputStyle = {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid var(--border)",
    fontSize: "13px",
    outline: "none",
    background: "var(--card)",
    color: "var(--foreground)"
  };

  const renderCreateForm = () => {
    const formHeader = (
      <div className="border-bottom pb-3 mb-3 d-flex justify-content-between align-items-center">
        <div>
          <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 rounded-2 mb-2 d-inline-block" style={{ fontSize: "10.5px", fontWeight: 600 }}>
            Tạo mới yêu cầu
          </span>
          <h5 className="fw-bold text-dark mb-0" style={{ fontSize: "15px" }}>Loại: {requestType}</h5>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-light border"
            onClick={() => {
              setViewMode("view");
              setActiveMobileTab("left");
            }}
            style={{ fontSize: "12px", borderRadius: "8px" }}
          >
            Hủy
          </button>
          <button
            type="submit"
            className="btn btn-sm btn-primary text-white"
            onClick={handleSubmit}
            style={{ fontSize: "12px", backgroundColor: "#003087", borderColor: "#003087", borderRadius: "8px" }}
          >
            Gửi yêu cầu
          </button>
        </div>
      </div>
    );

    const inputClasses = "form-control form-control-sm shadow-none";

    switch (requestType) {
      case "Tuyển dụng":
        return (
          <form className="p-3 p-md-4 h-100 d-flex flex-column overflow-hidden" onSubmit={handleSubmit}>
            {formHeader}
            <div className="flex-grow-1 custom-scrollbar pe-1" style={{ minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
              <div className="d-flex flex-column gap-3">

              <div className="row g-3">
                <div className="col-12" style={formGroupStyle}>
                  <label style={labelStyle}>Vị trí cần tuyển dụng *</label>
                  <input
                    type="text"
                    required
                    className={inputClasses}
                    value={formState.position}
                    onChange={e => setFormState({ ...formState, position: e.target.value })}
                    placeholder="VD: Kế toán trưởng, Lập trình viên..."
                    style={inputStyle}
                  />
                </div>
                
                <div className="col-md-6" style={formGroupStyle}>
                  <label style={labelStyle}>Ngày yêu cầu *</label>
                  <input
                    type="date"
                    required
                    className={inputClasses}
                    value={formState.requestDate}
                    onChange={e => setFormState({ ...formState, requestDate: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div className="col-md-6" style={formGroupStyle}>
                  <label style={labelStyle}>Hạn cần nhân sự *</label>
                  <input
                    type="date"
                    required
                    className={inputClasses}
                    value={formState.deadline}
                    onChange={e => setFormState({ ...formState, deadline: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div className="col-md-4" style={formGroupStyle}>
                  <label style={labelStyle}>Số lượng *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className={inputClasses}
                    value={formState.quantity}
                    onChange={e => setFormState({ ...formState, quantity: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div className="col-md-4" style={formGroupStyle}>
                  <label style={labelStyle}>Cấp bậc *</label>
                  <select
                    className={inputClasses}
                    value={formState.level}
                    onChange={e => setFormState({ ...formState, level: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="Thực tập sinh">Thực tập sinh</option>
                    <option value="Nhân viên">Nhân viên</option>
                    <option value="Chuyên viên">Chuyên viên</option>
                    <option value="Trưởng nhóm">Trưởng nhóm</option>
                    <option value="Trưởng phòng">Trưởng phòng</option>
                    <option value="Giám đốc">Giám đốc</option>
                  </select>
                </div>

                <div className="col-md-4" style={formGroupStyle}>
                  <label style={labelStyle}>Hình thức *</label>
                  <select
                    className={inputClasses}
                    value={formState.workType}
                    onChange={e => setFormState({ ...formState, workType: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="Toàn thời gian">Toàn thời gian</option>
                    <option value="Bán thời gian">Bán thời gian</option>
                    <option value="Thực tập">Thực tập</option>
                    <option value="Làm việc từ xa">Làm việc từ xa</option>
                  </select>
                </div>

                <div className="col-md-6" style={formGroupStyle}>
                  <label style={labelStyle}>Mức lương đề xuất (VNĐ) *</label>
                  <input
                    type="text"
                    required
                    className={inputClasses}
                    value={formState.salary}
                    onChange={e => setFormState({ ...formState, salary: formatSalaryInput(e.target.value) })}
                    placeholder="VD: 15.000.000 - 20.000.000"
                    style={inputStyle}
                  />
                </div>

                <div className="col-md-6" style={formGroupStyle}>
                  <label style={labelStyle}>Kinh nghiệm (năm) *</label>
                  <input
                    type="text"
                    required
                    className={inputClasses}
                    value={formState.experience}
                    onChange={e => setFormState({ ...formState, experience: e.target.value })}
                    placeholder="VD: 1 năm, 2 năm, Không yêu cầu..."
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Mô tả công việc *</label>
                <textarea
                  required
                  rows={3}
                  className={inputClasses}
                  value={formState.description}
                  onChange={e => setFormState({ ...formState, description: e.target.value })}
                  placeholder="Mô tả các nhiệm vụ chính..."
                  style={{ ...inputStyle, resize: "none" }}
                />
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Yêu cầu ứng viên *</label>
                <textarea
                  required
                  rows={3}
                  className={inputClasses}
                  value={formState.requirements}
                  onChange={e => setFormState({ ...formState, requirements: e.target.value })}
                  placeholder="Yêu cầu về kinh nghiệm, kỹ năng..."
                  style={{ ...inputStyle, resize: "none" }}
                />
              </div>

              <div className="row g-3">
                <div className="col-md-6" style={formGroupStyle}>
                  <label style={labelStyle}>Thời gian đào tạo *</label>
                  <input
                    type="text"
                    required
                    className={inputClasses}
                    value={formState.trainingTime}
                    onChange={e => setFormState({ ...formState, trainingTime: e.target.value })}
                    placeholder="VD: 2 tuần đầu thử việc"
                    style={inputStyle}
                  />
                </div>
                <div className="col-md-6" style={formGroupStyle}>
                  <label style={labelStyle}>Địa điểm đào tạo *</label>
                  <input
                    type="text"
                    required
                    className={inputClasses}
                    value={formState.trainingLocation}
                    onChange={e => setFormState({ ...formState, trainingLocation: e.target.value })}
                    placeholder="VD: Phòng làm việc, Online..."
                    style={inputStyle}
                  />
                </div>
                <div className="col-12" style={formGroupStyle}>
                  <label style={labelStyle}>Thành phần tham gia *</label>
                  <input
                    type="text"
                    required
                    className={inputClasses}
                    value={formState.trainingParticipants}
                    onChange={e => setFormState({ ...formState, trainingParticipants: e.target.value })}
                    placeholder="VD: Mentor quản lý trực tiếp..."
                    style={inputStyle}
                  />
                </div>
                <div className="col-12" style={formGroupStyle}>
                  <label style={labelStyle}>Nội dung đào tạo *</label>
                  <textarea
                    required
                    rows={2}
                    className={inputClasses}
                    value={formState.trainingContent}
                    onChange={e => setFormState({ ...formState, trainingContent: e.target.value })}
                    placeholder="Các nội dung chính cần đào tạo hội nhập..."
                    style={{ ...inputStyle, resize: "none" }}
                  />
                </div>
              </div>

              </div>
            </div>
          </form>
        );

      case "Đào tạo":
        return (
          <form className="p-3 p-md-4 h-100 d-flex flex-column overflow-hidden" onSubmit={handleSubmit}>
            {formHeader}
            <div className="flex-grow-1 custom-scrollbar pe-1" style={{ minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
              <div className="d-flex flex-column gap-3">
                <div className="row g-3">
                  <div className="col-8" style={formGroupStyle}>
                    <label style={labelStyle}>Chuyên đề đào tạo *</label>
                    <input
                      type="text"
                      required
                      className={inputClasses}
                      value={formState.topic}
                      onChange={e => setFormState({ ...formState, topic: e.target.value })}
                      placeholder="VD: Đào tạo hội nhập, Kỹ năng Telesales..."
                      style={inputStyle}
                    />
                  </div>
                  <div className="col-4" style={formGroupStyle}>
                    <label style={labelStyle}>Loại đào tạo *</label>
                    <select
                      className={inputClasses}
                      value={formState.trainingType || "Định kỳ"}
                      onChange={e => setFormState({ ...formState, trainingType: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="Định kỳ">Định kỳ</option>
                      <option value="Đột xuất">Đột xuất</option>
                    </select>
                  </div>
                  <div className="col-12 position-relative" style={formGroupStyle}>
                    <label style={labelStyle}>Người giảng dạy *</label>
                    
                    {/* Multi-select input container */}
                    <div 
                      className={`d-flex flex-wrap align-items-center gap-1 ${inputClasses}`}
                      style={{
                        ...inputStyle,
                        minHeight: "38px",
                        padding: "4px 8px",
                        cursor: "text"
                      }}
                      onClick={() => {
                        const el = document.getElementById("trainer-search-input");
                        if (el) el.focus();
                        setIsTrainerDropdownOpen(true);
                      }}
                    >
                      {selectedTrainers.map(trainer => (
                        <span 
                          key={trainer.id} 
                          className="badge d-flex align-items-center gap-1 py-1 px-2 border"
                          style={{ 
                            fontSize: "12px", 
                            fontWeight: 500, 
                            backgroundColor: "#f0f4ff", 
                            color: "#003087",
                            borderRadius: "6px",
                            borderColor: "#d0dffa"
                          }}
                        >
                          {trainer.name}
                          <button
                            type="button"
                            className="btn-close p-0 m-0"
                            style={{ fontSize: "9px", width: "9px", height: "9px" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveTrainer(trainer.id);
                            }}
                          />
                        </span>
                      ))}
                      
                      <input
                        id="trainer-search-input"
                        type="text"
                        className="flex-grow-1 border-0 bg-transparent shadow-none p-1"
                        style={{ 
                          fontSize: "13px", 
                          outline: "none", 
                          minWidth: "120px", 
                          color: "var(--foreground)" 
                        }}
                        placeholder={selectedTrainers.length === 0 ? "Tìm kiếm và chọn người giảng dạy..." : ""}
                        value={trainerSearch}
                        onChange={e => {
                          setTrainerSearch(e.target.value);
                          setIsTrainerDropdownOpen(true);
                        }}
                        onFocus={() => setIsTrainerDropdownOpen(true)}
                      />
                    </div>
                    
                    {/* Hidden input to satisfy HTML5 required validation */}
                    <input 
                      type="text" 
                      required 
                      value={formState.trainer || ""}
                      onChange={() => {}}
                      style={{
                        position: "absolute",
                        opacity: 0,
                        width: 0,
                        height: 0,
                        pointerEvents: "none"
                      }}
                    />

                    {/* Autocomplete Dropdown */}
                    {isTrainerDropdownOpen && (
                      <>
                        <div 
                          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} 
                          onClick={() => setIsTrainerDropdownOpen(false)}
                        />
                        <div 
                          className="position-absolute w-100 bg-white border rounded-3 mt-1 shadow-lg overflow-auto"
                          style={{ 
                            top: "100%", 
                            left: 0, 
                            zIndex: 999, 
                            maxHeight: "200px", 
                            borderColor: "var(--border)",
                            backgroundColor: "#ffffff"
                          }}
                        >
                          {filteredEmployees.length > 0 ? (
                            filteredEmployees.map(emp => {
                              const isSelected = selectedTrainers.some(t => t.id === emp.id);
                              return (
                                <div
                                  key={emp.id}
                                  className="d-flex align-items-center justify-content-between px-3 py-1 cursor-pointer"
                                  style={{
                                    fontSize: "13px",
                                    cursor: "pointer",
                                    backgroundColor: isSelected ? "#e0eafd" : "transparent",
                                    color: "var(--foreground)"
                                  }}
                                  onClick={() => handleSelectTrainer(emp)}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isSelected ? "#e0eafd" : "#f1f5f9"}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isSelected ? "#e0eafd" : "transparent"}
                                >
                                  <div>
                                    <div className="fw-semibold text-dark">{emp.name}</div>
                                    <div className="text-muted" style={{ fontSize: "11px" }}>{emp.role} - {emp.dept}</div>
                                  </div>
                                  {isSelected && <i className="bi bi-check text-primary" style={{ fontSize: "16px" }}></i>}
                                </div>
                              );
                            })
                          ) : (
                            <div className="px-3 py-2 text-muted text-center" style={{ fontSize: "13px" }}>
                              Không tìm thấy nhân viên phù hợp
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="col-3" style={formGroupStyle}>
                    <label style={labelStyle}>Thời gian bắt đầu *</label>
                    <input
                      type="datetime-local"
                      required
                      className={inputClasses}
                      value={formState.startTime || ""}
                      onChange={e => setFormState({ ...formState, startTime: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div className="col-3" style={formGroupStyle}>
                    <label style={labelStyle}>Thời gian kết thúc *</label>
                    <input
                      type="datetime-local"
                      required
                      className={inputClasses}
                      value={formState.endTime || ""}
                      onChange={e => setFormState({ ...formState, endTime: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div className="col-6" style={formGroupStyle}>
                    <label style={labelStyle}>Địa điểm *</label>
                    <input
                      type="text"
                      required
                      className={inputClasses}
                      value={formState.location}
                      onChange={e => setFormState({ ...formState, location: e.target.value })}
                      placeholder="VD: Phòng họp lớn, Online..."
                      style={inputStyle}
                    />
                  </div>
                  <div className="col-12" style={formGroupStyle}>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <label style={{ ...labelStyle, marginBottom: 0 }}>Đối tượng tham gia *</label>
                      <div className="form-check form-switch d-flex align-items-center gap-2 mb-0" style={{ cursor: "pointer" }}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          id="selectDeptModeSwitch"
                          checked={isSelectDeptMode}
                          onChange={(e) => {
                            setIsSelectDeptMode(e.target.checked);
                            setParticipantSearch("");
                          }}
                          style={{ cursor: "pointer", width: "28px", height: "16px" }}
                        />
                        <label 
                          className="form-check-label select-none" 
                          htmlFor="selectDeptModeSwitch"
                          style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", cursor: "pointer" }}
                        >
                          Chọn phòng
                        </label>
                      </div>
                    </div>

                    <div className="position-relative">
                      {/* Multi-select input container */}
                      <div 
                        className={`d-flex flex-wrap align-items-center gap-1 ${inputClasses}`}
                        style={{
                          ...inputStyle,
                          minHeight: "38px",
                          padding: "4px 8px",
                          cursor: "text"
                        }}
                        onClick={() => {
                          const el = document.getElementById("participant-search-input");
                          if (el) el.focus();
                          setIsParticipantDropdownOpen(true);
                        }}
                      >
                        {selectedParticipants.map(participant => (
                          <span 
                            key={`${participant.isDept ? "dept" : "emp"}-${participant.id}`} 
                            className="badge d-flex align-items-center gap-1 py-1 px-2 border"
                            style={{ 
                              fontSize: "12px", 
                              fontWeight: 500, 
                              backgroundColor: "#f0f4ff", 
                              color: "#003087",
                              borderRadius: "6px",
                              borderColor: "#d0dffa"
                            }}
                          >
                            {participant.name}
                            <button
                              type="button"
                              className="btn-close p-0 m-0"
                              style={{ fontSize: "9px", width: "9px", height: "9px" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveParticipant(participant.id, participant.isDept);
                              }}
                            />
                          </span>
                        ))}
                        
                        <input
                          id="participant-search-input"
                          type="text"
                          className="flex-grow-1 border-0 bg-transparent shadow-none p-1"
                          style={{ 
                            fontSize: "13px", 
                            outline: "none", 
                            minWidth: "120px", 
                            color: "var(--foreground)" 
                          }}
                          placeholder={selectedParticipants.length === 0 
                            ? (isSelectDeptMode ? "Tìm kiếm và chọn phòng ban..." : "Tìm kiếm và chọn đối tượng tham gia...") 
                            : ""
                          }
                          value={participantSearch}
                          onChange={e => {
                            setParticipantSearch(e.target.value);
                            setIsParticipantDropdownOpen(true);
                          }}
                          onFocus={() => setIsParticipantDropdownOpen(true)}
                        />
                      </div>
                      
                      {/* Hidden input to satisfy HTML5 required validation */}
                      <input 
                        type="text" 
                        required 
                        value={formState.participants || ""}
                        onChange={() => {}}
                        style={{
                          position: "absolute",
                          opacity: 0,
                          width: 0,
                          height: 0,
                          pointerEvents: "none"
                        }}
                      />

                      {/* Autocomplete Dropdown */}
                      {isParticipantDropdownOpen && (
                        <>
                          <div 
                            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} 
                            onClick={() => setIsParticipantDropdownOpen(false)}
                          />
                          <div 
                            className="position-absolute w-100 bg-white border rounded-3 mt-1 shadow-lg overflow-auto"
                            style={{ 
                              top: "100%", 
                              left: 0, 
                              zIndex: 999, 
                              maxHeight: "200px", 
                              borderColor: "var(--border)",
                              backgroundColor: "#ffffff"
                            }}
                          >
                            {isSelectDeptMode ? (
                              filteredDepts.length > 0 ? (
                                filteredDepts.map(dept => (
                                  <div
                                    key={dept.code}
                                    className="px-3 py-1 cursor-pointer text-dark"
                                    style={{
                                      fontSize: "13px",
                                      cursor: "pointer",
                                    }}
                                    onClick={() => handleSelectParticipant(dept, true)}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f1f5f9"}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                  >
                                    {dept.name}
                                  </div>
                                ))
                              ) : (
                                <div className="px-3 py-2 text-muted text-center" style={{ fontSize: "13px" }}>
                                  Không tìm thấy phòng ban phù hợp
                                </div>
                              )
                            ) : (
                              filteredParticipantEmployees.length > 0 ? (
                                filteredParticipantEmployees.map(emp => (
                                  <div
                                    key={emp.id}
                                    className="d-flex align-items-center justify-content-between px-3 py-1 cursor-pointer"
                                    style={{
                                      fontSize: "13px",
                                      cursor: "pointer",
                                      color: "var(--foreground)"
                                    }}
                                    onClick={() => handleSelectParticipant(emp, false)}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f1f5f9"}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                  >
                                    <div>
                                      <div className="text-dark">{emp.name}</div>
                                      <div className="text-muted" style={{ fontSize: "11px" }}>{emp.role} - {emp.dept}</div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="px-3 py-2 text-muted text-center" style={{ fontSize: "13px" }}>
                                  Không tìm thấy nhân viên phù hợp
                                </div>
                              )
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Dynamic Supplies List Row */}
                  <div className="col-12 mt-2">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <label style={labelStyle}>Danh sách dụng cụ & Bộ phận chuẩn bị *</label>
                      <button
                        type="button"
                        className="btn btn-xs btn-outline-primary py-1 px-2"
                        style={{ fontSize: "11px", borderRadius: "6px" }}
                        onClick={handleAddSupplyRow}
                      >
                        <i className="bi bi-plus-lg me-1"></i>Thêm dòng
                      </button>
                    </div>
                    
                    <div className="bg-white" style={{ backgroundColor: "#ffffff" }}>
                      <table className="table table-sm table-borderless mb-0 bg-white" style={{ fontSize: "12.5px", verticalAlign: "middle", backgroundColor: "#ffffff" }}>
                        <thead>
                          <tr className="border-bottom text-muted" style={{ fontSize: "10px", fontWeight: 700, backgroundColor: "#ffffff" }}>
                            <th className="px-3 py-2 bg-white" style={{ width: "30%", borderBottom: "none", backgroundColor: "#ffffff" }}>BỘ PHẬN CHUẨN BỊ</th>
                            <th className="px-3 py-2 bg-white" style={{ borderBottom: "none", backgroundColor: "#ffffff" }}>DỤNG CỤ, THIẾT BỊ MƯỢN</th>
                            <th className="px-3 py-2 bg-white" style={{ width: "30%", borderBottom: "none", backgroundColor: "#ffffff" }}>NGUỒN THIẾT BỊ</th>
                            <th className="px-3 py-2 text-center bg-white" style={{ width: "50px", borderBottom: "none", backgroundColor: "#ffffff" }}>XÓA</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formState.trainingSupplies?.map((supply: any, idx: number) => (
                            <tr key={supply.id} style={{ backgroundColor: "#ffffff" }}>
                              <td className="bg-white" style={{ padding: "2px", verticalAlign: "middle", backgroundColor: "#ffffff" }}>
                                <div className="position-relative">
                                  <input
                                    type="text"
                                    required
                                    className="form-control form-control-sm border-0 bg-transparent shadow-none"
                                    value={supply.department}
                                    onChange={e => handleUpdateSupplyRow(supply.id, "department", e.target.value)}
                                    onFocus={() => setActiveSupplyDropdown({ id: supply.id, field: "department" })}
                                    placeholder="VD: Phòng IT"
                                    style={{ fontSize: "12.5px", padding: "2px 6px", height: "28px" }}
                                  />
                                  {activeSupplyDropdown?.id === supply.id && activeSupplyDropdown?.field === "department" && (
                                    <>
                                      <div 
                                        style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} 
                                        onClick={() => setActiveSupplyDropdown(null)}
                                      />
                                      <div 
                                        className="position-absolute w-100 bg-white border rounded-3 mt-1 shadow-lg overflow-auto"
                                        style={{ 
                                          bottom: "100%", 
                                          left: 0, 
                                          zIndex: 999, 
                                          maxHeight: "150px", 
                                          borderColor: "var(--border)",
                                          backgroundColor: "#ffffff"
                                        }}
                                      >
                                        {departments.filter(dept => dept.name.toLowerCase().includes((supply.department || "").toLowerCase())).length > 0 ? (
                                          departments
                                            .filter(dept => dept.name.toLowerCase().includes((supply.department || "").toLowerCase()))
                                            .map(dept => (
                                              <div
                                                key={dept.code}
                                                className="px-3 py-1 cursor-pointer text-dark text-start"
                                                style={{
                                                  fontSize: "12.5px",
                                                  cursor: "pointer",
                                                }}
                                                onClick={() => {
                                                  handleUpdateSupplyRow(supply.id, "department", dept.name);
                                                  setActiveSupplyDropdown(null);
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f1f5f9"}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                              >
                                                {dept.name}
                                              </div>
                                            ))
                                        ) : (
                                          <div className="px-3 py-1.5 text-muted text-center" style={{ fontSize: "12px" }}>
                                            Không tìm thấy phòng ban
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </td>
                              <td className="bg-white" style={{ padding: "2px", verticalAlign: "middle", backgroundColor: "#ffffff" }}>
                                <input
                                  type="text"
                                  required
                                  className="form-control form-control-sm border-0 bg-transparent shadow-none"
                                  value={supply.equipment}
                                  onChange={e => handleUpdateSupplyRow(supply.id, "equipment", e.target.value)}
                                  placeholder="VD: Máy chiếu, tài liệu..."
                                  style={{ fontSize: "12.5px", padding: "2px 6px", height: "28px" }}
                                />
                              </td>
                              <td className="bg-white" style={{ padding: "2px", verticalAlign: "middle", backgroundColor: "#ffffff" }}>
                                <div className="position-relative">
                                  <input
                                    type="text"
                                    required
                                    className="form-control form-control-sm border-0 bg-transparent shadow-none"
                                    value={supply.source || ""}
                                    onChange={e => handleUpdateSupplyRow(supply.id, "source", e.target.value)}
                                    onFocus={() => setActiveSupplyDropdown({ id: supply.id, field: "source" })}
                                    placeholder="VD: Kho công ty"
                                    style={{ fontSize: "12.5px", padding: "2px 6px", height: "28px" }}
                                  />
                                  {activeSupplyDropdown?.id === supply.id && activeSupplyDropdown?.field === "source" && (
                                    <>
                                      <div 
                                        style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} 
                                        onClick={() => setActiveSupplyDropdown(null)}
                                      />
                                      <div 
                                        className="position-absolute w-100 bg-white border rounded-3 mt-1 shadow-lg overflow-auto"
                                        style={{ 
                                          bottom: "100%", 
                                          left: 0, 
                                          zIndex: 999, 
                                          maxHeight: "150px", 
                                          borderColor: "var(--border)",
                                          backgroundColor: "#ffffff"
                                        }}
                                      >
                                        {departments.filter(dept => dept.name.toLowerCase().includes((supply.source || "").toLowerCase())).length > 0 ? (
                                          departments
                                            .filter(dept => dept.name.toLowerCase().includes((supply.source || "").toLowerCase()))
                                            .map(dept => (
                                              <div
                                                key={dept.code}
                                                className="px-3 py-1 cursor-pointer text-dark text-start"
                                                style={{
                                                  fontSize: "12.5px",
                                                  cursor: "pointer",
                                                }}
                                                onClick={() => {
                                                  handleUpdateSupplyRow(supply.id, "source", dept.name);
                                                  setActiveSupplyDropdown(null);
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f1f5f9"}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                              >
                                                {dept.name}
                                              </div>
                                            ))
                                        ) : (
                                          <div className="px-3 py-1.5 text-muted text-center" style={{ fontSize: "12px" }}>
                                            Không tìm thấy phòng ban
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </td>
                              <td className="bg-white text-center" style={{ padding: "2px", verticalAlign: "middle", backgroundColor: "#ffffff" }}>
                                <button
                                  type="button"
                                  className="btn btn-link text-danger p-0 border-0 bg-transparent shadow-none"
                                  disabled={formState.trainingSupplies.length <= 1}
                                  onClick={() => handleRemoveSupplyRow(supply.id)}
                                  style={{ opacity: formState.trainingSupplies.length <= 1 ? 0.3 : 1, transition: "opacity 0.15s ease" }}
                                >
                                  <i className="bi bi-trash" style={{ fontSize: "14px" }}></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div style={formGroupStyle}>
                  <label style={labelStyle}>Nội dung đào tạo chính *</label>
                  <textarea
                    required
                    rows={4}
                    className={inputClasses}
                    value={formState.trainingContent}
                    onChange={e => setFormState({ ...formState, trainingContent: e.target.value })}
                    placeholder="Các nội dung chính sẽ giảng dạy..."
                    style={{ ...inputStyle, resize: "none" }}
                  />
                </div>
              </div>
            </div>
          </form>
        );

      case "Điều chỉnh thu nhập":
        return (
          <form className="p-3 p-md-4 h-100 d-flex flex-column overflow-hidden" onSubmit={handleSubmit}>
            {formHeader}
            <div className="flex-grow-1 custom-scrollbar pe-1" style={{ minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
              <div className="d-flex flex-column gap-3">
              <div className="row g-3">
                <div className="col-12 position-relative" style={formGroupStyle}>
                  <label style={labelStyle}>Nhân viên được đề xuất *</label>
                  <input
                    type="text"
                    required
                    className={inputClasses}
                    value={formState.employee}
                    onChange={e => {
                      setFormState({ ...formState, employee: e.target.value });
                      setIsProposalEmployeeDropdownOpen(true);
                    }}
                    onFocus={() => setIsProposalEmployeeDropdownOpen(true)}
                    placeholder="Họ tên nhân viên - Phòng ban..."
                    style={inputStyle}
                  />
                  {isProposalEmployeeDropdownOpen && (
                    <>
                      <div 
                        style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} 
                        onClick={() => setIsProposalEmployeeDropdownOpen(false)}
                      />
                      <div 
                        className="position-absolute w-100 bg-white border rounded-3 mt-1 shadow-lg overflow-auto"
                        style={{ 
                          top: "100%", 
                          left: 0, 
                          zIndex: 999, 
                          maxHeight: "200px", 
                          borderColor: "var(--border)",
                          backgroundColor: "#ffffff"
                        }}
                      >
                        {filteredProposalEmployees.length > 0 ? (
                          filteredProposalEmployees.map(emp => (
                            <div
                              key={emp.id}
                              className="d-flex align-items-center justify-content-between px-3 py-1 cursor-pointer"
                              style={{
                                fontSize: "13px",
                                cursor: "pointer",
                                color: "var(--foreground)"
                              }}
                              onClick={() => handleSelectProposalEmployee(emp)}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f1f5f9"}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                            >
                              <div>
                                <div className="text-dark">{emp.name}</div>
                                <div className="text-muted" style={{ fontSize: "11px" }}>{emp.role} - {emp.dept}</div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-muted text-center" style={{ fontSize: "13px" }}>
                            Không tìm thấy nhân viên phù hợp
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <div className="col-6" style={formGroupStyle}>
                  <label style={labelStyle}>Loại điều chỉnh *</label>
                  <select
                    required
                    className={inputClasses}
                    value={formState.adjustmentType || "Tăng lương"}
                    onChange={e => setFormState({ ...formState, adjustmentType: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="Tăng lương">Tăng lương</option>
                    <option value="Giảm lương">Giảm lương</option>
                    <option value="Tái cơ cấu thu nhập">Tái cơ cấu thu nhập</option>
                  </select>
                </div>
                <div className="col-6" style={formGroupStyle}>
                  <label style={labelStyle}>Ngày áp dụng đề xuất *</label>
                  <input
                    type="date"
                    required
                    className={inputClasses}
                    value={formState.effectiveDate}
                    onChange={e => setFormState({ ...formState, effectiveDate: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Lý do đề xuất điều chỉnh *</label>
                <textarea
                  required
                  rows={4}
                  className={inputClasses}
                  value={formState.reason}
                  onChange={e => setFormState({ ...formState, reason: e.target.value })}
                  placeholder="Ghi rõ thành tích hoặc lý do đề xuất tăng/giảm..."
                  style={{ ...inputStyle, resize: "none" }}
                />
              </div>

              {/* Chi tiết thu nhập Table */}
              <div className="mt-2">
                <label className="mb-2" style={labelStyle}>
                  Chi tiết thu nhập (VNĐ/tháng)
                </label>
                <div className="bg-white">
                  <table className="table table-sm mb-0 bg-white" style={{ fontSize: "13px", verticalAlign: "middle", backgroundColor: "#ffffff" }}>
                    <thead>
                      <tr className="bg-light text-muted" style={{ fontSize: "11px", fontWeight: 700, backgroundColor: "#f8f9fa" }}>
                        <th className="px-3 py-2 bg-light text-start" style={{ width: "35%", borderBottom: "none" }}>Khoản mục</th>
                        <th className="px-3 py-2 bg-light text-end" style={{ width: "25%", borderBottom: "none" }}>Hiện tại</th>
                        <th className="px-3 py-2 bg-light text-end" style={{ width: "25%", borderBottom: "none" }}>Sau điều chỉnh</th>
                        <th className="px-3 py-2 bg-light text-end" style={{ width: "15%", borderBottom: "none" }}>Tỷ lệ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(formState.incomeDetails || [
                        { key: "basic", label: "Lương cơ bản", current: 0, proposed: 0 },
                        { key: "lunch", label: "Phụ cấp ăn trưa", current: 0, proposed: 0 },
                        { key: "gas", label: "Phụ cấp xăng xe", current: 0, proposed: 0 },
                        { key: "phone", label: "Phụ cấp điện thoại", current: 0, proposed: 0 },
                        { key: "seniority", label: "Phụ cấp thâm niên", current: 0, proposed: 0 }
                      ]).map((item: any) => {
                        const ratioInfo = calculateRatio(Number(item.current) || 0, Number(item.proposed) || 0);
                        return (
                          <tr key={item.key} style={{ backgroundColor: "#ffffff" }}>
                            <td className="px-3 py-1.5 bg-white text-start text-dark" style={{ fontSize: "12.5px" }}>
                              {item.label}
                            </td>
                            <td className="p-1 bg-white" style={{ verticalAlign: "middle" }}>
                              <input
                                type="text"
                                className="form-control form-control-sm border-0 bg-transparent shadow-none text-end"
                                value={formatNumber(item.current || 0)}
                                onChange={e => handleUpdateIncomeDetail(item.key, "current", parseNumber(e.target.value))}
                                style={{ fontSize: "12.5px", padding: "2px 6px", height: "28px" }}
                              />
                            </td>
                            <td className="p-1 bg-white" style={{ verticalAlign: "middle" }}>
                              <input
                                type="text"
                                className={`form-control form-control-sm border-0 bg-transparent shadow-none text-end`}
                                value={formatNumber(item.proposed || 0)}
                                onChange={e => handleUpdateIncomeDetail(item.key, "proposed", parseNumber(e.target.value))}
                                style={{ fontSize: "12.5px", padding: "2px 6px", height: "28px", fontWeight: item.key === "basic" ? 700 : 400 }}
                              />
                            </td>
                            <td className="px-3 py-1.5 bg-white text-end fw-bold" style={{ fontSize: "12.5px", color: ratioInfo.color }}>
                              {ratioInfo.text}
                            </td>
                          </tr>
                        );
                      })}
                      
                      {/* Total Row */}
                      {(() => {
                        const totalCurrent = (formState.incomeDetails || []).reduce((sum: number, item: any) => sum + (Number(item.current) || 0), 0);
                        const totalProposed = (formState.incomeDetails || []).reduce((sum: number, item: any) => sum + (Number(item.proposed) || 0), 0);
                        const totalRatio = calculateRatio(totalCurrent, totalProposed);
                        return (
                          <tr className="bg-light" style={{ backgroundColor: "#f8f9fa", borderTop: "2px solid #dee2e6" }}>
                            <td className="px-3 py-2 fw-bold text-primary text-start" style={{ fontSize: "12.5px", color: "#003087", fontWeight: 700 }}>
                              TỔNG THU NHẬP
                            </td>
                            <td className="px-3 py-2 fw-bold text-dark text-end" style={{ fontSize: "12.5px", fontWeight: 700 }}>
                              {totalCurrent.toLocaleString("vi-VN")}
                            </td>
                            <td className="px-3 py-2 fw-bold text-success text-end" style={{ fontSize: "12.5px", color: "#198754", fontWeight: 700 }}>
                              {totalProposed.toLocaleString("vi-VN")}
                            </td>
                            <td className="px-3 py-2 fw-bold text-end" style={{ fontSize: "12.5px", color: totalRatio.color }}>
                              {totalRatio.text}
                            </td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
              </div>
            </div>
          </form>
        );

      case "Đề bạt và thuyên chuyển":
        return (
          <form className="p-3 p-md-4 h-100 d-flex flex-column overflow-hidden" onSubmit={handleSubmit}>
            {formHeader}
            <div className="flex-grow-1 custom-scrollbar pe-1" style={{ minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
              <div className="d-flex flex-column gap-3">
              <div className="row g-3">
                <div className="col-12 d-flex align-items-end gap-3 position-relative">
                  <div className="form-check form-switch pb-2" style={{ paddingLeft: "2.5em", minWidth: "150px" }}>
                    <input
                      className="form-check-input cursor-pointer"
                      type="checkbox"
                      role="switch"
                      id="isTransferSwitch"
                      checked={formState.isTransfer || false}
                      onChange={e => setFormState({ 
                        ...formState, 
                        isTransfer: e.target.checked,
                        targetDepartment: e.target.checked ? formState.targetDepartment : ""
                      })}
                      style={{ cursor: "pointer", width: "2.4em", height: "1.2em" }}
                    />
                    <label className="form-check-label text-dark fw-bold ms-2 cursor-pointer" htmlFor="isTransferSwitch" style={{ fontSize: "13px", cursor: "pointer", userSelect: "none" }}>
                      Thuyên chuyển
                    </label>
                  </div>
                  <div className="flex-grow-1 position-relative" style={formGroupStyle}>
                    <label style={labelStyle}>Nhân viên đề xuất *</label>
                    <input
                      type="text"
                      required
                      className={inputClasses}
                      value={formState.employee}
                      onChange={e => {
                        setFormState({ ...formState, employee: e.target.value });
                        setIsProposalEmployeeDropdownOpen(true);
                      }}
                      onFocus={() => setIsProposalEmployeeDropdownOpen(true)}
                      placeholder="Họ tên nhân viên..."
                      style={inputStyle}
                    />
                    {isProposalEmployeeDropdownOpen && (
                      <>
                        <div 
                          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} 
                          onClick={() => setIsProposalEmployeeDropdownOpen(false)}
                        />
                        <div 
                          className="position-absolute w-100 bg-white border rounded-3 mt-1 shadow-lg overflow-auto"
                          style={{ 
                            top: "100%", 
                            left: 0, 
                            zIndex: 999, 
                            maxHeight: "200px", 
                            borderColor: "var(--border)",
                            backgroundColor: "#ffffff"
                          }}
                        >
                          {filteredProposalEmployees.length > 0 ? (
                            filteredProposalEmployees.map(emp => (
                              <div
                                key={emp.id}
                                className="d-flex align-items-center justify-content-between px-3 py-1 cursor-pointer"
                                style={{
                                  fontSize: "13px",
                                  cursor: "pointer",
                                  color: "var(--foreground)"
                                }}
                                onClick={() => handleSelectProposalEmployee(emp)}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f1f5f9"}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                              >
                                <div>
                                  <div className="text-dark">{emp.name}</div>
                                  <div className="text-muted" style={{ fontSize: "11px" }}>{emp.role} - {emp.dept}</div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-muted text-center" style={{ fontSize: "13px" }}>
                              Không tìm thấy nhân viên phù hợp
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="col-6" style={formGroupStyle}>
                  <label style={labelStyle}>Bộ phận hiện tại *</label>
                  <input
                    type="text"
                    required
                    className={inputClasses}
                    value={formState.currentRole}
                    onChange={e => setFormState({ ...formState, currentRole: e.target.value })}
                    placeholder="VD: Phòng Marketing"
                    style={inputStyle}
                  />
                </div>
                <div className="col-6" style={formGroupStyle}>
                  <label style={labelStyle}>Bộ phận đích {formState.isTransfer ? "*" : ""}</label>
                  <FilterSelect
                    placeholder="Chọn bộ phận đích..."
                    options={departments
                      .filter(d => d.name !== formState.currentRole)
                      .map(d => ({ label: d.name, value: d.name }))}
                    value={formState.targetDepartment}
                    onChange={val => setFormState({ ...formState, targetDepartment: val })}
                    disabled={!formState.isTransfer}
                    required={formState.isTransfer}
                    width="100%"
                    className={inputClasses}
                  />
                </div>
                <div className="col-6" style={formGroupStyle}>
                  <label style={labelStyle}>Chức danh mới *</label>
                  <input
                    type="text"
                    required
                    className={inputClasses}
                    value={formState.proposedRole}
                    onChange={e => setFormState({ ...formState, proposedRole: e.target.value })}
                    placeholder="VD: Trưởng nhóm Marketing"
                    style={inputStyle}
                  />
                </div>
                <div className="col-6" style={formGroupStyle}>
                  <label style={labelStyle}>Ngày hiệu lực dự kiến *</label>
                  <input
                    type="date"
                    required
                    className={inputClasses}
                    value={formState.effectiveDate}
                    onChange={e => setFormState({ ...formState, effectiveDate: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Đánh giá năng lực & Lý do đề xuất *</label>
                <textarea
                  required
                  rows={4}
                  className={inputClasses}
                  value={formState.reason}
                  onChange={e => setFormState({ ...formState, reason: e.target.value })}
                  placeholder="Lý do bổ nhiệm thăng chức hoặc chuyển đổi bộ phận..."
                  style={{ ...inputStyle, resize: "none" }}
                />
              </div>
              </div>
            </div>
          </form>
        );

      case "Văn phòng phẩm và dụng cụ":
        return (
          <form className="p-3 p-md-4 h-100 d-flex flex-column overflow-hidden" onSubmit={handleSubmit}>
            {formHeader}
            <div className="flex-grow-1 custom-scrollbar pe-1" style={{ minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
              <div className="d-flex flex-column gap-2" style={{ paddingBottom: "180px" }}>
                <div className="d-flex align-items-end gap-2">
                  <div className="flex-grow-1" style={formGroupStyle}>
                    <label style={labelStyle}>Ghi chú / Lý do đề xuất *</label>
                    <input
                      type="text"
                      required
                      className={inputClasses}
                      value={formState.note}
                      onChange={e => setFormState({ ...formState, note: e.target.value })}
                      placeholder="VD: Cấp phát định kỳ, Sử dụng cho dự án mới..."
                      style={inputStyle}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm rounded-circle d-flex align-items-center justify-content-center"
                    style={{ width: "38px", height: "38px", flexShrink: 0 }}
                    onClick={handleAddStationeryItemRow}
                    title="Thêm vật tư"
                  >
                    <i className="bi bi-plus-lg" style={{ fontSize: "16px" }} />
                  </button>
                </div>

                <div className="border-bottom pb-1 mt-1">
                  <span className="fw-bold text-secondary" style={{ fontSize: "11px" }}>DANH SÁCH VẬT TƯ ĐỀ XUẤT *</span>
                </div>

                <div className="border rounded-3 mb-3" style={{ position: "relative" }}>
                  <style>{`
                    .stationery-table-container .app-responsive-table-wrapper {
                      overflow: visible !important;
                    }
                  `}</style>
                  <div className="stationery-table-container">
                    <Table
                      rows={formState.stationeryItems || []}
                      columns={creationTableColumns}
                      compact={true}
                      striped={true}
                      wrapperClassName="mkt-plan-table-no-min"
                      emptyIcon="bi-cart-x"
                      emptyText='Chưa chọn vật tư nào. Bấm "Thêm vật tư" để chọn.'
                    />
                  </div>
                </div>
              </div>
            </div>
          </form>
        );

      default:
        return null;
    }
  };

  const renderRightPanel = () => {
    if (!selectedRequest) {
      return (
        <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted p-5 text-center">
          <i className="bi bi-file-earmark-plus" style={{ fontSize: 48, opacity: 0.3, marginBottom: 16 }} />
          <h5>Chi tiết yêu cầu</h5>
          <p className="small" style={{ maxWidth: 300 }}>
            Vui lòng chọn một yêu cầu từ danh sách bên trái để xem thông tin chi tiết.
          </p>
        </div>
      );
    }

    const panelHeader = (
      <div className="border-bottom pb-3 mb-3">
        <button
          className="btn btn-link text-decoration-none p-0 mb-2 d-xl-none d-flex align-items-center gap-1"
          onClick={() => setActiveMobileTab("left")}
          style={{ fontSize: "13px", color: "#003087", fontWeight: 500 }}
        >
          <i className="bi bi-arrow-left"></i> Quay lại danh sách
        </button>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <div className="d-flex align-items-center gap-2 mb-2">
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1 rounded-2" style={{ fontSize: "10.5px", fontWeight: 600 }}>
                {selectedRequest.type}
              </span>
              <StatusBadge status={selectedRequest.status} />
            </div>
            <h5 className="fw-bold text-dark mb-0" style={{ fontSize: "16px" }}>{selectedRequest.content}</h5>
          </div>
          <div className="text-end">
            <span className="text-muted small d-block">Ngày lập: <strong>{selectedRequest.date}</strong></span>
          </div>
        </div>
      </div>
    );

    switch (selectedRequest.type) {
      case "Tuyển dụng":
        return (
          <div className="p-3 p-md-4 h-100 d-flex flex-column overflow-hidden">
            {panelHeader}
            <div className="flex-grow-1 custom-scrollbar pe-1" style={{ minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
              <div className="d-flex flex-column gap-3">
              
              <div className="fw-bold text-secondary mb-1" style={{ fontSize: "11px", borderBottom: "1px solid var(--border)", paddingBottom: "4px" }}>
                THÔNG TIN VỊ TRÍ
              </div>

              <div className="row g-3">
                <div className="col-6 col-md-4">
                  <label className="text-muted small text-uppercase fw-bold d-block mb-1" style={{ fontSize: 9, letterSpacing: "0.02em" }}>Ngày yêu cầu</label>
                  <div className="fw-bold text-dark" style={{ fontSize: "13px" }}>
                    {selectedRequest.details?.requestDate ? new Date(selectedRequest.details.requestDate).toLocaleDateString("vi-VN") : selectedRequest.date}
                  </div>
                </div>
                <div className="col-6 col-md-4">
                  <label className="text-muted small text-uppercase fw-bold d-block mb-1" style={{ fontSize: 9, letterSpacing: "0.02em" }}>Hạn nhân sự</label>
                  <div className="fw-bold text-danger" style={{ fontSize: "13px" }}>
                    {selectedRequest.details?.deadline ? new Date(selectedRequest.details.deadline).toLocaleDateString("vi-VN") : "30/06/2026"}
                  </div>
                </div>
                <div className="col-6 col-md-4">
                  <label className="text-muted small text-uppercase fw-bold d-block mb-1" style={{ fontSize: 9, letterSpacing: "0.02em" }}>Số lượng tuyển</label>
                  <div className="fw-bold text-dark" style={{ fontSize: "13px" }}>
                    {selectedRequest.details?.quantity ? `${selectedRequest.details.quantity} nhân sự` : "02 nhân sự"}
                  </div>
                </div>
                <div className="col-6 col-md-4">
                  <label className="text-muted small text-uppercase fw-bold d-block mb-1" style={{ fontSize: 9, letterSpacing: "0.02em" }}>Cấp bậc</label>
                  <div className="fw-bold text-dark" style={{ fontSize: "13px" }}>
                    {selectedRequest.details?.level ? selectedRequest.details.level : "Nhân viên"}
                  </div>
                </div>
                <div className="col-6 col-md-4">
                  <label className="text-muted small text-uppercase fw-bold d-block mb-1" style={{ fontSize: 9, letterSpacing: "0.02em" }}>Hình thức</label>
                  <div className="fw-bold text-dark" style={{ fontSize: "13px" }}>
                    {selectedRequest.details?.workType ? selectedRequest.details.workType : "Toàn thời gian"}
                  </div>
                </div>
                <div className="col-6 col-md-4">
                  <label className="text-muted small text-uppercase fw-bold d-block mb-1" style={{ fontSize: 9, letterSpacing: "0.02em" }}>Kinh nghiệm</label>
                  <div className="fw-bold text-dark" style={{ fontSize: "13px" }}>
                    {selectedRequest.details?.experience ? selectedRequest.details.experience : "1 năm"}
                  </div>
                </div>
                <div className="col-6 col-md-4">
                  <label className="text-muted small text-uppercase fw-bold d-block mb-1" style={{ fontSize: 9, letterSpacing: "0.02em" }}>Lương đề xuất</label>
                  <div className="fw-bold text-success" style={{ fontSize: "13px" }}>
                    {selectedRequest.details?.salary ? selectedRequest.details.salary : "12.000.000 - 15.000.000 VNĐ"}
                  </div>
                </div>
              </div>

              <hr className="my-1 text-muted opacity-25" />

              <div>
                <label className="text-muted small text-uppercase fw-bold d-block mb-1" style={{ fontSize: 10, letterSpacing: "0.02em" }}>Mô tả công việc</label>
                <p className="text-dark small lh-base mb-0" style={{ whiteSpace: "pre-line", fontSize: "12.5px" }}>
                  {selectedRequest.details?.description ? selectedRequest.details.description : (
                    <>- Thực hiện kiểm soát chứng từ và hạch toán kế toán kho nội bộ.
                    {"\n"}- Quản lý nhập - xuất - tồn kho vật tư, đối chiếu số liệu định kỳ.
                    {"\n"}- Lập báo cáo tồn kho hàng tuần/tháng gửi Kế toán trưởng.</>
                  )}
                </p>
              </div>

              <div>
                <label className="text-muted small text-uppercase fw-bold d-block mb-1" style={{ fontSize: 10, letterSpacing: "0.02em" }}>Yêu cầu ứng viên</label>
                <p className="text-dark small lh-base mb-0" style={{ whiteSpace: "pre-line", fontSize: "12.5px" }}>
                  {selectedRequest.details?.requirements ? selectedRequest.details.requirements : (
                    <>- Tốt nghiệp Cao đẳng trở lên ngành Kế toán, Kiểm toán hoặc Tài chính.
                    {"\n"}- Có ít nhất 1 năm kinh nghiệm làm kế toán kho hoặc kế toán tổng hợp.
                    {"\n"}- Sử dụng thành thạo Excel và các phần mềm kế toán thông dụng.</>
                  )}
                </p>
              </div>

              <div className="fw-bold text-secondary mt-2 mb-1" style={{ fontSize: "11px", borderBottom: "1px solid var(--border)", paddingBottom: "4px" }}>
                KẾ HOẠCH ĐÀO TẠO CHUYÊN MÔN
              </div>

              <div className="row g-3">
                <div className="col-6">
                  <label className="text-muted small text-uppercase fw-bold d-block mb-1" style={{ fontSize: 9, letterSpacing: "0.02em" }}>Thời gian đào tạo</label>
                  <div className="fw-bold text-dark" style={{ fontSize: "12.5px" }}>
                    {selectedRequest.details?.trainingTime ? selectedRequest.details.trainingTime : "2 tuần đầu thử việc"}
                  </div>
                </div>
                <div className="col-6">
                  <label className="text-muted small text-uppercase fw-bold d-block mb-1" style={{ fontSize: 9, letterSpacing: "0.02em" }}>Địa điểm đào tạo</label>
                  <div className="fw-bold text-dark" style={{ fontSize: "12.5px" }}>
                    {selectedRequest.details?.trainingLocation ? selectedRequest.details.trainingLocation : "Văn phòng chính"}
                  </div>
                </div>
                <div className="col-12">
                  <label className="text-muted small text-uppercase fw-bold d-block mb-1" style={{ fontSize: 9, letterSpacing: "0.02em" }}>Thành phần tham gia</label>
                  <div className="fw-bold text-dark" style={{ fontSize: "12.5px" }}>
                    {selectedRequest.details?.trainingParticipants ? selectedRequest.details.trainingParticipants : "Mentor quản lý trực tiếp"}
                  </div>
                </div>
                <div className="col-12">
                  <label className="text-muted small text-uppercase fw-bold d-block mb-1" style={{ fontSize: 9, letterSpacing: "0.02em" }}>Nội dung đào tạo</label>
                  <p className="text-dark small lh-base mb-0" style={{ whiteSpace: "pre-line", fontSize: "12.5px" }}>
                    {selectedRequest.details?.trainingContent ? selectedRequest.details.trainingContent : (
                      <>- Hướng dẫn sử dụng phần mềm kế toán Fast/Misa của công ty.
                      {"\n"}- Quy trình nhập kho nguyên vật liệu và lập phiếu đối soát.</>
                    )}
                  </p>
                </div>
              </div>

              </div>
            </div>
          </div>
        );

      case "Đào tạo":
        return (
          <div className="p-3 p-md-4 h-100 d-flex flex-column overflow-hidden">
            {panelHeader}
            <div className="flex-grow-1 custom-scrollbar pe-1" style={{ minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
              <div className="d-flex flex-column gap-3">
              <div className="row g-3">
                <div className="col-6">
                  <label className="text-muted small text-uppercase fw-bold d-block mb-1" style={{ fontSize: 9, letterSpacing: "0.02em" }}>Loại đào tạo</label>
                  <div className="fw-bold text-dark" style={{ fontSize: "13px" }}>
                    {selectedRequest.details?.trainingType ? selectedRequest.details.trainingType : "Định kỳ"}
                  </div>
                </div>
                <div className="col-6">
                  <label className="text-muted small text-uppercase fw-bold d-block mb-1" style={{ fontSize: 9, letterSpacing: "0.02em" }}>Người giảng dạy</label>
                  <div className="fw-bold text-dark" style={{ fontSize: "13px" }}>
                    {selectedRequest.details?.trainer ? selectedRequest.details.trainer : "Trần Hoàng Nam (Trưởng phòng Sales)"}
                  </div>
                </div>
                <div className="col-6">
                  <label className="text-muted small text-uppercase fw-bold d-block mb-1" style={{ fontSize: 9, letterSpacing: "0.02em" }}>Thời gian bắt đầu</label>
                  <div className="fw-bold text-dark" style={{ fontSize: "13px" }}>
                    {formatDateTime(
                      selectedRequest.details?.startTime
                        ? selectedRequest.details.startTime
                        : selectedRequest.details?.time
                        ? selectedRequest.details.time.split(" - ")[0]
                        : "2026-06-05 14:00"
                    )}
                  </div>
                </div>
                <div className="col-6">
                  <label className="text-muted small text-uppercase fw-bold d-block mb-1" style={{ fontSize: 9, letterSpacing: "0.02em" }}>Thời gian kết thúc</label>
                  <div className="fw-bold text-dark" style={{ fontSize: "13px" }}>
                    {formatDateTime(
                      selectedRequest.details?.endTime
                        ? selectedRequest.details.endTime
                        : selectedRequest.details?.time
                        ? selectedRequest.details.time.split(" - ")[1] || selectedRequest.details.time
                        : "2026-06-05 17:00"
                    )}
                  </div>
                </div>
                <div className="col-6">
                  <label className="text-muted small text-uppercase fw-bold d-block mb-1" style={{ fontSize: 9, letterSpacing: "0.02em" }}>Địa điểm đào tạo</label>
                  <div className="fw-bold text-dark" style={{ fontSize: "13px" }}>
                    {selectedRequest.details?.location ? selectedRequest.details.location : "Phòng họp lớn (Tầng 3)"}
                  </div>
                </div>
                <div className="col-6">
                  <label className="text-muted small text-uppercase fw-bold d-block mb-1" style={{ fontSize: 9, letterSpacing: "0.02em" }}>Đối tượng tham gia</label>
                  <div className="fw-bold text-dark" style={{ fontSize: "13px" }}>
                    {selectedRequest.details?.participants ? selectedRequest.details.participants : "Toàn bộ nhân viên Sales mới & cũ"}
                  </div>
                </div>
                <div className="col-12 mt-1">
                  <label className="text-muted small text-uppercase fw-bold d-block mb-2" style={{ fontSize: 9, letterSpacing: "0.02em" }}>Dụng cụ & Bộ phận chuẩn bị</label>
                  <div className="border rounded-2 overflow-hidden bg-light-subtle">
                    <table className="table table-sm table-borderless mb-0" style={{ fontSize: "12.5px" }}>
                      <thead>
                        <tr className="bg-light border-bottom" style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--muted-foreground)" }}>
                          <th className="px-3 py-2" style={{ width: "30%" }}>BỘ PHẬN CHUẨN BỊ</th>
                          <th className="px-3 py-2">DỤNG CỤ, THIẾT BỊ MƯỢN</th>
                          <th className="px-3 py-2" style={{ width: "30%" }}>NGUỒN THIẾT BỊ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRequest.details?.trainingSupplies && selectedRequest.details.trainingSupplies.length > 0 ? (
                          selectedRequest.details.trainingSupplies.map((item: any, i: number) => (
                            <tr key={item.id || i} className={i > 0 ? "border-top" : ""}>
                              <td className="px-3 py-2 fw-semibold text-dark">{item.department}</td>
                              <td className="px-3 py-2 text-secondary">{item.equipment}</td>
                              <td className="px-3 py-2 text-secondary">{item.source || "Kho công ty"}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td className="px-3 py-2 fw-semibold text-dark">
                              {selectedRequest.details?.department ? selectedRequest.details.department : "Phòng Hành chính Nhân sự (HR)"}
                            </td>
                            <td className="px-3 py-2 text-secondary">
                              {selectedRequest.details?.equipment ? selectedRequest.details.equipment : "Tivi trình chiếu, Sổ tay hội nhập (Handbook)"}
                            </td>
                            <td className="px-3 py-2 text-secondary">
                              {selectedRequest.details?.source ? selectedRequest.details.source : "Kho công ty"}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <hr className="my-1 text-muted opacity-25" />

              <div>
                <label className="text-muted small text-uppercase fw-bold d-block mb-1" style={{ fontSize: 10, letterSpacing: "0.02em" }}>Nội dung đào tạo chính</label>
                <p className="text-dark small lh-base mb-0" style={{ whiteSpace: "pre-line", fontSize: "12.5px" }}>
                  {selectedRequest.details?.trainingContent ? selectedRequest.details.trainingContent : (
                    <>1. Quy trình tiếp cận khách hàng tiềm năng qua điện thoại (Telesales).
                    {"\n"}2. Kỹ thuật xử lý từ chối và thuyết phục khách hàng.
                    {"\n"}3. Thực hành kịch bản chốt hợp đồng trực tiếp với Mentor.</>
                  )}
                </p>
              </div>
              </div>
            </div>
          </div>
        );

      case "Điều chỉnh thu nhập":
        return (
          <div className="p-3 p-md-4 h-100 d-flex flex-column overflow-hidden">
            {panelHeader}
            <div className="flex-grow-1 custom-scrollbar pe-1" style={{ minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
              <div className="d-flex flex-column gap-3">
              <div className="row g-3">
                <div className="col-12">
                  <label className="text-muted small text-uppercase fw-bold d-block mb-1" style={{ fontSize: 9, letterSpacing: "0.02em" }}>Nhân viên được đề xuất</label>
                  <div className="fw-bold text-dark" style={{ fontSize: "13px" }}>
                    {selectedRequest.details?.employee ? selectedRequest.details.employee : "Nguyễn Văn A (Lập trình viên - Phòng Kỹ thuật)"}
                  </div>
                </div>
                <div className="col-6">
                  <label className="text-muted small text-uppercase fw-bold d-block mb-1" style={{ fontSize: 9, letterSpacing: "0.02em" }}>Mức lương hiện tại</label>
                  <div className="fw-bold text-secondary" style={{ fontSize: "13px" }}>
                    {selectedRequest.details?.currentSalary ? selectedRequest.details.currentSalary : "15.000.000 VNĐ"}
                  </div>
                </div>
                <div className="col-6">
                  <label className="text-muted small text-uppercase fw-bold d-block mb-1" style={{ fontSize: 9, letterSpacing: "0.02em" }}>Mức lương đề xuất mới</label>
                  <div className="fw-bold text-success" style={{ fontSize: "14px" }}>
                    {selectedRequest.details?.proposedSalary ? selectedRequest.details.proposedSalary : "18.000.000 VNĐ"}
                  </div>
                </div>
                <div className="col-6">
                  <label className="text-muted small text-uppercase fw-bold d-block mb-1" style={{ fontSize: 9, letterSpacing: "0.02em" }}>Thời điểm áp dụng</label>
                  <div className="fw-bold text-danger" style={{ fontSize: "13px" }}>
                    {selectedRequest.details?.effectiveDate ? new Date(selectedRequest.details.effectiveDate).toLocaleDateString("vi-VN") : "01/06/2026"}
                  </div>
                </div>
              </div>

              <hr className="my-1 text-muted opacity-25" />

              <div>
                <label className="text-muted small text-uppercase fw-bold d-block mb-1" style={{ fontSize: 10, letterSpacing: "0.02em" }}>Lý do điều chỉnh thu nhập</label>
                <p className="text-dark small lh-base mb-0" style={{ whiteSpace: "pre-line", fontSize: "12.5px" }}>
                  {selectedRequest.details?.reason ? selectedRequest.details.reason : (
                    <>- Hoàn thành xuất sắc nhiệm vụ phát triển module lõi cho dự án ERP khách hàng Lee-Tech, bàn giao trước tiến độ 2 tuần.
                    {"\n"}- Đảm nhiệm thêm vị trí mentor đào tạo 2 nhân viên kỹ thuật mới thử việc.
                    {"\n"}- Đánh giá hiệu suất làm việc định kỳ đạt loại Xuất sắc (A+) trong 2 quý liên tiếp.</>
                  )}
                </p>
              </div>
              </div>
            </div>
          </div>
        );

      case "Đề bạt và thuyên chuyển":
        return (
          <div className="p-3 p-md-4 h-100 d-flex flex-column overflow-hidden">
            {panelHeader}
            <div className="flex-grow-1 custom-scrollbar pe-1" style={{ minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
              <div className="d-flex flex-column gap-3">
              <div className="row g-3">
                <div className="col-12">
                  <label className="text-muted small text-uppercase fw-bold d-block mb-1" style={{ fontSize: 9, letterSpacing: "0.02em" }}>Nhân viên được đề xuất</label>
                  <div className="fw-bold text-dark" style={{ fontSize: "13px" }}>
                    {selectedRequest.details?.employee ? selectedRequest.details.employee : "Trần Thị B (Chuyên viên Marketing)"}
                  </div>
                </div>
                <div className="col-6">
                  <label className="text-muted small text-uppercase fw-bold d-block mb-1" style={{ fontSize: 9, letterSpacing: "0.02em" }}>Bộ phận hiện tại</label>
                  <div className="fw-bold text-secondary" style={{ fontSize: "13px" }}>
                    {selectedRequest.details?.currentRole ? selectedRequest.details.currentRole : "Phòng Marketing"}
                  </div>
                </div>
                <div className="col-6">
                  <label className="text-muted small text-uppercase fw-bold d-block mb-1" style={{ fontSize: 9, letterSpacing: "0.02em" }}>Bộ phận đích</label>
                  <div className="fw-bold text-secondary" style={{ fontSize: "13px" }}>
                    {selectedRequest.details?.targetDepartment ? selectedRequest.details.targetDepartment : "Phòng Kinh doanh"}
                  </div>
                </div>
                <div className="col-6">
                  <label className="text-muted small text-uppercase fw-bold d-block mb-1" style={{ fontSize: 9, letterSpacing: "0.02em" }}>Chức danh mới</label>
                  <div className="fw-bold text-primary" style={{ fontSize: "13px" }}>
                    {selectedRequest.details?.proposedRole ? selectedRequest.details.proposedRole : "Trưởng nhóm Marketing (Marketing Team Lead)"}
                  </div>
                </div>
                <div className="col-6">
                  <label className="text-muted small text-uppercase fw-bold d-block mb-1" style={{ fontSize: 9, letterSpacing: "0.02em" }}>Ngày hiệu lực dự kiến</label>
                  <div className="fw-bold text-danger" style={{ fontSize: "13px" }}>
                    {selectedRequest.details?.effectiveDate ? new Date(selectedRequest.details.effectiveDate).toLocaleDateString("vi-VN") : "01/06/2026"}
                  </div>
                </div>
              </div>

              <hr className="my-1 text-muted opacity-25" />

              <div>
                <label className="text-muted small text-uppercase fw-bold d-block mb-1" style={{ fontSize: 10, letterSpacing: "0.02em" }}>Đánh giá năng lực & Lý do đề xuất</label>
                <p className="text-dark small lh-base mb-0" style={{ whiteSpace: "pre-line", fontSize: "12.5px" }}>
                  {selectedRequest.details?.reason ? selectedRequest.details.reason : (
                    <>- Đóng góp quan trọng giúp chiến dịch phủ thương hiệu quý 1 vượt chỉ tiêu 150% KPI về lượng tiếp cận khách hàng.
                    {"\n"}- Có khả năng quản lý tốt công việc nhóm, hỗ trợ định hướng nội dung cho các thành viên khác trong phòng.
                    {"\n"}- Đã hoàn thành khóa đào tạo kỹ năng quản lý cấp trung đạt chứng chỉ loại Giỏi.</>
                  )}
                </p>
              </div>
              </div>
            </div>
          </div>
        );

      case "Văn phòng phẩm và dụng cụ":
        return (
          <div className="p-3 p-md-4 h-100 d-flex flex-column overflow-hidden">
            {panelHeader}
            <div className="flex-grow-1 custom-scrollbar pe-1" style={{ minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
              <div className="d-flex flex-column gap-3">
                <div className="fw-bold text-secondary mb-1" style={{ fontSize: "11px", borderBottom: "1px solid var(--border)", paddingBottom: "4px" }}>
                  THÔNG TIN CHI TIẾT YÊU CẦU
                </div>
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="text-muted small text-uppercase fw-bold d-block mb-1" style={{ fontSize: 9, letterSpacing: "0.02em" }}>Mã yêu cầu</label>
                    <div className="fw-bold text-dark" style={{ fontSize: "13px" }}>
                      {selectedRequest.code || "REQ-..."}
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="text-muted small text-uppercase fw-bold d-block mb-1" style={{ fontSize: 9, letterSpacing: "0.02em" }}>Tổng giá trị dự kiến</label>
                    <div className="fw-bold text-primary" style={{ fontSize: "13px" }}>
                      {(selectedRequest.details?.totalAmount || 0).toLocaleString("vi-VN")} đ
                    </div>
                  </div>
                  <div className="col-12">
                    <label className="text-muted small text-uppercase fw-bold d-block mb-1" style={{ fontSize: 9, letterSpacing: "0.02em" }}>Ghi chú / Lý do đề xuất</label>
                    <div className="text-dark small lh-base" style={{ fontSize: "12.5px" }}>
                      {selectedRequest.details?.note || "Không có ghi chú"}
                    </div>
                  </div>
                </div>

                <div className="fw-bold text-secondary mt-2 mb-1" style={{ fontSize: "11px", borderBottom: "1px solid var(--border)", paddingBottom: "4px" }}>
                  DANH SÁCH VẬT TƯ YÊU CẦU
                </div>
                <div className="border rounded-3 overflow-hidden mb-3">
                  <Table
                    rows={selectedRequest.details?.items || []}
                    columns={detailsItemColumns}
                    compact={true}
                    striped={true}
                    wrapperClassName="mkt-plan-table-no-min"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <SplitLayoutPage
      title="Trung tâm yêu cầu"
      description="Quản lý, theo dõi tuyển dụng"
      icon="bi-file-earmark-plus-fill"
      color="indigo"
      leftCols={5}
      mobileActiveTab={activeMobileTab}
      leftContent={
        <div className="d-flex flex-column gap-2 h-100 overflow-hidden">
          <style>{`
            .app-responsive-table-wrapper {
              width: 100% !important;
              max-width: 100% !important;
              overflow-x: auto !important;
            }
            @media (max-width: 1024px) {
              /* Giảm padding của app-card trong SplitLayoutPage trên iPad để tăng chiều rộng khả dụng của bảng */
              .app-card {
                padding: 16px !important;
              }
              /* Giảm padding của ô để vừa khít hoàn hảo */
              .app-responsive-table-wrapper table th,
              .app-responsive-table-wrapper table td {
                padding: 6px 8px !important;
              }
            }
          `}</style>
          <SectionTitle
            title="Danh sách yêu cầu"
            icon="bi-list-task"
            className="mb-0"
          />
          
          {/* Dòng 1: Bộ lọc "Loại yêu cầu" và Trạng thái (Tỷ lệ 7/5) */}
          <div className="row g-2">
            <div className="col-7">
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
                  setActiveMobileTab("left");
                }}
                width="100%"
              />
            </div>
            <div className="col-5">
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
                  setActiveMobileTab("left");
                }}
                width="100%"
              />
            </div>
          </div>

          {/* Dòng 2: Hộp tìm kiếm và nút Thêm mới */}
          <div className="d-flex gap-2 align-items-center mb-1">
            <div className="flex-grow-1">
              <SearchInput
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChange={(val) => {
                  setSearchQuery(val);
                  setViewMode("view");
                  setActiveMobileTab("left");
                }}
              />
            </div>
            <BrandButton
              icon="bi-plus-lg"
              onClick={handleStartCreate}
              disabled={!requestType}
              style={{ height: 34 }}
            >
              <span className="d-none d-sm-inline">Thêm mới</span>
            </BrandButton>
          </div>

          {/* Danh sách yêu cầu dùng component Table */}
          <div className="flex-grow-1 bg-white" style={{ minHeight: 0, width: "100%", maxWidth: "100%", overflow: "hidden" }}>
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
                  setActiveMobileTab("right");
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
                    width: "100px",
                    align: "center",
                    render: (row) => <StatusBadge status={row.status} />
                  }
                ]}
              />
            )}
          </div>
        </div>
      }
      rightContent={
        <div className="h-100 overflow-hidden">
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
      }
    />
  );
}

export default function RecruitmentManagementPage() {
  return (
    <Suspense fallback={<div className="p-5 text-center">Đang tải...</div>}>
      <RecruitmentManagementContent />
    </Suspense>
  );
}