import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json({ error: "Missing event ID" }, { status: 400 });
    }

    const event = await prisma.marketingEvent.findUnique({
      where: { id },
      include: {
        tasks: {
          orderBy: { sortOrder: "asc" },
        },
        contents: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Không tìm thấy sự kiện" }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (err: any) {
    console.error("Error fetching event detail:", err);
    return NextResponse.json({ 
      error: "Lỗi server",
      details: err.message
    }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json({ error: "Missing event ID" }, { status: 400 });
    }

    // Manually delete related data first to be safe with SQLite
    await prisma.marketingEventTask.deleteMany({
      where: { eventId: id }
    });

    await prisma.marketingEventContent.deleteMany({
      where: { eventId: id }
    });

    const result = await prisma.marketingEvent.deleteMany({
      where: { id },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Không tìm thấy sự kiện để xóa" }, { status: 404 });
    }

    return NextResponse.json({ message: "Xóa sự kiện thành công" });
  } catch (err: any) {
    console.error("Error deleting event:", err);
    return NextResponse.json({ 
      error: "Lỗi khi xóa sự kiện",
      details: err.message
    }, { status: 500 });
  }
}
