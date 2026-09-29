// LA FORMA DE UNOS DATOS, SIN SABER DE ANTEMANO CUÁL ES
//
// `descubrir` no conoce la estructura del contenido: la recorre. De cualquier
// valor saca, por cada ruta de propiedades, qué tipos aparecen, cuántas veces y
// un par de ejemplos. Por eso sirve igual con cualquier versión del CMS.

const MAX_EJEMPLOS = 3;
const MAX_LARGO = 48;

function tipoDe(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "lista";
  return typeof v === "object" ? "objeto" : typeof v;
}

function ejemplo(v) {
  const texto = typeof v === "string" ? v : String(v);
  const limpio = texto.replace(/\s+/g, " ").trim();
  return limpio.length > MAX_LARGO ? `${limpio.slice(0, MAX_LARGO - 1)}…` : limpio;
}

function anotar(mapa, ruta, valor) {
  const tipo = tipoDe(valor);
  let e = mapa.get(ruta);
  if (!e) mapa.set(ruta, (e = { tipos: new Set(), veces: 0, ejemplos: [] }));
  e.tipos.add(tipo);
  e.veces++;
  if (tipo !== "null" && tipo !== "lista" && tipo !== "objeto") {
    const ej = ejemplo(valor);
    if (ej !== "" && e.ejemplos.length < MAX_EJEMPLOS && !e.ejemplos.includes(ej)) e.ejemplos.push(ej);
  }
}

/** Mapa `ruta → { tipos, veces, ejemplos }` de un valor cualquiera. */
export function forma(valor, base = "", mapa = new Map()) {
  const tipo = tipoDe(valor);
  if (tipo === "lista") {
    if (valor.length === 0) anotar(mapa, base || "(raíz)", valor);
    for (const v of valor) forma(v, `${base}[]`, mapa);
  } else if (tipo === "objeto") {
    const claves = Object.keys(valor);
    if (claves.length === 0) anotar(mapa, base || "(raíz)", valor);
    for (const k of claves) forma(valor[k], base ? `${base}.${k}` : k, mapa);
  } else {
    anotar(mapa, base || "(raíz)", valor);
  }
  return mapa;
}

/** La forma, en líneas de Markdown listas para un informe. */
export function formaEnLineas(mapa) {
  return [...mapa.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ruta, e]) => {
      const tipos = [...e.tipos].sort().join(" | ");
      const ej = e.ejemplos.length ? ` — p. ej. ${e.ejemplos.map((x) => `«${x}»`).join(", ")}` : "";
      return `- \`${ruta}\` · ${tipos} · ×${e.veces}${ej}`;
    });
}

/** Espacios y métodos que expone un cliente del SDK, mirándolo. */
export function superficie(cliente) {
  const salida = { metodos: [], espacios: {}, valores: [] };
  for (const [k, v] of Object.entries(cliente ?? {})) {
    if (typeof v === "function") salida.metodos.push(k);
    else if (v && typeof v === "object") {
      salida.espacios[k] = Object.entries(v)
        .filter(([, f]) => typeof f === "function")
        .map(([n]) => n)
        .sort();
    } else salida.valores.push(k);
  }
  salida.metodos.sort();
  return salida;
}
