import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await req.json();
    const { imageBase64, mimeType: rawMime } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: "Không tìm thấy dữ liệu hình ảnh" }, { status: 400 });
    }

    // Tách base64 data & mimeType
    let base64Data = imageBase64;
    let mimeType = rawMime || "image/jpeg";

    if (imageBase64.includes(";base64,")) {
      const parts = imageBase64.split(";base64,");
      const mimeMatch = parts[0].match(/data:(.*?);/);
      if (mimeMatch && mimeMatch[1]) {
        mimeType = mimeMatch[1];
      }
      base64Data = parts[1];
    }

    const keysStr = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
    const keys = keysStr.split(",").map((k) => k.trim()).filter(Boolean);
    if (keys.length === 0) {
      return NextResponse.json({ error: "Chưa cấu hình GEMINI_API_KEYS trên máy chủ" }, { status: 500 });
    }

    const prompt = `Bạn là chuyên gia phân tích đơn đặt hàng thiết bị vệ sinh, sen vòi phòng tắm của Công ty Cổ phần Seajong Faucet Việt Nam.
Nhiệm vụ của bạn: Đọc và phân tích hình ảnh (ảnh chụp tin nhắn Zalo, sổ tay viết tay, phiếu đặt hàng, bảng kê hàng hoá).
Trích xuất thông tin đơn hàng và trả về DUY NHẤT một chuỗi JSON hợp lệ (không kèm markdown \`\`\`json):

Cấu trúc JSON yêu cầu:
{
  "customerName": "Tên khách hàng hoặc đại lý (ví dụ: HIỀN DÂN, Anh Hoàn, Anh Benza...)",
  "customerPhone": "Số điện thoại nếu có trong ảnh (hoặc rỗng)",
  "customerAddress": "Địa chỉ giao hàng nếu có (hoặc rỗng)",
  "generalNote": "Ghi chú chung của đơn hàng nếu có",
  "items": [
    {
      "rawCode": "Mã sản phẩm viết tắt hoặc đầy đủ (ví dụ: 42S, 42F, 12S, DCK15, PK1666...)",
      "quantity": 20,
      "unit": "bộ hoặc cái",
      "laserName": "Tên bắn laser thương hiệu nếu có (ví dụ: LIHAN, LYON, SEAJONG)",
      "extraNote": "Phụ kiện đi kèm hoặc yêu cầu đặc biệt (ví dụ: DÙNG DÂY CẤP DCK15, ỐNG SUỐT MÓNG NGỰA)"
    }
  ]
}

Quy tắc xử lý:
1. Tách riêng từng mặt hàng. Ví dụ dòng "12S = 5 ( BẮN TÊN LIHAN )" và "12S = 1 ( BẮN TÊN LYON )" là 2 mặt hàng riêng biệt do yêu cầu bắn tên laser khác nhau.
2. Số lượng ("quantity") phải là số nguyên dương.
3. Không bịa đặt thông tin không có trong ảnh. Trả về JSON thuần túy.`;

    const MODELS = [
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-2.0-flash-lite",
      "gemini-1.5-flash"
    ];

    let extractedData: any = null;
    let lastError = "";

    for (const model of MODELS) {
      const shuffled = [...keys].sort(() => Math.random() - 0.5);
      for (const key of shuffled) {
        try {
          const ai = new GoogleGenAI({ apiKey: key });
          const response = await ai.models.generateContent({
            model,
            contents: [
              {
                role: "user",
                parts: [
                  { inlineData: { data: base64Data, mimeType } },
                  { text: prompt },
                ],
              },
            ],
          });

          const text = response.text ?? "";
          if (text) {
            const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
            const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              extractedData = JSON.parse(jsonMatch[0]);
              break;
            }
          }
        } catch (err: any) {
          lastError = err?.message || String(err);
          console.warn(`[ai-scan-order] model=${model} key=...${key.slice(-4)} error:`, lastError);
        }
      }
      if (extractedData) break;
    }

    if (!extractedData) {
      return NextResponse.json({
        error: `Không thể phân tích hình ảnh qua AI. Lỗi: ${lastError || "Không nhận diện được nội dung"}`
      }, { status: 500 });
    }

    // ── Bước 2: Đối soát Khách hàng trong Cơ sở dữ liệu ─────────────────
    let matchedCustomer: any = null;
    const detectedCustName = (extractedData.customerName || "").trim();

    if (detectedCustName) {
      // Tìm kiếm khách hàng theo tên hoặc số điện thoại
      const searchTerms = detectedCustName.split(/\s+/).filter(Boolean);
      const possibleCustomers = await prisma.customer.findMany({
        where: {
          OR: [
            { name: { contains: detectedCustName } },
            { code: { contains: detectedCustName } },
            ...(searchTerms.length > 1 ? searchTerms.map((t: string) => ({ name: { contains: t } })) : [])
          ]
        },
        take: 5
      });

      if (possibleCustomers.length > 0) {
        // Tìm khách hàng khớp nhất
        matchedCustomer = possibleCustomers.find(
          c => c.name.toLowerCase() === detectedCustName.toLowerCase()
        ) || possibleCustomers[0];
      }
    }

    // ── Bước 3: Đối soát Sản phẩm trong Kho hàng Seajong ─────────────────
    const scannedItems: any[] = [];
    const rawItems = Array.isArray(extractedData.items) ? extractedData.items : [];

    for (const rawItem of rawItems) {
      const code = String(rawItem.rawCode || "").trim();
      const qty = Number(rawItem.quantity) || 1;
      const laser = (rawItem.laserName || "").trim();
      const extra = (rawItem.extraNote || "").trim();

      // Ghép ghi chú bắn tên và phụ kiện
      const notesArr: string[] = [];
      if (laser) notesArr.push(`Bắn laser: ${laser}`);
      if (extra) notesArr.push(extra);
      const itemNote = notesArr.join(" | ");

      // Tìm trong bảng InventoryItem
      let matchedInv: any = null;
      if (code) {
        // Thử tìm theo mã chính xác hoặc chứa mã (vd: 42S -> SJ-HH-42S...)
        const invList = await prisma.inventoryItem.findMany({
          where: {
            OR: [
              { code: { contains: code } },
              { tenHang: { contains: code } },
              { model: { contains: code } },
              { maThayThe: { contains: code } }
            ]
          },
          take: 5,
          orderBy: { soLuong: "desc" }
        });

        if (invList.length > 0) {
          // Ưu tiên bản ghi có mã chứa code và còn tồn kho
          matchedInv = invList.find(i => i.code?.toLowerCase().includes(code.toLowerCase())) || invList[0];
        }
      }

      if (matchedInv) {
        scannedItems.push({
          tenHang: matchedInv.tenHang,
          code: matchedInv.code || code,
          donVi: matchedInv.donVi || rawItem.unit || "bộ",
          soLuong: qty,
          donGia: matchedInv.giaBan || 0,
          soLuongTon: matchedInv.soLuong ?? null,
          trangThaiKho: matchedInv.trangThai || "con-hang",
          inventoryId: matchedInv.id,
          ghiChu: itemNote
        });
      } else {
        // Không tìm thấy sản phẩm trong kho nhưng vẫn giữ để nhân viên không mất dữ liệu
        scannedItems.push({
          tenHang: code ? `Mã ${code}` : "Sản phẩm quét từ ảnh",
          code: code || "N/A",
          donVi: rawItem.unit || "bộ",
          soLuong: qty,
          donGia: 0,
          soLuongTon: null,
          trangThaiKho: null,
          inventoryId: null,
          ghiChu: itemNote
        });
      }
    }

    // Ghép ghi chú tổng
    const generalNoteParts: string[] = [];
    if (extractedData.generalNote) generalNoteParts.push(extractedData.generalNote);
    generalNoteParts.push("[Đơn hàng tạo tự động từ quét Camera/Ảnh AI]");
    const finalGeneralNote = generalNoteParts.join("\n");

    return NextResponse.json({
      success: true,
      rawExtracted: extractedData,
      customer: matchedCustomer ? {
        id: matchedCustomer.id,
        code: matchedCustomer.code,
        name: matchedCustomer.name,
        dienThoai: matchedCustomer.dienThoai || extractedData.customerPhone || "",
        address: matchedCustomer.address || extractedData.customerAddress || "",
        nhom: matchedCustomer.nhom || "dai-ly",
        loai: matchedCustomer.loai || ""
      } : {
        id: "",
        code: "",
        name: detectedCustName || "Khách hàng mới",
        dienThoai: extractedData.customerPhone || "",
        address: extractedData.customerAddress || "",
        nhom: "dai-ly",
        loai: ""
      },
      items: scannedItems,
      ghiChu: finalGeneralNote
    });

  } catch (error: any) {
    console.error("[POST /api/sales/ai-scan-order] Lỗi:", error);
    return NextResponse.json({
      error: error?.message || "Lỗi xử lý quét đơn hàng"
    }, { status: 500 });
  }
}
