# AGENTS.raizell.md — Raizell Front Kit

> Reglas para construir un front que consume el CMS de Raizell. Este fichero
> es del kit: **no se edita** (se actualiza con `npm run raizell:actualizar`).
> Lo propio del proyecto va en `AGENTS.md`.

## 1 · De dónde sale la verdad

Este kit **no describe** ni el contenido del site ni las funciones del SDK.
Las dos cosas cambian, y una copia escrita aquí estaría desfasada.

| Pregunta | Dónde se mira | Cómo |
|---|---|---|
| ¿Qué páginas, bloques, campos, idiomas y módulos hay? | El propio site | `npm run raizell:descubrir` → `.raizell/descubierto/RESUMEN.md` |
| ¿Qué funciones hay, qué reciben y qué devuelven? | El SDK instalado | Su README y sus tipos, en `node_modules` |
| ¿Qué me falta para poder trabajar? | La checklist | `npm run raizell:comprobar` |

🔴 **Nunca se supone la estructura del contenido**: ni de memoria, ni por
otro proyecto, ni por un ejemplo. Se descubre.

## 2 · Reglas duras

| Regla | Qué evita |
|---|---|
| **Sin checklist en verde no se escribe código que lea del CMS** | Depurar durante horas lo que era una clave que faltaba |
| **Las claves de API solo existen en el servidor** | Que cualquier visitante lea los borradores del cliente |
| **Ninguna clave en una URL ni en una variable `NEXT_PUBLIC_`** | Que acabe en historiales, capturas y cabeceras hacia terceros |
| **Ninguna credencial se versiona ni se pega en un chat** | Tener que revocarla y emitir otra |
| **Un agente no rellena ni pide valores de credenciales** | Que el secreto quede en el historial de la conversación |
| **El front tolera lo que no conoce** | Que una página se caiga porque el cliente añadió un bloque nuevo |
| **Los ficheros del kit no se editan** | Que una actualización no pueda aplicarse |

## 3 · Skills

| Skill | Cuándo salta |
|---|---|
| `raizell-empezar` | Al empezar un front, al instalar el kit, o cuando no instala el SDK o no conecta con el site |
| `raizell-descubrir-contenido` | Antes de escribir cualquier cosa que pinte contenido del CMS |
| `raizell-front-nextjs` | Al escribir en Next.js el código que lee del CMS: páginas, rutas, imágenes, previsualización |
| `raizell-registrar-aprendizaje` | Cuando se aprende algo que el siguiente desarrollador debería saber |

## 4 · Comandos

| Comando | Qué hace |
|---|---|
| `npm run raizell:comprobar` | Recorre la checklist y dice qué falta y cómo conseguirlo |
| `npm run raizell:descubrir` | Pregunta al site qué tiene y lo deja en `.raizell/descubierto/` |
| `npm run raizell:estado` | Versión del kit instalada y ficheros del kit tocados |
| `npm run raizell:actualizar` | Trae la última versión del kit sin pisar lo tocado |

## 5 · Qué hace un agente cuando falta algo

Si `raizell:comprobar` marca un punto en rojo, el agente **no lo rodea**: no
inventa datos de ejemplo para seguir, no copia claves de otro proyecto y no
desactiva la comprobación. Le dice a la persona qué punto de
`raizell-kit/CHECKLIST.md` falta y a quién se lo tiene que pedir, y sigue con
lo que no dependa de ello.
