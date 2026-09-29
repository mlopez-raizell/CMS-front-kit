#!/usr/bin/env node
// Publica la versión del kit como tag de git, desde `main`.
//
//   node scripts/publicar-version.mjs            # decide e imprime
//   node scripts/publicar-version.mjs --ejecutar # además crea y sube el tag
//
// Lo llama la acción `.github/workflows/publicar-version.yml` en cada push a
// `main`. `cms:actualizar` trae el kit clonando el tag `v<version>`: sin
// tag, la versión no existe para ningún proyecto. Por eso el tag sale solo de
// `version` en cms-front-kit.json, y solo si CHANGELOG.md tiene la sección
// `## v<version>`: publicar sin decir qué trae no vale.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** Tramo de CHANGELOG.md de una versión: desde su `## vX.Y.Z` hasta el siguiente `## `. */
export function seccionChangelog(texto, version) {
  const lineas = [];
  let dentro = false;
  for (const l of texto.split("\n")) {
    if (/^## /.test(l)) dentro = new RegExp(`^## v${version.replace(/\./g, "\\.")}(\\s|$)`).test(l);
    if (dentro) lineas.push(l);
  }
  return lineas.length ? lineas.join("\n").trim() : null;
}

/** Qué hacer con esta versión: crear el tag, no hacer nada, o parar con error. */
export function decidir({ version, seccion, tagSha, headSha }) {
  const tag = `v${version}`;
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    return { accion: "error", tag, motivo: `«${version}» no es una versión X.Y.Z (cms-front-kit.json)` };
  }
  if (tagSha && tagSha === headSha) return { accion: "nada", tag, motivo: `${tag} ya apunta a este commit` };
  if (tagSha) {
    return {
      accion: "nada",
      tag,
      motivo: `${tag} ya existe sobre otro commit (${tagSha.slice(0, 7)}): sube la versión si esto es una versión nueva`,
    };
  }
  if (!seccion) return { accion: "error", tag, motivo: `CHANGELOG.md no tiene la sección «## ${tag}»: escríbela antes de publicar` };
  return { accion: "crear", tag, motivo: `versión ${version} sin tag y con su sección en el CHANGELOG` };
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function main() {
  const args = process.argv.slice(2);
  const ejecutar = args.includes("--ejecutar");
  const iNotas = args.indexOf("--notas");
  const notas = iNotas >= 0 ? args[iNotas + 1] : join(tmpdir(), "publicar-notas.md");

  const { version } = JSON.parse(readFileSync("cms-front-kit.json", "utf8"));
  const seccion = seccionChangelog(readFileSync("CHANGELOG.md", "utf8"), version);
  const headSha = git("rev-parse", "HEAD");
  const remoto = git("ls-remote", "--tags", "origin", `refs/tags/v${version}`);
  const tagSha = remoto ? remoto.split("\t")[0] : null;

  const d = decidir({ version, seccion, tagSha, headSha });
  console.log(`${d.tag}: ${d.accion} — ${d.motivo}`);
  if (d.accion === "error") process.exit(1);

  if (process.env.GITHUB_OUTPUT) {
    writeFileSync(process.env.GITHUB_OUTPUT, `accion=${d.accion}\ntag=${d.tag}\nnotas=${notas}\n`, { flag: "a" });
  }
  if (d.accion !== "crear" || !ejecutar) return;

  writeFileSync(notas, seccion + "\n");
  git("tag", "-a", d.tag, "-m", `CMS Front Kit ${d.tag}`);
  git("push", "origin", `refs/tags/${d.tag}`);
  console.log(`${d.tag} creado y subido; notas en ${notas}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
