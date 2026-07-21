import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET() {
  try {
    // Automatically update expired promotions
    await prisma.salesPromotion.updateMany({
      where: {
        status: "Hiệu lực",
        endDate: {
          lt: new Date()
        }
      },
      data: {
        status: "Hết hiệu lực"
      }
    });

    const promotions = await prisma.salesPromotion.findMany({
      orderBy: { createdAt: "desc" },
    });
    
    // Format dates to strings for frontend display
    const formattedPromotions = promotions.map((p: any) => ({
      ...p,
      startDate: p.startDate ? p.startDate.toISOString().split('T')[0] : "",
      endDate: p.endDate ? p.endDate.toISOString().split('T')[0] : "",
    }));

    return NextResponse.json(formattedPromotions);
  } catch (error) {
    console.error("Failed to fetch promotions:", error);
    return NextResponse.json({ error: "Failed to fetch promotions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const name = formData.get("name") as string;
    const docNo = formData.get("docNo") as string;
    const status = formData.get("status") as string;
    const startDateStr = formData.get("startDate") as string;
    const endDateStr = formData.get("endDate") as string;
    const summary = formData.get("summary") as string;
    const file = formData.get("file") as File | null;

    let pdfUrl = "";

    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uploadDir = path.join(process.cwd(), "public/uploads");
      await mkdir(uploadDir, { recursive: true });

      // Generate a URL-safe filename
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const fileName = `${Date.now()}-${safeName}`;
      const filePath = path.join(uploadDir, fileName);
      await writeFile(filePath, buffer);
      pdfUrl = `/uploads/${fileName}`;
    }

    const promotion = await prisma.salesPromotion.create({
      data: {
        name,
        docNo: docNo || null,
        status: status || "Hiệu lực",
        startDate: startDateStr ? new Date(startDateStr) : null,
        endDate: endDateStr ? new Date(endDateStr) : null,
        summary: summary || null,
        pdfUrl: pdfUrl || null,
      },
    });

    return NextResponse.json(promotion, { status: 201 });
  } catch (error) {
    console.error("Failed to create promotion:", error);
    return NextResponse.json({ error: "Failed to create promotion" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { ids } = body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
    }

    await prisma.salesPromotion.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting promotion:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete promotion' }, { status: 500 });
  }
}
