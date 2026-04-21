import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SummaryBody {
  studentId: string;
  strengths?: string[];
  weakAreas?: string[];
  preferredStyle?: string;
  vocabLevel?: string;
  notes?: string | null;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as SummaryBody;
  if (!body.studentId) {
    return NextResponse.json({ error: 'studentId required' }, { status: 400 });
  }
  const data = {
    strengths: body.strengths ?? [],
    weakAreas: body.weakAreas ?? [],
    preferredStyle: body.preferredStyle ?? 'worked-example',
    vocabLevel: body.vocabLevel ?? 'year-10',
    notes: body.notes ?? null,
  };
  const summary = await prisma.learnerSummary.upsert({
    where: { studentId: body.studentId },
    update: data,
    create: { studentId: body.studentId, ...data },
  });
  return NextResponse.json({ ok: true, summary });
}

export async function GET(req: NextRequest) {
  const studentId = req.nextUrl.searchParams.get('studentId') ?? '';
  if (!studentId) {
    return NextResponse.json({ error: 'studentId required' }, { status: 400 });
  }
  const summary = await prisma.learnerSummary.findUnique({ where: { studentId } });
  return NextResponse.json({ ok: true, summary });
}
