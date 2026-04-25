import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

function getKeys(): string[] {
  return (process.env.GEMINI_API_KEYS || "")
    .split(",").map(k => k.trim()).filter(Boolean);
}

async function generateWithFallback(prompt: string): Promise<string> {
  const keys = getKeys();
  if (!keys.length) throw new Error("Chưa cấu hình GEMINI_API_KEYS");
  const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash-lite"];
  for (const model of MODELS) {
    const shuffled = [...keys].sort(() => Math.random() - 0.5);
    for (const key of shuffled) {
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        const response = await ai.models.generateContent({ model, contents: prompt });
        const text = response.text ?? "";
        if (text) return text;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (
          msg.includes("429") || 
          msg.includes("quota") || 
          msg.includes("403") || 
          msg.includes("404") ||
          msg.includes("503") ||
          msg.includes("500") ||
          msg.includes("UNAVAILABLE") ||
          msg.includes("demand")
        ) {
          continue;
        }
        throw err;
      }
    }
  }
  throw new Error("Hệ thống AI của Google hiện đang quá tải (hoặc API Key hết hạn ngạch) trên tất cả các Model dự phòng. Vui lòng thử lại sau ít phút.");
}

// Remove markdown formatting characters that look ugly in social posts
function stripMarkdown(text: string): string {
  return text
    // 1. Strip bold/italic combos first (order matters)
    .replace(/\*{3}([^*]+)\*{3}/g, "$1")           // ***bold italic***
    .replace(/\*\*([\s\S]+?)\*\*/g, "$1")           // **bold** (multiline safe)
    .replace(/__([\s\S]+?)__/g, "$1")               // __bold__
    // 2. Convert bullet lines (any * or - at start with any amount of whitespace)
    .replace(/^\*+\s+/gm, "• ")                     // *   text  -> • text
    .replace(/^-\s+/gm, "• ")                       // - text    -> • text
    // 3. Remove any remaining standalone asterisks
    .replace(/\*/g, "")
    // 4. Strip heading markers
    .replace(/^#{1,6}\s*/gm, "")
    // 5. Strip italic underscore
    .replace(/_([^_]+)_/g, "$1")
    // 6. Strip inline code
    .replace(/`([^`]+)`/g, "$1")
    // 7. Strip markdown links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // 8. Collapse 3+ blank lines to max 2
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}


export async function POST(req: NextRequest) {
  try {
    const { product, format, style, persona, wordLimit, specs, categories, description } = await req.json() as {
      product: string;
      format: string;
      style: string;
      persona: string;
      wordLimit: string;
      specs: Record<string, string>;
      categories: string[];
      description: string;
    };

    if (!product?.trim()) {
      return NextResponse.json({ error: "Thiếu thông tin sản phẩm" }, { status: 400 });
    }

    // Build USP from specs
    const uspLines = Object.entries(specs).slice(0, 5).map(([k, v]) => `- ${k}: ${v}`).join("\n");
    const catStr   = categories.join(", ") || "thiết bị nội thất";
    const descStr  = description ? description.substring(0, 800) : "";

    // ── Channel-specific instructions ──────────────────────────────────────────
    const channelRules: Record<string, string> = {
      "Facebook Post": `
1. Facebook Post (Bài đăng tương tác & bán hàng)
- Độ dài: ${wordLimit} từ (ưu tiên từ 200-300 từ nếu wordLimit không được chỉ định).
- Giọng văn: Thu hút, tự nhiên, đánh trúng tâm lý (nỗi đau) của khách hàng ngay 2 câu đầu. Giọng ${style}.
- Cấu trúc BẮT BUỘC:
  + Tiêu đề in hoa giật tít (1 dòng)
  + Khơi gợi vấn đề / nỗi đau (2-3 câu)
  + Đưa ra giải pháp là sản phẩm (2-3 câu)
  + Gạch đầu dòng lợi ích chính (3-5 điểm, có emoji)
  + Ưu đãi / chính sách (giao hàng, bảo hành)
  + Call to Action rõ ràng
  + 4-6 Hashtag
  + Sử dụng emoji hợp lý để ngắt đoạn.`,

      "Zalo Story": `
2. Zalo Story (Nội dung hiển thị 24h)
- Độ dài: Cực kỳ ngắn gọn, tối đa 40 chữ (người dùng lướt qua rất nhanh).
- Giọng văn: Trực diện, tạo cảm giác khan hiếm hoặc tò mò. Giọng ${style}.
- Cấu trúc BẮT BUỘC:
  + 1 câu Headline giật gân (in hoa, tạo tò mò hoặc khan hiếm)
  + Yêu cầu hành động mạnh mẽ (VD: "Nhấn xem ngay!", "Mua ngay")
  + Bổ sung: 1 dòng [GỢI Ý NỀN] mô tả hình ảnh/video nên dùng để thiết kế`,

      "Email": `
3. Email Marketing (Email chào hàng/chăm sóc)
- Độ dài: ${wordLimit} từ (ưu tiên 150-250 từ).
- Giọng văn: Chuyên nghiệp, lịch sự, mang tính cá nhân hóa. Giọng ${style}.
- Cấu trúc BẮT BUỘC:
  + Subject Line: Đề xuất 3 lựa chọn tiêu đề email gây tò mò, tỷ lệ mở cao (dưới 50 ký tự mỗi cái)
  + Lời chào: "Chào anh/chị [Tên],"
  + Mở bài: Nêu ngay lý do gửi email mang lại giá trị
  + Thân bài: Gạch đầu dòng lợi ích thiết thực (3-5 điểm)
  + CTA: 1 Nút bấm kêu gọi hành động nổi bật (dạng [CTA: "Nội dung nút"])
  + Chữ ký: Trân trọng, Seajong`,

      "Script Video": `
4. Script Video (Kịch bản Video ngắn 30-45 giây)
- Trình bày dạng bảng 2 cột:
  | HÌNH ẢNH / GÓC QUAY / CHỮ MÀNG HÌNH | LỜI THOẠI VOICE-OFF |
- Cấu trúc BẮT BUỘC:
  + Hook (0-3s): Câu nói/Hình ảnh gây sốc hoặc gãi đúng chỗ ngứa
  + Body (4-35s): Giới thiệu nhanh giải pháp, show sản phẩm thực tế, nêu 3 lợi ích chính
  + Outro & CTA (35-45s): Kêu gọi click link, nhịp độ nhanh, dứt khoát
- Giọng ${style}, hướng đến ${persona}`,

      "Tin nhắn Zalo": `
5. Tin nhắn Zalo (ZNS / Broadcast)
- Độ dài: Dưới 100 từ (đọc trọn trên màn hình không cần cuộn).
- Giọng văn: Thông báo trực diện, chăm sóc ân cần. Giọng ${style}.
- Cấu trúc BẮT BUỘC:
  + Lời chào: "Dạ chào Anh/Chị [Tên],"
  + Cung cấp ngay thông tin sản phẩm/ưu đãi
  + Lợi ích tóm gọn trong 1 câu
  + Nút bấm CTA (dạng [NÚT: "Nội dung nút"])`,

      "Landing Page": `
6. Landing Page (Copy cho trang đích)
- Độ dài: ${wordLimit} từ, đủ để thuyết phục nhưng không lan man.
- Giọng văn: Thuyết phục, hướng dẫn hành động. Giọng ${style}.
- Cấu trúc BẮT BUỘC:
  + Hero Section: Headline chính (1 câu power) + Sub-headline (1-2 câu)
  + Pain Point: Nêu vấn đề khách hàng gặp phải
  + Giải pháp: Giới thiệu sản phẩm như giải pháp duy nhất
  + Lợi ích: 4-6 bullet points có icon/emoji
  + Social Proof: 2 câu chứng thực giả định
  + CTA Section: Nút CTA mạnh mẽ + Cam kết (bảo hành, hoàn tiền...)`,
    };

    const selectedRule = channelRules[format] || channelRules["Facebook Post"];

    // Contact footer — appended to every post
    const contactFooter = format === "Email" || format === "Script Video"
      ? `\n\n---\nSeajong - Bath & Kitchen Korea\n📞 Hotline: 1900.633.862 | 🌐 seajong.com`
      : `\n\n-------------------------------\nSEAJONG - Bath & Kitchen Korea\n◾ Hotline: 1900.633.862\n◾ Liên hệ Bộ phận phát triển kinh doanh Đại lý: 0876558558\n◾ Website: https://seajong.com/\n◾ Zalo: https://zalo.me/2988861514672301984\n◾ Instagram: https://www.instagram.com/seajong.official/\n◾ Tiktok: https://www.tiktok.com/@seajong.official\n◾ Youtube: https://www.youtube.com/@seajong.official\n#Seajong #Bath #Kitchen #Korea #ThietBiVeSinh #ThietBiNhaBep #HanQuoc`;

    const prompt = `Bạn là một Chuyên gia Copywriter và Digital Marketing thực chiến. Nhiệm vụ của bạn là viết nội dung quảng cáo cho sản phẩm dưới đây, tùy biến riêng cho kênh được yêu cầu.

[THÔNG TIN SẢN PHẨM]
- Tên sản phẩm: ${product}
- Danh mục: ${catStr}
- Điểm bán hàng độc nhất (USP) / Thông số kỹ thuật:
${uspLines || "  - Chất liệu cao cấp, bền bỉ\n  - Thiết kế tinh tế, hiện đại\n  - Bảo hành chính hãng dài hạn"}
- Mô tả sản phẩm: ${descStr || "Sản phẩm chất lượng cao từ thương hiệu Seajong"}
- Chân dung khách hàng mục tiêu: ${persona}
- Phong cách viết yêu cầu: ${style}
- Thương hiệu: Seajong — thương hiệu thiết bị vệ sinh & nhà bếp cao cấp, uy tín hơn 10 năm tại Việt Nam
- Link: seajong.com
- Ưu đãi: Giao hàng miễn phí toàn quốc, bảo hành chính hãng, đổi trả 30 ngày

[KÊNH CẦN VIẾT]
${selectedRule}

[YÊU CẦU CHUNG - BẮT BUỘC]
- Viết HOÀN TOÀN bằng Tiếng Việt
- Giới hạn: khoảng ${wordLimit} từ
- KHÔNG viết lời giải thích hay tiêu đề như "Đây là bài viết của tôi:", chỉ trả về nội dung quảng cáo thực tế
- Nội dung phải chi tiết, sinh động, sẵn sàng đăng lên nền tảng ngay
- Sử dụng emoji phù hợp với kênh
- CTA phải cụ thể, kêu gọi hành động rõ ràng
- KHÔNG tự thêm thông tin liên hệ cuối bài — hệ thống sẽ tự động thêm vào
- KHÔNG sử dụng markdown như **, *, ##, __. Thay vào đó: dùng • hoặc emoji cho gạch đầu dòng, IN HOA cho tiêu đề
- Viết như bài đăng thực tế trên mạng xã hội, không phải văn bản word`;

    const content = await generateWithFallback(prompt);
    const finalContent = stripMarkdown(content) + contactFooter;

    return NextResponse.json({ success: true, content: finalContent });

  } catch (err) {
    console.error("[ad-generate] error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
