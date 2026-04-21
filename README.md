# Parris Study Platform

An elite, Victorian-curriculum-aligned interactive study platform for Year 10 core subjects plus VCE Psychology Unit 1 extension.

## Live
- Production: https://parris-study-platform-b5xcx3spf-c51consultings-projects.vercel.app

## Stack
- **Next.js 14** App Router, TypeScript, Tailwind (Vercel)
- **Prisma + Postgres** (Railway)
- **Vercel AI SDK** + OpenAI GPT-4o-mini (streaming tutor chat)
- Planned: Railway worker for document parsing and background jobs

## Subjects (Victorian Curriculum + VCE aligned)
1. VCE Psychology Unit 1 — research methods, lifespan development, mental processes, biopsychosocial model
2. General Mathematics — number, algebra, measurement, statistics, probability, modelling
3. Advanced Science — inquiry skills, physical/chemical/biological sciences
4. English — analysing, creating, language conventions, oral communication
5. Entrepreneurship — Economics & Business: decision-making, risk/reward, justification

## Setup
```bash
cp .env.example .env
# fill in DATABASE_URL, OPENAI_API_KEY, NEXTAUTH_SECRET
npm install
npx prisma migrate deploy
npm run dev
```

## Deployment
GitHub `main` → Vercel auto-deploy. Required env vars on Vercel:
- `DATABASE_URL` (Railway Postgres)
- `OPENAI_API_KEY`
- `NEXTAUTH_SECRET`
