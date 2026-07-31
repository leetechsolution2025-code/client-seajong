import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Delete the logistics ticket
    // Cascade delete should handle LogisticsTicketItem if schema is set up,
    // otherwise we delete items first.
    await (prisma as any).logisticsTicketItem.deleteMany({
      where: { ticketId: id }
    });

    await (prisma as any).logisticsTicket.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
