import { createHmac } from "crypto";
import { prisma } from "./prisma";

export function signShopeeRequest(
  partnerId: string,
  apiPath: string,
  timestamp: number,
  accessToken: string,
  shopId: string,
  partnerKey: string
): string {
  const baseString = `${partnerId}${apiPath}${timestamp}${accessToken}${shopId}`;
  return createHmac("sha256", partnerKey).update(baseString).digest("hex");
}

export function signShopeePublicRequest(
  partnerId: string,
  apiPath: string,
  timestamp: number,
  partnerKey: string
): string {
  const baseString = `${partnerId}${apiPath}${timestamp}`;
  return createHmac("sha256", partnerKey).update(baseString).digest("hex");
}

export function verifyWebhookSignature(
  url: string,
  bodyText: string,
  partnerKey: string,
  signature: string
): boolean {
  if (!signature || !partnerKey) return false;
  const baseString = url + "|" + bodyText;
  const computedSignature = createHmac("sha256", partnerKey)
    .update(baseString)
    .digest("hex");
  return computedSignature === signature;
}

export async function refreshAccessToken(connectionId: string) {
  const conn = await prisma.channelConnection.findUnique({
    where: { id: connectionId }
  });
  if (!conn || !conn.partnerId || !conn.partnerKey || !conn.refreshToken || !conn.shopId) {
    throw new Error("Credentials incomplete for token refresh");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = "/api/v2/auth/access_token/get";
  const sign = signShopeePublicRequest(conn.partnerId, apiPath, timestamp, conn.partnerKey);

  const host = process.env.SHOPEE_API_HOST || "https://partner.shopeemobile.com";
  const url = `${host}${apiPath}?partner_id=${conn.partnerId}&timestamp=${timestamp}&sign=${sign}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      refresh_token: conn.refreshToken,
      partner_id: Number(conn.partnerId),
      shop_id: Number(conn.shopId)
    })
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`Shopee token refresh error: ${data.message || data.error}`);
  }

  const newAccessToken = data.access_token;
  const newRefreshToken = data.refresh_token;
  const expiresAt = new Date(Date.now() + (data.expire_in || 14400) * 1000);

  return await prisma.channelConnection.update({
    where: { id: connectionId },
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresAt,
      status: "ACTIVE"
    }
  });
}

export async function getValidAccessToken(connectionId: string): Promise<string> {
  const conn = await prisma.channelConnection.findUnique({
    where: { id: connectionId }
  });
  if (!conn || !conn.accessToken) {
    throw new Error("Channel connection not found or access token missing");
  }

  const isExpired = !conn.expiresAt || new Date(conn.expiresAt).getTime() - Date.now() < 5 * 60 * 1000;
  if (isExpired) {
    console.log(`[ShopeeSync] Access token expired or expiring soon, refreshing connection ${connectionId}...`);
    const updated = await refreshAccessToken(connectionId);
    return updated.accessToken!;
  }

  return conn.accessToken;
}

export async function syncShopeeOrder(orderSn: string, connectionId: string) {
  const conn = await prisma.channelConnection.findUnique({
    where: { id: connectionId }
  });
  if (!conn || !conn.partnerId || !conn.partnerKey || !conn.shopId) {
    throw new Error("Channel connection credentials incomplete");
  }

  const accessToken = await getValidAccessToken(connectionId);

  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = "/api/v2/order/get_order_detail";
  const sign = signShopeeRequest(conn.partnerId, apiPath, timestamp, accessToken, conn.shopId, conn.partnerKey);

  const host = process.env.SHOPEE_API_HOST || "https://partner.shopeemobile.com";
  const optionalFields = "buyer_username,recipient_address,item_list,total_amount,order_status";
  const url = `${host}${apiPath}?partner_id=${conn.partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${conn.shopId}&order_sn_list=${orderSn}&response_optional_fields=${optionalFields}`;

  const response = await fetch(url, {
    method: "GET"
  });

  const resData = await response.json();
  if (resData.error) {
    throw new Error(`Shopee get_order_detail error: ${resData.message || resData.error}`);
  }

  const orderList = resData.response?.order_list;
  if (!orderList || orderList.length === 0) {
    throw new Error(`Shopee order not found: ${orderSn}`);
  }

  const shopeeOrder = orderList[0];
  const orderStatus = mapShopeeStatus(shopeeOrder.order_status);

  const addr = shopeeOrder.recipient_address;
  const customerName = addr?.name || "Khách hàng Shopee";
  const customerPhone = addr?.phone || "N/A";
  const customerAddress = addr 
    ? [addr.town, addr.district, addr.city, addr.state, addr.region].filter(Boolean).join(", ") || addr.full_address
    : "N/A";

  const totalAmount = shopeeOrder.total_amount || 0;

  const savedOrder = await prisma.omnichannelOrder.upsert({
    where: { externalOrderId: orderSn },
    update: {
      orderStatus,
      customerName,
      customerPhone,
      customerAddress,
      totalAmount,
      updatedAt: new Date(),
      syncStatus: "SUCCESS",
      rawPayload: JSON.stringify(shopeeOrder)
    },
    create: {
      externalOrderId: orderSn,
      channelId: connectionId,
      orderStatus,
      customerName,
      customerPhone,
      customerAddress,
      totalAmount,
      syncStatus: "SUCCESS",
      rawPayload: JSON.stringify(shopeeOrder)
    }
  });

  await prisma.$executeRawUnsafe(
    `DELETE FROM OmnichannelOrderItem WHERE orderId = ?`,
    savedOrder.id
  );

  const items = shopeeOrder.item_list || [];
  for (const item of items) {
    await prisma.omnichannelOrderItem.create({
      data: {
        orderId: savedOrder.id,
        sku: item.item_sku || item.model_sku || null,
        productName: item.item_name || "Sản phẩm Shopee",
        quantity: item.model_quantity_purchased || 1,
        price: item.model_original_price || 0,
        variantName: item.model_name || null,
        imageUrl: item.image_url || null
      }
    });
  }

  return savedOrder;
}

function mapShopeeStatus(shopeeStatus: string): string {
  switch (shopeeStatus) {
    case "UNPAID":
      return "Chờ xác nhận";
    case "READY_TO_SHIP":
    case "PROCESSED":
      return "Đã xác nhận";
    case "SHIPPED":
      return "Đã chuyển";
    case "COMPLETED":
      return "Đã chuyển";
    case "CANCELLED":
      return "Huỷ bỏ";
    case "TO_RETURN":
      return "Từ chối";
    default:
      return shopeeStatus || "Chờ xác nhận";
  }
}
