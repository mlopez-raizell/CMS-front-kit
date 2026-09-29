# CLAUDE.md — mantenimiento de Raizell Front Kit

> Este es el repositorio **del kit**, no un front. Lo que reciben los
> desarrolladores es lo que enumera `raizell-front-kit.json`; el resto
> (este fichero, `README.md`, `CHANGELOG.md`, `docs/`, `scripts/`, las pruebas)
> se queda aquí.

@AGENTS.raizell.md

## Reglas para mantener el kit

| Regla | Por qué |
|---|---|
| **Nada de lo que se publique nombra campos, bloques, rutas ni pantallas del CMS** | Cambian con cada site y cada versión; el kit enseña a descubrirlos |
| **Las firmas del SDK no se copian**: se remite a su README y a sus tipos | Una copia se desfasa en la primera versión nueva |
| **Los scripts miran antes de suponer**: si un método o un campo no está, lo anotan y siguen | Tienen que funcionar con un SDK más nuevo o más viejo que el kit |
| **El repositorio es público**: ningún dato de un site, ninguna credencial, ningún contacto | Los desarrolladores ya saben a quién dirigirse |
| **Todo fichero que deba llegar a los proyectos está en el manifiesto** | Si no, ni se instala ni se actualiza |
| **Una skill nueva sale de un fallo visto**, no de una suposición | Ver `raizell-registrar-aprendizaje` |
| **Cambiar de sitio un fichero, o de nombre una variable o un comando, es versión mayor** | Obliga a tocar los fronts ya instalados |

## Ramas

Se trabaja siempre en `dev`. `main` solo recibe merges, y los hace Miguel:
cada llegada a `main` ejecuta la acción que publica la versión.

## Comprobar antes de publicar

```bash
node --test raizell-kit/scripts/*.test.mjs
```
