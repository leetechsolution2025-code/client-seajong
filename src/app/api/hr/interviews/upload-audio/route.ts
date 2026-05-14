import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(req: Request) {
  try {
    const data = await req.formData();
    const file: File | null = data.get('audio') as unknown as File;
    const candidateId = data.get('candidateId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure directory exists
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'interviews');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Create unique filename
    const timestamp = Date.now();
    const filename = `${candidateId || 'unknown'}_${timestamp}.webm`;
    const filepath = join(uploadDir, filename);

    // Write file
    await writeFile(filepath, buffer);

    // Return public URL
    const publicUrl = `/uploads/interviews/${filename}`;
    
    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error: any) {
    console.error('Error uploading audio:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
