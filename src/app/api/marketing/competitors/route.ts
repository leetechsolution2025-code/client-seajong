import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";

/**
 * GET: Lấy danh sách đối thủ
 * POST: Tạo đối thủ mới
 */

export async function GET() {
  try {
    const competitors = await prisma.competitor.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(competitors);
  } catch (error) {
    console.error("GET Competitors Error:", error);
    return NextResponse.json({ error: "Không thể tải danh sách đối thủ" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Tạo đối thủ với Webhook Token duy nhất
    const competitor = await prisma.competitor.create({
      data: {
        name: body.name,
        website: body.website || "",
        facebookUrl: body.facebookUrl,
        tiktokUrl: body.tiktokUrl,
        youtubeUrl: body.youtubeUrl,
        instagramUrl: body.instagramUrl,
        shopeeUrl: body.shopeeUrl,
        lazadaUrl: body.lazadaUrl,
        
        // Mặc định cho bản ghi mới
        webhookToken: uuidv4(),
        automationStatus: "IDLE",
        status: "Đang theo dõi",
        
        // Khởi tạo các trường JSON trống
        swot: "{}",
        metrics: "{}",
        scores: "{}",
        tags: "[]",
        aiSummary: "Đang chờ dữ liệu để phân tích...",
      },
    });

    return NextResponse.json(competitor);
  } catch (error) {
    console.error("POST Competitor Error:", error);
    return NextResponse.json({ error: "Không thể tạo đối thủ mới" }, { status: 500 });
  }
}
