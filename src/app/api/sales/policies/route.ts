import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET() {
  try {
    const policies = await prisma.salesPolicy.findMany({
      orderBy: { createdAt: "desc" },
    });
    
    // Format dates to strings for frontend display
    const formattedPolicies = policies.map((p: any) => ({
      ...p,
      date: p.issueDate ? p.issueDate.toISOString().split('T')[0] : "",
    }));

    return NextResponse.json(formattedPolicies);
  } catch (error) {
    console.error("Failed to fetch policies:", error);
    return NextResponse.json({ error: "Failed to fetch policies" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const name = formData.get("name") as string;
    const docNo = formData.get("docNo") as string;
    const status = formData.get("status") as string;
    const issueDateStr = formData.get("issueDate") as string;
    const issuer = formData.get("issuer") as string;
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

    const policy = await prisma.salesPolicy.create({
      data: {
        name,
        docNo: docNo || null,
        status: status || "Hiệu lực",
        issueDate: issueDateStr ? new Date(issueDateStr) : null,
        issuer: issuer || null,
        summary: summary || null,
        pdfUrl: pdfUrl || null,
      },
    });

    return NextResponse.json(policy, { status: 201 });
  } catch (error) {
    console.error("Failed to create policy:", error);
    return NextResponse.json({ error: "Failed to create policy" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { ids } = body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
    }

    await prisma.salesPolicy.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting policy:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete policy' }, { status: 500 });
  }
}
