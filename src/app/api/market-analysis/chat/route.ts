import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

async function generateChatResponse(messages: any[]): Promise<string> {
  const keysStr = process.env.GEMINI_API_KEYS || "";
  const keys = keysStr.split(',').map(k => k.trim()).filter(Boolean);
  if (keys.length === 0) throw new Error("Chưa cấu hình GEMINI_API_KEYS");
  const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash-lite"];

  const systemInstruction = `Bạn là Trợ lý AI chuyên gia phân tích thị trường thiết bị vệ sinh, phòng tắm và thiết bị nhà bếp tại Việt Nam, làm việc cho thương hiệu Seajong Faucet (định vị sản phẩm cao cấp, thông minh, công nghệ Hàn Quốc).
Nhiệm vụ của bạn là tư vấn cho nhân viên Marketing/Kinh doanh của Seajong về xu hướng thiết kế, đối thủ cạnh tranh (TOTO, Inax, Viglacera, American Standard, Kohler...), hành vi mua hàng của kiến trúc sư, nhà thầu và khách hàng lẻ tại Việt Nam.

Quy tắc trả lời:
- Luôn trả lời bằng tiếng Việt.
- Chuyên nghiệp, thực tế, ngắn gọn, có số liệu minh họa giả định thực tế nếu cần.
- Đưa ra lời khuyên hành động thực tiễn cho thương hiệu Seajong.`;

  // Format messages into contents for @google/genai SDK
  const formattedContents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  for (const key of keys) {
    for (const model of MODELS) {
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        const res = await ai.models.generateContent({
          model,
          contents: formattedContents,
          config: {
            systemInstruction
          }
        });
        return res.text || "Xin lỗi, tôi không thể xử lý yêu cầu lúc này.";
      } catch (err: any) {
        console.warn(`[AI Chat Fallback] ${model} failed:`, err.message?.slice(0, 80));
      }
    }
  }
  throw new Error("Tất cả model AI đều thất bại");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages } = body;
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Thiếu dữ liệu cuộc hội thoại" }, { status: 400 });
    }

    const reply = await generateChatResponse(messages);
    return NextResponse.json({ success: true, reply });
  } catch (error: any) {
    console.error('[/api/market-analysis/chat] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
