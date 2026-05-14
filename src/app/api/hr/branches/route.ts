import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = session.user?.clientId ?? null;

  // SUPERADMIN (clientId = null) → không thuộc về client nào → không có chi nhánh
  if (!clientId) {
    return NextResponse.json({ branches: [] });
  }

  const branches = await prisma.branch.findMany({
    where: {
      status:   "active",
      clientId: clientId,   // strict — chỉ lấy branch đúng client
    },
    orderBy: { sortOrder: "asc" },
    select: { id: true, code: true, name: true, shortName: true },
  });

  return NextResponse.json({ branches });
}

