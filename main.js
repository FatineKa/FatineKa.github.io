// EN / FR toggle and the sticky contact bar. The page works without this file.

/* ---------- language ---------- */
const toggle = document.getElementById("toggle");
const titles = {
  en: "Fatine Kassabi — Data Scientist, Machine Learning & NLP",
  fr: "Fatine Kassabi — Data Scientist, Machine Learning & NLP",
};
function setLang(lang) {
  document.documentElement.lang = lang;
  document.title = titles[lang];
  document.querySelectorAll("a[data-cv]").forEach(a => a.href = `assets/Fatine_Kassabi_CV_${lang === "fr" ? "fr" : "eng"}.pdf`);
  toggle.querySelectorAll("span").forEach(s => s.classList.toggle("on", s.dataset.t === lang));
  try { localStorage.setItem("lang", lang); } catch (e) {}
}
toggle.addEventListener("click", () => setLang(document.documentElement.lang === "en" ? "fr" : "en"));
setLang(document.documentElement.lang === "fr" ? "fr" : "en");

/* ---------- sticky bar: visible only while the contact box is off screen ---------- */
const bar = document.querySelector(".mobile-cta");
new IntersectionObserver(([e]) => bar.classList.toggle("is-hidden", e.isIntersecting))
  .observe(document.getElementById("cta-box"));

/* ---------- project figures: small slideshows with build animations ---------- */
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// numbers that count up when their slide appears
function countUp(el) {
  const to = +el.dataset.to, dec = +el.dataset.dec || 0, pre = el.dataset.pre || "", suf = el.dataset.suf || "";
  const fmt = v => pre + v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
  if (reduceMotion) { el.textContent = fmt(to); return; }
  const t0 = performance.now();
  (function tick(t) {
    const k = Math.min(1, (t - t0) / 1100);
    el.textContent = fmt(to * (1 - (1 - k) ** 3));
    if (k < 1) requestAnimationFrame(tick);
  })(t0);
}

// coarse -> fine rainfall illustration (synthetic field, labelled as an illustration)
function runRain(slide) {
  const cv = slide.querySelector("canvas"), ctx = cv.getContext("2d"), label = slide.querySelector(".res-label");
  const COLS = 100, ROWS = 60, CELL = 5, f = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const g = (x, y, s, a) => a * Math.exp(-((c - x) ** 2 + (r - y) ** 2) / s);
    f.push(Math.min(1, g(22, 12, 260, 1) + g(42, 26, 140, .7) + g(72, 14, 420, .45) + g(55, 48, 300, .15) + .06 * Math.sin(c * .7) * Math.cos(r * .9) + .06));
  }
  const lo = [239, 233, 216], hi = [38, 48, 31];
  const levels = [[10, "~110 km"], [5, "~55 km"], [2, "~22 km"], [1, "~11 km"]];
  function draw(lv) {
    const s = levels[lv][0];
    for (let r = 0; r < ROWS; r += s) for (let c = 0; c < COLS; c += s) {
      let sum = 0, n = 0;
      for (let i = r; i < Math.min(r + s, ROWS); i++) for (let j = c; j < Math.min(c + s, COLS); j++) { sum += f[i * COLS + j]; n++; }
      const v = Math.max(0, sum / n);
      ctx.fillStyle = `rgb(${lo.map((a, i) => Math.round(a + (hi[i] - a) * v)).join(",")})`;
      ctx.fillRect(c * CELL, r * CELL, s * CELL, s * CELL);
    }
    label.textContent = levels[lv][1];
  }
  if (reduceMotion) return draw(3);
  let lv = 0; draw(0);
  clearInterval(slide._timer);
  slide._timer = setInterval(() => { if (++lv > 3) return clearInterval(slide._timer); draw(lv); }, 900);
}

document.querySelectorAll(".fig").forEach(fig => {
  const slides = [...fig.querySelectorAll(".slide")], dots = fig.querySelector(".dots");
  let cur = -1, timer = null, visible = false, hover = false;
  slides.forEach((_, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.setAttribute("aria-label", "Slide " + (i + 1));
    b.addEventListener("click", () => show(i));
    dots.appendChild(b);
  });
  function show(i) {
    cur = (i + slides.length) % slides.length;
    slides.forEach((s, k) => s.classList.remove("on"));
    void fig.offsetWidth; // restart the animations
    slides[cur].classList.add("on");
    [...dots.children].forEach((d, k) => d.classList.toggle("on", k === cur));
    slides[cur].querySelectorAll("[data-to]").forEach(countUp);
    if (slides[cur].dataset.run === "rain") runRain(slides[cur]);
    restart();
  }
  function restart() {
    clearTimeout(timer);
    if (!reduceMotion && visible && !hover && slides.length > 1) timer = setTimeout(() => show(cur + 1), 6500);
  }
  fig.querySelector(".prev").addEventListener("click", () => show(cur - 1));
  fig.querySelector(".next").addEventListener("click", () => show(cur + 1));
  fig.addEventListener("pointerenter", () => { hover = true; clearTimeout(timer); });
  fig.addEventListener("pointerleave", () => { hover = false; restart(); });
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && cur === -1) show(0); else restart();
  }, { threshold: 0.4 }).observe(fig);
});

/* ---------- single-slide figures don't need arrows ---------- */
document.querySelectorAll(".fig").forEach(f => { if (f.querySelectorAll(".slide").length < 2) f.querySelector(".fig-nav").hidden = true; });

/* ---------- live Streamlit apps: loaded only when the visitor asks ---------- */
document.querySelectorAll(".live[data-src]").forEach(box => {
  box.querySelector(".live-start").addEventListener("click", () => {
    const frame = document.createElement("iframe");
    frame.src = box.dataset.src;
    frame.title = "Live demo";
    frame.allow = "clipboard-write";
    box.querySelector(".live-body").replaceChildren(frame);
    box.classList.add("loaded");
  });
});

/* ---------- live Dyna-Q agent (runs in the browser) ----------
   Q-learning + a learned model of the maze: after each real move,
   the agent replays N remembered moves from its model ("planning"). */
(function dynaQ() {
  const MAZE = [
    "....#......G",
    ".##.#.####..",
    ".#..#....#..",
    ".#.###.#.#.#",
    ".#.....#....",
    ".####.####.#",
    "......#.....",
    "S.##...#.##.",
  ];
  const R = MAZE.length, C = MAZE[0].length, N = R * C, CELL = 40;
  const cv = document.getElementById("rl-canvas"), ctx = cv.getContext("2d");
  const $id = id => document.getElementById(id);
  const ALPHA = 0.1, GAMMA = 0.95, EPS = 0.1, MAX_STEPS = 3000;
  const MOVES = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  let start, goal;
  MAZE.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === "S") start = r * C + c; if (ch === "G") goal = r * C + c; }));
  const wall = s => MAZE[Math.floor(s / C)][s % C] === "#";

  let Q, model, seen, s, steps, episode, history, best, trail, running = true, visible = false;
  function reset() {
    Q = new Float32Array(N * 4); model = new Map(); seen = [];
    s = start; steps = 0; episode = 0; history = []; best = Infinity; trail = [start];
    updateStats(); draw();
  }
  function move(st, a) {
    const r = Math.floor(st / C) + MOVES[a][0], c = (st % C) + MOVES[a][1];
    if (r < 0 || r >= R || c < 0 || c >= C) return st;
    const n = r * C + c;
    return wall(n) ? st : n;
  }
  const maxQ = st => Math.max(Q[st * 4], Q[st * 4 + 1], Q[st * 4 + 2], Q[st * 4 + 3]);
  function greedy(st) { // best action, random among ties
    const m = maxQ(st), best = [0, 1, 2, 3].filter(a => Q[st * 4 + a] === m);
    return best[Math.floor(Math.random() * best.length)];
  }
  function update(st, a, rew, next) {
    const target = rew + (next === goal ? 0 : GAMMA * maxQ(next));
    Q[st * 4 + a] += ALPHA * (target - Q[st * 4 + a]);
  }
  function step() {
    const a = Math.random() < EPS ? Math.floor(Math.random() * 4) : greedy(s);
    const next = move(s, a), rew = next === goal ? 1 : 0;
    update(s, a, rew, next);
    const key = s * 4 + a;
    if (!model.has(key)) seen.push(key);
    model.set(key, [rew, next]);
    const plan = +$id("rl-plan").value;
    for (let i = 0; i < plan; i++) { // planning with the learned model
      const k = seen[Math.floor(Math.random() * seen.length)], [pr, pn] = model.get(k);
      update(Math.floor(k / 4), k % 4, pr, pn);
    }
    s = next; steps++; trail.push(s);
    if (s === goal || steps >= MAX_STEPS) {
      if (s === goal) best = Math.min(best, steps);
      history.push(steps); episode++;
      $id("rl-steps").textContent = steps;
      s = start; steps = 0; trail = [start];
      updateStats();
    }
  }
  function updateStats() {
    $id("rl-ep").textContent = episode;
    $id("rl-best").textContent = best === Infinity ? "–" : best;
    if (!history.length) $id("rl-steps").textContent = "–";
    const h = history.slice(-60), top = Math.max(60, ...h);
    $id("rl-chart").querySelector("path").setAttribute("d",
      h.map((v, i) => `${i ? "L" : "M"}${(i / 59) * 200} ${70 - (Math.min(v, top) / top) * 66}`).join(""));
  }
  function draw() {
    ctx.fillStyle = "#EFE9D8"; ctx.fillRect(0, 0, cv.width, cv.height);
    let vmax = 1e-9; for (let i = 0; i < N; i++) vmax = Math.max(vmax, maxQ(i));
    for (let i = 0; i < N; i++) {
      const x = (i % C) * CELL, y = Math.floor(i / C) * CELL;
      if (wall(i)) { ctx.fillStyle = "#26301F"; ctx.fillRect(x, y, CELL, CELL); continue; }
      const v = maxQ(i) / vmax;
      if (v > 0) { ctx.fillStyle = `rgba(74,106,42,${(v * 0.55).toFixed(3)})`; ctx.fillRect(x, y, CELL, CELL); }
    }
    ctx.strokeStyle = "#D8D0BA"; ctx.lineWidth = 1;
    for (let c = 1; c < C; c++) { ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, cv.height); ctx.stroke(); }
    for (let r = 1; r < R; r++) { ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(cv.width, r * CELL); ctx.stroke(); }
    const ctr = st => [(st % C) * CELL + CELL / 2, Math.floor(st / C) * CELL + CELL / 2];
    ctx.strokeStyle = "rgba(38,48,31,.35)"; ctx.lineWidth = 2; ctx.beginPath(); // current trail
    trail.slice(-80).forEach((st, i) => { const [x, y] = ctr(st); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
    ctx.font = "500 13px 'IBM Plex Mono', monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    let [x, y] = ctr(start); ctx.fillStyle = "#9C9580"; ctx.fillText("S", x, y);
    [x, y] = ctr(goal); ctx.strokeStyle = "#4A6A2A"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 13, 0, 7); ctx.stroke();
    [x, y] = ctr(s); ctx.fillStyle = "#26301F"; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill();
  }
  function loop() {
    if (running && visible) {
      const n = +$id("rl-speed").value;
      for (let i = 0; i < n; i++) step();
      draw();
    }
    requestAnimationFrame(loop);
  }
  const playBtn = $id("rl-play");
  function setRunning(on) {
    running = on;
    playBtn.querySelector('[data-lang="en"]').textContent = on ? "Pause" : "Play";
    playBtn.querySelector('[data-lang="fr"]').textContent = on ? "Pause" : "Lancer";
  }
  playBtn.addEventListener("click", () => setRunning(!running));
  $id("rl-reset").addEventListener("click", reset);
  $id("rl-plan").addEventListener("change", reset);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.2 }).observe(cv);
  reset();
  setRunning(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  requestAnimationFrame(loop);
})();

/* ---------- idiom walkthrough: pre-computed results (assets/idiom-demo.js), played step by step ---------- */
(function idiomDemo() {
  const box = document.getElementById("idm");
  if (!box || !window.IDM) return;
  const stage = box.querySelector(".idm-stage"), count = box.querySelector(".idm-count");
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const both = (en, fr) => `<span data-lang="en">${en}</span><span data-lang="fr">${fr}</span>`;
  const pct = p => p >= 0.001 ? (p * 100).toFixed(1) + "%" : "<0.1%";
  let i = 0;

  function render() {
    const e = window.IDM[i];
    let t = 0;
    const at = ms => `data-in style="--t:${(t = ms)}"`;
    const rows = e.top.map((r, k) => `<div class="idm-row${r.i === e.want ? " hl" : ""}" data-in style="--t:${800 + k * 160};--v:${r.p}">
        <span class="w" lang="zh">${esc(r.i)}</span><span class="track"><i></i></span><b>${pct(r.p)}</b>
        <span class="idm-gl">${r.py ? `<em>${esc(r.py)}</em>${esc(r.en)}` : `<em>${both("no English entry", "pas d'entrée en anglais")}</em>`}</span>
      </div>`).join("");
    const verdict = e.rank === 1 ? both(`ranked <b>#1</b> ✓`, `classé <b>n°1</b> ✓`)
      : e.rank ? both(`ranked <b>#${e.rank}</b> of 1,000`, `classé <b>n°${e.rank}</b> sur 1&nbsp;000`)
      : both("not among the 1,000 candidates: the shortlist missed it", "absent des 1&nbsp;000 candidats : la présélection l'a manqué");
    stage.classList.remove("on");
    stage.innerHTML = `
      <p class="idm-k" ${at(0)}>${both("Input sentence", "Phrase d'entrée")}</p>
      <p class="idm-zh" lang="zh" ${at(100)}>${esc(e.zh)}</p>
      <p class="idm-tr" ${at(300)}>${both(esc(e.en), esc(e.fr))}</p>
      <p class="idm-k" ${at(600)}>${both("Top 5 idioms", "Top 5 idiomes")}</p>
      ${rows}
      <p class="idm-verdict${e.rank === 1 ? " ok" : ""}" ${at(1800)}>${both("Written for", "Écrite pour")} <span lang="zh">${esc(e.want)}</span> · ${verdict}
        <small><em>${esc(e.wantPy)}</em> · ${esc(e.wantEn)}</small></p>`;
    count.textContent = `${String(i + 1).padStart(2, "0")} / ${window.IDM.length}`;
    void stage.offsetWidth;               // restart the CSS transitions
    stage.classList.add("on");
  }

  box.querySelector(".prev").addEventListener("click", () => { i = (i - 1 + window.IDM.length) % window.IDM.length; render(); });
  box.querySelector(".next").addEventListener("click", () => { i = (i + 1) % window.IDM.length; render(); });
  box.querySelector(".replay").addEventListener("click", render);
  // play the first sentence when the box scrolls into view
  const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { render(); io.disconnect(); } }, { threshold: 0.25 });
  io.observe(box);
})();

/* ---------- email buttons: also copy the address (mailto does nothing without a mail app) ---------- */
document.querySelectorAll('a[href^="mailto:"]').forEach(a => {
  a.addEventListener("click", () => {
    const email = a.getAttribute("href").slice(7);
    navigator.clipboard?.writeText(email).then(() => {
      const fr = document.documentElement.lang === "fr";
      const old = a.innerHTML;
      if (a.classList.contains("ico")) { a.title = fr ? "Adresse copiée" : "Email copied"; return; }
      a.textContent = fr ? "ADRESSE COPIÉE ✓" : "EMAIL COPIED ✓";
      setTimeout(() => { a.innerHTML = old; }, 2000);
    }).catch(() => {});
  });
});

// Stacking project cards: each card pins once its bottom is in view, the next one slides over it
(() => {
  const cards = [...document.querySelectorAll(".story")];
  function stack() {
    const vh = innerHeight;
    cards.forEach((c, i) => {
      c.style.top = Math.min(24, vh - c.offsetHeight - 24) + "px";
      const next = cards[i + 1];
      if (!next) return;
      const r = c.getBoundingClientRect(), nr = next.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (r.bottom - nr.top) / Math.min(r.height, vh)));
      c.style.transform = `scale(${1 - p * 0.05})`;
      c.style.filter = `brightness(${1 - p * 0.12})`;
    });
  }
  addEventListener("scroll", stack, { passive: true });
  addEventListener("resize", stack);
  stack();
})();
