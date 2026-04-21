import { openai } from '@ai-sdk/openai';
import { streamText, convertToModelMessages, UIMessage } from 'ai';
import { retrieveDescriptors, formatDescriptorsForPrompt } from '@/lib/curriculum/retrieve';

export const maxDuration = 30;

function buildSystem(context: string, subject?: string, yearLevel?: string) {
  return `You are an elite Victorian-curriculum-aligned tutor for Parris Study Platform.
Audience: ${yearLevel ?? 'Year 10 / VCE'} student${subject ? ' studying ' + subject : ''}.

RULES:
- Ground every explanation in the VCAA descriptors supplied below. Cite the [CODE] you rely on.
- Adapt depth and vocabulary to the student's demonstrated level across the conversation.
- Use the Socratic method: ask one diagnostic question, then teach, then check understanding.
- Never fabricate VCAA codes. If no descriptor matches, say so and teach from first principles.
- Prefer worked examples, step-by-step reasoning, and Bloom's-taxonomy laddering (recall → apply → analyse → evaluate → create).
- Offer a short practice task at the end of each substantive reply.

RELEVANT VCAA DESCRIPTORS:
${context}`;
}

export async function POST(req: Request) {
  const body = await req.json();
  const messages: UIMessage[] = body.messages ?? [];
  const subject: string | undefined = body.subject;
  const yearLevel: string | undefined = body.yearLevel;

  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const query =
    (lastUser?.parts ?? [])
      .map((p) => (p.type === 'text' ? (p as { type: 'text'; text: string }).text : ''))      .join(' ')
      .slice(0, 500) || '';

  const descriptors = retrieveDescriptors({ subject, yearLevel, query, limit: 6 });
  const context = formatDescriptorsForPrompt(descriptors);

  const result = streamText({
    model: openai('gpt-4o-mini'),
    system: buildSystem(context, subject, yearLevel),
    messages: await convertToModelMessages(messages),
  });
  return result.toUIMessageStreamResponse();
}
