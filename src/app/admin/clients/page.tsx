import { prisma } from "@/lib/prisma";
import ClientsContent from "./ClientsContent";

async function getClients() {
  return await prisma.client.findMany({
    where: {
      // Ẩn LEETECH (chủ quản) — không phải khách hàng
      shortName: { not: "leetech" },
    },
    select: {
      id: true, name: true, shortName: true,
      logoUrl: true, address: true, slogan: true, status: true,
      config: true,
      _count: { select: { users: true, modules: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export default async function ClientsPage() {
  const clients = await getClients();

  return <ClientsContent initialClients={clients} />;
}

