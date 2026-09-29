// EL MANIFIESTO DEL KIT
//
// `cms-front-kit.json` enumera los ficheros que son del kit. En un
// proyecto, además, registra en `instalado` la versión y la huella (sha256) de
// cada fichero tal y como llegó. Comparando huellas se sabe qué ha tocado el
// proyecto — y eso nunca se pisa al actualizar.
//
// Solo módulos nativos de Node.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

export const MANIFIESTO = "cms-front-kit.json";
const NO_SE_RECORREN = new Set([".git", "node_modules", ".next", ".cms-kit", "out", "dist"]);

export function huella(fichero) {
  return createHash("sha256").update(readFileSync(fichero)).digest("hex");
}

function globARegex(patron) {
  const cuerpo = patron
    .split("**")
    .map((trozo) => trozo.replace(/[.+^${}()|[\]\\?]/g, "\\$&").replace(/\*/g, "[^/]*"))
    .join(".*");
  return new RegExp(`^${cuerpo}$`);
}

function recorrer(raiz, dir = raiz, salida = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (NO_SE_RECORREN.has(e.name)) continue;
    const ruta = join(dir, e.name);
    if (e.isDirectory()) recorrer(raiz, ruta, salida);
    else if (e.isFile()) salida.push(relative(raiz, ruta).split(sep).join("/"));
  }
  return salida;
}

/** Ficheros de `raiz` que casan con los patrones del manifiesto, sin el propio manifiesto. */
export function expandir(patrones, raiz) {
  const regex = patrones.map(globARegex);
  return recorrer(raiz)
    .filter((r) => r !== MANIFIESTO && regex.some((re) => re.test(r)))
    .sort();
}

export function huellasDe(rutas, raiz) {
  return Object.fromEntries(rutas.map((r) => [r, huella(join(raiz, r))]));
}

export function leerManifiesto(raiz) {
  const f = join(raiz, MANIFIESTO);
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
}

export function escribirManifiesto(raiz, manifiesto) {
  writeFileSync(join(raiz, MANIFIESTO), JSON.stringify(manifiesto, null, 2) + "\n");
}
