# AGENTS.cms.md — CMS Front Kit

> Reglas para construir un front que consume el CMS de Raizell. Este fichero
> es del kit: **no se edita** (se actualiza con `npm run cms:actualizar`).
> Lo propio del proyecto va en `AGENTS.md`.

## 1 · De dónde sale la verdad

Este kit **no describe** ni el contenido del site ni las funciones del SDK.
Las dos cosas cambian, y una copia escrita aquí estaría desfasada.

| Pregunta | Dónde se mira | Cómo |
|---|---|---|
| ¿Qué páginas, bloques, campos, idiomas y módulos hay? | El propio site | `npm run cms:descubrir` → `.cms-kit/descubierto/RESUMEN.md` |
| ¿Qué funciones hay, qué reciben y qué devuelven? | El SDK instalado | Su README y sus tipos, en `node_modules` |
| ¿Qué me falta para poder trabajar? | La checklist | `npm run cms:comprobar` |

🔴 **Nunca se supone la estructura del contenido**: ni de memoria, ni por
otro proyecto, ni por un ejemplo. Se descubre.

## 2 · Reglas duras

| Regla | Qué evita |
|---|---|
| **Sin checklist en verde no se escribe código que lea del CMS** | Depurar durante horas lo que era una clave que faltaba |
| **Las claves de API solo existen en el servidor** | Que cualquier visitante lea los borradores del cliente |
| **Ninguna clave en una URL ni en una variable con prefijo público del framework** (`NEXT_PUBLIC_`, `PUBLIC_`, `VITE_`…) | Que acabe en historiales, capturas, cabeceras hacia terceros y el JavaScript de cada visitante |
| **Ninguna credencial se versiona ni se pega en un chat** | Tener que revocarla y emitir otra |
| **Un agente no rellena ni pide valores de credenciales** | Que el secreto quede en el historial de la conversación |
| **El front tolera lo que no conoce** | Que una página se caiga porque el cliente añadió un bloque nuevo |
| **Una ruta que acepta cualquier URL comprueba que existe antes de pedir su contenido** | Que un rastreo agote el límite de peticiones de la clave y caiga toda la web |
| **El interruptor de borradores por entorno no existe en producción** | Que los visitantes vean lo que el cliente no ha publicado |
| **No se sale a producción sin `cms:comprobar -- --produccion` en verde** | Descubrir en producción que la clave pública nunca se había probado |
| **Los ficheros del kit no se editan** | Que una actualización no pueda aplicarse |

## 3 · Skills

| Skill | Cuándo salta |
|---|---|
| `cms-front-empezar` | Al empezar un front, al instalar el kit, o cuando no instala el SDK o no conecta con el site |
| `cms-front-descubrir-contenido` | Antes de escribir cualquier cosa que pinte contenido del CMS |
| `cms-front-nextjs` | Al escribir en Next.js el código que lee del CMS: páginas, rutas, imágenes, previsualización |
| `cms-front-astro` | Al escribir en Astro el código que lee del CMS: cliente, islas, ruta genérica, caché, 404, sitemap |
| `cms-front-produccion` | Al llevar el front a producción, o cuando funciona en local y falla en el hosting: variables, token del SDK, caché, redirecciones, vuelta atrás |
| `cms-front-registrar-aprendizaje` | Cuando se aprende algo que el siguiente desarrollador debería saber |

## 4 · Comandos

| Comando | Qué hace |
|---|---|
| `npm run cms:comprobar` | Recorre la checklist y dice qué falta y cómo conseguirlo |
| `npm run cms:comprobar -- --produccion` | Antes de producción: exige la clave pública y que el site responda a ella |
| `npm run cms:descubrir` | Pregunta al site qué tiene y lo deja en `.cms-kit/descubierto/` (`-- --menu <identificador>` para un menú) |
| `npm run cms:estado` | Versión del kit instalada y ficheros del kit tocados |
| `npm run cms:actualizar` | Trae la última versión del kit sin pisar lo tocado |

## 5 · Qué hace un agente cuando falta algo

Si `cms:comprobar` marca un punto en rojo, el agente **no lo rodea**: no
inventa datos de ejemplo para seguir, no copia claves de otro proyecto y no
desactiva la comprobación. Le dice a la persona qué punto de
`cms-kit/CHECKLIST.md` falta y a quién se lo tiene que pedir, y sigue con
lo que no dependa de ello.
