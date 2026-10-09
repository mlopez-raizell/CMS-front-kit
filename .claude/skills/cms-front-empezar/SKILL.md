---
name: cms-front-empezar
description: Úsala al empezar un front para el CMS de Raizell, justo después de instalar el kit, o cuando no se puede instalar el SDK o el site no responde. Dispara con "empezar el front", "qué necesito para empezar", "configura el entorno", "no me instala el SDK", "me da 401", "me da 403", "no_autorizado", "sitio_no_disponible", "no conecta con el CMS".
---

# Empezar un front

**La ley de hierro:**

```
NINGÚN CÓDIGO QUE LEA DEL CMS HASTA QUE `cms:comprobar` ESTÉ EN VERDE
```

Casi todo lo que parece un fallo del front en los primeros días es un punto de
la checklist sin resolver. Se comprueba antes, no se depura después.

## El recorrido

1. **Ejecuta** `npm run cms:comprobar` y lee la salida entera.
2. **Por cada `✗`**, abre su punto en `cms-kit/CHECKLIST.md` y dile a la
   persona **qué falta y a quién se lo pide**. Todo lo que dependa de Raizell
   se pide en un solo mensaje.
3. **Mientras llega**, avanza con lo que no depende de ello: estructura del
   proyecto, estilos, componentes sin datos.
4. **Repite** hasta que salga en verde. Los `!` son avisos: se explican a la
   persona, no bloquean.
5. **Descubre el site**: `npm run cms:descubrir`. A partir de aquí manda
   la skill `cms-front-descubrir-contenido`.
6. **Cuando llegue el momento de publicar**, manda la skill `cms-front-produccion`.

## Credenciales: lo que un agente no hace

| No | En su lugar |
|---|---|
| Pedir una clave o un token por el chat | Decir en qué fichero y variable la pone la persona |
| Crear un token de GitHub para el SDK | Ese token lo da Raizell: se le pide |
| Escribir una clave en `.env.local` | Dejar su variable vacía y avisar a la persona |
| Leer `.env.local` o `~/.npmrc` para «comprobar» | Ejecutar `cms:comprobar`, que no enseña valores |
| Copiar claves de otro proyecto de la máquina | Parar y pedir las de este site |
| Poner un token en el `.npmrc` del proyecto | Ese fichero se versiona: solo lleva el registro |

## Síntoma → punto de la checklist

| Lo que se ve | Punto |
|---|---|
| Error de autenticación al instalar el SDK | 3 — falta el token: lo da Raizell |
| «No encontrado» o «prohibido» al instalar el SDK, con el token puesto | 3 — el token está revocado o no vale: se pide otro a Raizell |
| No hay dónde subir el trabajo | 2 — falta el repositorio en la cuenta del desarrollador |
| El site rechaza la clave | 4 o 5 — mal copiada, revocada, o de otro entorno |
| El site no está disponible con la clave pública | 7 — está en construcción: se trabaja con la de previsualización |
| `cms:comprobar` avisa de que falta la clave pública, y hay de previsualización | 4 — es un aviso: puedes desarrollar; la necesitarás para producción |
| `cms:comprobar` dice «está vacía en .env.local y tapa la de .env» | Borra o comenta esa línea de `.env.local`: los frameworks leen ese fichero por encima y una variable vacía gana |
| Las imágenes no se pueden componer | 6 — falta la dirección de medios en `.env.local`: está en `.env.local.example` |
| Una dirección no responde | 6 — `npm run cms:actualizar` trae la vigente |
| El build del hosting da `401` y «authentication token not provided» | 3 y 9 — el token no llega a **ese entorno** del hosting: skill `cms-front-produccion` |
| En local funciona y en el hosting no | 9 — faltan variables en ese entorno, o el token: skill `cms-front-produccion` |
| El build pasa y el despliegue se rechaza («invalid runtime») | 9 — la versión de Node del proyecto: skill `cms-front-produccion` |

## Racionalizaciones

| Excusa | Realidad |
|---|---|
| «Mientras llegan las claves, invento unos datos y voy maquetando» | Maquetarás contra una estructura que no existe. Avanza con lo que no lleva datos. |
| «Pego la clave aquí un momento para probar» | Queda en el historial. Habrá que revocarla. |
| «El aviso de la clave de previsualización da igual por ahora» | Si el site está en construcción, es la única que responde. |
| «Ya funcionaba ayer, no hace falta comprobar» | Las claves se revocan y los tokens caducan. Son diez segundos. |
