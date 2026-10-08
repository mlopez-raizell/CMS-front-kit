---
name: cms-front-produccion
description: Úsala al llevar un front del CMS de Raizell a producción o a una vista previa del hosting, y cuando algo funciona en local y falla al desplegar. Dispara con "poner en producción", "salir a producción", "desplegar", "publicar la web", "fusionar a main", "variables del hosting", "falla el build", "no instala el SDK en el hosting", "401 al construir", "authentication token not provided", "invalid runtime", "en local funciona y en el hosting no", "ver cómo queda no funciona", "sitemap", "robots", "página 404", "redirecciones", "vuelta atrás", "rollback".
---

# Poner un front en producción

**La ley de hierro:**

```
NO SE SALE A PRODUCCIÓN SIN HABER LEÍDO LO PUBLICADO CON LA CLAVE PÚBLICA
```

En desarrollo se trabaja con la clave de previsualización y con borradores: la
web se ve completa. Producción lee otra cosa —solo lo publicado, con otra
clave, de un site que tiene que estar activo— y es el único camino que nadie
ha recorrido hasta ese día.

## Qué cambia de desarrollo a producción

| | Desarrollo y vistas previas | Producción |
|---|---|---|
| Clave con la que se lee | Previsualización | **Pública** (la de previsualización solo para «Ver cómo queda») |
| Qué se lee | Borradores y publicado | **Solo publicado** |
| Estado del site | Puede estar en construcción | **Tiene que estar activo** |
| Interruptor de borradores por entorno (si el proyecto lo tiene) | Activado | **No existe** |
| Caché de las páginas | Ninguna con borradores | Pública y corta |

## El orden de salida

1. **Contenido publicado, no solo guardado.** Páginas, menús y la página legal.
   `npm run cms:descubrir` (sin `--previa`) enseña lo que ve un visitante.
2. **Título y descripción** en cada página. Si llegan vacíos, el título será el
   nombre interno de la página, y revisa que no todas compartan el mismo.
3. **El site, activo.** Lo activa Raizell (CHECKLIST 7). Pídelo con tiempo.
4. **`npm run cms:comprobar -- --produccion`** en verde: la clave pública
   responde. Si falta o el site no le contesta, sale en rojo.
5. **Prueba el front solo con la clave pública**, sin el interruptor de
   borradores. Lo que salga vacío o en «no encontrado» es lo que verá el
   visitante hoy.
6. **Variables del hosting**, entorno por entorno (tabla de abajo).
7. **Despliegue de prueba** en la rama de desarrollo: construye y pinta contenido.
8. **Llevarlo a la rama de producción.** Antes, sabe cómo volver atrás (último apartado).
9. **Comprobar producción** (lista del final).

## Variables del hosting: cada una, en cada entorno

| Variable | Vista previa | Producción | Nota |
|---|---|---|---|
| Token para instalar el SDK | ✓ | ✓ | Los dos entornos construyen |
| Clave pública | Opcional | ✓ | |
| Clave de previsualización | ✓ | ✓ si hay «Ver cómo queda» | Solo servidor |
| Direcciones de la API y de los medios | ✓ | ✓ | Con `https://` |
| Interruptor de borradores del proyecto | ✓ | **❌ nunca** | En producción enseñaría lo no publicado a todo el mundo, y sin caché |

Trampas que ya han ocurrido:

| Trampa | Cómo se ve | Qué hacer |
|---|---|---|
| Una variable marcada para **un solo entorno** | En el otro: `401 authentication token not provided` al instalar el SDK, o la web sin clave | Marca los dos entornos y mira la fila de la variable, no solo que exista |
| Variables nuevas, despliegue viejo | Todo igual que antes | Las variables solo afectan a despliegues **nuevos**: redespliega, sin caché de build |
| **Un redespliegue antiguo «sale bien»** | Falso éxito | Construye el código de aquel commit, que quizá ni usaba el SDK. Comprueba el commit y el entorno del despliegue |
| Valor pegado a medias | Falla igual que si faltara | Una sola línea, sin comillas ni espacios ni salto final |
| Build hecho en tu máquina y subido ya construido | La clave de previsualización viaja dentro del artefacto | Despliega siempre desde el repositorio |

## Instalar el SDK privado en el hosting

El `.npmrc` del proyecto solo dice **de dónde** sale el SDK. El token va en
una variable secreta del hosting: o una variable que contiene la línea
`//<registro>/:_authToken=<token>` (algunos hostings la escriben como `.npmrc`
al construir), o una variable que el `.npmrc` referencia como `${VARIABLE}`.

| Log del build | Significa | Qué hacer |
|---|---|---|
| `401` y `authentication token not provided` | npm **no ha recibido ningún token** | La variable no existe en ese entorno, su nombre no es el que el hosting espera o el valor está mal pegado |
| `403` o `404` | Llegó un token, pero no puede leer el paquete | Está revocado o sin permiso: pide otro a Raizell |

**Separa «el token vale» de «el token llega».** La persona (no el agente) lo
prueba en su terminal con el mismo token que puso en el hosting. El registro,
el ámbito y el paquete están en `cms-front-kit.json` (`sdk`), y la `/` del
nombre del paquete va como `%2F`:

```bash
read -rs T && curl --max-time 20 -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $T" "https://<registro>/@<ámbito>%2F<paquete>"; unset T
```

No enseña nada mientras escribes: pega el token y pulsa Enter. **`200`** → el
token vale y el fallo está en cómo llega al build. **`401`, `403` o `404`** →
el token es el problema. Con un SDK vinculado a un repositorio privado, el
token puede necesitar, además de leer paquetes, permiso de lectura sobre ese
repositorio (visto en otros fronts de Raizell): los tokens los emite Raizell.

## El build compila y el despliegue se rechaza

`invalid runtime`, o un aviso de que tu versión de Node no está soportada por
las funciones del hosting: el **adaptador** del framework solo conoce ciertas
versiones de Node y, con otra, declara una que el hosting ya no admite. El
`npm install` y el build pasan; falla al desplegar.

- Alinea la versión de Node del proyecto con las que el adaptador soporta, o
  usa una versión del adaptador que conozca la tuya (la skill del framework
  dice cuál es el caso).
- **No fijes una versión de Node cerca de su fin de vida**: el hosting retira
  los runtimes poco después, y lo que hoy sale bien dejará de salir.

## Caché y límite de peticiones

El gateway del CMS limita las peticiones **por clave** (hoy, 120 por minuto;
el valor vigente viaja en las cabeceras de respuesta `x-ratelimit-limit` y
`x-ratelimit-remaining`: míralas, no copies el número). Una visita sin caché
puede hacer varias llamadas; si se agota, el gateway responde que hay demasiadas
peticiones y **cae toda la web**, también para los visitantes reales.

| Regla | Qué evita |
|---|---|
| Las páginas con lo publicado, con caché **pública y corta** (decenas de segundos) | Que cada visita llegue al CMS |
| Lo que se repite en **todas** las páginas (configuración, menús, lista de rutas) se guarda unos segundos en memoria | Varias llamadas por visita para lo mismo |
| Las llamadas simultáneas por lo mismo comparten una sola petición, y un fallo no se guarda | Una avalancha al caducar, o un error pegado durante un minuto |
| Una **ruta genérica** (que acepta cualquier URL) comprueba primero que la ruta existe, con la lista cacheada, y responde «no encontrado» **sin pedir contenido** | Que un rastreo de URL inventadas agote el límite |
| Con borradores o con un pase de previsualización en la URL, **nunca caché pública** | Servir lo no publicado a un visitante cualquiera |

## Lo que no hace el hosting por ti

| Qué | Regla |
|---|---|
| Sitemap | Se genera con la lista de rutas publicadas del CMS, no con los ficheros del framework: así salen las páginas del CMS y no las que ya no existen |
| `robots.txt` | Apunta al sitemap vigente |
| Redirecciones 301 | De las URL antiguas: el sitemap viejo, las páginas que cambian de dirección, una página legal que pasa a otra URL |
| Página «no encontrado» | Con diseño y con **estado 404** real, no un 200 con cuerpo de error |
| Títulos y descripciones | Salen del CMS por página: ninguna vacía, y que no se repita el mismo en todas |
| Enlaces dentro del contenido | Relativos. Uno absoluto a la web de producción saca al visitante de cualquier otro entorno |
| Datos legales y política de privacidad | Viven en el CMS y el pie enlaza a ella: comprueba que está publicada **antes** de salir |

## Vuelta atrás

- Un despliegue que falla **no sustituye** al anterior: la web que había sigue sirviéndose.
- Un despliegue que sale bien pero va mal se deshace restaurando el anterior,
  que el hosting conserva y restaura sin reconstruir. **Localiza cómo se hace
  antes de fusionar**, no después.

## Después de desplegar

1. Cada página: carga, con su contenido y su título.
2. Cabecera y pie: menús, enlace legal y datos de la empresa.
3. Un envío de prueba de cada formulario, de punta a punta.
4. `/sitemap.xml`, `/robots.txt`, una URL antigua que redirige y una que no existe (debe dar 404).
5. «Ver cómo queda» desde el panel, si el site lo usa.
6. Cabeceras de caché de una página (`curl -I`): públicas y cortas, nunca `private` en lo publicado.
7. Si hay un error 500, **primero** las variables del entorno de producción (la clave pública), **luego** el estado del site.

## Racionalizaciones

| Excusa | Realidad |
|---|---|
| «En local funciona, será igual en producción» | En local lees borradores con otra clave. Es otro camino |
| «Lo probé en la vista previa del hosting» | Esa lee borradores con la clave de previsualización |
| «El redespliegue salió bien» | ¿De qué commit y de qué entorno? |
| «Dejo el interruptor de borradores puesto, ya lo quito luego» | Cada visitante lo verá entretanto |
| «Fijo Node a una versión vieja que sé que va» | Hasta que el hosting la retire, y fallará un viernes |
| «El framework ya genera un sitemap» | De los ficheros, no del CMS |

## Señales de alarma

- Una variable que solo existe en un entorno del hosting.
- La clave de previsualización en una variable con prefijo público del framework.
- Un redespliegue como única prueba de que el token funciona.
- Una ruta genérica que llama al CMS antes de comprobar que la ruta existe.
- Producción sin ninguna comprobación hecha con la clave pública.
- Fusionar sin saber cómo volver al despliegue anterior.
