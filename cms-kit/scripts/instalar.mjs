#!/usr/bin/env node
// INSTALAR EL KIT EN UN FRONT
//
// Se ejecuta DESDE LA RAÍZ DEL FRONT, apuntando al instalador de una copia del
// kit (ver README). Lo que hace, y nada más:
//
//   1. Comprueba que ya hay un proyecto (package.json). Si no, para y dice qué
//      hacer antes.
//   2. Copia los ficheros del kit. NO pisa ninguno que ya exista y sea distinto.
//   3. Registra en `cms-front-kit.json` la versión instalada y la huella de
//      cada fichero, para poder actualizar sin pisar lo que toques.
//   4. Añade los scripts `cms:*` a package.json. NO pisa los que ya tengas.
//   5. Crea lo que falte del proyecto: `.npmrc`, `.env.local.example`,
//      `.env.local` (con las direcciones ya puestas y las claves vacías),
//      `AGENTS.md` y `CLAUDE.md`. Ninguno se sobrescribe.
//   6. Se asegura de que `.env.local` y `.cms-kit/` están en `.gitignore`.
//
// NO instala el SDK ni pide credenciales: eso es la checklist, y la recorre
// `npm run cms:comprobar`.
//
// Es idempotente: correrlo dos veces no cambia nada la segunda.

import { appendFileSync, chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MANIFIESTO, escribirManifiesto, expandir, huella, leerManifiesto } from "./lib/manifiesto.mjs";
import { VARIABLES, entornoDe, habitual, lineaDeRegistro, rellena } from "./lib/entorno.mjs";

const ORIGEN = resolve(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
const DESTINO = process.cwd();
const PLANTILLAS = join(ORIGEN, "cms-kit", "plantillas");
const REFERENCIA = "AGENTS.cms.md";

const SCRIPTS = {
  "cms:comprobar": "node cms-kit/scripts/comprobar.mjs",
  "cms:descubrir": "node cms-kit/scripts/descubrir.mjs",
  "cms:estado": "node cms-kit/scripts/kit.mjs estado",
  "cms:actualizar": "node cms-kit/scripts/kit.mjs actualizar",
  "cms:instalar": "node cms-kit/scripts/instalar.mjs",
};

const IGNORAR = [
  [".env.local", "las claves del site"],
  [".cms-kit/", "lo que vuelca cms:descubrir"],
];

const hechos = [];
const yaEstaban = [];
const pendientes = [];

const origen = leerManifiesto(ORIGEN);
if (!origen) {
  console.error(`✗ No encuentro ${MANIFIESTO} junto al instalador: la copia del kit está incompleta.`);
  process.exit(1);
}

// ── 1. ¿Hay proyecto? ───────────────────────────────────────────────────────
const PKG = join(DESTINO, "package.json");
if (!existsSync(PKG)) {
  console.error(`
✗ Aquí todavía no hay un proyecto: falta package.json.

  El kit se instala ENCIMA de un front que ya existe. Crea primero el
  proyecto con el framework que vayas a usar (Next.js, Astro…) y vuelve a ejecutar el
  instalador desde su raíz.
`);
  process.exit(1);
}
let pkg;
try {
  pkg = JSON.parse(readFileSync(PKG, "utf8"));
} catch (e) {
  console.error(`✗ package.json no es JSON válido: ${e.message}`);
  process.exit(1);
}

// ── 2 y 3. Ficheros del kit y registro de la versión ────────────────────────
if (ORIGEN !== DESTINO) {
  const huellas = {};
  let copiados = 0;
  for (const ruta of expandir(origen.ficheros, ORIGEN)) {
    const desde = join(ORIGEN, ruta);
    const hasta = join(DESTINO, ruta);
    huellas[ruta] = huella(desde);
    if (!existsSync(hasta)) {
      mkdirSync(dirname(hasta), { recursive: true });
      copyFileSync(desde, hasta);
      chmodSync(hasta, statSync(desde).mode);
      copiados++;
    } else if (huella(hasta) !== huellas[ruta]) {
      pendientes.push(
        `${ruta} ya existía y es distinto del kit: no se ha tocado. Compáralos:\n     git diff --no-index ${ruta} ${desde}`,
      );
    }
  }
  if (copiados > 0) hechos.push(`${copiados} fichero(s) del kit copiados`);

  const previo = leerManifiesto(DESTINO);
  if (previo?.instalado) {
    yaEstaban.push(`${MANIFIESTO} ya registraba la v${previo.instalado.version} — para cambiar de versión: npm run cms:actualizar`);
  } else {
    escribirManifiesto(DESTINO, { ...origen, instalado: { version: origen.version, huellas } });
    hechos.push(`registrada la v${origen.version} del kit en ${MANIFIESTO}`);
  }
}
const manifiesto = leerManifiesto(DESTINO) ?? origen;

// ── 4. Scripts de npm ───────────────────────────────────────────────────────
pkg.scripts ??= {};
let nuevos = 0;
for (const [nombre, orden] of Object.entries(SCRIPTS)) {
  if (pkg.scripts[nombre] === undefined) {
    pkg.scripts[nombre] = orden;
    nuevos++;
  } else if (pkg.scripts[nombre] !== orden) {
    yaEstaban.push(`script \`${nombre}\` — el tuyo se respeta (\`${pkg.scripts[nombre]}\`)`);
  }
}
if (nuevos > 0) {
  writeFileSync(PKG, JSON.stringify(pkg, null, 2) + "\n");
  hechos.push(`${nuevos} script(s) cms:* añadidos a package.json`);
}

// ── 5. Lo que falte del proyecto ────────────────────────────────────────────
const leer = (f) => (existsSync(f) ? readFileSync(f, "utf8") : null);

// .npmrc — solo dice de dónde sale el SDK. El token NUNCA va aquí.
{
  const f = join(DESTINO, ".npmrc");
  const linea = lineaDeRegistro(manifiesto);
  const texto = leer(f);
  if (texto === null) {
    writeFileSync(f, `# De dónde sale el SDK de Raizell. Este fichero se versiona: NO pongas aquí el token.\n${linea}\n`);
    hechos.push("creado .npmrc con el registro del SDK");
  } else if (!texto.includes(linea)) {
    pendientes.push(`tu .npmrc no dice de dónde sale el SDK. Añádele esta línea:\n     ${linea}`);
  }
}

// .env.local.example (se versiona, solo nombres) y .env.local (nunca se toca si existe)
{
  // Las direcciones salen del manifiesto: un solo sitio donde cambiarlas.
  let plantilla = leer(join(PLANTILLAS, "env.local.example")) ?? "";
  for (const [cual, nombre] of [["api", VARIABLES.api], ["medios", VARIABLES.medios]]) {
    plantilla = plantilla.replace(new RegExp(`^${nombre}=$`, "m"), `${nombre}=${habitual(manifiesto, cual) ?? ""}`);
  }
  const ejemplo = join(DESTINO, ".env.local.example");
  const texto = leer(ejemplo);
  if (texto === null) {
    writeFileSync(ejemplo, plantilla);
    hechos.push("creado .env.local.example");
  } else {
    const nombres = [...plantilla.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]);
    const faltan = nombres.filter((n) => !new RegExp(`^#?\\s*${n}=`, "m").test(texto));
    if (faltan.length > 0) pendientes.push(`a tu .env.local.example le faltan: ${faltan.join(", ")}`);
  }
  const local = join(DESTINO, ".env.local");
  if (existsSync(local)) yaEstaban.push(".env.local — no se toca");
  else {
    // Los frameworks leen .env.local por encima de .env, y una variable vacía
    // gana: la que el proyecto ya tiene con valor se deja comentada para no taparla.
    const previas = entornoDe(DESTINO, {});
    const comentadas = [];
    for (const nombre of Object.values(VARIABLES)) {
      if (!rellena(previas, nombre)) continue;
      const linea = new RegExp(`^(${nombre}=.*)$`, "m");
      if (linea.test(plantilla)) {
        plantilla = plantilla.replace(linea, "# $1");
        comentadas.push(nombre);
      }
    }
    writeFileSync(local, plantilla);
    hechos.push("creado .env.local con las direcciones puestas — las claves las rellenas tú, a mano");
    if (comentadas.length > 0) {
      hechos.push(`${comentadas.join(", ")} ya tenían valor en .env: quedan comentadas en .env.local para que no lo tapen`);
    }
  }
}

// AGENTS.md y CLAUDE.md — la entrada para los agentes
{
  const agents = join(DESTINO, "AGENTS.md");
  const textoAgents = leer(agents);
  if (textoAgents === null) {
    copyFileSync(join(PLANTILLAS, "AGENTS.md"), agents);
    hechos.push("creado AGENTS.md");
  } else if (!textoAgents.includes(REFERENCIA)) {
    pendientes.push(`tu AGENTS.md no remite al kit. Añádele una línea que mande leer ${REFERENCIA}`);
  }
  const claude = join(DESTINO, "CLAUDE.md");
  const textoClaude = leer(claude);
  if (textoClaude === null) {
    copyFileSync(join(PLANTILLAS, "CLAUDE.md"), claude);
    hechos.push("creado CLAUDE.md");
  } else if (!textoClaude.includes(REFERENCIA)) {
    pendientes.push(`tu CLAUDE.md no importa el kit. Añádele esta línea:\n     @${REFERENCIA}`);
  }
}

// ── 6. .gitignore ───────────────────────────────────────────────────────────
{
  const f = join(DESTINO, ".gitignore");
  const lineas = (leer(f) ?? "").split(/\r?\n/).map((l) => l.trim());
  const cubre = (patron) =>
    lineas.includes(patron) ||
    lineas.includes(patron.replace(/\/$/, "")) ||
    (patron === ".env.local" && lineas.some((l) => [".env*", ".env*.local", ".env.*"].includes(l)));
  const faltan = IGNORAR.filter(([patron]) => !cubre(patron));
  if (faltan.length > 0) {
    const bloque = faltan.map(([patron, por]) => `# CMS Front Kit: ${por}\n${patron}`).join("\n");
    appendFileSync(f, `${existsSync(f) && !(leer(f) ?? "").endsWith("\n") ? "\n" : ""}\n${bloque}\n`);
    hechos.push(`.gitignore: añadido ${faltan.map(([p]) => p).join(" y ")}`);
  }
}

// ── Informe ─────────────────────────────────────────────────────────────────
const linea = (s) => console.log(s);
linea("");
linea("──────────────────────────────────────────");
linea(` CMS Front Kit v${manifiesto.instalado?.version ?? manifiesto.version} — instalación`);
linea("──────────────────────────────────────────");

if (hechos.length === 0) linea("\nNada que hacer: ya estaba todo puesto.");
else {
  linea("\nHecho:");
  for (const h of hechos) linea(`  ✓ ${h}`);
}
if (yaEstaban.length > 0) {
  linea("\nYa existía (no se ha tocado nada):");
  for (const y of yaEstaban) linea(`  · ${y}`);
}
if (pendientes.length > 0) {
  linea("\nTe falta:");
  for (const p of pendientes) linea(`  ! ${p}`);
}

linea("");
linea("Siguiente paso: lee cms-kit/CHECKLIST.md y ejecuta");
linea("    npm run cms:comprobar");
process.exit(pendientes.length > 0 ? 1 : 0);
