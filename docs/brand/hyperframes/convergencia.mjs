// Generates the three SENTINEL "Convergência" compositions from one template.
// Direction: docs/brand/visual-storytelling.md. Usage: docs/brand/hyperframes/README.md.
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";

const VARIANTS = {
  // 16:9 brand film — planes 1..7
  "film-16x9": {
    w: 1920, h: 1080, duration: 20,
    grid: { cols: 3, rows: 3, gx: 210, gy: 160 }, center: [960, 540], ring: 230,
    t: { glow: 0.4, horizon: 0.8, frag: 2.5, align: 5.0, lines: 8.5, labels: 11.5, converge: 13.0, rings: 15.0, sweep: 16.1, cut: 17.5, end: 20 },
    labels: true, brand: true, loop: false,
  },
  // 9:16 social cut — planes 1, 2, 3, 4, 6, 7 (no labels / converge)
  "film-9x16": {
    w: 1080, h: 1920, duration: 15,
    grid: { cols: 3, rows: 3, gx: 190, gy: 170 }, center: [540, 760], ring: 210,
    t: { glow: 0.3, horizon: 0.6, frag: 1.8, align: 3.8, lines: 6.0, labels: null, converge: 8.2, rings: 8.4, sweep: 9.6, cut: 11.6, end: 15 },
    labels: false, brand: true, loop: false,
  },
  // 8 s seamless loop — planes 4 → 6, dark first and last frame, no brand
  "loop-16x9": {
    w: 1920, h: 1080, duration: 8,
    grid: { cols: 3, rows: 3, gx: 210, gy: 160 }, center: [960, 540], ring: 230,
    t: { glow: 0, horizon: null, frag: 0.2, align: null, lines: 1.2, labels: null, converge: 3.0, rings: 4.5, sweep: 5.5, cut: null, fadeAll: 6.6, end: 8 },
    labels: false, brand: false, loop: true,
  },
};

// Scattered starting positions (fractions of the frame) — fixed, deterministic.
const SCATTER = [
  [0.18, 0.26], [0.47, 0.17], [0.79, 0.3], [0.31, 0.55], [0.58, 0.44],
  [0.86, 0.62], [0.13, 0.78], [0.52, 0.81], [0.72, 0.86],
];
// Order in which fragments light up (information arrives unevenly).
const LIGHT_ORDER = [4, 1, 7, 2, 6, 0, 8, 3, 5];
const LIGHT_AT = [0, 0.35, 0.55, 0.95, 1.2, 1.45, 1.75, 1.9, 2.15];
// Few, architectural connections between grid cells (row-major indices).
const EDGES = [[3, 4], [1, 4], [4, 7], [4, 5], [0, 1]];
const LABELS = { 0: "PROJETOS", 2: "GITHUB", 4: "RUBRICA", 6: "DECISÕES", 8: "FERRAMENTAS" };

function page(name, v) {
  const [cx, cy] = v.center;
  const { cols, rows, gx, gy } = v.grid;
  const cells = Array.from({ length: cols * rows }, (_, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    return [cx + (c - (cols - 1) / 2) * gx, cy + (r - (rows - 1) / 2) * gy];
  });
  const start = v.t.align === null ? cells : SCATTER.map(([x, y]) => [x * v.w, y * v.h]);
  const R = v.ring, r = +(R * (5.25 / 10.25)).toFixed(1);
  const arcLen = +((Math.PI / 2) * R).toFixed(1);
  const lines = EDGES.map(([a, b], i) => {
    const [x1, y1] = cells[a], [x2, y2] = cells[b];
    const len = Math.hypot(x2 - x1, y2 - y1);
    return `<line id="ln${i}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${i === 2 ? "#D4CFD6" : "#424769"}" stroke-opacity="${i === 2 ? 0.7 : 1}" stroke-width="1.5" stroke-dasharray="${len.toFixed(1)}" stroke-dashoffset="${len.toFixed(1)}" />`;
  }).join("\n        ");
  const frags = start.map(([x, y], i) => `<div class="frag" id="f${i}" style="left:${x - 30}px;top:${y - 38}px"><i></i><i></i><i class="s"></i></div>`).join("\n      ");
  const labels = v.labels
    ? Object.entries(LABELS).map(([i, text]) => `<div class="label" id="lb${i}" style="left:${cells[i][0] - 120}px;top:${cells[i][1] + 52}px">${text}</div>`).join("\n      ")
    : "";
  const brandSize = v.w > v.h ? 104 : 124;
  const T = JSON.stringify(v.t);

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${v.w}, height=${v.h}" />
    <script src="gsap.min.js"></script>
    <style>
      @font-face { font-family: "DM Sans"; font-weight: 400; font-display: block; src: url(fonts/dm-sans-400.woff2) format("woff2"); }
      @font-face { font-family: "DM Sans"; font-weight: 600; font-display: block; src: url(fonts/dm-sans-600.woff2) format("woff2"); }
      :root { --bg: #15161a; --rurikon: #1b294b; --cobalt: #424769; --jam: #d4cfd6; --ink: #ece8ee; --gold: #b59e5f; --wine: #d7c485; --muted: #8b8792; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${v.w}px; height: ${v.h}px; overflow: hidden; background: var(--bg); }
      #main { position: relative; width: ${v.w}px; height: ${v.h}px; overflow: hidden; background: var(--bg); font-family: "DM Sans", sans-serif; }
      .layer { position: absolute; inset: 0; }
      #glow { background: radial-gradient(ellipse 70% 80% at 0% 0%, rgba(27, 41, 75, 0.62), transparent 62%); opacity: 0; }
      #horizon { position: absolute; left: ${v.w * 0.2}px; width: ${v.w * 0.6}px; top: ${cy}px; height: 1px; background: linear-gradient(90deg, transparent, rgba(212, 207, 214, 0.5), transparent); opacity: 0; }
      .frag { position: absolute; width: 60px; height: 76px; border-radius: 3px; background: #1c1d23; box-shadow: inset 0 0 0 1px rgba(212, 207, 214, 0.3), 0 18px 40px rgba(0, 0, 0, 0.35); opacity: 0; padding: 14px 11px; display: flex; flex-direction: column; gap: 7px; }
      .frag i { display: block; height: 1.5px; background: rgba(212, 207, 214, 0.34); }
      .frag i.s { width: 55%; }
      .label { position: absolute; width: 240px; text-align: center; font-size: 16px; font-weight: 400; letter-spacing: 0.18em; color: var(--muted); opacity: 0; }
      #net, #rings { position: absolute; inset: 0; }
      #brand { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: ${v.w > v.h ? 30 : 36}px; opacity: 0; ${v.w > v.h ? "" : "padding-bottom: 120px;"} }
      #brand .word { font-size: ${v.w > v.h ? 44 : 52}px; font-weight: 600; letter-spacing: 0.32em; margin-right: -0.32em; color: var(--ink); }
      #brand .line { font-size: ${v.w > v.h ? 22 : 26}px; font-weight: 400; color: var(--muted); letter-spacing: 0.01em; }
      .grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.16; mix-blend-mode: overlay;
        background-image: radial-gradient(rgba(255,255,255,.07) 1px, transparent 1.2px), radial-gradient(rgba(0,0,0,.2) 1px, transparent 1.2px);
        background-size: 3px 3px, 5px 5px; background-position: 0 0, 1px 2px; }
    </style>
  </head>
  <body>
    <div id="main" data-composition-id="main" data-start="0" data-duration="${v.duration}" data-width="${v.w}" data-height="${v.h}">
      <div id="stage" class="layer clip" data-start="0" data-duration="${v.duration}" data-track-index="0">
      <div id="glow" class="layer"></div>
      <div id="horizon"></div>
      <svg id="net" width="${v.w}" height="${v.h}" viewBox="0 0 ${v.w} ${v.h}" fill="none">
        ${lines}
      </svg>
      <div id="frags" class="layer">
      ${frags}
      </div>
      <div id="labels" class="layer">
      ${labels}
      </div>
      <svg id="rings" width="${v.w}" height="${v.h}" viewBox="0 0 ${v.w} ${v.h}" fill="none">
        <circle id="ringO" cx="${cx}" cy="${cy}" r="${R}" stroke="#D4CFD6" stroke-opacity="0.28" stroke-width="3" stroke-dasharray="${(2 * Math.PI * R).toFixed(1)}" stroke-dashoffset="${(2 * Math.PI * R).toFixed(1)}" transform="rotate(-90 ${cx} ${cy})" />
        <circle id="ringI" cx="${cx}" cy="${cy}" r="${r}" stroke="#D4CFD6" stroke-opacity="0.9" stroke-width="3" stroke-dasharray="${(2 * Math.PI * r).toFixed(1)}" stroke-dashoffset="${(2 * Math.PI * r).toFixed(1)}" transform="rotate(-90 ${cx} ${cy})" />
        <path id="arc" d="M ${cx} ${cy - R} A ${R} ${R} 0 0 1 ${cx + R} ${cy}" stroke="#B59E5F" stroke-width="3" stroke-linecap="round" stroke-dasharray="${arcLen}" stroke-dashoffset="${arcLen}" />
      </svg>
      ${v.brand ? `<div id="brand">
        <svg width="${brandSize}" height="${brandSize}" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10.25" stroke="#ECE8EE" stroke-opacity="0.28" stroke-width="1.5" />
          <path d="M12 1.75A10.25 10.25 0 0 1 22.25 12" stroke="#B59E5F" stroke-width="1.5" stroke-linecap="round" />
          <circle cx="12" cy="12" r="5.25" stroke="#ECE8EE" stroke-width="1.5" />
          <circle cx="12" cy="12" r="1.75" fill="#D7C485" />
        </svg>
        <div class="word">SENTINEL</div>
        <div class="line">A memória operacional dos seus projetos.</div>
      </div>` : ""}
      <div class="grain"></div>
      </div>
    </div>
    <script>
      // Deterministic: fixed positions, fixed times, no random, no clocks.
      window.__timelines = window.__timelines || {};
      var T = ${T};
      var CELLS = ${JSON.stringify(cells)};
      var START = ${JSON.stringify(start)};
      var LIGHT_ORDER = ${JSON.stringify(LIGHT_ORDER)}, LIGHT_AT = ${JSON.stringify(LIGHT_AT)};
      var ARRIVE = "expo.out", SETTLE = "power2.inOut";
      var tl = gsap.timeline({ paused: true });

      // 1 — Silence: light arrives before anything else.
      tl.to("#glow", { opacity: 1, duration: 2.6, ease: "sine.inOut" }, T.glow);
      if (T.horizon !== null) {
        tl.to("#horizon", { opacity: 0.9, duration: 1.4, ease: SETTLE }, T.horizon);
        tl.to("#horizon", { opacity: 0, duration: 1.2, ease: SETTLE }, T.frag + 1.2);
      }

      // 2 — Information: fragments light up unevenly (light, not motion).
      LIGHT_ORDER.forEach(function (idx, k) {
        tl.to("#f" + idx, { opacity: 1, duration: 0.9, ease: "sine.out" }, T.frag + LIGHT_AT[k] * (T.align === null ? 0.3 : 1));
      });

      // 3 — Movement: slow drift onto an invisible grid.
      if (T.align !== null) {
        START.forEach(function (_, i) {
          tl.to("#f" + i, { x: CELLS[i][0] - START[i][0], y: CELLS[i][1] - START[i][1], duration: 2.6, ease: SETTLE }, T.align + (i % 3) * 0.12);
        });
      }

      // 4 — Structure: hairlines draw one at a time.
      for (var e = 0; e < ${EDGES.length}; e++) {
        tl.to("#ln" + e, { strokeDashoffset: 0, duration: 0.9, ease: ARRIVE }, T.lines + e * 0.45);
      }

      // 5 — Convergence: names appear once, then everything gathers to the center.
      if (T.labels !== null) {
        [0, 2, 4, 6, 8].forEach(function (i, k) {
          tl.to("#lb" + i, { opacity: 1, duration: 0.8, ease: "sine.out" }, T.labels + 0.2 + k * 0.22);
        });
        tl.to("#labels", { opacity: 0, duration: 0.7, ease: SETTLE }, T.converge);
      }
      var cx = ${cx}, cy = ${cy};
      START.forEach(function (_, i) {
        tl.to("#f" + i, { x: cx - START[i][0], y: cy - START[i][1], scale: 0.3, opacity: 0, duration: 1.8, ease: "power3.inOut" }, T.converge + 0.1 + (i % 3) * 0.06);
      });
      tl.to("#net", { opacity: 0, duration: 1.0, ease: SETTLE }, T.converge);

      // 6 — Intelligence: the structure resolves into rings; the gold arc sweeps once and stops.
      tl.to("#ringO", { strokeDashoffset: 0, duration: 1.3, ease: "power3.inOut" }, T.rings);
      tl.to("#ringI", { strokeDashoffset: 0, duration: 1.2, ease: "power3.inOut" }, T.rings + 0.25);
      tl.to("#arc", { strokeDashoffset: 0, duration: 1.2, ease: ARRIVE }, T.sweep);

      // 7 — Clean close: cut to dark, the real mark and wordmark.
      if (T.cut !== null) {
        tl.set(["#rings", "#glow"], { autoAlpha: 0 }, T.cut);
        tl.to("#brand", { opacity: 1, duration: 1.2, ease: ARRIVE }, T.cut + 0.35);
        tl.to("#glow", { autoAlpha: 0.55, duration: 2, ease: "sine.inOut" }, T.cut + 0.35);
      }

      // Loop: everything returns to darkness so the last frame equals the first.
      if (T.fadeAll) {
        tl.to(["#rings", "#glow"], { opacity: 0, duration: T.end - T.fadeAll - 0.1, ease: "sine.inOut" }, T.fadeAll);
      }

      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;
}

for (const [name, v] of Object.entries(VARIANTS)) {
  const dir = `projects/${name}`;
  mkdirSync(`${dir}/fonts`, { recursive: true });
  writeFileSync(`${dir}/index.html`, page(name, v));
  copyFileSync("node_modules/gsap/dist/gsap.min.js", `${dir}/gsap.min.js`);
  copyFileSync("node_modules/@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff2", `${dir}/fonts/dm-sans-400.woff2`);
  copyFileSync("node_modules/@fontsource/dm-sans/files/dm-sans-latin-600-normal.woff2", `${dir}/fonts/dm-sans-600.woff2`);
  writeFileSync(`${dir}/hyperframes.json`, JSON.stringify({ name: `sentinel-${name}` }, null, 2));
  console.log("wrote", dir);
}
