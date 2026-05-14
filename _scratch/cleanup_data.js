const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting cleanup of HR requests and approvals...");

  try {
    // 1. Approval Center data
    const comments = await prisma.approvalComment.deleteMany({});
    console.log(`Deleted ${comments.count} approval comments.`);
    
    const approvals = await prisma.approvalRequest.deleteMany({});
    console.log(`Deleted ${approvals.count} approval requests.`);

    // 2. Notifications
    const recipients = await prisma.notificationRecipient.deleteMany({});
    console.log(`Deleted ${recipients.count} notification recipients.`);
    
    const notifications = await prisma.notification.deleteMany({});
    console.log(`Deleted ${notifications.count} notifications.`);

    // 3. Salary Adjustments
    if (prisma.salaryAdjustmentRequest) {
      const salary = await prisma.salaryAdjustmentRequest.deleteMany({});
      console.log(`Deleted ${salary.count} salary adjustment requests.`);
    }

    // 4. Promotions & Transfers
    if (prisma.promotionRequest) {
      const promotions = await prisma.promotionRequest.deleteMany({});
      console.log(`Deleted ${promotions.count} promotion requests.`);
    }

    // 5. Training
    if (prisma.trainingCourse) {
      const courses = await prisma.trainingCourse.deleteMany({});
      console.log(`Deleted ${courses.count} training courses.`);
    }
    if (prisma.trainingPlan) {
      const plans = await prisma.trainingPlan.deleteMany({});
      console.log(`Deleted ${plans.count} training plans.`);
    }
    if (prisma.trainingRequest) {
      const trainingReqs = await prisma.trainingRequest.deleteMany({});
      console.log(`Deleted ${trainingReqs.count} training requests.`);
    }

    // 6. Recruitment
    if (prisma.candidate) {
      const candidates = await prisma.candidate.deleteMany({});
      console.log(`Deleted ${candidates.count} candidates.`);
    }
    if (prisma.recruitmentRequest) {
      const recruitment = await prisma.recruitmentRequest.deleteMany({});
      console.log(`Deleted ${recruitment.count} recruitment requests.`);
    }

    console.log("✅ Cleanup completed successfully!");
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
