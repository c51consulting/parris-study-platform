import { openai } from '@ai-sdk/openai';
import { streamText, convertToModelMessages, UIMessage } from 'ai';
import { retrieveDescriptors, formatDescriptorsForPrompt } from '@/lib/curriculum/retrieve';
import { prisma } from '@/lib/prisma';

export const maxDuration = 30;
export const runtime = 'nodejs';

function buildSystem(
  context: string,
  subject?: string,
  yearLevel?: string,
  learner?: { strengths: string[]; weakAreas: string[]; preferredStyle: string; vocabLevel: string; notes?: string | null }
) {
  const learnerBlock = learner
    ? `\nLEARNER PROFILE:\n- Year level: ${yearLevel ?? learner.vocabLevel}\n- Preferred style: ${learner.preferredStyle}\n- Strengths: ${learner.strengths.join(', ') || 'n/a'}\n- Weak areas: ${learner.weakAreas.join(', ') || 'n/a'}\n- Notes: ${learner.notes ?? 'n/a'}\n`
    : '';

  return `You are an elite Victorian-curriculum-aligned tutor for Parris Study Platform.
Audience: ${yearLevel ?? 'Year 10 / VCE'} student${subject ? ' studying ' + subject : ''}.
${learnerBlock}
RULES:
- Ground every explanation in the VCAA descriptors supplied below. Cite the [CODE] you rely on.
- Adapt depth and vocabulary to the student's demonstrated level; lean into strengths, target weak areas.
- Use the Socratic method: ask one diagnostic question, then teach, then check understanding.
- Never fabricate VCAA codes. If no descriptor matches, say so and teach from first principles.
- Prefer worked examples, step-by-step reasoning, and Bloom's-taxonomy laddering (recall → apply → analyse → evaluate → create).
- Offer a short practice task at the end of each substantive reply.

RELEVANT VCAA DESCRIPTORS:
${context}`;
}

interface TutorBody {
  messages?: UIMessage[];
  subject?: string;
  yearLevel?: string;
  studentId?: string;
  threadId?: string;
}

export async function POST(req: Request) {
  const body = (await req.json()) as TutorBody;
  const messages: UIMessage[] = body.messages ?? [];
  const { subject, yearLevel, studentId, threadId } = body;

  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const query =
    (lastUser?.parts ?? [])
      .map((p) => (p.type === 'text' ? (p as { type: 'text'; text: string }).text : ''))
      .join(' ')
      .slice(0, 500) || '';

  // Prefer DB-backed descriptors; fall back to in-memory seed.
  let context: string;
  try {
    const dbMatches = await prisma.curriculumDescriptor.findMany({
      where: {
        ...(subject ? { subject } : {}),
        ...(yearLevel ? { yearLevel } : {}),
        ...(query
          ? {
              OR: [
                { text: { contains: query.slice(0, 80), mode: 'insensitive' } },
                { strand: { contains: query.slice(0, 40), mode: 'insensitive' } },
                { keywords: { hasSome: query.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 8) } },
              ],
            }
          : {}),
      },
      take: 6,
    });
    if (dbMatches.length > 0) {
      context = dbMatches
        .map(
          (d) =>
            `- [${d.code}] ${d.yearLevel} ${d.subject} — ${d.strand}${
              d.substrand ? ' / ' + d.substrand : ''
            }: ${d.text}`
        )
        .join('\n');
    } else {
      context = formatDescriptorsForPrompt(retrieveDescriptors({ subject, yearLevel, query, limit: 6 }));
    }
  } catch {
    context = formatDescriptorsForPrompt(retrieveDescriptors({ subject, yearLevel, query, limit: 6 }));
  }

  // Load learner summary (habit learning)
  let learner: Parameters<typeof buildSystem>[3] = undefined;
  if (studentId) {
    try {
      const s = await prisma.learnerSummary.findUnique({ where: { studentId } });
      if (s) {
        learner = {
          strengths: s.strengths,
          weakAreas: s.weakAreas,
          preferredStyle: s.preferredStyle,
          vocabLevel: s.vocabLevel,
          notes: s.notes,
        };
      }
    } catch {}
  }

  // Persist the user turn (best-effort)
  if (studentId) {
    try {
      if (threadId) {
        const existing = await prisma.tutorThread.findUnique({ where: { id: threadId } });
        const prior = Array.isArray(existing?.messages) ? (existing!.messages as unknown[]) : [];
        await prisma.tutorThread.update({
          where: { id: threadId },
          data: { messages: [...prior, ...messages.slice(-1)] as object[] },
        });
      } else {
        await prisma.tutorThread.create({
          data: {
            studentId,
            topic: subject ?? null,
            messages: messages as unknown as object[],
          },
        });
      }
    } catch {}
  }

  const result = streamText({
    model: openai('gpt-4o-mini'),
    system: buildSystem(context, subject, yearLevel, learner ?? undefined),
    messages: await convertToModelMessages(messages),
  });
  return result.toUIMessageStreamResponse();
}
