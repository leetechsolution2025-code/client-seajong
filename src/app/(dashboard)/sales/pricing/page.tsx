"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ModernStepper, ModernStepItem } from "@/components/ui/ModernStepper";
import { WorkflowCard } from "@/components/ui/WorkflowCard";
import { Table, TableColumn } from "@/components/ui/Table";
import { SectionTitle } from "@/components/ui/SectionTitle";

const STEPS: ModernStepItem[] = [
  { num: 1, id: "policy", title: "Chính sách bán hàng", desc: "Thiết lập chính sách", icon: "bi-file-earmark-text" },
  { num: 2, id: "promotion", title: "Chương trình khuyến mãi", desc: "Quản lý khuyến mãi", icon: "bi-gift" },
  { num: 3, id: "soft_skills", title: "Kỹ năng mềm", desc: "Đào tạo và tài liệu", icon: "bi-person-workspace" }
];

interface PolicyItem {
  id: number;
  name: string;
  docNo?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  summary: string;
  status: string;
}

const policyColumns: TableColumn<PolicyItem>[] = [
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
  { header: "", width: "50px", render: () => (
    <button className="btn btn-sm btn-light text-muted border-0"><i className="bi bi-three-dots-vertical"></i></button>
  )}
];

const mockPolicies: PolicyItem[] = [
  { id: 1, name: "Chính sách chiết khấu Quý 3/2026", docNo: "125/2026/CS-SJ", date: "01/07/2026", summary: "Áp dụng mức chiết khấu mới cho đại lý cấp 1 và cấp 2", status: "Hiệu lực" },
  { id: 2, name: "Quy định hỗ trợ bảng biển", docNo: "112/2026/QĐ-SJ", date: "15/06/2026", summary: "Hỗ trợ 50% chi phí thi công bảng biển chuẩn nhận diện", status: "Hiệu lực" },
  { id: 3, name: "Chính sách đổi trả hàng hóa", date: "01/01/2026", summary: "Quy định điều kiện và thời gian đổi trả hàng lỗi", status: "Hết hiệu lực" }
];

const promotionColumns: TableColumn<PolicyItem>[] = [
  { header: "STT", width: "60px", render: (_: PolicyItem, index: number) => index + 1 },
  { header: "Tên văn bản", render: (row: PolicyItem) => (
    <div>
      <div className="fw-semibold" style={{ color: "var(--bs-violet)" }}>{row.name}</div>
      {row.docNo && <div className="text-muted" style={{ fontSize: "12px" }}>{row.docNo}</div>}
    </div>
  ) },
  { header: "Thời gian hiệu lực", render: (row: PolicyItem) => (
    <div style={{ fontSize: "14px" }}>
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
  { header: "", width: "50px", render: () => (
    <button className="btn btn-sm btn-light text-muted border-0"><i className="bi bi-three-dots-vertical"></i></button>
  )}
];

const mockPromotions: PolicyItem[] = [
  { id: 1, name: "Chương trình Mùa Hè Sôi Động", docNo: "015/2026/CTKM-SJ", startDate: "10/05/2026", endDate: "10/08/2026", summary: "Tặng ngay 1 phần quà khi mua 10 bộ sen vòi", status: "Hiệu lực" },
  { id: 2, name: "Khuyến mãi ra mắt sản phẩm mới", docNo: "020/2026/CTKM-SJ", startDate: "01/08/2026", endDate: "31/12/2026", summary: "Chiết khấu thêm 5% cho đại lý", status: "Hiệu lực" }
];

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

  // Filter states
  const [policySearch, setPolicySearch] = useState("");
  const [policyStatus, setPolicyStatus] = useState("all");
  
  const [promotionSearch, setPromotionSearch] = useState("");
  const [promotionStatus, setPromotionStatus] = useState("all");
  
  const [qaSearch, setQaSearch] = useState("");

  useEffect(() => {
    fetch('/api/soft-skills-qa')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setQaList(data);
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
  }, []);

  const toggleQA = (id: number) => {
    setExpandedQA(prev => prev === id ? null : id);
  };

  // Derived filtered data
  const filteredPolicies = mockPolicies.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(policySearch.toLowerCase()) || 
                          p.docNo?.toLowerCase().includes(policySearch.toLowerCase());
    const matchesStatus = policyStatus === "all" || p.status === (policyStatus === "active" ? "Hiệu lực" : "Hết hiệu lực");
    return matchesSearch && matchesStatus;
  });

  const filteredPromotions = mockPromotions.filter(p => {
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
      
      <div className="flex-grow-1 px-3 px-md-4 pb-4 pt-2 d-flex flex-column" style={{ background: "color-mix(in srgb, var(--muted) 40%, transparent)", minHeight: 0 }}>
        <WorkflowCard
          contentPadding="px-4 pb-4 pt-1"
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
            <div className="d-flex flex-column h-100">
              <div className="d-flex justify-content-between align-items-center mb-2 mt-2 gap-2 flex-wrap">
                <div className="d-flex align-items-center gap-2">
                  <select 
                    className="form-select form-select-sm text-muted" 
                    style={{ width: "160px" }}
                    value={policyStatus}
                    onChange={(e) => setPolicyStatus(e.target.value)}
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="active">Hiệu lực</option>
                    <option value="inactive">Hết hiệu lực</option>
                  </select>
                  <div className="input-group input-group-sm" style={{ width: "250px" }}>
                    <span className="input-group-text bg-white border-end-0 text-muted">
                      <i className="bi bi-search"></i>
                    </span>
                    <input 
                      type="text" 
                      className="form-control border-start-0 ps-0" 
                      placeholder="Tìm kiếm văn bản..." 
                      value={policySearch}
                      onChange={(e) => setPolicySearch(e.target.value)}
                    />
                  </div>
                </div>
                <button className="btn btn-primary btn-sm px-3 flex-shrink-0">
                  <i className="bi bi-plus-lg me-1"></i> Thêm chính sách
                </button>
              </div>
              <div className="flex-grow-1 overflow-auto bg-white">
                <Table columns={policyColumns} rows={filteredPolicies} compact />
              </div>
            </div>
          )}
          
          {currentStep === 2 && (
            <div className="d-flex flex-column h-100">
              <div className="d-flex justify-content-between align-items-center mb-2 mt-2 gap-2 flex-wrap">
                <div className="d-flex align-items-center gap-2">
                  <select 
                    className="form-select form-select-sm text-muted" 
                    style={{ width: "160px" }}
                    value={promotionStatus}
                    onChange={(e) => setPromotionStatus(e.target.value)}
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="active">Hiệu lực</option>
                    <option value="inactive">Hết hiệu lực</option>
                  </select>
                  <div className="input-group input-group-sm" style={{ width: "250px" }}>
                    <span className="input-group-text bg-white border-end-0 text-muted">
                      <i className="bi bi-search"></i>
                    </span>
                    <input 
                      type="text" 
                      className="form-control border-start-0 ps-0" 
                      placeholder="Tìm kiếm chương trình..." 
                      value={promotionSearch}
                      onChange={(e) => setPromotionSearch(e.target.value)}
                    />
                  </div>
                </div>
                <button className="btn btn-primary btn-sm px-3 flex-shrink-0">
                  <i className="bi bi-plus-lg me-1"></i> Thêm khuyến mãi
                </button>
              </div>
              <div className="flex-grow-1 overflow-auto bg-white">
                <Table columns={promotionColumns} rows={filteredPromotions} compact />
              </div>
            </div>
          )}
          
          {currentStep === 3 && (
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
                <div className="d-flex justify-content-between align-items-center mb-3 mt-1 gap-2 flex-wrap">
                  <div className="d-flex align-items-center gap-2 flex-grow-1">
                    <div className="input-group input-group-sm w-100">
                      <span className="input-group-text bg-white border-end-0 text-muted">
                        <i className="bi bi-search"></i>
                      </span>
                      <input 
                        type="text" 
                        className="form-control border-start-0 ps-0" 
                        placeholder="Tìm kiếm câu hỏi..." 
                        value={qaSearch}
                        onChange={(e) => setQaSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  <button className="btn btn-primary btn-sm px-3 flex-shrink-0">
                    <i className="bi bi-plus-lg me-1"></i> Thêm câu hỏi
                  </button>
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
                      <div key={item.id} className="card border-0 shadow-sm rounded-3 overflow-hidden">
                      <div 
                        className="card-header bg-white border-0 px-3 py-2 d-flex align-items-center justify-content-between"
                        onClick={() => toggleQA(item.id)}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="d-flex align-items-center gap-3 pe-3">
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
    </div>
  );
}
