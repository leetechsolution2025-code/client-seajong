import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(req: Request) {
  try {
    const { audioUrl } = await req.json();

    if (!audioUrl) {
      return NextResponse.json({ error: 'audioUrl is required' }, { status: 400 });
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY chưa được cấu hình trong .env' }, { status: 500 });
    }

    // Read file from local filesystem
    const filePath = join(process.cwd(), 'public', audioUrl);
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File ghi âm không tồn tại trên server.' }, { status: 404 });
    }

    const fileBuffer = await readFile(filePath);
    const fileBlob = new Blob([fileBuffer], { type: 'audio/webm' });

    const formData = new FormData();
    formData.append('file', fileBlob, 'interview_audio.webm');
    formData.append('model', 'whisper-large-v3');
    formData.append('language', 'vi'); // Vietnamese
    formData.append('response_format', 'verbose_json'); // Get timestamps

    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: formData,
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      console.error('Groq error:', err);
      return NextResponse.json({ error: 'Groq API lỗi: ' + err }, { status: 500 });
    }

    const data = await groqRes.json();

    return NextResponse.json({
      success: true,
      text: data.text,
      segments: data.segments || [],
    });
  } catch (error: any) {
    console.error('Transcription error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
