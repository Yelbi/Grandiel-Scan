import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { ilike } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  // 10 intentos de login por IP cada 15 minutos
  const ip = getClientIp(req);
  const rl = await rateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera unos minutos antes de intentarlo de nuevo.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  try {
    const { username, password } = await req.json() as { username?: string; password?: string };
    const trimmed = username?.trim() ?? '';

    if (!trimmed || !password) {
      return NextResponse.json(
        { error: 'Usuario o contraseña incorrectos.' },
        { status: 401 },
      );
    }

    // Buscar el email interno por username (case-insensitive)
    const [user] = await db
      .select({ authEmail: users.authEmail })
      .from(users)
      .where(ilike(users.username, trimmed))
      .limit(1);

    if (!user?.authEmail) {
      // No revelar si el usuario existe o no
      return NextResponse.json(
        { error: 'Usuario o contraseña incorrectos.' },
        { status: 401 },
      );
    }

    // Verificar contraseña en el servidor — nunca exponer authEmail al cliente
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email:    user.authEmail,
      password,
    });

    if (error || !data.session) {
      return NextResponse.json(
        { error: 'Usuario o contraseña incorrectos.' },
        { status: 401 },
      );
    }

    return NextResponse.json({
      access_token:  data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
