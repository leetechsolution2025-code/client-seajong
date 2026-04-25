import { NextRequest, NextResponse } from "next/server";
// Marketing Event API
import { prisma } from "@/lib/prisma";

// GET /api/marketing/events - Lấy danh sách sự kiện
export async function GET(req: NextRequest) {
  try {
    const events = await prisma.marketingEvent.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(events);
  } catch (err: any) {
    console.error("Error fetching events:", err);
    return NextResponse.json({ 
      error: "Lỗi server",
      details: err.message
    }, { status: 500 });
  }
}

// POST /api/marketing/events - Lưu toàn bộ sự kiện, tasks và nội dung hạng mục
export async function POST(req: NextRequest) {
  try {
    const { overview, tasks, contents, managementFeeRate, vatRate } = await req.json();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Upsert thông tin tổng quan sự kiện
      let event;
      const eventData = {
        name: overview.name,
        type: overview.type,
        category: overview.category,
        startDate: (overview.startDate && !isNaN(new Date(overview.startDate).getTime())) ? new Date(overview.startDate) : new Date(),
        endDate: (overview.endDate && !isNaN(new Date(overview.endDate).getTime())) ? new Date(overview.endDate) : new Date(),
        location: overview.location,
        address: overview.address,
        budget: (overview.budget && !isNaN(parseFloat(overview.budget))) ? parseFloat(overview.budget) : 0,
        expectedAttendees: (overview.expectedAttendees && !isNaN(parseInt(overview.expectedAttendees))) ? parseInt(overview.expectedAttendees) : 0,
        pic: overview.pic,
        description: overview.description,
        status: overview.status || "draft",
        isOnline: overview.isOnline === true,
        managementFeeRate: !isNaN(parseFloat(managementFeeRate)) ? parseFloat(managementFeeRate) : 5,
        vatRate: !isNaN(parseFloat(vatRate)) ? parseFloat(vatRate) : 10,
      };

      if (overview.id && overview.id.length > 10) {
        event = await tx.marketingEvent.upsert({
          where: { id: overview.id },
          update: eventData,
          create: {
            id: overview.id,
            code: overview.code || `EVT-${Date.now()}`,
            ...eventData
          },
        });
      } else {
        event = await tx.marketingEvent.create({
          data: {
            code: `EVT-${Date.now()}`,
            ...eventData
          },
        });
      }

      // 2. Xóa sạch các tasks cũ của sự kiện này
      await tx.marketingEventTask.deleteMany({
        where: { eventId: event.id },
      });

      // 3. Tạo lại danh sách tasks mới
      if (tasks && tasks.length > 0) {
        const tasksData = tasks.map((t: any, index: number) => ({
          id: t.id,
          eventId: event.id,
          name: t.name,
          parentId: t.parentId || null,
          pic: t.pic || null,
          startDate: (t.startDate && !isNaN(new Date(t.startDate).getTime())) ? new Date(t.startDate) : null,
          endDate: (t.endDate && !isNaN(new Date(t.endDate).getTime())) ? new Date(t.endDate) : null,
          weeks: typeof t.weeks === 'string' ? t.weeks : JSON.stringify(t.weeks || []),
          content: t.content || null,
          sortOrder: index,
          hasChildren: t.hasChildren || false,
        }));

        await tx.marketingEventTask.createMany({
          data: tasksData,
        });
      }

      // 4. Xóa sạch các nội dung cũ
      await (tx as any).marketingEventContent.deleteMany({
        where: { eventId: event.id },
      });

      // 5. Tạo lại danh sách nội dung mới (Tab 1)
      if (contents && contents.length > 0) {
        // Lưu ý: contents có id tạm thời từ UI, cần cẩn thận nếu id đó không phải UUID hợp lệ
        // Ở đây ta sẽ tạo mới hoàn toàn với id UUID nếu cần, hoặc dùng id từ UI nếu nó là string
        const contentsData = contents.map((c: any, index: number) => ({
          id: typeof c.id === 'string' && c.id.length > 5 ? c.id : undefined, // Chỉ dùng id cũ nếu có vẻ là UUID
          eventId: event.id,
          item: c.item,
          description: c.description || null,
          unit: c.unit || null,
          price: !isNaN(parseFloat(c.price)) ? parseFloat(c.price) : 0,
          quantity: !isNaN(parseFloat(c.quantity)) ? parseFloat(c.quantity) : 0,
          level: c.level || 0,
          parentId: c.parentId || null,
          sortOrder: index,
        }));

        await (tx as any).marketingEventContent.createMany({
          data: contentsData,
        });
      }

      return event;
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Error saving event:", err);
    return NextResponse.json({ 
      error: "Lỗi lưu sự kiện vào cơ sở dữ liệu", 
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}
