# Diseño inicial — Raizell Front Kit

Fecha: 2026-09-29 · Versión que describe: v0.1.0 · Estado: aprobado

## Objetivo

Que un desarrollador externo que va a construir un front para el CMS de
Raizell sepa, desde el primer día, **qué necesita, a quién pedírselo y cómo
comprobar que lo tiene**, y que su agente de IA trabaje con las mismas reglas.

## Decisiones

| Decisión | Elegido | Descartado y por qué |
|---|---|---|
| Formato | Marco que se instala encima del proyecto, con manifiesto, huellas y actualizador (el modelo de XenhonAI) | Plugin de Claude Code: solo sirve a una herramienta. Plantilla de arranque: ata a una estructura y envejece con el SDK. |
| Audiencia | Desarrolladores externos | — |
| Tecnología | Núcleo genérico sobre el SDK y una skill específica de Next.js | Solo Next.js: cierra la puerta a otras. Cualquiera: guías demasiado vagas. |
| Idioma | Español | — |
| Nombre | `raizell-front-kit` | — |
| Contacto | No se publica ninguno | Los desarrolladores ya saben a quién dirigirse |

## Quién pone cada cosa

Corrección de Miguel tras la primera entrega (2026-09-29):

| Cosa | Quién |
|---|---|
| Cuenta de GitHub y repositorio del front | El desarrollador: es donde trabaja y sube el front. No necesita permisos de Raizell. |
| Token para descargar el SDK | Raizell se lo da al desarrollador |
| Claves del site | Raizell |
| Direcciones de la API y de los medios | El kit las trae puestas: cambian muy poco. `comprobar` verifica que siguen respondiendo. |

Las direcciones viven en `raizell-front-kit.json` (`direcciones`), que es el
único sitio donde se cambian; un cambio llega a los fronts con
`raizell:actualizar`.

## Restricción central: agnóstico de versión

El kit no puede describir dónde está cada campo ni qué estructura tiene el
contenido, porque cambia con cada site y con cada versión del CMS.

**Cómo se cumple:** el kit no es una fuente de verdad sobre el contenido ni
sobre el SDK. Enseña el método para consultar las dos que sí lo son.

| Verdad | Fuente | Mecanismo |
|---|---|---|
| Qué tiene el site | El propio site | `raizell:descubrir` recorre las respuestas sin conocer su forma |
| Qué funciones hay | El SDK instalado | Las skills remiten a su README y a sus tipos |

Consecuencias en el código:

- `descubrir` comprueba que cada método existe antes de llamarlo; si no está,
  lo anota y sigue.
- El resumen se genera recorriendo cualquier valor, sin nombres de campos
  escritos en el script.
- El SDK se localiza por lo que declara el proyecto; el nombre del manifiesto
  es solo el valor por defecto.
- El nombre del paquete, el registro y los nombres de las variables de
  entorno viven cada uno en un único sitio.

## Convivencia con el proyecto

El kit se instala en proyectos que no son suyos, así que no ocupa nombres
genéricos:

| Lo del kit | Dónde vive |
|---|---|
| Reglas | `AGENTS.raizell.md` (no `AGENTS.md`) |
| Scripts, checklist y plantillas | `raizell-kit/` |
| Skills | `.claude/skills/raizell-*/` |
| Comandos | `raizell:*` en `package.json` |

`AGENTS.md`, `CLAUDE.md`, `.npmrc`, `.env.local.example` y `.env.local` son
del proyecto: se crean solo si no existen. Si existen, el instalador dice qué
línea añadir y no los toca. La única excepción es `.gitignore`, al que se le
añaden las entradas que protegen las claves y lo descubierto.

## Componentes

| Pieza | Responsabilidad | Depende de |
|---|---|---|
| `lib/manifiesto.mjs` | Leer y escribir el manifiesto, huellas, expandir patrones | — |
| `lib/entorno.mjs` | Variables de entorno, gestor de paquetes, localizar y cargar el SDK | — |
| `lib/forma.mjs` | Describir la forma de un valor cualquiera | — |
| `instalar.mjs` | Copiar el kit y preparar el proyecto sin pisar nada | manifiesto, entorno |
| `comprobar.mjs` | Recorrer la checklist y probar la conexión real | manifiesto, entorno |
| `descubrir.mjs` | Preguntar al site y generar el resumen | los tres |
| `kit.mjs` | Estado y actualización | manifiesto |

Solo módulos nativos de Node: el kit no añade dependencias al proyecto.

## Garantías

| Aspecto | Cómo |
|---|---|
| Seguridad | Ningún script imprime valores de claves; los mensajes de error se limpian antes de mostrarse. `comprobar` detecta claves en variables `NEXT_PUBLIC_`, tokens escritos en el `.npmrc` del proyecto y un `.env.local` sin ignorar. |
| Fallos | Cada punto en rojo dice qué falta y a qué punto de la checklist ir. Un método ausente en el SDK no detiene `descubrir`. |
| Pruebas | `node --test raizell-kit/scripts/*.test.mjs`: monta fronts temporales con un SDK simulado y ejecuta los scripts reales. |

## Fuera de alcance en v0.1.0

- Skills para tecnologías distintas de Next.js.
- Generación de paquetes estáticos (el modo sin red del SDK).
- Comprobación automática de los puntos 8 y 9 de la checklist.
- Agentes propios (coordinador, revisor): el kit guía, no impone un proceso.

## Pendiente de validar

Las cuatro skills se han escrito a partir del diseño, **sin haber observado
antes a un agente fallar sin ellas**. Se revisarán con el primer front real:
lo que no cambie ninguna conducta se quita, y lo que falte se añade.
