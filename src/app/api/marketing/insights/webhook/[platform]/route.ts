import { NextRequest, NextResponse } from "next/server";
import { saveInsight } from "@/lib/marketing-sync";

/**
 * Webhook nhận báo cáo thống kê (Insights: Likes, Comments, Spend, Reach, etc.)
 * URL: POST /api/marketing/insights/webhook/facebook
 */

export async function POST(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  
  try {
    const body = await req.json();
    console.log(`[Insights Webhook] Received from ${platform}:`, body);

    // Xử lý dữ liệu từ Make.com (HTTP module)
    // Make.com có thể gửi 1 object hoặc 1 mảng (array) các object
    const processData = async (data: any) => {
      if (!data.campaignExternalId || !data.date) {
        throw new Error("Missing required fields: campaignExternalId, date");
      }
      
      await saveInsight({
        campaignExternalId: data.campaignExternalId,
        campaignName: data.campaignName,
        date: data.date,
        platform: platform,
        spend: data.spend ? parseFloat(data.spend) : 0,
        impressions: data.impressions ? parseInt(data.impressions) : 0,
        reach: data.reach ? parseInt(data.reach) : 0,
        clicks: data.clicks ? parseInt(data.clicks) : 0,
        likes: data.likes ? parseInt(data.likes) : 0,
      });
    };

    if (Array.isArray(body)) {
      for (const item of body) {
        await processData(item);
      }
    } else {
      await processData(body);
    }

    return NextResponse.json({ success: true, message: "Insights saved successfully" });

  } catch (error: any) {
    console.error(`[Insights Webhook Error] ${platform}:`, error);
    return NextResponse.json({ error: error.message || "Processing failed" }, { status: 500 });
  }
}
