import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { campaigns, mode = "upsert" } = await req.json();

    if (!campaigns || !Array.isArray(campaigns)) {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    }

    console.log('Available Prisma models:', Object.keys(prisma).filter(k => !k.startsWith('_') && typeof (prisma as any)[k] === 'object'));


    for (const camp of campaigns) {
      if (!camp.name || camp.name === "null") continue;

      // 1. Upsert Campaign
      const dbCampaign = await (prisma as any).marketingCampaign.upsert({
        where: { externalId: String(camp.name) }, 
        update: {
          status: camp.status || "ACTIVE",
          platform: "multiple", 
        },
        create: {
          externalId: String(camp.name),
          name: String(camp.name),
          platform: "multiple",
          status: camp.status || "ACTIVE",
        },
      });

      // 2. Upsert Insights
      if (camp.insights?.data && Array.isArray(camp.insights.data)) {
        for (const day of camp.insights.data) {
          const dateStr = String(day.date_start);
          if (!dateStr || dateStr === "null" || dateStr.toLowerCase().includes("tổng")) continue;

          const date = new Date(dateStr);
          if (isNaN(date.getTime())) {
            console.warn(`Invalid date format: ${dateStr} for campaign ${camp.name}`);
            continue;
          }

          try {
            if (mode === "skip") {
              const existing = await (prisma as any).marketingInsight.findUnique({
                where: {
                  campaignId_date_platform: {
                    campaignId: dbCampaign.id,
                    date: date,
                    platform: String(day.platform || camp.platform || "facebook").toLowerCase(),
                  },
                },
              });
              if (!existing) {
                await (prisma as any).marketingInsight.create({
                  data: {
                    campaignId: dbCampaign.id,
                    date: date,
                    platform: String(day.platform || camp.platform || "facebook").toLowerCase(),
                    spend: parseFloat(day.spend || "0"),
                    impressions: parseInt(day.impressions || "0"),
                    reach: parseInt(day.reach || "0"),
                    leads: parseInt(day.leads || "0"),
                    likes: parseInt(day.likes || "0"),
                    clicks: parseInt(day.clicks || "0"),
                    unit: day.unit || "kết quả",
                  }
                });
              }
            } else {
              await (prisma as any).marketingInsight.upsert({
                where: {
                  campaignId_date_platform: {
                  campaignId: dbCampaign.id,
                  date: date,
                  platform: String(day.platform || camp.platform || "facebook").toLowerCase(),
                },
              },
              update: {
                spend: parseFloat(day.spend || "0"),
                impressions: parseInt(day.impressions || "0"),
                reach: parseInt(day.reach || "0"),
                leads: parseInt(day.leads || "0"),
                likes: parseInt(day.likes || "0"),
                clicks: parseInt(day.clicks || "0"),
                unit: day.unit || "kết quả",
              },
              create: {
                campaignId: dbCampaign.id,
                date: date,
                platform: String(day.platform || camp.platform || "facebook").toLowerCase(),
                spend: parseFloat(day.spend || "0"),
                impressions: parseInt(day.impressions || "0"),
                reach: parseInt(day.reach || "0"),
                leads: parseInt(day.leads || "0"),
                likes: parseInt(day.likes || "0"),
                clicks: parseInt(day.clicks || "0"),
                unit: day.unit || "kết quả",
              },
            });
            }
          } catch (upsertErr: any) {
            console.error(`Failed to upsert insight for ${camp.name} on ${dateStr}:`, upsertErr.message);
            throw new Error(`Lỗi tại chiến dịch "${camp.name}" ngày ${dateStr}: ${upsertErr.message}`);
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Import API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
