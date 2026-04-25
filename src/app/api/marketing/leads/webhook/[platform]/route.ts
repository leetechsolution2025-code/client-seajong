import { NextRequest, NextResponse } from "next/server";
import { saveLead } from "@/lib/marketing-sync";

/**
 * Webhook tập trung nhận lead từ đa kênh
 * Facebook: GET (verify), POST (data)
 * TikTok: POST
 * Google: POST
 */

export async function GET(req: NextRequest, { params }: { params: { platform: string } }) {
  const platform = params.platform;
  const { searchParams } = new URL(req.url);

  // Facebook Webhook Verification
  if (platform === "facebook") {
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    // Lấy verify token từ cấu hình hoặc DB (ở đây giả định là 'LEETECH_VERIFY')
    if (mode === "subscribe" && token === "LEETECH_VERIFY") {
      return new NextResponse(challenge, { status: 200 });
    }
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

export async function POST(req: NextRequest, { params }: { params: { platform: string } }) {
  const platform = params.platform;
  const body = await req.json();

  console.log(`[Webhook] Received lead from ${platform}:`, body);

  try {
    if (platform === "facebook") {
      // Facebook đẩy lead_id, mình cần fetch chi tiết lead đó từ Graph API
      // Quy trình: leadgen_id -> Fetch Lead Details -> Save to DB
      const entries = body.entry || [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          if (change.field === "leadgen") {
            const leadId = change.value.leadgen_id;
            const campaignId = change.value.campaign_id;
            
            // Ở đây cần Log lại LeadId để Worker hoặc Task khác fetch chi tiết
            // Để đơn giản, ta sẽ gọi hàm saveLead với thông tin cơ bản trước
            await saveLead({
              campaignExternalId: campaignId,
              externalId: leadId,
              status: "new",
              source: "facebook_webhook"
            });
          }
        }
      }
    }

    if (platform === "tiktok") {
      // Tiktok thường đẩy thẳng data
      const leadData = body;
      await saveLead({
        campaignExternalId: leadData.campaign_id,
        externalId: leadData.lead_id,
        fullName: leadData.full_name,
        email: leadData.email,
        phone: leadData.phone,
        formValues: JSON.stringify(leadData),
        source: "tiktok_webhook"
      });
    }

    if (platform === "google") {
      // Google Ads Lead Form Webhook
      const leadData = body;
      await saveLead({
        campaignExternalId: leadData.campaign_id.toString(),
        externalId: leadData.google_key,
        fullName: leadData.user_column_data?.find((c: any) => c.column_id === "FULL_NAME")?.string_value,
        email: leadData.user_column_data?.find((c: any) => c.column_id === "EMAIL")?.string_value,
        phone: leadData.user_column_data?.find((c: any) => c.column_id === "PHONE_NUMBER")?.string_value,
        formValues: JSON.stringify(leadData),
        source: "google_webhook"
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error(`[Webhook Error] ${platform}:`, error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
