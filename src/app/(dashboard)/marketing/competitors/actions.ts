"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getCompetitors() {
  try {
    const competitors = await (prisma as any).competitor.findMany({
      orderBy: { createdAt: 'desc' },
    });
    
    return competitors.map((c: any) => ({
      ...c,
      tags: JSON.parse(c.tags),
      swot: JSON.parse(c.swot),
      metrics: JSON.parse(c.metrics),
      scores: JSON.parse(c.scores),
      newsHighlights: c.newsHighlights ? JSON.parse(c.newsHighlights) : [],
      marketingActivity: c.marketingActivity ? JSON.parse(c.marketingActivity) : null,
      dataSources: c.dataSources ? JSON.parse(c.dataSources) : null,
      strategySuggestions: c.strategySuggestions ? JSON.parse(c.strategySuggestions) : null,
    }));
  } catch (error) {
    console.error("Error fetching competitors:", error);
    return [];
  }
}

export async function addCompetitor(data: any) {
  try {
    const competitor = await (prisma as any).competitor.create({
      data: {
        name: data.name || "Chưa xác định",
        website: data.website || "",
        color: data.color || "#6366f1",
        threat: data.threat || "Tiềm năng",
        address: data.address,
        status: data.status || "Đang theo dõi",
        lastScan: data.lastScan || new Date().toLocaleString('vi-VN'),
        tags: JSON.stringify(data.tags || []),
        aiSummary: data.aiSummary || "Không có tóm tắt từ AI",
        swot: JSON.stringify(data.swot || { s: [], w: [], o: [], t: [] }),
        metrics: JSON.stringify(data.metrics || {}),
        scores: JSON.stringify(data.scores || {}),
        newsHighlights: JSON.stringify(data.newsHighlights || []),
        marketingActivity: data.marketingActivity ? JSON.stringify(data.marketingActivity) : null,
        dataSources: JSON.stringify(data.dataSources || {}),
        strategySuggestions: data.strategySuggestions ? JSON.stringify(data.strategySuggestions) : null,
      },
    });
    
    revalidatePath("/marketing/competitors");
    return { success: true, data: competitor };
  } catch (error: any) {
    console.error("Error adding competitor:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteCompetitor(id: string) {
  try {
    await (prisma as any).competitor.delete({
      where: { id },
    });
    revalidatePath("/marketing/competitors");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting competitor:", error);
    return { success: false, error: error.message };
  }
}

export async function updateCompetitor(id: string, data: any) {
  try {
    // Build update payload defensively:
    // - Required String fields: always provide a value (never undefined)
    // - Optional String? fields: null is valid (clears the field)
    // - JSON fields: always stringify with safe defaults, never pass undefined
    const updateData: Record<string, any> = {
      lastScan: (typeof data.lastScan === 'string' && data.lastScan.trim())
        ? data.lastScan
        : new Date().toLocaleString('vi-VN'),
    };

    // Required String fields — only update if AI returned a non-empty value
    if (typeof data.name === 'string' && data.name.trim()) updateData.name = data.name.trim();
    if (typeof data.website === 'string' && data.website.trim()) updateData.website = data.website.trim();
    if (typeof data.color === 'string' && data.color.trim()) updateData.color = data.color.trim();
    if (typeof data.threat === 'string' && data.threat.trim()) updateData.threat = data.threat.trim();
    if (typeof data.status === 'string' && data.status.trim()) updateData.status = data.status.trim();
    if (typeof data.aiSummary === 'string' && data.aiSummary.trim()) updateData.aiSummary = data.aiSummary.trim();

    // Optional String? field — null is valid (clears address)
    if ('address' in data) updateData.address = data.address ?? null;

    // JSON array/object fields — stringify with safe defaults to avoid null crash
    if (data.tags !== undefined) {
      updateData.tags = JSON.stringify(Array.isArray(data.tags) ? data.tags : []);
    }
    if (data.swot !== undefined) {
      updateData.swot = JSON.stringify(
        (data.swot && typeof data.swot === 'object')
          ? data.swot
          : { s: [], w: [], o: [], t: [] }
      );
    }
    if (data.metrics !== undefined) {
      updateData.metrics = JSON.stringify(
        (data.metrics && typeof data.metrics === 'object') ? data.metrics : {}
      );
    }
    if (data.scores !== undefined) {
      updateData.scores = JSON.stringify(
        (data.scores && typeof data.scores === 'object') ? data.scores : {}
      );
    }
    if (data.newsHighlights !== undefined) {
      updateData.newsHighlights = JSON.stringify(
        Array.isArray(data.newsHighlights) ? data.newsHighlights : []
      );
    }
    if (data.marketingActivity !== undefined) {
      updateData.marketingActivity = data.marketingActivity
        ? JSON.stringify(data.marketingActivity)
        : null;
    }
    if (data.dataSources !== undefined) {
      updateData.dataSources = data.dataSources
        ? JSON.stringify(data.dataSources)
        : null;
    }
    if (data.strategySuggestions !== undefined) {
      updateData.strategySuggestions = data.strategySuggestions
        ? JSON.stringify(data.strategySuggestions)
        : null;
    }

    const competitor = await (prisma as any).competitor.update({
      where: { id },
      data: updateData,
    });
    
    revalidatePath("/marketing/competitors");
    return { success: true, data: competitor };
  } catch (error: any) {
    console.error("Error updating competitor:", error);
    return { success: false, error: error.message };
  }
}

export async function getMarketFormData() {
  try {
    const products = await prisma.seajongCategory.findMany({
      where: { count: { gt: 0 } },
      select: { id: true, name: true, count: true },
      orderBy: { count: 'desc' }
    });

    const channels = await prisma.category.findMany({
      where: { type: 'nen_tang' },
      select: { id: true, name: true, icon: true },
      orderBy: { sortOrder: 'asc' }
    });

    return { products, channels };
  } catch (error) {
    console.error("Error fetching market form data:", error);
    return { products: [], channels: [] };
  }
}
