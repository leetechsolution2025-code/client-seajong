import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const campaigns = await (prisma as any).marketingCampaign.findMany({
      include: {
        insights: {
          orderBy: { date: 'asc' }
        },
        leads: true
      }
    });

    const formatted = campaigns.map((c: any) => {
      // Aggregate leads by date
      const leadsByDate: Record<string, number> = {};
      (c.leads || []).forEach((lead: any) => {
        const d = new Date(lead.createdAt).toISOString().split('T')[0];
        leadsByDate[d] = (leadsByDate[d] || 0) + 1;
      });

      // Map existing insights
      const insightsMap: Record<string, any> = {};
      (c.insights || []).forEach((i: any) => {
        const d = i.date.toISOString().split('T')[0];
        insightsMap[d] = {
          date_start: d,
          spend: i.spend.toString(),
          impressions: i.impressions.toString(),
          reach: i.reach.toString(),
          leads: i.leads.toString(), // Base leads from insights
          likes: i.likes.toString(),
          clicks: i.clicks.toString(),
          unit: i.unit,
          platform: i.platform,
        };
      });

      // Merge webhook leads into insights
      for (const [date, count] of Object.entries(leadsByDate)) {
        if (!insightsMap[date]) {
          insightsMap[date] = {
            date_start: date,
            spend: "0",
            impressions: "0",
            reach: "0",
            leads: "0",
            likes: "0",
            clicks: "0",
            unit: "DAY",
            platform: c.platform,
          };
        }
        // Add webhook leads to the count
        insightsMap[date].leads = (parseInt(insightsMap[date].leads) + count).toString();
      }

      // Convert back to sorted array
      const mergedInsights = Object.values(insightsMap).sort((a: any, b: any) => a.date_start.localeCompare(b.date_start));
      mergedInsights.forEach((i: any) => {
        i.actions = [{ action_type: 'lead', value: i.leads }];
      });

      return {
        id: c.id,
        name: c.name,
        status: c.status,
        platform: c.platform,
        adAccountName: "EOS Managed",
        currency: c.currency,
        insights: {
          data: mergedInsights
        }
      };
    });

    return NextResponse.json({ campaigns: formatted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
