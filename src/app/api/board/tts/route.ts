import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function writeTtsLog(message: string, data: any) {
  try {
    const logPath = path.join(process.cwd(), "debug_tts.log");
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message} - ${JSON.stringify(data)}\n`;
    fs.appendFileSync(logPath, logLine, "utf-8");
  } catch (e) {
    console.error("Failed to write to debug_tts.log", e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, apiKey, voiceId } = body;

    writeTtsLog("Received request", {
      textLength: text?.length,
      apiKeyMasked: apiKey ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : "not provided",
      voiceId: voiceId
    });

    if (!text) {
      writeTtsLog("Validation failed", { error: "Thiếu văn bản cần đọc" });
      return NextResponse.json({ error: "Thiếu văn bản cần đọc" }, { status: 400 });
    }

    // Prioritize user-provided key, fallback to server environment variable
    const elApiKey = apiKey || process.env.ELEVENLABS_API_KEY;
    if (!elApiKey) {
      writeTtsLog("Validation failed", { error: "Chưa cấu hình API Key ElevenLabs" });
      return NextResponse.json({ 
        error: "Chưa cấu hình API Key ElevenLabs. Vui lòng nhập API Key trong phần thiết lập trợ lý." 
      }, { status: 400 });
    }

    const selectedVoiceId = voiceId || "21m00Tcm4TlvDq8ikWAM"; // Default voice: Rachel
    writeTtsLog("Selected voice ID", { selectedVoiceId });

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elApiKey,
          "Content-Type": "application/json",
          "accept": "audio/mpeg"
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2", // Multilingual model supports Vietnamese
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      writeTtsLog("ElevenLabs API call failed", { status: response.status, responseBody: errText });
      return NextResponse.json({ error: `ElevenLabs API: ${errText}` }, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();
    writeTtsLog("ElevenLabs API call succeeded", { bufferSize: audioBuffer.byteLength });
    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg"
      }
    });
  } catch (err: any) {
    writeTtsLog("Server error occurred", { error: err?.message || err });
    console.error("[POST /api/board/tts] Error:", err);
    return NextResponse.json({ error: err?.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
