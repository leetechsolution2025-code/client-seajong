import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const items = await prisma.materialItem.findMany({
    where: { price: 0 }
  });

  console.log(`Found ${items.length} items without price.`);

  for (const item of items) {
    const name = item.name.toLowerCase();
    let price = 10000; // default 10k

    if (name.includes("thân sen")) price = Math.floor(Math.random() * (300000 - 150000 + 1) + 150000);
    else if (name.includes("thân vòi")) price = Math.floor(Math.random() * (250000 - 100000 + 1) + 100000);
    else if (name.includes("lõi sen")) price = 30000;
    else if (name.includes("tay cầm")) price = 35000;
    else if (name.includes("núm rút")) price = 15000;
    else if (name.includes("chân vòi")) price = 40000;
    else if (name.includes("ty sen")) price = 50000;
    else if (name.includes("chụp đồng")) price = 25000;
    else if (name.includes("chụp nhựa")) price = 10000;
    else if (name.includes("miệng phun")) price = 15000;
    else if (name.includes("ốc đồng")) price = 20000;
    else if (name.includes("ốc ngoài")) price = 15000;
    else if (name.includes("ốc nhựa")) price = 10000;
    else if (name.includes("chân đế")) price = 12000;
    else if (name.includes("dây cấp")) price = 30000;
    else if (name.includes("đón ty")) price = 5000;
    else if (name.includes("túi vải")) price = 3000;
    else price = 25000;

    // Round to nearest 1,000
    price = Math.round(price / 1000) * 1000;

    await prisma.materialItem.update({
      where: { id: item.id },
      data: { price }
    });
    console.log(`Updated ${item.name} -> ${price} VND`);
  }

  console.log("Done updating prices.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
