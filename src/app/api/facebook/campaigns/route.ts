import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { upsertCampaign } from "@/lib/marketing-sync";

export async function GET(req: NextRequest) {
  try {
    // Lấy token từ DB
    const conn = await prisma.socialConnection.findUnique({ where: { platform: "facebook" } });
    if (!conn?.userToken) {
      return NextResponse.json({ error: "Chưa kết nối Facebook" }, { status: 401 });
    }

    const token = conn.userToken;

    // 1. Lấy danh sách Ad Accounts
    const adAccountsRes = await fetch(
      `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_status,currency,amount_spent&access_token=${token}`
    );
    const adAccountsData = await adAccountsRes.json();

    if (adAccountsData.error) {
      return NextResponse.json({ error: adAccountsData.error.message }, { status: 400 });
    }

    const adAccounts: Array<{ id: string; name: string; account_status: number; currency: string; amount_spent: string }> = adAccountsData.data || [];

    if (adAccounts.length === 0) {
      return NextResponse.json({ adAccounts: [], campaigns: [] });
    }

    // 2. Lấy chiến dịch từ tất cả Ad Accounts
    const allCampaigns: any[] = [];

    for (const account of adAccounts) {
      // 1. Lấy danh sách campaigns
      const campaignsRes = await fetch(
        `https://graph.facebook.com/v19.0/${account.id}/campaigns` +
        `?fields=id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time` +
        `&access_token=${token}&limit=30`
      );
      const campaignsData = await campaignsRes.json();
      if (!campaignsData.data) continue;

      // 2. Lấy insights và Đồng bộ vào DB
      const campaigns = await Promise.all(
        campaignsData.data.map(async (c: any) => {
          try {
            const insRes = await fetch(
              `https://graph.facebook.com/v19.0/${c.id}/insights` +
              `?fields=date_start,spend,impressions,reach,clicks,cpc,ctr,actions` +
              `&date_preset=last_30d&time_increment=1` +
              `&access_token=${token}`
            );
            const insData = await insRes.json();
            const days = insData.data || [];
            const spend = days.reduce((a: number, x: any) => a + parseFloat(x.spend || "0"), 0);

            // ĐỒNG BỘ VÀO DB
            await upsertCampaign({
              externalId: c.id,
              name: c.name,
              platform: "facebook",
              status: c.status,
              objective: c.objective,
              dailyBudget: parseFloat(c.daily_budget || "0"),
              budget: parseFloat(c.lifetime_budget || "0"),
              spent: spend,
              currency: account.currency,
              startTime: c.start_time,
              stopTime: c.stop_time,
            });

            return {
              ...c,
              adAccountId: account.id,
              adAccountName: account.name,
              currency: account.currency,
              insights: { data: days },
            };
          } catch (e) {
            console.error(`[FB Sync Error] Campaign ${c.id}:`, e);
            return { ...c, adAccountId: account.id, adAccountName: account.name, currency: account.currency };
          }
        })
      );
      allCampaigns.push(...campaigns);
    }

    return NextResponse.json({
      adAccounts,
      campaigns: allCampaigns,
      total: allCampaigns.length,
    });

  } catch (err) {
    console.error("[Facebook Campaigns Error]", err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
