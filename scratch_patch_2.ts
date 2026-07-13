import fs from 'fs';
let content = fs.readFileSync('src/app/api/seajong/sync/route.ts', 'utf-8');

// Return variantProductCount in GET
const getEndpoint = `
export async function GET() {
  try {
    let log = await prisma.seajongSyncLog.findFirst({ orderBy: { startedAt: "desc" } });
    if (log && log.status === "running") {
      const hours = (new Date().getTime() - log.startedAt.getTime()) / (1000 * 60 * 60);
      if (hours > 1) {
        log = await prisma.seajongSyncLog.update({
          where: { id: log.id },
          data: { status: "error", message: "Quá thời gian đồng bộ (timeout tiến trình).", finishedAt: new Date() }
        });
      }
    }
    const productCount  = await prisma.seajongProduct.count();
    const categoryCount = await prisma.seajongCategory.count();
    // Count variants roughly
    const products = await prisma.seajongProduct.findMany({ select: { variationData: true }});
    let variantCount = 0;
    for (const p of products) {
       try {
         if (p.variationData && JSON.parse(p.variationData).length > 0) {
            variantCount++;
         }
       } catch(e){}
    }
    return NextResponse.json({ log, productCount, categoryCount, variantCount });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ log: null, productCount: 0, categoryCount: 0, variantCount: 0, error: msg });
  }
}
`;

content = content.replace(/export async function GET\(\) \{[\s\S]*?return NextResponse\.json[^}]+\}[\s]*catch[\s\S]*?\}[\s]*\}/, getEndpoint);

fs.writeFileSync('src/app/api/seajong/sync/route.ts', content);
