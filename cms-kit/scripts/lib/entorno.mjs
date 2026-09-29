// EL ENTORNO DEL FRONT: variables, gestor de paquetes y el SDK instalado
//
// Todo lo que los scripts del kit necesitan saber del proyecto sale de aquí, y
// sale MIRANDO el proyecto, no suponiéndolo: qué SDK hay instalado y en qué
// versión lo dice `node_modules`, no este fichero.
//
// Solo módulos nativos de Node.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/** Nombres de las variables de entorno del front. Un solo sitio donde cambiarlos. */
export const VARIABLES = {
  clave: "RAIZELL_API_KEY",
  clavePrevia: "RAIZELL_PREVIEW_KEY",
  api: "RAIZELL_API_URL",
  medios: "MEDIA_BASE_URL",
};

/** `CLAVE=valor` por línea; admite comentarios, `export` y comillas. */
export function leerEnv(texto) {
  const salida = {};
  for (const cruda of texto.split(/\r?\n/)) {
    const linea = cruda.trim();
    if (linea === "" || linea.startsWith("#")) continue;
    const m = linea.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let valor = m[2].trim();
    const comilla = valor[0];
    if ((comilla === '"' || comilla === "'") && valor.endsWith(comilla) && valor.length >= 2) {
      valor = valor.slice(1, -1);
    } else {
      valor = valor.replace(/\s+#.*$/, "");
    }
    salida[m[1]] = valor;
  }
  return salida;
}

/**
 * Variables tal y como las verá el front en local: `.env`, encima `.env.local`
 * y encima el entorno del proceso, que es el orden de Next.js.
 */
export function entornoDe(raiz, proceso = process.env) {
  const salida = {};
  for (const nombre of [".env", ".env.local"]) {
    const f = join(raiz, nombre);
    if (existsSync(f)) Object.assign(salida, leerEnv(readFileSync(f, "utf8")));
  }
  for (const [k, v] of Object.entries(proceso)) if (v !== undefined) salida[k] = v;
  return salida;
}

const tieneValor = (v) => typeof v === "string" && v.trim() !== "" && !/^<.*>$/.test(v.trim());
/** ¿La variable tiene un valor de verdad (ni vacía ni el marcador `<...>` de la plantilla)? */
export function rellena(entorno, nombre) {
  return tieneValor(entorno[nombre]);
}

const sinBarraFinal = (v) => String(v).trim().replace(/\/+$/, "");

/** La dirección que el kit trae puesta (`api` o `medios`), o `null` si todavía no trae ninguna. */
export function habitual(manifiesto, cual) {
  const v = manifiesto?.direcciones?.[cual];
  return tieneValor(v) ? sinBarraFinal(v) : null;
}

/** La dirección que se usa de verdad: la del entorno si está puesta; si no, la habitual del kit. */
export function direccion(entorno, manifiesto, cual) {
  const nombre = cual === "api" ? VARIABLES.api : VARIABLES.medios;
  return rellena(entorno, nombre) ? sinBarraFinal(entorno[nombre]) : habitual(manifiesto, cual) ?? undefined;
}

/** `@scope:registry=url` — la línea que el `.npmrc` del front necesita. Sin secreto. */
export function lineaDeRegistro(manifiesto) {
  const scope = manifiesto.sdk.paquete.split("/")[0];
  return `${scope}:registry=${manifiesto.sdk.registro}`;
}

/** Con qué se instala en este proyecto, según el lockfile que haya. */
export function gestorDe(raiz) {
  if (existsSync(join(raiz, "pnpm-lock.yaml"))) return { nombre: "pnpm", instalar: "pnpm add" };
  if (existsSync(join(raiz, "yarn.lock"))) return { nombre: "yarn", instalar: "yarn add" };
  if (existsSync(join(raiz, "bun.lockb")) || existsSync(join(raiz, "bun.lock"))) {
    return { nombre: "bun", instalar: "bun add" };
  }
  return { nombre: "npm", instalar: "npm install" };
}

function leerJson(f) {
  try {
    return JSON.parse(readFileSync(f, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Qué SDK usa este proyecto. Primero el que dice el manifiesto; si el proyecto
 * declara otro paquete que es a todas luces el SDK (el nombre ha cambiado entre
 * versiones del kit y del CMS), se usa ese: manda el proyecto.
 */
export function localizarSdk(raiz, manifiesto) {
  const pkg = leerJson(join(raiz, "package.json")) ?? {};
  const declaradas = { ...(pkg.devDependencies ?? {}), ...(pkg.dependencies ?? {}) };
  const esperado = manifiesto?.sdk?.paquete;
  let nombre = esperado && declaradas[esperado] !== undefined ? esperado : null;
  if (!nombre) {
    nombre = Object.keys(declaradas).find((d) => /raizell/i.test(d) && /sdk/i.test(d)) ?? null;
  }
  const dir = join(raiz, "node_modules", ...(nombre ?? esperado ?? "").split("/"));
  const instalado = nombre || esperado ? leerJson(join(dir, "package.json")) : null;
  return {
    nombre: nombre ?? esperado ?? null,
    declarado: nombre !== null,
    version: instalado?.version ?? null,
    dir: instalado ? dir : null,
    paquete: instalado,
  };
}

function condicion(v) {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") return condicion(v.import ?? v.default ?? v.node);
  return null;
}

/** Importa el SDK instalado EN EL PROYECTO. Devuelve el módulo o lanza con un mensaje legible. */
export async function cargarSdk(raiz, manifiesto) {
  const sdk = localizarSdk(raiz, manifiesto);
  if (!sdk.dir) throw new Error(`el SDK (${sdk.nombre ?? "sin declarar"}) no está instalado en node_modules`);
  const raizExports = sdk.paquete.exports?.["."] ?? sdk.paquete.exports;
  const entrada = condicion(raizExports) ?? sdk.paquete.module ?? sdk.paquete.main ?? "index.js";
  const fichero = join(sdk.dir, entrada);
  if (!existsSync(fichero)) throw new Error(`el SDK instalado no trae su entrada (${entrada}): reinstálalo`);
  return { modulo: await import(pathToFileURL(fichero).href), sdk };
}

/** Quita de un texto cualquier valor secreto del entorno, por si un error lo arrastra. */
export function sinSecretos(texto, entorno) {
  let salida = String(texto);
  for (const nombre of [VARIABLES.clave, VARIABLES.clavePrevia]) {
    const v = entorno[nombre];
    if (tieneValor(v) && v.length >= 6) salida = salida.split(v).join("***");
  }
  return salida;
}

/** Código estable de un error del SDK, si lo trae. */
export function codigoDe(error) {
  return typeof error?.codigo === "string" ? error.codigo : typeof error?.code === "string" ? error.code : null;
}
