# CHECKLIST — lo que necesitas antes de empezar

Nueve cosas. Hasta que no tengas las siete primeras no puedes pintar ni una
página; las dos últimas no te impiden arrancar, pero te pararán más tarde.

```bash
npm run cms:comprobar
```

Ese comando recorre los puntos 1 a 7 y te dice cuáles tienes. Nunca enseña el
valor de una clave: solo si está o no. Antes de salir a producción, con la
clave pública como requisito: `npm run cms:comprobar -- --produccion`.

| # | Qué | Quién lo pone | Bloquea |
|---|---|---|---|
| 1 | Node.js, gestor de paquetes y git | Tú | Todo |
| 2 | Tu cuenta de GitHub y el repositorio del front | Tú | Guardar y desplegar tu trabajo |
| 3 | El token para descargar el SDK | Raizell | Instalar el SDK |
| 4 | La clave pública del site | Raizell | Producción (para desarrollar basta la de previsualización) |
| 5 | La clave de previsualización del site | Raizell | Borradores y sites en construcción |
| 6 | Las direcciones de la API y de los medios | El kit las trae puestas | Conexión e imágenes |
| 7 | Saber en qué estado está el site | Raizell | Entender qué clave responde |
| 8 | El diseño y los materiales | Cliente o agencia | Maquetar |
| 9 | Dónde se despliega y con qué variables | Tú y Raizell | Publicar |

> **Pide a Raizell los puntos 3, 4, 5 y 7 en un solo mensaje**, indicando para
> qué site es. Son cosas que se emiten a mano y pedirlas de una en una alarga
> el arranque varios días.

---

## 1 · Node.js, gestor de paquetes y git

**Qué es.** Lo mínimo para ejecutar un front y este kit.

**Cómo se consigue.** Node.js en su versión LTS vigente, desde
<https://nodejs.org>. Git, desde <https://git-scm.com>. El gestor de paquetes
es el que use tu proyecto (npm viene con Node).

**Cómo se comprueba.** `node -v` y `git --version` responden.

## 2 · Tu cuenta de GitHub y el repositorio del front

**Qué es.** El código del front es tuyo y vive en **tu** cuenta de GitHub (o
en la de tu equipo). Es donde desarrollas, donde subes el trabajo y de donde
lo toma el hosting para desplegarlo.

**Cómo se consigue.** Si no tienes cuenta, se crea en <https://github.com>.
Crea en ella el repositorio del front y conecta tu proyecto local.

**Cómo se comprueba.** `git remote -v` enseña tu repositorio.

> Tu cuenta no necesita ningún permiso de Raizell. Lo que da acceso al SDK no
> es tu cuenta, sino el token del punto 3.

## 3 · El token para descargar el SDK

**Qué es.** El SDK con el que se habla con el CMS es un paquete privado. Para
descargarlo hace falta un token que solo permite **leer paquetes**.

**Cómo se consigue.** **Te lo da Raizell.** No lo creas tú.

**Dónde va.** En el `.npmrc` de tu carpeta de usuario (`~/.npmrc`), nunca en
el del proyecto. La línea exacta la indica el README del SDK. En el hosting y
en la integración continua va como variable de entorno secreta, **marcada
para todos los entornos que construyan** (vista previa y producción): si solo
está en uno, el otro falla al instalar con «authentication token not provided».
Ver la skill `cms-front-produccion`.

**Cómo se comprueba.** El SDK se instala sin error de autenticación.

> 🔴 Es una credencial: trátala como una clave. El `.npmrc` **del proyecto**
> se versiona y solo dice de dónde sale el paquete. Si alguna vez contiene el
> token, ese token está publicado: avisa a Raizell para que lo revoque y te
> dé otro.

## 4 · La clave pública del site

**Qué es.** Identifica a tu front ante la API y dice de qué site es. Da
acceso de **solo lectura** a lo **publicado**. No hace falta indicar el site
en ningún otro sitio: va implícito en la clave.

**Cómo se consigue.** La emite Raizell para tu site. **Se enseña una sola
vez**: guárdala en un gestor de contraseñas en cuanto la recibas. Si se
pierde no se puede recuperar; se revoca y se emite otra.

**Dónde va.** En `.env.local`, en la variable que indica
`.env.local.example`.

**Cómo se comprueba.** `npm run cms:comprobar` recibe respuesta del site.

> Es la clave que usan los visitantes en producción, y la única que lee solo
> lo publicado. Pruébala **antes de salir**: `npm run cms:comprobar -- --produccion`.

## 5 · La clave de previsualización del site

**Qué es.** Como la anterior, pero lee también los **borradores**. La
necesitas para dos cosas: que el cliente pueda ver cómo queda un cambio antes
de publicarlo, y trabajar mientras el site está en construcción (punto 7).

**Cómo se consigue.** Igual que la pública, y con las mismas condiciones.

**Dónde va.** En `.env.local`, en su propia variable.

> 🔴 Esta clave abre todo lo que el cliente todavía no ha publicado. Vive
> solo en el servidor. **Nunca** en una URL, en código que llegue al
> navegador ni en una variable con prefijo público del framework
> (`NEXT_PUBLIC_`, `PUBLIC_`, `VITE_`…).

## 6 · Las direcciones de la API y de los medios

**Qué es.** Dos direcciones, las mismas para todos los fronts:

- La de la **API**, de donde se lee el contenido.
- La **base de los medios**, con la que se componen las URL de imágenes y
  documentos.

**Cómo se consigue.** **No hay que pedirlas: las trae el kit.** El instalador
las deja puestas en `.env.local.example` y en tu `.env.local`. No son
secretas.

**Cómo se usan.** Tu front se las pasa al SDK al crear el cliente, **las
dos**. No cuentes con la dirección que el SDK traiga por defecto.

**Cómo se comprueba.** `npm run cms:comprobar` llama a las dos y te dice
si siguen respondiendo.

**Si una deja de responder.** Cambian muy de tarde en tarde. Cuando ocurra,
la vigente llega con una versión nueva del kit:

```bash
npm run cms:actualizar
```

Después, copia la nueva de `.env.local.example` a tu `.env.local` y a las
variables del hosting.

> Si una dirección llega vacía, es que esta versión del kit todavía no la
> trae: pídesela a Raizell.

## 7 · Saber en qué estado está el site

**Qué es.** Un site pasa por estados, y el estado decide qué clave obtiene
respuesta. Mientras está **en construcción** no contesta a la clave pública:
solo a la de previsualización. Cuando se **activa**, la pública lee lo
publicado y la de previsualización añade los borradores.

**Cómo se consigue.** Pregunta a Raizell en qué estado está el tuyo y cuándo
está previsto activarlo.

**Cómo se comprueba.** `npm run cms:comprobar` prueba las dos claves y te
dice cuál responde.

> Si vas a desarrollar contra un site en construcción, tu entorno local
> necesita la clave de previsualización desde el primer día. Con solo esa,
> `cms:comprobar` te deja empezar y te avisa de que falta la pública.
>
> 🔴 **Para salir a producción el site tiene que estar activo**: pide a Raizell
> la fecha con tiempo. Con el site en construcción, la clave pública no
> obtiene respuesta y los visitantes no verían nada.

## 8 · El diseño y los materiales

**Qué es.** Lo que vas a construir: el diseño de cada tipo de página,
tipografías con su licencia, iconos, logotipos y cualquier recurso que no
viva en el CMS.

**Cómo se consigue.** Del cliente o de la agencia que lleve el diseño.

**Cómo se comprueba.** Antes de maquetar, cruza el diseño con lo que el site
tiene de verdad:

```bash
npm run cms:descubrir
```

Si el diseño pinta algo que el site no devuelve, o al revés, se resuelve
ahora y no al final.

## 9 · Dónde se despliega y con qué variables

**Qué es.** El hosting del front y su configuración. Necesita las mismas
variables que tu `.env.local`, más el token del punto 3 para poder instalar
el SDK al construir.

**Cómo se consigue.** Decide el hosting con el cliente y conéctalo a tu
repositorio (punto 2). Confirma con Raizell si las claves de **producción**
(puntos 4 y 5) son las mismas con las que has desarrollado.

**Qué variable va en qué entorno.** Una variable que solo existe en uno de los
entornos del hosting no la ve el otro:

| Variable | Vista previa | Producción |
|---|---|---|
| Token para instalar el SDK (punto 3) | ✓ | ✓ |
| Clave pública (punto 4) | Opcional | ✓ |
| Clave de previsualización (punto 5) | ✓ | ✓ si hay «Ver cómo queda» |
| Direcciones (punto 6) | ✓ | ✓ |
| Un interruptor de borradores del proyecto, si lo hay | ✓ | **❌ nunca** |

**Cómo se comprueba.** `npm run cms:comprobar -- --produccion` en verde y un
despliegue de prueba que construye y pinta contenido. Todo el recorrido, con
las trampas que ya han ocurrido, está en la skill `cms-front-produccion`.

---

## Lo que no está en esta lista, a propósito

**Qué páginas, bloques y campos tiene el site.** Cambia con cada site y con
cada versión del CMS, así que ningún documento lo puede tener al día. Se le
pregunta al propio site:

```bash
npm run cms:descubrir
```

**Qué funciones tiene el SDK.** Lo dice el paquete que tienes instalado, en
su README y en sus tipos. Esa es siempre la referencia, no este kit.
