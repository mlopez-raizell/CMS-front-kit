---
name: cms-front-astro
description: Úsala al escribir en Astro el código que lee del CMS de Raizell — crear el cliente del SDK, páginas fijas y ruta genérica, islas, menús, imágenes, texto enriquecido, previsualización, caché, 404, sitemap o el despliegue en servidor. Dispara con "conecta con el CMS en Astro", "crea el cliente", "ruta genérica", "[...ruta]", "client:load", "client:visible", "Astro.response", "middleware", "astro.config", "adaptador", "output server", "npm run preview", "la isla tarda en arrancar", "la clave sale en el navegador".
---

# Front en Astro sobre el SDK

Aquí están las **decisiones** que no cambian de una versión a otra. Los
nombres exactos de las funciones del SDK se miran en el SDK instalado (su
README y sus `.d.ts`), y el contenido, con la skill `cms-front-descubrir-contenido`.
Para llevarlo a producción, `cms-front-produccion`.

## Reglas duras

| Regla | Por qué |
|---|---|
| **El SDK solo se usa en el servidor**: el frontmatter de páginas y layouts, los endpoints y el middleware | Necesita la clave, y la clave no puede llegar al navegador |
| **Una isla (`client:*`) nunca importa el SDK ni un módulo que lo importe.** Recibe props ya resueltas. Un helper puro que solo importa *tipos* del SDK sí vale | Lo que importa una isla se empaqueta para el navegador |
| **Un único módulo crea el cliente, y lo hace en el primer uso**, no al importarlo | El build y los tests no tienen claves: crearlo al importar los rompe |
| **Ninguna clave en una variable `PUBLIC_`** | En Astro, las `PUBLIC_*` se incrustan en el JavaScript de cada visitante; las demás solo las ve el servidor |
| **Las claves van solo en `.env.local`**, y ahí nunca vacías si tienen valor en `.env` | Astro lee `.env.local` por encima de `.env` y una variable vacía gana: `cms:comprobar` lo avisa |
| **El cliente se crea con las dos direcciones del entorno**, la de la API y la de los medios | La que el SDK trae por defecto no tiene por qué ser la vigente |
| **Las URL de medios las compone el SDK** | El dominio de medios cambia por entorno |

## Salida: servidor o estático

Se decide con el cliente, según **cuánto puede tardar un cambio en verse**.

| | Servidor (`output: 'server'` y adaptador del hosting) | Estático |
|---|---|---|
| Una publicación en el CMS | Se ve en segundos, con caché corta | Exige reconstruir y redesplegar |
| «Ver cómo queda» (borradores) | Funciona: el pase se canjea en el servidor | No hay dónde canjearlo |
| Páginas nuevas del CMS | Aparecen solas | Hay que reconstruir |
| Lo que cuesta | Un servidor que cuida el límite de peticiones (ver `cms-front-produccion`) | Un aviso de reconstrucción por cada publicación |

## Rutas

| Necesidad | Cómo |
|---|---|
| Una página con diseño propio | Un fichero propio que lee las secciones de la página del CMS por su ruta |
| Cualquier otra página (legales, páginas nuevas) | **Una ruta genérica** `[...ruta].astro` que pinta los subbloques que conoce e **ignora** los que no |
| URL que no existe | La ruta genérica la descarta con la lista **cacheada** de rutas publicadas y responde 404, sin pedir contenido al CMS |
| Redirigir una URL antigua | `redirects` en `astro.config`, con 301 |
| Sitemap | Un endpoint `sitemap.xml.ts` con las rutas del CMS. El plugin de sitemap que mira los ficheros no ve las páginas del CMS |
| «No encontrado» | Un `404.astro` y, en la ruta genérica, `Astro.response.status = 404`. Un 200 con un mensaje de error no es un 404 |

## Cabeceras y caché

- En cada página que lee del CMS: `Astro.response.headers.set('Cache-Control', …)`.
  Público y corto con lo publicado; `private, no-store` con borradores o con un pase en la URL.
- **Un middleware** pone la cabecera por defecto en las páginas HTML que no la
  pongan: así ninguna se queda sin caché por un olvido.
- Lo que se repite en todas las páginas (configuración, menús, lista de rutas)
  se guarda unos segundos en la memoria del proceso. El porqué, y el límite de
  peticiones que lo motiva, en `cms-front-produccion`.

## Previsualización y borradores

| Situación | Qué hace el front |
|---|---|
| La URL trae un pase de «Ver cómo queda» | Lo canjea **en el servidor**, con la clave de previsualización, y solo si el pase es de **esa** ruta |
| El CMS rechaza los borradores de ese pase | Cae a lo publicado, sin caché pública. No un 500 |
| Desarrollo y vistas previas con todo en borrador | Un interruptor de entorno propio del proyecto, de servidor, que exige la clave de previsualización y **nunca existe en producción** |
| Producción | Clave pública; la de previsualización solo para canjear pases |

## Contenido

| Lo que llega | Cómo se trata |
|---|---|
| Texto enriquecido | Llega como árbol de nodos. Con el atajo a HTML del SDK (que valida los enlaces) y `set:html`; el estilo, con clases sobre el contenedor y selectores de hijos |
| Imágenes | Se piden al SDK compuestas, con sus formatos y tamaños, y se pintan con `<picture>` |
| Un tipo de subbloque sin componente | No se pinta y se sigue |
| Una sección que falta | No se pinta; la página no se rompe |

## Del servidor al hosting

| Cosa | Qué pasa |
|---|---|
| **Versión de Node** | Cada adaptador conoce unas versiones. Con otra, el build compila y **el despliegue se rechaza** (`invalid runtime`). Mira qué Node soporta tu versión del adaptador antes de elegir el del proyecto |
| `npm run preview` | **No funciona** con los adaptadores de los hostings. Prueba con `npm run dev` o con la vista previa del hosting |
| Islas `client:visible` en `dev` | La primera vez tardan unos segundos en arrancar: el servidor de desarrollo carga los módulos al vuelo. En el build, es inmediato. No es un fallo |
| Variables | El build las lee del entorno del hosting: ver `cms-front-produccion` |

## Racionalizaciones

| Excusa | Realidad |
|---|---|
| «Importo el SDK en la isla, es solo para esta lista» | Una vez en el bundle, la clave está publicada |
| «Creo el cliente arriba del módulo, así queda más limpio» | Y el build falla en cualquier máquina sin claves |
| «La ruta genérica pide el contenido y, si no existe, 404» | Un rastreo de URL inventadas agota el límite de la clave y cae toda la web |
| «`PUBLIC_` es solo un nombre» | Es lo que decide qué viaja al navegador |
| «El sitemap del plugin ya sale en el build» | Con la salida en servidor, sin las páginas del CMS |
| «`npm run preview` me enseña el build» | Con un adaptador de hosting, ni arranca |

## Señales de alarma

- Una isla cuyo árbol de imports llega al SDK.
- Una variable `PUBLIC_` que contiene una clave.
- Más de un sitio donde se crea el cliente, o uno que lo crea al importar.
- Una ruta genérica que llama al CMS antes de comprobar que existe.
- Una página que lee del CMS sin fijar su `Cache-Control`.
- Un 200 en la página de «no encontrado».
