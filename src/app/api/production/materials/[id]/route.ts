import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const { giaBan } = body;

    const updated = await prisma.materialItem.update({
      where: { id },
      data: {
        giaBan: parseFloat(giaBan ?? 0)
      }
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    console.error("[PUT /materials/[id]]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
