import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processActionItems } from "@/lib/meetings-tasks"; // Trigger TS server reload


export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const meeting = await prisma.meeting.findUnique({
      where: { id },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Không tìm thấy cuộc họp" }, { status: 404 });
    }

    if (meeting.creatorId !== userId) {
      return NextResponse.json({ error: "Bạn không có quyền truy cập cuộc họp này" }, { status: 403 });
    }

    // Resolve attached files if any
    let resolvedFiles: any[] = [];
    if (meeting.files) {
      const fileIds = JSON.parse(meeting.files) as string[];
      if (fileIds.length > 0) {
        resolvedFiles = await prisma.mediaAsset.findMany({
          where: { id: { in: fileIds } },
        });
      }
    }

    return NextResponse.json({
      ...meeting,
      resolvedFiles,
    });
  } catch (error) {
    console.error("[GET /api/meetings/[id]] Error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const meeting = await prisma.meeting.findUnique({
      where: { id },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Không tìm thấy cuộc họp" }, { status: 404 });
    }

    if (meeting.creatorId !== userId) {
      return NextResponse.json({ error: "Bạn không có quyền chỉnh sửa cuộc họp này" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, startTime, endTime, location, attendees, minutes, actionItems, files, host, secretary } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Tiêu đề cuộc họp không được để trống" }, { status: 400 });
    }
    if (!startTime || !endTime) {
      return NextResponse.json({ error: "Thời gian bắt đầu và kết thúc không được để trống" }, { status: 400 });
    }

    let oldItems: any[] = [];
    try {
      oldItems = JSON.parse(meeting.actionItems || "[]");
    } catch (e) {}

    const newItems = Array.isArray(actionItems) ? actionItems : [];

    const updatedMeeting = await prisma.meeting.update({
      where: { id },
      data: {
        title: title.trim(),
        description: description || null,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location: location || null,
        attendees: JSON.stringify(attendees || []),
        minutes: minutes || null,
        actionItems: JSON.stringify(actionItems || []),
        files: JSON.stringify(files || []),
        host: host || null,
        secretary: secretary || null,
      },
    });

    try {
      await processActionItems(id, title.trim(), newItems, oldItems, userId);
    } catch (err) {
      console.error("[PUT /api/meetings/[id]] Error processing action items:", err);
    }

    return NextResponse.json(updatedMeeting);
  } catch (error) {
    console.error("[PUT /api/meetings/[id]] Error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const meeting = await prisma.meeting.findUnique({
      where: { id },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Không tìm thấy cuộc họp" }, { status: 404 });
    }

    if (meeting.creatorId !== userId) {
      return NextResponse.json({ error: "Bạn không có quyền xóa cuộc họp này" }, { status: 403 });
    }

    await prisma.meeting.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Xóa cuộc họp thành công" });
  } catch (error) {
    console.error("[DELETE /api/meetings/[id]] Error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}
