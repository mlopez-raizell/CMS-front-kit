# CMS Front Kit

**Lo que necesita quien va a construir un front para el CMS de Raizell, y la
guía para conseguirlo.**

No es una plantilla ni una librería. Es un conjunto de reglas, comprobaciones
y skills que se instala **encima de tu proyecto** y te acompaña —a ti y a tu
agente de IA— desde el primer día.

## Qué resuelve

| Problema | Qué pone el kit |
|---|---|
| No sabes qué necesitas para empezar ni a quién pedírselo | Una [checklist](cms-kit/CHECKLIST.md) de nueve puntos, cada uno con cómo se consigue |
| Pierdes horas depurando lo que era una clave que faltaba | `cms:comprobar`, que recorre la checklist y prueba la conexión real |
| No sabes qué páginas y campos tiene el site | `cms:descubrir`, que se lo pregunta al propio site |
| Llegas a producción y descubres que la clave pública nunca se había probado | `cms:comprobar -- --produccion` y la skill de puesta en producción |
| Tu agente de IA se inventa la estructura del contenido | Skills que le obligan a descubrirla antes de escribir |
| Una clave acaba en el navegador o en el repositorio | Reglas duras y comprobaciones que lo detectan |

## La idea que lo sostiene

**El kit no documenta ni el contenido del site ni las funciones del SDK.**
Las dos cosas cambian —con cada site y con cada versión del CMS—, y una copia
escrita aquí estaría desfasada a las pocas semanas.

| Lo que quieres saber | Dónde se mira |
|---|---|
| Qué hay en el site | En el propio site, preguntándole |
| Qué funciones hay | En el SDK que tienes instalado |

Lo que el kit enseña es **el método** para consultar ambas. Por eso sirve con
cualquier versión.

## Instalación

Necesitas un proyecto ya creado (por ejemplo, con `create-next-app`). Desde
**la raíz de tu front**:

```bash
git clone --depth 1 https://github.com/mlopez-raizell/CMS-front-kit.git /tmp/cms-front-kit
```

```bash
node /tmp/cms-front-kit/cms-kit/scripts/instalar.mjs
```

El instalador **no pisa nada tuyo**: si un fichero ya existe, lo deja y te
dice qué línea añadirle. Tampoco instala el SDK ni te pide credenciales: eso
es la checklist.

Después:

```bash
npm run cms:comprobar
```

## Qué añade a tu proyecto

| Ruta | Qué es |
|---|---|
| `AGENTS.cms.md` | Las reglas del kit y el mapa de skills. Entrada para cualquier agente. |
| `cms-kit/CHECKLIST.md` | Lo que necesitas antes de empezar y cómo conseguirlo |
| `cms-kit/scripts/` | Los comandos `cms:*` |
| `.claude/skills/cms-front-*/` | Las skills del kit |
| `cms-front-kit.json` | La versión instalada y la huella de cada fichero |
| `.npmrc` · `.env.local.example` · `.env.local` · `AGENTS.md` · `CLAUDE.md` | Solo si no existían |

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run cms:comprobar` | Recorre la checklist y dice qué falta y cómo conseguirlo |
| `npm run cms:comprobar -- --produccion` | Antes de salir a producción: exige la clave pública y que el site responda a ella |
| `npm run cms:descubrir` | Pregunta al site qué tiene y lo deja en `.cms-kit/descubierto/`. Con `-- --menu <identificador>` consulta un menú, que el SDK no puede listar |
| `npm run cms:estado` | Versión instalada, última publicada y ficheros del kit tocados |
| `npm run cms:actualizar` | Trae la última versión sin pisar lo que hayas tocado |

## Skills

| Skill | Cuándo salta |
|---|---|
| `cms-front-empezar` | Al empezar, o cuando no instala el SDK o no conecta con el site |
| `cms-front-descubrir-contenido` | Antes de escribir cualquier cosa que pinte contenido del CMS |
| `cms-front-nextjs` | Al escribir en Next.js el código que lee del CMS |
| `cms-front-astro` | Al escribir en Astro el código que lee del CMS |
| `cms-front-produccion` | Al llevar el front a producción, o cuando funciona en local y falla en el hosting |
| `cms-front-registrar-aprendizaje` | Cuando se aprende algo que el siguiente debería saber |

Funcionan con Claude Code directamente. Con otras herramientas,
`AGENTS.cms.md` sigue el estándar `AGENTS.md` y remite a ellas.

## Seguridad

- Las claves de API solo existen en el servidor.
- Ninguna credencial se versiona ni se pega en un chat con un agente.
- Los comandos del kit nunca imprimen el valor de una clave.
- Lo que vuelca `cms:descubrir` queda fuera de git.

## Versiones

El kit se publica con tags `vX.Y.Z`; qué trae cada una está en
[CHANGELOG.md](CHANGELOG.md). Actualizar exige el árbol git limpio, no pisa
ni borra nada que hayas tocado —lo lista como conflicto, con el comando para
compararlo— y no hace commit.

**Publicar una versión** (mantenimiento): sube `version` en
`cms-front-kit.json`, escribe su sección en `CHANGELOG.md` y lleva el
cambio a `main`. El tag y la release los crea la acción de GitHub.

## Estado

Primera versión. Cada skill y cada regla que se añada saldrá de un problema
real encontrado construyendo un front.

## Licencia

[MIT](LICENSE). Puedes copiar, modificar y redistribuir el kit, también dentro
de proyectos de clientes.

La licencia cubre el kit y nada más: no incluye el nombre ni la marca Raizell,
ni el SDK, ni el acceso al CMS, que tienen sus propias condiciones.
