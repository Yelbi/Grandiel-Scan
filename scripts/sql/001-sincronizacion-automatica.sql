-- Migración para la sincronización automática de capítulos.
--
-- Cómo aplicarla: Supabase → SQL Editor → pegar y ejecutar.
-- (La alternativa sería `npm run db:push`, pero requiere Node.js en local.)
--
-- Es idempotente: se puede ejecutar varias veces sin romper nada.

-- ── 1. Configuración de origen por manga ────────────────────────────────────
ALTER TABLE mangas
  ADD COLUMN IF NOT EXISTS source_url      text,
  ADD COLUMN IF NOT EXISTS source_cdn_base text,
  ADD COLUMN IF NOT EXISTS source_ext      text    NOT NULL DEFAULT 'webp',
  ADD COLUMN IF NOT EXISTS auto_sync       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_synced_at  timestamp;

COMMENT ON COLUMN mangas.source_url      IS 'Página de la serie en el sitio de origen; de ahí se leen los capítulos publicados.';
COMMENT ON COLUMN mangas.source_cdn_base IS 'Carpeta del cómic en el CDN, sin el id del capítulo. Ej: https://dashboard.olympusscans.com/storage/comics/168';
COMMENT ON COLUMN mangas.auto_sync       IS 'Si es false, el cron ignora este manga.';
COMMENT ON COLUMN mangas.last_synced_at  IS 'Última revisión del cron. Ordena la cola: primero los más antiguos.';

-- El cron pide "los auto_sync ordenados por last_synced_at": este índice cubre esa consulta.
CREATE INDEX IF NOT EXISTS mangas_autosync_idx ON mangas (auto_sync, last_synced_at);

-- ── 2. Registro de sincronizaciones ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sync_runs (
  id             serial PRIMARY KEY,
  manga_id       text NOT NULL REFERENCES mangas (id) ON DELETE CASCADE,
  -- 'added' | 'nothing' | 'partial' | 'error' | 'skipped'
  status         text NOT NULL,
  chapters_added integer NOT NULL DEFAULT 0,
  chapters       real[]  NOT NULL DEFAULT '{}',
  detail         text,
  duration_ms    integer,
  created_at     timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sync_runs_manga_id_idx   ON sync_runs (manga_id);
CREATE INDEX IF NOT EXISTS sync_runs_created_at_idx ON sync_runs (created_at);

-- ── 3. Seguridad a nivel de fila ────────────────────────────────────────────
-- sync_runs solo se lee desde el panel de admin (que va por Basic Auth y usa la
-- conexión directa de Postgres, no PostgREST). Con RLS activo y sin políticas,
-- la anon key de Supabase no puede tocar la tabla.
ALTER TABLE sync_runs ENABLE ROW LEVEL SECURITY;

-- ── 4. Limpieza del historial ───────────────────────────────────────────────
-- Con 10 mangas cada 3 h son ~2.400 filas al mes. El cron de limpieza diario
-- (/api/cron/cleanup) puede borrar las viejas; mientras tanto, a mano:
--   DELETE FROM sync_runs WHERE created_at < now() - INTERVAL '30 days';
