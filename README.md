# Kitchen Tracker

Aplicación móvil para registrar la limpieza semanal y profunda de una cocina. Está construida con Nuxt 4, NuxtHub Database, VueUse, shadcn-vue y Cloudflare Workers.

## Desarrollo

```bash
pnpm install
pnpm dev
```

El desarrollo usa una base SQLite local en `.data/db/sqlite.db`. El PIN local es `2828` por defecto.

Puedes cambiar los valores sin modificar el código:

```bash
NUXT_CLEANING_PIN=2828 \
NUXT_SESSION_SECRET='un-secreto-de-al-menos-32-caracteres' \
pnpm dev
```

## Comprobaciones

```bash
pnpm typecheck
pnpm test
pnpm build
```

## Cloudflare

La compilación usa el preset `cloudflare_module` y el driver D1 de NuxtHub en producción. El binding `DB` de `wrangler.toml` apunta a la base D1 existente `kitchen-tracker-db`. Esa configuración se conserva en el archivo de despliegue generado por Nitro. El PIN y `NUXT_SESSION_SECRET` deben configurarse como variables privadas del proyecto.

En Workers Builds, usa `pnpm run build` como comando de compilación y `pnpm run deploy` como comando de despliegue. El nombre `kitchen-tracker` se configura en `nitro.cloudflare.wrangler.name` dentro de `nuxt.config.ts`. Nitro genera `.output/server/wrangler.json` con el punto de entrada y los assets, y `.wrangler/deploy/config.json` dirige Wrangler a esa configuración. Estos archivos se generan durante la compilación y no se deben guardar en Git.

La lista inicial está en [`shared/cleaning.ts`](./shared/cleaning.ts). El estado persistido se guarda como un único documento JSON en la tabla `cleaning_state` de Cloudflare D1; cada tarea conserva solo sus dos eventos más recientes `{ id, timestamp, by }`.

## Idioma

Nuxt i18n usa inglés (`en`) como único idioma y como idioma predeterminado, sin detección del navegador ni prefijo en las rutas. Los textos, incluidas las tareas, están en `i18n/locales/en.json`. Las rutas son `/weekly`, `/deep` y `/profile`; las antiguas rutas en español redirigen a ellas.

## Logs y diagnóstico

`evlog/nuxt` registra un evento estructurado por petición API con acción, duración, estado y `requestId`. Conserva el 10% de las peticiones normales y todos los errores, avisos, peticiones de más de un segundo y operaciones de guardar/deshacer.

El cliente registra el inicio, la verificación de sesión, el guardado del perfil, guardar/deshacer y los fallos de las peticiones. También captura errores de Vue y JavaScript y promesas rechazadas sin manejar. `transport.enabled` envía estos eventos automáticamente a `/api/_evlog/ingest`. El hook del servidor los pasa a la salida estructurada de evlog con `source: client`, para que aparezcan en Workers Logs junto a los eventos del servidor. El endpoint usa las comprobaciones de origen y tamaño de evlog; solo se conservan campos de diagnóstico permitidos.

No se registran PIN, cookies, nombres, cuerpos completos ni parámetros SQL. Los errores de peticiones del cliente incluyen el `requestId` recibido en `x-request-id`, que permite encontrar la petición correspondiente en el servidor.

En Cloudflare, abre el Worker `kitchen-tracker` y su sección **Observability → Logs**. Filtra por `requestId`, `action`, `source` o `level`. `wrangler.toml` activa Logs, desactiva los logs rutinarios de invocación y conserva el 10% de las trazas. Los eventos que evlog decide conservar no se vuelven a muestrear en Workers Logs.

La tabla `cleaning_state` ya existe en producción. Su esquema está en `server/db/migrations/sqlite/0000_create_cleaning_state.sql`; usa `CREATE TABLE IF NOT EXISTS` y conserva los datos existentes. Para una instalación nueva, aplica las migraciones antes de desplegar:

```bash
pnpm run build
pnpm exec wrangler d1 migrations apply kitchen-tracker-db --remote
pnpm run deploy
```

El commit `41e9cc0` sustituyó D1 por un namespace KV sin configurar. La corrección restaura D1 y su formato de datos original; no requiere crear KV ni migrar los registros de limpieza.
