import { prisma } from "../src/lib/prisma";

async function checkLeads() {
  const leads = await (prisma as any).marketingLead.findMany({
    include: { campaign: true }
  });
  const campaigns = await (prisma as any).marketingCampaign.findMany();
  
  console.log("Total Leads in DB:", leads.length);
  console.log("Total Campaigns in DB:", campaigns.length);
  
  if (leads.length > 0) {
    console.log("Last lead:", leads[0]);
  }
}

checkLeads();
