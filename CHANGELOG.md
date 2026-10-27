# CHANGELOG — CMS Front Kit

Versiones del kit, con tag de git `vX.Y.Z`. Semver aplicado al kit:

- **Mayor** — cambia algo que obliga a tocar el proyecto (un fichero que
  cambia de sitio, un comando que cambia de contrato, una variable de entorno
  que cambia de nombre).
- **Menor** — una skill, una regla o un comando nuevo, sin tocar nada del
  proyecto.
- **Parche** — una corrección.

La versión del kit **no es** la del CMS ni la del SDK: el kit sirve con
cualquiera de ellas.

En un proyecto: `npm run cms:estado` para ver la versión instalada y
`npm run cms:actualizar` para traer la última.

## v0.4.0 — 2026-10-27

### Qué trae

- **Nueva base de medios: `https://medios.rzlcdn.com`.** Los medios del CMS
  se sirven desde ahí desde el 2026-10-26. La anterior (el almacén de
  Supabase) queda **retirada**: sigue sirviendo lo subido antes del cambio,
  pero **lo subido después da 404**, fotos y vídeos.
- **`cms:comprobar` marca como fallo una dirección retirada** y dice cuál
  poner. Antes solo miraba si respondía, y la retirada responde. El
  manifiesto gana `retiradas`, con las direcciones que ya no valen.
- **`cms:comprobar` avisa si `next.config` no deja pasar el dominio de los
  medios** en `images.remotePatterns`. Lo lee del fuente, no lo evalúa.
- La skill `cms-front-nextjs` y el CHECKLIST (punto 6) lo dicen.

### Al actualizar desde v0.3.0

🔴 **Esto sí obliga a tocar el proyecto.** `cms:actualizar` no toca tu
`.env.local` ni las variables del hosting:

1. `npm run cms:actualizar`.
2. En `.env.local` **y en las variables del hosting** (Vercel…):
   `MEDIA_BASE_URL=https://medios.rzlcdn.com`.
3. Si usas `next/image`: añade
   `{ protocol: "https", hostname: "medios.rzlcdn.com" }` a
   `images.remotePatterns` en `next.config`.
4. Vuelve a desplegar.
5. `npm run cms:comprobar` tiene que salir sin el fallo de la dirección
   retirada.

El SDK no cambia: la `0.6.0` vale, y su registro sigue siendo el mismo.

## v0.3.0 — 2026-10-22

### Qué trae

- **Skill nueva `cms-front-seo`:** todo lo que un front del kit tiene que
  cumplir para salir bien en Google, y una **tabla de cierre** (S1-S22) que el
  agente rellena entera antes de dar el front por terminado: ✅ con el fichero,
  ➖ con una condición observable o ❌ con lo que falta y a quién se le pide.
  - **Lo que se pinta:** todo en el HTML del servidor, metadatos con fallback,
    canonical, hreflang, Open Graph con imagen 1200×630 real, JSON-LD global y
    por tipo de página, un solo H1, migas, enlaces, imágenes y accesibilidad.
  - **Lo que se sirve a los buscadores**, que en un front del kit es del
    front: sitemap, robots, `noindex` por cabecera en previews y en modo
    borrador, una sola 301 de dominio, 404 real.
  - **Velocidad:** PageSpeed móvil ≥ 90 obligatorio, con las palancas.
  - **No nombra ningún dato del site:** qué datos SEO trae cada página se
    descubre (`cms:descubrir`); si falta uno, no se inventa: va a la tabla
    como ❌ y se le pide a Raizell.
  - Lleva una `referencia.md` con los datos finos (umbrales de Core Web Vitals,
    estado de los tipos de schema, imágenes, móvil, multiidioma).
- **Regla nueva en `AGENTS.cms.md`:** ningún front se da por terminado sin esa
  tabla rellena.
- **De dónde sale:** de un fallo medido. En cinco entregas del mismo encargo
  sin la skill, 52 de 110 comprobaciones fallaron, todas por omisión
  silenciosa (robots fijo, Open Graph incompleto, ninguna 404 con enlaces,
  enlaces externos sin `rel`); con ella, 2. Esta versión del kit es una
  adaptación al SDK de la que se midió y **no se ha vuelto a medir**.

### Al actualizar desde v0.2.0

- `npm run cms:actualizar` trae la skill y la regla. No cambia ningún fichero
  del proyecto ni ninguna variable: nada que migrar.
- Lo que la skill pide y un front puede no tener todavía: una variable propia
  con el dominio público, la cabecera `noindex` fuera de producción, el
  `sitemap.xml` y el `robots.txt`, y la imagen social por defecto. Son piezas
  del front, no del kit.
- Lo que **no** cubre y se hace por proyecto: investigación de palabras
  clave, revisión humana de los textos y mapa de redirecciones de una web
  antigua.

## v0.2.0 — 2026-10-08

### Qué trae

- **Skill `cms-front-produccion`**: el recorrido para llevar un front a
  producción —qué cambia respecto a desarrollo, el orden de salida, las
  variables del hosting entorno por entorno, cómo instalar el SDK privado en
  el hosting y distinguir «el token vale» de «el token llega», el límite de
  peticiones por clave y la caché, sitemap, redirecciones y 404, vuelta atrás
  y qué comprobar después—.
- **Skill `cms-front-astro`**: las reglas duras de `cms-front-nextjs`
  traducidas a Astro (islas, `PUBLIC_`, salida en servidor, ruta genérica,
  cabeceras y middleware, adaptador y versión de Node).
- **`cms:comprobar -- --produccion`**: antes de salir, exige la clave pública
  y que el site responda a ella.
- **`cms:comprobar` explica una variable vacía que tapa a otra**: los
  frameworks leen `.env.local` por encima de `.env` y una variable vacía
  gana, así que una clave puesta en `.env` parecía no existir.
- **`cms:comprobar` reconoce los prefijos públicos de más frameworks**
  (`NEXT_PUBLIC_`, `PUBLIC_`, `VITE_`, `NUXT_PUBLIC_`, `REACT_APP_`,
  `GATSBY_`, `EXPO_PUBLIC_`) al buscar una clave publicada por error.
- **`cms:descubrir` usa la clave de previsualización si es la única** que hay
  y lo dice, y **`-- --menu <identificador>`** consulta menús, que el SDK no
  puede listar.
- **El instalador no deja variables vacías que tapen** las que el proyecto ya
  tiene en `.env`: las deja comentadas en `.env.local`.
- **Checklist (puntos 3, 4, 5, 7 y 9) y reglas duras** con lo aprendido: el
  token en todos los entornos que construyen, el site activo para producción,
  qué variable va en qué entorno y que el interruptor de borradores no existe
  en producción.

### Cambia

- Con solo la clave de previsualización, la falta de la pública es ahora un
  **aviso** y `cms:comprobar` sale en verde. Con `--produccion` sigue siendo
  obligatoria.

### Al actualizar

`npm run cms:actualizar`. No hay que tocar nada del proyecto. Si
`cms:comprobar` dice que una variable «está vacía en .env.local y tapa la de
.env», borra o comenta esa línea de `.env.local`.

## v0.1.0 — 2026-09-29

### Qué trae

- **Checklist de arranque**: nueve puntos, cada uno con qué es, cómo se
  consigue y cómo se comprueba (`cms-kit/CHECKLIST.md`).
- **Las direcciones de la API y de los medios vienen puestas**: viven en
  `cms-front-kit.json` y el instalador las deja en `.env.local.example` y
  en `.env.local`. Si cambian, llegan con una versión nueva del kit.
- **`cms:comprobar`**: recorre la checklist, detecta credenciales mal
  colocadas, comprueba que las direcciones siguen respondiendo y prueba la
  conexión real con el site, sin imprimir el valor de ninguna clave.
- **`cms:descubrir`**: pregunta al site qué tiene y deja un resumen con la
  forma de los datos de cada ruta, sin suponer ninguna estructura.
- **Instalador y actualizador** que no pisan nada del proyecto.
- **Cuatro skills**: `cms-front-empezar`, `cms-front-descubrir-contenido`,
  `cms-front-nextjs` y `cms-front-registrar-aprendizaje`.

### Al instalar

Sigue el README.
