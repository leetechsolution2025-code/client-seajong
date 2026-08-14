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
  bomCode?: string;
  
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

// MOCK_DEFECTS removed - using actual DB data

export const MOCK_ROLES = [
  { id: 'CSKH', name: 'CSKH / Bán hàng' },
  { id: 'QC', name: 'QC / Quản lý chất lượng' },
  { id: 'TECH', name: 'Kỹ thuật' },
  { id: 'MANAGER', name: 'Ban Giám đốc' },
  { id: 'INVENTORY', name: 'Kho' },
  { id: 'LOGISTICS', name: 'Vận chuyển' },
];
