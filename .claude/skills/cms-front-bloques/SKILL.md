---
name: cms-front-bloques
description: Úsala al escribir el componente que pinta los bloques de una página o de una ficha del CMS de Raizell — elegir con qué diseño se pinta cada bloque y hacer que funcionen los enlaces a una sección de la propia página. Dispara con "plantilla del bloque", "qué componente pinta este bloque", "el bloque sale con el diseño genérico", "hero", "diseño del bloque", "ancla", "enlace a una sección", "ir a la sección", "scroll a", "el enlace con # no baja", "id del bloque", "botón que lleva más abajo".
---

# Plantillas y anclas de los bloques

```
EL FRONT DECIDE CÓMO SE VE UN BLOQUE POR SU PLANTILLA, NUNCA POR SU NOMBRE NI SU POSICIÓN
Y A CADA BLOQUE LE PONE SU ANCLA COMO id: LOS ENLACES YA LLEGAN HECHOS
```

Cada bloque que trae el SDK, de una página o de una ficha, lleva dos datos
pensados para el front: **`plantilla`**, que dice con qué diseño pintarlo, y
**`ancla`**, el `id` HTML que tiene que llevar. Ninguno de los dos se calcula en
el front: se leen del bloque y se usan tal cual. Los tipos exactos están en los
del SDK instalado (el bloque del contenido de una página).

| Dato | Desde el SDK | Para qué |
|---|---|---|
| `plantilla` | `0.9.0` | Elegir el componente que pinta el bloque |
| `ancla` | `0.10.0` | El `id` del elemento que pinta el bloque, para que los enlaces a una sección funcionen |

Con un SDK anterior el dato no existe: `npm run cms:estado` dice qué versión hay
y `cms-front-empezar` cómo subirla.

## 1. Plantillas: qué componente pinta cada bloque

En el panel, quien monta las páginas asigna a cada bloque una plantilla de un
catálogo propio del site. Al front le llega su **clave**, un texto estable
(`"hero-con-foto"`), o `null` si el bloque no tiene ninguna.

```tsx
const COMPONENTES: Record<string, ComponenteDeBloque> = {
  "hero-con-foto": HeroConFoto,
  // una entrada por cada plantilla que este front sabe pintar
};

const Componente = COMPONENTES[bloque.plantilla ?? ""] ?? BloqueGenerico;
```

| Regla | Por qué |
|---|---|
| **El mapa clave → componente es del front** y vive en un solo sitio | Es la única pieza que sabe de diseño; el CMS no guarda ninguno |
| **Una clave que el mapa no conoce se pinta con el bloque genérico, nunca da error** | El cliente puede tener plantillas que este front aún no lleva, y la clave es texto libre: no es una lista cerrada |
| **Sin plantilla (`null`), bloque genérico** | Es lo normal en los bloques que nadie ha marcado |
| **Una plantilla retirada se sigue sirviendo** en los bloques que ya la tenían | Si quitas un componente, deja que su clave caiga en el genérico; no esperes que deje de llegar |
| **Nunca se elige el diseño por el nombre del bloque, su orden o su contenido** | El nombre lo cambia el cliente cuando quiere y no sale al front; la posición cambia al reordenar |
| **En la vista previa llega la plantilla del borrador**; en lo publicado, la publicada | Cambiar la plantilla de un bloque solo se ve en la web al publicar |

**Las claves no se inventan.** Cuando un diseño necesita un componente nuevo, se
le pide a Raizell que dé de alta su plantilla en el site, con la clave que vas a
usar: la clave nace junto al componente. Para ver qué claves llegan hoy, se mira
el bloque en la respuesta del site (`cms-front-descubrir-contenido`), no se supone.

## 2. Anclas: enlaces a una sección de la propia página

En el panel, un enlace puede llevar a **una sección de la propia página**: un
botón, una imagen, la llamada a la acción de una tarjeta o una palabra de un
texto. Ese enlace llega **ya resuelto**, como cualquier enlace interno:
`/servicios#seccion-…`. Lo único que falta es que el bloque de destino lleve ese
`id`.

```tsx
<section id={bloque.ancla ?? undefined}>{/* … sus subbloques … */}</section>
```

| Regla | Por qué |
|---|---|
| **El `id` va en el elemento que envuelve el bloque entero**, en todos los bloques | El enlace no dice cuál va a ser el destino; cualquiera puede serlo |
| **El enlace no se compone ni se reescribe en el front**: se usa el `href` que llega | Ya trae la ruta y el `#`; el navegador hace el salto |
| **No se calcula el ancla** a partir del id, el nombre o el orden del bloque | La regla es del CMS y puede cambiar; el dato que manda es `ancla` |
| **No se escriben anclas a mano** en el front ni se piden como texto en un campo | Es lo que se rompía: un código repetido en dos sitios se desincroniza con una errata y nadie se entera |
| **Un enlace a una sección que ya no existe llega vacío** (`null`, o la palabra sin enlace) | Se pinta como cualquier enlace vacío: sin enlace, no con un `#` muerto |
| **Si la cabecera es fija, `scroll-margin-top` en los bloques** con su altura | Si no, el salto deja el título de la sección tapado por la cabecera |
| **Desplazamiento suave solo con `prefers-reduced-motion: no-preference`** | Hay quien lo tiene desactivado por mareo |

El ancla es la misma en todos los idiomas y no cambia al renombrar ni al publicar
el bloque. Un enlace a una sección de una ficha que se pinta dentro de un
listado de otra página lleva a la página de esa ficha, no a la del listado.

🔴 **Dos bloques con el mismo `ancla` en la misma página HTML**: pasa si pintas
enteras dos fichas, una de ellas duplicada de la otra (duplicar copia las anclas).
En un listado que despliega fichas completas, no pongas el `id` a los bloques de
las fichas listadas: sus enlaces llevan a la página de cada ficha, no al listado.

## 3. Datos de antes de la versión

En un paquete de contenido estático (snapshot) generado con un CMS anterior, los
dos campos **pueden no estar**: valen `undefined` aunque el tipo diga
`string | null`. Léelos siempre con `?? null` o `?? undefined`, y no compares con
`=== null`.

## Señales de alarma

- Un `switch` o un `if` sobre el nombre, el índice o el texto de un bloque para
  elegir su diseño.
- Un componente que lanza un error, o no pinta nada, ante una plantilla que no
  conoce.
- Una clave de plantilla en el front que nadie ha dado de alta en el site.
- Un `id` de sección escrito a mano, o calculado en el front.
- Un enlace con `#` que se compone en el front en vez de usar el que llega.
- Un bloque sin `id` porque «a ese no enlaza nadie».
