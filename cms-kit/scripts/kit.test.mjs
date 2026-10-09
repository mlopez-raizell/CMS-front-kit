// Pruebas del kit. Se quedan en el repositorio del kit: no se instalan en los fronts.
//
//   node --test cms-kit/scripts/*.test.mjs
//
// Montan un front de mentira en una carpeta temporal, con un SDK de mentira en
// node_modules, y ejecutan los scripts de verdad contra él.

import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { direccion, entornoDe, esPublica, habitual, leerEnv, lineaDeRegistro, localizarSdk, rellena, sinSecretos, variablesTapadas } from "./lib/entorno.mjs";
import { forma, formaEnLineas, superficie } from "./lib/forma.mjs";
import { expandir, leerManifiesto } from "./lib/manifiesto.mjs";
import { comparar, tramoChangelog } from "./kit.mjs";

const KIT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
const INSTALADOR = join(KIT, "cms-kit", "scripts", "instalar.mjs");
const CLAVE = "rz_pub_SECRETO_DE_PRUEBA_123456";
const PREVIA = "rz_prev_SECRETO_DE_PRUEBA_654321";
const SDK = "@mlopez-raizell/raizell-sdk";

// El entorno del proceso manda sobre .env.local: se limpia para que las pruebas
// no dependan de la máquina donde corren.
const ENTORNO_LIMPIO = Object.fromEntries(
  Object.entries(process.env).filter(([k]) => !/^(RAIZELL_|MEDIA_BASE_URL$|DATA_SOURCE$|SNAPSHOT_DIR$)/.test(k)),
);

// Un servidor local hace de API y de medios: las pruebas no salen a internet.
// Va en un proceso aparte porque los scripts se lanzan con spawnSync, que
// dejaría sin atender a un servidor que viviera en este.
const servidor = spawn(
  process.execPath,
  ["-e", 'require("node:http").createServer((q, r) => { r.statusCode = 404; r.end(); }).listen(0, "127.0.0.1", function () { console.log(this.address().port); });'],
  { stdio: ["ignore", "pipe", "inherit"] },
);
const LOCAL = `http://127.0.0.1:${await new Promise((listo) => servidor.stdout.once("data", (d) => listo(String(d).trim())))}`;
const NADIE = "http://127.0.0.1:1";
after(() => servidor.kill());

/** El contenido de un .env.local de prueba. `null` deja esa variable sin poner. */
function entorno({ clave = CLAVE, previa = PREVIA, api = LOCAL, medios = `${LOCAL}/medios`, extra = "" } = {}) {
  return [
    clave && `RAIZELL_API_KEY=${clave}`,
    previa && `RAIZELL_PREVIEW_KEY=${previa}`,
    api && `RAIZELL_API_URL=${api}`,
    medios && `MEDIA_BASE_URL=${medios}`,
    extra,
  ].filter(Boolean).join("\n") + "\n";
}

function correr(script, cwd, args = []) {
  const r = spawnSync(process.execPath, [script, ...args], { cwd, encoding: "utf8", env: ENTORNO_LIMPIO });
  return { estado: r.status, salida: `${r.stdout}${r.stderr}` };
}

function frontVacio(t, pkg = { name: "front-de-prueba", private: true }) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "rfk-test-")));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, "package.json"), JSON.stringify(pkg, null, 2));
  return dir;
}

const SDK_DE_MENTIRA = `
class ErrorSdk extends Error {
  constructor(codigo, mensaje) { super(mensaje); this.codigo = codigo; }
}
const CONFIG = {
  site: { slug: "demo", name: "Site de prueba", default_locale: "es" },
  locales: { content_active: [{ code: "es", is_default: true }, { code: "en", is_default: false }] },
  modules: [{ slug: "cms", version: "1" }],
};
export function createClient(o = {}) {
  const exigir = () => {
    if (o.apiKey === "${CLAVE}" && process.env.SITE_EN_CONSTRUCCION === "1") {
      throw new ErrorSdk("sitio_no_disponible", "site en construcción");
    }
    if (o.apiKey !== "${CLAVE}" && o.apiKey !== "${PREVIA}") {
      throw new ErrorSdk("no_autorizado", "clave rechazada: " + o.apiKey);
    }
  };
  return {
    defaultLocale: o.defaultLocale ?? null,
    async config() { exigir(); return CONFIG; },
    cms: {
      async estaActivo() { return true; },
      async rutas(l = {}) {
        exigir();
        const locale = l.locale ?? "es";
        return [
          { tipo: "pagina", id: "1", ruta: "/", locale, hreflang: [] },
          { tipo: "pagina", id: "2", ruta: "/equipo/direccion", locale, hreflang: [] },
        ];
      },
      async contenido(ruta, l = {}) {
        exigir();
        return { tipo: "pagina", ruta, borradores: l.borradores === true, bloques: [{ clase: "portada", datos: { titular: "Hola" } }, { clase: "galeria", datos: { fotos: [] } }] };
      },
    },
    medios: { async listar() { exigir(); return [{ clave: "a/b.jpg", alt: "Una foto" }]; }, url: (c) => o.mediaBaseUrl + "/" + c },
  };
}
`;

/** Front con el kit instalado, el SDK de mentira y las variables rellenas. */
function frontListo(t, { env } = {}) {
  const dir = frontVacio(t, { name: "front-de-prueba", private: true, dependencies: { [SDK]: "^9.9.9" } });
  execFileSync("git", ["init", "-q"], { cwd: dir });
  assert.equal(correr(INSTALADOR, dir).estado, 0);
  const sdk = join(dir, "node_modules", ...SDK.split("/"));
  mkdirSync(sdk, { recursive: true });
  writeFileSync(
    join(sdk, "package.json"),
    JSON.stringify({ name: SDK, version: "9.9.9", type: "module", exports: { ".": { types: "./index.d.ts", import: "./index.js" } } }),
  );
  writeFileSync(join(sdk, "index.js"), SDK_DE_MENTIRA);
  writeFileSync(
    join(dir, ".env.local"),
    env ?? entorno(),
  );
  return dir;
}

// ── Librerías ───────────────────────────────────────────────────────────────

test("leerEnv: comentarios, comillas, export y marcadores", () => {
  const e = leerEnv(`# nota\nA=1\nexport B="dos palabras"\nC='x' \nD=valor # comentario\nE=\nF=<pon-aqui-la-clave>\nno es una línea\n`);
  assert.deepEqual(e, { A: "1", B: "dos palabras", C: "x", D: "valor", E: "", F: "<pon-aqui-la-clave>" });
  assert.equal(rellena(e, "A"), true);
  assert.equal(rellena(e, "E"), false, "vacía no cuenta");
  assert.equal(rellena(e, "F"), false, "el marcador de la plantilla no cuenta");
  assert.equal(rellena(e, "NO_EXISTE"), false);
});

test("sinSecretos quita las claves de un mensaje", () => {
  const entorno = { RAIZELL_API_KEY: CLAVE, RAIZELL_PREVIEW_KEY: PREVIA };
  assert.equal(sinSecretos(`falló con ${CLAVE} y ${PREVIA}`, entorno), "falló con *** y ***");
});

test("forma: recorre sin conocer la estructura", () => {
  const lineas = formaEnLineas(forma({ a: [{ b: "x", c: null }, { b: "y", c: 3 }], vacia: [], d: { e: true } }));
  assert.deepEqual(lineas, [
    "- `a[].b` · string · ×2 — p. ej. «x», «y»",
    "- `a[].c` · null | number · ×2 — p. ej. «3»",
    "- `d.e` · boolean · ×1 — p. ej. «true»",
    "- `vacia` · lista · ×1",
  ]);
});

test("superficie: espacios y métodos de un cliente cualquiera", () => {
  const s = superficie({ config() {}, cms: { rutas() {}, contenido() {}, dato: 1 }, defaultLocale: null });
  assert.deepEqual(s, { metodos: ["config"], espacios: { cms: ["contenido", "rutas"] }, valores: ["defaultLocale"] });
});

test("localizarSdk: manda lo que declara el proyecto, aunque el paquete haya cambiado de nombre", (t) => {
  const manifiesto = leerManifiesto(KIT);
  const sinDeclarar = frontVacio(t);
  assert.deepEqual(
    (({ nombre, declarado, version }) => ({ nombre, declarado, version }))(localizarSdk(sinDeclarar, manifiesto)),
    { nombre: manifiesto.sdk.paquete, declarado: false, version: null },
  );
  const otroNombre = frontVacio(t, { dependencies: { "@raizell/sdk": "1.0.0", next: "1" } });
  assert.equal(localizarSdk(otroNombre, manifiesto).nombre, "@raizell/sdk");
});

test("el manifiesto enumera ficheros que existen, y no se lleva las pruebas", () => {
  const manifiesto = leerManifiesto(KIT);
  const rutas = expandir(manifiesto.ficheros, KIT);
  for (const esperado of [
    "AGENTS.cms.md",
    "cms-kit/CHECKLIST.md",
    "cms-kit/scripts/comprobar.mjs",
    "cms-kit/scripts/lib/entorno.mjs",
    "cms-kit/plantillas/env.local.example",
    ".claude/skills/cms-front-empezar/SKILL.md",
  ]) assert.ok(rutas.includes(esperado), `falta ${esperado}`);
  assert.equal(rutas.filter((r) => /\.test\.mjs$/.test(r)).length, 0);
  assert.equal(rutas.filter((r) => /^(README|CHANGELOG|CLAUDE)\.md$/.test(r)).length, 0);
  assert.equal(lineaDeRegistro(manifiesto), "@mlopez-raizell:registry=https://npm.pkg.github.com");
});

test("versiones y tramo del changelog", () => {
  assert.ok(comparar("v0.10.0", "v0.9.9") > 0);
  const texto = "# x\n\n## v0.3.0 — hoy\n\ntres\n\n## v0.2.0 — ayer\n\ndos\n\n## v0.1.0\n\nuno\n";
  assert.equal(tramoChangelog(texto, "v0.1.0", "v0.3.0"), "## v0.3.0 — hoy\n\ntres\n\n## v0.2.0 — ayer\n\ndos");
});

// ── Instalador ──────────────────────────────────────────────────────────────

test("instalar: sin package.json, para y dice qué hacer", (t) => {
  const dir = frontVacio(t);
  rmSync(join(dir, "package.json"));
  const r = correr(INSTALADOR, dir);
  assert.equal(r.estado, 1);
  assert.match(r.salida, /falta package\.json/);
});

test("instalar: deja el proyecto listo y es idempotente", (t) => {
  const dir = frontVacio(t, { name: "x", scripts: { dev: "next dev", "cms:estado": "echo mio" } });
  const r = correr(INSTALADOR, dir);
  assert.equal(r.estado, 0, r.salida);

  for (const f of [
    "AGENTS.cms.md", "AGENTS.md", "CLAUDE.md", ".npmrc", ".env.local", ".env.local.example",
    "cms-kit/CHECKLIST.md", "cms-kit/scripts/comprobar.mjs", ".claude/skills/cms-front-nextjs/SKILL.md",
  ]) assert.ok(existsSync(join(dir, f)), `falta ${f}`);
  assert.ok(!existsSync(join(dir, "README.md")), "el README del kit no se instala");

  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  assert.equal(pkg.scripts.dev, "next dev");
  assert.equal(pkg.scripts["cms:estado"], "echo mio", "un script que ya existía se respeta");
  assert.equal(pkg.scripts["cms:comprobar"], "node cms-kit/scripts/comprobar.mjs");

  // Las direcciones llegan puestas; las claves, vacías.
  const delKit = leerManifiesto(KIT).direcciones;
  for (const f of [".env.local", ".env.local.example"]) {
    const e = leerEnv(readFileSync(join(dir, f), "utf8"));
    assert.deepEqual(e, { RAIZELL_API_KEY: "", RAIZELL_PREVIEW_KEY: "", RAIZELL_API_URL: delKit.api, MEDIA_BASE_URL: delKit.medios }, f);
  }

  const m = leerManifiesto(dir);
  assert.equal(m.instalado.version, leerManifiesto(KIT).version);
  assert.ok(m.instalado.huellas["cms-kit/CHECKLIST.md"]);

  const ignore = readFileSync(join(dir, ".gitignore"), "utf8");
  assert.match(ignore, /^\.env\.local$/m);
  assert.match(ignore, /^\.cms-kit\/$/m);
  assert.doesNotMatch(readFileSync(join(dir, ".npmrc"), "utf8"), /_authToken/);

  const antes = readFileSync(join(dir, ".gitignore"), "utf8") + readFileSync(join(dir, "package.json"), "utf8");
  const segunda = correr(INSTALADOR, dir);
  assert.equal(segunda.estado, 0, segunda.salida);
  assert.match(segunda.salida, /Nada que hacer/);
  assert.equal(readFileSync(join(dir, ".gitignore"), "utf8") + readFileSync(join(dir, "package.json"), "utf8"), antes);
});

test("instalar: no pisa nada que ya existiera", (t) => {
  const dir = frontVacio(t);
  writeFileSync(join(dir, "AGENTS.md"), "# Mis reglas\n");
  writeFileSync(join(dir, ".npmrc"), "save-exact=true\n");
  writeFileSync(join(dir, ".env.local"), "RAIZELL_API_KEY=la-mia\n");
  writeFileSync(join(dir, ".gitignore"), ".env*\nnode_modules");
  mkdirSync(join(dir, "cms-kit"));
  writeFileSync(join(dir, "cms-kit", "CHECKLIST.md"), "tocado\n");

  const r = correr(INSTALADOR, dir);
  assert.equal(r.estado, 1, "con pendientes sale en rojo");
  assert.equal(readFileSync(join(dir, "AGENTS.md"), "utf8"), "# Mis reglas\n");
  assert.equal(readFileSync(join(dir, ".npmrc"), "utf8"), "save-exact=true\n");
  assert.equal(readFileSync(join(dir, ".env.local"), "utf8"), "RAIZELL_API_KEY=la-mia\n");
  assert.equal(readFileSync(join(dir, "cms-kit", "CHECKLIST.md"), "utf8"), "tocado\n");
  assert.match(r.salida, /tu AGENTS\.md no remite al kit/);
  assert.match(r.salida, /@mlopez-raizell:registry=/);
  assert.match(r.salida, /CHECKLIST\.md ya existía y es distinto/);
  const ignore = readFileSync(join(dir, ".gitignore"), "utf8");
  assert.doesNotMatch(ignore, /^\.env\.local$/m, "`.env*` ya lo cubría");
  assert.match(ignore, /node_modules\n\n# CMS Front Kit: .*\n\.cms-kit\/\n$/);
});

// ── comprobar ───────────────────────────────────────────────────────────────

const comprobar = (dir, args = []) => correr(join(dir, "cms-kit", "scripts", "comprobar.mjs"), dir, args);

test("comprobar: con todo puesto sale en verde y no enseña ninguna clave", (t) => {
  const dir = frontListo(t);
  const r = comprobar(dir);
  assert.equal(r.estado, 0, r.salida);
  assert.match(r.salida, /SDK instalado: @mlopez-raizell\/raizell-sdk 9\.9\.9/);
  assert.match(r.salida, /responde a la clave pública — «Site de prueba» · idiomas: es, en · módulos: cms/);
  assert.match(r.salida, /responde a la clave de previsualización/);
  assert.match(r.salida, /\.env\.local está fuera de git/);
  assert.match(r.salida, /✓ la dirección de la API responde/);
  assert.match(r.salida, /✓ la dirección de los medios responde/);
  assert.match(r.salida, /! el proyecto todavía no tiene repositorio remoto/);
  assert.ok(r.salida.includes(`! RAIZELL_API_URL no es la dirección habitual (${habitual(leerManifiesto(KIT), "api")})`));
  assert.match(r.salida, /Puedes empezar, con \d avisos? a la vista/);
  assert.doesNotMatch(r.salida, /✗/);
  assert.ok(!r.salida.includes(CLAVE) && !r.salida.includes(PREVIA), "una clave ha salido por pantalla");
});

test("comprobar: recién instalado, dice qué falta y a qué punto ir", (t) => {
  const dir = frontVacio(t);
  assert.equal(correr(INSTALADOR, dir).estado, 0);
  const r = comprobar(dir, ["--sin-red"]);
  assert.equal(r.estado, 1);
  assert.match(r.salida, /el SDK \(@mlopez-raizell\/raizell-sdk\) no está instalado/);
  assert.match(r.salida, /falta RAIZELL_API_KEY/);
  // Las direcciones las trae el kit. Mientras no traiga la de medios, se pide.
  assert.doesNotMatch(r.salida, /falta MEDIA_BASE_URL/, "el instalador ya la dejó puesta");
  assert.doesNotMatch(r.salida, /falta RAIZELL_API_URL/, "el instalador ya la dejó puesta");
  assert.match(r.salida, /el token te lo da Raizell|Con el token puesto/);
  assert.match(r.salida, /! falta RAIZELL_PREVIEW_KEY/, "la de previsualización es aviso, no bloqueo");
  assert.match(r.salida, /CHECKLIST 4/);
});

test("comprobar: clave rechazada — lo dice sin repetirla", (t) => {
  const mala = "rz_pub_CLAVE_MAL_COPIADA_999";
  const dir = frontListo(t, { env: entorno({ clave: mala, previa: null }) });
  const r = comprobar(dir);
  assert.equal(r.estado, 1);
  assert.match(r.salida, /no responde a la clave pública \(no_autorizado\)/);
  assert.ok(!r.salida.includes(mala));
});

test("comprobar: site en construcción — avisa y deja trabajar con la de previsualización", (t) => {
  const dir = frontListo(t);
  const r = spawnSync(process.execPath, ["cms-kit/scripts/comprobar.mjs"], {
    cwd: dir, encoding: "utf8", env: { ...ENTORNO_LIMPIO, SITE_EN_CONSTRUCCION: "1" },
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /! el site todavía no responde a la clave pública/);
  assert.doesNotMatch(r.stdout, /✗/);
  assert.match(r.stdout, /Puedes empezar, con \d avisos a la vista/);
});

test("comprobar: detecta credenciales mal colocadas", (t) => {
  const dir = frontListo(t, {
    env: entorno({ previa: null, extra: `NEXT_PUBLIC_API_KEY=${CLAVE}` }),
  });
  writeFileSync(join(dir, ".npmrc"), "@mlopez-raizell:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=ghp_tokenescrito\n");
  writeFileSync(join(dir, ".gitignore"), "node_modules\n");
  const r = comprobar(dir);
  assert.equal(r.estado, 1);
  assert.match(r.salida, /NEXT_PUBLIC_API_KEY contiene una clave de API/);
  assert.match(r.salida, /el \.npmrc del proyecto lleva un token escrito/);
  assert.match(r.salida, /\.env\.local NO está ignorado por git/);
  assert.ok(!r.salida.includes("ghp_tokenescrito") && !r.salida.includes(CLAVE));

  // La forma correcta en un .npmrc versionado: una variable, no el valor.
  writeFileSync(join(dir, ".npmrc"), "@mlopez-raizell:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}\n");
  assert.doesNotMatch(comprobar(dir).salida, /lleva un token escrito/);
});

test("comprobar: una dirección que no responde manda a actualizar el kit", (t) => {
  const dir = frontListo(t, { env: entorno({ medios: NADIE }) });
  const r = comprobar(dir);
  assert.equal(r.estado, 1);
  assert.match(r.salida, /✓ la dirección de la API responde/);
  assert.match(r.salida, /✗ la dirección de los medios no responde[^]*npm run cms:actualizar/);
});

test("comprobar: una dirección que falta en el entorno se pide con su valor, no a Raizell", (t) => {
  const dir = frontListo(t, { env: entorno({ api: null }) });
  const f = join(dir, "cms-front-kit.json");
  const m = JSON.parse(readFileSync(f, "utf8"));
  writeFileSync(f, JSON.stringify({ ...m, direcciones: { api: `${LOCAL}/`, medios: `${LOCAL}/medios` } }));
  const r = comprobar(dir);
  assert.equal(r.estado, 1);
  assert.ok(r.salida.includes(`✗ falta RAIZELL_API_URL\n      Ponla en .env.local con la dirección habitual:\n      RAIZELL_API_URL=${LOCAL}\n`), r.salida);
  assert.doesNotMatch(r.salida, /no es la dirección habitual/, "la de medios coincide con la del kit");
  assert.match(r.salida, /✓ la dirección de los medios responde/);
});

test("direccion: manda el entorno; si no, la del kit", () => {
  const m = { direcciones: { api: "https://api.ejemplo.test/", medios: "" } };
  assert.equal(habitual(m, "api"), "https://api.ejemplo.test");
  assert.equal(habitual(m, "medios"), null);
  assert.equal(direccion({}, m, "api"), "https://api.ejemplo.test");
  assert.equal(direccion({ RAIZELL_API_URL: "http://localhost:4000/" }, m, "api"), "http://localhost:4000");
  assert.equal(direccion({}, m, "medios"), undefined);
  assert.equal(direccion({}, {}, "api"), undefined, "un manifiesto antiguo, sin direcciones, no rompe nada");
});

// ── descubrir ───────────────────────────────────────────────────────────────

const descubrir = (dir, args = []) => correr(join(dir, "cms-kit", "scripts", "descubrir.mjs"), dir, args);

test("descubrir: vuelca lo que el site tiene, sin conocer su estructura", (t) => {
  const dir = frontListo(t);
  const r = descubrir(dir);
  assert.equal(r.estado, 0, r.salida);
  const base = join(dir, ".cms-kit", "descubierto");
  assert.equal(JSON.parse(readFileSync(join(base, "rutas.json"), "utf8")).length, 4, "2 rutas × 2 idiomas");
  assert.ok(existsSync(join(base, "contenido", "es__raiz.json")));
  assert.ok(existsSync(join(base, "contenido", "en__equipo_direccion.json")));
  assert.deepEqual(JSON.parse(readFileSync(join(base, "superficie.json"), "utf8")).espacios.cms, ["contenido", "estaActivo", "rutas"]);

  const resumen = readFileSync(join(base, "RESUMEN.md"), "utf8");
  assert.match(resumen, /clave pública \(solo publicado\)/);
  assert.match(resumen, /\| `\/equipo\/direccion` \| en \| pagina \|/);
  assert.match(resumen, /- `bloques\[\]\.clase` · string · ×2 — p\. ej\. «portada», «galeria»/);
  assert.match(resumen, /- `bloques\[\]\.datos\.fotos` · lista · ×1/);
  assert.match(resumen, /- `borradores` · boolean · ×1 — p\. ej\. «false»/);
  assert.ok(!resumen.includes(CLAVE) && !r.salida.includes(CLAVE));

  const ignorado = spawnSync("git", ["check-ignore", "-q", ".cms-kit/descubierto/RESUMEN.md"], { cwd: dir });
  assert.equal(ignorado.status, 0, "lo descubierto tiene que quedar fuera de git");
});

test("descubrir --previa: pide borradores con la otra clave", (t) => {
  const dir = frontListo(t);
  const r = descubrir(dir, ["--previa", "--max", "1"]);
  assert.equal(r.estado, 0, r.salida);
  const resumen = readFileSync(join(dir, ".cms-kit", "descubierto", "RESUMEN.md"), "utf8");
  assert.match(resumen, /clave de previsualización \(incluye borradores\)/);
  assert.match(resumen, /- `borradores` · boolean · ×1 — p\. ej\. «true»/);
  assert.match(resumen, /solo se ha pedido el contenido de las 1 primeras/);
});

test("descubrir: un SDK al que le falta un espacio no lo rompe", (t) => {
  const dir = frontListo(t);
  const f = join(dir, "node_modules", ...SDK.split("/"), "index.js");
  writeFileSync(f, readFileSync(f, "utf8").replace("medios: {", "almacen: {"));
  const r = descubrir(dir);
  assert.equal(r.estado, 0, r.salida);
  assert.match(readFileSync(join(dir, ".cms-kit", "descubierto", "RESUMEN.md"), "utf8"), /`medios\.listar\(\)` no existe en esta versión del SDK/);
});

test("descubrir: sin clave, manda a la checklist", (t) => {
  const dir = frontListo(t, { env: entorno({ clave: null, previa: null }) });
  const r = descubrir(dir);
  assert.equal(r.estado, 1);
  assert.match(r.salida, /Falta RAIZELL_API_KEY.*cms:comprobar/);
});

// ── estado y actualizar ─────────────────────────────────────────────────────

function git(cwd, ...args) {
  return execFileSync("git", ["-c", "user.name=prueba", "-c", "user.email=prueba@ejemplo.test", "-c", "commit.gpgsign=false", "-c", "tag.gpgsign=false", ...args], {
    cwd, encoding: "utf8", stdio: "pipe",
  });
}

/** Una copia del kit como repositorio git local, con v0.1.0 y v0.2.0 publicadas. */
function kitPublicado(t) {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), "rfk-repo-")));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const manifiesto = leerManifiesto(KIT);
  for (const ruta of [...expandir(manifiesto.ficheros, KIT), "cms-front-kit.json", "CHANGELOG.md"]) {
    mkdirSync(dirname(join(repo, ruta)), { recursive: true });
    cpSync(join(KIT, ruta), join(repo, ruta));
  }
  const escribir = (version) =>
    writeFileSync(join(repo, "cms-front-kit.json"), JSON.stringify({ ...manifiesto, version, repositorio: repo }, null, 2) + "\n");

  git(repo, "init", "-q", "-b", "main");
  escribir("0.1.0");
  git(repo, "add", "-A");
  git(repo, "commit", "-q", "-m", "v0.1.0");
  git(repo, "tag", "v0.1.0");

  escribir("0.2.0");
  writeFileSync(join(repo, "cms-kit", "CHECKLIST.md"), "# CHECKLIST nueva\n");
  writeFileSync(join(repo, "AGENTS.cms.md"), "# Reglas nuevas\n");
  mkdirSync(join(repo, ".claude", "skills", "cms-front-nueva"), { recursive: true });
  writeFileSync(join(repo, ".claude", "skills", "cms-front-nueva", "SKILL.md"), "nueva\n");
  rmSync(join(repo, ".claude", "skills", "cms-front-nextjs"), { recursive: true });
  writeFileSync(join(repo, "CHANGELOG.md"), "# CHANGELOG\n\n## v0.2.0 — mañana\n\n- Una skill nueva.\n\n## v0.1.0\n\n- La primera.\n");
  git(repo, "add", "-A");
  git(repo, "commit", "-q", "-m", "v0.2.0");
  git(repo, "tag", "v0.2.0");
  return repo;
}

test("actualizar: trae lo nuevo, borra lo retirado y no pisa lo tocado", (t) => {
  const repo = kitPublicado(t);
  const origen = realpathSync(mkdtempSync(join(tmpdir(), "rfk-clon-")));
  t.after(() => rmSync(origen, { recursive: true, force: true }));
  execFileSync("git", ["-c", "advice.detachedHead=false", "clone", "-q", "--branch", "v0.1.0", repo, origen], { stdio: "pipe" });

  const dir = frontVacio(t);
  git(dir, "init", "-q", "-b", "main");
  assert.equal(correr(join(origen, "cms-kit", "scripts", "instalar.mjs"), dir).estado, 0);
  const kit = (...args) => correr(join(dir, "cms-kit", "scripts", "kit.mjs"), dir, args);

  const estado = kit("estado");
  assert.match(estado.salida, /Versión instalada: v0\.1\.0/);
  assert.match(estado.salida, /Última publicada:  v0\.2\.0 — actualiza con/);
  assert.match(estado.salida, /Ningún fichero del kit tocado/);

  // El proyecto toca un fichero del kit que la versión nueva también cambia.
  writeFileSync(join(dir, "AGENTS.cms.md"), "# Tocado en el proyecto\n");
  assert.match(kit("estado").salida, /modificado {2}AGENTS\.cms\.md/);

  const sucio = kit("actualizar");
  assert.equal(sucio.estado, 1);
  assert.match(sucio.salida, /El árbol git no está limpio/);

  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "instalado");
  const r = kit("actualizar");
  assert.equal(r.estado, 0, r.salida);
  assert.match(r.salida, /CMS Front Kit v0\.1\.0 → v0\.2\.0/);
  assert.match(r.salida, /CONFLICTOS[^]*AGENTS\.cms\.md/);
  assert.match(r.salida, /## v0\.2\.0 — mañana/);
  assert.doesNotMatch(r.salida, /La primera/);

  assert.equal(readFileSync(join(dir, "AGENTS.cms.md"), "utf8"), "# Tocado en el proyecto\n", "lo tocado no se pisa");
  assert.equal(readFileSync(join(dir, "cms-kit", "CHECKLIST.md"), "utf8"), "# CHECKLIST nueva\n");
  assert.ok(existsSync(join(dir, ".claude", "skills", "cms-front-nueva", "SKILL.md")));
  assert.ok(!existsSync(join(dir, ".claude", "skills", "cms-front-nextjs")), "lo retirado se borra");
  assert.equal(leerManifiesto(dir).instalado.version, "0.2.0");

  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "kit 0.2.0");
  assert.match(kit("estado").salida, /v0\.2\.0 — estás al día[^]*modificado {2}AGENTS\.cms\.md/);
  assert.match(kit("actualizar").salida, /Ya tienes v0\.2\.0/);
});

// ── Lo aprendido al poner un front en producción ────────────────────────────

test("esPublica: reconoce los prefijos con los que los frameworks publican una variable", () => {
  for (const n of ["NEXT_PUBLIC_X", "PUBLIC_X", "VITE_X", "NUXT_PUBLIC_X", "REACT_APP_X", "GATSBY_X", "EXPO_PUBLIC_X"]) {
    assert.ok(esPublica(n), n);
  }
  for (const n of ["RAIZELL_API_KEY", "PUBLICIDAD", "MI_PUBLIC_X", "VITEX"]) assert.ok(!esPublica(n), n);
});

test("variablesTapadas: una vacía en el fichero que manda tapa la del que manda menos", (t) => {
  const dir = frontVacio(t);
  writeFileSync(join(dir, ".env"), "RAIZELL_API_KEY=abc\nRAIZELL_API_URL=http://x\nRAIZELL_PREVIEW_KEY=\n");
  writeFileSync(join(dir, ".env.local"), "RAIZELL_API_KEY=\nRAIZELL_PREVIEW_KEY=\nRAIZELL_API_URL=http://y\n");
  assert.deepEqual(variablesTapadas(dir), [{ nombre: "RAIZELL_API_KEY", vacioEn: ".env.local", conValorEn: ".env" }]);
  assert.equal(entornoDe(dir, {}).RAIZELL_API_KEY, "", "así lo lee el framework: gana la vacía");
  assert.deepEqual(variablesTapadas(frontVacio(t)), [], "sin ficheros no hay nada tapado");
});

test("comprobar: una clave vacía en .env.local que tapa la de .env se explica, no se confunde con que falte", (t) => {
  const dir = frontListo(t, { env: "RAIZELL_API_KEY=\n" + entorno({ clave: null }) });
  writeFileSync(join(dir, ".env"), `RAIZELL_API_KEY=${CLAVE}\n`);
  const r = comprobar(dir);
  assert.equal(r.estado, 1);
  assert.match(r.salida, /✗ RAIZELL_API_KEY está vacía en \.env\.local y tapa la de \.env/);
  assert.doesNotMatch(r.salida, /falta RAIZELL_API_KEY/);
  assert.ok(!r.salida.includes(CLAVE));
});

test("comprobar: una clave en una variable de las que el framework publica es un fallo, sea cual sea el framework", (t) => {
  const dir = frontListo(t, {
    env: entorno({ previa: null, extra: `PUBLIC_KEY=${CLAVE}\nVITE_KEY=${CLAVE}\nNEXT_PUBLIC_KEY=${CLAVE}` }),
  });
  const r = comprobar(dir);
  assert.equal(r.estado, 1);
  for (const n of ["PUBLIC_KEY", "VITE_KEY", "NEXT_PUBLIC_KEY"]) assert.match(r.salida, new RegExp(`${n} contiene una clave de API`));
  assert.ok(!r.salida.includes(CLAVE));
});

test("comprobar: con la clave de previsualización se puede empezar; la pública es un aviso", (t) => {
  const dir = frontListo(t, { env: entorno({ clave: null }) });
  const r = comprobar(dir);
  assert.equal(r.estado, 0, r.salida);
  assert.match(r.salida, /! falta RAIZELL_API_KEY/);
  assert.match(r.salida, /--produccion/);
  assert.doesNotMatch(r.salida, /✗/);
  assert.match(r.salida, /responde a la clave de previsualización/);
});

test("comprobar --produccion: exige la clave pública y que el site responda a ella", (t) => {
  const sinPublica = frontListo(t, { env: entorno({ clave: null }) });
  const r1 = comprobar(sinPublica, ["--produccion"]);
  assert.equal(r1.estado, 1);
  assert.match(r1.salida, /✗ falta RAIZELL_API_KEY/);

  const dir = frontListo(t);
  const r2 = spawnSync(process.execPath, ["cms-kit/scripts/comprobar.mjs", "--produccion"], {
    cwd: dir, encoding: "utf8", env: { ...ENTORNO_LIMPIO, SITE_EN_CONSTRUCCION: "1" },
  });
  assert.equal(r2.status, 1, r2.stdout);
  assert.match(r2.stdout, /✗ el site no responde a la clave pública \(sitio_no_disponible\)/);
  assert.match(r2.stdout, /activ/);

  const r3 = comprobar(dir, ["--produccion"]);
  assert.equal(r3.estado, 0, r3.salida);
  assert.match(r3.salida, /responde a la clave pública/);
  assert.match(r3.salida, /cms-front-produccion/);
  assert.ok(!r3.salida.includes(CLAVE));
});

test("instalar: no deja en .env.local una variable vacía que tape la que el proyecto ya tiene en .env", (t) => {
  const dir = frontVacio(t);
  writeFileSync(join(dir, ".env"), `RAIZELL_API_KEY=${CLAVE}\nRAIZELL_API_URL=http://propia.test\n`);
  const r = correr(INSTALADOR, dir);
  assert.equal(r.estado, 0, r.salida);
  const local = readFileSync(join(dir, ".env.local"), "utf8");
  assert.match(local, /^# RAIZELL_API_KEY=$/m);
  assert.match(local, /^# RAIZELL_API_URL=/m);
  assert.deepEqual(leerEnv(local), { RAIZELL_PREVIEW_KEY: "", MEDIA_BASE_URL: leerManifiesto(KIT).direcciones.medios });
  assert.match(r.salida, /ya tenían valor en \.env/);
  assert.equal(entornoDe(dir, {}).RAIZELL_API_KEY, CLAVE, "la del .env sigue mandando");
  assert.equal(entornoDe(dir, {}).RAIZELL_API_URL, "http://propia.test");
  assert.deepEqual(variablesTapadas(dir), []);
  assert.match(readFileSync(join(dir, ".env.local.example"), "utf8"), /^RAIZELL_API_KEY=$/m, "el ejemplo no se toca");
});

test("descubrir: sin clave pública pero con la de previsualización, usa esa y lo dice", (t) => {
  const dir = frontListo(t, { env: entorno({ clave: null }) });
  const r = descubrir(dir, ["--max", "1"]);
  assert.equal(r.estado, 0, r.salida);
  assert.match(r.salida, /Falta RAIZELL_API_KEY: se usa la de previsualización/);
  const resumen = readFileSync(join(dir, ".cms-kit", "descubierto", "RESUMEN.md"), "utf8");
  assert.match(resumen, /clave de previsualización \(incluye borradores\)/);
});

test("descubrir --menu: consulta los menús por su identificador, existan o no", (t) => {
  const dir = frontListo(t);
  const f = join(dir, "node_modules", ...SDK.split("/"), "index.js");
  writeFileSync(
    f,
    readFileSync(f, "utf8").replace(
      "async estaActivo() { return true; },",
      'async estaActivo() { return true; }, async menu(slug) { return slug === "principal" ? { slug, nombre: "Principal", entradas: [{ tipo: "pagina", etiqueta: "Inicio", url: "/" }] } : null; },',
    ),
  );
  const sin = descubrir(dir, ["--max", "1"]);
  assert.equal(sin.estado, 0, sin.salida);
  assert.match(readFileSync(join(dir, ".cms-kit", "descubierto", "RESUMEN.md"), "utf8"), /Los menús no se pueden listar[^]*--menu/);

  const r = descubrir(dir, ["--max", "1", "--menu", "principal,pie"]);
  assert.equal(r.estado, 0, r.salida);
  const base = join(dir, ".cms-kit", "descubierto");
  assert.equal(JSON.parse(readFileSync(join(base, "menus", "principal.json"), "utf8")).nombre, "Principal");
  const resumen = readFileSync(join(base, "RESUMEN.md"), "utf8");
  assert.match(resumen, /## Menús/);
  assert.match(resumen, /### `principal`/);
  assert.match(resumen, /- `entradas\[\]\.etiqueta` · string · ×1 — p\. ej\. «Inicio»/);
  assert.match(resumen, /`pie`: no existe o no está publicado/);
});

test("descubrir --menu: un SDK sin ese método lo anota y sigue", (t) => {
  const dir = frontListo(t);
  const r = descubrir(dir, ["--max", "1", "--menu", "principal"]);
  assert.equal(r.estado, 0, r.salida);
  assert.match(readFileSync(join(dir, ".cms-kit", "descubierto", "RESUMEN.md"), "utf8"), /`cms\.menu\(principal\)` no existe en esta versión del SDK/);
});
