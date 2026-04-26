import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024; // 4MB safe limit for Vercel serverless body

const AnalysisSchema = z.object({
  score: z.number().nullable(),
  maxScore: z.number().nullable(),
  percentage: z.number().nullable(),
  weakAreas: z.array(z.string()).nullable(),
  strengths: z.array(z.string()).nullable(),
  syllabusStrands: z.array(z.string()).nullable(),
  recommendations: z.array(z.string()).nullable(),
  teacherNotesSummary: z.string().nullable(),
});

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const { extractText, getDocumentProxy } = await import('unpdf');
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    return Array.isArray(text) ? text.join('\n') : (text || '');
  } catch (e) {
    console.error('[upload] pdf extract failed:', e);
    return '';
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'AI not configured: OPENAI_API_KEY missing on the server.' },
        { status: 503 }
      );
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json(
        { error: 'Invalid upload. Please retry with a smaller file (max 4MB).' },
        { status: 400 }
      );
    }

    const file = form.get('file') as File | null;
    const teacherNotes = (form.get('teacherNotes') as string) || '';
    const subject = (form.get('subject') as string) || '';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large (${Math.round(file.size / 1024 / 1024)}MB). Max 4MB on this plan.` },
        { status: 413 }
      );
    }

    const subjectLabel = subject || 'Victorian Curriculum / VCE';
    const isImage = file.type.startsWith('image/');
    const isText = file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    let textContent = '';
    let imageDataUrl: string | null = null;

    if (isText) {
      textContent = (await file.text()).slice(0, 12000);
    } else if (isImage) {
      const buf = Buffer.from(await file.arrayBuffer());
      imageDataUrl = `data:${file.type};base64,${buf.toString('base64')}`;
    } else if (isPdf) {
      const buf = Buffer.from(await file.arrayBuffer());
      const extracted = await extractPdfText(buf);
      if (extracted && extracted.trim().length > 0) {
        textContent = extracted.slice(0, 12000);
      } else {
        textContent = `[PDF: ${file.name}, ${Math.round(file.size / 1024)}KB. Text could not be extracted; analyse from filename, subject, and teacher notes.]`;
      }
    } else {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type || 'unknown'}. Use PDF, JPG, PNG, or TXT.` },
        { status: 415 }
      );
    }

    const systemPrompt = `You are an expert Victorian Curriculum and VCE assessment analyst. Analyse the uploaded student assessment and return a structured analysis. Map weak areas to VCAA syllabus strands (e.g. "Number and Algebra", "Research Methods", "Reading and Viewing"). Provide 2-3 actionable recommendations. If you cannot determine a numeric score, omit score fields. Always return the required arrays (use [] if truly nothing).`;

    const userText = `File: ${file.name}
Subject: ${subjectLabel}
Teacher comments: ${teacherNotes || 'None provided'}

Content:
${textContent || '(see attached image)'}`;

    const messages = isImage
      ? [
          {
            role: 'user' as const,
            content: [
              { type: 'text' as const, text: userText },
              { type: 'image' as const, image: imageDataUrl! },
            ],
          },
        ]
      : [{ role: 'user' as const, content: userText }];

    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: AnalysisSchema,
      system: systemPrompt,
      messages,
    });

    return NextResponse.json({
      filename: file.name,
      size: file.size,
      status: 'analysed',
      analysis: result.object,
    });
  } catch (err: unknown) {
    console.error('[upload] error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Analysis failed: ${message}` },
      { status: 500 }
    );
  }
}
