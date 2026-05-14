
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning up recruitment data...");

  // Delete InterviewScorecards first (dependent on Candidate)
  const scDeleted = await prisma.interviewScorecard.deleteMany({});
  console.log(`Deleted ${scDeleted.count} scorecards.`);

  // Delete Candidates
  const cDeleted = await prisma.candidate.deleteMany({});
  console.log(`Deleted ${cDeleted.count} candidates.`);

  // Reset RecruitmentRequest statuses
  const rUpdated = await prisma.recruitmentRequest.updateMany({
    data: { status: "Approved" }
  });
  console.log(`Reset status for ${rUpdated.count} recruitment requests.`);

  console.log("Cleanup complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
