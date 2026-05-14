import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
    const products = await prisma.product.findMany({
        select: { id: true, code: true, productUrl: true }
    });
    console.log(JSON.stringify(products));
}
main().catch(console.error).finally(() => prisma.$disconnect());
