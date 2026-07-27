const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.saleOrder.findMany({
    include: { customer: { select: { id: true, name: true, address: true, hanMucCongNo: true } } },
  });
  const customerIds = Array.from(new Set(items.map(item => item.customerId).filter(Boolean)));
  console.log("customerIds:", customerIds);
  const marketingLeads = await prisma.marketingLead.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, formValues: true }
  });
  console.log("marketingLeads:", marketingLeads);
  const leadAddressMap = new Map();
  for (const lead of marketingLeads) {
    if (lead.formValues) {
      try {
        const parsed = JSON.parse(lead.formValues);
        if (parsed.businessAddress) {
          leadAddressMap.set(lead.id, parsed.businessAddress);
        } else if (parsed.address) {
          leadAddressMap.set(lead.id, parsed.address);
        }
      } catch (e) {
        console.error("Parse error:", e);
      }
    }
  }
  console.log("leadAddressMap:", leadAddressMap);
}
main().then(() => prisma.$disconnect());
