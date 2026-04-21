import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DESCRIPTORS } from '@/lib/curriculum/seed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Protect with a simple token so the endpoint isn't world-writeable.
function authorised(req: NextRequest): boolean {
  const provided =
    req.headers.get('x-seed-token') ??
    req.nextUrl.searchParams.get('token') ??
    '';
  const expected = process.env.SEED_TOKEN ?? '';
  return expected.length > 0 && provided === expected;
}

export async function POST(req: NextRequest) {
  if (!authorised(req)) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }

  let upserted = 0;
  for (const d of DESCRIPTORS) {
    await prisma.curriculumDescriptor.upsert({
      where: { code: d.code },
      update: {
        subject: d.subject,
        yearLevel: d.yearLevel,
        strand: d.strand,
        substrand: d.substrand ?? null,
        text: d.text,
        keywords: d.keywords ?? [],
        bloom: d.bloom ?? null,
      },
      create: {
        code: d.code,
        subject: d.subject,
        yearLevel: d.yearLevel,
        strand: d.strand,
        substrand: d.substrand ?? null,
        text: d.text,
        keywords: d.keywords ?? [],
        bloom: d.bloom ?? null,
      },
    });
    upserted += 1;
  }

  return NextResponse.json({ ok: true, upserted, total: DESCRIPTORS.length });
}

export async function GET(req: NextRequest) {
  if (!authorised(req)) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }
  const count = await prisma.curriculumDescriptor.count();
  return NextResponse.json({ ok: true, count });
}
