import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function resetPromotions() {
  try {
    const result = await (prisma as any).promotionRequest.updateMany({
      data: {
        status: "RECEIVING",
        hrApproved: false,
        directorApproved: false,
        interviewDate: null,
        interviewerId: null,
        interviewLocation: null,
        interviewNote: null,
        competencyScore: null,
        suitabilityScore: null,
        interviewResult: null
      }
    });
    
    // Xóa các hồ sơ phê duyệt liên quan để sạch dữ liệu
    await (prisma as any).approvalRequest.deleteMany({
      where: {
        entityType: { in: ["PROMOTION", "TRANSFER", "DEMOTION"] }
      }
    });

    console.log(`Đã reset ${result.count} yêu cầu về trạng thái "Mới tiếp nhận" và xóa các hồ sơ phê duyệt liên quan.`);
  } catch (error) {
    console.error("Lỗi khi reset dữ liệu:", error);
  } finally {
    await prisma.$disconnect();
  }
}

resetPromotions();
