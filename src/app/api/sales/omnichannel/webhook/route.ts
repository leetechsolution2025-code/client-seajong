import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature, syncShopeeOrder } from "@/lib/shopee-sync";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("authorization") || request.headers.get("Authorization") || "";
    
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { shop_id, code, data } = payload;
    if (!shop_id) {
      return NextResponse.json({ error: "Missing shop_id in payload" }, { status: 400 });
    }

    const connection = await prisma.channelConnection.findFirst({
      where: { 
        shopId: String(shop_id),
        platform: "SHOPEE"
      }
    });

    if (!connection) {
      console.warn(`[ShopeeWebhook] No active connection found for shop_id: ${shop_id}`);
      return NextResponse.json({ error: "Connection not found for this shop" }, { status: 404 });
    }

    if (connection.partnerKey) {
      let webhookUrl = process.env.SHOPEE_WEBHOOK_URL;
      if (!webhookUrl) {
        const protocol = request.headers.get("x-forwarded-proto") || "https";
        const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
        // Remove trailing slash if present
        const cleanHost = host.endsWith("/") ? host.slice(0, -1) : host;
        webhookUrl = `${protocol}://${cleanHost}/api/sales/omnichannel/webhook`;
      }
      
      const isValid = verifyWebhookSignature(webhookUrl, rawBody, connection.partnerKey, signature);
      if (!isValid) {
        console.error(`[ShopeeWebhook] Signature verification failed for shop_id ${shop_id}. Calculated url: ${webhookUrl}`);
        if (process.env.NODE_ENV === "production") {
          return NextResponse.json({ error: "Unauthorized signature" }, { status: 401 });
        }
      }
    }

    if (data && data.order_sn) {
      const orderSn = data.order_sn;
      console.log(`[ShopeeWebhook] Received order event for order ${orderSn}, shop ${shop_id}, event code ${code}`);
      await syncShopeeOrder(orderSn, connection.id);
    } else {
      console.log(`[ShopeeWebhook] Received webhook payload:`, payload);
    }

    return NextResponse.json({ message: "Success" });
  } catch (error: any) {
    console.error(`[ShopeeWebhook] Error processing webhook:`, error.message, error.stack);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}
