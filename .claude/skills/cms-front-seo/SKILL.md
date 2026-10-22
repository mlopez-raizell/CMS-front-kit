---
name: cms-front-seo
description: Úsala al construir o revisar un front que consume el CMS de Raizell y tiene que salir bien en Google — layout raíz, plantillas de página, metadatos, canonical, hreflang, Open Graph, JSON-LD, titulares, enlaces, imágenes, migas, sitemap, robots, 404 y velocidad. Dispara con "SEO", "posicionamiento", "que salga bien en Google", "generateMetadata", "sitemap", "robots.txt", "canonical", "hreflang", "schema", "JSON-LD", "Open Graph", "H1", "migas de pan", "PageSpeed", "LCP", "página 404", "indexación", "previews indexadas".
---

# SEO en un front del kit

```
NINGUNA ENTREGA DE UN FRONT SIN LA TABLA DE CIERRE (§8) RELLENADA
Y EL FRONT PINTA EL DATO QUE EL SITE TRAE: NI LO REINVENTA NI LO DA POR HECHO
```

En un front del kit **el front es la web pública**: lo que ve Google lo sirve
él. Por eso esta skill cubre lo que se pinta **y** lo que se sirve a los
buscadores (sitemap, robots, redirecciones, `noindex` en previews). Rótulos:
**OBL** obligatorio · **REC** recomendado. Datos finos (umbrales, tipos de
schema, imágenes, móvil) en [`referencia.md`](referencia.md).

Esto **no describe** qué datos SEO trae el site ni cómo se llaman: eso se
descubre (`cms-front-descubrir-contenido`, `npm run cms:descubrir`) y las
funciones se miran en los tipos del SDK. Antes de escribir una plantilla, mira
**qué dato SEO trae cada tipo de página** (títulos, descripciones, canonical,
indexación, imagen social, idiomas, migas) y qué **no** trae.

🔴 **Si un dato que esta skill pide no existe en el site, no se inventa, no se
deja un valor fijo y no se da por resuelto «porque lo pondrá el CMS»**: va a la
tabla de cierre como ❌ con el nombre de lo que falta, y se le pide a Raizell
en el mismo mensaje que el resto (`AGENTS.cms.md` §5). Si el dato existe, se
pinta **tal cual**; la plantilla solo rellena lo que llega vacío (§2).

## 1. Decisiones cerradas

| Tema | Decisión |
|---|---|
| Dónde se pinta | Todo lo SEO sale en el **HTML del servidor** (Server Components, `generateMetadata`, JSON-LD en el árbol). Nada de contenido, título, canonical ni schema que dependa de JS del navegador, ni un `'use client'` que envuelva contenido SEO. Comprobación: `curl` a la URL. |
| URL | Absolutas, con `https://www.<dominio>`, **sin barra final**, desde **una** variable de entorno propia con el dominio público (no la de la API ni la de los medios). Nunca `localhost` ni la URL de una preview en un canonical. |
| Mobile-first | Mismo contenido, enlaces y schema en móvil y escritorio: nada oculto solo en móvil. `viewport` declarado. |
| Medios | Las URL de imagen las compone el SDK (`cms-front-nextjs`); se habilita su dominio en la configuración de imágenes de Next. El `alt` sale del CMS. |

## 2. Metadatos (`generateMetadata`) — OBL

| Campo | Regla |
|---|---|
| `title` | El título SEO que trae el site; si llega vacío, `<título> \| <marca>`. Sin duplicar la marca si ya viene en el dato. |
| `description` | La que trae el site; si llega vacía, el primer párrafo en texto plano recortado a ≤155. Nunca `undefined`. |
| `alternates.canonical` | URL absoluta de la propia página (o la canónica que traiga el site). Sin canonical en una página `noindex`. |
| `alternates.languages` | Todas las versiones **publicadas** de esa página **y ella misma**, más `x-default` (idioma por defecto). Los idiomas activos los dice la configuración del site. `<html lang>` del idioma de la página. |
| `robots` | Lo que diga el dato: nunca `index: true` fijo. Sin dato, `index, follow`. |
| `openGraph` | `title`, `description`, `url`, `type`, `siteName`, `locale` **y** `images: [{ url, width: 1200, height: 630, alt }]` con una imagen **realmente** 1200×630 (JPG/PNG, no AVIF): la social que traiga el site → la destacada recortada a 1200×630 → `public/og-default.jpg`, **entregada** en el mismo cambio. Nunca se declara 1200×630 sobre otra medida. El `openGraph` de la página **reemplaza** al del layout, no lo fusiona: repite `siteName` y `locale`. |
| `twitter` | `card: 'summary_large_image'` **siempre**, con title, description e image (la misma que OG). |

## 3. Lo que se sirve a los buscadores (OBL)

| Pieza | Regla |
|---|---|
| `sitemap.xml` | Se genera del **índice de rutas** del SDK, solo de lo **publicado**: URLs `200`, indexables, canónicas, HTTPS. `lastmod` = fecha real de modificación (si el site no la trae, se omite; **nunca** la del build). Con idiomas: alternativas con **todas** las versiones, ella misma y `x-default`. Sin `priority` ni `changefreq`. |
| `robots.txt` | Permite el rastreo; bloquea la API propia del front, la búsqueda interna y la previsualización; declara `Sitemap:`. No bloquea rastreadores de IA salvo decisión expresa del cliente. Fuera de producción: `Disallow: /`. |
| `noindex` fuera de producción | Cabecera `X-Robots-Tag: noindex, nofollow` en **todas** las respuestas de previews del hosting y de desarrollo (en `next.config` o el proxy), **además** de robots.txt: una URL enlazada se indexa aunque robots la prohíba. |
| Modo borrador | Toda respuesta en previsualización de borradores sale con `noindex` y sin caché. |
| Dominio | Una sola versión: `https` + `www`, sin barra final, minúsculas, con **una** 301 que compone todo a la vez. Cadena de dos saltos = defecto. |
| Redirecciones del site | Mira en `cms:descubrir` si el site expone redirecciones. Si las expone, el front las aplica (301, un salto) **antes** de resolver la ruta; si no, se anota en la tabla y se pide a Raizell. |
| Slug cambiado | Es el CMS quien registra la 301; el front **no** la inventa. Se comprueba, con el site, que una dirección antigua responde 301 y no 200 ni 404. |

## 4. Datos estructurados (JSON-LD) — OBL

Un componente `<JsonLd>` serializa en `<script type="application/ld+json">`
(escapando `<`), en servidor, coherente con **lo visible**.

| Dónde | Qué |
|---|---|
| Layout raíz | `Organization` (o su subtipo: `LegalService`, `MedicalClinic`, `Restaurant`…) con `@id` `<dominio>/#organization`, nombre, logo, url, teléfono, dirección, horario, `sameAs`; y `WebSite` (nombre y url, **sin** `SearchAction`). Los datos de la empresa se leen del site; si faltan, ❌ en la tabla. |
| Toda página interna | `WebPage` + `BreadcrumbList` (las mismas migas que se ven). |
| Por tipo | Servicio: `Service` con `provider: { "@id": … }` y `areaServed`. Artículo: `BlogPosting`/`Article` con `author` `Person`, fechas, imagen. Contacto: `ContactPage` + `LocalBusiness`. Equipo: `Person`. Eventos, cursos, empleo: `Event`, `Course`, `JobPosting`. Tienda: `Product` + `Offer`. |
| REC | `FAQPage` solo si las preguntas están visibles. Ayuda a las IA; **no** da resultado enriquecido en Google. |

Nunca emitir `HowTo`, `SpecialAnnouncement` ni `SearchAction`. Siempre
`@context` `https://schema.org`, URL absolutas, fechas ISO 8601, sin relleno.
Validar con la Prueba de resultados enriquecidos y `validator.schema.org`.

## 5. Contenido, titulares y enlaces — OBL

- **Un solo H1** por página: el título de la página. Sin saltos de nivel.
- **Cabecera, menú, pie y widgets no usan etiquetas H.** Estilo con CSS, nunca con un H.
- El texto enriquecido del CMS llega como árbol de nodos (`cms-front-nextjs`): al pintarlo, **un nodo H1 se degrada a H2**; los bloques que abren un H3 no lo hacen sin un H2 delante.
- Palabras clave destacadas con `<strong>` (no `<b>`), con moderación. Listas y tablas **reales** cuando el contenido lo permite.
- **Migas** visibles en toda página interna, con enlaces, `<nav aria-label="Migas">` y el orden del schema.
- **Internos:** cada página enlaza a su sección padre y a las hermanas, con `anchor` descriptivo (nunca «haz clic aquí», «ver más»), en el cuerpo y no solo en el menú. Se validan con lo que trae el SDK antes de ir a un `href`.
- **Externos:** `target="_blank"` con `rel="noopener"`; patrocinados `rel="sponsored"`, de usuarios `rel="ugc"`, no avalados `rel="nofollow"`. También los que vienen dentro del texto enriquecido.
- Ni enlaces rotos ni a URL que redirigen.

## 6. Imágenes, accesibilidad y 404 — OBL

- `next/image` con `width`, `height` y `sizes`. `alt` descriptivo (el del CMS; decorativas `alt=""`); `aria-label` no lo sustituye.
- La imagen principal de la parte superior (la del LCP): `priority` y **nunca** `loading="lazy"`; el resto, `lazy`.
- `aria-label` en botones y enlaces de **solo icono**; no en lo que ya tiene texto visible.
- HTML semántico: `header`, `nav` (con `aria-label` si hay varios), `main`, `article`, `section`, `footer`; `button`/`a` reales en vez de `div` con eventos.
- `not-found.tsx` con enlaces a las secciones principales y **404 real**: se pide con `notFound()` cuando el índice de rutas no tiene la ruta (no se pinta «no encontrado» con un 200). Su contenido va en el HTML del servidor.

## 7. Velocidad — OBL (PageSpeed móvil ≥ 90)

**LCP ≤ 2,5 s · INP ≤ 200 ms · CLS ≤ 0,1** (p75, campo). El ≥90 es de laboratorio y
se mide sobre una URL **desplegada**, no `next dev`.

| Palanca | Cómo |
|---|---|
| LCP | Imagen principal con `priority`, AVIF/WebP, sin lazy; fuentes precargadas. |
| Fuentes | `next/font` (autoalojadas, con subset y `display: 'swap'`). |
| INP | Lo mínimo de `'use client'`; terceros (analítica, chat, píxeles) tras el consentimiento y con `lazyOnload`/`afterInteractive`. |
| CLS | Dimensiones en imágenes, vídeos e iframes; espacio reservado para el banner de cookies. |
| Caché | El contenido se sirve con la estrategia acordada en `cms-front-nextjs`; sin caché, el TTFB (<0,8 s) no se cumple. |

## 8. Tabla de cierre — se rellena entera en el informe

Cada ítem: **✅ + fichero**, **➖ + condición observable** (p. ej. «una sola lengua»,
«el site no tiene tienda») o **❌ + qué falta y a quién se le pide**. «Lo pone el
CMS» y «luego» no son respuestas.

| # | Ítem | Nivel |
|---|---|---|
| S1 | Todo en el HTML del servidor (verificado con `curl`) | OBL |
| S2 | `title` y `description` con el dato y fallback; nunca `undefined` | OBL |
| S3 | Canonical absoluto, `https://www`, sin barra; ninguno si es `noindex` | OBL |
| S4 | `alternates.languages` con ella misma y `x-default`; `<html lang>` | OBL (si hay idiomas) |
| S5 | `robots` leído del dato, no fijo | OBL |
| S6 | OG completo con imagen realmente 1200×630 y fallback entregado; Twitter `summary_large_image` | OBL |
| S7 | JSON-LD global en el layout (organización con `@id` + `WebSite`) | OBL |
| S8 | JSON-LD de página: `WebPage` + `BreadcrumbList` + el del tipo | OBL |
| S9 | `sitemap.xml` solo publicado/indexable/canónico, con hreflang y `lastmod` real | OBL |
| S10 | `robots.txt` con API, búsqueda interna, previsualización y `Sitemap:` | OBL |
| S11 | `noindex` por cabecera en previews y en modo borrador (no solo robots) | OBL |
| S12 | Una sola 301 de dominio; redirecciones del site aplicadas o anotadas | OBL |
| S13 | Un solo H1; H1 del texto enriquecido degradado; sin H en cabecera, menú ni pie | OBL |
| S14 | Migas visibles con enlaces; enlaces a la sección padre y a las hermanas con anchor descriptivo | OBL |
| S15 | Externos con `target="_blank"` + `rel`, también dentro del texto enriquecido | OBL |
| S16 | `<strong>` (no `<b>`); listas y tablas reales | OBL |
| S17 | Imágenes: `alt`, `width`/`height`, `priority` en la principal, `lazy` en el resto | OBL |
| S18 | `aria-label` en iconos sin texto; landmarks semánticos | OBL |
| S19 | `not-found.tsx` con enlaces y 404 real | OBL |
| S20 | `next/font`, terceros diferidos, PageSpeed móvil ≥90 | OBL |
| S21 | Mobile-first: nada oculto solo en móvil; `viewport` | OBL |
| S22 | `FAQPage` si hay FAQ visible; rastreadores de IA sin bloquear; `/llms.txt` | REC |

## Racionalizaciones

| Excusa | Realidad |
|---|---|
| «El título y la descripción los redacta el CMS» | El CMS redacta el texto; pintarlo bien (fallback, marca, nunca `undefined`) es tuyo. |
| «El `noindex` ya lo gestiona el CMS» | El front es la web pública: el `robots` de la página sale del dato y lo pintas tú. Fijo en `index: true` es un fallo. |
| «Las previews de Vercel ya están cerradas por robots.txt» | Una URL enlazada se indexa aunque robots la prohíba. Cabecera `noindex`. |
| «La imagen OG es el hero» | El hero no mide 1200×630: declarar esa medida sobre otra imagen es mentir al buscador, y sin hero no hay imagen. |
| «El texto enriquecido ya viene saneado» | Saneado no es un solo H1 ni `rel` en los enlaces. Se normaliza al pintar. |
| «Si el site no trae ese dato, pongo uno de ejemplo» | `AGENTS.cms.md` §5: no se rodea. ❌ en la tabla y se pide a Raizell. |
| «`notFound()` ya da 404» | Da el código, no la página con enlaces. Hace falta `not-found.tsx`. |
| «El `lastmod` es la fecha del build, da igual» | Un `lastmod` igual en todas las URLs hace que Google lo ignore. |

## Señales de alarma

- `robots: { index: true, follow: true }` escrito a mano.
- `description` que puede quedar `undefined`.
- Un `openGraph` en la página sin `siteName`, o con 1200×630 sobre el hero.
- Un `<h1>`–`<h6>` en la cabecera, el menú o el pie.
- `'use client'` en un componente que contiene texto SEO.
- El `robots.txt` como único mecanismo de `noindex` en previews.
- Ningún `not-found.tsx`. Un `loading="lazy"` en la imagen del LCP.
- Un comentario «el CMS/Raizell/otro se encarga» sin una fila ❌ en la tabla.

**Cualquiera de ellas: para, vuelve a la tabla de cierre y rellena el hueco.**
