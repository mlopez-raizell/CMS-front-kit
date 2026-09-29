---
name: raizell-front-nextjs
description: Úsala al escribir en Next.js el código que lee del CMS de Raizell — crear el cliente del SDK, páginas y rutas dinámicas, menús, imágenes, texto enriquecido, previsualización de borradores o gestión de errores. Dispara con "conecta con el CMS", "crea el cliente", "generateStaticParams", "pinta las imágenes", "texto enriquecido", "previsualización", "modo borrador", "ver cómo queda", "la clave sale en el navegador".
---

# Front en Next.js sobre el SDK

Aquí están las **decisiones** que no cambian de una versión a otra. Los
nombres exactos de las funciones, sus parámetros y sus tipos se miran en el
SDK instalado (su README y sus `.d.ts`), y el contenido, con la skill
`raizell-descubrir-contenido`.

## Reglas duras

| Regla | Por qué |
|---|---|
| **El SDK solo se usa en el servidor** | Necesita la clave, y la clave no puede llegar al navegador |
| **Un único módulo crea el cliente**, marcado como solo de servidor | Un solo sitio donde se leen las claves; si alguien lo importa desde el navegador, el build falla |
| **El cliente se crea con las dos direcciones del entorno**, la de la API y la de los medios | La que el SDK trae por defecto no tiene por qué ser la vigente; las del kit se comprueban |
| **Ninguna clave en variables `NEXT_PUBLIC_`** | Next.js las incrusta en el JavaScript que descarga cada visitante |
| **Ninguna clave en una URL** | Las URL quedan en historiales, capturas y cabeceras hacia terceros |
| **Las URL de medios las compone el SDK** | El dominio de medios cambia por entorno; una URL montada a mano acaba indexada |
| **La previsualización usa lo que trae el SDK** | El canje del pase y el corte del modo borrador ya están resueltos ahí; rehacerlos es donde se filtra la clave |

## Dónde va cada cosa

| Necesidad | Dónde | Nunca |
|---|---|---|
| Leer contenido para pintar una página | Componente de servidor | Componente de cliente con `fetch` a la API |
| Saber qué rutas existen | El índice de rutas del SDK, al generar las rutas dinámicas | Una lista escrita a mano |
| Pintar una página entera | **Una** llamada de contenido por ruta | Una llamada por bloque |
| Datos que pide el navegador tras una interacción | Un manejador de ruta o una acción de servidor propios, que llaman al SDK | Exponer la clave para llamar directo |
| Borradores | Solo con la clave de previsualización, y solo tras canjear un pase | Un parámetro `?borrador=1` que cualquiera puede escribir |

## Lo que devuelve el CMS

| Lo que llega | Cómo se trata |
|---|---|
| Texto enriquecido | Llega como **árbol de nodos**, no como HTML. Se pinta con componentes propios; el SDK trae un atajo a HTML si no hace falta más. |
| Enlaces dentro del texto | Se validan con lo que trae el SDK antes de ir a un `href` |
| Imágenes | Se piden al SDK ya compuestas; el texto alternativo viene del CMS |
| Contenido en varios idiomas | El idioma se pide en cada lectura; los idiomas activos los dice la configuración del site |
| Módulos | Se pregunta si el site lo tiene activo antes de pintar su sección |

## Errores

Los fallos del SDK traen un **código estable**. Se decide por el código,
nunca por el texto del mensaje.

| Situación | Qué hace el front |
|---|---|
| La ruta no existe | Página de «no encontrado» |
| El site no tiene ese módulo | No pinta la sección. No es un fallo. |
| Fallo de red o límite de peticiones | Sirve lo que tenga en caché, o un error que se pueda reintentar |
| La clave no vale | Falla con ruido en el build y en los registros; nunca enseña el detalle al visitante |

La lista de códigos de tu versión está en los tipos del SDK.

## Caché

El contenido es de un cliente que espera ver sus cambios. Antes de elegir
estrategia, acuerda con la persona **cuánto puede tardar un cambio en verse**.
La previsualización de borradores no se cachea nunca.

## Racionalizaciones

| Excusa | Realidad |
|---|---|
| «Es una clave de solo lectura, da igual que se vea» | Con ella cualquiera consume la cuota del site en su nombre. Y la de previsualización abre los borradores. |
| «Solo para este componente de cliente» | Una vez en el bundle, está publicada. |
| «Monto la URL de la imagen a mano, es concatenar» | Hasta que cambie el dominio de medios o los tamaños. |
| «No paso la dirección de la API, el SDK ya trae una» | Puede no ser la vigente: fallará la conexión aunque `raizell:comprobar` esté en verde. |
| «Convierto el texto a HTML y lo inyecto» | Si hace falta, con el atajo del SDK; nunca con una conversión propia. |
| «Hago mi propia previsualización, es un parámetro» | Es el punto por donde se filtra la clave que abre todos los borradores. |

## Señales de alarma

- `"use client"` en un fichero que importa el SDK.
- Una variable `NEXT_PUBLIC_` que contiene una clave.
- Más de un sitio donde se crea el cliente.
- Una URL de imagen construida con una plantilla de texto.
- Un `catch` que compara el mensaje del error en vez de su código.
