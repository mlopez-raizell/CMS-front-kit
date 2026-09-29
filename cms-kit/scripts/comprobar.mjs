#!/usr/bin/env node
// COMPROBAR LA CHECKLIST
//
// Recorre `cms-kit/CHECKLIST.md` punto por punto y dice qué tienes, qué te
// falta y cómo conseguirlo. Termina con una llamada real al site: es lo único
// que demuestra que todo funciona junto.
//
// 🔴 NUNCA imprime el valor de una clave ni de un token: solo si está o no.
//
// No sabe nada de la estructura del contenido ni de la versión del CMS: lo
// que comprueba es que puedes hablar con tu site. Qué hay dentro lo dice
// `npm run cms:descubrir`.
//
// Uso (desde la raíz del front):
//   npm run cms:comprobar
//   npm run cms:comprobar -- --sin-red    (no consulta el registro ni el site)
//
// Sale con 1 si falta algo imprescindible.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { leerManifiesto } from "./lib/manifiesto.mjs";
import {
  VARIABLES, cargarSdk, codigoDe, direccion, entornoDe, gestorDe, habitual, leerEnv, lineaDeRegistro,
  localizarSdk, rellena, sinSecretos,
} from "./lib/entorno.mjs";

const RAIZ = process.cwd();
const SIN_RED = process.argv.includes("--sin-red");
const NODE_MINIMO = 20;

const secciones = [];
let actual;
const seccion = (titulo) => secciones.push((actual = { titulo, lineas: [] }));
const ok = (texto) => actual.lineas.push({ estado: "ok", texto });
const aviso = (texto, como) => actual.lineas.push({ estado: "aviso", texto, como });
const falta = (texto, como) => actual.lineas.push({ estado: "falta", texto, como });
const omitido = (texto) => actual.lineas.push({ estado: "omitido", texto });

function ejecutar(orden, args, opciones = {}) {
  return spawnSync(orden, args, { cwd: RAIZ, encoding: "utf8", timeout: 30_000, ...opciones });
}

const esUrl = (v) => {
  try {
    return /^https?:$/.test(new URL(v).protocol);
  } catch {
    return false;
  }
};

// ── 1. Herramientas ─────────────────────────────────────────────────────────
function herramientas() {
  seccion("1 · Herramientas");
  const mayor = Number(process.versions.node.split(".")[0]);
  if (mayor >= NODE_MINIMO) ok(`Node.js ${process.versions.node}`);
  else {
    falta(
      `Node.js ${process.versions.node} es demasiado antiguo (mínimo ${NODE_MINIMO})`,
      "Instala la versión LTS vigente desde https://nodejs.org",
    );
  }
  const git = ejecutar("git", ["--version"]);
  if (git.status === 0) ok(git.stdout.trim());
  else falta("git no está instalado", "Instálalo desde https://git-scm.com");
}

// ── El proyecto ─────────────────────────────────────────────────────────────
function proyecto(manifiesto) {
  seccion("Proyecto");
  if (!existsSync(join(RAIZ, "package.json"))) {
    falta("aquí no hay package.json", "Ejecuta esto desde la raíz del front, con el proyecto ya creado");
    return false;
  }
  ok(`proyecto encontrado (gestor de paquetes: ${gestorDe(RAIZ).nombre})`);
  if (manifiesto?.instalado) ok(`kit instalado: v${manifiesto.instalado.version}`);
  else aviso("el kit no tiene registrada su versión", "Instálalo como dice el README del kit");
  return true;
}

// ── 2. Tu cuenta de GitHub ──────────────────────────────────────────────────
function repositorio() {
  seccion("2 · Tu repositorio");
  if (!existsSync(join(RAIZ, ".git"))) {
    return aviso("el proyecto todavía no es un repositorio git", "CHECKLIST 2 — git init, y súbelo a un repositorio de tu cuenta de GitHub");
  }
  const remotos = ejecutar("git", ["remote"]);
  if (remotos.status === 0 && remotos.stdout.trim() !== "") ok("el proyecto tiene un repositorio remoto");
  else aviso("el proyecto todavía no tiene repositorio remoto", "CHECKLIST 2 — crea el repositorio en tu cuenta de GitHub y súbelo");
}

// ── 3. Acceso al SDK ────────────────────────────────────────────────────────
function accesoAlSdk(manifiesto) {
  seccion("3 · Acceso al SDK");
  const linea = lineaDeRegistro(manifiesto);
  const scope = linea.split(":")[0];
  const npmrc = join(RAIZ, ".npmrc");
  const texto = existsSync(npmrc) ? readFileSync(npmrc, "utf8") : "";

  if (texto.split(/\r?\n/).some((l) => l.trim().startsWith(`${scope}:registry=`))) {
    ok(`.npmrc del proyecto apunta ${scope} a su registro`);
  } else {
    falta(`.npmrc del proyecto no dice de dónde sale ${scope}`, `Añade esta línea a .npmrc (no lleva secreto, se versiona):\n${linea}`);
  }

  const tokenEscrito = texto
    .split(/\r?\n/)
    .some((l) => /_authToken\s*=/.test(l) && !/_authToken\s*=\s*\$\{[A-Za-z_][A-Za-z0-9_]*\}\s*$/.test(l));
  if (tokenEscrito) {
    falta(
      "el .npmrc del proyecto lleva un token escrito",
      "Quítalo de ahí y avisa a Raizell para que lo revoque: un .npmrc versionado lo publica.\n" +
        "El token va en ~/.npmrc (fuera del repo) o como variable de entorno en el hosting.",
    );
  }

  const sdk = localizarSdk(RAIZ, manifiesto);
  if (sdk.version) {
    ok(`SDK instalado: ${sdk.nombre} ${sdk.version}`);
    return true;
  }

  const instalar = `${gestorDe(RAIZ).instalar} ${sdk.nombre}`;
  if (SIN_RED) {
    falta(`el SDK (${sdk.nombre}) no está instalado`, `Con el token puesto (CHECKLIST 3): ${instalar}`);
    return false;
  }

  const r = ejecutar("npm", ["view", sdk.nombre, "version", `--registry=${manifiesto.sdk.registro}`]);
  const salida = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  if (r.status === 0 && r.stdout.trim() !== "") {
    falta(`tienes acceso al SDK, pero no está instalado`, instalar);
  } else if (/E401|401 Unauthorized|authentication/i.test(salida)) {
    falta(
      "el registro no te reconoce: falta el token o ha caducado",
      "CHECKLIST 3 — el token te lo da Raizell. Va en ~/.npmrc, fuera del proyecto.",
    );
  } else if (/E403|E404|403 Forbidden|404 Not Found|permission/i.test(salida)) {
    falta(
      "el token que tienes no puede leer el SDK",
      "CHECKLIST 3 — pide a Raizell un token vigente: el tuyo está revocado o no tiene ese permiso.",
    );
  } else {
    falta(
      "no se pudo consultar el registro del SDK",
      `¿Hay red? Prueba a mano: npm view ${sdk.nombre} version --registry=${manifiesto.sdk.registro}`,
    );
  }
  return false;
}

// ── 4 y 5. Claves ───────────────────────────────────────────────────────────
function claves(entorno) {
  seccion("4 y 5 · Claves del site");

  if (!existsSync(join(RAIZ, ".env.local"))) {
    aviso("no hay .env.local", "Créalo copiando .env.local.example y rellena las claves a mano");
  } else if (existsSync(join(RAIZ, ".git"))) {
    const ignorado = ejecutar("git", ["check-ignore", "-q", ".env.local"]);
    if (ignorado.status === 0) ok(".env.local está fuera de git");
    else falta(".env.local NO está ignorado por git", "Añade `.env.local` a .gitignore antes de hacer ningún commit");
  }

  if (rellena(entorno, VARIABLES.clave)) ok(`${VARIABLES.clave} tiene valor`);
  else falta(`falta ${VARIABLES.clave}`, "CHECKLIST 4 — la clave pública del site la emite Raizell. Se enseña una sola vez.");

  if (rellena(entorno, VARIABLES.clavePrevia)) ok(`${VARIABLES.clavePrevia} tiene valor`);
  else {
    aviso(
      `falta ${VARIABLES.clavePrevia}`,
      "CHECKLIST 5 — sin ella no hay previsualización de borradores ni se puede trabajar con un site en construcción.",
    );
  }

  // Una clave en una variable NEXT_PUBLIC_ viaja al navegador de cada visitante.
  const ficheros = [".env", ".env.local"].filter((f) => existsSync(join(RAIZ, f)));
  const enFicheros = Object.assign({}, ...ficheros.map((f) => leerEnv(readFileSync(join(RAIZ, f), "utf8"))));
  const claves = [VARIABLES.clave, VARIABLES.clavePrevia].filter((n) => rellena(entorno, n)).map((n) => entorno[n]);
  const expuestas = Object.entries(enFicheros)
    .filter(([n, v]) => n.startsWith("NEXT_PUBLIC_") && claves.includes(v))
    .map(([n]) => n);
  for (const n of expuestas) {
    falta(`${n} contiene una clave de API`, "Todo lo que empieza por NEXT_PUBLIC_ llega al navegador. Quítala de ahí y pide a Raizell que la revoque.");
  }
}

// ── 6. Direcciones ──────────────────────────────────────────────────────────
// Las trae puestas el kit, así que aquí no se pide nada: se comprueba que
// siguen respondiendo. Cualquier respuesta HTTP vale —también un 404—: lo que
// se mira es que al otro lado hay alguien.
async function responde(url) {
  try {
    await fetch(url, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(8_000) });
    return true;
  } catch {
    return false;
  }
}

async function direcciones(entorno, manifiesto) {
  seccion("6 · Direcciones");
  // Las dos tienen que estar en el entorno del front, aunque el kit las
  // conozca: el front las lee de ahí, y la que el SDK trae por defecto no
  // tiene por qué ser la vigente.
  const CUALES = [
    ["api", VARIABLES.api, "la API"],
    ["medios", VARIABLES.medios, "los medios"],
  ];
  for (const [cual, nombre, etiqueta] of CUALES) {
    const delKit = habitual(manifiesto, cual);
    const enUso = direccion(entorno, manifiesto, cual);
    const puesta = rellena(entorno, nombre);

    if (!puesta) {
      falta(
        `falta ${nombre}`,
        delKit
          ? `Ponla en .env.local con la dirección habitual:\n${nombre}=${delKit}`
          : "CHECKLIST 6 — esta versión del kit todavía no trae esa dirección: pídela a Raizell.",
      );
      continue;
    }
    if (!esUrl(enUso)) {
      falta(`${nombre} no es una dirección http(s) válida`, delKit ? `La habitual es: ${delKit}` : "CHECKLIST 6");
      continue;
    }
    if (delKit && enUso !== delKit) {
      aviso(`${nombre} no es la dirección habitual (${delKit})`, "Correcto solo si Raizell te ha dado otra para este site o estás en un entorno de pruebas.");
    }
    if (SIN_RED) {
      omitido(`${nombre}: no se ha comprobado si responde (--sin-red)`);
    } else if (await responde(enUso)) {
      ok(`la dirección de ${etiqueta} responde`);
    } else {
      falta(
        `la dirección de ${etiqueta} no responde`,
        "Revisa tu conexión. Si sigue sin responder, puede haber cambiado: trae la vigente con\n" +
          "npm run cms:actualizar — y si el kit ya está al día, avisa a Raizell.",
      );
    }
  }
}

// ── 7. El site responde ─────────────────────────────────────────────────────
const CONSEJO = {
  no_autorizado: "La clave no vale: mal copiada, revocada o de otro entorno. Pide una nueva a Raizell (CHECKLIST 4 y 5).",
  red: "No se llega a la API. Mira el punto 6, justo encima.",
  limite_excedido: "Demasiadas peticiones seguidas. Espera un minuto y repite.",
  respuesta_invalida: "La respuesta no casa con lo que este SDK espera: actualiza el SDK a su última versión.",
};

async function pedirConfig(modulo, manifiesto, entorno, nombreDeClave) {
  const cliente = modulo.createClient({
    apiKey: entorno[nombreDeClave],
    baseUrl: direccion(entorno, manifiesto, "api"),
    mediaBaseUrl: direccion(entorno, manifiesto, "medios"),
    dataSource: "api",
  });
  return cliente.config();
}

function describir(config) {
  const partes = [];
  const nombre = config?.site?.name ?? config?.site?.slug;
  if (nombre) partes.push(`«${nombre}»`);
  const locales = config?.locales?.content_active;
  if (Array.isArray(locales) && locales.length) {
    partes.push(`idiomas: ${locales.map((l) => l?.code ?? l).join(", ")}`);
  }
  if (Array.isArray(config?.modules)) {
    partes.push(`módulos: ${config.modules.map((m) => m?.slug ?? m).join(", ") || "ninguno"}`);
  }
  return partes.join(" · ");
}

async function site(manifiesto, entorno, sdkInstalado) {
  seccion("7 · El site responde");
  if (SIN_RED) return omitido("no se ha consultado el site (--sin-red)");
  if (!sdkInstalado) return omitido("sin SDK instalado no se puede preguntar al site");
  if (!rellena(entorno, VARIABLES.clave) && !rellena(entorno, VARIABLES.clavePrevia)) {
    return omitido("sin ninguna clave no se puede preguntar al site");
  }

  let modulo;
  try {
    ({ modulo } = await cargarSdk(RAIZ, manifiesto));
  } catch (e) {
    return falta(`no se pudo cargar el SDK: ${e.message}`, "Reinstala las dependencias del proyecto");
  }
  if (typeof modulo.createClient !== "function") {
    return aviso(
      "este SDK no se inicia como el kit espera",
      "Mira el README del SDK instalado y actualiza el kit: npm run cms:actualizar",
    );
  }

  const intentos = [
    [VARIABLES.clave, "clave pública"],
    [VARIABLES.clavePrevia, "clave de previsualización"],
  ].filter(([n]) => rellena(entorno, n));

  const respuestas = {};
  for (const [nombre, etiqueta] of intentos) {
    try {
      const config = await pedirConfig(modulo, manifiesto, entorno, nombre);
      respuestas[nombre] = true;
      ok(`responde a la ${etiqueta}${describir(config) ? ` — ${describir(config)}` : ""}`);
    } catch (e) {
      const codigo = codigoDe(e);
      respuestas[nombre] = codigo ?? "error";
      if (codigo === "sitio_no_disponible") continue; // se explica abajo, con las dos respuestas a la vista
      falta(
        `no responde a la ${etiqueta}${codigo ? ` (${codigo})` : ""}`,
        CONSEJO[codigo] ?? sinSecretos(e?.message ?? e, entorno),
      );
    }
  }

  const publica = respuestas[VARIABLES.clave];
  const previa = respuestas[VARIABLES.clavePrevia];
  if (publica === "sitio_no_disponible" && previa === true) {
    aviso(
      "el site todavía no responde a la clave pública",
      "Es lo normal mientras está en construcción: trabaja con la de previsualización (CHECKLIST 7).",
    );
  } else if (publica === "sitio_no_disponible" || previa === "sitio_no_disponible") {
    falta(
      "el site no está disponible",
      "CHECKLIST 7 — o está en construcción y necesitas la clave de previsualización, o está suspendido. Pregunta a Raizell por su estado.",
    );
  }
}

// ── Informe ─────────────────────────────────────────────────────────────────
const MARCA = { ok: "✓", aviso: "!", falta: "✗", omitido: "·" };

function informe() {
  console.log("\n──────────────────────────────────────────────");
  console.log(" CMS Front Kit — comprobación de la checklist");
  console.log("──────────────────────────────────────────────");
  for (const s of secciones) {
    console.log(`\n${s.titulo}`);
    for (const l of s.lineas) {
      console.log(`  ${MARCA[l.estado]} ${l.texto}`);
      if (l.como) for (const c of l.como.split("\n")) console.log(`      ${c}`);
    }
  }
  const todas = secciones.flatMap((s) => s.lineas);
  const faltan = todas.filter((l) => l.estado === "falta").length;
  const avisos = todas.filter((l) => l.estado === "aviso").length;
  console.log("");
  if (faltan > 0) {
    console.log(`Te falta${faltan === 1 ? "" : "n"} ${faltan} cosa${faltan === 1 ? "" : "s"} para empezar. El detalle de cada una, en cms-kit/CHECKLIST.md.`);
    return 1;
  }
  console.log(avisos > 0 ? `Puedes empezar, con ${avisos} aviso${avisos === 1 ? "" : "s"} a la vista.` : "Todo listo.");
  console.log("Siguiente paso: npm run cms:descubrir");
  console.log("Los puntos 8 y 9 de la checklist (diseño y despliegue) no se pueden comprobar desde aquí.");
  return 0;
}

const manifiesto = leerManifiesto(RAIZ);
if (!manifiesto?.sdk?.paquete) {
  console.error("✗ Falta cms-front-kit.json en esta carpeta: ejecuta esto desde la raíz del front, con el kit instalado.");
  process.exit(1);
}

herramientas();
if (proyecto(manifiesto)) {
  const entorno = entornoDe(RAIZ);
  repositorio();
  const sdkInstalado = accesoAlSdk(manifiesto);
  claves(entorno);
  await direcciones(entorno, manifiesto);
  await site(manifiesto, entorno, sdkInstalado);
}
process.exit(informe());
