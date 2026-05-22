import { type NextRequest, NextResponse } from 'next/server';
import { incrementViews } from '@/lib/data';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

type Params = { params: Promise<{ mangaId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { mangaId } = await params;

  if (!mangaId) {
    return NextResponse.json({ error: 'mangaId requerido.' }, { status: 400 });
  }

  // 1 conteo de vista por IP + manga cada hora
  const ip = getClientIp(req);
  const rl = rateLimit(`view:${ip}:${mangaId}`, 1, 60 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json({ ok: true, deduplicated: true });
  }

  await incrementViews(mangaId);
  return NextResponse.json({ ok: true });
}
