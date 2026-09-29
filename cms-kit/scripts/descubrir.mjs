#!/usr/bin/env node
// DESCUBRIR QUÉ TIENE EL SITE
//
// El kit no documenta la estructura del contenido: cambia con cada site y con
// cada versión del CMS. En su lugar, esto le PREGUNTA al site y deja la
// respuesta en `.cms-kit/descubierto/` (fuera de git):
//
//   RESUMEN.md        lo que hay, para leer: idiomas, módulos, rutas y la
//                     forma de los datos de cada una
//   superficie.json   espacios y métodos que expone el SDK instalado
//   config.json       configuración pública del site
//   rutas.json        todas las rutas
//   contenido/        la respuesta completa de cada ruta
//
// No supone nombres de campos: recorre lo que llega. Si una llamada no existe
// en tu versión del SDK o el site no tiene ese módulo, lo anota y sigue.
//
// Uso (desde la raíz del front):
//   npm run cms:descubrir
//   npm run cms:descubrir -- --previa       (clave de previsualización, con borradores)
//   npm run cms:descubrir -- --max 20       (tope de rutas cuyo contenido se pide; 50 por defecto)

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { leerManifiesto } from "./lib/manifiesto.mjs";
import { VARIABLES, cargarSdk, codigoDe, direccion, entornoDe, rellena, sinSecretos } from "./lib/entorno.mjs";
import { forma, formaEnLineas, superficie } from "./lib/forma.mjs";

const RAIZ = process.cwd();
const SALIDA = join(RAIZ, ".cms-kit", "descubierto");
const args = process.argv.slice(2);
const PREVIA = args.includes("--previa");
const iMax = args.indexOf("--max");
const MAX = iMax >= 0 ? Math.max(1, Number(args[iMax + 1]) || 50) : 50;

function parar(mensaje) {
  console.error(`✗ ${mensaje}`);
  process.exit(1);
}

const manifiesto = leerManifiesto(RAIZ);
if (!manifiesto?.sdk?.paquete) parar("Falta cms-front-kit.json: ejecuta esto desde la raíz del front, con el kit instalado.");

const entorno = entornoDe(RAIZ);
const nombreDeClave = PREVIA ? VARIABLES.clavePrevia : VARIABLES.clave;
if (!rellena(entorno, nombreDeClave)) {
  parar(`Falta ${nombreDeClave}. Pasa antes la checklist: npm run cms:comprobar`);
}

let modulo, sdk;
try {
  ({ modulo, sdk } = await cargarSdk(RAIZ, manifiesto));
} catch (e) {
  parar(`${e.message}. Pasa antes la checklist: npm run cms:comprobar`);
}
if (typeof modulo.createClient !== "function") {
  parar("Este SDK no se inicia como el kit espera. Mira su README y actualiza el kit: npm run cms:actualizar");
}

const cliente = modulo.createClient({
  apiKey: entorno[nombreDeClave],
  baseUrl: direccion(entorno, manifiesto, "api"),
  mediaBaseUrl: direccion(entorno, manifiesto, "medios"),
  dataSource: "api",
});

const notas = [];
const lectura = (extra = {}) => (PREVIA ? { borradores: true, ...extra } : extra);

/** Llama a un método del SDK si existe. Devuelve `undefined` y lo anota si no, o si falla. */
async function pedir(etiqueta, espacio, metodo, ...argumentos) {
  const destino = espacio ? cliente[espacio] : cliente;
  if (typeof destino?.[metodo] !== "function") {
    notas.push(`\`${etiqueta}\` no existe en esta versión del SDK.`);
    return undefined;
  }
  try {
    return await destino[metodo](...argumentos);
  } catch (e) {
    const codigo = codigoDe(e);
    notas.push(`\`${etiqueta}\` falló${codigo ? ` (${codigo})` : ""}: ${sinSecretos(e?.message ?? e, entorno)}`);
    return undefined;
  }
}

const guardar = (nombre, datos) => {
  const f = join(SALIDA, nombre);
  mkdirSync(join(f, ".."), { recursive: true });
  writeFileSync(f, JSON.stringify(datos, null, 2) + "\n");
};

const nombreDeFichero = (ruta, locale) =>
  `${locale ? `${locale}__` : ""}${String(ruta).replace(/^\/+|\/+$/g, "").replace(/[^A-Za-z0-9._-]+/g, "_") || "raiz"}.json`;

// ── Preguntar ───────────────────────────────────────────────────────────────
rmSync(SALIDA, { recursive: true, force: true });
mkdirSync(SALIDA, { recursive: true });

const config = await pedir("config()", null, "config");
if (config === undefined) {
  const enConstruccion = !PREVIA && /sitio_no_disponible/.test(notas.at(-1) ?? "");
  parar(
    `El site no contesta. ${notas.at(-1) ?? ""}\n` +
      (enConstruccion
        ? "  Si está en construcción, solo responde a la clave de previsualización: npm run cms:descubrir -- --previa"
        : "  Pasa la checklist para ver qué falla: npm run cms:comprobar"),
  );
}
guardar("config.json", config);
guardar("superficie.json", { sdk: sdk.nombre, version: sdk.version, ...superficie(cliente) });

const locales = Array.isArray(config?.locales?.content_active)
  ? config.locales.content_active.map((l) => (typeof l === "string" ? l : l?.code)).filter(Boolean)
  : [];

// Las rutas, idioma por idioma si el site los declara; si no, lo que dé por defecto.
const rutas = [];
const vistas = new Set();
for (const locale of locales.length ? locales : [null]) {
  const lista = await pedir(`cms.rutas(${locale ?? ""})`, "cms", "rutas", lectura(locale ? { locale } : {}));
  for (const r of Array.isArray(lista) ? lista : []) {
    const id = JSON.stringify([r?.ruta ?? r, r?.locale ?? locale]);
    if (vistas.has(id)) continue;
    vistas.add(id);
    rutas.push(r);
  }
}
guardar("rutas.json", rutas);

const contenidos = [];
for (const r of rutas.slice(0, MAX)) {
  const ruta = typeof r === "string" ? r : r?.ruta;
  if (typeof ruta !== "string") continue;
  const locale = typeof r === "object" ? r?.locale ?? null : null;
  const datos = await pedir(`cms.contenido(${ruta})`, "cms", "contenido", ruta, lectura(locale ? { locale } : {}));
  if (datos === undefined) continue;
  const fichero = join("contenido", nombreDeFichero(ruta, locale));
  guardar(fichero, datos);
  contenidos.push({ ruta, locale, tipo: typeof r === "object" ? r?.tipo : undefined, fichero, datos });
}
if (rutas.length > MAX) notas.push(`Hay ${rutas.length} rutas; solo se ha pedido el contenido de las ${MAX} primeras (\`--max\`).`);

const medios = await pedir("medios.listar()", "medios", "listar", lectura());
if (medios !== undefined) guardar("medios.json", medios);

// ── Resumen ─────────────────────────────────────────────────────────────────
const s = superficie(cliente);
const md = [];
md.push("# Lo que tiene este site", "");
md.push(`> Generado por \`npm run cms:descubrir\` el ${new Date().toISOString().slice(0, 10)}, con la clave ${PREVIA ? "de previsualización (incluye borradores)" : "pública (solo publicado)"}.`);
md.push("> Es una foto: si el contenido o el SDK cambian, vuelve a generarla. No se versiona.", "");

md.push("## SDK instalado", "", `\`${sdk.nombre}\` ${sdk.version ?? ""}`.trim(), "");
if (s.metodos.length) md.push(`- En la raíz: ${s.metodos.map((m) => `\`${m}()\``).join(", ")}`);
for (const [espacio, metodos] of Object.entries(s.espacios)) {
  md.push(`- \`${espacio}\`: ${metodos.map((m) => `\`${m}()\``).join(", ") || "—"}`);
}
md.push("", "Las firmas exactas y los tipos están en el propio paquete (su README y sus `.d.ts`).", "");

md.push("## Configuración del site", "", ...formaEnLineas(forma(config)), "");

md.push(`## Rutas (${rutas.length})`, "");
if (rutas.length === 0) md.push("El site no ha devuelto ninguna ruta.", "");
else {
  md.push("| Ruta | Idioma | Tipo |", "|---|---|---|");
  for (const r of rutas) {
    md.push(`| \`${typeof r === "string" ? r : r?.ruta}\` | ${r?.locale ?? "—"} | ${r?.tipo ?? "—"} |`);
  }
  md.push("");
}

md.push("## Forma del contenido", "");
md.push("Por cada ruta, qué propiedades llegan, de qué tipo, cuántas veces y un ejemplo.", "`[]` es «cada elemento de la lista».", "");
for (const c of contenidos) {
  md.push(`### \`${c.ruta}\`${c.locale ? ` · ${c.locale}` : ""}${c.tipo ? ` · ${c.tipo}` : ""}`, "");
  md.push(`Respuesta completa: \`${c.fichero}\``, "");
  if (c.datos === null) md.push("La ruta existe en el índice pero no devuelve contenido.", "");
  else md.push(...formaEnLineas(forma(c.datos)), "");
}

if (Array.isArray(medios)) {
  md.push(`## Medios (${medios.length})`, "");
  if (medios.length) md.push(...formaEnLineas(forma(medios)), "");
}

if (notas.length) md.push("## Lo que no se pudo consultar", "", ...notas.map((n) => `- ${n}`), "");

writeFileSync(join(SALIDA, "RESUMEN.md"), md.join("\n"));

console.log(`Site consultado: ${rutas.length} ruta(s), ${contenidos.length} con su contenido${Array.isArray(medios) ? `, ${medios.length} medio(s)` : ""}.`);
if (notas.length) console.log(`${notas.length} cosa(s) no se pudieron consultar: están al final del resumen.`);
console.log("Léelo en: .cms-kit/descubierto/RESUMEN.md");
