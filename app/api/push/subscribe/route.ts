import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pushSubscriptions } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

/* ── POST — guardar suscripción push ── */
export async function POST(req: NextRequest) {
  try {
    const { endpoint, keys } = await req.json() as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Datos de suscripción incompletos.' }, { status: 400 });
    }

    // Obtener userId si está autenticado (opcional)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await db
      .insert(pushSubscriptions)
      .values({
        endpoint,
        p256dh: keys.p256dh,
        auth:   keys.auth,
        userId: user?.id ?? null,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          p256dh: keys.p256dh,
          auth:   keys.auth,
          userId: user?.id ?? null,
        },
      });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/* ── DELETE — eliminar suscripción push (requiere autenticación) ── */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { endpoint } = await req.json() as { endpoint: string };
    if (!endpoint) {
      return NextResponse.json({ error: 'endpoint requerido.' }, { status: 400 });
    }

    // Solo eliminar suscripciones que pertenecen al usuario autenticado
    await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.endpoint, endpoint),
          eq(pushSubscriptions.userId, user.id),
        ),
      );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
