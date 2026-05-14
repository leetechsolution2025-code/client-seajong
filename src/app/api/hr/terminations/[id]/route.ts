import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const body = await req.json();
    const updated = await (prisma as any).terminationRequest.update({
      where: { id: params.id },
      data: body
    });

    // If step is completed and status is Completed, update employee status
    if (updated.status === "Completed") {
      await (prisma as any).employee.update({
        where: { id: updated.employeeId },
        data: { 
          status: updated.type === "RESIGNATION" ? "Resigned" : "Terminated",
          notes: `Chấm dứt hợp đồng ngày ${new Date().toLocaleDateString('vi-VN')}. Lý do: ${updated.reason}`
        }
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH Termination Error:", error);
    return NextResponse.json({ error: "Failed to update termination request" }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await (prisma as any).terminationRequest.delete({
      where: { id: params.id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE Termination Error:", error);
    return NextResponse.json({ error: "Failed to delete termination request" }, { status: 500 });
  }
}
