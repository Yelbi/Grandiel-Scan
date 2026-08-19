-- Repara los capítulos que apuntan al CDN viejo de Olympus.
--
-- Olympus migró de dashboard.olympusbiblioteca.com a media.imagesolymp.xyz y
-- dejó de servir las rutas antiguas: devuelven 404. Como el 84,8% de los
-- capítulos (5480 de 6463, 22 mangas) tenían esa base, la mayor parte del
-- catálogo se veía en blanco.
--
-- Los nombres de archivo NO cambian: solo el host y el prefijo /storage.
--   antes:  https://dashboard.olympusbiblioteca.com/storage/comics/119/99677/
--   ahora:  https://media.imagesolymp.xyz/comics/119/99677/
-- Por eso basta con reescribir base_url; el array `pages` sigue siendo válido.
--
-- Comprobado antes de escribir: las 5480 filas tienen la misma forma de URL
-- (sin excepciones) y 25 muestras al azar devuelven HTTP 200 con la ruta nueva.

BEGIN;

UPDATE chapters
SET base_url = replace(
      replace(base_url, 'dashboard.olympusbiblioteca.com', 'media.imagesolymp.xyz'),
      '/storage/comics/', '/comics/')
WHERE base_url LIKE 'https://dashboard.olympusbiblioteca.com/storage/comics/%';

-- Debe devolver 0. Si no, revisar antes de confirmar.
SELECT count(*) AS pendientes_sin_migrar
FROM chapters WHERE base_url LIKE '%dashboard.olympusbiblioteca.com%';

COMMIT;

-- ── Vuelta atrás, si hiciera falta ──────────────────────────────────────────
-- La transformación es reversible porque no se pierde información:
--
-- UPDATE chapters
-- SET base_url = replace(
--       replace(base_url, 'media.imagesolymp.xyz', 'dashboard.olympusbiblioteca.com'),
--       '/comics/', '/storage/comics/')
-- WHERE base_url LIKE 'https://media.imagesolymp.xyz/comics/%';
