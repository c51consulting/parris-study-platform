import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password } = body as { password?: string };

    const correctPassword = process.env.SITE_PASSWORD;

    // Reject completely empty submissions in all modes
    if (typeof password !== 'string' || password.trim() === '') {
      return NextResponse.json({ error: 'Password is required.' }, { status: 400 });
    }

    // No SITE_PASSWORD configured → open-access mode (any non-empty input accepted)
    if (!correctPassword) {
      return NextResponse.json({ ok: true, mode: 'open' });
    }

    // SITE_PASSWORD is set → strict exact-match comparison
    if (password === correctPassword) {
      return NextResponse.json({ ok: true });
    }

    // Wrong password
    return NextResponse.json({ error: 'Incorrect password. Please try again.' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }
}
