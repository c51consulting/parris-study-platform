import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { retrieveDescriptors, formatDescriptorsForPrompt } from '@/lib/curriculum/retrieve';

export const runtime = 'nodejs';
export const maxDuration = 30;

// OpenAI structured outputs require ALL properties to be in `required`.
// So we keep the schema flat with no optional fields.
const QuestionSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()),
      answer: z.string(),
      explanation: z.string(),
      code: z.string(), // VCAA descriptor code, e.g. "VCMNA329" — always required
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

Use the VCAA curriculum descriptors below as your source of truth.

VCAA DESCRIPTORS:
${context}

Requirements for each question:
- "question": a clear, unambiguous question string
- "options": an array of exactly 4 strings (no letter prefixes — just the answer text)
- "answer": must exactly match one of the 4 option strings
- "explanation": 1–2 sentences explaining why the answer is correct
- "code": the VCAA descriptor code this question is based on (e.g. "PSY-U1-AoS1-1"). Use the codes from the descriptors above. If none match, use "VCAA".
- Do NOT repeat questions.`;

    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: QuestionSchema,
      prompt,
    });

    // Reshape to the format the frontend expects
    const questions = result.object.questions.map(q => ({
      question: q.question,
      options: q.options,
      answer: q.answer,
      explanation: q.explanation,
      vcaaCode: q.code !== 'VCAA' ? q.code : undefined,
    }));

    return NextResponse.json({ questions });
  } catch (err: unknown) {
    console.error('[quiz] error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
