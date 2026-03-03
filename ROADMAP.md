# Grandiel Scan — Plan de Mejoras Completo

**Stack objetivo:** Next.js 15 · Supabase (PostgreSQL + Auth) · Drizzle ORM · Vercel
**Objetivo general:** Convertir la app de un sitio estático con JSON a una plataforma completa con base de datos, autenticación real, comentarios compartidos, seguimiento de popularidad y notificaciones.

---

## Índice

1. [Fase 0 — Configuración inicial](#fase-0)
2. [Fase 1 — Esquema de base de datos](#fase-1)
3. [Fase 2 — Migración de datos JSON a Supabase](#fase-2)
4. [Fase 3 — Reemplazar lib/data.ts con consultas reales + ISR](#fase-3)
5. [Fase 4 — Panel de admin en producción](#fase-4)
6. [Fase 5 — Autenticación real (Supabase Auth)](#fase-5)
7. [Fase 6 — Favoritos e historial sincronizados en BD](#fase-6)
8. [Fase 7 — Sistema de comentarios real](#fase-7)
9. [Fase 8 — Seguimiento de vistas y popularidad real](#fase-8)
10. [Fase 9 — Progreso de lectura dentro del capítulo](#fase-9)
11. [Fase 10 — Notificaciones push de nuevos capítulos](#fase-10)

---

## Fase 0 — Configuración inicial {#fase-0}

### 0.1 Crear proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) → **New project**
2. Nombre: `grandiel-scan` · Región: `us-east-1` (o la más cercana)
3. Guardar la contraseña de la base de datos en un lugar seguro (2!j5?.qC2KySAdf)
4. Una vez creado, ir a **Settings → API** y copiar:
   - `SUPABASE_URL` (Project URL)
   - `SUPABASE_ANON_KEY` (public anon key)
   - `SUPABASE_SERVICE_ROLE_KEY` (service_role key — nunca exponer en el cliente)

### 0.2 Variables de entorno

Crear `.env.local` en la raíz del proyecto:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Admin panel en producción
ADMIN_PASSWORD=tu_contraseña_segura_aqui

# Base URL
NEXT_PUBLIC_SITE_URL=https://grandielscan.com
```

> **Importante:** Añadir estas mismas variables en Vercel → Settings → Environment Variables.
> `SUPABASE_SERVICE_ROLE_KEY` solo debe estar en el servidor (sin el prefijo `NEXT_PUBLIC_`).

### 0.3 Instalar dependencias

```bash
npm install @supabase/supabase-js @supabase/ssr drizzle-orm postgres
npm install -D drizzle-kit @types/pg
```

**Qué instala cada paquete:**
- `@supabase/supabase-js` — cliente oficial de Supabase
- `@supabase/ssr` — helpers para SSR/cookies en Next.js App Router
- `drizzle-orm` + `postgres` — ORM TypeScript-native para consultas tipadas
- `drizzle-kit` — CLI para generar migraciones y hacer push del schema

### 0.4 Estructura de archivos nuevos a crear

```
lib/
├── db/
│   ├── index.ts          ← conexión a la BD con Drizzle
│   └── schema.ts         ← definición de todas las tablas
├── supabase/
│   ├── client.ts         ← cliente Supabase para el navegador
│   └── server.ts         ← cliente Supabase para el servidor (SSR)
```

---

## Fase 1 — Esquema de base de datos {#fase-1}

### 1.1 Crear `lib/db/schema.ts`

Este archivo define todas las tablas. Drizzle lo usa para generar el SQL y para tipar las consultas.

```typescript
// lib/db/schema.ts
import {
  pgTable, text, integer, boolean, timestamp,
  primaryKey, serial, index, jsonb,
} from 'drizzle-orm/pg-core';

// ── Mangas ──────────────────────────────────────────────
export const mangas = pgTable('mangas', {
  id:            text('id').primaryKey(),
  title:         text('title').notNull(),
  image:         text('image').notNull(),
  description:   text('description').notNull().default(''),
  genres:        text('genres').array().notNull().default([]),
  type:          text('type').notNull().default('Manhwa'),
  status:        text('status').notNull().default('En Emision'),
  dateAdded:     text('date_added').notNull(),
  lastUpdated:   text('last_updated').notNull(),
  latestChapter: integer('latest_chapter').notNull().default(0),
  featured:      boolean('featured').notNull().default(false),
  views:         integer('views').notNull().default(0),
}, (t) => [
  index('mangas_status_idx').on(t.status),
  index('mangas_last_updated_idx').on(t.lastUpdated),
  index('mangas_views_idx').on(t.views),
]);

// ── Capítulos ────────────────────────────────────────────
export const chapters = pgTable('chapters', {
  id:       serial('id').primaryKey(),
  mangaId:  text('manga_id').notNull().references(() => mangas.id, { onDelete: 'cascade' }),
  chapter:  integer('chapter').notNull(),
  baseUrl:  text('base_url'),
  pages:    text('pages').array().notNull().default([]),
}, (t) => [
  index('chapters_manga_id_idx').on(t.mangaId),
]);

// ── Usuarios (perfil público — vinculado a Supabase Auth) ─
export const users = pgTable('users', {
  id:        text('id').primaryKey(),  // = auth.users.id de Supabase
  username:  text('username').notNull(),
  avatar:    text('avatar').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── Favoritos ────────────────────────────────────────────
export const favorites = pgTable('favorites', {
  userId:  text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  mangaId: text('manga_id').notNull().references(() => mangas.id, { onDelete: 'cascade' }),
}, (t) => [
  primaryKey({ columns: [t.userId, t.mangaId] }),
]);

// ── Historial de lectura ─────────────────────────────────
export const readingHistory = pgTable('reading_history', {
  id:        serial('id').primaryKey(),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  mangaId:   text('manga_id').notNull().references(() => mangas.id, { onDelete: 'cascade' }),
  chapter:   integer('chapter').notNull(),
  page:      integer('page').notNull().default(1),   // progreso dentro del capítulo
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('history_user_id_idx').on(t.userId),
]);

// ── Comentarios ──────────────────────────────────────────
export const comments = pgTable('comments', {
  id:        serial('id').primaryKey(),
  mangaId:   text('manga_id').notNull().references(() => mangas.id, { onDelete: 'cascade' }),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  text:      text('text').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deleted:   boolean('deleted').notNull().default(false),
}, (t) => [
  index('comments_manga_id_idx').on(t.mangaId),
]);
```

### 1.2 Crear `lib/db/index.ts`

```typescript
// lib/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// La connection string viene de Supabase → Settings → Database → Connection string (Transaction mode)
const connectionString = process.env.DATABASE_URL!;

// Deshabilitar prefetch para entornos serverless
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
```

Añadir a `.env.local`:
```env
# Supabase → Settings → Database → Connection string → Transaction pooler (port 6543)
DATABASE_URL=postgresql://postgres.xxxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### 1.3 Crear `drizzle.config.ts` en la raíz

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

### 1.4 Añadir scripts en `package.json`

```json
"scripts": {
  "db:push":    "drizzle-kit push",
  "db:studio":  "drizzle-kit studio",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate"
}
```

### 1.5 Empujar el schema a Supabase

```bash
npm run db:push
```

Esto crea todas las tablas en Supabase automáticamente. Para verificar, abrir `npm run db:studio` y ver las tablas en el navegador.

---

## Fase 2 — Migración de datos JSON a Supabase {#fase-2}

### 2.1 Crear script de migración `scripts/seed.ts`

```typescript
// scripts/seed.ts
import { db } from '../lib/db';
import { mangas, chapters } from '../lib/db/schema';
import mangasData from '../public/data/mangas.json';
import chaptersData from '../public/data/chapters.json';

async function seed() {
  console.log('Sembrando mangas...');

  // Insertar mangas en lotes de 20
  for (let i = 0; i < mangasData.mangas.length; i += 20) {
    const batch = mangasData.mangas.slice(i, i + 20).map((m) => ({
      id:            m.id,
      title:         m.title,
      image:         m.image,
      description:   m.description,
      genres:        m.genres,
      type:          m.type,
      status:        m.status,
      dateAdded:     m.dateAdded,
      lastUpdated:   m.lastUpdated,
      latestChapter: m.latestChapter,
      featured:      false,
      views:         0,
    }));
    await db.insert(mangas).values(batch).onConflictDoNothing();
    console.log(`  ${Math.min(i + 20, mangasData.mangas.length)}/${mangasData.mangas.length} mangas`);
  }

  console.log('Sembrando capítulos...');

  for (let i = 0; i < chaptersData.chapters.length; i += 50) {
    const batch = chaptersData.chapters.slice(i, i + 50).map((c) => ({
      mangaId: c.mangaId,
      chapter: c.chapter,
      baseUrl: c.baseUrl ?? null,
      pages:   c.pages,
    }));
    await db.insert(chapters).values(batch).onConflictDoNothing();
    console.log(`  ${Math.min(i + 50, chaptersData.chapters.length)}/${chaptersData.chapters.length} capítulos`);
  }

  console.log('✅ Migración completada');
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
```

Añadir a `package.json`:
```json
"db:seed": "npx tsx scripts/seed.ts"
```

Instalar el runner de TypeScript:
```bash
npm install -D tsx
```

Ejecutar la migración:
```bash
npm run db:seed
```

---

## Fase 3 — Reemplazar lib/data.ts con consultas reales + ISR {#fase-3}

### 3.1 Reescribir `lib/data.ts`

```typescript
// lib/data.ts
import { db } from './db';
import { mangas, chapters } from './db/schema';
import { eq, desc, asc } from 'drizzle-orm';
import type { Manga, Chapter } from './types';

// Mappers: convierte filas de BD al tipo existente Manga/Chapter
function rowToManga(row: typeof mangas.$inferSelect): Manga {
  return {
    id:            row.id,
    title:         row.title,
    slug:          row.id,           // mantener compatibilidad con el tipo
    image:         row.image,
    description:   row.description,
    genres:        row.genres,
    type:          row.type,
    status:        row.status,
    chapters:      [],               // se carga por separado cuando se necesita
    dateAdded:     row.dateAdded,
    lastUpdated:   row.lastUpdated,
    latestChapter: row.latestChapter,
  };
}

function rowToChapter(row: typeof chapters.$inferSelect): Chapter {
  return {
    mangaId: row.mangaId,
    chapter: row.chapter,
    baseUrl: row.baseUrl ?? undefined,
    pages:   row.pages,
  };
}

export async function getAllMangas(): Promise<Manga[]> {
  const rows = await db.select().from(mangas).orderBy(desc(mangas.lastUpdated));
  return rows.map(rowToManga);
}

export async function getMangaById(id: string): Promise<Manga | null> {
  const rows = await db.select().from(mangas).where(eq(mangas.id, id)).limit(1);
  return rows[0] ? rowToManga(rows[0]) : null;
}

export async function getAllChapters(): Promise<Chapter[]> {
  const rows = await db.select().from(chapters).orderBy(asc(chapters.chapter));
  return rows.map(rowToChapter);
}

export async function getChapter(mangaId: string, cap: number): Promise<Chapter | null> {
  const rows = await db
    .select()
    .from(chapters)
    .where(eq(chapters.mangaId, mangaId))
    .limit(1);
  const found = rows.find((r) => r.chapter === cap);
  return found ? rowToChapter(found) : null;
}

export async function getChaptersByManga(mangaId: string): Promise<Chapter[]> {
  const rows = await db
    .select()
    .from(chapters)
    .where(eq(chapters.mangaId, mangaId))
    .orderBy(asc(chapters.chapter));
  return rows.map(rowToChapter);
}

export async function getMostViewed(limit = 6): Promise<Manga[]> {
  const rows = await db
    .select()
    .from(mangas)
    .orderBy(desc(mangas.views))
    .limit(limit);
  return rows.map(rowToManga);
}

export async function incrementViews(mangaId: string): Promise<void> {
  await db
    .update(mangas)
    .set({ views: db.raw('views + 1') })   // SQL: views = views + 1
    .where(eq(mangas.id, mangaId));
}
```

### 3.2 Añadir ISR a las páginas

En cada `page.tsx` de segmentos con contenido, añadir:

```typescript
// app/manga/[id]/page.tsx  — se regenera cada hora
export const revalidate = 3600;

// app/page.tsx  — se regenera cada 30 minutos
export const revalidate = 1800;

// app/mangas/page.tsx  — se regenera cada hora
export const revalidate = 3600;

// app/actualizaciones/page.tsx  — se regenera cada 30 minutos
export const revalidate = 1800;
```

Esto significa que Next.js sirve la página en caché (ultra rápida) y la regenera en background cuando pasa el tiempo indicado. No se necesita rebuild para que aparezca nuevo contenido.

### 3.3 Revalidación on-demand desde el admin

Cuando el admin añade un capítulo nuevo, invalidar la caché de esa página inmediatamente:

```typescript
// lib/revalidate.ts
import { revalidatePath } from 'next/cache';

export function revalidateManga(mangaId: string) {
  revalidatePath(`/manga/${mangaId}`);
  revalidatePath('/');
  revalidatePath('/mangas');
  revalidatePath('/actualizaciones');
}
```

Llamar a `revalidateManga(mangaId)` al final del POST de capítulo en el admin.

### 3.4 Actualizar `app/page.tsx` — popularidad real

Reemplazar el array `MOST_VIEWED_IDS` hardcodeado:

```typescript
// Antes:
const mostViewed = mangas.filter((m) => MOST_VIEWED_IDS.includes(m.id));

// Después:
import { getMostViewed } from '@/lib/data';
const mostViewed = await getMostViewed(6);
```

---

## Fase 4 — Panel de admin en producción {#fase-4}

### 4.1 Crear middleware de autenticación para el admin

```typescript
// middleware.ts (en la raíz del proyecto)
import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  // Proteger rutas /admin y /api/admin
  if (req.nextUrl.pathname.startsWith('/admin') ||
      req.nextUrl.pathname.startsWith('/api/admin')) {

    const authHeader = req.headers.get('authorization');
    const password = process.env.ADMIN_PASSWORD;

    // Verificar Basic Auth
    if (authHeader) {
      const encoded = authHeader.split(' ')[1];
      const decoded = atob(encoded);
      const [, pass] = decoded.split(':');
      if (pass === password) return NextResponse.next();
    }

    // Si no está autenticado, pedir credenciales
    return new NextResponse('Acceso denegado', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin Grandiel Scan"' },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
```

### 4.2 Quitar el guard de `NODE_ENV` en las rutas API del admin

En `app/api/admin/manga/route.ts` y `app/api/admin/chapter/route.ts`, eliminar la función `guard()` y su llamada. El middleware ya protege estas rutas con contraseña.

```typescript
// Eliminar esto de ambos archivos:
function guard() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Solo disponible en desarrollo local.' }, { status: 403 });
  }
  return null;
}
// Y también eliminar: const block = guard(); if (block) return block;
```

### 4.3 Actualizar las rutas API del admin para usar Drizzle

Las rutas del admin actualmente usan `fs.readFileSync`. Hay que reemplazar todas las operaciones de archivo con consultas a Drizzle:

**Ejemplo — POST de capítulo (fragmento):**

```typescript
// Antes:
const chaptersData = readFile(CHAPTERS_FILE);
chaptersData.chapters.push(chapter);
writeFile(CHAPTERS_FILE, chaptersData);

// Después:
import { db } from '@/lib/db';
import { chapters, mangas } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidateManga } from '@/lib/revalidate';

// Insertar capítulo:
await db.insert(chapters).values({
  mangaId: chapter.mangaId,
  chapter: chapter.chapter,
  baseUrl: chapter.baseUrl ?? null,
  pages:   chapter.pages,
});

// Actualizar latestChapter en el manga:
await db
  .update(mangas)
  .set({
    latestChapter: chapter.chapter,
    lastUpdated:   new Date().toISOString().split('T')[0],
  })
  .where(eq(mangas.id, chapter.mangaId));

// Revalidar caché de esa página:
revalidateManga(chapter.mangaId);
```

Este mismo patrón aplica para POST/PATCH/DELETE de mangas y capítulos.

---

## Fase 5 — Autenticación real (Supabase Auth) {#fase-5}

### 5.1 Crear clientes de Supabase

```typescript
// lib/supabase/client.ts  — para uso en el navegador ('use client')
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

```typescript
// lib/supabase/server.ts  — para Server Components y Route Handlers
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {}
        },
      },
    },
  );
}
```

### 5.2 Añadir middleware de sesión

```typescript
// En middleware.ts, añadir antes del bloque de admin:
import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({ request: req });

  // Refrescar sesión de Supabase en cada request
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            response = NextResponse.next({ request: req });
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );
  await supabase.auth.getUser();

  // ... resto del middleware (admin guard)
  return response;
}
```

### 5.3 Crear rutas de autenticación

```typescript
// app/api/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/perfil`);
}
```

### 5.4 Crear trigger en Supabase para sincronizar auth → users

En el SQL Editor de Supabase, ejecutar:

```sql
-- Trigger: cuando se crea un usuario en auth.users, crear su fila en public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username, avatar, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar', '/img/avatars/avatar1.svg'),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 5.5 Actualizar `UserProfileProvider` en `Providers.tsx`

Reemplazar el sistema actual de localStorage por Supabase Auth:

```typescript
// En Providers.tsx — reemplazar UserProfileProvider completo
'use client';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

function UserProfileProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Cargar sesión actual
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) loadProfile(user.id);
    });

    // Escuchar cambios de sesión (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) loadProfile(session.user.id);
        else setProfile(null);
      },
    );
    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) setProfile({ id: data.id, username: data.username, avatar: data.avatar, createdAt: new Date(data.created_at).getTime() });
  };

  const register = async (username: string, avatar: string) => {
    // Crear cuenta con email temporal o magic link
    // (ver sección de UI de registro más abajo)
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const updateProfile = async (updates: Partial<Pick<UserProfile, 'username' | 'avatar'>>) => {
    if (!profile) return;
    await supabase.from('users').update(updates).eq('id', profile.id);
    setProfile((prev) => prev ? { ...prev, ...updates } : prev);
  };

  return (
    <UserProfileContext.Provider value={{ profile, isLoggedIn: !!profile, register, updateProfile, logout }}>
      {children}
    </UserProfileContext.Provider>
  );
}
```

### 5.6 Flujo de registro actualizado en `PerfilClient.tsx`

Con Supabase Auth, el usuario se registra con email:

```typescript
const register = async (username: string, avatar: string, email: string) => {
  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password: crypto.randomUUID(), // contraseña aleatoria si usamos magic link
    options: {
      data: { username, avatar },
      emailRedirectTo: `${window.location.origin}/api/auth/callback`,
    },
  });
  if (error) setRegError(error.message);
  else setRegSuccess(true); // "Revisa tu email para confirmar tu cuenta"
};
```

> **Alternativa sin email:** Usar "Anonymous Sign In" de Supabase para crear usuarios sin email. Luego pueden asociar un email después si quieren. Esto es más similar al flujo actual.

### 5.7 Configurar Row Level Security (RLS) en Supabase

En SQL Editor de Supabase, ejecutar:

```sql
-- Activar RLS en todas las tablas de usuarios
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Users: cada uno solo ve/modifica su propio perfil
CREATE POLICY "users_own" ON users
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Favorites: cada uno solo ve/modifica sus propios favoritos
CREATE POLICY "favorites_own" ON favorites
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- History: cada uno solo ve/modifica su propio historial
CREATE POLICY "history_own" ON reading_history
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Comments: todos pueden leer (no eliminados), cada uno modifica los suyos
CREATE POLICY "comments_read" ON comments FOR SELECT
  USING (deleted = false);

CREATE POLICY "comments_insert" ON comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments_update" ON comments FOR UPDATE
  USING (auth.uid() = user_id);

-- Mangas y capítulos: lectura pública, escritura solo desde service_role (server)
ALTER TABLE mangas ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mangas_read" ON mangas FOR SELECT USING (true);
CREATE POLICY "chapters_read" ON chapters FOR SELECT USING (true);
```

---

## Fase 6 — Favoritos e historial sincronizados en BD {#fase-6}

### 6.1 Estrategia dual (guests + usuarios autenticados)

- **Sin cuenta:** favoritos e historial siguen en `localStorage` (comportamiento actual)
- **Con cuenta:** favoritos e historial se guardan en Supabase y se sincronizan al hacer login

### 6.2 Actualizar `FavoritesProvider` en `Providers.tsx`

```typescript
function FavoritesProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const { profile } = useUserProfile();
  const [favorites, setFavorites] = useState<string[]>([]);

  // Cargar favoritos: BD si está autenticado, localStorage si no
  useEffect(() => {
    if (profile) {
      supabase
        .from('favorites')
        .select('manga_id')
        .eq('user_id', profile.id)
        .then(({ data }) => {
          if (data) setFavorites(data.map((r) => r.manga_id));
        });
    } else {
      try {
        const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.FAVORITES);
        if (stored) setFavorites(JSON.parse(stored));
      } catch {}
    }
  }, [profile?.id]);

  const toggle = useCallback(async (mangaId: string) => {
    const isCurrentlyFav = favorites.includes(mangaId);

    if (profile) {
      // Actualizar en BD
      if (isCurrentlyFav) {
        await supabase.from('favorites').delete()
          .eq('user_id', profile.id).eq('manga_id', mangaId);
      } else {
        await supabase.from('favorites').insert({ user_id: profile.id, manga_id: mangaId });
      }
    } else {
      // Actualizar en localStorage
      const next = isCurrentlyFav
        ? favorites.filter((id) => id !== mangaId)
        : [...favorites, mangaId];
      try { localStorage.setItem(CONFIG.STORAGE_KEYS.FAVORITES, JSON.stringify(next)); } catch {}
    }

    setFavorites((prev) =>
      isCurrentlyFav ? prev.filter((id) => id !== mangaId) : [...prev, mangaId],
    );
  }, [favorites, profile]);

  // ... resto igual
}
```

El mismo patrón aplica para `HistoryProvider` con la tabla `reading_history`.

---

## Fase 7 — Sistema de comentarios real {#fase-7}

### 7.1 Crear API Route para comentarios

```typescript
// app/api/comments/[mangaId]/route.ts

import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { comments, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

// GET — obtener comentarios de un manga
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ mangaId: string }> },
) {
  const { mangaId } = await params;
  const rows = await db
    .select({
      id:        comments.id,
      text:      comments.text,
      createdAt: comments.createdAt,
      username:  users.username,
      avatar:    users.avatar,
    })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .where(and(eq(comments.mangaId, mangaId), eq(comments.deleted, false)))
    .orderBy(comments.createdAt);

  return NextResponse.json(rows);
}

// POST — publicar comentario (requiere autenticación)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ mangaId: string }> },
) {
  const { mangaId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Debes iniciar sesión para comentar.' }, { status: 401 });
  }

  const { text } = await req.json();
  if (!text?.trim() || text.length > 500) {
    return NextResponse.json({ error: 'Comentario inválido.' }, { status: 400 });
  }

  const [comment] = await db
    .insert(comments)
    .values({ mangaId, userId: user.id, text: text.trim() })
    .returning();

  return NextResponse.json({ ok: true, comment });
}

// DELETE — eliminar comentario propio
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const { commentId } = await req.json();
  await db
    .update(comments)
    .set({ deleted: true })
    .where(and(eq(comments.id, commentId), eq(comments.userId, user.id)));

  return NextResponse.json({ ok: true });
}
```

### 7.2 Actualizar `MangaComments.tsx`

Reemplazar el sistema de localStorage por llamadas a la API:

```typescript
// components/manga/MangaComments.tsx
'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Comment {
  id: number;
  text: string;
  username: string;
  avatar: string;
  createdAt: string;
}

export default function MangaComments({ mangaId }: { mangaId: string }) {
  const supabase = createClient();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newText, setNewText] = useState('');
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Cargar comentarios
    fetch(`/api/comments/${mangaId}`)
      .then((r) => r.json())
      .then(setComments);

    // Obtener usuario actual
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, [mangaId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    setLoading(true);

    const res = await fetch(`/api/comments/${mangaId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newText }),
    });

    if (res.ok) {
      setNewText('');
      // Recargar comentarios
      const updated = await fetch(`/api/comments/${mangaId}`).then((r) => r.json());
      setComments(updated);
    }
    setLoading(false);
  };

  // ... render igual que antes pero con datos reales
}
```

---

## Fase 8 — Seguimiento de vistas y popularidad real {#fase-8}

### 8.1 Registrar vistas desde la página de manga

```typescript
// app/manga/[id]/page.tsx
// Añadir al Server Component (se ejecuta en el servidor, no en el cliente):
import { incrementViews } from '@/lib/data';

export default async function MangaPage({ params }: ...) {
  const { id } = await params;

  // Registrar vista en background (no bloquea el render)
  // Usar 'after' de Next.js 15 para ejecutar después de enviar la respuesta
  import { unstable_after as after } from 'next/server';
  after(async () => {
    await incrementViews(id);
  });

  const manga = await getMangaById(id);
  // ... resto igual
}
```

> `after()` es una función de Next.js 15 que ejecuta código **después** de enviar la respuesta al usuario, sin ralentizar la carga de la página.

### 8.2 Actualizar `app/page.tsx` para usar popularidad real

```typescript
// Reemplazar el array MOST_VIEWED_IDS hardcodeado:
import { getMostViewed } from '@/lib/data';

export default async function HomePage() {
  const [mangas, mostViewed] = await Promise.all([
    getAllMangas(),
    getMostViewed(6),
  ]);
  // ... resto igual, ya no necesitas MOST_VIEWED_IDS
}
```

---

## Fase 9 — Progreso de lectura dentro del capítulo {#fase-9}

### 9.1 Actualizar el tipo `HistoryEntry`

```typescript
// lib/types.ts — añadir campo page
export interface HistoryEntry {
  mangaId:   string;
  chapter:   number;
  page:      number;    // ← NUEVO: página dentro del capítulo
  timestamp: number;
  title:     string;
}
```

### 9.2 Guardar la página actual en `ChapterReader.tsx`

En el lector de capítulos, detectar la página visible y guardarla:

```typescript
// En ChapterReader.tsx — cuando el usuario avanza de página:
const handlePageChange = (newPage: number) => {
  setCurrentPage(newPage);

  // Actualizar historial con la página actual
  addEntry({
    mangaId:   mangaId,
    chapter:   chapterNum,
    page:      newPage,
    timestamp: Date.now(),
    title:     mangaTitle,
  });
};
```

### 9.3 Restaurar la página al entrar al capítulo

```typescript
// En ChapterReader.tsx — al montar el componente:
useEffect(() => {
  const lastRead = getLastRead(mangaId);
  if (lastRead?.chapter === chapterNum && lastRead.page > 1) {
    setCurrentPage(lastRead.page);
  }
}, []);
```

### 9.4 Actualizar tabla en BD (para usuarios autenticados)

La columna `page` ya está incluida en el schema de `reading_history` de la Fase 1. Solo hay que actualizar los `INSERT`/`UPDATE` del `HistoryProvider` para incluirla.

---

## Fase 10 — Notificaciones push de nuevos capítulos {#fase-10}

### 10.1 Generar claves VAPID

```bash
npx web-push generate-vapid-keys
```

Añadir a `.env.local`:
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxA
VAPID_PRIVATE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 10.2 Instalar dependencia del servidor

```bash
npm install web-push
npm install -D @types/web-push
```

### 10.3 Crear tabla de suscripciones

Añadir al schema en `lib/db/schema.ts`:

```typescript
export const pushSubscriptions = pgTable('push_subscriptions', {
  id:           serial('id').primaryKey(),
  userId:       text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  endpoint:     text('endpoint').notNull().unique(),
  p256dh:       text('p256dh').notNull(),
  auth:         text('auth').notNull(),
  createdAt:    timestamp('created_at').defaultNow(),
});
```

### 10.4 Registrar suscripción desde el cliente

```typescript
// lib/push.ts
export async function subscribeToPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  });

  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription.toJSON()),
  });

  return true;
}
```

### 10.5 API Route para guardar suscripciones

```typescript
// app/api/push/subscribe/route.ts
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { pushSubscriptions } from '@/lib/db/schema';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const sub = await req.json();
  await db.insert(pushSubscriptions).values({
    userId:   user?.id ?? null,
    endpoint: sub.endpoint,
    p256dh:   sub.keys.p256dh,
    auth:     sub.keys.auth,
  }).onConflictDoNothing();

  return NextResponse.json({ ok: true });
}
```

### 10.6 Enviar notificación cuando se añade un capítulo

En la API del admin, después de insertar un capítulo, enviar notificaciones a los usuarios que tengan ese manga en favoritos:

```typescript
// En app/api/admin/chapter/route.ts — POST, al final:
import webpush from 'web-push';
import { db } from '@/lib/db';
import { pushSubscriptions, favorites } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

webpush.setVapidDetails(
  'mailto:admin@grandielscan.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

async function notifyFavoriteUsers(mangaId: string, mangaTitle: string, chapterNum: number) {
  // Obtener suscripciones de usuarios que tienen este manga en favoritos
  const favUsers = await db
    .select({ userId: favorites.userId })
    .from(favorites)
    .where(eq(favorites.mangaId, mangaId));

  if (!favUsers.length) return;

  const userIds = favUsers.map((f) => f.userId);
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(inArray(pushSubscriptions.userId, userIds));

  const payload = JSON.stringify({
    title: `Nuevo capítulo — ${mangaTitle}`,
    body:  `Capítulo ${chapterNum} ya disponible`,
    url:   `/chapter/${mangaId}/${chapterNum}`,
    icon:  '/img/logo.jpg',
  });

  await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      ),
    ),
  );
}
```

### 10.7 Actualizar `sw.js` para manejar las notificaciones push

Añadir al service worker:

```javascript
// En public/sw.js — añadir estos event listeners:

self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:  data.body,
      icon:  data.icon || '/img/logo.jpg',
      badge: '/img/logo.jpg',
      data:  { url: data.url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      const client = windowClients.find((c) => c.url.includes(self.location.origin));
      if (client) return client.navigate(url).then((c) => c.focus());
      return clients.openWindow(url);
    }),
  );
});
```

---

## Resumen de archivos a crear/modificar

### Archivos nuevos
```
lib/db/index.ts
lib/db/schema.ts
lib/supabase/client.ts
lib/supabase/server.ts
lib/revalidate.ts
lib/push.ts
scripts/seed.ts
drizzle.config.ts
middleware.ts
app/api/auth/callback/route.ts
app/api/comments/[mangaId]/route.ts
app/api/push/subscribe/route.ts
```

### Archivos a modificar
```
lib/data.ts                         ← queries a Drizzle en vez de fs
lib/types.ts                        ← añadir page a HistoryEntry
lib/config.ts                       ← eliminar MOST_VIEWED_IDS
components/providers/Providers.tsx  ← auth real, favorites y history en BD
components/manga/MangaComments.tsx  ← comentarios compartidos desde API
components/chapter/ChapterReader.tsx← guardar/restaurar página
app/api/admin/manga/route.ts        ← usar Drizzle + quitar NODE_ENV guard
app/api/admin/chapter/route.ts      ← usar Drizzle + notificaciones
app/page.tsx                        ← getMostViewed() real
app/manga/[id]/page.tsx             ← revalidate + incrementViews con after()
app/mangas/page.tsx                 ← revalidate
app/actualizaciones/page.tsx        ← revalidate
public/sw.js                        ← manejar eventos push
package.json                        ← nuevos scripts de BD
.env.local                          ← nuevas variables
```

---

## Orden de implementación recomendado

```
Fase 0  → Fase 1  → Fase 2  → Fase 3  → Fase 4
(Setup)   (Schema)  (Seed)   (data.ts)  (Admin prod)

         ↓
Fase 5  → Fase 6  → Fase 7  → Fase 8  → Fase 9  → Fase 10
(Auth)   (Favs/Hist)(Coments)(Vistas)  (Progreso)(Push notif)
```

Las fases 0–4 son las más críticas (base de datos + admin funcional en producción) y representan el mayor impacto. Las fases 5–10 pueden implementarse incrementalmente después.

---

*Documento generado el 2026-03-03 para Grandiel Scan v2.0*
