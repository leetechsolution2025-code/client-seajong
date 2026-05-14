
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const config = await (prisma as any).emailConfig.findFirst({
      orderBy: { updatedAt: "desc" }
    });
    return NextResponse.json(config || null);
  } catch (error) {
    console.error("GET EmailConfig Error:", error);
    return NextResponse.json({ error: "Failed to fetch email config" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { host, port, user, pass, fromEmail, fromName, secure } = body;

    if (!host || !user || !pass) {
      return NextResponse.json({ error: "Thiếu thông tin cấu hình bắt buộc" }, { status: 400 });
    }

    const configId = "default-smtp-config";
    const config = await (prisma as any).emailConfig.upsert({
      where: { id: configId },
      update: { host, port, user, pass, fromEmail, fromName, secure, isActive: true },
      create: { 
        id: configId,
        host, port, user, pass, fromEmail, fromName, secure, isActive: true
      }
    });

    return NextResponse.json(config);
  } catch (error: any) {
    console.error("SMTP Config POST Error:", error);
    return NextResponse.json({ error: error.message || "Failed to save email config" }, { status: 500 });
  }
}
