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
