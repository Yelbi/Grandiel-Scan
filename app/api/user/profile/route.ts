import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, sql, and, ne } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const LOCAL_AVATARS = new Set([
  '/img/avatars/avatar1.svg', '/img/avatars/avatar2.svg',
  '/img/avatars/avatar3.svg', '/img/avatars/avatar4.svg',
  '/img/avatars/avatar5.svg', '/img/avatars/avatar6.svg',
  '/img/avatars/avatar7.svg', '/img/avatars/avatar8.svg',
]);
const SUPABASE_AVATAR_PATTERN = /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/avatars\/(?!.*\.\.)[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*\.(?:svg|png|jpg|webp)$/;

export async function PATCH(req: NextRequest) {
  // 10 cambios de perfil por IP cada hora
  const ip = getClientIp(req);
  const rl = await rateLimit(`profile-update:${ip}`, 10, 60 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Demasiados cambios. Espera antes de intentarlo de nuevo.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const body = await req.json() as { username?: unknown; avatar?: unknown };

    const updates: { username?: string; avatar?: string } = {};

    if (body.username !== undefined) {
      if (typeof body.username !== 'string') {
        return NextResponse.json({ error: 'username inválido.' }, { status: 400 });
      }
      const trimmed = body.username.trim();
      if (trimmed.length < 3 || trimmed.length > 20) {
        return NextResponse.json({ error: 'El nombre debe tener entre 3 y 20 caracteres.' }, { status: 400 });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
        return NextResponse.json({ error: 'Solo letras, números y guiones bajos (_).' }, { status: 400 });
      }
      // Verificar unicidad usando el índice funcional lower(username) — evita seq scan.
      const conflict = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(sql`lower(${users.username})`, trimmed.toLowerCase()), ne(users.id, user.id)))
        .limit(1);
      if (conflict.length > 0) {
        return NextResponse.json({ error: 'Ese nombre de usuario ya está en uso.' }, { status: 409 });
      }
      updates.username = trimmed;
    }

    if (body.avatar !== undefined) {
      if (typeof body.avatar !== 'string') {
        return NextResponse.json({ error: 'avatar inválido.' }, { status: 400 });
      }
      const av = body.avatar.trim();
      if (!LOCAL_AVATARS.has(av) && !SUPABASE_AVATAR_PATTERN.test(av)) {
        return NextResponse.json({ error: 'Avatar no válido.' }, { status: 400 });
      }
      updates.avatar = av;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No se enviaron cambios.' }, { status: 400 });
    }

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, user.id))
      .returning({ username: users.username, avatar: users.avatar });

    return NextResponse.json({ ok: true, ...updated });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
