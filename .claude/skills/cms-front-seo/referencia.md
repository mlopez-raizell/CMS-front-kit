# Referencia — SEO en un front del kit

Datos finos que `SKILL.md` cita. Si Google cambia un valor, se cambia aquí.

## Core Web Vitals

| Métrica | Bueno | Necesita mejora | Pobre |
|---|---|---|---|
| LCP | ≤ 2,5 s | 2,5-4,0 s | > 4,0 s |
| INP | ≤ 200 ms | 200-500 ms | > 500 ms |
| CLS | ≤ 0,1 | 0,1-0,25 | > 0,25 |

- Se evalúa en **p75 de datos de campo** (CrUX, 28 días). El laboratorio (Lighthouse) solo sirve para depurar. Un sitio nuevo da «sin datos suficientes» en CrUX: no es un error; se re-mide a las 4 semanas.
- INP no se mide en laboratorio: se vigila **TBT** como indicador previo.
- LCP = TTFB (<800 ms) + retraso de carga del recurso + tiempo de carga + retraso de render: se mira qué fase falla.
- INP: tareas largas <50 ms, DOM por debajo de ~1.500 elementos, `debounce` en los manejadores, terceros fuera del hilo principal.
- Los umbrales no han cambiado: ignorar lo contrario. Las CWV desempatan entre contenidos equivalentes; no sustituyen a la intención.
- Ejecutar las **cuatro** categorías de Lighthouse (`performance`, `accessibility`, `best-practices`, `seo`) en la puerta de calidad: el mínimo obligatorio es ≥90 en rendimiento, pero las otras tres son baratas.

## Imágenes

- Patrón: AVIF → WebP → JPEG con `width`/`height` (o `aspect-ratio`) y `srcset` + `sizes` ajustado a los breakpoints. En Next, `next/image` lo hace.
- Pesos orientativos: miniatura <50 KB (aviso >100, crítico >200) · contenido <100 KB (aviso >200, crítico >500) · hero <200 KB (aviso >300, crítico >700).
- `alt` de 10-125 caracteres; descriptivo, no el nombre del fichero ni un relleno de keywords. Nombre de fichero con guiones: `abogado-derecho-mercantil-madrid.webp`.
- OG: 1200×630, recorte centrado (`cover`), JPG o PNG (WhatsApp y algunos clientes no leen AVIF/WebP).
- Mapa embebido: carga diferida (`loading="lazy"` o fachada con clic) y dimensiones reservadas.

## Schema — estado de los tipos

| Estado | Tipos |
|---|---|
| Activos | `Organization`, `LocalBusiness` (y subtipos), `Service`, `Product`, `ProductGroup`, `Offer`, `Article`, `BlogPosting`, `NewsArticle`, `Review`, `AggregateRating`, `BreadcrumbList`, `WebSite`, `WebPage`, `Person`, `ProfilePage`, `ContactPage`, `VideoObject`, `ImageObject`, `Event`, `JobPosting`, `Course` |
| **No emitir** | `HowTo` (sin rich result desde 2023), `SpecialAnnouncement`, `SearchAction` del `WebSite` (sin cuadro de búsqueda desde 2024), `ClaimReview`, `Dataset`, `Practice Problem`, `Attorney` (usar `LegalService`) |
| Matiz | `FAQPage`: rich result solo para webs oficiales y de salud; sigue siendo útil para IA |

Errores típicos al revisar un bloque: falta `@context`, `@type` inválido, URL
relativa, fecha sin ISO 8601, texto de relleno («[Nombre]»), JSON inválido
(coma final), imagen sin URL válida.

- Artículo: `headline`, `author` (`Person`), `datePublished`, `dateModified`, `image`, `publisher` (`Organization` con logo como `ImageObject`).
- `LocalBusiness`: `PostalAddress` completa, `telephone`, `geo`, `openingHoursSpecification`, `priceRange`.
- Equipo / autor: `ProfilePage` con `mainEntity` `Person` y `sameAs`.
- Pilar y satélites: el pilar con `ItemList` de sus páginas; cada satélite con `isPartOf` al `@id` del pilar.
- Listado o categoría: `CollectionPage` + `ItemList` + `BreadcrumbList`.
- `Product`/`Offer` van en el HTML del servidor (el JS retrasa el procesado).

## Páginas por tipo (qué debe verse)

| Tipo | Mínimo visible |
|---|---|
| Servicio | H1 + CTA sobre el pliegue, proceso, caso o testimonio, contacto |
| Local / sede | `LocalBusiness` + mapa + horario visible **idéntico** al del schema; teléfono como `tel:` y formulario sin scroll en móvil; NAP en texto HTML (no en imagen) en cabecera, pie y contacto |
| Comparativa | `<table>` con `<caption>` y `<th scope>`, «actualizado a fecha de…» visible, precios con fecha, afiliación declarada, «no disponible públicamente» en vez de inventar; valoraciones solo si son reales |
| Producto | ≥3 imágenes (principal, detalle, contexto) de ≥800 px, descripción propia, tabla de especificaciones, migas completas, relacionados |
| Herramienta | La herramienta funcional sobre el pliegue, sin muro de login |

Lo crítico del tipo de página (H1 + CTA o herramienta) cabe en los primeros
~600 px de un viewport de 375 px.

## Móvil

Táctiles ≥48×48 px con 8 px de separación · fuente base ≥16 px · sin scroll
horizontal · `viewport` · el HTML móvil es el único que Google indexa, desde
2024: metas, enlaces y schema idénticos.

## Multiidioma

- Expansión del texto al diseñar: alemán +25-35 %, francés/español/italiano/portugués +15-25 %, neerlandés +10-20 %; chino, japonés y coreano se contraen. Botones y menús no pueden desbordarse.
- Formatos con `Intl` por idioma (números, fechas, moneda, teléfono con prefijo): no a mano.
- Alt, title, description y schema **traducidos**, nunca en el idioma de origen.

## Enlaces: cifras orientativas

~3-5 enlaces internos por 1.000 palabras (artículo 5-10, servicio 3-5, categoría a todos sus hijos); anchors variados, no el mismo en todos; contextuales, no solo un bloque «relacionados».
