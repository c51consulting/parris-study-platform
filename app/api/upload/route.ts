import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

export const runtime = 'nodejs';
export const maxDuration = 30;

const AnalysisSchema = z.object({
  score: z.number().optional(),
  maxScore: z.number().optional(),
  percentage: z.number().optional(),
  weakAreas: z.array(z.string()),
  strengths: z.array(z.string()),
  syllabusStrands: z.array(z.string()),
  recommendations: z.array(z.string()),
  teacherNotesSummary: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const teacherNotes = (form.get('teacherNotes') as string) || '';
    const subject = (form.get('subject') as string) || '';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read file content for text-based files
    let fileContent = '';
    if (file.type === 'text/plain') {
      fileContent = await file.text();
    } else {
      // For PDFs and images, we use the filename and teacher notes as context
      fileContent = `[File: ${file.name}, Type: ${file.type}, Size: ${Math.round(file.size / 1024)}KB]`;
    }

    const subjectLabel = subject || 'Victorian Curriculum / VCE';

    const prompt = `You are an expert Victorian Curriculum and VCE assessment analyst.

A student has uploaded an assessment file for analysis.

File: ${file.name}
Subject context: ${subjectLabel}
Teacher comments: ${teacherNotes || 'None provided'}
File content/metadata: ${fileContent.slice(0, 2000)}

Based on the filename, teacher comments, and any available content, provide a structured assessment analysis.

If you cannot determine specific scores from the content, omit score fields.
Identify likely weak areas and strengths based on the subject and any available information.
Map weak areas to VCAA syllabus strands (e.g. "Number and Algebra", "Research Methods", "Reading and Viewing").
Provide 2-3 actionable recommendations for improvement.

Be helpful and constructive. If information is limited, make reasonable inferences based on the subject area.`;

    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: AnalysisSchema,
      prompt,
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
