import { db } from '../lib/db';
import { mangas, chapters } from '../lib/db/schema';
import mangasRaw from '../public/data/mangas.json';
import chaptersRaw from '../public/data/chapters.json';

const MANGA_BATCH  = 20;
const CHAPTER_BATCH = 50;

async function seed() {
  console.log('\n🌱 Iniciando migración de datos JSON → Supabase\n');

  // ── Mangas ───────────────────────────────────────────────
  console.log(`📚 Migrando ${mangasRaw.mangas.length} mangas...`);

  let mangaCount = 0;
  for (let i = 0; i < mangasRaw.mangas.length; i += MANGA_BATCH) {
    const batch = mangasRaw.mangas.slice(i, i + MANGA_BATCH).map((m) => ({
      id:            m.id,
      title:         m.title,
      image:         m.image,
      description:   m.description ?? '',
      genres:        m.genres ?? [],
      type:          m.type ?? 'Manhwa',
      status:        m.status ?? 'En Emision',
      dateAdded:     m.dateAdded ?? new Date().toISOString().split('T')[0],
      lastUpdated:   m.lastUpdated ?? new Date().toISOString().split('T')[0],
      latestChapter: m.latestChapter ?? 0,
      featured:      false,
      views:         0,
    }));

    await db.insert(mangas).values(batch).onConflictDoNothing();
    mangaCount += batch.length;
    process.stdout.write(`  ${mangaCount}/${mangasRaw.mangas.length} mangas\r`);
  }
  console.log(`  ✅ ${mangaCount} mangas insertados                    `);

  // ── Capítulos ─────────────────────────────────────────────
  console.log(`\n📖 Migrando ${chaptersRaw.chapters.length} capítulos...`);

  let chapterCount = 0;
  for (let i = 0; i < chaptersRaw.chapters.length; i += CHAPTER_BATCH) {
    const batch = chaptersRaw.chapters.slice(i, i + CHAPTER_BATCH).map((c) => ({
      mangaId: c.mangaId,
      chapter: c.chapter,
      baseUrl: c.baseUrl ?? null,
      pages:   c.pages ?? [],
    }));

    await db.insert(chapters).values(batch).onConflictDoNothing();
    chapterCount += batch.length;
    process.stdout.write(`  ${chapterCount}/${chaptersRaw.chapters.length} capítulos\r`);
  }
  console.log(`  ✅ ${chapterCount} capítulos insertados                    `);

  console.log('\n🎉 Migración completada exitosamente.\n');
  process.exit(0);
}

seed().catch((e) => {
  console.error('\n❌ Error en la migración:', e);
  process.exit(1);
});
