/**
 * Utility functions for Partner/Lead classification and calculations.
 */

export interface LeadClassificationInput {
  role?: string | null;
  deploymentPlan?: string | null;
  collabNeeds?: string | null;
  otherRequirements?: string | null;
  painPoints?: string | null;
  attitude?: string | null;
}

/**
 * Automatically calculates the classification stars for a lead based on care details.
 * - Nóng (5 stars): Timeline <= 30 days + has decision-making power ("Ông chủ") + clear collab needs.
 * - Ấm (3-4 stars): Has potential but timeline is not finalized / still considering.
 * - Lạnh (1-2 stars): Wrong business model / only asking for price / has no decision power.
 */
export const calculateLeadStars = (data: LeadClassificationInput): number => {
  const role = data.role || "";
  const deploymentPlan = data.deploymentPlan || "";
  const collabNeeds = data.collabNeeds || "";
  const otherRequirements = data.otherRequirements || "";
  const painPoints = data.painPoints || "";
  const attitude = data.attitude || "";

  // 1. Quyền quyết định (Ông chủ / Bà chủ)
  const hasDecisionPower = role === "Ông chủ" || role === "Bà chủ";

  // 2. Timeline <= 30 ngày (urgent)
  const isShortTimeline = /30|ngay|sớm|tức|1\s*tháng|immediate/i.test(deploymentPlan);

  // 3. Có nhu cầu rõ (độ dài > 10 ký tự)
  const hasClearNeeds = collabNeeds.trim().length > 10;

  // 4. Dấu hiệu tiêu cực (không đúng mô hình, chỉ hỏi giá, từ chối, không quan tâm...)
  const hasNegativeSignals = /hỏi\s*giá|không\s*đúng\s*mô\s*hình|không\s*quan\s*tâm|từ\s*chối|không\s*hợp\s*tác/i.test(
    collabNeeds + " " + otherRequirements + " " + painPoints
  );

  // Áp dụng bộ quy tắc phân loại
  if (role === "Nhân viên" || hasNegativeSignals) {
    // Không có quyền quyết hoặc có tín hiệu tiêu cực -> Lạnh (1-2 sao)
    return hasNegativeSignals ? 1 : 2;
  }

  if (hasDecisionPower && isShortTimeline && hasClearNeeds) {
    // Nóng (5 sao)
    return 5;
  }

  // Ấm (3-4 sao)
  if (hasDecisionPower || role === "Quản lý") {
    if (isShortTimeline || hasClearNeeds) {
      return 4;
    }
    return 3;
  }

  return 3;
};
