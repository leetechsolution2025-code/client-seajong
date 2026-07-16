export type DefectSource = 'INTERNAL' | 'WARRANTY';
export type DefectStatus = 
  | 'NEW'
  | 'TECH_EVALUATING'
  | 'WAITING_APPROVAL'
  | 'PROCESSING'
  | 'WAITING_INVENTORY'
  | 'WAITING_RETURN'
  | 'SHIPPING_REPLACEMENT'
  | 'RESOLVED_REMOTE'
  | 'COMPLETED'
  | 'CANCELED';

export interface DefectRecord {
  id: string;
  code: string;
  source: DefectSource;
  status: DefectStatus;
  productName: string;
  productCode: string;
  quantity: number;
  description: string;
  mediaUrls: string[];
  
  // Thông tin bảo hành
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  purchaseDate?: string;
  
  // Kỹ thuật
  isRepairable?: boolean;
  repairPlan?: string;
  materialCosts?: number;
  
  createdAt: string;
  reporterName: string;
  reporterDepartment: string;
  assignedTo?: string; // Tên role/người đang phụ trách bước hiện tại
}

export const MOCK_DEFECTS: DefectRecord[] = [
  {
    id: "DEF-1001",
    code: "ERR-20260716-01",
    source: "INTERNAL",
    status: "TECH_EVALUATING",
    productName: "Sen Cây Nóng Lạnh Cao Cấp",
    productCode: "SJ-8012",
    quantity: 5,
    description: "Lớp mạ bị xước, van không kín nước",
    mediaUrls: [
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&q=80",
      "https://www.w3schools.com/html/mov_bbb.mp4"
    ],
    createdAt: "2026-07-16T08:00:00",
    reporterName: "Nguyễn Văn A",
    reporterDepartment: "Bộ phận QC",
    assignedTo: "Bộ phận Kỹ thuật"
  },
  {
    id: "DEF-1002",
    code: "WR-20260716-02",
    source: "WARRANTY",
    status: "NEW",
    productName: "Vòi Lavabo Nóng Lạnh",
    productCode: "SJ-1002",
    quantity: 1,
    description: "Nước rỉ ở phần tay gạt khi gạt sang nóng",
    mediaUrls: [],
    createdAt: "2026-07-16T09:30:00",
    customerName: "Trần Thị B",
    customerPhone: "0987654321",
    customerAddress: "Quận 1, TP.HCM",
    purchaseDate: "2026-01-10",
    reporterName: "Lê Thị C",
    reporterDepartment: "Bộ phận CSKH",
    assignedTo: "Bộ phận Kỹ thuật"
  },
  {
    id: "DEF-1003",
    code: "WR-20260715-05",
    source: "WARRANTY",
    status: "WAITING_APPROVAL",
    productName: "Bồn Cầu Thông Minh 1 Khối",
    productCode: "SJ-BC99",
    quantity: 1,
    description: "Nắp đóng êm bị hỏng, nút nhấn kẹt",
    mediaUrls: ["https://placehold.co/400x300?text=Nap+Bc"],
    createdAt: "2026-07-15T14:20:00",
    customerName: "Lê Hoàng D",
    customerPhone: "0909123456",
    customerAddress: "Hà Đông, Hà Nội",
    purchaseDate: "2025-11-20",
    isRepairable: true,
    repairPlan: "Thay thế nắp đóng êm mới và bộ xả",
    materialCosts: 450000,
    reporterName: "Phạm E",
    reporterDepartment: "Bộ phận Bán hàng",
    assignedTo: "Ban Giám đốc"
  },
  {
    id: "DEF-1004",
    code: "ERR-20260714-03",
    source: "INTERNAL",
    status: "COMPLETED",
    productName: "Vòi rửa chén dây rút",
    productCode: "SJ-6055",
    quantity: 12,
    description: "Dây rút bị xoắn lõi trong",
    mediaUrls: [],
    createdAt: "2026-07-14T10:00:00",
    isRepairable: false,
    repairPlan: "Rã xác, thu hồi đầu vòi và thân đồng",
    reporterName: "Trần F",
    reporterDepartment: "Bộ phận QC",
    assignedTo: "Hoàn tất"
  }
];

export const MOCK_ROLES = [
  { id: 'CSKH', name: 'CSKH / Bán hàng' },
  { id: 'QC', name: 'QC / Quản lý chất lượng' },
  { id: 'TECH', name: 'Kỹ thuật' },
  { id: 'MANAGER', name: 'Ban Giám đốc' },
  { id: 'INVENTORY', name: 'Kho' },
  { id: 'LOGISTICS', name: 'Vận chuyển' },
];
