import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const correctPassword = process.env.SITE_PASSWORD;

    if (!correctPassword) {
      // If no password is set in env, allow access (dev mode)
      return NextResponse.json({ ok: true });
    }

    if (password === correctPassword) {
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
