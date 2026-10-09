---
name: cms-front-descubrir-contenido
description: Úsala ANTES de escribir cualquier componente, página o tipo que pinte contenido del CMS de Raizell, y cuando algo no aparece o llega distinto de lo esperado. Dispara con "qué campos tiene", "cómo se llama el bloque", "qué páginas hay", "pinta la página de", "haz el componente de", "no sale el campo", "viene vacío", "el cliente ha añadido", "ha cambiado el contenido".
---

# Descubrir el contenido

**La ley de hierro:**

```
LA ESTRUCTURA DEL CONTENIDO NO SE SUPONE: SE LE PREGUNTA AL SITE
```

Cada site tiene sus páginas, sus bloques y sus campos, y el CMS cambia de una
versión a otra. Lo que sabes de otro proyecto, de un ejemplo o de hace un mes
no vale para este.

## El recorrido

1. **Pregunta**: `npm run cms:descubrir`
   (con `-- --previa` si quieres ver borradores. Si el site está en construcción y
   solo tienes la clave de previsualización, la usa él solo y lo dice).
2. **Lee** `.cms-kit/descubierto/RESUMEN.md`: idiomas, módulos, rutas y, por
   cada ruta, qué propiedades llegan, de qué tipo y con qué ejemplo.
3. **Si necesitas el detalle**, abre la respuesta completa de esa ruta en
   `.cms-kit/descubierto/contenido/`.
4. **Los menús no se pueden listar**: el SDK los pide por su identificador.
   Pregunta a quien edite el site cómo se llaman y consúltalos con
   `npm run cms:descubrir -- --menu <identificador>` (varios, separados por
   comas). Un menú que no existe y uno sin publicar responden igual: nada.
5. **Para los tipos**, usa los que exporta el SDK instalado. No declares a
   mano una forma que el paquete ya tipa.
6. **Escribe el código** contra lo que has visto.

`.cms-kit/` no se versiona: es una foto de un momento, y puede llevar
borradores.

## Cuándo se repite

| Situación | Se vuelve a descubrir |
|---|---|
| Se empieza una página o un componente nuevo | Sí |
| El cliente o Raizell han tocado la estructura | Sí |
| Se ha actualizado el SDK | Sí |
| Algo llega vacío o con otra forma | Sí, antes de tocar el código |
| Han pasado días desde la última foto | Sí |

## El front tolera lo que no conoce

Lo descubierto es lo que hay **hoy**. El cliente seguirá editando, así que
el código no puede depender de que nada cambie:

| Caso | Qué hace el front |
|---|---|
| Llega un tipo de bloque que no tiene componente | No lo pinta y sigue con el resto. En desarrollo, lo avisa. |
| Falta un campo opcional | Pinta sin él. No deja el hueco ni un texto de relleno. |
| Una lista llega vacía | No pinta la sección, o pinta su estado vacío diseñado. |
| La ruta no devuelve contenido | Responde «no encontrado», no una página en blanco. |
| Falta la traducción en un idioma | Hace lo que diga la configuración del site, no lo que parezca mejor. |
| El site no tiene un módulo | No pinta esa sección. No es un error de red. |

## Racionalizaciones

| Excusa | Realidad |
|---|---|
| «Es igual que el site anterior» | Cada site tiene su estructura. Compruébalo: son segundos. |
| «El diseño ya dice qué campos hay» | El diseño dice lo que se quiere pintar; el site, lo que existe. Se cruzan. |
| «Lo descubrí la semana pasada» | El contenido es de un cliente que lo edita a diario. |
| «Declaro yo el tipo, que es más rápido» | Y el día que cambie el contrato, tu tipo seguirá compilando contra algo que ya no llega. |
| «Pongo un valor por defecto para que no quede vacío» | Un texto inventado acaba publicado en la web del cliente. |
| «Apunto la estructura en el README para no repetirlo» | Es justo la copia que se desfasa. La foto se regenera, no se documenta. |

## Señales de alarma

- Nombres de campos escritos sin haber abierto `RESUMEN.md`.
- Un tipo declarado a mano para algo que viene del SDK.
- Un componente que lanza un error ante un tipo de bloque desconocido.
- Datos de ejemplo escritos en el código «mientras tanto».
- Ficheros de `.cms-kit/` añadidos a git.
