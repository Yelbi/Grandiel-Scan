import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { ilike } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json() as { username?: string };
    const trimmed = username?.trim() ?? '';

    if (!trimmed) {
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

    return NextResponse.json({ authEmail: user.authEmail });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
