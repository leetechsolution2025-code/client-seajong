import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { apiKey } = body;

    const elApiKey = apiKey || process.env.ELEVENLABS_API_KEY;
    if (!elApiKey) {
      return NextResponse.json({ error: "Chưa cấu hình API Key ElevenLabs" }, { status: 400 });
    }

    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      method: "GET",
      headers: {
        "xi-api-key": elApiKey,
        "accept": "application/json"
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `ElevenLabs API: ${errText}` }, { status: response.status });
    }

    const data = await response.json();
    
    // Format and return voices list
    const voices = data.voices.map((v: any) => ({
      voiceId: v.voice_id,
      name: v.name,
      category: v.category,
      previewUrl: v.preview_url,
      labels: v.labels
    }));

    return NextResponse.json({ voices });
  } catch (err: any) {
    console.error("[POST /api/board/tts/voices] Error:", err);
    return NextResponse.json({ error: err?.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
