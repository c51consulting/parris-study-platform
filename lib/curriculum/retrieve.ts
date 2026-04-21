import { DESCRIPTORS, DescriptorSeed } from './seed';

export type Descriptor = DescriptorSeed;

export interface RetrievalQuery {
  subject?: string;
  yearLevel?: string;
  query?: string;
  limit?: number;
}

function score(d: Descriptor, q: string): number {
  if (!q) return 0;
  const hay = `${d.code} ${d.strand} ${d.substrand ?? ''} ${d.text} ${(d.keywords ?? []).join(' ')}`.toLowerCase();
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  let s = 0;
  for (const t of terms) if (hay.includes(t)) s += 1;
  return s;
}

export function retrieveDescriptors(opts: RetrievalQuery): Descriptor[] {
  const { subject, yearLevel, query = '', limit = 6 } = opts;
  let pool = DESCRIPTORS.slice();
  if (subject) pool = pool.filter((d) => d.subject === subject);
  if (yearLevel) pool = pool.filter((d) => d.yearLevel === yearLevel);
  const ranked = pool
    .map((d) => ({ d, s: score(d, query) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((r) => r.d);
  return ranked;
}

export function formatDescriptorsForPrompt(items: Descriptor[]): string {
  if (!items.length) return 'No matching VCAA descriptors found.';
  return items
    .map(
      (d) =>
        `- [${d.code}] ${d.yearLevel} ${d.subject} — ${d.strand}${
          d.substrand ? ' / ' + d.substrand : ''
        }: ${d.text}`
    )
    .join('\n');
}
