import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, note } = body;

    const updated = await (prisma as any).trainingRequest.update({
      where: { id },
      data: {
        status,
        description: note ? { set: note } : undefined, // Optional: update note
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update Training Request Error:", error);
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await (prisma as any).trainingRequest.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete request" }, { status: 500 });
  }
}
