import { Prisma } from '@prisma/client'

async function main() {
  const dmmf = (Prisma as any).dmmf;
  const model = dmmf.datamodel.models.find((m: any) => m.name === 'PromotionRequest');
  console.log('Model fields:', model.fields.map((f: any) => f.name));
  
  const includeFields = model.fields.filter((f: any) => f.kind === 'object').map((f: any) => f.name);
  console.log('Includeable fields:', includeFields);
}

main().catch(console.error);
