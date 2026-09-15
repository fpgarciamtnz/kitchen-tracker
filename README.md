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

La compilación usa el preset `cloudflare_module` y el driver D1 de NuxtHub en producción. Configura una base D1 y su binding `DB` en Cloudflare; el identificador se puede proporcionar mediante `NUXT_HUB_CLOUDFLARE_DATABASE_ID`. El PIN y `NUXT_SESSION_SECRET` deben configurarse como variables privadas del proyecto.

En Workers Builds, usa `pnpm run build` como comando de compilación y `pnpm run deploy` como comando de despliegue. El nombre `kitchen-tracker` se configura en `nitro.cloudflare.wrangler.name` dentro de `nuxt.config.ts`. Nitro genera `.output/server/wrangler.json` con el punto de entrada y los assets, y `.wrangler/deploy/config.json` dirige Wrangler a esa configuración. Estos archivos se generan durante la compilación y no se deben guardar en Git.

La lista inicial está en [`shared/cleaning.ts`](./shared/cleaning.ts). El estado persistido se guarda como un único documento JSON en la tabla `cleaning_state`; cada tarea mantiene su historial de eventos `{ id, timestamp, by }`.
