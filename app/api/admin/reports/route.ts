import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reports } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

/* ── GET — listar reportes ── */
export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get('status');

    const query = db.select().from(reports).orderBy(desc(reports.createdAt));
    const rows = status && status !== 'all'
      ? await db.select().from(reports).where(eq(reports.status, status)).orderBy(desc(reports.createdAt))
      : await query;

    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/* ── PATCH — cambiar estado de un reporte ── */
export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = await req.json() as { id?: number; status?: string };
    if (!id || (status !== 'pending' && status !== 'resolved')) {
      return NextResponse.json({ error: 'id y status (pending|resolved) requeridos.' }, { status: 400 });
    }

    await db.update(reports).set({ status }).where(eq(reports.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
