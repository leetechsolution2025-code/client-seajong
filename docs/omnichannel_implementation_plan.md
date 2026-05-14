# Implementation Plan: Shopee Omnichannel Integration

This plan outlines the steps to build a professional omnichannel sales support system, focusing on Shopee as the primary channel.

## 1. Database Schema Updates
We need to store connection details and link external orders to our internal system.

- **`ChannelConnection` Table**:
  - `id`: Primary key.
  - `platform`: 'SHOPEE', 'LAZADA', 'TIKTOK'.
  - `shopName`: Friendly name for the store.
  - `shopId`: External Shop ID from Shopee.
  - `accessToken`: Current session token.
  - `refreshToken`: Token used to renew access.
  - `expiresAt`: Expiration timestamp.
  - `status`: 'ACTIVE', 'EXPIRED', 'DISCONNECTED'.

- **`OmnichannelOrder` Table**:
  - `id`: Internal ID.
  - `externalOrderId`: Shopee's order ID.
  - `channelId`: Reference to `ChannelConnection`.
  - `rawPayload`: JSON blob of the original order data.
  - `syncStatus`: 'PENDING', 'SUCCESS', 'FAILED'.
  - `internalOrderId`: (Optional) Link to the system's main `Order` table.

## 2. Backend Integration (Shopee API)
Focusing on the official Shopee Open Platform.

- **OAuth 2.0 Flow**:
  - Implement a route `/api/sales/omnichannel/auth/shopee` to initiate authorization.
  - Implement a callback route `/api/sales/omnichannel/auth/shopee/callback` to handle the `code` and exchange it for tokens.
- **Webhook Listener**:
  - Create `/api/webhooks/shopee` to receive `ORDER_STATUS` notifications from Shopee.
  - Logic: Validate signature -> Parse payload -> Update/Create local order record.
- **Background Sync (Cron)**:
  - Implement a scheduled job (using `node-cron` or similar) to refresh tokens and pull missing orders.

## 3. Frontend Development
Enhancing the existing `src/app/(dashboard)/sales/omnichannel/page.tsx`.

### A. Dashboard Overview
- **KPI Cards**: Modern, vibrant cards showing "Hôm nay", "Đợi xử lý", "Cần in vận đơn".
- **Channel Status**: A small section showing connection health (Green for Active, Red for Disconnected).

### B. Centralized Order Table
- **Columns**: Channel (Logo Shopee), Order ID, Customer, Amount, Status (Shopee status vs Local status), Sync Time.
- **Actions**:
  - "Đồng bộ ngay" (Force Sync).
  - "Chi tiết" (View order details).
  - "Xác nhận đơn" (Push confirmation to Shopee).

### C. Connection Management
- A modal/offcanvas to add a new Shopee shop by entering Partner credentials.

## 4. Automation Logic
- **Inventory Trigger**: When an order is synced, automatically reserve stock in the internal inventory.
- **Auto-Reply**: (Optional) Send a "Thank you" message via Shopee Chat API when an order is created.

## 5. Security & Stability
- **Encryption**: Encrypt `accessToken` and `refreshToken` at rest.
- **Retries**: Implement an exponential backoff mechanism for failed webhook processing.
- **Logging**: Detailed logs for every sync attempt to troubleshoot API issues.

---

### Next Steps
1. **Developer Setup**: Obtain `Partner ID` and `Partner Key` from Shopee.
2. **UI Prototype**: Build the Dashboard and Table with mock data to finalize the look and feel.
3. **Backend Core**: Setup the OAuth flow and Token management.
