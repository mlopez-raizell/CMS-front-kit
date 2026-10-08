# Puesta en producción — CMS Front Kit

Fecha: 2026-10-08 · Versión que describe: v0.2.0 · Estado: aprobado

## Objetivo

Que el siguiente desarrollador que lleve un front a producción no tropiece
con lo que se encontró la primera vez. Lo aprendido al poner en marcha un
front real (un sitio de marketing en Astro, con el SDK privado y alojado en un
hosting con vistas previas por rama) entra al kit **en forma genérica**: sin
nombres de campos, de rutas ni de proyecto.

## Qué falló, y dónde queda cubierto

| Fallo visto | Cómo se manifestó | Dónde queda |
|---|---|---|
| El token del SDK estaba en un solo entorno del hosting | `401 authentication token not provided` en las vistas previas; un redespliegue antiguo «salía bien» y despistaba | Skill `cms-front-produccion` (variables por entorno, trampas, prueba del token); checklist 3 y 9 |
| El adaptador del framework no conocía la versión de Node del proyecto | El build compilaba y el despliegue se rechazaba («invalid runtime») | Skills `cms-front-produccion` y `cms-front-astro` |
| La clave pública no se había probado nunca | Solo se había desarrollado con la de previsualización y borradores | `cms:comprobar -- --produccion`; ley de hierro de `cms-front-produccion`; regla dura |
| El gateway limita las peticiones por clave y una ruta genérica acepta cualquier URL | Riesgo de que un rastreo agote el límite y caiga toda la web | Regla dura; caché y comprobación de rutas en las skills; issue #8 |
| Un interruptor de borradores por entorno, necesario en desarrollo | Si llegara a producción, los visitantes verían lo no publicado | Regla dura; tabla de entornos; excepción explícita en la skill de Next.js |
| Una variable vacía en `.env.local` tapaba la que tenía valor en `.env` | La web sin clave y `cms:comprobar` diciendo «falta» cuando existía | `variablesTapadas` en `cms:comprobar`; el instalador deja comentadas esas variables; issue #2 |
| El kit solo conocía `NEXT_PUBLIC_` | Una clave en `PUBLIC_` o `VITE_` no se detectaba | `esPublica`; skill `cms-front-astro`; issue #3 |
| `cms:descubrir` exigía la clave pública con el site en construcción | Había que adivinar la opción `--previa` | Usa la de previsualización si es la única; issue #6 |
| Los menús no se pueden listar con el SDK | El identificador de un menú había que adivinarlo | `cms:descubrir -- --menu`; issue #7 |
| Sitemap, página legal, redirecciones, 404 y SEO | Lo que el framework hacía con ficheros ya no valía con contenido del CMS | Tabla «Lo que no hace el hosting por ti» de `cms-front-produccion` |

## Decisiones

| Decisión | Elegido | Descartado y por qué |
|---|---|---|
| Dónde vive el recorrido a producción | Una skill propia, `cms-front-produccion`, independiente del framework | Repartirlo por las skills de cada framework: se repite y se desfasa |
| Cómo se enseña lo específico de un framework | Una skill por framework (`cms-front-nextjs`, `cms-front-astro`) con las mismas reglas duras traducidas | Una sola skill «web»: demasiado vaga para decidir |
| La clave pública ausente | Aviso si hay clave de previsualización; error con `--produccion` | Error siempre: bloqueaba desarrollar con un site en construcción, que el propio kit permite |
| Probar producción | Un modo de `cms:comprobar`, sin comando nuevo | Un comando nuevo: obligaría a cambiar `package.json` de los fronts ya instalados |
| Variables tapadas | Se avisa en `cms:comprobar` y el instalador evita crearlas | Ordenar los ficheros de otra forma: el kit no decide cómo carga el framework |
| Valores que pueden cambiar (límite de peticiones) | Se explica el efecto y se manda a leer las cabeceras | Copiar el número: se desfasa |

## Fuera de alcance, a propósito

- **El código de salida del instalador** cuando solo quedan tareas pendientes
  para la persona (issue #4): es una decisión de contrato (lo prueba una
  prueba y cambiarlo sería versión mayor); queda abierta.
- **Una guía de un hosting concreto.** Se enseñan los principios y las
  trampas; el panel de cada hosting cambia más que el kit.
- **Migrar de Astro 4 a 5** por el adaptador: la skill dice qué pasa y por qué,
  pero la decisión de actualizar es de cada proyecto.

## Pendiente de validar

- Que `cms:comprobar -- --produccion` encaje con el flujo de quien despliega
  desde una integración continua que no tiene `.env.local`: hoy lee el
  entorno del proceso, así que debería bastar con exportar las variables.
