"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/Toast";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { TrangThaiTonKhoBadge } from "@/components/plan-finance/dung_chung/TrangThaiTonKhoBadge";
import { genDocCode } from "@/lib/genDocCode";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// ── Types ─────────────────────────────────────────────────────────────────────
export type CustomerRow = {
  id: string;
  name: string;
  nhom: string | null;
  nguon: string | null;
  dienThoai: string | null;
  email: string | null;
  address: string | null;
  daiDien: string | null;
  xungHo: string | null;
  chucVu: string | null;
  ghiChu: string | null;
  nguoiChamSoc: { id: string; fullName: string } | null;
  nguoiChamSocId: string | null;
  createdAt: string;
};

export type OrderItem = {
  id: number;
  ten: string;
  dvt: string;
  soLuong: number;
  donGia: number;
  ckPct: number;
  soLuongTon: number | null;
  trangThaiKho: string | null;
  inventoryId: string | null;
  imageUrl?: string | null;
  code?: string | null;
  dinhMucs?: any[];
  dinhMucId?: string | null;
  dinhMucTen?: string | null;
  khoTen?: string | null;
  source?: string;
};

// Helper: number to words (VND)
export function numberToVNWords(n: number): string {
  if (n === 0) return "Không đồng";
  const ones = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const teens = ["mười", "mười một", "mười hai", "mười ba", "mười bốn", "mười lăm", "mười sáu", "mười bảy", "mười tám", "mười chín"];
  function readHundred(h: number): string {
    const c = Math.floor(h / 100), t = Math.floor((h % 100) / 10), u = h % 10;
    let r = c > 0 ? ones[c] + " trăm" : "";
    if (t === 1) r += (r ? " " : "") + teens[u];
    else if (t > 1) r += (r ? " " : "") + ones[t] + " mươi" + (u > 0 ? " " + (u === 5 ? "lăm" : ones[u]) : "");
    else if (u > 0 && c > 0) r += " lẻ " + ones[u];
    else if (u > 0) r += ones[u];
    return r;
  }
  const groups = [
    { v: 1_000_000_000, s: "tỷ" }, { v: 1_000_000, s: "triệu" },
    { v: 1_000, s: "nghìn" }, { v: 1, s: "" },
  ];
  let result = "", num = Math.round(n);
  for (const g of groups) {
    const q = Math.floor(num / g.v);
    if (q > 0) {
      result += (result ? " " : "") + readHundred(q) + (g.s ? " " + g.s : "");
      num %= g.v;
    }
  }
  return result.charAt(0).toUpperCase() + result.slice(1) + " đồng";
}

const inputSt: React.CSSProperties = {
  width: "100%", padding: "7px 10px", border: "1px solid var(--border)",
  background: "var(--background)", color: "var(--foreground)",
  fontSize: 13, outline: "none", borderRadius: 8, fontFamily: "inherit",
  transition: "border-color 0.15s",
};

const FLabel = ({ text, required }: { text: string; required?: boolean }) => (
  <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>
    {text}{required && <span style={{ color: "#f43f5e", marginLeft: 2 }}>*</span>}
  </label>
);

// ── Main TaoDonHangModal Component ──────────────────────────────────────────
export function TaoDonHangModal({ open, onClose, customer, onSaved, type = "agency", editOrder }: {
  open: boolean;
  onClose: () => void;
  customer: CustomerRow | null;
  onSaved?: () => void;
  type?: string;
  editOrder?: any;
}) {
  const today = new Date();
  const fmtDate = (d: Date) => d.toISOString().split("T")[0];
  const defaultNgayLap = fmtDate(today);

  const [info, setInfo] = React.useState({
    soPhieu: genDocCode("DH"),
    ngayLap: defaultNgayLap,
    ngayGiaoHang: defaultNgayLap,
    tenNguoiNhan: "",
    sdtNguoiNhan: "",
    diaChiGiaoHang: "",
    ghiChu: "",
    chietKhauTong: 0,
    thue: 10,
  });

  const [showInfoSidebar, setShowInfoSidebar] = React.useState(false);

  const [custInfo, setCustInfo] = React.useState({
    id: customer?.id || "",
    name: customer?.name || "",
    dienThoai: customer?.dienThoai || "",
    address: customer?.address || "",
    nhom: customer?.nhom || "ca-nhan",
    nguon: customer?.nguon || null,
  });

  // Sync customer details when passed
  React.useEffect(() => {
    if (customer && !editOrder) {
      setCustInfo({
        id: customer.id || "",
        name: customer.name || "",
        dienThoai: customer.dienThoai || "",
        address: customer.address || "",
        nhom: customer.nhom || "ca-nhan",
        nguon: customer.nguon || null,
      });
      setInfo(prev => ({
        ...prev,
        diaChiGiaoHang: customer.address || "",
      }));
    }
  }, [customer, editOrder]);

  React.useEffect(() => {
    if (open && editOrder) {
      let rawGhiChu = editOrder.ghiChu || "";
      let tenNguoiNhan = "";
      let sdtNguoiNhan = "";
      let diaChiGiaoHang = "";

      const guestMatch = rawGhiChu.match(/\[GuestInfo:(.*?)\]/);
      if (guestMatch) {
        try {
          const parsed = JSON.parse(guestMatch[1]);
          tenNguoiNhan = parsed.name || tenNguoiNhan;
          sdtNguoiNhan = parsed.dienThoai || sdtNguoiNhan;
          diaChiGiaoHang = parsed.address || diaChiGiaoHang;
          rawGhiChu = rawGhiChu.replace(/\[GuestInfo:.*?\]\n?/, "");
        } catch (e) { }
      }

      const lines = rawGhiChu.split("\n");
      const remainingLines = [];
      for (const line of lines) {
        if (line.startsWith("Tên khách hàng: ")) { tenNguoiNhan = line.replace("Tên khách hàng: ", ""); continue; }
        if (line.startsWith("Số điện thoại: ")) { sdtNguoiNhan = line.replace("Số điện thoại: ", ""); continue; }
        if (line.startsWith("Địa chỉ giao hàng: ")) { diaChiGiaoHang = line.replace("Địa chỉ giao hàng: ", ""); continue; }
        remainingLines.push(line);
      }
      rawGhiChu = remainingLines.join("\n").trim();

      setInfo(prev => ({
        ...prev,
        soPhieu: editOrder.code || editOrder.id,
        ngayLap: editOrder.ngayDat ? new Date(editOrder.ngayDat).toISOString().split("T")[0] : prev.ngayLap,
        ngayGiaoHang: editOrder.ngayGiao ? new Date(editOrder.ngayGiao).toISOString().split("T")[0] : prev.ngayGiaoHang,
        ghiChu: rawGhiChu,
        tenNguoiNhan,
        sdtNguoiNhan,
        diaChiGiaoHang
      }));
      if (editOrder.customer) {
        setCustInfo({
          id: editOrder.customer.id || "",
          name: editOrder.customer.name || "",
          dienThoai: editOrder.customer.dienThoai || "",
          address: editOrder.customer.address || "",
          nhom: editOrder.customer.nhom || "ca-nhan",
          nguon: editOrder.customer.nguon || null,
        });
      }
      if (editOrder.items && editOrder.items.length > 0) {
        setItems(editOrder.items.map((it: any) => ({
          id: nextId.current++,
          ten: it.tenHang || "",
          dvt: it.donVi || "cái",
          soLuong: Number(it.soLuong) || 1,
          donGia: Number(it.donGia) || 0,
          ckPct: 0,
          soLuongTon: null,
          trangThaiKho: null,
          inventoryId: null,
          code: null,
          khoTen: (() => {
            try { return JSON.parse(it.ghiChu || "{}").khoTen || ""; } catch { return ""; }
          })()
        })));
      }
    }
  }, [open, editOrder]);

  const [debtInfo, setDebtInfo] = React.useState<{ outstandingDebt: number; creditLimit: number } | null>(null);
  const [isCustomerNew, setIsCustomerNew] = React.useState(true);

  // Fetch outstanding debt & credit limit info
  React.useEffect(() => {
    if (!open) return;
    if (custInfo.id) {
      setIsCustomerNew(false);
      fetch(`/api/plan-finance/customers/${custInfo.id}`)
        .then(async res => {
          if (res.ok) return res.json();
          return null;
        })
        .then(data => {
          if (data) {
            setDebtInfo({
              outstandingDebt: data.outstandingDebt || 0,
              creditLimit: data.creditLimit || 0
            });
          } else {
            setDebtInfo(null);
          }
        })
        .catch(() => {
          setDebtInfo(null);
        });
    } else {
      setDebtInfo(null);
    }
  }, [custInfo.id, open]);

  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState("");

  const nextId = React.useRef(1);
  const [items, setItems] = React.useState<OrderItem[]>([]);
  const [formItem, setFormItem] = React.useState<OrderItem>({
    id: -1, ten: "", khoTen: "", dvt: "cái", soLuong: 1, donGia: 0, ckPct: 0, soLuongTon: null, trangThaiKho: null, inventoryId: null, imageUrl: null, code: null, dinhMucs: [], dinhMucId: null, dinhMucTen: null, source: ""
  });

  const initialDonGiaRef = React.useRef<number>(0);



  const [showBomDetail, setShowBomDetail] = React.useState(false);
  const [bomDetailData, setBomDetailData] = React.useState<any>(null);
  const [originalBomData, setOriginalBomData] = React.useState<any>(null);
  const [newBomDescription, setNewBomDescription] = React.useState("");
  const [savingNewBom, setSavingNewBom] = React.useState(false);
  const [loadingBom, setLoadingBom] = React.useState(false);
  const [altSearch, setAltSearch] = React.useState("");
  const [previewCode, setPreviewCode] = React.useState("");
  const [confirmDeleteBom, setConfirmDeleteBom] = React.useState(false);
  const [isDeletingBom, setIsDeletingBom] = React.useState(false);

  const handleDeleteBom = async () => {
    if (!formItem.dinhMucId) return;
    setIsDeletingBom(true);
    try {
      const res = await fetch(`/api/production/bom/${formItem.dinhMucId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete BOM");
      
      const newDinhMucs = (formItem.dinhMucs || []).filter((d: any) => d.id !== formItem.dinhMucId);
      const standardDm = newDinhMucs.length > 0 ? newDinhMucs[0] : null;
      
      setFormItem((prev: any) => ({
        ...prev,
        dinhMucs: newDinhMucs,
        dinhMucId: standardDm ? standardDm.id : null,
        dinhMucTen: standardDm ? standardDm.tenDinhMuc : null,
        code: standardDm ? standardDm.code : prev.code,
        donGia: standardDm ? (standardDm.giaBan ?? 0) : prev.donGia
      }));
      setConfirmDeleteBom(false);
      toast.success("Xoá thành công", "Đã xoá định mức khỏi hệ thống");
    } catch (e) {
      console.error(e);
      toast.error("Lỗi xoá định mức", "Không thể xoá định mức này");
    } finally {
      setIsDeletingBom(false);
    }
  };

  const activeDm = formItem.dinhMucs?.find((x: any) => x.id === formItem.dinhMucId);
  const isStandardBom = activeDm ? !/-[0-9]+$/.test(activeDm.code) : true;

  const hasBomChanged = React.useMemo(() => {
    if (!originalBomData || !bomDetailData) return false;
    const origStr = originalBomData.vatTu?.map((v: any) => `${v.materialId}:${v.soLuong}`).join(",") || "";
    const currStr = bomDetailData.vatTu?.map((v: any) => `${v.materialId}:${v.soLuong}`).join(",") || "";
    return origStr !== currStr;
  }, [originalBomData, bomDetailData]);

  const totalBomCost = React.useMemo(() => {
    if (!bomDetailData || !bomDetailData.vatTu) return 0;
    return bomDetailData.vatTu.reduce((acc: number, vt: any) => acc + (vt.material?.giaBan || vt.material?.price || 0) * (vt.soLuong || 0), 0);
  }, [bomDetailData]);

  const proposedDonGia = React.useMemo(() => {
    if (!originalBomData || !hasBomChanged) return formItem.donGia;
    const origCost = originalBomData.vatTu?.reduce((acc: number, vt: any) => acc + (vt.material?.giaBan || vt.material?.price || 0) * (vt.soLuong || 0), 0) || 0;
    if (origCost > 0) {
      const ratio = initialDonGiaRef.current / origCost;
      return Math.round(totalBomCost * ratio);
    }
    return formItem.donGia;
  }, [hasBomChanged, totalBomCost, originalBomData, formItem.donGia]);

  React.useEffect(() => {
    if (hasBomChanged && originalBomData?.code) {
      fetch(`/api/production/bom/next-code?originalCode=${originalBomData.code}`)
        .then(res => res.json())
        .then(data => {
          if (data.nextCode) setPreviewCode(data.nextCode);
        })
        .catch(console.error);
    } else {
      setPreviewCode("");
    }
  }, [hasBomChanged, originalBomData?.code]);

  const [showAlternative, setShowAlternative] = React.useState(false);
  const [alternativeTarget, setAlternativeTarget] = React.useState<any>(null);
  const [alternativeMaterials, setAlternativeMaterials] = React.useState<any[]>([]);
  const [loadingAlternatives, setLoadingAlternatives] = React.useState(false);
  const [targetDeleteMaterial, setTargetDeleteMaterial] = React.useState<any>(null);

  const [showAddMaterial, setShowAddMaterial] = React.useState(false);
  const [addMaterialTargetIndex, setAddMaterialTargetIndex] = React.useState<number | null>(null);
  const [addMaterials, setAddMaterials] = React.useState<any[]>([]);
  const [loadingAddMaterials, setLoadingAddMaterials] = React.useState(false);
  const [addSearch, setAddSearch] = React.useState("");
  const [addCategory, setAddCategory] = React.useState("");
  const [addCategories, setAddCategories] = React.useState<any[]>([]);
  const [addQuantities, setAddQuantities] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    if (showAddMaterial) {
      setLoadingAddMaterials(true);
      Promise.all([
        fetch(`/api/production/materials`).then(res => res.json()),
        fetch(`/api/production/materials/categories`).then(res => res.json())
      ])
        .then(([materialsData, categoriesData]) => {
          setAddMaterials(materialsData.items || []);
          setAddCategories(categoriesData || []);
          setAddSearch("");
          setAddCategory("");
          setAddQuantities({});
        })
        .catch(console.error)
        .finally(() => setLoadingAddMaterials(false));
    } else {
      setAddMaterials([]);
      setAddCategories([]);
      setAddMaterialTargetIndex(null);
    }
  }, [showAddMaterial]);

  React.useEffect(() => {
    if (showAlternative && alternativeTarget?.material?.category?.id) {
      setLoadingAlternatives(true);
      fetch(`/api/production/materials?categoryId=${alternativeTarget.material.category.id}`)
        .then(res => res.json())
        .then(data => {
          setAlternativeMaterials(data.items || []);
          setAltSearch("");
        })
        .catch(console.error)
        .finally(() => setLoadingAlternatives(false));
    } else if (!showAlternative) {
      setAlternativeMaterials([]);
      setAlternativeTarget(null);
    }
  }, [showAlternative, alternativeTarget]);

  React.useEffect(() => {
    if (showBomDetail && formItem.dinhMucId) {
      setLoadingBom(true);
      fetch(`/api/production/bom/${formItem.dinhMucId}`)
        .then(res => res.json())
        .then(data => {
          setBomDetailData(data);
          setOriginalBomData(JSON.parse(JSON.stringify(data)));
          setNewBomDescription("");
          initialDonGiaRef.current = formItem.donGia || 0;
        })
        .catch(console.error)
        .finally(() => setLoadingBom(false));
    } else if (!showBomDetail) {
      setBomDetailData(null);
      setOriginalBomData(null);
      setNewBomDescription("");
    }
  }, [showBomDetail, formItem.dinhMucId]);

  const handleSwapMaterial = (altMaterial: any) => {
    if (!alternativeTarget || !bomDetailData) return;
    const newVatTu = [...(bomDetailData.vatTu || [])];
    const index = newVatTu.findIndex(v => v.id === alternativeTarget.id);
    if (index !== -1) {
      newVatTu[index] = {
        ...newVatTu[index],
        materialId: altMaterial.id,
        tenVatTu: altMaterial.name || altMaterial.tenHang,
        material: {
          ...newVatTu[index].material,
          id: altMaterial.id,
          code: altMaterial.code,
          tenHang: altMaterial.name || altMaterial.tenHang,
          name: altMaterial.name || altMaterial.tenHang,
          unit: altMaterial.unit || altMaterial.donVi,
          donVi: altMaterial.unit || altMaterial.donVi,
          price: altMaterial.giaNhap || altMaterial.price || 0,
          giaBan: altMaterial.giaBan || 0,
        }
      };
      setBomDetailData({ ...bomDetailData, vatTu: newVatTu });
    }
    setShowAlternative(false);
  };

  const handleDeleteMaterial = () => {
    if (!targetDeleteMaterial || !bomDetailData) return;
    const newVatTu = bomDetailData.vatTu.filter((v: any) => v.id !== targetDeleteMaterial.id);
    setBomDetailData({ ...bomDetailData, vatTu: newVatTu });
    setTargetDeleteMaterial(null);
  };

  const handleAddMaterial = (newMaterial: any) => {
    if (addMaterialTargetIndex === null || !bomDetailData) return;
    const qty = addQuantities[newMaterial.id] || 1;
    const newVatTu = [...(bomDetailData.vatTu || [])];
    
    const newItem = {
      materialId: newMaterial.id,
      tenVatTu: newMaterial.name || newMaterial.tenHang,
      soLuong: qty,
      donViTinh: newMaterial.unit || newMaterial.donVi,
      material: {
        id: newMaterial.id,
        code: newMaterial.code,
        tenHang: newMaterial.name || newMaterial.tenHang,
        name: newMaterial.name || newMaterial.tenHang,
        unit: newMaterial.unit || newMaterial.donVi,
        donVi: newMaterial.unit || newMaterial.donVi,
        price: newMaterial.giaNhap || newMaterial.price || 0,
        giaBan: newMaterial.giaBan || 0,
      }
    };

    newVatTu.splice(addMaterialTargetIndex + 1, 0, newItem);
    setBomDetailData({ ...bomDetailData, vatTu: newVatTu });
    setShowAddMaterial(false);
  };

  const handleSaveNewBom = async () => {
    if (!newBomDescription.trim() || !hasBomChanged || !bomDetailData) return;
    setSavingNewBom(true);
    try {
      const payload = {
        originalCode: originalBomData.code,
        tenDinhMuc: newBomDescription.trim(),
        manufacturedProductId: formItem.inventoryId || null,
        vatTu: bomDetailData.vatTu.map((v: any) => ({
          materialId: v.materialId || null,
          tenVatTu: v.tenVatTu,
          soLuong: v.soLuong,
          donViTinh: v.donViTinh || v.material?.unit || v.material?.donVi || "",
          ghiChu: v.ghiChu || ""
        }))
      };

      const res = await fetch("/api/production/bom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to save BOM");

      const created = await res.json();
      
      setFormItem(prev => ({
        ...prev,
        dinhMucs: [...(prev.dinhMucs || []), created],
        dinhMucId: created.id,
        dinhMucTen: created.tenDinhMuc,
        code: created.code,
        donGia: Number(proposedDonGia || 0)
      }));
      
      // Update local states so it turns into the new BOM
      // We need to fetch it to get full details (with vatTu structure) or just rely on what we have.
      // Re-fetching is safer.
      const res2 = await fetch(`/api/production/bom/${created.id}`);
      const freshData = await res2.json();
      setBomDetailData(freshData);
      setOriginalBomData(JSON.parse(JSON.stringify(freshData)));
      setNewBomDescription("");
      initialDonGiaRef.current = Number(proposedDonGia || 0);
      
      toast.success("Lưu thành công", "Đã tạo định mức mới: " + created.code);
      setShowBomDetail(false);
    } catch (e) {
      console.error(e);
      toast.error("Lỗi", "Có lỗi xảy ra khi lưu định mức mới!");
    } finally {
      setSavingNewBom(false);
    }
  };

  const [suggest, setSuggest] = React.useState<any[]>([]);
  const [activeRowId, setActiveRowId] = React.useState<number | null>(null);
  const activeRowIdRef = React.useRef<number | null>(null);
  const suggestTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const setActiveRowIdSync = (id: number | null) => {
    activeRowIdRef.current = id;
    setActiveRowId(id);
  };

  const fetchSuggest = React.useCallback((query: string, rowId: number) => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (!query.trim() || query.length < 2) {
      setSuggest([]);
      return;
    }
    suggestTimer.current = setTimeout(() => {
      fetch(`/api/logistics/inventory?search=${encodeURIComponent(query)}&limit=20&includeManufactured=true`)
        .then(r => r.json())
        .then(d => {
          if (activeRowIdRef.current === rowId) {
            const filtered = (d.items ?? []).filter((item: any) => {
              const khoTenStr = (item.stocks && item.stocks.length > 0 && item.stocks[0].warehouse?.name)
                ? item.stocks[0].warehouse.name
                : (item.source === "manufactured" ? "Kho thành phẩm"
                  : item.source === "inventory" ? "Kho hàng hoá"
                    : item.source === "material" ? "Kho vật tư và phụ kiện" : "");
              return khoTenStr.toLowerCase().includes("kho hàng hoá") || khoTenStr.toLowerCase().includes("kho thành phẩm") || khoTenStr.toLowerCase().includes("vật tư");
            });
            setSuggest(filtered);
          }
        })
        .catch(() => setSuggest([]));
    }, 300);
  }, []);

  const applySuggest = (rowId: number, item: any) => {
    const soLuongTon = item.soLuongThuc ?? item.soLuong;
    const defaultDinhMuc = item.dinhMucs?.length > 0 ? item.dinhMucs[0] : null;
    const khoTenStr = (item.stocks && item.stocks.length > 0 && item.stocks[0].warehouse?.name)
      ? item.stocks[0].warehouse.name
      : (item.source === "manufactured" ? "Kho thành phẩm"
        : item.source === "inventory" ? "Kho hàng hoá"
          : item.source === "material" ? "Kho vật tư và phụ kiện" : "");

    const updatePayload = {
      ten: item.tenHang,
      khoTen: khoTenStr,
      dvt: item.donVi ?? "cái",
      donGia: defaultDinhMuc ? (defaultDinhMuc.giaBan ?? item.giaBan) : item.giaBan,
      soLuongTon,
      trangThaiKho: item.trangThai,
      inventoryId: item.id,
      imageUrl: item.imageUrl || null,
      code: item.code || null,
      dinhMucs: item.dinhMucs || [],
      dinhMucId: defaultDinhMuc ? defaultDinhMuc.id : null,
      dinhMucTen: defaultDinhMuc ? defaultDinhMuc.tenDinhMuc : null,
      source: item.source
    };

    if (rowId === -1) {
      setFormItem(x => ({ ...x, ...updatePayload }));
    } else {
      setItems(r => r.map(x => x.id === rowId ? { ...x, ...updatePayload } : x));
    }
    setSuggest([]);
    setActiveRowIdSync(null);
  };

  const setInfoField = (k: string) => (e: any) => {
    setInfo(f => ({ ...f, [k]: e.target.type === "number" ? Number(e.target.value) : e.target.value }));
  };

  const addRow = () => {
    if (!formItem.ten.trim()) {
      toast.error("Lỗi", "Vui lòng chọn hoặc nhập tên sản phẩm");
      return;
    }
    setItems(r => [...r, { ...formItem, id: nextId.current++ }]);
    setFormItem({ id: -1, ten: "", khoTen: "", dvt: "cái", soLuong: 1, donGia: 0, ckPct: 0, soLuongTon: null, trangThaiKho: null, inventoryId: null, imageUrl: null, code: null, dinhMucs: [], dinhMucId: null, dinhMucTen: null, source: "" });
  };

  const removeRow = (id: number) => {
    setItems(r => r.filter(x => x.id !== id));
  };

  const updateRow = (id: number, k: keyof OrderItem, val: any) => {
    setItems(r => r.map(x => x.id === id ? { ...x, [k]: val } : x));
  };

  const getProductCode = (it: OrderItem) => it.code || "";

  const thanhTien = (it: OrderItem) => it.soLuong * it.donGia * (1 - it.ckPct / 100);
  const tamTinh = items.reduce((s, it) => s + thanhTien(it), 0);
  const ckTien = tamTinh * info.chietKhauTong / 100;
  const truocThue = tamTinh - ckTien;
  const thueTien = truocThue * info.thue / 100;
  const tongCong = truocThue + thueTien;

  const toast = useToast();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role?.toUpperCase() === "ADMIN";

  const handleSave = async () => {
    if (!info.soPhieu.trim()) {
      setSaveError("Vui lòng nhập số đơn hàng");
      return;
    }
    if (!info.ngayGiaoHang) {
      setSaveError("Vui lòng chọn ngày giao hàng");
      return;
    }
    const validItems = items.filter(it => it.ten.trim());
    if (validItems.length === 0) {
      setSaveError("Vui lòng nhập ít nhất một mặt hàng");
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      const finalCustomerId = custInfo.id;
      let finalGhiChu = [
        info.ghiChu,
        info.tenNguoiNhan ? `Tên khách hàng: ${info.tenNguoiNhan}` : "",
        info.sdtNguoiNhan ? `Số điện thoại: ${info.sdtNguoiNhan}` : "",
        info.diaChiGiaoHang ? `Địa chỉ giao hàng: ${info.diaChiGiaoHang}` : ""
      ].filter(Boolean).join("\n");

      if (!finalCustomerId) {
        const guestInfo = {
          name: custInfo.name.trim() || "Khách vãng lai",
          dienThoai: custInfo.dienThoai.trim(),
          address: custInfo.address.trim()
        };
        finalGhiChu = `[GuestInfo:${JSON.stringify(guestInfo)}]\n` + finalGhiChu;
      }

      if (editOrder) {
        const updatePayload = {
          ngayGiao: info.ngayGiaoHang,
          ghiChu: finalGhiChu,
          tongTien: tamTinh,
          items: validItems.map((it, idx) => ({
            tenHang: it.ten.trim(),
            soLuong: it.soLuong,
            donGia: it.donGia,
            thanhTien: thanhTien(it)
          }))
        };
        const res = await fetch(`/api/plan-finance/sales/${editOrder.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Lỗi cập nhật");
        toast.success("Cập nhật thành công", `Đơn hàng ${info.soPhieu} đã được lưu.`);
      } else {
        const payload = {
          code: info.soPhieu.trim(),
          ngayBaoGia: info.ngayLap,
          ngayHetHan: info.ngayGiaoHang,
          ngayGiaoHang: info.ngayGiaoHang,
          trangThai: "won",
          uuTien: "medium",
          tongTien: tamTinh,
          discount: info.chietKhauTong,
          vat: info.thue,
          chiPhiThiCong: 0,
          thanhTien: tongCong,
          ghiChu: finalGhiChu,
          quoteType: "Không có quầy kệ",
          items: validItems.map((it, idx) => ({
            tenHang: it.ten.trim(),
            donVi: it.dvt || "cái",
            soLuong: it.soLuong,
            donGia: it.donGia,
            thanhTien: thanhTien(it),
            ghiChu: JSON.stringify({ code: it.code || "", khoTen: it.khoTen || "" }),
            sortOrder: idx
          })),
          customerId: finalCustomerId || null,
          type
        };

        const res = await fetch("/api/plan-finance/quotations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error((await res.json()).error ?? "Lỗi tạo đơn hàng");
        }
        toast.success("Tạo đơn hàng thành công", `Đơn hàng ${info.soPhieu} đã được lưu.`);
      }
      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      setSaveError(err.message ?? "Lỗi lưu đơn hàng");
      toast.error("Lỗi tạo đơn hàng", err.message ?? "Lỗi hệ thống");
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString("vi-VN");

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "var(--background)", display: "flex", flexDirection: "column" }}>
      <style>{`
        /* Responsive styles for iPad/tablets */
        @media (max-width: 1024px) {
          .order-modal-body {
            position: relative !important;
          }
          .order-modal-left {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            bottom: 0 !important;
            width: 350px !important;
            max-width: 85vw !important;
            z-index: 200 !important;
            border-right: 1px solid var(--border) !important;
            transform: translateX(-100%) !important;
            transition: transform 0.25s ease-in-out !important;
            box-shadow: 4px 0 24px rgba(0,0,0,0.25) !important;
            background: var(--card) !important;
          }
          .order-modal-left.show {
            transform: translateX(0) !important;
          }
          .order-modal-right {
            width: 100% !important;
            flex: 1 !important;
          }
          .order-modal-toggle-btn {
            display: flex !important;
          }
          .order-modal-sidebar-header {
            display: flex !important;
          }
          .order-modal-table th, 
          .order-modal-table td {
            padding: 6px 8px !important;
          }
          .order-modal-header {
            padding: 0 12px !important;
          }
          .order-modal-header-btn {
            padding: 5px 10px !important;
            font-size: 12px !important;
          }
          .order-modal-header-title {
            font-size: 14px !important;
          }
        }
      `}</style>
      {/* Header */}
      <div className="order-modal-header" style={{ height: 56, borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", background: "#1E293B", boxShadow: "0 2px 12px rgba(0,0,0,0.2)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className="bi bi-cart3" style={{ fontSize: 16, color: "#fff" }} />
          </div>
          <div>
            <p className="order-modal-header-title" style={{ margin: 0, fontWeight: 800, fontSize: 16, color: "#fff", letterSpacing: "0.01em" }}>
              {editOrder ? "Cập nhật đơn bán hàng (SO)" : `Lập đơn bán hàng (SO) - ${type === "retail" ? "Bán lẻ" : "Đại lý"}`}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {saveError && <span style={{ fontSize: 12, color: "#fca5a5", alignSelf: "center" }}><i className="bi bi-exclamation-circle" /> {saveError}</span>}
          <button className="order-modal-header-btn" onClick={handleSave} disabled={saving} style={{ padding: "6px 20px", background: "#10b981", color: "#fff", border: "none", borderRadius: 8, cursor: saving ? "not-allowed" : "pointer", fontWeight: 800, fontSize: 13, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Đang lưu..." : (
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <i className="bi bi-check-circle" />
                {editOrder ? "Cập nhật đơn" : "Tạo đơn hàng"}
              </span>
            )}
          </button>
          <button onClick={onClose} style={{ width: 34, height: 34, border: "1.5px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.12)", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><i className="bi bi-x" style={{ fontSize: 18 }} /></button>
        </div>
      </div>

      <div className="order-modal-body" style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Backdrop for Offcanvas */}
        {showInfoSidebar && (
          <div
            onClick={() => setShowInfoSidebar(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0, 0, 0, 0.4)",
              backdropFilter: "blur(2.5px)",
              zIndex: 199
            }}
          />
        )}

        {/* Left Side: Order Info */}
        <div className={`order-modal-left ${showInfoSidebar ? "show" : ""}`} style={{ width: 400, flexShrink: 0, borderRight: "1px solid var(--border)", position: "relative", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column", gap: 14, background: "var(--card)", overflowY: "auto" }}>
            {/* Offcanvas Header */}
            <div className="order-modal-sidebar-header" style={{ display: "none", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottom: "1px solid var(--border)", marginBottom: 4 }}>
              <span style={{ fontWeight: 800, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--primary)" }}>Thông tin chung</span>
              <button type="button" onClick={() => setShowInfoSidebar(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--foreground)", padding: 4, display: "flex", alignItems: "center" }}><i className="bi bi-x-lg" /></button>
            </div>

            <div>
              <FLabel text="Số đơn hàng (Tham chiếu)" required />
              <input value={info.soPhieu} onChange={setInfoField("soPhieu")} style={{ ...inputSt, fontFamily: "monospace" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <FLabel text="Ngày đặt hàng" required />
                <input type="date" value={info.ngayLap} onChange={setInfoField("ngayLap")} style={inputSt} />
              </div>
              <div>
                <FLabel text="Ngày giao hàng mong muốn" required />
                <input type="date" value={info.ngayGiaoHang} onChange={setInfoField("ngayGiaoHang")} style={inputSt} />
              </div>
            </div>

            {/* Customer Details Display */}
            <div style={{ background: "var(--muted)", borderRadius: 10, padding: 12 }}>
              <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Thông tin khách hàng</p>
              {customer ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3, textTransform: "uppercase" }}>{info.tenNguoiNhan || customer.name}</span>
                  {(info.sdtNguoiNhan || customer.dienThoai) && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted-foreground)" }}>
                      <i className="bi bi-telephone-fill" style={{ fontSize: 10, color: "#10b981" }} />
                      {info.sdtNguoiNhan || customer.dienThoai}
                    </div>
                  )}
                  {(info.diaChiGiaoHang || customer.address) && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 5 }}>
                      <i className="bi bi-geo-alt-fill" style={{ fontSize: 11, color: "#ef4444", marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.3 }}>{info.diaChiGiaoHang || customer.address}</span>
                    </div>
                  )}
                  {debtInfo && (
                    <div style={{
                      marginTop: 6,
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      background: "rgba(59,130,246,0.06)",
                      padding: 8,
                      borderRadius: 8,
                      border: "1px dashed rgba(59,130,246,0.2)"
                    }}>
                      <div>
                        <span style={{ fontSize: 9.5, color: "var(--muted-foreground)", display: "block", fontWeight: 600 }}>CÔNG NỢ HIỆN TẠI</span>
                        <strong style={{ fontSize: 11.5, color: "#ef4444" }}>{debtInfo.outstandingDebt.toLocaleString("vi-VN")} ₫</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: 9.5, color: "var(--muted-foreground)", display: "block", fontWeight: 600 }}>HẠN MỨC CÔNG NỢ</span>
                        <strong style={{ fontSize: 11.5, color: "#var(--primary)" }}>{debtInfo.creditLimit.toLocaleString("vi-VN")} ₫</strong>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
                    <div>
                      <FLabel text="Tên khách hàng" />
                      <input
                        type="text"
                        placeholder="Nhập tên khách hàng..."
                        value={custInfo.name}
                        onChange={e => {
                          const val = e.target.value;
                          setCustInfo(prev => ({ ...prev, name: val, id: "" }));
                          setInfo(prev => ({ ...prev, tenNguoiNhan: val }));
                        }}
                        style={{ ...inputSt, background: "#fff" }}
                      />
                    </div>
                    <div>
                      <FLabel text="Số điện thoại" />
                      <input
                        type="text"
                        placeholder="Số điện thoại..."
                        value={custInfo.dienThoai}
                        onChange={e => {
                          const val = e.target.value;
                          setCustInfo(prev => ({ ...prev, dienThoai: val }));
                          setInfo(prev => ({ ...prev, sdtNguoiNhan: val }));
                        }}
                        style={{ ...inputSt, background: "#fff" }}
                      />
                    </div>
                  </div>
                  <div>
                    <FLabel text="Địa chỉ" />
                    <input
                      type="text"
                      placeholder="Nhập địa chỉ..."
                      value={custInfo.address}
                      onChange={e => {
                        const val = e.target.value;
                        setCustInfo(prev => ({ ...prev, address: val }));
                        setInfo(prev => ({ ...prev, diaChiGiaoHang: val }));
                      }}
                      style={{ ...inputSt, background: "#fff" }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <FLabel text="Tên khách hàng" />
                <input
                  type="text"
                  placeholder="Nhập tên khách hàng..."
                  value={info.tenNguoiNhan}
                  onChange={e => {
                    const val = e.target.value;
                    setInfo(prev => ({ ...prev, tenNguoiNhan: val }));
                    if (!customer) setCustInfo(prev => ({ ...prev, name: val, id: "" }));
                  }}
                  style={inputSt}
                />
              </div>
              <div>
                <FLabel text="Số điện thoại" />
                <input
                  type="text"
                  placeholder="Nhập số điện thoại..."
                  value={info.sdtNguoiNhan}
                  onChange={e => {
                    const val = e.target.value;
                    setInfo(prev => ({ ...prev, sdtNguoiNhan: val }));
                    if (!customer) setCustInfo(prev => ({ ...prev, dienThoai: val }));
                  }}
                  style={inputSt}
                />
              </div>
            </div>

            <div>
              <FLabel text="Địa chỉ giao hàng" />
              <input
                type="text"
                placeholder="Nhập địa chỉ giao hàng chi tiết..."
                value={info.diaChiGiaoHang}
                onChange={e => {
                  const val = e.target.value;
                  setInfo(prev => ({ ...prev, diaChiGiaoHang: val }));
                  if (!customer) setCustInfo(prev => ({ ...prev, address: val }));
                }}
                style={inputSt}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><FLabel text="Chiết khấu tổng (%)" /><input type="number" min={0} max={100} value={info.chietKhauTong} onChange={setInfoField("chietKhauTong")} style={inputSt} /></div>
              <div><FLabel text="Thuế VAT (%)" /><input type="number" min={0} max={100} value={info.thue} onChange={setInfoField("thue")} style={inputSt} /></div>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              <FLabel text="Ghi chú đơn hàng" />
              <textarea
                placeholder="Ghi chú về thời gian giao hàng, yêu cầu đặc biệt..."
                value={info.ghiChu}
                onChange={e => setInfo(prev => ({ ...prev, ghiChu: e.target.value }))}
                style={{ ...inputSt, flex: 1, resize: "none", minHeight: 120 }}
              />
            </div>
          </div>
        </div>

        {/* Right Side: Items Table */}
        <div className="order-modal-right" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--card)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                className="order-modal-toggle-btn"
                onClick={() => setShowInfoSidebar(true)}
                style={{
                  padding: "5px 10px",
                  background: "var(--primary)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  display: "none",
                  alignItems: "center",
                  gap: 5
                }}
              >
                <i className="bi bi-layout-sidebar-inset" />
                Thông tin chung
              </button>
              <span style={{ fontWeight: 700, fontSize: 13, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Bảng danh sách sản phẩm</span>
              <TrangThaiTonKhoBadge
                items={items.map(it => ({ ten: it.ten, soLuong: it.soLuong, soLuongTon: it.soLuongTon }))}
                showPurchaseRequest={false}
              />
            </div>
          </div>

          <div className="order-modal-table-container" style={{ flex: 1, overflowY: "auto", overflowX: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Form nhập liệu */}
            <div style={{ padding: 16, background: "rgba(59,130,246,0.04)", border: "1px dashed rgba(59,130,246,0.3)", borderRadius: 8, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
              <div style={{ flex: "1 1 100%", display: "flex", gap: 12 }}>
                <div style={{ flex: "2 1 250px", position: "relative" }}>
                  <FLabel text="Sản phẩm / Dịch vụ" required />
                  <input
                    value={formItem.ten}
                    placeholder="Nhập tên hoặc mã SKU sản phẩm..."
                    onChange={e => {
                      const v = e.target.value;
                      setFormItem(prev => ({ ...prev, ten: v }));
                      if (!v) {
                        setSuggest([]);
                      } else {
                        setActiveRowIdSync(-1);
                        fetchSuggest(v, -1);
                      }
                    }}
                    onFocus={e => { setActiveRowIdSync(-1); fetchSuggest(formItem.ten, -1); e.currentTarget.style.border = "1px solid var(--primary)"; }}
                    onBlur={e => { e.currentTarget.style.border = "1px solid var(--border)"; setTimeout(() => { if (activeRowIdRef.current === -1) { setSuggest([]); setActiveRowIdSync(null); } }, 200); }}
                    style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", background: "#fff", outline: "none", borderRadius: 6, fontFamily: "inherit", fontSize: 13, color: "var(--foreground)", transition: "border-color 0.15s" }}
                  />
                  {activeRowId === -1 && suggest.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: 200, overflowY: "auto", marginTop: 4 }}>
                      {suggest.map(s => (
                        <div key={s.id} onClick={() => applySuggest(-1, s)}
                          onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid var(--border)", transition: "background 0.1s" }}
                        >
                          <div style={{ fontWeight: 600 }}>{s.tenHang}</div>
                          <div style={{ fontSize: 11, color: "var(--muted-foreground)", display: "flex", gap: 8, marginTop: 2 }}>
                            {s.code && <span style={{ fontFamily: "monospace", background: "var(--muted)", padding: "0 5px", borderRadius: 4 }}>{s.code}</span>}
                            <span>Tồn: <b>{s.soLuongThuc ?? s.soLuong}</b> {s.donVi}</span>
                            <span>Giá: <b>{s.giaBan.toLocaleString("vi-VN")} ₫</b></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ flex: "1 1 110px", maxWidth: 180 }}>
                  <FLabel text="Mã định mức" />
                  <select
                    value={formItem.dinhMucId || ""}
                    onChange={e => {
                      const dmId = e.target.value;
                      const dm = formItem.dinhMucs?.find(x => x.id === dmId);
                      setFormItem(p => ({
                        ...p,
                        dinhMucId: dmId,
                        dinhMucTen: dm ? dm.tenDinhMuc : null,
                        donGia: dm ? (dm.giaBan ?? 0) : p.donGia
                      }));
                    }}
                    disabled={formItem.source === "inventory"}
                    style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, background: formItem.source === "inventory" ? "var(--muted)" : "#fff", outline: "none", fontFamily: "inherit", fontSize: 13, color: formItem.source === "inventory" ? "var(--muted-foreground)" : "var(--foreground)", cursor: formItem.source === "inventory" ? "not-allowed" : "default" }}
                  >
                    {formItem.dinhMucs?.map((dm: any) => (
                      <option key={dm.id} value={dm.id}>{dm.code}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: "2 1 240px" }}>
                  <FLabel text="Mô tả định mức" />
                  <div className="d-flex gap-2">
                    <input
                      value={formItem.dinhMucTen || ""}
                      readOnly
                      placeholder="Tự động hiển thị..."
                      style={{ flex: 1, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--muted)", outline: "none", fontFamily: "inherit", fontSize: 13, color: "var(--muted-foreground)", cursor: "not-allowed" }}
                    />
                    <div className="dropdown">
                      <button
                        type="button"
                        className="btn btn-light border dropdown-toggle"
                        data-bs-toggle="dropdown"
                        disabled={!formItem.dinhMucId}
                        style={{ padding: "7px 12px", borderRadius: 6 }}
                        title="Tuỳ chọn định mức"
                      >
                        <i className="bi bi-three-dots"></i>
                      </button>
                      <ul className="dropdown-menu dropdown-menu-end shadow border-0 rounded-3 p-1">
                        <li>
                          <button 
                            className="dropdown-item py-1.5 px-3 rounded-2" 
                            onClick={() => setShowBomDetail(true)}
                          >
                            <i className="bi bi-info-circle me-2 text-info"></i> Xem chi tiết
                          </button>
                        </li>
                        <li>
                          <button 
                            className="dropdown-item py-1.5 px-3 rounded-2 text-danger" 
                            disabled={isStandardBom}
                            onClick={() => setConfirmDeleteBom(true)}
                          >
                            <i className="bi bi-trash me-2"></i> Xoá định mức
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ flex: "1 1 120px" }}>
                <FLabel text="Tên kho" />
                <input
                  value={formItem.khoTen || ""}
                  readOnly
                  placeholder="Tự động..."
                  style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--muted)", outline: "none", fontFamily: "inherit", fontSize: 13, color: "var(--muted-foreground)", cursor: "not-allowed" }}
                />
              </div>
              <div style={{ flex: "1 1 80px" }}>
                <FLabel text="Đơn vị tính" />
                <input value={formItem.dvt} onChange={e => setFormItem(p => ({ ...p, dvt: e.target.value }))} style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "#fff", outline: "none", textAlign: "center", fontFamily: "inherit", fontSize: 13, color: "var(--foreground)" }} />
              </div>
              <div style={{ flex: "1 1 90px" }}>
                <FLabel text="Số lượng" required />
                <input type="number" min={1} value={formItem.soLuong} onChange={e => setFormItem(p => ({ ...p, soLuong: Math.max(1, Number(e.target.value)) }))} style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "#fff", outline: "none", textAlign: "right", fontFamily: "inherit", fontSize: 13, color: "var(--foreground)" }} />
              </div>
              <div style={{ flex: "1 1 90px" }}>
                <FLabel text="Chiết khấu (%)" />
                <input type="number" min={0} max={100} value={formItem.ckPct} onChange={e => setFormItem(p => ({ ...p, ckPct: Math.max(0, Math.min(100, Number(e.target.value))) }))} style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "#fff", outline: "none", textAlign: "right", fontFamily: "inherit", fontSize: 13, color: "var(--foreground)" }} />
              </div>
              <div style={{ flex: "1 1 120px" }}>
                <FLabel text="Đơn giá (đ)" />
                <CurrencyInput
                  value={formItem.donGia}
                  onChange={v => !(!isAdmin) && setFormItem(p => ({ ...p, donGia: v }))}
                  readOnly={!isAdmin}
                  placeholder="0"
                  style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, background: !isAdmin ? "var(--muted)" : "#fff", outline: "none", textAlign: "right", fontFamily: "inherit", fontSize: 13, color: !isAdmin ? "var(--muted-foreground)" : "var(--foreground)", cursor: !isAdmin ? "not-allowed" : "text" }}
                />
              </div>
              <div>
                <button onClick={addRow} style={{ padding: "7px 14px", border: "none", background: "var(--primary)", color: "#fff", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, height: 33 }}>
                  <i className="bi bi-plus-lg" /> Thêm
                </button>
              </div>
            </div>

            <table className="order-modal-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--muted)", textAlign: "left" }}>
                  <th style={{ padding: 10, width: 40 }}>#</th>
                  <th style={{ padding: 10 }}>Tên sản phẩm - Dịch vụ</th>
                  <th style={{ padding: 10, width: 90, textAlign: "center" }}>Đơn vị tính</th>
                  <th style={{ padding: 10, width: 90, textAlign: "center" }}>Số lượng</th>
                  <th style={{ padding: 10, width: 110, textAlign: "center" }}>Chiết khấu (%)</th>
                  <th style={{ padding: 10, width: 130, textAlign: "right" }}>Đơn giá (đ)</th>
                  <th style={{ padding: 10, width: 130, textAlign: "right" }}>Thành tiền (đ)</th>
                  <th style={{ padding: 10, width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: 20, textAlign: "center", color: "var(--muted-foreground)" }}>Chưa có sản phẩm nào</td></tr>
                ) : items.map((it, idx) => (
                  <tr key={it.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: 10, color: "var(--muted-foreground)" }}>{idx + 1}</td>
                    <td style={{ padding: "6px 10px", position: "relative" }}>
                      {it.ten.trim() && it.soLuongTon !== null && it.soLuongTon !== undefined && (() => {
                        const ton = it.soLuongTon as number;
                        if (ton === 0) return (
                          <span title="Hết hàng" style={{ position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)", color: "#ef4444", pointerEvents: "none", display: "flex" }}>
                            <i className="bi bi-x-circle-fill" style={{ fontSize: 13 }} />
                          </span>
                        );
                        if (it.soLuong > ton) return (
                          <span title={`Thiếu hàng (tồn: ${ton})`} style={{ position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)", color: "#f97316", pointerEvents: "none", display: "flex" }}>
                            <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: 12 }} />
                          </span>
                        );
                        return null;
                      })()}
                      <span style={{ fontWeight: 500, color: "var(--foreground)" }}>{it.ten}</span>
                    </td>
                    <td style={{ padding: 6, textAlign: "center" }}>{it.dvt}</td>
                    <td style={{ padding: 6, textAlign: "center" }}>{it.soLuong}</td>
                    <td style={{ padding: 6, textAlign: "center" }}>{it.ckPct}</td>
                    <td style={{ padding: 6, textAlign: "right" }}>{fmt(it.donGia)}</td>
                    <td style={{ padding: 6, textAlign: "right", fontWeight: 600 }}>{fmt(thanhTien(it))} đ</td>
                    <td style={{ padding: 6 }}>
                      <button onClick={() => removeRow(it.id)} style={{ padding: 4, background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}>
                        <i className="bi bi-trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom summaries */}
          <div style={{ padding: "12px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", alignItems: "center", background: "var(--card)" }}>
            <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
              <div><p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>Tạm tính</p><p style={{ margin: 0, fontWeight: 700 }}>{fmt(tamTinh)} ₫</p></div>
              <div><p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>Khấu trừ</p><p style={{ margin: 0, fontWeight: 700 }}>− {fmt(ckTien)} ₫</p></div>
              <div><p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>Thuế</p><p style={{ margin: 0, fontWeight: 700 }}>+ {fmt(thueTien)} ₫</p></div>
              <div><p style={{ margin: 0, fontSize: 11, color: "var(--primary)" }}>TỔNG CỘNG</p><p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "var(--primary)" }}>{fmt(tongCong)} ₫</p></div>
            </div>
          </div>
        </div>
      </div>

      {showBomDetail && (
        <>
          <div className="offcanvas offcanvas-end show" tabIndex={-1} style={{ visibility: "visible", width: 400, zIndex: 1060 }}>
            <div className="offcanvas-header border-bottom">
              <h5 className="offcanvas-title fw-bold">Chi tiết định mức</h5>
              <button type="button" className="btn-close" onClick={() => setShowBomDetail(false)}></button>
            </div>
            <div className="offcanvas-body p-0">
              {loadingBom ? (
                <div className="text-center p-5 text-muted d-flex flex-column align-items-center justify-content-center h-100">
                  <div className="spinner-border text-primary mb-3" style={{ width: "2rem", height: "2rem" }}></div>
                  <span style={{ fontSize: 14 }}>Đang tải dữ liệu định mức...</span>
                </div>
              ) : bomDetailData ? (
                <div className="d-flex flex-column h-100 bg-light">
                  <div className="p-4 bg-white" style={{ borderBottom: "1px solid var(--border)" }}>
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <span className="badge px-2 py-1" style={{ backgroundColor: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", fontSize: 10, letterSpacing: 0.5, fontWeight: 700 }}>
                        <i className="bi bi-diagram-3 me-1"></i> B.O.M
                      </span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <h5 className="mb-0 fw-bold" style={{ color: "var(--foreground)" }}>
                        {hasBomChanged ? (previewCode || `${originalBomData?.code}-XX`) : bomDetailData.code}
                      </h5>
                      <span className="fw-bold text-primary" style={{ fontSize: 15 }}>{fmt(Number(proposedDonGia || 0))} ₫</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <p className="mb-0 text-muted" style={{ fontSize: 13 }}>
                        {originalBomData?.tenDinhMuc || bomDetailData.tenDinhMuc}
                      </p>
                      <div className="text-end text-muted" style={{ fontSize: 12 }}>
                        Giá vốn: <span className="fw-semibold text-danger">{fmt(Number(totalBomCost || 0))} ₫</span>
                        <span className="mx-1">|</span>
                        Tỷ lệ: <span className="fw-semibold text-success">
                          {totalBomCost > 0 ? (Number(proposedDonGia || 0) / Number(totalBomCost)).toFixed(2) : "0.00"}x
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-3 d-flex align-items-center gap-2">
                      <input 
                        type="text" 
                        className="form-control form-control-sm" 
                        placeholder="Mô tả định mức mới (bắt buộc)" 
                        value={newBomDescription}
                        onChange={e => setNewBomDescription(e.target.value)}
                        disabled={!hasBomChanged || savingNewBom}
                      />
                      <button 
                        className="btn btn-sm btn-primary d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: 31, height: 31 }}
                        onClick={handleSaveNewBom}
                        disabled={!hasBomChanged || !newBomDescription.trim() || savingNewBom}
                        title="Lưu định mức mới"
                      >
                        {savingNewBom ? (
                          <span className="spinner-border spinner-border-sm" style={{ width: "1rem", height: "1rem", borderWidth: "0.15em" }}></span>
                        ) : (
                          <i className="bi bi-save"></i>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 flex-grow-1" style={{ overflowY: "auto" }}>
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <p className="fw-bold mb-0 text-uppercase" style={{ fontSize: 11, letterSpacing: 0.5, color: "var(--muted-foreground)" }}>
                        Thành phần nguyên vật liệu
                      </p>
                      <span className="badge bg-secondary bg-opacity-10 text-secondary rounded-pill">
                        {bomDetailData.vatTu?.length || 0} mục
                      </span>
                    </div>

                    {bomDetailData.vatTu?.length > 0 ? (
                      <div className="d-flex flex-column gap-2">
                        {bomDetailData.vatTu.map((vt: any, idx: number) => (
                          <div key={idx} className="d-flex align-items-center justify-content-between p-2 px-3 bg-white" style={{ border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                            <div className="d-flex align-items-center gap-3">
                              <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 32, height: 32, background: "rgba(99, 102, 241, 0.1)", color: "#6366f1" }}>
                                <i className="bi bi-box-seam" style={{ fontSize: 14 }}></i>
                              </div>
                              <div>
                                <h6 className="mb-0 fw-semibold" style={{ fontSize: 13, color: "var(--foreground)" }}>
                                  {vt.tenVatTu || vt.material?.name || vt.material?.tenHang}
                                </h6>
                                <span className="text-muted" style={{ fontSize: 11 }}>
                                  Mã: {vt.material?.code || "---"}
                                </span>
                              </div>
                            </div>
                            <div className="d-flex align-items-center gap-3">
                              <div className="dropdown">
                                <button 
                                  className="btn btn-sm btn-link p-0 text-muted" 
                                  data-bs-toggle="dropdown"
                                  title="Tuỳ chọn"
                                >
                                  <i className="bi bi-three-dots-vertical"></i>
                                </button>
                                <ul className="dropdown-menu dropdown-menu-end shadow border-0 rounded-3 p-1" style={{ fontSize: 13, minWidth: 160, boxShadow: "0 4px 12px rgba(0,0,0,0.1) !important" }}>
                                  <li>
                                    <button 
                                      className="dropdown-item py-1.5 px-3 rounded-2 text-success" 
                                      onClick={() => {
                                        setAddMaterialTargetIndex(idx);
                                        setShowAddMaterial(true);
                                      }}
                                    >
                                      <i className="bi bi-plus-circle me-2"></i>Thêm mới
                                    </button>
                                  </li>
                                  {vt.material?.category?.id && (
                                    <li>
                                      <button className="dropdown-item py-1.5 px-3 rounded-2" onClick={() => {
                                        setAlternativeTarget(vt);
                                        setShowAlternative(true);
                                      }}>
                                        <i className="bi bi-arrow-left-right me-2 text-primary"></i>Thay thế
                                      </button>
                                    </li>
                                  )}
                                  <li>
                                    <button 
                                      className="dropdown-item py-1.5 px-3 rounded-2 text-danger" 
                                      onClick={() => setTargetDeleteMaterial(vt)}
                                    >
                                      <i className="bi bi-trash me-2"></i>Xoá bỏ
                                    </button>
                                  </li>
                                  <li><hr className="dropdown-divider my-1" /></li>
                                  <li>
                                    <button className="dropdown-item py-1.5 px-3 rounded-2" onClick={() => {}}>
                                      <i className="bi bi-info-circle me-2 text-info"></i>Xem chi tiết
                                    </button>
                                  </li>
                                </ul>
                              </div>
                              <div className="text-end border-start ps-3 flex-shrink-0">
                                <span className="fw-bold d-block text-primary" style={{ fontSize: 15 }}>{vt.soLuong}</span>
                                <span className="text-muted text-uppercase" style={{ fontSize: 10, fontWeight: 600 }}>{vt.donViTinh || vt.material?.unit || vt.material?.donVi}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-4 bg-white rounded-3 border" style={{ borderStyle: "dashed !important" }}>
                        <i className="bi bi-inboxes text-muted opacity-50 d-block mb-2" style={{ fontSize: 24 }}></i>
                        <p className="small text-muted fst-italic mb-0">Định mức này chưa có thành phần vật tư.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center p-5 text-muted d-flex flex-column align-items-center h-100 justify-content-center">
                  <i className="bi bi-exclamation-circle mb-2" style={{ fontSize: 24 }}></i>
                  Không tải được dữ liệu định mức.
                </div>
              )}
            </div>
          </div>
          <div className="offcanvas-backdrop fade show" style={{ zIndex: 1050 }} onClick={() => setShowBomDetail(false)}></div>

          {/* Modal xem danh sách vật tư thay thế */}
          {showAlternative && (
            <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1070 }}>
              <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content" style={{ height: "85vh" }}>
                  <div className="modal-header border-bottom-0 pb-0">
                    <h5 className="modal-title fw-bold">Vật tư thay thế cùng loại</h5>
                    <button type="button" className="btn-close" onClick={() => setShowAlternative(false)}></button>
                  </div>
                  <div className="bg-white p-3 border-bottom rounded-top">
                    <p className="mb-1 text-muted" style={{ fontSize: 12 }}>Đang xem vật tư thay thế cho:</p>
                    <h6 className="mb-3 fw-semibold">{alternativeTarget?.tenVatTu || alternativeTarget?.material?.name || alternativeTarget?.material?.tenHang}</h6>
                    <div className="input-group input-group-sm">
                      <span className="input-group-text bg-light border-end-0"><i className="bi bi-search text-muted"></i></span>
                      <input 
                        type="text" 
                        className="form-control border-start-0 ps-0 bg-light" 
                        placeholder="Tìm kiếm theo mã hoặc tên..."
                        value={altSearch}
                        onChange={e => setAltSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="modal-body bg-light p-3">
                    {loadingAlternatives ? (
                      <div className="text-center p-4">
                        <div className="spinner-border text-primary" role="status"></div>
                      </div>
                    ) : alternativeMaterials.length > 0 ? (
                      <div className="d-flex flex-column gap-2">
                        {alternativeMaterials.filter(m => {
                          if (!altSearch.trim()) return true;
                          const q = altSearch.toLowerCase();
                          return (m.name || m.tenHang || "").toLowerCase().includes(q) || (m.code || "").toLowerCase().includes(q);
                        }).map((alt, idx) => (
                            <div key={idx} className="p-3 bg-white d-flex align-items-center justify-content-between" style={{ border: "1px solid var(--border)", borderRadius: 8 }}>
                              <div>
                                <h6 className="mb-1 fw-semibold" style={{ fontSize: 13 }}>{alt.name || alt.tenHang}</h6>
                                <span className="text-muted" style={{ fontSize: 11 }}>
                                  Mã: {alt.code} | Đơn vị: {alt.unit || alt.donVi} <span className="mx-1">|</span> Giá bán: <span className="fw-semibold text-primary">{fmt(alt.giaBan || 0)} ₫</span>
                                </span>
                              </div>
                              <div className="d-flex align-items-center gap-3">
                                <div className="text-end ps-2 border-start">
                                  <span className="d-block text-muted" style={{ fontSize: 10 }}>TỒN KHO</span>
                                  <span className="fw-bold" style={{ fontSize: 14 }}>{alt.stocks?.reduce((acc: any, s: any) => acc + s.soLuong, 0) || 0}</span>
                                </div>
                                <button className="btn btn-sm btn-outline-primary" onClick={() => handleSwapMaterial(alt)}>
                                  Chọn
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center p-4 text-muted">
                          Không tìm thấy vật tư nào khác cùng loại.
                        </div>
                      )}
                  </div>
                  <div className="modal-footer bg-white border-top">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowAlternative(false)}>Đóng</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal tìm và thêm vật tư mới */}
          {showAddMaterial && (
            <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1070 }}>
              <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content" style={{ height: "85vh" }}>
                  <div className="modal-header border-bottom-0 pb-0">
                    <h5 className="modal-title fw-bold">Thêm mới vật tư</h5>
                    <button type="button" className="btn-close" onClick={() => setShowAddMaterial(false)}></button>
                  </div>
                  <div className="bg-white p-3 border-bottom rounded-top">
                    <div className="d-flex gap-2 mb-2">
                      <select 
                        className="form-select form-select-sm border-start-0 ps-2 bg-light" 
                        value={addCategory} 
                        onChange={e => setAddCategory(e.target.value)}
                        style={{ maxWidth: 200, borderLeft: "1px solid var(--border)", borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }}
                      >
                        <option value="">Tất cả danh mục</option>
                        {addCategories.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <div className="input-group input-group-sm flex-grow-1">
                        <span className="input-group-text bg-light border-end-0"><i className="bi bi-search text-muted"></i></span>
                        <input 
                          type="text" 
                          className="form-control border-start-0 ps-0 bg-light" 
                          placeholder="Tìm kiếm theo mã hoặc tên..."
                          value={addSearch}
                          onChange={e => setAddSearch(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="modal-body bg-light p-3">
                    {loadingAddMaterials ? (
                      <div className="text-center p-4">
                        <div className="spinner-border text-primary" role="status"></div>
                      </div>
                    ) : addMaterials.length > 0 ? (
                      <div className="d-flex flex-column gap-2">
                        {addMaterials.filter(m => {
                          if (addCategory && m.categoryId !== addCategory) return false;
                          if (!addSearch.trim()) return true;
                          const q = addSearch.toLowerCase();
                          return (m.name || m.tenHang || "").toLowerCase().includes(q) || (m.code || "").toLowerCase().includes(q);
                        }).slice(0, 50).map((alt, idx) => (
                            <div key={idx} className="p-3 bg-white d-flex align-items-center justify-content-between" style={{ border: "1px solid var(--border)", borderRadius: 8 }}>
                              <div className="flex-grow-1 pe-3">
                                <h6 className="mb-1 fw-semibold" style={{ fontSize: 13 }}>{alt.name || alt.tenHang}</h6>
                                <span className="text-muted" style={{ fontSize: 11 }}>
                                  Mã: {alt.code} | Đơn vị: {alt.unit || alt.donVi} <span className="mx-1">|</span> Giá bán: <span className="fw-semibold text-primary">{fmt(alt.giaBan || 0)} ₫</span>
                                </span>
                              </div>
                              <div className="d-flex align-items-center gap-3">
                                <div className="text-end ps-2 border-start">
                                  <span className="d-block text-muted" style={{ fontSize: 10 }}>TỒN KHO</span>
                                  <span className="fw-bold" style={{ fontSize: 14 }}>{alt.stocks?.reduce((acc: any, s: any) => acc + s.soLuong, 0) || 0}</span>
                                </div>
                                <div className="d-flex align-items-center border rounded">
                                  <input 
                                    type="number" 
                                    min="1" 
                                    className="form-control form-control-sm border-0 text-center" 
                                    style={{ width: 50, outline: "none", boxShadow: "none" }} 
                                    value={addQuantities[alt.id] || 1}
                                    onChange={(e) => setAddQuantities(p => ({ ...p, [alt.id]: Math.max(1, Number(e.target.value)) }))}
                                  />
                                </div>
                                <button className="btn btn-sm btn-outline-success px-2" onClick={() => handleAddMaterial(alt)} title="Thêm vật tư">
                                  <i className="bi bi-plus-lg"></i>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center p-4 text-muted">
                          Không tìm thấy vật tư nào.
                        </div>
                      )}
                  </div>
                  <div className="modal-footer bg-white border-top">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddMaterial(false)}>Đóng</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmDeleteBom}
        variant="danger"
        title="Xoá định mức?"
        message="Bạn có chắc chắn muốn xoá định mức này khỏi hệ thống? Thao tác này không thể hoàn tác."
        confirmLabel="Xoá định mức"
        loading={isDeletingBom}
        onConfirm={handleDeleteBom}
        onCancel={() => setConfirmDeleteBom(false)}
      />

      <ConfirmDialog
        open={!!targetDeleteMaterial}
        variant="danger"
        title="Xoá vật tư?"
        message={`Bạn có chắc chắn muốn xoá vật tư "${targetDeleteMaterial?.tenVatTu || targetDeleteMaterial?.material?.name || targetDeleteMaterial?.material?.tenHang || 'này'}" khỏi định mức?`}
        confirmLabel="Xoá"
        onConfirm={handleDeleteMaterial}
        onCancel={() => setTargetDeleteMaterial(null)}
      />
    </div>
  );
}
