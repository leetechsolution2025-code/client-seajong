import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const mfps = await prisma.manufacturedProduct.findMany();
  
  let stats: Record<string, number> = {
    "Vòi nước": 0,
    "Sen tắm": 0,
    "Phụ kiện phòng tắm": 0,
    "Thiết bị khác": 0,
    "Vòi xịt vệ sinh": 0,
    "Bàn đá , Tủ chậu , Gương": 0,
    "Chậu rửa bát , Chậu lavabo": 0,
    "Linh kiện , Vật tư lắp ráp rời": 0,
  };

  for (const item of mfps) {
    const name = item.name.toLowerCase();
    
    if (name.includes("xịt")) {
      stats["Vòi xịt vệ sinh"]++;
    } else if (name.includes("vòi") || name.includes("củ")) {
      stats["Vòi nước"]++;
    } else if (name.includes("sen")) {
      stats["Sen tắm"]++;
    } else if (name.includes("phụ kiện") || name.includes("lô giấy") || name.includes("vắt khăn") || name.includes("kệ") || name.includes("thoát sàn")) {
      stats["Phụ kiện phòng tắm"]++;
    } else if (name.includes("bàn đá") || name.includes("tủ chậu") || name.includes("gương")) {
      stats["Bàn đá , Tủ chậu , Gương"]++;
    } else if (name.includes("chậu") || name.includes("lavabo")) {
      stats["Chậu rửa bát , Chậu lavabo"]++;
    } else if (name.includes("linh kiện") || name.includes("vật tư") || name.includes("dây") || name.includes("chân") || name.includes("ốc") || name.includes("gioăng") || name.includes("lõi") || name.includes("cần") || name.includes("bát") || name.includes("cài") || name.includes("núm")) {
      stats["Linh kiện , Vật tư lắp ráp rời"]++;
    } else {
      stats["Thiết bị khác"]++;
    }
  }

  console.log("Stats:");
  for (const [k, v] of Object.entries(stats)) {
    console.log(`${k}: ${v}`);
  }
}

main().finally(() => prisma.$disconnect());
