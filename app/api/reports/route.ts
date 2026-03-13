import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reports } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';
import type { ReportInsert } from '@/lib/db/schema';

const CHAPTER_REASONS = [
  'incomplete',
  'not_loading',
  'wrong_chapter',
  'low_quality',
  'other',
] as const;

const FEEDBACK_TYPES = ['suggestion', 'complaint'] as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      type?: string;
      mangaId?: string;
      chapter?: unknown;
      reason?: string;
      description?: string;
    };

    const { type, mangaId, chapter, reason, description } = body;

    // Intentar obtener usuario autenticado (opcional — se permiten reportes anónimos)
    let userId: string | undefined;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) userId = user.id;
    } catch {
      // Sin sesión — reporte anónimo
    }

    // ── Reporte de capítulo ──
    if (type === 'chapter') {
      if (!mangaId || typeof mangaId !== 'string' || mangaId.trim().length === 0) {
        return NextResponse.json({ error: 'mangaId requerido.' }, { status: 400 });
      }
      // El capítulo puede llegar como string desde JSON — normalizar a número
      const chapterNum = typeof chapter === 'number'
        ? chapter
        : typeof chapter === 'string'
          ? parseFloat(chapter)
          : NaN;
      if (!isFinite(chapterNum) || chapterNum < 0) {
        return NextResponse.json({ error: 'Número de capítulo inválido.' }, { status: 400 });
      }
      if (!reason || !CHAPTER_REASONS.includes(reason as typeof CHAPTER_REASONS[number])) {
        return NextResponse.json({ error: 'Motivo de reporte inválido.' }, { status: 400 });
      }

      const values: ReportInsert = {
        type: 'chapter',
        mangaId: mangaId.trim(),
        chapter: chapterNum,
        reason,
      };
      // Solo incluir campos opcionales si tienen valor — evita FK violation con string vacío
      if (userId) values.userId = userId;
      if (typeof description === 'string' && description.trim().length > 0) {
        values.description = description.trim().slice(0, 500);
      }

      await db.insert(reports).values(values);
      return NextResponse.json({ ok: true });
    }

    // ── Sugerencia / Queja ──
    if (FEEDBACK_TYPES.includes(type as typeof FEEDBACK_TYPES[number])) {
      const desc = typeof description === 'string' ? description.trim() : '';
      if (desc.length < 10 || desc.length > 500) {
        return NextResponse.json(
          { error: 'El mensaje debe tener entre 10 y 500 caracteres.' },
          { status: 400 },
        );
      }

      const values: ReportInsert = {
        type: type as string,
        description: desc,
      };
      if (userId) values.userId = userId;

      await db.insert(reports).values(values);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Tipo de reporte inválido.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
