"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ModernStepper, ModernStepItem } from "@/components/ui/ModernStepper";
import { WorkflowCard } from "@/components/ui/WorkflowCard";
import { Table, TableColumn } from "@/components/ui/Table";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { FullWidthTableLayout } from "@/components/layout/FullWidthTableLayout";
import { Pagination } from "@/components/ui/Pagination";
import { PolicyOffcanvas } from "./PolicyOffcanvas";
import { ProductDetailOffcanvas } from "./ProductDetailOffcanvas";
import { QuotationPrintPreview } from "./QuotationPrintPreview";
import { PromotionOffcanvas } from "./PromotionOffcanvas";
import { QAAddModal } from "./QAAddModal";
import { HoverImage } from "@/components/ui/HoverImage";

const STEPS: ModernStepItem[] = [
  { num: 1, id: "policy", title: "Chính sách bán hàng", desc: "Thiết lập chính sách", icon: "bi-file-earmark-text" },
  { num: 2, id: "promotion", title: "Chương trình khuyến mãi", desc: "Quản lý khuyến mãi", icon: "bi-gift" },
  { num: 3, id: "quotation", title: "Bảng báo giá", desc: "Quản lý bảng báo giá", icon: "bi-cash-stack" },
  { num: 4, id: "soft_skills", title: "Kỹ năng mềm", desc: "Đào tạo và tài liệu", icon: "bi-person-workspace" }
];

interface PolicyItem {
  id: string;
  name: string;
  docNo?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  summary: string;
  status: string;
  pdfUrl?: string;
}

const getPolicyColumns = (
  onViewPdf: (item: PolicyItem) => void,
  selectedIds: string[],
  toggleSelection: (id: string) => void
): TableColumn<PolicyItem>[] => [
  { header: "", width: "40px", render: (row: PolicyItem) => (
    <input 
      type="checkbox" 
      className="form-check-input mt-0"
      checked={selectedIds.includes(row.id)}
      onChange={() => toggleSelection(row.id)}
    />
  )},
  { header: "STT", width: "60px", render: (_: PolicyItem, index: number) => index + 1 },
  { header: "Tên văn bản", render: (row: PolicyItem) => (
    <div>
      <div className="fw-semibold" style={{ color: "var(--bs-violet)" }}>{row.name}</div>
      {row.docNo && <div className="text-muted" style={{ fontSize: "12px" }}>{row.docNo}</div>}
    </div>
  ) },
  { header: "Ngày ban hành", render: (row: PolicyItem) => row.date },
  { header: "Tóm tắt nội dung", render: (row: PolicyItem) => row.summary },
  { header: "Trạng thái", render: (row: PolicyItem) => (
    <span className={`badge bg-${row.status === 'Hiệu lực' ? 'success' : 'secondary'} bg-opacity-10 text-${row.status === 'Hiệu lực' ? 'success' : 'secondary'}`}>
      {row.status}
    </span>
  )},
  { header: "", width: "50px", render: (row: PolicyItem) => row.pdfUrl ? (
    <button 
      className="btn btn-sm btn-light text-muted border-0"
      onClick={() => onViewPdf(row)}
      title="Xem văn bản đính kèm"
    >
      <i className="bi bi-three-dots-vertical"></i>
    </button>
  ) : null}
];

// mockPolicies removed as data is now fetched from the database

const getPromotionColumns = (
  onViewPdf: (item: PolicyItem) => void,
  selectedIds: string[],
  toggleSelection: (id: string) => void
): TableColumn<PolicyItem>[] => [
  { header: "", width: "40px", render: (row: PolicyItem) => (
    <input 
      type="checkbox" 
      className="form-check-input mt-0"
      checked={selectedIds.includes(row.id)}
      onChange={() => toggleSelection(row.id)}
    />
  )},
  { header: "STT", width: "60px", render: (_: PolicyItem, index: number) => index + 1 },
  { header: "Tên văn bản", render: (row: PolicyItem) => (
    <div>
      <div className="fw-semibold" style={{ color: "var(--bs-violet)" }}>{row.name}</div>
      {row.docNo && <div className="text-muted" style={{ fontSize: "12px" }}>{row.docNo}</div>}
    </div>
  ) },
  { header: "Thời gian hiệu lực", render: (row: PolicyItem) => (
    <div>
      <div><span className="text-muted">Bắt đầu:</span> {row.startDate}</div>
      <div><span className="text-muted">Kết thúc:</span> {row.endDate}</div>
    </div>
  ) },
  { header: "Tóm tắt nội dung", render: (row: PolicyItem) => row.summary },
  { header: "Trạng thái", render: (row: PolicyItem) => (
    <span className={`badge bg-${row.status === 'Hiệu lực' ? 'success' : 'secondary'} bg-opacity-10 text-${row.status === 'Hiệu lực' ? 'success' : 'secondary'}`}>
      {row.status}
    </span>
  )},
  { header: "", width: "50px", render: (row: PolicyItem) => row.pdfUrl ? (
    <button 
      className="btn btn-sm btn-light text-muted border-0"
      onClick={() => onViewPdf(row)}
      title="Xem văn bản đính kèm"
    >
      <i className="bi bi-three-dots-vertical"></i>
    </button>
  ) : null}
];

// mockPromotions removed as data is now fetched from the database

interface QuotationItem {
  id: string;
  isFullWidth?: boolean;
  fullWidthContent?: string;
  categoryName?: string;
  stt?: number;
  productName: string;
  productCode: string;
  specification: string;
  listedPrice: number;
  note: string;
  originalData?: any;
  imageUrl?: string;
}


interface QAItem {
  id: number;
  question: string;
  answer: string;
}

const qaColumns: TableColumn<QAItem>[] = [
  { header: "STT", width: "60px", render: (_: QAItem, index: number) => index + 1 },
  { header: "Câu hỏi của khách hàng", width: "35%", render: (row: QAItem) => <div className="fw-semibold text-dark">{row.question}</div> },
  { header: "Câu trả lời tham khảo", render: (row: QAItem) => <div className="text-muted">{row.answer}</div> }
];

// mockQA removed as data is now fetched from the database

const softSkillsGuide = [
  {
    id: 1,
    title: "Kỹ năng lắng nghe tích cực & Đồng cảm",
    desc: "Khách hàng không chỉ mua một cái bồn cầu hay một chiếc bếp từ; họ đang mua giải pháp cho không gian sống của họ.",
    points: [
      "Nghe để hiểu, không phải nghe để đối phó: Thay vì thao thao bất tuyệt về tính năng sản phẩm, hãy lắng nghe xem nhà họ có mấy người, có người già hay trẻ nhỏ không.",
      "Đồng cảm với \"nỗi đau\": Hiểu được áp lực của chủ nhà khi đang rối bời giữa hàng trăm chi phí xây dựng để tư vấn gói thiết bị tối ưu nhất trong ngân sách của họ."
    ],
    icon: "bi-ear"
  },
  {
    id: 2,
    title: "Kỹ năng giao tiếp và Diễn đạt \"Bình dân học vụ\"",
    desc: "Thiết bị phòng tắm/nhà bếp có rất nhiều thông số kỹ thuật (công suất hút mùi, chất liệu men sứ, công nghệ xả xoáy, lớp phủ nano...).",
    points: [
      "Một NVKD giỏi là người biết dịch từ ngôn ngữ kỹ thuật sang ngôn ngữ lợi ích. Thay vì nói \"Sen tắm có công nghệ trộn khí\", hãy nói: \"Sen tắm xả nước rất êm và mượt, giúp tắm bọt mịn như spa mà tiết kiệm 30% nước\"."
    ],
    icon: "bi-chat-heart"
  },
  {
    id: 3,
    title: "Kỹ năng tư vấn thẩm mỹ và Định hình phong cách",
    desc: "Sản phẩm phòng tắm và nhà bếp hiện nay đòi hỏi tính đồng bộ và thẩm mỹ cực cao.",
    points: [
      "NVKD cần có gu thẩm mỹ tốt để tư vấn phối màu và tối ưu không gian (phòng nhỏ thì dùng tủ chậu treo tường để thoáng sàn). Kỹ năng này biến bạn thành một \"chuyên gia tư vấn\"."
    ],
    icon: "bi-palette"
  },
  {
    id: 4,
    title: "Kỹ năng xử lý từ chối và Giải quyết vấn đề",
    desc: "Trong ngành này, việc khách hàng chê đắt, so sánh giá, hoặc gặp sự cố khi lắp đặt là chuyện cơm bữa.",
    points: [
      "Khi bị chê đắt: Không đôi co, hãy nhấn mạnh vào giá trị sử dụng lâu dài (độ bền 10-15 năm, bảo hành chính hãng).",
      "Xử lý sự cố lắp đặt: Bình tĩnh phối hợp giữa kỹ thuật của hãng và nhà thầu để tìm phương án sửa đổi nhanh nhất cho khách, thay vì đổ lỗi."
    ],
    icon: "bi-shield-check"
  },
  {
    id: 5,
    title: "Kỹ năng xây dựng và Nuôi dưỡng mối quan hệ",
    desc: "Doanh số khủng thường đến từ mối quan hệ với các \"vệ tinh\": kiến trúc sư, nhà thầu xây dựng, thợ điện nước.",
    points: [
      "Khéo léo trong giao tiếp để biến các đối tượng này thành \"cộng tác viên\" giới thiệu khách hàng thông qua chính sách chiết khấu hợp lý và sự uy tín."
    ],
    icon: "bi-people"
  },
  {
    id: 6,
    title: "Kỹ năng quản lý thời gian và Theo sát",
    desc: "Hành trình mua thiết bị hoàn thiện nhà thường kéo dài từ vài tuần đến vài tháng.",
    points: [
      "Cần biết rõ tiến độ công trình của khách để gọi điện chăm sóc đúng thời điểm: Khi nào họ đổ sàn xong? Khi nào bắt đầu đi đường ống nước để tư vấn kích thước đặt trước?"
    ],
    icon: "bi-clock-history"
  }
];

export default function PricingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [expandedQA, setExpandedQA] = useState<number | null>(null);
  const [qaList, setQaList] = useState<QAItem[]>([]);
  const [loadingQA, setLoadingQA] = useState(true);
  const [isQaModalOpen, setIsQaModalOpen] = useState(false);
  const [selectedQaIds, setSelectedQaIds] = useState<number[]>([]);
  const [isDeletingQa, setIsDeletingQa] = useState(false);

  const [selectedPolicyIds, setSelectedPolicyIds] = useState<string[]>([]);
  const [isDeletingPolicy, setIsDeletingPolicy] = useState(false);

  const [selectedPromotionIds, setSelectedPromotionIds] = useState<string[]>([]);
  const [isDeletingPromotion, setIsDeletingPromotion] = useState(false);

  const [isPolicyOffcanvasOpen, setIsPolicyOffcanvasOpen] = useState(false);
  const [isPromotionOffcanvasOpen, setIsPromotionOffcanvasOpen] = useState(false);
  const [previewPdfItem, setPreviewPdfItem] = useState<PolicyItem | null>(null);

  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [promotions, setPromotions] = useState<PolicyItem[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(true);
  const [loadingPromotions, setLoadingPromotions] = useState(true);

  // Filter states
  const [policySearch, setPolicySearch] = useState("");
  const [policyStatus, setPolicyStatus] = useState("all");
  
  const [promotionSearch, setPromotionSearch] = useState("");
  const [promotionStatus, setPromotionStatus] = useState("all");
  
  const [qaSearch, setQaSearch] = useState("");

  const [quotationSearch, setQuotationSearch] = useState("");
  const [quotationCategory, setQuotationCategory] = useState("all");
  const [quotationCategories, setQuotationCategories] = useState<string[]>([]);
  const [quotations, setQuotations] = useState<QuotationItem[]>([]);
  const [loadingQuotations, setLoadingQuotations] = useState(false);
  const [quotationPage, setQuotationPage] = useState(1);
  const QUOTATIONS_PER_PAGE = 20;

  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const filteredQuotations = useMemo(() => {
    let filtered = quotations;
    if (quotationCategory !== "all") {
      filtered = filtered.filter(q => q.categoryName === quotationCategory);
    }
    if (quotationSearch) {
      const lowerSearch = quotationSearch.toLowerCase();
      filtered = filtered.filter(q => 
         q.isFullWidth || 
         q.productName.toLowerCase().includes(lowerSearch) || 
         q.productCode.toLowerCase().includes(lowerSearch)
      );
      const nonEmptyCategories = new Set(filtered.filter(q => !q.isFullWidth).map(q => q.categoryName));
      filtered = filtered.filter(q => !q.isFullWidth || nonEmptyCategories.has(q.categoryName));
    }

    const finalFiltered: any[] = [];
    const categoryCounts: Record<string, number> = {};
    for (const q of filtered) {
      if (!q.isFullWidth && q.categoryName) {
        categoryCounts[q.categoryName] = (categoryCounts[q.categoryName] || 0) + 1;
      }
    }

    for (const q of filtered) {
       if (q.isFullWidth) {
         const currentCategory = q.categoryName || "";
         const count = categoryCounts[currentCategory] || 0;
         const isCollapsed = collapsedCategories.has(currentCategory);
         
         finalFiltered.push({
           ...q,
           fullWidthContent: (
             <div 
               className="d-flex align-items-center gap-2 cursor-pointer w-100" 
               style={{ userSelect: "none" }}
               onClick={(e) => {
                 e.stopPropagation();
                 setCollapsedCategories(prev => {
                   const next = new Set(prev);
                   if (next.has(currentCategory)) next.delete(currentCategory);
                   else next.add(currentCategory);
                   return next;
                 });
               }}
             >
               <i className={`bi bi-chevron-${isCollapsed ? 'right' : 'down'} text-muted`}></i>
               <span className="fw-bold text-uppercase" style={{ color: "#003087" }}>{currentCategory}</span>
               <span className="badge bg-secondary rounded-pill">{count}</span>
             </div>
           )
         });
       } else {
         const currentCategory = q.categoryName || "";
         if (!collapsedCategories.has(currentCategory)) {
           finalFiltered.push(q);
         }
       }
    }

    return finalFiltered;
  }, [quotations, quotationCategory, quotationSearch, collapsedCategories]);

  const printQuotations = useMemo(() => {
    if (selectedProductIds.size === 0) return filteredQuotations;
    let selected = filteredQuotations.filter(q => q.isFullWidth || selectedProductIds.has(q.id));
    // Filter out empty categories again
    const nonEmptyCategories = new Set(selected.filter(q => !q.isFullWidth).map(q => q.categoryName));
    selected = selected.filter(q => !q.isFullWidth || nonEmptyCategories.has(q.categoryName));
    return selected;
  }, [filteredQuotations, selectedProductIds]);

  const quotationColumns: TableColumn<QuotationItem>[] = useMemo(() => {
    const selectableProducts = filteredQuotations.filter(q => !q.isFullWidth);
    const allSelected = selectableProducts.length > 0 && selectedProductIds.size === selectableProducts.length;

    return [
      { 
        header: (
          <div className="d-flex justify-content-center align-items-center w-100">
            <input 
              type="checkbox" 
              className="form-check-input m-0 cursor-pointer"
              checked={allSelected}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedProductIds(new Set(selectableProducts.map(q => q.id)));
                } else {
                  setSelectedProductIds(new Set());
                }
              }}
            />
          </div>
        ),
        width: "60px", 
        align: "center", 
        render: (row: QuotationItem) => (
          <div className="d-flex justify-content-center align-items-center w-100">
            <input 
              type="checkbox" 
              className="form-check-input m-0 cursor-pointer"
              checked={selectedProductIds.has(row.id)}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                const newSet = new Set(selectedProductIds);
                if (e.target.checked) {
                  newSet.add(row.id);
                } else {
                  newSet.delete(row.id);
                }
                setSelectedProductIds(newSet);
              }}
            />
          </div>
        )
      },
      { header: "Thông tin sản phẩm", width: "35%", render: (row: QuotationItem) => (
        <div>
          <div className="fw-semibold text-dark">{row.productName}</div>
          <div className="text-muted" style={{ fontSize: "12px" }}>{row.productCode}</div>
        </div>
      ) },
      { header: "Quy cách", width: "25%", render: (row: QuotationItem) => row.specification },
      { header: "Giá niêm yết", width: "15%", render: (row: QuotationItem) => <div className="text-danger fw-bold">{row.listedPrice.toLocaleString("vi-VN")} đ</div> },
      { header: "Ghi chú", render: (row: QuotationItem) => <div className="text-muted" style={{ fontSize: "13px" }}>{row.note}</div> }
    ];
  }, [filteredQuotations, selectedProductIds]);

  useEffect(() => {
    fetchQA();
    fetchPolicies();
    fetchPromotions();
    fetchQuotations();
  }, []);

  const fetchQuotations = async () => {
    setLoadingQuotations(true);
    try {
      const res = await fetch("/api/seajong/products?per_page=1000");
      const data = await res.json();
      if (data.products && Array.isArray(data.products)) {
        const groups: Record<string, any[]> = {};
        data.products.forEach((p: any) => {
           let catName = "Khác";
           if (p.categoryNames && p.categoryNames.length > 0) {
              const specificCats = p.categoryNames.filter((c: string) => c !== "Thiết bị vệ sinh" && c !== "Phụ kiện nhà tắm" && c !== "Phụ kiện phòng tắm");
              if (specificCats.length > 0) catName = specificCats[specificCats.length - 1];
              else catName = p.categoryNames[p.categoryNames.length - 1];
           }
           if (!groups[catName]) groups[catName] = [];
           groups[catName].push(p);
        });

        const list: QuotationItem[] = [];
        const cats = Object.keys(groups).sort();
        setQuotationCategories(cats);

        cats.forEach(cat => {
           list.push({ 
             id: `cat_${cat}`, 
             isFullWidth: true, 
             fullWidthContent: cat, 
             categoryName: cat,
             productName: "", 
             productCode: "", 
             specification: "", 
             listedPrice: 0, 
             note: "" 
           } as QuotationItem);
           
           let stt = 1;
           groups[cat].forEach(p => {
             let pCode = "";
             if (p.specs) {
                const key = Object.keys(p.specs).find(k => k.toLowerCase().includes("mã sản phẩm"));
                if (key) pCode = p.specs[key];
             }
             list.push({
               id: p.id.toString(),
               stt: stt++,
               categoryName: cat,
               productName: p.name,
               productCode: pCode,
               specification: "BỘ",
               listedPrice: p.price,
               note: "",
               originalData: p,
               imageUrl: p.images && p.images.length > 0 ? p.images[0] : undefined
             });
           });
        });
        setQuotations(list);
      }
    } catch (e) {
       console.error("Error fetching quotations", e);
    }
    setLoadingQuotations(false);
  };

  const fetchQA = (focusId?: number) => {
    setLoadingQA(true);
    fetch('/api/soft-skills-qa')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setQaList(data);
          if (focusId) {
            setExpandedQA(focusId);
            setTimeout(() => {
              const el = document.getElementById(`qa-item-${focusId}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
          }
        } else {
          console.error("API returned non-array data:", data);
          setQaList([]);
        }
        setLoadingQA(false);
      })
      .catch(err => {
        console.error("Failed to load QA data", err);
        setQaList([]);
        setLoadingQA(false);
      });
  };

  const handleDeleteQa = async () => {
    if (selectedQaIds.length === 0) return;
    setIsDeletingQa(true);
    try {
      const res = await fetch('/api/soft-skills-qa', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedQaIds })
      });
      if (res.ok) {
        setSelectedQaIds([]);
        fetchQA();
      } else {
        alert("Xóa thất bại");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeletingQa(false);
    }
  };

  const toggleQaSelection = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedQaIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const fetchPolicies = async () => {
    setLoadingPolicies(true);
    try {
      const res = await fetch('/api/sales/policies');
      if (res.ok) {
        const data = await res.json();
        setPolicies(data);
      }
    } catch (error) {
      console.error("Failed to fetch policies:", error);
    } finally {
      setLoadingPolicies(false);
    }
  };

  const fetchPromotions = async () => {
    setLoadingPromotions(true);
    try {
      const res = await fetch('/api/sales/promotions');
      if (res.ok) {
        const data = await res.json();
        setPromotions(data);
      }
    } catch (error) {
      console.error("Failed to fetch promotions:", error);
    } finally {
      setLoadingPromotions(false);
    }
  };

  const handleDeletePolicies = async () => {
    if (selectedPolicyIds.length === 0) return;
    setIsDeletingPolicy(true);
    try {
      const res = await fetch('/api/sales/policies', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedPolicyIds })
      });
      if (res.ok) {
        setSelectedPolicyIds([]);
        fetchPolicies();
      } else {
        alert("Xóa thất bại");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeletingPolicy(false);
    }
  };

  const togglePolicySelection = (id: string) => {
    setSelectedPolicyIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleDeletePromotions = async () => {
    if (selectedPromotionIds.length === 0) return;
    setIsDeletingPromotion(true);
    try {
      const res = await fetch('/api/sales/promotions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedPromotionIds })
      });
      if (res.ok) {
        setSelectedPromotionIds([]);
        fetchPromotions();
      } else {
        alert("Xóa thất bại");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeletingPromotion(false);
    }
  };

  const togglePromotionSelection = (id: string) => {
    setSelectedPromotionIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleQA = (id: number) => {
    setExpandedQA(prev => prev === id ? null : id);
  };

  // Derived filtered data
  const filteredPolicies = policies.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(policySearch.toLowerCase()) || 
                          p.docNo?.toLowerCase().includes(policySearch.toLowerCase());
    const matchesStatus = policyStatus === "all" || p.status === (policyStatus === "active" ? "Hiệu lực" : "Hết hiệu lực");
    return matchesSearch && matchesStatus;
  });

  const filteredPromotions = promotions.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(promotionSearch.toLowerCase()) || 
                          p.docNo?.toLowerCase().includes(promotionSearch.toLowerCase());
    const matchesStatus = promotionStatus === "all" || p.status === (promotionStatus === "active" ? "Hiệu lực" : "Hết hiệu lực");
    return matchesSearch && matchesStatus;
  });

  const filteredQaList = qaList.filter(q => 
    q.question.toLowerCase().includes(qaSearch.toLowerCase()) || 
    q.answer.toLowerCase().includes(qaSearch.toLowerCase())
  );

  return (
    <div className="d-flex flex-column h-100">
      <PageHeader
        title="Chính sách bán hàng"
        description="Thiết lập bảng giá riêng biệt cho từng cấp đại lý"
        icon="bi-tags"
        color="violet"
      />
      
      <div className="flex-grow-1 p-2 d-flex flex-column" style={{ background: "color-mix(in srgb, var(--muted) 40%, transparent)", minHeight: 0 }}>
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
          {currentStep === 1 && (
            <FullWidthTableLayout
              className="flex-grow-1 overflow-hidden full-width-table-wrapper"
              style={{ minHeight: 0 }}
              header={
                <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 w-100">
                  <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ maxWidth: 600 }}>
                    <FilterSelect
                      options={[
                        { label: "Tất cả trạng thái", value: "all" },
                        { label: "Hiệu lực", value: "active" },
                        { label: "Hết hiệu lực", value: "inactive" }
                      ]}
                      value={policyStatus}
                      onChange={setPolicyStatus}
                      placeholder="Trạng thái"
                      width={160}
                    />
                    <div className="flex-grow-1">
                      <SearchInput
                        placeholder="Tìm kiếm văn bản..."
                        value={policySearch}
                        onChange={setPolicySearch}
                      />
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    {selectedPolicyIds.length > 0 && (
                      <button 
                        className="btn btn-outline-danger d-flex align-items-center justify-content-center gap-2 shadow-sm"
                        style={{ height: 34, fontSize: "12.5px", borderRadius: 8, fontWeight: 700 }}
                        onClick={handleDeletePolicies}
                        disabled={isDeletingPolicy}
                        title="Xóa các mục đã chọn"
                      >
                        {isDeletingPolicy ? <span className="spinner-border spinner-border-sm" role="status"></span> : <i className="bi bi-trash"></i>}
                      </button>
                    )}
                    <button 
                      className="btn text-white px-3 d-flex align-items-center justify-content-center gap-2 shadow-sm"
                      style={{ height: 34, fontSize: "12.5px", backgroundColor: "#003087", borderColor: "#003087", borderRadius: 8, fontWeight: 700, whiteSpace: "nowrap" }}
                      onClick={() => setIsPolicyOffcanvasOpen(true)}
                    >
                      <i className="bi bi-plus-lg"></i> 
                      <span>Thêm chính sách</span>
                    </button>
                  </div>
                </div>
              }
              table={
                <div className="h-100 border-top bg-white overflow-auto d-flex flex-column" style={{ minHeight: 0 }}>
                  {loadingPolicies ? (
                    <div className="text-center p-4 text-muted">
                      <div className="spinner-border spinner-border-sm me-2 text-primary"></div>
                      Đang tải danh sách chính sách...
                    </div>
                  ) : (
                    <Table columns={getPolicyColumns(setPreviewPdfItem, selectedPolicyIds, togglePolicySelection)} rows={filteredPolicies} compact />
                  )}
                </div>
              }
            />
          )}
          
          {currentStep === 2 && (
            <FullWidthTableLayout
              className="flex-grow-1 overflow-hidden full-width-table-wrapper"
              style={{ minHeight: 0 }}
              header={
                <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 w-100">
                  <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ maxWidth: 600 }}>
                    <FilterSelect
                      options={[
                        { label: "Tất cả trạng thái", value: "all" },
                        { label: "Hiệu lực", value: "active" },
                        { label: "Hết hiệu lực", value: "inactive" }
                      ]}
                      value={promotionStatus}
                      onChange={setPromotionStatus}
                      placeholder="Trạng thái"
                      width={160}
                    />
                    <div className="flex-grow-1">
                      <SearchInput
                        placeholder="Tìm kiếm chương trình..."
                        value={promotionSearch}
                        onChange={setPromotionSearch}
                      />
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    {selectedPromotionIds.length > 0 && (
                      <button 
                        className="btn btn-outline-danger d-flex align-items-center justify-content-center gap-2 shadow-sm"
                        style={{ height: 34, fontSize: "12.5px", borderRadius: 8, fontWeight: 700 }}
                        onClick={handleDeletePromotions}
                        disabled={isDeletingPromotion}
                        title="Xóa các mục đã chọn"
                      >
                        {isDeletingPromotion ? <span className="spinner-border spinner-border-sm" role="status"></span> : <i className="bi bi-trash"></i>}
                      </button>
                    )}
                    <button 
                      className="btn text-white px-3 d-flex align-items-center justify-content-center gap-2 shadow-sm"
                      style={{ height: 34, fontSize: "12.5px", backgroundColor: "#003087", borderColor: "#003087", borderRadius: 8, fontWeight: 700, whiteSpace: "nowrap" }}
                      onClick={() => setIsPromotionOffcanvasOpen(true)}
                    >
                      <i className="bi bi-plus-lg"></i>
                      <span>Thêm khuyến mãi</span>
                    </button>
                  </div>
                </div>
              }
              table={
                <div className="h-100 border-top bg-white overflow-auto d-flex flex-column" style={{ minHeight: 0 }}>
                  {loadingPromotions ? (
                    <div className="text-center p-4 text-muted">
                      <div className="spinner-border spinner-border-sm me-2 text-primary"></div>
                      Đang tải danh sách khuyến mãi...
                    </div>
                  ) : (
                    <Table columns={getPromotionColumns(setPreviewPdfItem, selectedPromotionIds, togglePromotionSelection)} rows={filteredPromotions} compact />
                  )}
                </div>
              }
            />
          )}
          
          {currentStep === 3 && (() => {
            const totalQuotationPages = Math.ceil(filteredQuotations.length / QUOTATIONS_PER_PAGE);
            const startIdx = (quotationPage - 1) * QUOTATIONS_PER_PAGE;
            const endIdx = startIdx + QUOTATIONS_PER_PAGE;
            const paginatedQuotations = filteredQuotations.slice(startIdx, endIdx);

            if (paginatedQuotations.length > 0 && !paginatedQuotations[0].isFullWidth) {
              for (let i = startIdx - 1; i >= 0; i--) {
                if (filteredQuotations[i].isFullWidth) {
                  paginatedQuotations.unshift(filteredQuotations[i]);
                  break;
                }
              }
            }

            return (
              <FullWidthTableLayout
                tableWrapperClassName="flex-grow-1"
                header={
                  <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom bg-white">
                    <div className="d-flex align-items-center gap-3">
                      <div style={{ width: "240px" }}>
                        <FilterSelect
                          value={quotationCategory}
                          onChange={setQuotationCategory}
                          options={[
                            { value: "all", label: "Tất cả nhóm hàng" },
                            ...quotationCategories.map(c => ({ value: c, label: c }))
                          ]}
                        />
                      </div>
                      <div style={{ width: "300px" }}>
                        <SearchInput
                          placeholder="Tìm kiếm sản phẩm..."
                          value={quotationSearch}
                          onChange={setQuotationSearch}
                        />
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <button 
                        className="btn text-white px-3 d-flex align-items-center justify-content-center gap-2 shadow-sm"
                        style={{ height: 34, fontSize: "12.5px", backgroundColor: "#003087", borderColor: "#003087", borderRadius: 8, fontWeight: 700, whiteSpace: "nowrap" }}
                      >
                        <i className="bi bi-plus-lg"></i>
                        <span>Thêm sản phẩm</span>
                      </button>
                      <button 
                        className="btn btn-outline-secondary px-3 d-flex align-items-center justify-content-center gap-2 shadow-sm bg-white"
                        style={{ height: 34, fontSize: "12.5px", borderRadius: 8, fontWeight: 600, whiteSpace: "nowrap" }}
                        onClick={() => setIsPrintPreviewOpen(true)}
                      >
                        <i className="bi bi-printer"></i>
                        <span>In báo giá</span>
                      </button>
                    </div>
                  </div>
                }
                table={
                  <div className="h-100 bg-white overflow-auto d-flex flex-column" style={{ minHeight: 0 }}>
                    {loadingQuotations ? (
                      <div className="text-center p-4 text-muted">
                        <div className="spinner-border spinner-border-sm me-2 text-primary"></div>
                        Đang tải bảng báo giá...
                      </div>
                    ) : (
                      <Table 
                        columns={quotationColumns} 
                        rows={paginatedQuotations} 
                        emptyText="Chưa có dữ liệu bảng báo giá" 
                        compact 
                        onRowClick={(row) => {
                          if (!row.isFullWidth && row.originalData) {
                            setSelectedProduct(row.originalData);
                            setIsProductDetailOpen(true);
                          }
                        }}
                      />
                    )}
                  </div>
                }
                footerClassName="justify-content-between"
                footer={
                  !loadingQuotations && quotations.length > 0 ? (
                    <>
                      <div className="text-muted" style={{ fontSize: "13px" }}>
                        Hiển thị {startIdx + 1}-{Math.min(endIdx, quotations.length)} trong {quotations.length} sản phẩm
                      </div>
                      <Pagination
                        page={quotationPage}
                        totalPages={totalQuotationPages}
                        onChange={setQuotationPage}
                      />
                    </>
                  ) : null
                }
              />
            );
          })()}

          {currentStep === 4 && (
            <div className="row h-100 m-0 w-100">
              <div className="col-5 border-end pe-4 h-100 d-flex flex-column">
                <SectionTitle title="Cẩm nang Kỹ năng mềm" className="mb-3 mt-3" />
                <div className="flex-grow-1 overflow-auto pe-2 custom-scrollbar">
                  <div className="d-flex flex-column gap-3 pb-3">
                    {softSkillsGuide.map((skill) => (
                      <div key={skill.id} className="card border-0 shadow-sm rounded-3 overflow-hidden">
                        <div className="card-header bg-white border-0 px-3 py-2 d-flex align-items-center gap-2">
                          <div className="d-flex align-items-center justify-content-center flex-shrink-0 rounded-circle" style={{ width: "32px", height: "32px", backgroundColor: "color-mix(in srgb, var(--bs-violet) 10%, transparent)", color: "var(--bs-violet)" }}>
                            <i className={`bi ${skill.icon}`}></i>
                          </div>
                          <span className="fw-semibold text-dark" style={{ fontSize: "14px" }}>{skill.id}. {skill.title}</span>
                        </div>
                        <div className="card-body border-top px-3 py-2" style={{ backgroundColor: "#fcfcfc" }}>
                          <p className="text-muted mb-2 fw-medium" style={{ fontSize: "13px" }}>{skill.desc}</p>
                          <ul className="mb-0 text-muted ps-3" style={{ fontSize: "12.5px" }}>
                            {skill.points.map((point, idx) => (
                              <li key={idx} className="mb-1">{point}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="col-7 h-100 d-flex flex-column ps-4">
                <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 w-100 mb-3 mt-3">
                  <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ maxWidth: 600 }}>
                    <div className="flex-grow-1">
                      <SearchInput
                        placeholder="Tìm kiếm câu hỏi..."
                        value={qaSearch}
                        onChange={setQaSearch}
                      />
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    {selectedQaIds.length > 0 && (
                      <button 
                        className="btn btn-outline-danger d-flex align-items-center justify-content-center gap-2 shadow-sm"
                        style={{ height: 34, fontSize: "12.5px", borderRadius: 8, fontWeight: 700 }}
                        onClick={handleDeleteQa}
                        disabled={isDeletingQa}
                        title="Xóa các mục đã chọn"
                      >
                        {isDeletingQa ? <span className="spinner-border spinner-border-sm" role="status"></span> : <i className="bi bi-trash"></i>}
                      </button>
                    )}
                    <button 
                      className="btn text-white px-3 d-flex align-items-center justify-content-center gap-2 shadow-sm"
                      style={{ height: 34, fontSize: "12.5px", backgroundColor: "#003087", borderColor: "#003087", borderRadius: 8, fontWeight: 700, whiteSpace: "nowrap" }}
                      onClick={() => setIsQaModalOpen(true)}
                    >
                      <i className="bi bi-plus-lg"></i>
                      <span>Thêm câu hỏi</span>
                    </button>
                  </div>
                </div>
              <div className="flex-grow-1 overflow-auto px-1 py-1 custom-scrollbar">
                <div className="d-flex flex-column gap-2 pb-3">
                  {loadingQA ? (
                    <div className="text-center p-4 text-muted">
                      <div className="spinner-border spinner-border-sm me-2 text-primary"></div>
                      Đang tải danh sách câu hỏi...
                    </div>
                  ) : (
                    filteredQaList.map((item, index) => (
                      <div id={`qa-item-${item.id}`} key={item.id} className="card border-0 shadow-sm rounded-3 overflow-hidden">
                      <div 
                        className="card-header bg-white border-0 px-3 py-2 d-flex align-items-center justify-content-between"
                        onClick={() => toggleQA(item.id)}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="d-flex align-items-center gap-3 pe-3">
                          <input 
                            type="checkbox" 
                            className="form-check-input mt-0" 
                            checked={selectedQaIds.includes(item.id)}
                            onChange={() => {}}
                            onClick={(e) => toggleQaSelection(item.id, e)}
                          />
                          <span className="badge rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: "26px", height: "26px", backgroundColor: "color-mix(in srgb, var(--bs-violet) 10%, transparent)", color: "var(--bs-violet)" }}>{index + 1}</span>
                          <span className="fw-semibold" style={{ color: "var(--bs-violet)", fontSize: "14px" }}>{item.question}</span>
                        </div>
                        <i className={`bi bi-chevron-${expandedQA === item.id ? 'up' : 'down'} text-muted flex-shrink-0`}></i>
                      </div>
                      {expandedQA === item.id && (
                        <div className="card-body border-top px-3 py-2 text-muted" style={{ backgroundColor: "#f8f9fa", fontSize: "13px", lineHeight: "1.5" }}>
                          <div className="ps-4 ms-2">
                            {item.answer}
                          </div>
                        </div>
                      )}
                    </div>
                  )))}
                </div>
              </div>
            </div>
            </div>
          )}
        </WorkflowCard>
      </div>

      <PolicyOffcanvas 
        open={isPolicyOffcanvasOpen} 
        onClose={() => setIsPolicyOffcanvasOpen(false)} 
        onSuccess={fetchPolicies}
      />

      <PromotionOffcanvas 
        open={isPromotionOffcanvasOpen} 
        onClose={() => setIsPromotionOffcanvasOpen(false)} 
        onSuccess={fetchPromotions}
      />

      <ProductDetailOffcanvas 
        show={isProductDetailOpen} 
        onHide={() => setIsProductDetailOpen(false)} 
        product={selectedProduct}
      />

      <QuotationPrintPreview 
        open={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        quotations={printQuotations}
      />

      <QAAddModal 
        open={isQaModalOpen}
        onClose={() => setIsQaModalOpen(false)}
        onSuccess={fetchQA}
      />

      {/* Modal xem trước PDF */}
      {previewPdfItem && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
          <div 
            className="modal fade show d-block" 
            tabIndex={-1} 
            style={{ zIndex: 1051 }}
            onClick={() => setPreviewPdfItem(null)}
          >
            <div className="modal-dialog modal-fullscreen" onClick={e => e.stopPropagation()}>
              <div className="modal-content overflow-hidden border-0 bg-light">
                <div className="modal-header bg-white border-bottom px-4 py-3">
                  <div className="d-flex align-items-center gap-2">
                    <div className="bg-primary-subtle p-2 rounded-3 text-primary d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }}>
                      <i className="bi bi-file-earmark-pdf-fill fs-5" />
                    </div>
                    <h5 className="modal-title fw-bold mb-0" style={{ fontSize: 16 }}>
                      {previewPdfItem.name}
                    </h5>
                  </div>
                  <button type="button" className="btn-close" onClick={() => setPreviewPdfItem(null)}></button>
                </div>
                <div className="modal-body p-0 d-flex h-100">
                  <div className="flex-grow-1 bg-secondary bg-opacity-10 h-100">
                    {previewPdfItem.pdfUrl ? (
                      <iframe 
                        src={previewPdfItem.pdfUrl} 
                        className="w-100 h-100" 
                        style={{ border: 'none', display: 'block' }} 
                        title="PDF Preview" 
                      />
                    ) : (
                      <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                        Không có văn bản đính kèm
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 bg-white border-start h-100 overflow-auto" style={{ width: "400px" }}>
                    <div className="p-4">
                      <h6 className="fw-bold mb-4 text-primary text-uppercase" style={{ fontSize: "13px", letterSpacing: "0.5px" }}>Tóm tắt văn bản</h6>
                      
                      <div className="mb-4">
                        <label className="text-muted fw-semibold d-block mb-1" style={{ fontSize: "12px" }}>Tên văn bản</label>
                        <div className="fw-medium text-dark">{previewPdfItem.name}</div>
                      </div>

                      {previewPdfItem.docNo && (
                        <div className="mb-4">
                          <label className="text-muted fw-semibold d-block mb-1" style={{ fontSize: "12px" }}>Số văn bản</label>
                          <div className="fw-medium text-dark">{previewPdfItem.docNo}</div>
                        </div>
                      )}

                      <div className="mb-4">
                        <label className="text-muted fw-semibold d-block mb-1" style={{ fontSize: "12px" }}>Trạng thái</label>
                        <span className={`badge bg-${previewPdfItem.status === 'Hiệu lực' ? 'success' : 'secondary'} bg-opacity-10 text-${previewPdfItem.status === 'Hiệu lực' ? 'success' : 'secondary'} px-3 py-2 rounded-pill`}>
                          {previewPdfItem.status}
                        </span>
                      </div>

                      {previewPdfItem.date && (
                        <div className="mb-4">
                          <label className="text-muted fw-semibold d-block mb-1" style={{ fontSize: "12px" }}>Ngày ban hành</label>
                          <div className="fw-medium text-dark">{previewPdfItem.date}</div>
                        </div>
                      )}

                      {previewPdfItem.startDate && (
                        <div className="mb-4">
                          <label className="text-muted fw-semibold d-block mb-1" style={{ fontSize: "12px" }}>Thời gian hiệu lực</label>
                          <div className="fw-medium text-dark">
                            Bắt đầu: {previewPdfItem.startDate}
                            <br/>
                            Kết thúc: {previewPdfItem.endDate}
                          </div>
                        </div>
                      )}

                      <div className="mb-4">
                        <label className="text-muted fw-semibold d-block mb-2" style={{ fontSize: "12px" }}>Nội dung chính</label>
                        <div className="p-3 bg-light rounded-3 text-dark" style={{ fontSize: "13.5px", lineHeight: "1.6" }}>
                          {previewPdfItem.summary}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
