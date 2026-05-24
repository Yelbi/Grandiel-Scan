import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  // 5 intentos de registro por IP cada 15 minutos
  const ip = getClientIp(req);
  const rl = await rateLimit(`register:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera unos minutos antes de intentarlo de nuevo.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  // Verificar vars de entorno requeridas
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[register] Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
    return NextResponse.json(
      { error: 'Configuración del servidor incompleta. Contacta al administrador.' },
      { status: 500 },
    );
  }

  try {
    const { username, password, avatar } = await req.json() as {
      username?: string;
      password?: string;
      avatar?: string;
    };

    const trimmed = username?.trim() ?? '';

    // Validaciones de username
    if (trimmed.length < 3 || trimmed.length > 20) {
      return NextResponse.json(
        { error: 'El nombre debe tener entre 3 y 20 caracteres.' },
        { status: 400 },
      );
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      return NextResponse.json(
        { error: 'Solo letras, números y guiones bajos (_).' },
        { status: 400 },
      );
    }

    // Validación de contraseña: mínimo 8, máximo 128 caracteres (DoS prevention)
    if (!password || password.length < 8 || password.length > 128) {
      return NextResponse.json(
        { error: 'La contraseña debe tener entre 8 y 128 caracteres.' },
        { status: 400 },
      );
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: 'La contraseña debe contener al menos una letra y un número.' },
        { status: 400 },
      );
    }

    // Validación de avatar: whitelist de avatares locales o URLs de Supabase Storage
    // No se permite path traversal ni extensiones arbitrarias
    const LOCAL_AVATARS = new Set([
      '/img/avatars/avatar1.svg', '/img/avatars/avatar2.svg',
      '/img/avatars/avatar3.svg', '/img/avatars/avatar4.svg',
      '/img/avatars/avatar5.svg', '/img/avatars/avatar6.svg',
      '/img/avatars/avatar7.svg', '/img/avatars/avatar8.svg',
    ]);
    // Nombre de archivo: alfanumérico + guiones/puntos, sin '..' para evitar path traversal
    const SUPABASE_AVATAR_PATTERN = /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/avatars\/(?!.*\.\.)[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*\.(?:svg|png|jpg|webp)$/;
    const avatarVal = avatar?.trim() ?? '/img/avatars/avatar1.svg';
    if (!LOCAL_AVATARS.has(avatarVal) && !SUPABASE_AVATAR_PATTERN.test(avatarVal)) {
      return NextResponse.json(
        { error: 'Avatar no válido.' },
        { status: 400 },
      );
    }

    // Verificar unicidad usando el índice funcional lower(username) — evita seq scan.
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(sql`lower(${users.username})`, trimmed.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Ese nombre de usuario ya está en uso.' },
        { status: 409 },
      );
    }

    // Crear usuario en Supabase Auth con email interno (sin confirmación de email)
    const authEmail = `${randomUUID()}@auth.grandiel`;
    const supabaseAdmin = createAdminClient();

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true, // Confirmar inmediatamente, sin enviar email
    });

    if (authError || !authData.user) {
      console.error('[register] Auth error:', authError?.message);
      return NextResponse.json(
        { error: 'Error al crear la cuenta. Inténtalo de nuevo.' },
        { status: 500 },
      );
    }

    // Crear perfil en la base de datos.
    // Se usa upsert porque Supabase puede tener un trigger que inserta en public.users
    // automáticamente al crear el auth user — en ese caso hacemos update en lugar de insert.
    try {
      const profileValues = {
        id:        authData.user.id,
        username:  trimmed,
        avatar:    avatarVal,
        authEmail,
      };
      await db
        .insert(users)
        .values(profileValues)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            username:  profileValues.username,
            avatar:    profileValues.avatar,
            authEmail: profileValues.authEmail,
          },
        });
    } catch (dbErr) {
      // Rollback: borrar el usuario de auth si falla la inserción en DB
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(() => {});
      const cause = dbErr instanceof Error
        ? ((dbErr as Error & { cause?: Error }).cause?.message ?? dbErr.message)
        : String(dbErr);
      console.error('[register] DB insert failed:', cause, dbErr);
      return NextResponse.json({ error: 'Error al guardar el perfil. Inténtalo de nuevo.' }, { status: 500 });
    }

    // Iniciar sesión automáticamente y devolver tokens al cliente (nunca exponer authEmail)
    const supabase = await createClient();
    const { data: signInData } = await supabase.auth.signInWithPassword({
      email:    authEmail,
      password: password!,
    });

    return NextResponse.json(
      {
        ok:            true,
        access_token:  signInData.session?.access_token  ?? null,
        refresh_token: signInData.session?.refresh_token ?? null,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    console.error('[register] Unexpected error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
