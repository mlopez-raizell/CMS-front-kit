---
name: raizell-registrar-aprendizaje
description: Úsala cuando, construyendo un front para el CMS de Raizell, se aprende algo que el siguiente desarrollador debería saber, o cuando hay que decidir si algo merece una skill. Dispara con "esto habría que apuntarlo", "que no se nos olvide", "añade una skill", "crea una skill", "esto debería estar en el kit", "nos ha vuelto a pasar", "documenta esto".
---

# Registrar lo aprendido

## Paso 1 — ¿qué es lo que has aprendido?

| Lo que tienes | Dónde va |
|---|---|
| Un **dato** de este site: una ruta, un campo, un tipo de bloque | **En ningún sitio.** Se regenera con `npm run raizell:descubrir` |
| Una **decisión de este proyecto**: carpetas, estilos, hosting | `AGENTS.md` del proyecto |
| Un **criterio que se repite** en este proyecto y en el que un agente se equivoca | Skill **propia** del proyecto |
| Un criterio que valdría para **cualquier front** de Raizell | Propuesta al kit (paso 4) |
| Algo comprobable por una máquina | Un test o una regla de lint, no un documento |
| Un fallo del SDK o del CMS | Aviso a Raizell. No se documenta un rodeo como si fuera la forma normal |

## Paso 2 — la prueba del tiempo

🔴 **Una skill enseña un método, no un dato.** Antes de escribir, pregúntate
si seguirá siendo verdad cuando cambie el contenido del site y cuando salga
otra versión del CMS.

| ❌ Caduca | ✅ Aguanta |
|---|---|
| «El bloque de cabecera tiene los campos título y subtítulo» | «Los campos de un bloque se miran en el resumen antes de escribir su componente» |
| «La función tal recibe estos tres parámetros» | «La firma se mira en los tipos del SDK instalado» |
| «El ajuste está en tal pantalla del panel» | «Ese ajuste lo cambia Raizell; se pide indicando el site» |

Si lo que ibas a escribir está en la columna izquierda, no es una skill.

## Paso 3 — escribir una skill propia

- Vive en `.claude/skills/<nombre>/SKILL.md`, versionada con el proyecto.
- Nombre en `kebab-case`, sin acentos, y **sin el prefijo `raizell-`**: ese
  prefijo es del kit, y una actualización podría pisarla.
- La **descripción dice cuándo se usa**, con las frases literales que diría la
  persona. No resume lo que la skill hace por dentro.
- Corta. Tablas antes que párrafos. Un ejemplo bueno, no cinco.
- Se registra en el `AGENTS.md` del proyecto: una fila con la skill y cuándo
  salta. Una skill que nadie sabe que existe no se usa.

Se escribe **después de haber visto el fallo**, no por si acaso: lo que no
salió de un problema real diluye lo que sí.

## Paso 4 — proponerlo al kit

Las skills `raizell-*` y el resto de ficheros del kit **no se editan en el
proyecto**: `npm run raizell:estado` los marcaría como tocados y dejarían de
actualizarse.

Lo que valga para cualquier front se propone en el repositorio del kit (está
en `raizell-front-kit.json`), contando **qué falló**, en qué situación y qué
lo habría evitado. Mientras se publica, puede vivir como skill propia.

## Señales de alarma

- La skill nombra campos, rutas o pantallas concretas.
- Se edita un fichero del kit «solo un momento».
- Se documenta cómo esquivar un fallo en vez de avisar de él.
- La skill se escribió antes de que nada fallara.
