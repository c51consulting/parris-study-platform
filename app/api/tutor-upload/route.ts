import { NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/tutor-upload
 *
 * Accepts multipart/form-data with a single "file" field.
 * Returns { text: string, filename: string, type: string }
 *
 * Extracts the plain-text content of the file so it can be injected
 * into the AI Tutor conversation as context.  This route does NOT
 * perform assessment analysis, grading, or syllabus tagging.
 *
 * Supported types:
 *   text/* / application/json / application/xml  → read directly
 *   application/pdf                              → extract via unpdf
 *   image/*                                      → OCR via GPT-4o-mini vision
 */
export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'AI not configured: OPENAI_API_KEY missing on the server.' },
        { status: 503 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File exceeds the 10 MB limit.' }, { status: 400 });
    }

    const mime = file.type;
    const filename = file.name;
    let extractedText = '';

    // ── Plain text variants ────────────────────────────────────────────────
    if (
      mime.startsWith('text/') ||
      mime === 'application/json' ||
      mime === 'application/xml'
    ) {
      extractedText = await file.text();
      if (extractedText.length > 8000) {
        extractedText =
          extractedText.slice(0, 8000) +
          '\n\n[… content truncated at 8 000 characters …]';
      }
    }

    // ── PDF ────────────────────────────────────────────────────────────────
    else if (mime === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
      try {
        const { extractText, getDocumentProxy } = await import('unpdf');
        const buffer = Buffer.from(await file.arrayBuffer());
        const pdf = await getDocumentProxy(new Uint8Array(buffer));
        const { text } = await extractText(pdf, { mergePages: true });
        extractedText = (Array.isArray(text) ? text.join('\n') : text ?? '').trim();
        if (extractedText.length > 8000) {
          extractedText =
            extractedText.slice(0, 8000) +
            '\n\n[… content truncated at 8 000 characters …]';
        }
        if (!extractedText) {
          extractedText =
            '[PDF contained no extractable text — it may be a scanned image. ' +
            'Try uploading as a JPG or PNG instead.]';
        }
      } catch {
        extractedText =
          '[Could not extract text from this PDF. It may be password-protected or image-only. ' +
          'Try uploading as a JPG or PNG instead.]';
      }
    }

    // ── Images → GPT-4o-mini vision OCR ───────────────────────────────────
    else if (mime.startsWith('image/')) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const base64 = buffer.toString('base64');
        const dataUrl = `data:${mime};base64,${base64}`;

        const { text } = await generateText({
          model: openai('gpt-4o-mini'),
          maxOutputTokens: 1500,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text:
                    'Transcribe ALL text visible in this image exactly as written, ' +
                    'preserving structure (headings, bullet points, tables, equations). ' +
                    'Output only the transcribed text — no commentary.',
                },
                {
                  type: 'image',
                  image: dataUrl,
                },
              ],
            },
          ],
        });

        extractedText = text?.trim() ?? '';
        if (!extractedText) {
          extractedText = '[No text could be detected in this image.]';
        }
      } catch (err) {
        console.error('Vision OCR error:', err);
        extractedText =
          '[Could not read text from this image. ' +
          'Please try a clearer scan or a text-based file.]';
      }
    }

    // ── Unsupported ────────────────────────────────────────────────────────
    else {
      return NextResponse.json(
        {
          error: `Unsupported file type: ${mime || 'unknown'}. ` +
                 'Please upload a PDF, image (JPG/PNG), or text file.',
        },
        { status: 415 }
      );
    }

    return NextResponse.json({ text: extractedText, filename, type: mime });
  } catch (err) {
    console.error('tutor-upload error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while reading the file.' },
      { status: 500 }
    );
  }
}
