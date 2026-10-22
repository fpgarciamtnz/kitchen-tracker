# Kitchen Tracker

Aplicación móvil para organizar la preparación del siguiente turno, recordar pedidos y registrar la limpieza semanal y profunda de una cocina. Está construida con Nuxt 4, NuxtHub Database, VueUse, shadcn-vue y Cloudflare Workers.

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

Nuxt i18n usa inglés (`en`) como único idioma y como idioma predeterminado, sin detección del navegador ni prefijo en las rutas. Los textos, incluidas las tareas, están en `i18n/locales/en.json`. Las rutas son `/prep`, `/prep/create`, `/prep/edit`, `/order`, `/cleaning` y `/profile`. Cleaning tracker es una función secundaria: reúne las listas semanal y profunda, con su orden e historial independientes. `/weekly` y `/deep` redirigen a la sección correspondiente; las rutas antiguas en español siguen funcionando.

## Logs y diagnóstico

`evlog/nuxt` registra un evento estructurado por petición API con acción, duración, estado y `requestId`. Conserva el 10% de las peticiones normales y todos los errores, avisos, peticiones de más de un segundo y operaciones de guardar/deshacer.

El cliente registra el inicio, la verificación de sesión, el guardado del perfil, guardar/deshacer y los fallos de las peticiones. También captura errores de Vue y JavaScript y promesas rechazadas sin manejar. `transport.enabled` envía estos eventos automáticamente a `/api/_evlog/ingest`. El hook del servidor los pasa a la salida estructurada de evlog con `source: client`, para que aparezcan en Workers Logs junto a los eventos del servidor. El endpoint usa las comprobaciones de origen y tamaño de evlog; solo se conservan campos de diagnóstico permitidos.

No se registran PIN, cookies, nombres, cuerpos completos ni parámetros SQL. Los errores de peticiones del cliente incluyen el `requestId` recibido en `x-request-id`, que permite encontrar la petición correspondiente en el servidor.

En Cloudflare, abre el Worker `kitchen-tracker` y su sección **Observability → Logs**. Filtra por `requestId`, `action`, `source` o `level`. `wrangler.toml` activa Logs, desactiva los logs rutinarios de invocación y conserva el 10% de las trazas. Los eventos que evlog decide conservar no se vuelven a muestrear en Workers Logs.

La tabla `cleaning_state` ya existe en producción. Su esquema está en `server/db/migrations/sqlite/0000_create_cleaning_state.sql`; usa `CREATE TABLE IF NOT EXISTS` y conserva los datos existentes. El comando de despliegue aplica primero las migraciones pendientes y se detiene si fallan. Usa la configuración generada por la compilación para localizar las migraciones y la base correcta:

```bash
pnpm run build
pnpm run deploy
```

El commit `41e9cc0` sustituyó D1 por un namespace KV sin configurar. La corrección restaura D1 y su formato de datos original; no requiere crear KV ni migrar los registros de limpieza.

## Prep list y order list

La entrada `/` abre `/prep`, la lista publicada con solo los ítems seleccionados. La navegación tiene Prep list, Order list, Cleaning y Profile.

Toda prep list nueva empieza como borrador en `/prep/create` y se ve en la cocina solo al pulsar **Publish prep list**. Mientras tanto la lista anterior sigue visible y `/prep` muestra un aviso para continuar el borrador. Empezar otra lista nunca borra un borrador ajeno: hay que descartarlo de forma explícita. `/prep/edit` cambia la lista publicada y `/prep/create?edit=1` redirige ahí. `/prep/menu` configura platos, ítems y los productos que necesita cada ítem.

La order list (`/order`) se rellena sola: al seleccionar un ítem, sus productos aparecen marcados. Quien hace el pedido desmarca lo que todavía hay, marca productos del catálogo independiente (aceite, sal, limpieza…, editable en `/order/products`) y añade cualquier otro producto a mano. Un producto marcado se considera pedido. Pertenece a su prep list: al publicar una lista nueva, la order list anterior deja de usarse. No hace pedidos ni calcula cantidades.

Ambas listas se imprimen, se descargan en PDF o se comparten como texto (WhatsApp o cualquier app; sin menú de compartir, el texto se copia).

El estado vive en `prep_state`, en la misma conexión D1. Cada comando describe un cambio concreto, así que el servidor lo aplica sobre la última versión aunque otro móvil haya guardado antes. Solo hay conflicto real cuando dos personas editan a la vez las mismas notas, el menú o el catálogo, o cuando la lista ya no existe. La escritura sigue protegida por una revisión atómica.

### Historial (seguimiento)

Cada lista publicada deja una fila por ítem y por producto pedido en `prep_history` (migración `0003_create_prep_history.sql`), con la fecha de la lista y cuándo se tachó cada tarea. Al crear una lista y en la order list se muestra «Last: …» con la última vez. Si la tabla falta, la lista se guarda igualmente y el log registra `prep_history` con `missing_table`. El plan por fases para usar este historial está en [docs/prep-list-plan.md](docs/prep-list-plan.md#history-and-future-suggestions).

Las migraciones están en `server/db/migrations/sqlite/`. NuxtHub las aplica en desarrollo y `pnpm run deploy` las aplica en producción antes de publicar el Worker. Requiere permisos de escritura en D1. Para reparar una instalación ya desplegada sin publicar código, ejecuta `pnpm run build` y `pnpm run db:migrate`. Si falta `prep_state`, `/api/prep` devuelve 503 aunque el inicio de sesión y la limpieza funcionen.

La impresión genera PDFs de 72 mm y abre Star PassPRNT con el mismo protocolo que la aplicación anterior. Requiere Star PassPRNT instalado y conectado a la impresora de cocina. También se puede descargar el PDF. Los recibos incluyen lo seleccionado y las notas completas, aunque se hayan tachado tareas en el móvil. La fecha se toma de la lista y no cambia al reimprimir por la mañana.

El alcance y la auditoría están en [docs/prep-list-plan.md](docs/prep-list-plan.md).
