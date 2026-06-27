import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

// Helper to update or append variables in .env file
function updateEnvFile(key: string, value: string) {
  try {
    const envPath = path.join(process.cwd(), ".env");
    let content = "";

    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, "utf-8");
    } else {
      const envLocalPath = path.join(process.cwd(), ".env.local");
      if (fs.existsSync(envLocalPath)) {
        content = fs.readFileSync(envLocalPath, "utf-8");
      }
    }

    const lines = content.split("\n");
    let found = false;
    const newLines = lines.map(line => {
      if (line.trim().startsWith(`${key}=`)) {
        found = true;
        return `${key}=${value}`;
      }
      return line;
    });

    if (!found) {
      newLines.push(`${key}=${value}`);
    }

    const targetPath = fs.existsSync(envPath) ? envPath : path.join(process.cwd(), ".env");
    fs.writeFileSync(targetPath, newLines.join("\n"), "utf-8");
    
    // Also dynamically update process.env for the currently running process
    process.env[key] = value;
  } catch (error) {
    console.error(`[EnvUpdate] Failed to write to env file:`, error);
  }
}

export async function GET() {
  try {
    // Get the first Shopee connection configuration
    const connection = await prisma.channelConnection.findFirst({
      where: { platform: "SHOPEE" }
    });

    const webhookUrl = process.env.SHOPEE_WEBHOOK_URL || "";

    return NextResponse.json({
      partnerId: connection?.partnerId || "",
      partnerKey: connection?.partnerKey || "",
      shopId: connection?.shopId || "",
      shopName: connection?.shopName || "Leetech Official Store",
      webhookUrl: webhookUrl
    });
  } catch (error: any) {
    console.error("[Config API GET] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { partnerId, partnerKey, shopId, shopName, webhookUrl } = body;

    if (!partnerId || !partnerKey || !shopId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Save connection configuration to DB
    const connection = await prisma.channelConnection.upsert({
      where: { shopId: String(shopId) },
      update: {
        partnerId,
        partnerKey,
        shopName: shopName || "Leetech Official Store",
        status: "ACTIVE"
      },
      create: {
        platform: "SHOPEE",
        shopId: String(shopId),
        partnerId,
        partnerKey,
        shopName: shopName || "Leetech Official Store",
        status: "ACTIVE"
      }
    });

    // Update Webhook URL in .env file
    if (webhookUrl) {
      updateEnvFile("SHOPEE_WEBHOOK_URL", webhookUrl);
    }

    return NextResponse.json({ success: true, connection });
  } catch (error: any) {
    console.error("[Config API POST] Error:", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}
