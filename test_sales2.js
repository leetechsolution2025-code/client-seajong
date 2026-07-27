const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.saleOrder.findMany({
    include: { customer: { select: { id: true, name: true, address: true, hanMucCongNo: true } } },
  });
  const customerIds = Array.from(new Set(items.map(item => item.customerId).filter(Boolean)));
  const marketingLeads = await prisma.marketingLead.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, formValues: true }
  });
  const leadAddressMap = new Map();
  for (const lead of marketingLeads) {
    if (lead.formValues) {
      try {
        const parsed = JSON.parse(lead.formValues);
        const address = parsed.bbB_DiaChi || parsed.businessAddress || parsed.address || 
                        (parsed.careHistories && parsed.careHistories.length > 0 ? parsed.careHistories[0].businessAddress : null);
        if (address) {
          leadAddressMap.set(lead.id, address);
        }
      } catch (e) {
        console.error("Parse error:", e);
      }
    }
  }
  console.log("leadAddressMap:", leadAddressMap);
}
main().then(() => prisma.$disconnect());
