import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
  // TODO: stream to object storage and queue a Railway worker job for parsing.
  return NextResponse.json({
    filename: file.name,
    size: file.size,
    status: 'queued',
    note: 'Upload received. Background parsing + OpenAI extraction handled by Railway worker.',
  });
}
