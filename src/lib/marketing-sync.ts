/**
 * Marketing Sync Service - v3 (TS Safe Casting)
 */
import { prisma } from "./prisma";

/**
 * Cập nhật hoặc thêm mới chiến dịch vào DB
 */
export async function upsertCampaign(data: {
  externalId: string;
  name: string;
  platform: string;
  status: string;
  objective?: string;
  budget?: number;
  dailyBudget?: number;
  spent?: number;
  currency?: string;
  startTime?: string | Date;
  stopTime?: string | Date;
  clientId?: string;
}) {
  const { externalId, ...rest } = data;
  
  const startTime = data.startTime ? new Date(data.startTime) : undefined;
  const stopTime = data.stopTime ? new Date(data.stopTime) : undefined;

  // Cast prisma to any to bypass IDE type lag
  return await (prisma as any).marketingCampaign.upsert({
    where: { externalId },
    update: {
      ...rest,
      startTime,
      stopTime
    },
    create: {
      externalId,
      ...rest,
      startTime,
      stopTime
    },
  });
}

/**
 * Lưu Lead mới vào DB và gắn với chiến dịch tương ứng
 */
export async function saveLead(data: {
  campaignExternalId: string;
  campaignName?: string;
  externalId?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  formValues?: string;
  status?: string;
  source?: string;
  medium?: string;
  adId?: string;
  createdAt?: string;
}) {
  const campaign = await (prisma as any).marketingCampaign.findUnique({
    where: { externalId: data.campaignExternalId },
  });

  const { campaignExternalId, campaignName, ...cleanData } = data;

  if (!campaign) {
    console.warn(`[MarketingSync] Không tìm thấy Campaign: ${campaignExternalId}. Đang tạo campaign tạm...`);
    // Tạo campaign tạm để không làm mất Lead
    const fallbackCampaign = await (prisma as any).marketingCampaign.create({
      data: {
        externalId: campaignExternalId,
        name: data.campaignName || `Chiến dịch tự động (${campaignExternalId})`,
        platform: "facebook",
        status: "active"
      }
    });
    return await (prisma as any).marketingLead.create({
      data: {
        ...cleanData,
        campaignId: fallbackCampaign.id,
        status: data.status || "new",
        ...(data.createdAt && { createdAt: new Date(data.createdAt) })
      },
    });
  }

  if (data.externalId) {
    return await (prisma as any).marketingLead.upsert({
      where: { externalId: data.externalId },
      update: {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        formValues: data.formValues,
        status: data.status || "new",
        ...(data.createdAt && { createdAt: new Date(data.createdAt) })
      },
      create: {
        ...cleanData,
        campaignId: campaign.id,
        status: data.status || "new",
        ...(data.createdAt && { createdAt: new Date(data.createdAt) })
      },
    });
  }
 else {
    return await (prisma as any).marketingLead.create({
      data: {
        ...cleanData,
        campaignId: campaign.id,
        status: data.status || "new",
        ...(data.createdAt && { createdAt: new Date(data.createdAt) })
      },
    });
  }
}

/**
 * Sync toàn bộ chiến dịch từ Facebook
 */
export async function syncFacebook(token: string) {
  try {
    const adRes = await fetch(`https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,currency&access_token=${token}`);
    const adData = await adRes.json();
    if (!adData.data) return { error: "No ad accounts" };

    let count = 0;
    for (const account of adData.data) {
      const campRes = await fetch(`https://graph.facebook.com/v19.0/${account.id}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time&access_token=${token}`);
      const campData = await campRes.json();
      if (!campData.data) continue;

      for (const c of campData.data) {
        const insRes = await fetch(`https://graph.facebook.com/v19.0/${c.id}/insights?fields=spend,actions&date_preset=last_30d&access_token=${token}`);
        const insData = await insRes.json();
        const insights = insData.data?.[0] || {};
        const spend = parseFloat(insights.spend || "0");
        
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
        count++;
      }
    }
    return { success: true, count };
  } catch (error) {
    console.error("[Sync FB] Error:", error);
    return { error };
  }
}

export async function syncTiktok(token: string) {
  return { success: true, count: 0, note: "Chờ triển khai API TikTok chính thức" };
}

export async function syncGoogle(token: string) {
  return { success: true, count: 0, note: "Chờ triển khai API Google Ads chính thức" };
}

/**
 * Lưu báo cáo hiệu quả (Insights) hàng ngày của chiến dịch
 */
export async function saveInsight(data: {
  campaignExternalId: string;
  campaignName?: string;
  date: string;
  platform: string;
  spend?: number;
  impressions?: number;
  reach?: number;
  clicks?: number;
  likes?: number;
}) {
  let campaign = await (prisma as any).marketingCampaign.findUnique({
    where: { externalId: data.campaignExternalId },
  });

  if (!campaign) {
    campaign = await (prisma as any).marketingCampaign.create({
      data: {
        externalId: data.campaignExternalId,
        name: data.campaignName || `Campaign ${data.campaignExternalId}`,
        platform: data.platform,
        status: "active"
      }
    });
  }

  // Upsert insight by campaignId and date
  // Since we don't have a unique constraint on (campaignId, date), we will findFirst and then update or create
  const parsedDate = new Date(data.date);
  // Reset time to 00:00:00 to match by date
  parsedDate.setUTCHours(0,0,0,0);

  const existingInsight = await (prisma as any).marketingInsight.findFirst({
    where: {
      campaignId: campaign.id,
      date: parsedDate
    }
  });

  if (existingInsight) {
    return await (prisma as any).marketingInsight.update({
      where: { id: existingInsight.id },
      data: {
        spend: data.spend !== undefined ? data.spend : existingInsight.spend,
        impressions: data.impressions !== undefined ? data.impressions : existingInsight.impressions,
        reach: data.reach !== undefined ? data.reach : existingInsight.reach,
        clicks: data.clicks !== undefined ? data.clicks : existingInsight.clicks,
        likes: data.likes !== undefined ? data.likes : existingInsight.likes,
      }
    });
  } else {
    return await (prisma as any).marketingInsight.create({
      data: {
        campaignId: campaign.id,
        date: parsedDate,
        platform: data.platform,
        spend: data.spend || 0,
        impressions: data.impressions || 0,
        reach: data.reach || 0,
        clicks: data.clicks || 0,
        likes: data.likes || 0,
      }
    });
  }
}
