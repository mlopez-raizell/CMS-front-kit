#!/usr/bin/env node
// VERSIÓN DEL KIT EN ESTE PROYECTO
//
// `cms-front-kit.json` registra qué versión del kit tiene el proyecto y la
// huella de cada fichero tal y como llegó. Comparando huellas se sabe qué ha
// tocado el proyecto — y eso NUNCA se pisa.
//
// Uso (desde la raíz del front):
//   npm run cms:estado
//   npm run cms:actualizar              (la última publicada)
//   npm run cms:actualizar -- v0.2.0    (una concreta)
//
// Solo módulos nativos de Node; git por execFileSync.

import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync,
  rmdirSync, statSync, unlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MANIFIESTO, escribirManifiesto, expandir, huella, leerManifiesto } from "./lib/manifiesto.mjs";

const INSTALADOR = "cms-kit/scripts/instalar.mjs";

class Parada extends Error {}

// ── Versiones ───────────────────────────────────────────────────────────────

const esVersion = (v) => /^v\d+\.\d+\.\d+$/.test(v);
const numeros = (v) => v.replace(/^v/, "").split(".").map(Number);
export function comparar(a, b) {
  const [x, y] = [numeros(a), numeros(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

function ultimaVersion(repositorio) {
  const salida = execFileSync("git", ["ls-remote", "--tags", repositorio], {
    encoding: "utf8", stdio: "pipe", timeout: 30_000,
  });
  const tags = salida
    .split("\n")
    .map((l) => l.split("\t")[1]?.replace("refs/tags/", ""))
    .filter((t) => t && esVersion(t))
    .sort(comparar);
  return tags.at(-1) ?? null;
}

function clonar(repositorio, tag) {
  const dir = mkdtempSync(join(tmpdir(), "cms-front-kit-"));
  try {
    execFileSync(
      "git",
      ["-c", "advice.detachedHead=false", "clone", "-q", "--depth", "1", "--branch", tag, repositorio, dir],
      { stdio: "pipe" },
    );
  } catch {
    rmSync(dir, { recursive: true, force: true });
    throw new Parada(`no se pudo clonar ${tag} de ${repositorio} (¿existe ese tag? ¿hay red?)`);
  }
  return dir;
}

export function tramoChangelog(texto, desde, hasta) {
  const lineas = [];
  let dentro = false;
  for (const l of texto.split("\n")) {
    const m = l.match(/^## (v\d+\.\d+\.\d+)/);
    if (m) dentro = comparar(m[1], desde) > 0 && comparar(m[1], hasta) <= 0;
    else if (/^## /.test(l)) dentro = false;
    if (dentro) lineas.push(l);
  }
  return lineas.join("\n").trim();
}

// ── Operaciones de ficheros ─────────────────────────────────────────────────

function copiar(origen, destino) {
  mkdirSync(dirname(destino), { recursive: true });
  copyFileSync(origen, destino);
  chmodSync(destino, statSync(origen).mode);
}

function borrar(raiz, ruta) {
  unlinkSync(join(raiz, ruta));
  // quita las carpetas que se queden vacías, sin salir del proyecto
  for (let d = dirname(join(raiz, ruta)); d !== raiz && readdirSync(d).length === 0; d = dirname(d)) {
    rmdirSync(d);
  }
}

// ── Subcomandos ─────────────────────────────────────────────────────────────

function manifiestoInstalado(raiz) {
  const m = leerManifiesto(raiz);
  if (!m?.instalado) {
    throw new Parada(
      `Este proyecto no tiene registrada una versión del kit (falta \`instalado\` en ${MANIFIESTO}).\n` +
        "  Instálalo como dice el README del kit.",
    );
  }
  return m;
}

function estado(raiz) {
  const m = manifiestoInstalado(raiz);
  console.log(`Versión instalada: v${m.instalado.version}`);
  try {
    const ultima = ultimaVersion(m.repositorio);
    if (!ultima) console.log(`Última publicada:  (ningún tag vX.Y.Z en ${m.repositorio})`);
    else {
      const aviso = comparar(ultima, `v${m.instalado.version}`) > 0 ? " — actualiza con: npm run cms:actualizar" : " — estás al día";
      console.log(`Última publicada:  ${ultima}${aviso}`);
    }
  } catch {
    console.log(`Última publicada:  no se pudo consultar ${m.repositorio} (¿sin red?). Sigo con lo local.`);
  }

  const modificados = [];
  const faltan = [];
  for (const [ruta, h] of Object.entries(m.instalado.huellas).sort()) {
    const f = join(raiz, ruta);
    if (!existsSync(f)) faltan.push(ruta);
    else if (huella(f) !== h) modificados.push(ruta);
  }
  if (modificados.length === 0 && faltan.length === 0) {
    console.log("\nNingún fichero del kit tocado en este proyecto.");
    return;
  }
  console.log("\nFicheros del kit que difieren de la versión instalada:");
  for (const r of modificados) console.log(`  modificado  ${r}`);
  for (const r of faltan) console.log(`  falta       ${r}`);
  console.log("\nLos modificados no se pisarán al actualizar. Lo propio del proyecto va en AGENTS.md y en skills propias.");
}

function actualizar(raiz, pedida) {
  const m = manifiestoInstalado(raiz);

  let sucio;
  try {
    sucio = execFileSync("git", ["status", "--porcelain"], { cwd: raiz, encoding: "utf8", stdio: "pipe" });
  } catch {
    throw new Parada("Esto no es un repositorio git: actualizar necesita git para poder deshacerse.");
  }
  if (sucio.trim() !== "") {
    throw new Parada(
      "El árbol git no está limpio. Haz commit (o descarta) tus cambios antes de actualizar,\n" +
        "  para que la actualización quede sola en su propio commit y se pueda revertir:\n" +
        sucio.trimEnd().split("\n").map((l) => `      ${l}`).join("\n"),
    );
  }

  let tag = pedida;
  if (!tag) {
    try {
      tag = ultimaVersion(m.repositorio);
    } catch {
      throw new Parada(`No se pudo consultar ${m.repositorio} para saber la última versión (¿sin red?).`);
    }
    if (!tag) throw new Parada(`No hay ningún tag vX.Y.Z publicado en ${m.repositorio}.`);
  }
  if (!tag.startsWith("v")) tag = `v${tag}`;
  if (!esVersion(tag)) throw new Parada(`«${pedida}» no es una versión vX.Y.Z.`);

  const desde = `v${m.instalado.version}`;
  if (comparar(tag, desde) === 0) {
    console.log(`Ya tienes ${tag}. Nada que actualizar.`);
    return;
  }

  const tmp = clonar(m.repositorio, tag);
  try {
    const nuevo = leerManifiesto(tmp);
    if (!nuevo) throw new Parada(`${tag} no trae ${MANIFIESTO}: no es una versión del kit.`);
    const viejas = m.instalado.huellas;
    const huellas = {};
    const r = { actualizados: [], anadidos: [], conflictos: [], tocados: [], borrados: [], retiradosTocados: [] };
    let copiaConflictos = null;

    // Si algo falla a partir de aquí, el árbol queda a medias. El manifiesto se
    // escribe al final, así que sigue con la versión antigua; y como el árbol
    // estaba limpio, git lo deja como estaba.
    try {
      for (const ruta of expandir(nuevo.ficheros, tmp)) {
        const origen = join(tmp, ruta);
        const destino = join(raiz, ruta);
        const hNueva = huella(origen);
        if (!existsSync(destino)) {
          copiar(origen, destino);
          huellas[ruta] = hNueva;
          r.anadidos.push(ruta);
          continue;
        }
        const hLocal = huella(destino);
        if (hLocal === hNueva) huellas[ruta] = hNueva;
        else if (viejas[ruta] === hLocal) {
          copiar(origen, destino);
          huellas[ruta] = hNueva;
          r.actualizados.push(ruta);
        } else if (viejas[ruta] === hNueva) {
          // tocado en el proyecto, pero el kit no lo cambia en esta versión
          huellas[ruta] = viejas[ruta];
          r.tocados.push(ruta);
        } else {
          // tocado en el proyecto Y cambiado en el kit: no se pisa
          huellas[ruta] = viejas[ruta] ?? hNueva;
          r.conflictos.push(ruta);
        }
      }

      for (const ruta of Object.keys(viejas)) {
        if (ruta in huellas) continue;
        const f = join(raiz, ruta);
        if (!existsSync(f)) continue;
        if (huella(f) === viejas[ruta]) {
          borrar(raiz, ruta);
          r.borrados.push(ruta);
        } else r.retiradosTocados.push(ruta);
      }

      // La versión nueva de los conflictos se guarda FUERA del proyecto para
      // poder compararla: el clon se borra siempre y el árbol no se ensucia.
      if (r.conflictos.length > 0) {
        copiaConflictos = mkdtempSync(join(tmpdir(), `cms-front-kit-${tag}-conflictos-`));
        for (const ruta of r.conflictos) copiar(join(tmp, ruta), join(copiaConflictos, ruta));
      }

      escribirManifiesto(raiz, {
        ...nuevo,
        repositorio: m.repositorio,
        instalado: { version: tag.slice(1), huellas },
      });
    } catch (e) {
      throw new Parada(
        `${e.message}\n  La actualización ha quedado a medias. Deshazla con: git checkout -- . && git clean -fd`,
      );
    }

    informe(r, { desde, tag, copiaConflictos });
    ejecutarInstalador(raiz, r);
    const cambios = existsSync(join(tmp, "CHANGELOG.md"))
      ? tramoChangelog(readFileSync(join(tmp, "CHANGELOG.md"), "utf8"), desde, tag)
      : "";
    if (cambios) console.log(`\nQué cambia (CHANGELOG ${desde} → ${tag}):\n\n${cambios}`);
    console.log(`\nRevisa el diff y haz tú el commit:\n    git add -A && git commit -m "chore(cms-front-kit): ${desde} → ${tag}"`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function informe(r, { desde, tag, copiaConflictos }) {
  const lista = (titulo, rutas, fmt = (x) => x) => {
    if (rutas.length === 0) return;
    console.log(`\n${titulo} (${rutas.length}):`);
    for (const x of rutas) console.log(`  ${fmt(x)}`);
  };
  console.log(`CMS Front Kit ${desde} → ${tag}`);
  lista("Actualizados", r.actualizados);
  lista("Añadidos", r.anadidos);
  lista("Retirados del kit y borrados", r.borrados);
  lista("Tocados en el proyecto; el kit no los cambia (se dejan)", r.tocados);
  lista("Retirados del kit pero tocados en el proyecto (se dejan; ya no son del kit)", r.retiradosTocados);
  lista(
    "CONFLICTOS — tocados en el proyecto y cambiados en el kit: NO se han pisado",
    r.conflictos,
    (x) => `${x}\n      git diff --no-index ${x} ${join(copiaConflictos, x)}`,
  );
  if (r.conflictos.length > 0) {
    console.log("\n  Integra a mano lo que quieras de la versión nueva; siguen marcados como tocados.");
  }
}

// Los scripts de npm y las plantillas de una versión viven dentro de su
// instalador: copiarlo sin ejecutarlo deja la versión a medias. Se ejecuta el
// YA COPIADO (el de la versión nueva). Si el proyecto lo ha tocado, no se
// ejecuta: no se sabe qué hace.
function ejecutarInstalador(raiz, r) {
  if (r.conflictos.includes(INSTALADOR) || r.tocados.includes(INSTALADOR)) {
    console.log(`\n${INSTALADOR} está tocado en el proyecto: no se ha ejecutado. Intégralo y ejecuta: npm run cms:instalar`);
    return;
  }
  if (!existsSync(join(raiz, INSTALADOR))) return;
  const e = spawnSync(process.execPath, [INSTALADOR], { cwd: raiz, encoding: "utf8" });
  console.log(`${e.stdout ?? ""}${e.stderr ?? ""}`.trimEnd());
}

// ── Entrada ─────────────────────────────────────────────────────────────────

function main(argv) {
  const [orden, ...resto] = argv;
  const raiz = process.cwd();
  if (orden === "estado") return estado(raiz);
  if (orden === "actualizar") return actualizar(raiz, resto.find((x) => !x.startsWith("--")));
  throw new Parada("Uso: node cms-kit/scripts/kit.mjs estado | actualizar [vX.Y.Z]");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (e) {
    if (!(e instanceof Parada)) throw e;
    console.error(`✗ ${e.message}`);
    process.exit(1);
  }
}
