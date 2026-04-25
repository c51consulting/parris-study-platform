import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { retrieveDescriptors, formatDescriptorsForPrompt } from '@/lib/curriculum/retrieve';

export const runtime = 'nodejs';
export const maxDuration = 30;

const QuestionSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()).min(2).max(6),
      answer: z.string(),
      explanation: z.string(),
      vcaaCode: z.string().optional().default(''),
    })
  ),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subject, difficulty, count = 5 } = body as {
      subject: string;
      difficulty: string;
      count?: number;
    };

    if (!subject || !difficulty) {
      return NextResponse.json({ error: 'subject and difficulty are required' }, { status: 400 });
    }

    // Get relevant curriculum descriptors
    const descriptors = retrieveDescriptors({ subject, limit: 8 });
    const context = formatDescriptorsForPrompt(descriptors);

    const bloomMap: Record<string, string> = {
      Foundation: "recall and understand (Bloom's levels 1–2)",
      Standard: "apply and analyse (Bloom's levels 3–4)",
      Advanced: "evaluate and create (Bloom's levels 5–6)",
    };
    const bloomTarget = bloomMap[difficulty] ?? 'apply and analyse';

    const prompt = `You are an expert Victorian Curriculum and VCE assessment writer.

Generate exactly ${count} multiple-choice questions for the following:
- Subject: ${subject}
- Difficulty: ${difficulty} (target ${bloomTarget})

Use the VCAA curriculum descriptors below as your source of truth. Each question must be grounded in at least one descriptor.

VCAA DESCRIPTORS:
${context}

Requirements:
- Each question must have exactly 4 options. The "options" array must contain exactly 4 strings (do NOT include letter prefixes like A., B., etc. — just the text).
- The "answer" field must exactly match one of the 4 option strings.
- The "explanation" must be 1–2 sentences explaining why the answer is correct.
- The "vcaaCode" must be the relevant descriptor code string (e.g. "VCMNA329"). Always provide this field.
- Questions must be clearly worded and unambiguous.
- Do NOT repeat questions.`;

    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: QuestionSchema,
      prompt,
    });

    // Clean up vcaaCode — remove empty strings
    const questions = result.object.questions.map(q => ({
      ...q,
      vcaaCode: q.vcaaCode || undefined,
    }));

    return NextResponse.json({ questions });
  } catch (err: unknown) {
    console.error('[quiz] error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
