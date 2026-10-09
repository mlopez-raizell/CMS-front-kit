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
