import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const news = await (prisma as any).taxPolicyNews.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    if (news.length === 0) {
      // Fallback/Mock if DB is empty
      return NextResponse.json({
        data: [
          { text: "🚀 Hệ thống đang chờ cập nhật văn bản từ Tổng cục Thuế...", link: "", title: "" },
          { text: "📅 Hạn nộp Tờ khai Thuế TNCN Quý 2/2026 là ngày 31/07/2026. Vui lòng rà soát số liệu trước ngày 25.", link: "", title: "" }
        ]
      });
    }

    // Format for the ticker
    const formattedNews = news.map((n: any) => {
      return {
        text: `• ${n.title} - ${n.summary || ""}`,
        link: n.link || "",
        title: n.title || "Chi tiết chính sách"
      };
    });

    return NextResponse.json({ data: formattedNews });
  } catch (error) {
    console.error("Error fetching tax ticker news:", error);
    return NextResponse.json({ data: ["⚠ Không thể kết nối tới máy chủ cập nhật chính sách thuế."], error: String(error) });
  }
}
