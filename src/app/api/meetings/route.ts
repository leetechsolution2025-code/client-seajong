import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processActionItems } from "@/lib/meetings-tasks";

export const dynamic = "force-dynamic"; // Trigger TS server reload


export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") || "all"; // all, upcoming, past
  const search = searchParams.get("search") || "";

  const now = new Date();

  try {
    let meetings = await prisma.meeting.findMany({
      where: { creatorId: userId },
      orderBy: { startTime: "desc" },
    });

    // 1. Filter by search query (text and date patterns)
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      meetings = meetings.filter(m => {
        const titleMatch = m.title?.toLowerCase().includes(q);
        const descMatch = m.description?.toLowerCase().includes(q);
        const locMatch = m.location?.toLowerCase().includes(q);
        if (titleMatch || descMatch || locMatch) return true;

        const d = new Date(m.startTime);
        if (isNaN(d.getTime())) return false;

        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = String(d.getFullYear());

        const ddmmYYYY = `${dd}${mm}${yyyy}`;
        const ddmmyy = `${dd}${mm}${yyyy.slice(-2)}`;

        // Match ddmmYYYY or ddmmyy
        if (q === ddmmYYYY || q === ddmmyy) return true;
        // Match YYYY exactly (if query is exactly 4 digits, e.g. "2026")
        if (/^\d{4}$/.test(q) && q === yyyy) return true;
        // Match mm (if query is exactly 2 digits, e.g. "06")
        if (/^\d{2}$/.test(q) && q === mm) return true;
        // Match dd (if query is exactly 2 digits, e.g. "03")
        if (/^\d{2}$/.test(q) && q === dd) return true;

        // Support slash/dash representations: "dd/mm", "dd/mm/yyyy", etc.
        const dateString = `${dd}/${mm}/${yyyy}`;
        if (dateString.includes(q)) return true;

        return false;
      });
    }

    // 2. Filter by status tab
    if (filter === "upcoming") {
      meetings = meetings.filter(m => new Date(m.startTime) >= now);
    } else if (filter === "past") {
      meetings = meetings.filter(m => new Date(m.endTime) <= now);
    }

    return NextResponse.json(meetings);
  } catch (error) {
    console.error("[GET /api/meetings] Error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const clientId = (session.user as any).clientId || null;

  try {
    const body = await req.json();
    const { title, description, startTime, endTime, location, attendees, minutes, actionItems, files, host, secretary } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Tiêu đề cuộc họp không được để trống" }, { status: 400 });
    }
    if (!startTime || !endTime) {
      return NextResponse.json({ error: "Thời gian bắt đầu và kết thúc không được để trống" }, { status: 400 });
    }

    const meeting = await prisma.meeting.create({
      data: {
        title: title.trim(),
        description: description || null,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location: location || null,
        creatorId: userId,
        attendees: JSON.stringify(attendees || []),
        minutes: minutes || null,
        actionItems: JSON.stringify(actionItems || []),
        files: JSON.stringify(files || []),
        host: host || null,
        secretary: secretary || null,
        clientId,
      },
    });

    try {
      const items = Array.isArray(actionItems) ? actionItems : [];
      await processActionItems(meeting.id, meeting.title, items, [], userId);
    } catch (err) {
      console.error("[POST /api/meetings] Error processing action items:", err);
    }

    return NextResponse.json(meeting, { status: 201 });
  } catch (error) {
    console.error("[POST /api/meetings] Error:", error);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}
