const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('MarketingYearlyPlan fields:');
  const dmmf = prisma._baseDmmf || prisma._dmmf;
  if (dmmf) {
    const model = dmmf.datamodel.models.find(m => m.name === 'MarketingYearlyPlan');
    if (model) {
      console.log(model.fields.map(f => f.name).join(', '));
    } else {
      console.log('Model not found');
    }
  } else {
    console.log('DMMF not available');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
