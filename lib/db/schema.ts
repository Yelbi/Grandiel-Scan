import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  timestamp,
  primaryKey,
  serial,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ── Mangas ──────────────────────────────────────────────────────────────────
export const mangas = pgTable(
  'mangas',
  {
    id:            text('id').primaryKey(),
    title:         text('title').notNull(),
    image:         text('image').notNull(),
    description:   text('description').notNull().default(''),
    genres:        text('genres').array().notNull().default([]),
    type:          text('type').notNull().default('Manhwa'),
    status:        text('status').notNull().default('En Emision'),
    dateAdded:     text('date_added').notNull(),
    lastUpdated:   text('last_updated').notNull(),
    latestChapter: real('latest_chapter').notNull().default(0),
    featured:      boolean('featured').notNull().default(false),
    views:         integer('views').notNull().default(0),

    // ── Sincronización automática de capítulos (lib/scraper) ──────────────
    /** Página de la serie en el sitio de origen. De ahí se leen los capítulos publicados. */
    sourceUrl:     text('source_url'),
    /** Carpeta del cómic en el CDN, sin el id del capítulo.
     *  Ej: https://dashboard.olympusscans.com/storage/comics/460
     *  Es exactamente el "comicBase" que se escribe a mano en Auto-descubrir. */
    sourceCdnBase: text('source_cdn_base'),
    /** Extensión de las imágenes en ese CDN. */
    sourceExt:     text('source_ext').notNull().default('webp'),
    /** Si está en false el cron ignora este manga. */
    autoSync:      boolean('auto_sync').notNull().default(false),
    /** Última vez que el cron miró este manga. Ordena la cola: primero los más antiguos. */
    lastSyncedAt:  timestamp('last_synced_at'),
  },
  (t) => [
    index('mangas_status_idx').on(t.status),
    index('mangas_last_updated_idx').on(t.lastUpdated),
    index('mangas_views_idx').on(t.views),
    // El cron pide "los autoSync ordenados por lastSyncedAt"; este índice cubre esa consulta.
    index('mangas_autosync_idx').on(t.autoSync, t.lastSyncedAt),
  ],
);

// ── Capítulos ────────────────────────────────────────────────────────────────
export const chapters = pgTable(
  'chapters',
  {
    id:      serial('id').primaryKey(),
    mangaId: text('manga_id')
      .notNull()
      .references(() => mangas.id, { onDelete: 'cascade' }),
    chapter: real('chapter').notNull(),
    baseUrl: text('base_url'),
    pages:   text('pages').array().notNull().default([]),
  },
  (t) => [
    index('chapters_manga_id_idx').on(t.mangaId),
    index('chapters_manga_chapter_idx').on(t.mangaId, t.chapter),
  ],
);

// ── Usuarios (perfil público, vinculado a Supabase Auth) ─────────────────────
export const users = pgTable(
  'users',
  {
    id:        text('id').primaryKey(), // = auth.users.id de Supabase
    username:  text('username').notNull(),
    avatar:    text('avatar').notNull(),
    // Email interno (UUID@auth.grandiel) usado para autenticación — nunca cambia
    authEmail: text('auth_email'),
    // Email real opcional que el usuario puede enlazar a su cuenta
    email:     text('email'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    // Roles: 'user' | 'admin'. Listo para migrar admin de Basic Auth a sesión+rol.
    role:      text('role').notNull().default('user'),
  },
  (t) => [
    // Unicidad case-insensitive: previene registrar 'GrandUser' y 'granduser' como distintos.
    // Reemplaza el antiguo uniqueIndex case-sensitive. Requiere npm run db:migrate.
    uniqueIndex('users_username_lower_unique').on(sql`lower(${t.username})`),
    // Índice regular para acelerar ORDER BY / SELECT en consultas no-unique.
    index('users_username_lower_idx').on(sql`lower(${t.username})`),
  ],
);

// ── Favoritos ────────────────────────────────────────────────────────────────
export const favorites = pgTable(
  'favorites',
  {
    userId:  text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    mangaId: text('manga_id')
      .notNull()
      .references(() => mangas.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.mangaId] }),
  ],
);

// ── Historial de lectura ─────────────────────────────────────────────────────
export const readingHistory = pgTable(
  'reading_history',
  {
    id:        serial('id').primaryKey(),
    userId:    text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    mangaId:   text('manga_id')
      .notNull()
      .references(() => mangas.id, { onDelete: 'cascade' }),
    chapter:   real('chapter').notNull(),
    page:      integer('page').notNull().default(1),
    title:     text('title').notNull().default(''),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('history_user_id_idx').on(t.userId),
    // UNIQUE para permitir upsert atómico sin race conditions
    uniqueIndex('history_user_manga_unique').on(t.userId, t.mangaId),
  ],
);

// ── Comentarios ──────────────────────────────────────────────────────────────
export const comments = pgTable(
  'comments',
  {
    id:        serial('id').primaryKey(),
    mangaId:   text('manga_id')
      .notNull()
      .references(() => mangas.id, { onDelete: 'cascade' }),
    userId:    text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    text:      text('text').notNull(),
    chapter:   real('chapter'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deleted:   boolean('deleted').notNull().default(false),
  },
  (t) => [
    index('comments_manga_id_idx').on(t.mangaId),
    index('comments_user_id_idx').on(t.userId),
    index('comments_chapter_idx').on(t.chapter),
  ],
);

// ── Suscripciones Push (Fase 10) ─────────────────────────────────────────────
export const pushSubscriptions = pgTable('push_subscriptions', {
  id:        serial('id').primaryKey(),
  userId:    text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  endpoint:  text('endpoint').notNull().unique(),
  p256dh:    text('p256dh').notNull(),
  auth:      text('auth').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// ── Reportes (capítulos + feedback general) ───────────────────────────────────
export const reports = pgTable(
  'reports',
  {
    id:          serial('id').primaryKey(),
    // 'chapter' = reporte de capítulo  |  'suggestion' = sugerencia  |  'complaint' = queja
    type:        text('type').notNull(),
    userId:      text('user_id').references(() => users.id, { onDelete: 'set null' }),
    // Solo para type='chapter'
    mangaId:     text('manga_id'),
    chapter:     real('chapter'),
    reason:      text('reason'),
    description: text('description'),
    // 'pending' | 'resolved'
    status:      text('status').notNull().default('pending'),
    createdAt:   timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('reports_type_idx').on(t.type),
    index('reports_status_idx').on(t.status),
    index('reports_user_id_idx').on(t.userId),
  ],
);

// ── Registro de sincronizaciones automáticas ─────────────────────────────────
// Una fila por manga y pasada del cron. Sirve para ver desde el admin por qué un
// manga dejó de actualizarse sin tener que bucear en los logs de Vercel.
export const syncRuns = pgTable(
  'sync_runs',
  {
    id:      serial('id').primaryKey(),
    mangaId: text('manga_id')
      .notNull()
      .references(() => mangas.id, { onDelete: 'cascade' }),
    // 'added' = se insertaron capítulos | 'nothing' = sin novedades
    // 'error' = falló la descarga o el sondeo | 'partial' = alguno entró y otro falló
    status:        text('status').notNull(),
    chaptersAdded: integer('chapters_added').notNull().default(0),
    /** Capítulos insertados en esta pasada, para mostrarlos en el admin. */
    chapters:      real('chapters').array().notNull().default([]),
    /** Mensaje de error o resumen legible. */
    detail:        text('detail'),
    /** Milisegundos que tardó la pasada de este manga. */
    durationMs:    integer('duration_ms'),
    createdAt:     timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('sync_runs_manga_id_idx').on(t.mangaId),
    index('sync_runs_created_at_idx').on(t.createdAt),
  ],
);

// ── Rate limit store (ventana deslizante distribuida) ────────────────────────
// Permite que el rate limiter funcione correctamente en entornos multi-instancia
// (ej: Vercel serverless con múltiples regiones). La clave es "tipo:ip[:mangaId]".
// Las entradas expiradas se reemplazan atómicamente en el UPSERT; no es necesario purgarlas.
export const rateLimitStore = pgTable('rate_limit_store', {
  key:     text('key').primaryKey(),
  count:   integer('count').notNull().default(1),
  resetAt: timestamp('reset_at', { withTimezone: true }).notNull(),
});

// ── Tipos inferidos ──────────────────────────────────────────────────────────
export type MangaRow           = typeof mangas.$inferSelect;
export type MangaInsert        = typeof mangas.$inferInsert;
export type ChapterRow         = typeof chapters.$inferSelect;
export type ChapterInsert      = typeof chapters.$inferInsert;
export type UserRow            = typeof users.$inferSelect;
export type CommentRow         = typeof comments.$inferSelect;
export type ReadingHistoryRow  = typeof readingHistory.$inferSelect;
export type ReportRow          = typeof reports.$inferSelect;
export type ReportInsert       = typeof reports.$inferInsert;
export type SyncRunRow         = typeof syncRuns.$inferSelect;
export type SyncRunInsert      = typeof syncRuns.$inferInsert;
