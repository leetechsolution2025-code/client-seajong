import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const campaigns = await (prisma as any).marketingCampaign.findMany({
      include: {
        insights: {
          orderBy: { date: 'asc' }
        }
      }
    });

    const formatted = campaigns.map((c: any) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      platform: c.platform,
      adAccountName: "EOS Managed",
      currency: c.currency,
      insights: {
        data: (c as any).insights.map((i: any) => ({
          date_start: i.date.toISOString().split('T')[0],
          spend: i.spend.toString(),
          impressions: i.impressions.toString(),
          reach: i.reach.toString(),
          leads: i.leads.toString(),
          likes: i.likes.toString(),
          clicks: i.clicks.toString(),
          unit: i.unit,
          platform: i.platform,
          actions: [{ action_type: 'lead', value: i.leads.toString() }]
        }))
      }
    }));

    return NextResponse.json({ campaigns: formatted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
