import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { branchId, startIp, endIp, note } = body;

    // Tự động đảm bảo Workplace tồn tại trước khi thêm Subnet
    const existing = await (prisma as any).branch.findUnique({ where: { id: branchId } });
    if (!existing) {
      const cat = await (prisma as any).category.findUnique({ where: { id: branchId } });
      await (prisma as any).branch.create({
        data: {
          id: branchId,
          code: cat?.code || `WP-${Date.now()}`,
          name: cat?.name || "Nơi làm việc",
          clientId: session.user.clientId || "default"
        }
      });
    }

    const subnet = await (prisma as any).branchSubnet.create({
      data: {
        branchId,
        startIp,
        endIp,
        note,
      },
    });

    return NextResponse.json(subnet);
  } catch (error: any) {
    console.error("POST Subnet Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    await (prisma as any).branchSubnet.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE Subnet Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
