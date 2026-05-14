import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/hr/birthday-notify
// Hệ thống tự gửi lời chúc sinh nhật cho toàn bộ nhân viên có sinh nhật trong tháng hiện tại.
// Mỗi tháng chỉ gửi MỘT LẦN — tracking qua audienceValue = "birthday-auto:YYYY-MM"
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now       = new Date();
    const year      = now.getFullYear();
    const month     = now.getMonth() + 1; // 1-12
    const trackKey  = `birthday-auto:${year}-${String(month).padStart(2, "0")}`;

    // ── Kiểm tra đã gửi tháng này chưa ──────────────────────────────────────
    const existing = await prisma.notification.findFirst({
      where: { audienceValue: trackKey },
      select: { id: true, createdAt: true },
    });

    if (existing) {
      return NextResponse.json({
        alreadySent: true,
        sentAt: existing.createdAt,
        message: `Đã gửi lời chúc sinh nhật tháng ${month}/${year} rồi.`,
      });
    }

    // ── Lấy nhân viên có sinh nhật trong tháng này ───────────────────────────
    const employees = await prisma.employee.findMany({
      where: { status: "active" },
      select: { id: true, fullName: true, birthDate: true, position: true, departmentName: true },
    });

    const birthdayEmps = employees.filter(e => {
      if (!e.birthDate) return false;
      const bMonth = new Date(e.birthDate).getMonth() + 1;
      return bMonth === month;
    }).sort((a, b) => {
      const da = new Date(a.birthDate!).getDate();
      const db = new Date(b.birthDate!).getDate();
      return da - db;
    });

    if (birthdayEmps.length === 0) {
      return NextResponse.json({
        alreadySent: false,
        sent: false,
        message: `Không có nhân viên nào sinh nhật tháng ${month}/${year}.`,
      });
    }

    // ── Tạo nội dung thông báo ───────────────────────────────────────────────
    const nameList = birthdayEmps
      .map(e => {
        const day = new Date(e.birthDate!).getDate();
        return `• ${e.fullName} (${e.position} – Ngày ${day}/${month})`;
      })
      .join("\n");

    const title = `🎂 Sinh nhật nhân viên tháng ${month}/${year}`;
    const content =
      `Chúc mừng sinh nhật các thành viên trong tháng ${month}/${year}! 🎉\n\n` +
      `${nameList}\n\n` +
      `Chúc các bạn một sinh nhật vui vẻ, sức khỏe và thành công! 🎁`;

    // ── Tạo notification + gửi cho tất cả user ──────────────────────────────
    const notification = await prisma.notification.create({
      data: {
        title,
        content,
        type:         "info",
        priority:     "normal",
        audienceType: "all",
        audienceValue: trackKey,   // key tracking "đã gửi tháng này"
        createdById:  session.user.id,
      },
    });

    const allUsers = await prisma.user.findMany({ select: { id: true } });
    await Promise.allSettled(
      allUsers.map(u =>
        prisma.notificationRecipient.upsert({
          where: { notificationId_userId: { notificationId: notification.id, userId: u.id } },
          update: {},
          create: { notificationId: notification.id, userId: u.id },
        })
      )
    );

    console.log(`[birthday-notify] Sent for ${birthdayEmps.length} employees → ${allUsers.length} users (${trackKey})`);

    return NextResponse.json({
      alreadySent:    false,
      sent:           true,
      birthdayCount:  birthdayEmps.length,
      recipientCount: allUsers.length,
      month, year,
      message: `Đã gửi lời chúc sinh nhật cho ${birthdayEmps.length} nhân viên đến ${allUsers.length} người dùng.`,
    });

  } catch (err: any) {
    console.error("[POST /api/hr/birthday-notify] Error:", err);
    return NextResponse.json({ error: err?.message || "Lỗi máy chủ" }, { status: 500 });
  }
}

// GET — kiểm tra trạng thái (đã gửi chưa)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const now    = new Date();
    const year   = now.getFullYear();
    const month  = now.getMonth() + 1;
    const trackKey = `birthday-auto:${year}-${String(month).padStart(2, "0")}`;

    const existing = await prisma.notification.findFirst({
      where: { audienceValue: trackKey },
      select: { id: true, createdAt: true },
    });

    return NextResponse.json({ alreadySent: !!existing, sentAt: existing?.createdAt ?? null, month, year });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
