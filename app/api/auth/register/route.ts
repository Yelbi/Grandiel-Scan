import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { ilike } from 'drizzle-orm';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const { username, password, avatar } = await req.json() as {
      username?: string;
      password?: string;
      avatar?: string;
    };

    const trimmed = username?.trim() ?? '';

    // Validaciones
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
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres.' },
        { status: 400 },
      );
    }

    // Verificar que el username no esté en uso (case-insensitive)
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(ilike(users.username, trimmed))
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
      return NextResponse.json(
        { error: authError?.message ?? 'Error al crear la cuenta.' },
        { status: 500 },
      );
    }

    // Crear perfil en la base de datos
    try {
      await db.insert(users).values({
        id:        authData.user.id,
        username:  trimmed,
        avatar:    avatar ?? '/img/avatars/avatar1.svg',
        authEmail,
      });
    } catch {
      // Rollback: borrar el usuario de auth si falla la inserción en DB
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: 'Error al guardar el perfil. Intenta de nuevo.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, authEmail });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
