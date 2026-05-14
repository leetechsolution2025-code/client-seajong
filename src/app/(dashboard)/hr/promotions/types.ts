export type PromotionType = "TRANSFER" | "PROMOTION" | "DEMOTION";
export type PromotionStatus = "RECEIVING" | "INTERVIEWING" | "CONCLUSION";

export interface PromotionRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  avatar?: string;
  type: PromotionType;
  currentDept: string;
  currentPos: string;
  targetDept: string;
  targetPos: string;
  reason: string;
  status: PromotionStatus;
  createdAt: string;
  requesterName?: string;
  requesterPos?: string;
  
  // Step 1: Receipt
  hrApproved?: boolean;
  hrNote?: string;
  
  // Step 2: Interview
  interviewDate?: string;
  interviewLocation?: string;
  interviewerId?: string;
  interviewerName?: string;
  interviewResult?: 'PASS' | 'FAIL';
  interviewScore?: number;
  interviewNote?: string;
  suitabilityScore?: number; // Mức độ phù hợp
  competencyScore?: number; // Năng lực
  
  // Step 3: Conclusion
  directorApproved?: boolean;
  directorNote?: string;
  decisionNumber?: string;
  effectiveDate?: string;
}

