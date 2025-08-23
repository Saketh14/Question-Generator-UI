// script.js — Kid-fun UI + 20-pattern banks per Area×Level with sport/grade spice,
// learning bias, MCQ, and “Next” → fresh question when qty=1.
'use strict';
const $ = (id) => document.getElementById(id);

/* ----------------------------- utilities ---------------------------------- */
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; };
const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;

/* ------------------------------ sports ------------------------------------ */
const SPORTS = {
  cricket: { emoji: "🏏", noun: "runs", unit: "runs", field: "pitch" },
  football: { emoji: "🏈", noun: "yards", unit: "yards", field: "field" },
  soccer: { emoji: "⚽", noun: "goals", unit: "goals", field: "pitch" },
  basketball: { emoji: "🏀", noun: "points", unit: "points", field: "court" },
  tennis: { emoji: "🎾", noun: "points", unit: "points", field: "court" }
};
const sportNoun = (s) => (SPORTS[(s || '').toLowerCase()]?.noun) || 'points';
const fieldName = (s) => (SPORTS[(s || '').toLowerCase()]?.field) || 'field';

/* --------------------------- local “learning” ------------------------------ */
const LEARN_KEY = 'trainerLearnedV5';
const PREF_KEY = 'trainerPrefsV3';
const HIST_KEY = 'mathTrainerHistoryV5';

const loadJSON = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const saveJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));

function learn(area, level, q) {
  const key = `${area}__${level}`;
  const store = loadJSON(LEARN_KEY, {});
  store[key] = store[key] || [];
  const payload = { kind: q.kind || null, text: q.text, sample: q.sample, correct: q.correct, keywords: q.keywords || [], choices: q.choices || [] };
  if (!store[key].some(e => e.text === payload.text)) {
    store[key].unshift(payload);
    store[key] = store[key].slice(0, 500);
    saveJSON(LEARN_KEY, store);
  }
}
function getLearned(area, level) { return loadJSON(LEARN_KEY, {})[`${area}__${level}`] || []; }

function recordPreference(area, level, kind, score) {
  if (!kind) return;
  const key = `${area}__${level}`;
  const prefs = loadJSON(PREF_KEY, {});
  prefs[key] = prefs[key] || {};
  const bump = score >= 90 ? 3 : score >= 70 ? 2 : score >= 50 ? 1 : 0;
  if (bump > 0) { prefs[key][kind] = (prefs[key][kind] || 0) + bump; saveJSON(PREF_KEY, prefs); }
}
function weightedKind(meta) {
  const key = `${meta.area}__${meta.level}`;
  const prefs = loadJSON(PREF_KEY, {})[key] || {};
  const bag = []; Object.entries(prefs).forEach(([k, w]) => { for (let i = 0; i < w; i++) bag.push(k); });
  return bag.length ? pick(bag) : null;
}

/* --------------------------- fun wrappers --------------------------------- */
const NAMES = ["Rahul", "Aisha", "Maya", "Arjun", "Sam", "Liam", "Zara", "Ishan", "Neha", "Kiran", "Aarav", "Anya"];
const COACHES = ["Coach Vector", "Captain Fraction", "Professor Pi", "Sir Integrator", "Ms. Matrix"];
const INTROS = [
  "{emoji} {coach}: Pssst, quick challenge for {name}!",
  "{emoji} Mission time! Help {name} solve this before the snack timer beeps.",
  "{emoji} Math Quest: {name} needs you on the stats squad.",
  "{emoji} Brain Bat! {name} steps up with a puzzle.",
  "{emoji} Strategy timeout! {coach} tosses a mini-problem to {name}."
];
const CLOSERS = [
  "No calculators, just superstar brain cells ⭐",
  "Finish it and do a tiny victory dance 🕺",
  "If stuck, poke the <em>Show Sample Answer</em> button!",
  "Pro tip: check your units like a pro 📏",
  "Explain your steps to a rubber duck 🦆"
];
const FUN_SPICE = [
  "Beat the buzzer and the mascot brings cookies 🍪",
  "Solve it to unlock the secret victory dance 💃🕺",
  "Careful: the math goblin steals points for messy work 👹",
  "Bonus: say your answer in a sportscaster voice 🎙️",
  "Power-up: writing your steps gives +5 focus points ⚡",
  "Sticker alert: neat units earn a shiny badge 🏅"
];
function wrapIntro(sportKey) {
  const s = SPORTS[sportKey] || { emoji: "🧠" };
  return {
    emoji: s.emoji,
    intro: pick(INTROS).replace("{emoji}", s.emoji).replace("{coach}", pick(COACHES)).replace("{name}", pick(NAMES)),
    closer: pick(CLOSERS)
  };
}
const funify = (t) => Math.random() < 0.7 ? `${t}<br><br><em>${pick(FUN_SPICE)}</em>` : t;

/* ------------------------------ card bank --------------------------------- */
const kinds20 = (p) => Array.from({ length: 20 }, (_, i) => `${p}${i + 1}`);
const CARD_BANK = {
  algebra: { easy: kinds20('alg_e_'), moderate: kinds20('alg_m_'), hard: kinds20('alg_h_') },
  geometry: { easy: kinds20('geo_e_'), moderate: kinds20('geo_m_'), hard: kinds20('geo_h_') },
  trigonometry: { easy: kinds20('tri_e_'), moderate: kinds20('tri_m_'), hard: kinds20('tri_h_') },
  probability: { easy: kinds20('prob_e_'), moderate: kinds20('prob_m_'), hard: kinds20('prob_h_') },
  calculus: { easy: kinds20('cal_e_'), moderate: kinds20('cal_m_'), hard: kinds20('cal_h_') }
};

/* ----------------------------- deck / state --------------------------------*/
let state = { questions: [], idx: 0, meta: { area: '', sport: '', level: '', grade: '', qty: 3 }, decks: {} };
const comboKey = (m) => `${m.area}|${m.level}|${m.grade}|${(m.sport || '').toLowerCase()}`;

function ensureDeck(meta) {
  const key = comboKey(meta);
  if (state.decks[key]) return state.decks[key];
  let kinds = [];
  if (meta.area === 'mix') {
    const LV = meta.level || 'easy', take4 = (arr) => shuffle([...arr]).slice(0, 4);
    kinds = [
      ...take4(CARD_BANK.algebra[LV] || CARD_BANK.algebra.moderate),
      ...take4(CARD_BANK.geometry[LV] || CARD_BANK.geometry.moderate),
      ...take4(CARD_BANK.trigonometry[LV] || CARD_BANK.trigonometry.moderate),
      ...take4(CARD_BANK.probability[LV] || CARD_BANK.probability.moderate),
      ...take4(CARD_BANK.calculus[LV] || CARD_BANK.calculus.moderate)
    ];
  } else {
    kinds = CARD_BANK[meta.area]?.[meta.level] || kinds20('fallback_');
  }
  state.decks[key] = { order: shuffle([...kinds]), cursor: 0, recentTexts: [] };
  return state.decks[key];
}
const ensureKinds = (meta) => meta.area === 'mix' || !!CARD_BANK[meta.area]?.[meta.level];

/* --------------------------- MCQ helper ----------------------------------- */
function buildChoices(correct) {
  const opts = new Set([String(correct)]);
  const base = typeof correct === "number" ? correct : parseFloat(correct);
  if (isFinite(base)) {
    for (const d of [-3, -2, -1, 1, 2, 3, 4, -4]) { if (opts.size >= 4) break; opts.add(String(Math.round((base + d) * 100) / 100)); }
  }
  while (opts.size < 4) opts.add(String(rand(1, 9)));
  return shuffle(Array.from(opts));
}

/* ========================= GENERATORS (20 each) =========================== */
/* ——— ALGEBRA ———————————————————————————————————————————————— */
function genAlgebra(kind, grade, sport) {
  const g = Math.max(7, Math.min(10, +grade || 7)), noun = sportNoun(sport), name = pick(NAMES);
  const a = rand(2, 6) + (g % 3), b = rand(3, 9), c = rand(4, 12), d = rand(2, 8), p = rand(18, 60);
  const [, lvl, idx] = kind.split('_'); const i = (parseInt(idx, 10) - 1 + 20) % 20;

  const EASY = [
    () => { const total = a * b; return { t: `${name} earns ${a} ${noun} per drill in ${sport}. If total is ${total} ${noun}, how many drills x?`, s: `${a}x=${total} ⇒ x=${b}.`, corr: b, kw: ['linear', 'solve'] }; },
    () => { const total = a * b + c; return { t: `${name} gets ${a} ${noun} per hit plus ${c} bonus ${noun}. Total ${total}. Find hits x.`, s: `${a}x+${c}=${total} ⇒ x=${b}.`, corr: b, kw: ['two-step'] }; },
    () => { const s1 = rand(8, 18), s2 = rand(8, 18), target = rand(12, 20), need = target * 3 - (s1 + s2); return { t: `Scores ${s1}, ${s2}; wants average ${target} over 3 games. Game 3?`, s: `Need ${target * 3} total ⇒ ${need}.`, corr: need, kw: ['average'] }; },
    () => { const inc = rand(5, 25), base = rand(40, 90); return { t: `Score ${base} ${noun} grows by ${inc}%. New score?`, s: `≈ ${Math.round(base * (1 + inc / 100))}.`, corr: Math.round(base * (1 + inc / 100)), kw: ['percent'] }; },
    () => { const x0 = rand(2, 6); return { t: `Evaluate ${a}x+${b} at x=${x0}.`, s: `= ${a * x0 + b}.`, corr: a * x0 + b, kw: ['evaluate'] }; },
    () => { const t1 = rand(3, 12), dlt = rand(2, 6); return { t: `Sequence ${t1}, ${t1 + dlt}, ${t1 + 2 * dlt}, … Find 8th term.`, s: `a₈=a₁+7d=${t1 + 7 * dlt}.`, corr: t1 + 7 * dlt, kw: ['sequence'] }; },
    () => { const want = p, rate = a; return { t: `Need at least ${want} ${noun}. Each drill gives ${rate}. Min drills x?`, s: `x≥${want}/${rate} ⇒ ${Math.ceil(want / rate)}.`, corr: Math.ceil(want / rate), kw: ['inequality'] }; },
    () => { const m = a * b; return { t: `Factor: ${m}x + ${m * c}.`, s: `${m}(x+${c}).`, kw: ['factor'] }; },
    () => { return { t: `Expand: ${a}(x+${b}).`, s: `${a}x+${a * b}.`, kw: ['distribute'] }; },
    () => { const sA = rand(20, 40), sB = rand(10, 30); return { t: `Team A + B scored ${sA + sB}. If A had ${sA}, B had?`, s: `${sB}.`, corr: sB, kw: ['sum'] }; },
    () => { const x0 = rand(3, 8); const rhs = a * x0 + b + rand(1, 3); return { t: `Does ${a}x+${b} ≤ ${rhs} hold at x=${x0}?`, s: `Compute LHS ${a * x0 + b} vs RHS ${rhs}.`, kw: ['inequality'] }; },
    () => { return { t: `Simplify: ${a}x + ${b}x - ${d}.`, s: `${a + b}x - ${d}.`, kw: ['simplify'] }; },
    () => { const r1 = rand(2, 5), r2 = rand(2, 5); const part = Math.round(p * (r1 / (r1 + r2))); return { t: `Split ${p} ${noun} in ratio ${r1}:${r2}. How many for first part?`, s: `≈ ${part}.`, corr: part, kw: ['ratio'] }; },
    () => { const price = rand(50, 150), disc = rand(5, 30); const newP = Math.round(price * (1 - disc / 100)); return { t: `${disc}% off ₹${price}. New price?`, s: `≈ ₹${newP}.`, corr: newP, kw: ['percent'] }; },
    () => { return { t: `Translate: “${name} has ${c} ${noun} more than twice x.” If total ${p}, find x.`, s: `2x+${c}=${p} ⇒ x=${(p - c) / 2}.`, corr: (p - c) / 2, kw: ['translate'] }; },
    () => { const k = rand(2, 6); return { t: `Domain of f(x)=1/(x-${k}).`, s: `x≠${k}.`, kw: ['domain'] }; },
    () => { const x0 = rand(1, 6); return { t: `For y=x²-${a}x+${b}, compute y at x=${x0}.`, s: `= ${x0 * x0 - a * x0 + b}.`, corr: x0 * x0 - a * x0 + b, kw: ['quadratic'] }; },
    () => { const n = rand(5, 12), first = rand(2, 8), diff = rand(1, 6); const last = first + (n - 1) * diff, sum = n * (first + last) / 2; return { t: `Sum of first ${n} terms of ${first},${first + diff},…?`, s: `S=n(a₁+aₙ)/2=${sum}.`, corr: sum, kw: ['series'] }; },
    () => { const x = rand(2, 6), y = rand(2, 6), A = rand(2, 5), B = rand(2, 5), C = rand(1, 6), D = rand(2, 5), E = rand(2, 5), F = rand(1, 6); const s1 = A * x + B * y + C, s2 = D * x + E * y + F; return { t: `Solve system: ${A}x+${B}y=${s1}, ${D}x+${E}y=${s2}.`, s: `x=${x}, y=${y}.`, kw: ['system'] }; },
  ];

  const MOD = [
    () => { const r1 = rand(1, 6), r2 = rand(1, 6); return { t: `Roots of x²-${r1 + r2}x+${r1 * r2}=0?`, s: `x=${r1}, ${r2}.`, kw: ['quadratic', 'roots'] }; },
    () => { const h = rand(1, 4), k = rand(1, 9); return { t: `Vertex of y=(x-${h})²+${k}.`, s: `(${h},${k}).`, kw: ['vertex'] }; },
    () => { const rhs = rand(3, 10); return { t: `Solve |x-${b}|=${rhs}.`, s: `x=${b - rhs} or x=${b + rhs}.`, kw: ['absolute'] }; },
    () => { const low = rand(1, 4), high = low + rand(3, 7); return { t: `Solve ${low} < 2x + ${b} ≤ ${high}.`, s: `Isolate x; interval form.`, kw: ['inequality'] }; },
    () => { const c1 = rand(10, 30), c2 = rand(40, 60), tar = rand(30, 40), tot = rand(20, 40); return { t: `Mix x L at ${c1}% with y L at ${c2}% to make ${tot} L at ${tar}%. Find one pair.`, s: `x+y=${tot}, ${c1}x+${c2}y=${tar * tot}.`, kw: ['mixture', 'system'] }; },
    () => { const v1 = rand(20, 40), v2 = rand(20, 40), dist = rand(60, 120); return { t: `Two players run ${dist} m at ${v1} and ${v2} m/s. Who finishes first?`, s: `t=d/v.`, kw: ['rate'] }; },
    () => { return { t: `If f(x)=${a}x+${b}, g(x)=x²+${d}. Find (f∘g)(x).`, s: `${a}(x²+${d})+${b}.`, kw: ['composition'] }; },
    () => { const x1 = rand(0, 6), y1 = rand(0, 6), x2 = x1 + rand(1, 5), y2 = y1 + rand(1, 5); const m = (y2 - y1) / (x2 - x1); return { t: `Slope between (${x1},${y1}) and (${x2},${y2})?`, s: `${(y2 - y1)}/${(x2 - x1)}=${m.toFixed(2)}.`, corr: +m.toFixed(2), kw: ['slope'] }; },
    () => { const want = p, rate = a; return { t: `Need at least ${want} ${noun}. Each drill gives ${rate}. Min drills?`, s: `⌈${want}/${rate}⌉=${Math.ceil(want / rate)}.`, corr: Math.ceil(want / rate), kw: ['ceil'] }; },
    () => { const base = rand(2, 5), pow = d; return { t: `Evaluate ${base}^${pow}.`, s: `${base ** pow}.`, corr: base ** pow, kw: ['exponent'] }; },
    () => { const k2 = rand(2, 6); return { t: `Solve: x+${k2}y=${a}, ${k2}x+y=${b}.`, s: `Eliminate; express in ${k2}.`, kw: ['system'] }; },
    () => { return { t: `Domain of f(x)=1/(x-${b}).`, s: `x≠${b}.`, kw: ['domain'] }; },
    () => { const first = rand(3, 8), diff = rand(1, 6); return { t: `n-th term of AP with a₁=${first}, d=${diff}.`, s: `aₙ=a₁+(n-1)d.`, kw: ['ap'] }; },
    () => { const r = rand(2, 4), a1 = rand(2, 5); return { t: `Sum of GP first n with a₁=${a1}, r=${r}.`, s: `Sₙ=a₁(1-rⁿ)/(1-r).`, kw: ['gp'] }; },
    () => { return { t: `Piecewise f(x)={x² if x≤${a}; ${a}x+${b} if x>${a}}. Find f(${a}), f(${a + 1}).`, s: `Plug cases.`, kw: ['piecewise'] }; },
    () => { return { t: `Remainder of f(x) on division by (x-${a})?`, s: `R=f(${a}).`, kw: ['remainder'] }; },
    () => { const m1 = rand(1, 5); return { t: `Lines y=${m1}x and y=${(-1 / m1).toFixed(2)}x are…?`, s: `Perpendicular (negative reciprocal).`, kw: ['perpendicular'] }; },
    () => { const s1 = rand(10, 40), s2 = rand(10, 40); return { t: `Find line through points with slope ${a}.`, s: `y=${a}x+${b}.`, kw: ['model'] }; },
    () => { const price = rand(100, 200), tax = rand(5, 12); const total = Math.round(price * (1 + tax / 100)); return { t: `Price ₹${price} plus ${tax}% tax. Total?`, s: `≈ ₹${total}.`, corr: total, kw: ['percent'] }; },
    () => { return { t: `Factor by grouping: ${a}x(x+${b})+${c}(x+${b}).`, s: `(x+${b})(${a}x+${c}).`, kw: ['grouping'] }; },
  ];

  const HARD = [
    () => { const P = rand(30, 60); return { t: `Max area rectangle with perimeter ${P} on the ${fieldName(sport)}. Dimensions?`, s: `Square ⇒ sides ${P / 4}.`, kw: ['optimize'] }; },
    () => { const t0 = rand(2, 6); return { t: `Parabola y=x²-${a}x+${b}. Tangent slope at x=${t0}?`, s: `y'=2x-${a} ⇒ ${2 * t0 - a}.`, corr: 2 * t0 - a, kw: ['tangent'] }; },
    () => { const bb = rand(2, 9), tt = rand(10, 99); return { t: `Compute log_${bb}(${tt}) via change-of-base.`, s: `ln(${tt})/ln(${bb}).`, kw: ['log'] }; },
    () => { const base = rand(2, 5), pow = rand(2, 4); return { t: `Solve ${base}^x=${base ** pow}.`, s: `x=${pow}.`, corr: pow, kw: ['exponential'] }; },
    () => { return { t: `Solve 1/(x-${a}) + 1/(x-${b}) = 1/${d}.`, s: `Common denom; check extraneous.`, kw: ['rational'] }; },
    () => { return { t: `Inverse of f(x)=${a}x+${b}.`, s: `(x-${b})/${a}.`, kw: ['inverse'] }; },
    () => { return { t: `Complete square: x²-${a}x+${b}.`, s: `(x-${a / 2})²+${b - (a * a) / 4}.`, kw: ['square'] }; },
    () => { return { t: `Graph region y≤${-a}x+${b} and y≥x-${d}. Name a vertex.`, s: `Intersect lines.`, kw: ['graph'] }; },
    () => { const r = rand(5, 20); return { t: `Score grows ${r}% per game. How many games to triple?`, s: `n> ln3/ln(1+${r}/100).`, kw: ['growth'] }; },
    () => { return { t: `Expand (x+${b})².`, s: `x²+${2 * b}x+${b * b}.`, kw: ['binomial'] }; },
    () => { return { t: `Solve x/${a} + y/${b} = 1; x/${b} + y/${a} = 1.`, s: `Symmetric system.`, kw: ['system'] }; },
    () => { const budget = p * 10; return { t: `Budget ₹${budget}. Spend ₹${b} per game + ₹${a} snacks. Max games?`, s: `⌊(Budget−snacks)/per-game⌋.`, kw: ['floor'] }; },
    () => { return { t: `For x²-${a}x+${b}=0, describe roots by discriminant.`, s: `Δ=${a * a - 4 * b}.`, kw: ['discriminant'] }; },
    () => { return { t: `Linear programming: maximize S=${a}x+${b}y s.t. x+y≤${p}, x,y≥0.`, s: `Check vertices.`, kw: ['LP'] }; },
    () => { return { t: `Remainder theorem mini: if f divided by (x-c) leaves R, then…`, s: `R=f(c).`, kw: ['division'] }; },
    () => { const n = rand(3, 6); return { t: `Sum of ${n} consecutive integers equals ${n * p}. Middle term?`, s: `Use average.`, kw: ['average'] }; },
    () => { return { t: `Compound interest toy: principal ${p * 100}, rate ${a + 2}% (1 yr).`, s: `P(1+r).`, kw: ['percent'] }; },
    () => { const s1 = rand(10, 30), s2 = rand(10, 30); return { t: `System 3x+y=${s1}, x+3y=${s2}. Solve.`, s: `Eliminate.`, kw: ['system'] }; },
    () => { return { t: `Does point (${d}, ${a * d + b}) lie on y=${a}x+${b}?`, s: `Yes, it satisfies.`, kw: ['model'] }; },
    () => { const want = p, rate = a; return { t: `At least ${want} ${noun} with ${rate}/${noun} per drill. Min whole drills?`, s: `⌈${want}/${rate}⌉.`, corr: Math.ceil(want / rate), kw: ['ceil'] }; },
  ];

  const bank = (lvl === 'e') ? EASY : (lvl === 'm') ? MOD : HARD;
  const make = bank[i]();
  return { text: funify(make.t), sample: make.s, correct: (make.corr !== undefined ? make.corr : null), keywords: make.kw || [] };
}

/* ——— GEOMETRY ————————————————————————————————————————————— */
function genGeometry(kind, grade, sport) {
  const [, lvl, idx] = kind.split('_'); const i = (parseInt(idx, 10) - 1 + 20) % 20;
  const L = rand(10, 40), W = rand(6, 30), R = rand(5, 20), H = rand(4, 15), fld = fieldName(sport);

  const EASY = [
    () => { const per = 2 * (L + W); return { t: `Design a ${sport} mini-${fld}: L=${L} m, W=${W} m. Perimeter?`, s: `2(L+W)=${per} m.`, corr: per, kw: ['perimeter'] }; },
    () => { const area = L * W; return { t: `Area of rectangle ${L}×${W}?`, s: `${area} m².`, corr: area, kw: ['area'] }; },
    () => { const C = +(2 * 3.14 * R).toFixed(2); return { t: `Circle logo radius ${R} m. Circumference(π≈3.14)?`, s: `≈ ${C}.`, corr: C, kw: ['circumference'] }; },
    () => { const A = +(3.14 * R * R).toFixed(2); return { t: `Circle radius ${R} m. Area?`, s: `≈ ${A}.`, corr: A, kw: ['circle', 'area'] }; },
    () => { const hyp = +Math.hypot(L, W).toFixed(2); return { t: `Right triangle drill legs ${L}&${W}. Hypotenuse?`, s: `√(${L}²+${W}²)=${hyp}.`, corr: hyp, kw: ['pythagoras'] }; },
    () => { const scale = rand(2, 5), real = (scale * L); return { t: `Scale drawing 1:${scale}. Real length of ${real} cm segment?`, s: `${real}/${scale}=${L} cm.`, corr: L, kw: ['scale'] }; },
    () => { const mx = (L + L + 6) / 2, my = (W + W + 2) / 2; return { t: `Midpoint of (${L},${W}) & (${L + 6},${W + 2})?`, s: `(${mx}, ${my}).`, kw: ['midpoint'] }; },
    () => { return { t: `Interior sum of hexagon angles?`, s: `(6-2)·180=720°.`, corr: 720, kw: ['polygon'] }; },
    () => { const per = 3 * L; return { t: `Equilateral triangle side ${L}. Perimeter?`, s: `${per}.`, corr: per, kw: ['perimeter'] }; },
    () => { const d = (L * Math.SQRT2).toFixed(2); return { t: `Square side ${L}. Diagonal?`, s: `L√2≈${d}.`, corr: +d, kw: ['diagonal'] }; },
    () => { const area = L * W + 0.5 * 3.14 * (W / 2) ** 2; return { t: `Composite: rect ${L}×${W} + semicircle d=${W}. Area≈?`, s: `≈ ${(area).toFixed(2)}.`, corr: +area.toFixed(2), kw: ['composite'] }; },
    () => { return { t: `Is triangle ${L},${W},${L + W - 1} valid?`, s: `Triangle inequality.`, kw: ['triangle'] }; },
    () => { const d2 = +Math.hypot(3, 4).toFixed(2); return { t: `Distance between (${L},${W}) and (${L + 3},${W + 4})?`, s: `√(3²+4²)=${d2}.`, corr: d2, kw: ['distance'] }; },
    () => { return { t: `Parallel lines: alternate interior angles are…`, s: `Equal.`, kw: ['angles'] }; },
    () => { const A = (L * W) / 2; return { t: `Right-triangle area with legs ${L} & ${W}?`, s: `½LW=${A}.`, corr: A, kw: ['area'] }; },
    () => { const V = L * W * H; return { t: `Prism base ${L}×${W}, height ${H}. Volume?`, s: `B·h=${V}.`, corr: V, kw: ['volume'] }; },
    () => { const SA = +(2 * 3.14 * R * (R + H)).toFixed(2); return { t: `Cylinder r=${R}, h=${H}. Surface area≈?`, s: `≈ ${SA}.`, corr: SA, kw: ['surface'] }; },
    () => { const arc = +(2 * 3.14 * R * (H * 10 / 360)).toFixed(2); return { t: `Sector r=${R}, θ=${H * 10}°. Arc length≈?`, s: `≈ ${arc}.`, corr: arc, kw: ['arc'] }; },
    () => { const k = rand(3, 5); return { t: `Similar triangles scale ${k}:1. Side ${L}→?`, s: `×${k}.`, kw: ['similar'] }; },
    () => { const area = L * W; return { t: `Coordinate area of rectangle with corners (0,0),(${L},0),(${L},${W}),(0,${W}).`, s: `=${area}.`, corr: area, kw: ['coordinate'] }; },
  ];

  const MOD = [
    () => { return { t: `Classify triangle with legs ${L},${W} via Pythagorean check.`, s: `Compare c² vs a²+b².`, kw: ['classify'] }; },
    () => { const k = rand(2, 5); return { t: `Similar triangles scale k=${k}, area scales by?`, s: `k²=${k * k}.`, corr: k * k, kw: ['similar', 'area'] }; },
    () => { const n = rand(6, 12), ang = +(((n - 2) * 180) / n).toFixed(2); return { t: `Interior angle of regular ${n}-gon?`, s: `≈ ${ang}°.`, corr: ang, kw: ['polygon'] }; },
    () => { return { t: `Circle r=${R}: chord at distance ${H} from center; chord length?`, s: `2√(r²-d²).`, kw: ['chord'] }; },
    () => { const m = -(L / W); return { t: `Perpendicular slope to m=${m.toFixed(2)}?`, s: `Negative reciprocal.`, kw: ['slope'] }; },
    () => { const A = ((L + W) / 2) * H; return { t: `Trapezoid bases ${L},${W}, height ${H}. Area?`, s: `((b1+b2)/2)h=${A}.`, corr: A, kw: ['trapezoid'] }; },
    () => { return { t: `Heron’s formula sides ${L},${W},${L + 1}.`, s: `Use s and √(s(s-a)(s-b)(s-c)).`, kw: ['heron'] }; },
    () => { return { t: `Rotate point (x,y) by 90° CCW. New coords?`, s: `(-y,x).`, kw: ['transform'] }; },
    () => { return { t: `Locus: points dist ${R} from A(${L},${W}).`, s: `(x-${L})²+(y-${W})²=${R}².`, kw: ['locus'] }; },
    () => { const V = +((4 / 3) * Math.PI * R ** 3).toFixed(2); return { t: `Sphere r=${R}. Volume≈?`, s: `≈ ${V}.`, corr: V, kw: ['sphere'] }; },
    () => { const P = L + W + R; return { t: `Max area rectangle for fixed perimeter ${P}. Side length?`, s: `Square ⇒ ${P / 4}.`, corr: P / 4, kw: ['optimize'] }; },
    () => { const A = (L * W) / 2; return { t: `Triangle area from coordinates (0,0),(${L},0),(0,${W}).`, s: `½|…|=${A}.`, corr: A, kw: ['area'] }; },
    () => { const ang = (H * 10) / 2; return { t: `Inscribed angle intercepts arc ${H * 10}°. Angle?`, s: `${ang}°.`, corr: ang, kw: ['circle'] }; },
    () => { return { t: `Tangent ⟂ radius at point of tangency — explain.`, s: `Perpendicular property.`, kw: ['tangent'] }; },
    () => { const A2 = L * W - H * (H - 1); return { t: `Area between rectangles ${L}×${W} with hole ${H}×${H - 1}.`, s: `=${A2}.`, corr: A2, kw: ['composite'] }; },
    () => { const f = rand(2, 4); return { t: `Dilate by factor ${f} about origin: (x,y)→?`, s: `(${f}x, ${f}y).`, kw: ['dilation'] }; },
    () => { const area = +(L * W * Math.sin(Math.PI / 3)).toFixed(2); return { t: `Parallelogram sides ${L},${W}, angle 60°. Area?`, s: `≈ ${area}.`, corr: area, kw: ['area'] }; },
    () => { const len = +Math.sqrt(H * H - W * W).toFixed(2); return { t: `Rectangle diagonal ${H}, width ${W}. Length?`, s: `√(d²-w²)=${len}.`, corr: len, kw: ['diagonal'] }; },
    () => { const sec = +((H * 10 / 360) * Math.PI * R * R).toFixed(2); return { t: `Sector area r=${R}, θ=${H * 10}°.`, s: `≈ ${sec}.`, corr: sec, kw: ['sector'] }; },
    () => { const r2 = L * L + W * W; return { t: `Circle center (${L},${W}) through origin: equation?`, s: `(x-${L})²+(y-${W})²=${r2}.`, kw: ['circle'] }; },
  ];

  const HARD = [
    () => { const P = rand(40, 90); return { t: `Rectangular ${fld}, fixed perimeter ${P} m. Max-area dimensions?`, s: `Square ⇒ ${P / 4}×${P / 4}.`, kw: ['optimize'] }; },
    () => { return { t: `Triangle sides ${L},${W},${L + W - 2}. Classify (law of cosines idea).`, s: `Compare.`, kw: ['classify'] }; },
    () => { return { t: `Rectangle inscribed in circle r=${R} with max area. Dimensions?`, s: `Square with side r√2.`, kw: ['optimize'] }; },
    () => { const sl = +Math.hypot(R, H).toFixed(2); return { t: `Right cone r=${R}, h=${H}. Slant height & SA?`, s: `l≈${sl}; SA=πr(r+l).`, kw: ['cone'] }; },
    () => { return { t: `Minimum distance from (${L},${W}) to line y=${rand(1, 3)}x+${rand(0, 5)}?`, s: `|Ax0+By0+C|/√(A²+B²).`, kw: ['distance'] }; },
    () => { return { t: `Pack squares side ${H} into ${L}×${W} court. How many?`, s: `⌊L/H⌋·⌊W/H⌋.`, kw: ['tiling'] }; },
    () => { return { t: `Centroid of triangle (0,0),(${L},0),(0,${W}).`, s: `(${L / 3}, ${W / 3}).`, kw: ['centroid'] }; },
    () => { const P = L + W + R; return { t: `Diagonal ${H}, perimeter ${P}. Find sides (system).`, s: `Solve L+W=P/2 & √(L²+W²)=d.`, kw: ['system'] }; },
    () => { return { t: `Area between concentric circles r=${R}, R=${R + H}.`, s: `π(R²−r²).`, kw: ['annulus'] }; },
    () => { return { t: `Perpendicular bisector of segment (0,0)→(${L},${W})?`, s: `Midpoint & negative reciprocal.`, kw: ['bisector'] }; },
    () => { return { t: `Kite diagonals are perpendicular (outline).`, s: `Use congruent triangles.`, kw: ['proof'] }; },
    () => { return { t: `Circle through (0,0),(${L},0),(0,${W}) — find center.`, s: `Perp bisectors intersect.`, kw: ['circle'] }; },
    () => { return { t: `Max area triangle in circle r=${R}.`, s: `Equilateral.`, kw: ['optimize'] }; },
    () => { return { t: `Translate by (a,b): mapping rule?`, s: `(x+a, y+b).`, kw: ['transform'] }; },
    () => { return { t: `Area via shoelace (concept).`, s: `Sum-det halves.`, kw: ['shoelace'] }; },
    () => { return { t: `Angle between diagonals of rectangle (idea).`, s: `Equal if square.`, kw: ['angle'] }; },
    () => { return { t: `Dot product = 0 ⇒ right angle — why.`, s: `Orthogonality.`, kw: ['vector'] }; },
    () => { return { t: `Locus equidistant from two points — describe.`, s: `Perpendicular bisector.`, kw: ['locus'] }; },
    () => { return { t: `Similar polygons: perimeter vs area scale.`, s: `P∝k, A∝k².`, kw: ['similar'] }; },
    () => { return { t: `Parallelogram diagonals bisect (coord proof outline).`, s: `Midpoints match.`, kw: ['proof'] }; },
  ];

  const bank = (lvl === 'e') ? EASY : (lvl === 'm') ? MOD : HARD;
  const make = bank[i]();
  return { text: funify(make.t), sample: make.s, correct: (make.corr !== undefined ? make.corr : null), keywords: make.kw || [] };
}

/* ——— TRIGONOMETRY —————————————————————————————————————————— */
function genTrig(kind, grade, sport) {
  const g = Math.max(7, Math.min(10, +grade || 7));
  const [, lvl, idx] = kind.split('_'); const i = (parseInt(idx, 10) - 1 + 20) % 20;
  const opp = rand(3, 9) + (g - 7), adj = rand(4, 10), hyp = +Math.hypot(opp, adj).toFixed(2);
  const A = rand(20, 60), B = 180 - A - rand(30, 70);
  const amp = Math.max(1, Math.floor((g - 6) / 2)); // grade-scaled amplitude
  const bcoef = (g % 4) + 1;                         // grade-scaled frequency

  const EASY = [
    () => ({ t: `Right triangle with opp=${opp}, adj=${adj}. Compute sinθ, cosθ, tanθ.`, s: `sin=${opp}/${hyp}, cos=${adj}/${hyp}, tan=${opp}/${adj}.`, kw: ['sohcahtoa'] }),
    () => ({ t: `Angle of elevation with height ${opp} m and distance ${adj} m. θ≈?`, s: `tanθ=opp/adj ⇒ θ≈${(Math.atan(opp / adj) * 180 / Math.PI).toFixed(1)}°.`, corr: +(Math.atan(opp / adj) * 180 / Math.PI).toFixed(1), kw: ['elevation'] }),
    () => ({ t: `Find opp if hyp=${hyp} and adj=${adj}.`, s: `√(h²-a²).`, kw: ['triangle'] }),
    () => ({ t: `Convert ${A}° to radians.`, s: `×π/180.`, kw: ['radians'] }),
    () => ({ t: `Exact sin30°, cos60°, tan45°.`, s: `1/2, 1/2, 1.`, kw: ['exact'] }),
    () => ({ t: `Given sinθ=${opp}/${hyp}. Find cosθ.`, s: `√(1−sin²θ).`, kw: ['identity'] }),
    () => ({ t: `Complementary: sin(90°−θ)=?`, s: `cosθ.`, kw: ['cofunction'] }),
    () => ({ t: `Find θ if cosθ=${adj}/${hyp}.`, s: `arccos(…)=θ.`, kw: ['arccos'] }),
    () => ({ t: `Arc length r=${adj}, θ=${A}°.`, s: `(θ/360)·2πr.`, kw: ['arc'] }),
    () => ({ t: `Sector area r=${opp}, θ=${A}°.`, s: `(θ/360)πr².`, kw: ['sector'] }),
    () => ({ t: `Identify opp/adj/hyp for labeled triangle.`, s: `Relative to θ.`, kw: ['identify'] }),
    () => ({ t: `sin(0), cos(π)?`, s: `0, −1.`, kw: ['unit circle'] }),
    () => ({ t: `Find missing angle: ${A}°, ${(180 - A - 30)}°, ?`, s: `Sum 180.`, kw: ['angles'] }),
    () => ({ t: `SOH-CAH-TOA mnemonic — explain.`, s: `Opp/Hyp etc.`, kw: ['sohcahtoa'] }),
    () => ({ t: `Use calculator to get cos${A}° (round).`, s: `…`, kw: ['calc'] }),
    () => ({ t: `Graph basics of y=sinx: amplitude/period.`, s: `A=1, P=2π.`, kw: ['graph'] }),
    () => ({ t: `If tanθ=${opp}/${adj}, compute sinθ, cosθ.`, s: `Build triangle.`, kw: ['triangle'] }),
    () => ({ t: `Define radians in your words.`, s: `Arc length per radius.`, kw: ['radians'] }),
    () => ({ t: `sin(180°−θ)=?`, s: `=sinθ.`, kw: ['identity'] }),
    () => ({ t: `cos(90°−θ)=?`, s: `=sinθ.`, kw: ['identity'] }),
  ];

  const MOD = [
    () => ({ t: `Law of sines: a opposite A=${A}°, b opposite B=${B}°. If a=${opp + 5}, find b.`, s: `b=a·sinB/sinA.`, kw: ['law of sines'] }),
    () => ({ t: `Law of cosines: sides ${opp + 5}, ${adj + 6}, included angle ${A}°. Find third side.`, s: `c²=a²+b²−2abcosC.`, kw: ['law of cosines'] }),
    () => ({ t: `Prove sin²θ+cos²θ=1 (unit circle sketch).`, s: `x²+y²=1.`, kw: ['identity'] }),
    () => ({ t: `Simplify sin²θ/(1+cosθ).`, s: `Use 1−cos²θ.`, kw: ['algebraic trig'] }),
    () => ({ t: `Solve 0≤x<360: 2sinx=√3.`, s: `60°,120°.`, kw: ['solve'] }),
    () => ({ t: `Amplitude & period of y=${amp}sin(${bcoef}x).`, s: `A=${amp}, P=2π/${bcoef}.`, kw: ['graph'] }),
    () => ({ t: `Angle of depression word problem.`, s: `tan relation.`, kw: ['depression'] }),
    () => ({ t: `Area of triangle with sides a,b and included angle C=${A}°.`, s: `½ab sinC.`, kw: ['area'] }),
    () => ({ t: `Exact sin(45°±15°) via sum formulas.`, s: `sin(A±B)=…`, kw: ['sum'] }),
    () => ({ t: `tanθ=sinθ/cosθ — prove.`, s: `Definitions.`, kw: ['identity'] }),
    () => ({ t: `sin(2θ) and cos(2θ).`, s: `2sinθcosθ; cos²θ−sin²θ.`, kw: ['double-angle'] }),
    () => ({ t: `Convert ${(A / 10).toFixed(2)} radians to degrees.`, s: `×180/π.`, kw: ['degrees'] }),
    () => ({ t: `Principal value of arcsin ${(opp / hyp).toFixed(2)}.`, s: `≈…`, kw: ['inverse'] }),
    () => ({ t: `Bearings + trig to find displacement.`, s: `Resolve components.`, kw: ['bearings'] }),
    () => ({ t: `1+tan²θ=sec²θ — prove.`, s: `Divide by cos²θ.`, kw: ['identity'] }),
    () => ({ t: `Graph y=cos(x−π/3)+1: shift/amp.`, s: `Right π/3, up 1.`, kw: ['graph'] }),
    () => ({ t: `General solutions of sinx=sinα.`, s: `α+360k or 180−α+360k.`, kw: ['general'] }),
    () => ({ t: `Height via two angles from two points.`, s: `Two equations.`, kw: ['two-point'] }),
    () => ({ t: `Ambiguous case SSA discussion.`, s: `0/1/2 solutions.`, kw: ['ambiguous'] }),
  ];

  const HARD = [
    () => ({ t: `Solve 0≤x<360: cosx=0.`, s: `90°, 270°.`, kw: ['solve'] }),
    () => ({ t: `Phase shift of y=sin(2x−π/4).`, s: `π/8 right.`, kw: ['phase'] }),
    () => ({ t: `Sum-to-product for sinA+sinB.`, s: `Identity proof.`, kw: ['sum-to-product'] }),
    () => ({ t: `Exact sin(15°).`, s: `sin(45−30).`, kw: ['exact'] }),
    () => ({ t: `Area formula equivalence (Heron vs ½ab sinC).`, s: `Outline.`, kw: ['area'] }),
    () => ({ t: `Solve tan(2x)=${rand(1, 3)}.`, s: `2x=arctan(k)+πn.`, kw: ['solve'] }),
    () => ({ t: `All solutions of sinx=1/3.`, s: `arcsin(1/3)+360k, 180−…`, kw: ['inverse'] }),
    () => ({ t: `(1−cosx)/sinx = sinx/(1+cosx) — show.`, s: `Multiply conjugate.`, kw: ['identity'] }),
    () => ({ t: `tan(arcsin t) in terms of t.`, s: `t/√(1−t²).`, kw: ['compose'] }),
    () => ({ t: `Smallest positive x: cos(3x)=0.`, s: `x=30°.`, kw: ['periodicity'] }),
    () => ({ t: `Amplitude of y=${rand(2, 5)}cosx+${rand(1, 4)}sinx.`, s: `√(a²+b²).`, kw: ['amplitude'] }),
    () => ({ t: `Radian arc-length s=rθ in a ${fieldName(sport)} drill.`, s: `s=rθ.`, kw: ['arc'] }),
    () => ({ t: `cos(π−x)=−cosx etc.`, s: `Symmetry.`, kw: ['symmetry'] }),
    () => ({ t: `2sin²θ−1=0 ⇒ θ?`, s: `45°,135°…`, kw: ['solve'] }),
    () => ({ t: `Graph y=cscx: asymptotes & key points.`, s: `Sketch.`, kw: ['graph'] }),
    () => ({ t: `Solve secx=${rand(2, 3)}.`, s: `x=arcsec(k)+2πn…`, kw: ['solve'] }),
    () => ({ t: `Given sinA, sinB, find sin(A+B).`, s: `Use sum identity.`, kw: ['sum'] }),
    () => ({ t: `Half-angle formulas — derive.`, s: `cos²x=(1+cos2x)/2…`, kw: ['half-angle'] }),
    () => ({ t: `Prove/Use cofunction identities.`, s: `sin(90−θ)=cosθ.`, kw: ['identity'] }),
    () => ({ t: `Trig series idea: ∑sin(kθ).`, s: `Identity/complex.`, kw: ['series'] }),
  ];

  const bank = (lvl === 'e') ? EASY : (lvl === 'm') ? MOD : HARD;
  const make = bank[i]();
  return { text: funify(make.t), sample: make.s, correct: (make.corr !== undefined ? make.corr : null), keywords: make.kw || [] };
}

/* ——— PROBABILITY ————————————————————————————————————————— */
function genProb(kind, grade, sport) {
  const g = Math.max(7, Math.min(10, +grade || 7));
  const [, lvl, idx] = kind.split('_'); const i = (parseInt(idx, 10) - 1 + 20) % 20;

  const EASY = [
    () => ({ t: `Flip two fair coins. P(2 heads)?`, s: `1/4.`, corr: 0.25, kw: ['independent'] }),
    () => ({ t: `Roll a die. P(X≥5)?`, s: `2/6=1/3.`, corr: 1 / 3, kw: ['die'] }),
    () => ({ t: `Bag with ${g} red, ${g - 5} blue. P(red)?`, s: `=${(g / (g + (g - 5))).toFixed(2)}.`, corr: +(g / (g + (g - 5))).toFixed(2), kw: ['bag'] }),
    () => ({ t: `At least one success trick — complement rule.`, s: `1−P(none).`, kw: ['complement'] }),
    () => ({ t: `Mutually exclusive events add — tiny example.`, s: `P(A∪B)=P(A)+P(B).`, kw: ['addition'] }),
    () => ({ t: `Independent AND — tiny example.`, s: `Multiply.`, kw: ['multiplication'] }),
    () => ({ t: `Pick 1 from ${g} players. P(you)?`, s: `1/${g}.`, corr: +(1 / g).toFixed(2), kw: ['uniform'] }),
    () => ({ t: `Draw 2 without replacement from small bag.`, s: `Use decrementing fractions.`, kw: ['sampling'] }),
    () => ({ t: `Expected value of a fair die.`, s: `3.5.`, corr: 3.5, kw: ['expected'] }),
    () => ({ t: `Outcomes count for 1 die roll?`, s: `6.`, corr: 6, kw: ['count'] }),
    () => ({ t: `P(none) in 3 tries with p=0.2.`, s: `0.8³.`, corr: +(0.8 ** 3).toFixed(3), kw: ['independent'] }),
    () => ({ t: `Odds 2:3 → probability?`, s: `2/5=0.4.`, corr: 0.4, kw: ['odds'] }),
    () => ({ t: `P(at least one head) in 2 flips.`, s: `1−1/4=3/4.`, corr: 0.75, kw: ['complement'] }),
    () => ({ t: `Permutations vs combinations example.`, s: `Order matters vs not.`, kw: ['perm', 'comb'] }),
    () => ({ t: `Captain & vice (order matters) from ${g}.`, s: `P(${g},2)=${g * (g - 1)}.`, corr: g * (g - 1), kw: ['perm'] }),
    () => ({ t: `Choose 2 from ${g}.`, s: `C(${g},2)=${g * (g - 1) / 2}.`, corr: g * (g - 1) / 2, kw: ['comb'] }),
    () => ({ t: `Spinner with 5 equal sectors — P(each)=?`, s: `1/5.`, corr: 0.2, kw: ['uniform'] }),
    () => ({ t: `Empirical vs theoretical probability.`, s: `Observed vs model.`, kw: ['empirical'] }),
    () => ({ t: `Tree diagram for two-step game (sketch).`, s: `Branches.`, kw: ['tree'] }),
    () => ({ t: `“Fair” meaning — define.`, s: `Equal likelihood.`, kw: ['fair'] }),
  ];

  const MOD = [
    () => ({ t: `From ${g + 2} players, P(a random 3-person squad contains you).`, s: `C(${g + 1},2)/C(${g + 2},3).`, kw: ['comb', 'conditional'] }),
    () => ({ t: `Hypergeometric: choose 2 from 3 red & 2 blue, P(both red)?`, s: `C(3,2)/C(5,2)=3/10.`, corr: 0.3, kw: ['hyper'] }),
    () => ({ t: `Conditional P(A|B) from small table.`, s: `P(A∩B)/P(B).`, kw: ['conditional'] }),
    () => ({ t: `Expected value game: win ₹${10 * g} with p=0.1 else 0.`, s: `E=₹${(10 * g * 0.1).toFixed(1)}.`, kw: ['expected'] }),
    () => ({ t: `Binomial: n=10, p=0.3, P(X=3).`, s: `C(10,3)0.3³0.7⁷.`, kw: ['binomial'] }),
    () => ({ t: `At least one success in n=5, p=0.2.`, s: `1−0.8⁵.`, corr: +(1 - 0.8 ** 5).toFixed(3), kw: ['complement'] }),
    () => ({ t: `Geometric: P(first success on trial 3) p=0.4.`, s: `0.6²·0.4.`, corr: +(0.6 ** 2 * 0.4).toFixed(3), kw: ['geometric'] }),
    () => ({ t: `Bayes with small numbers (friendly).`, s: `Posterior ∝ prior·likelihood.`, kw: ['bayes'] }),
    () => ({ t: `Mean/variance of simple RV with 2 outcomes.`, s: `μ=∑px, σ²=∑p(x−μ)².`, kw: ['rv'] }),
    () => ({ t: `Two dice sum 7 probability.`, s: `6/36=1/6.`, corr: 1 / 6, kw: ['dice'] }),
    () => ({ t: `Birthday-like collision idea (small N).`, s: `Complement method.`, kw: ['collision'] }),
    () => ({ t: `Lineups count with positions G,F,C distinct.`, s: `P(n,3).`, kw: ['perm'] }),
    () => ({ t: `Venn: |A∪B|=|A|+|B|−|A∩B| compute example.`, s: `…`, kw: ['venn'] }),
    () => ({ t: `OR with overlap small numbers.`, s: `Add−subtract.`, kw: ['addition'] }),
    () => ({ t: `Sampling with/without replacement differences.`, s: `Independence vs not.`, kw: ['sampling'] }),
    () => ({ t: `P(exactly one head) in 3 flips.`, s: `3·(1/2)³=3/8.`, corr: 0.375, kw: ['binomial'] }),
    () => ({ t: `Fair spinner EV with labeled scores.`, s: `Weighted mean.`, kw: ['expected'] }),
    () => ({ t: `Geometric probability on a segment (length).`, s: `Favorable/Total.`, kw: ['geometric prob'] }),
    () => ({ t: `Design a quick simulation plan.`, s: `Repeat trials, estimate.`, kw: ['simulation'] }),
    () => ({ t: `Independence test idea.`, s: `P(A∩B)=P(A)P(B)?`, kw: ['independent'] }),
  ];

  const HARD = [
    () => ({ t: `Binomial n=${10 + g}, p=0.6: mean & sd.`, s: `μ=np, σ=√(npq).`, kw: ['binomial'] }),
    () => ({ t: `Conditional independence counterexample (concept).`, s: `…`, kw: ['conditional'] }),
    () => ({ t: `Hypergeometric expectation derivation (sketch).`, s: `n·K/N.`, kw: ['hyper'] }),
    () => ({ t: `Negative binomial interpretation.`, s: `fails before r-th success.`, kw: ['neg binomial'] }),
    () => ({ t: `Inclusion–exclusion for A∪B∪C.`, s: `…`, kw: ['inclusion-exclusion'] }),
    () => ({ t: `Normal approx to binomial (when/why).`, s: `npq≥? + continuity.`, kw: ['normal approx'] }),
    () => ({ t: `Markov chain tiny 2-state example.`, s: `Transition matrix.`, kw: ['markov'] }),
    () => ({ t: `Expected trials until first goal p=0.3.`, s: `1/p≈3.33.`, corr: +(1 / 0.3).toFixed(2), kw: ['geometric'] }),
    () => ({ t: `Coupon collector idea (small K).`, s: `Harmonic approx.`, kw: ['collector'] }),
    () => ({ t: `Randomized strategy EV comparison.`, s: `Compute per branch.`, kw: ['strategy'] }),
    () => ({ t: `Indicator RV trick for counting.`, s: `Linearity of expectation.`, kw: ['indicator'] }),
    () => ({ t: `Birthday paradox ~23 people — intuition.`, s: `1−∏(…)</sub>.`, kw: ['collision'] }),
    () => ({ t: `Hypergeometric vs binomial — conditions.`, s: `w/ vs w/o replacement.`, kw: ['compare'] }),
    () => ({ t: `Variance additivity for independent RVs.`, s: `Var(X+Y)=Var(X)+Var(Y).`, kw: ['variance'] }),
    () => ({ t: `Bayes prior/likelihood tiny numbers.`, s: `Posterior ∝ prior·likelihood.`, kw: ['bayes'] }),
    () => ({ t: `EV with variable payouts table.`, s: `∑p·x.`, kw: ['expected'] }),
    () => ({ t: `Design unbiased estimator toy.`, s: `E[T]=θ.`, kw: ['estimator'] }),
    () => ({ t: `Law of large numbers idea.`, s: `Sample mean→μ.`, kw: ['lln'] }),
    () => ({ t: `Central limit theorem one-sentence.`, s: `Sum→normal.`, kw: ['clt'] }),
    () => ({ t: `Simpson’s paradox story bite.`, s: `Aggregates flip trends.`, kw: ['paradox'] }),
  ];

  const bank = (lvl === 'e') ? EASY : (lvl === 'm') ? MOD : HARD;
  const make = bank[i]();
  return { text: funify(make.t), sample: make.s, correct: (make.corr !== undefined ? make.corr : null), keywords: make.kw || [] };
}

/* ——— CALCULUS ———————————————————————————————————————————— */
function genCalc(kind, grade, sport) {
  const [, lvl, idx] = kind.split('_'); const i = (parseInt(idx, 10) - 1 + 20) % 20;
  const a = rand(2, 5), b = rand(1, 6), c = rand(2, 8), k = rand(2, 5), t0 = rand(1, 3), R = rand(6, 14);

  const EASY = [
    () => ({ t: `f(x)=${a}x²+${b}x+${c}. Find f'(x).`, s: `${2 * a}x+${b}.`, kw: ['power'] }),
    () => ({ t: `∫ (${a}x+${b}) dx`, s: `${a / 2}x²+${b}x+C.`, kw: ['integral'] }),
    () => ({ t: `Slope of y=${a}x+${b}.`, s: `${a}.`, corr: a, kw: ['slope'] }),
    () => ({ t: `lim_{h→0} ( (x+h)² − x² )/h`, s: `2x.`, kw: ['limit'] }),
    () => ({ t: `Derivative of ${k}x³`, s: `${3 * k}x².`, kw: ['power'] }),
    () => ({ t: `∫ ${k} dx`, s: `${k}x+C.`, kw: ['integral'] }),
    () => ({ t: `f(x)=x⁵ → f'(x)=?`, s: `5x⁴.`, kw: ['power'] }),
    () => ({ t: `∫₀¹ (${a}x+${b}) dx`, s: `${a / 2 + b}.`, corr: a / 2 + b, kw: ['definite'] }),
    () => ({ t: `Instantaneous rate at x=${t0} for f=x².`, s: `2x|=${2 * t0}.`, corr: 2 * t0, kw: ['rate'] }),
    () => ({ t: `If s(t)=${a}t², find v(t).`, s: `2${a}t.`, kw: ['kinematics'] }),
    () => ({ t: `∫ x² dx`, s: `x³/3 + C.`, kw: ['integral'] }),
    () => ({ t: `(d/dx) sin x`, s: `cos x.`, kw: ['trig'] }),
    () => ({ t: `(d/dx) e^x`, s: `e^x.`, kw: ['exp'] }),
    () => ({ t: `∫ cos x dx`, s: `sin x + C.`, kw: ['integral'] }),
    () => ({ t: `lim x→0 (sin x)/x`, s: `1.`, corr: 1, kw: ['limit'] }),
    () => ({ t: `(d/dx) ln x`, s: `1/x.`, kw: ['log'] }),
    () => ({ t: `If f' = 3x², find an f.`, s: `x³ + C.`, kw: ['anti'] }),
    () => ({ t: `Average value of f(x)=x on [0,1]`, s: `1/2.`, corr: 0.5, kw: ['average'] }),
    () => ({ t: `∫₀^{${k}} ${a} dx`, s: `${a * k}.`, corr: a * k, kw: ['definite'] }),
    () => ({ t: `Slope of y=x² at x=${t0}`, s: `${2 * t0}.`, corr: 2 * t0, kw: ['slope'] }),
  ];

  const MOD = [
    () => ({ t: `f(t)=(t²+${c})e^t. Differentiate (product).`, s: `(t²+2t+${c})e^t.`, corr: `(t²+2t+${c})e^t`, kw: ['product'] }),
    () => ({ t: `f(t)=(${a}t³+${b}t)e^t. Differentiate.`, s: `Product rule each term.`, kw: ['product'] }),
    () => ({ t: `f(t)=(sin t + ${k})e^t. f'(t)=?`, s: `(sin t + cos t + ${k})e^t.`, kw: ['product'] }),
    () => ({ t: `f(t)=(t²+${a})cos t. Differentiate.`, s: `2t cos t − (t²+${a}) sin t.`, kw: ['product'] }),
    () => ({ t: `g(t)=(${a}t²+${b})³. g'(t)=?`, s: `${6 * a}t(${a}t²+${b})².`, kw: ['chain'] }),
    () => ({ t: `h(t)=sin²(${a}t). h'(t)=?`, s: `${2 * a}sin(${a}t)cos(${a}t).`, kw: ['chain'] }),
    () => ({ t: `p(t)=e^{${a}t² + ${b}t}. p'(t)=?`, s: `(2${a}t+${b})e^{…}.`, kw: ['chain', 'exp'] }),
    () => ({ t: `q(t)=√(${a}t²+${b}). q'(t)=?`, s: `${a}t/√(${a}t²+${b}).`, kw: ['chain'] }),
    () => ({ t: `r(t)=1/(${a}t²+${b}). r'(t)=?`, s: `−(2${a}t)/(${a}t²+${b})².`, kw: ['chain', 'quotient'] }),
    () => ({ t: `y(t)=(${a}t+${b})/(t²+${k}). y'(t)=?`, s: `Quotient rule.`, kw: ['quotient'] }),
    () => ({ t: `y(t)=sin t/(t+${a}). y'(t)=?`, s: `[(cos t)(t+${a})−sin t]/(t+${a})².`, kw: ['quotient'] }),
    () => ({ t: `x²+y²=${R}² ⇒ dy/dx?`, s: `−x/y.`, kw: ['implicit'] }),
    () => ({ t: `x·y + sin y = ${k} ⇒ dy/dx?`, s: `y'=−y/(x+cos y).`, kw: ['implicit'] }),
    () => ({ t: `f(t)=t^${a}(t+${b})^${k} (log-diff).`, s: `f'/f=${a}/t+${k}/(t+${b}).`, kw: ['log diff'] }),
    () => ({ t: `f(t)=e^{${a}t} sin(${b}t).`, s: `e^{${a}t}[${a}sin(${b}t)+${b}cos(${b}t)].`, kw: ['product'] }),
    () => ({ t: `f(t)=${a}t³−${b}t ⇒ f''(t)=?`, s: `${6 * a}t.`, corr: `${6 * a}t`, kw: ['second'] }),
    () => ({ t: `f(t)=t³−${a}t. Slope at t=${t0}?`, s: `3t²−${a} ⇒ ${3 * t0 * t0 - a}.`, kw: ['tangent'] }),
    () => ({ t: `f(t)=t³−${a}t. Critical points?`, s: `3t²−${a}=0 ⇒ t=±√(${a}/3).`, kw: ['critical'] }),
    () => ({ t: `f(t)=t⁴−${a}t² increasing intervals?`, s: `f'=2t(2t²−${a}). Test.`, kw: ['increasing'] }),
    () => ({ t: `Avg value of f=${a}t+${b} on [0,${k}]`, s: `${a * k / 2 + b}.`, corr: a * k / 2 + b, kw: ['average'] }),
  ];

  const HARD = [
    () => ({ t: `Optimize rectangle area with P=${4 * (a + b)} (calc or AM-GM).`, s: `Square → side P/4.`, kw: ['optimize'] }),
    () => ({ t: `Related rates: circle r'(t)=${a}. dA/dt=?`, s: `2πr·r'.`, kw: ['related'] }),
    () => ({ t: `∫ (2x)/(x²+${a}) dx`, s: `ln(x²+${a}) + C.`, kw: ['u-sub'] }),
    () => ({ t: `Area between y=x and y=x² on [0,1]`, s: `∫(x−x²)=1/6.`, corr: 1 / 6, kw: ['area'] }),
    () => ({ t: `Critical points of f=x⁴−${a}x²`, s: `4x³−2${a}x=0 ⇒ x=0, ±√(${a}/2).`, kw: ['critical'] }),
    () => ({ t: `Tangent line to y=ln x at x=${a}`, s: `y=(1/${a})(x−${a})+ln ${a}.`, kw: ['tangent'] }),
    () => ({ t: `∫ e^{${a}x} sin(${b}x) dx (setup)`, s: `IBP twice / known form.`, kw: ['ibp'] }),
    () => ({ t: `L'Hôpital: lim x→0 (1−cos x)/x²`, s: `1/2.`, corr: 0.5, kw: ['lhopital'] }),
    () => ({ t: `Series: ∑ 1/n² convergence value (state)`, s: `π²/6.`, kw: ['series'] }),
    () => ({ t: `Taylor of e^x near 0 up to x²`, s: `1+x+x²/2.`, kw: ['taylor'] }),
    () => ({ t: `∫₀^{${k}} (${a}x+${b}) dx`, s: `${a * k * k / 2 + b * k}.`, corr: a * k * k / 2 + b * k, kw: ['definite'] }),
    () => ({ t: `Inflection points of x³−${a}x`, s: `f''=6x=0 at x=0.`, kw: ['inflection'] }),
    () => ({ t: `Solve y'=${a}y, y(0)=1`, s: `y=e^{${a}x}.`, kw: ['ode'] }),
    () => ({ t: `∫ 1/(x²+${a}²) dx`, s: `(1/${a}) arctan(x/${a}) + C.`, kw: ['integral'] }),
    () => ({ t: `Maximize product x(${k}-x)`, s: `Vertex at x=${k / 2}.`, kw: ['optimize'] }),
    () => ({ t: `Arc length of y=x² on [0,1] (setup)`, s: `∫√(1+(2x)²) dx.`, kw: ['arclength'] }),
    () => ({ t: `∫ x e^{x} dx`, s: `(x−1)e^{x}+C.`, kw: ['ibp'] }),
    () => ({ t: `Mean value theorem for f=x² on [0,${k}]`, s: `f'(${k}/2)=secant slope.`, kw: ['mvt'] }),
    () => ({ t: `∫ tan x dx`, s: `−ln|cos x|+C.`, kw: ['integral'] }),
    () => ({ t: `Monotonicity of f'=2x+${b}`, s: `Sign of derivative.`, kw: ['mono'] }),
  ];

  const bank = (lvl === 'e') ? EASY : (lvl === 'm') ? MOD : HARD;
  const make = bank[i]();
  return { text: funify(make.t), sample: make.s, correct: (make.corr !== undefined ? make.corr : null), keywords: make.kw || [] };
}

/* ——— MIX ROUTER —————————————————————————————————————————— */
function genByArea(kind, grade, sport) {
  const area = kind.slice(0, kind.indexOf('_'));
  if (area === 'alg') return genAlgebra(kind, grade, sport);
  if (area === 'geo') return genGeometry(kind, grade, sport);
  if (area === 'tri') return genTrig(kind, grade, sport);
  if (area === 'prob') return genProb(kind, grade, sport);
  if (area === 'cal') return genCalc(kind, grade, sport);
  return { text: funify(`Warm-up: evaluate ${grade}x at x=2.`), sample: `= ${2 * grade}.`, correct: 2 * grade, keywords: ['warmup'] };
}

/* ---------------- build + wrap + optional MCQ + learning ------------------ */
function buildQuestion(meta, kind) {
  const sportKey = (meta.sport || '').toLowerCase();
  const { intro, closer, emoji } = wrapIntro(sportKey);
  const body = genByArea(kind, meta.grade, meta.sport);

  let choices = null;
  if (typeof body.correct === 'number' && isFinite(body.correct) && Math.random() < 0.5) {
    choices = buildChoices(body.correct);
  }

  const q = {
    kind,
    tag: cap(meta.area === 'mix' ? 'Mixed' : meta.area),
    text: `${emoji} ${intro}<br><br>${body.text}`,
    sample: `${body.sample} ${closer}`,
    correct: (body.correct !== undefined ? body.correct : null),
    keywords: (body.keywords || []).map(s => String(s).toLowerCase()),
    choices
  };
  learn(meta.area === 'mix' ? 'mix' : meta.area, meta.level, q);
  return q;
}

/* --------------------- spawn (learning-aware, de-repeat) ------------------ */
function spawnQuestionForCurrentCombo() {
  const meta = state.meta;
  if (!meta.area || !meta.level || !meta.grade || !ensureKinds(meta)) return null;
  const deck = ensureDeck(meta);

  // 40% weighted by user's strengths
  let kind = null;
  if (Math.random() < 0.4) kind = weightedKind(meta);
  if (!kind) {
    if (deck.cursor >= deck.order.length) { deck.order = shuffle(deck.order); deck.cursor = 0; }
    kind = deck.order[deck.cursor++];
  }

  const q = buildQuestion(meta, kind);
  if (deck.recentTexts.includes(q.text)) return spawnQuestionForCurrentCombo();
  deck.recentTexts.push(q.text); if (deck.recentTexts.length > 10) deck.recentTexts.shift();
  return q;
}

/* -------------------------- grade/sport labels ---------------------------- */
function renderChoices(q) {
  const box = $("choices"); if (!box) return;
  box.innerHTML = ""; box.hidden = !q.choices || !q.choices.length;
  if (box.hidden) return;
  box.style.marginTop = '10px';
  q.choices.forEach(text => {
    const btn = document.createElement('button'); btn.className = 'choice'; btn.textContent = text;
    btn.addEventListener('click', () => {
      $("answer").value = text;
      const ok = q.correct !== undefined && q.correct !== null &&
        (typeof q.correct === 'number' ? Math.abs(parseFloat(text) - q.correct) <= 0.05 : String(text).toLowerCase() === String(q.correct).toLowerCase());
      btn.classList.add(ok ? 'correct' : 'wrong');
      setTimeout(() => Array.from(box.children).forEach(c => c.classList.remove('correct', 'wrong')), 900);
    });
    box.appendChild(btn);
  });
}

function renderQuestion() {
  if (!state.questions.length) {
    $("problem").innerHTML = 'No question yet. Choose inputs and click <em>Generate Questions</em>.';
    $("q-meta").textContent = '—'; $("status").textContent = ''; $("answer").value = ''; if ($("choices")) $("choices").hidden = true; return;
  }
  const q = state.questions[state.idx]; const total = state.meta?.qty || state.questions.length;
  $("problem").innerHTML = q.text;
  $("q-meta").textContent = `Q${state.idx + 1}/${total} · ${q.tag} · ${state.meta.level} · Grade ${state.meta.grade}${state.meta.sport ? ' · ' + state.meta.sport : ''}`;
  $("status").textContent = ''; $("answer").value = '';
  renderChoices(q);
}

/* ----------------------------- scoring/history ---------------------------- */
function loadHistory() { return loadJSON(HIST_KEY, []); }
function saveHistory(item) { const d = loadHistory(); d.unshift(item); saveJSON(HIST_KEY, d.slice(0, 220)); }
function resetHistory() { localStorage.removeItem(HIST_KEY); }

function evaluateAnswer(answer, q) {
  const a = (answer || '').trim();
  if (q && q.correct !== null && q.correct !== undefined) {
    let ok = false;
    if (typeof q.correct === 'number') {
      const num = parseFloat(a.replace(/[^\d.\-]/g, '')); ok = isFinite(num) && Math.abs(num - q.correct) <= 0.05;
    } else if (typeof q.correct === 'string') {
      ok = a.toLowerCase().includes(String(q.correct).toLowerCase());
    }
    const score = ok ? 100 : 0;
    return { score, verdict: ok ? 'Nailedddd! 🏆' : 'Close! Check the hints and try again.', missing: ok ? [] : [String(q.correct)] };
  }
  const uniq = Array.from(new Set(q.keywords || []));
  const hits = uniq.filter(k => a.toLowerCase().includes(k));
  const score = Math.round(100 * hits.length / Math.max(1, uniq.length));
  const verdict = score >= 80 ? 'Excellent — covers most key points.'
    : score >= 60 ? 'Good — add a few details.'
      : score >= 40 ? 'Okay — expand on steps.'
        : 'Needs improvement — add definitions, steps, and a check.';
  return { score, verdict, missing: uniq.filter(k => !hits.includes(k)) };
}

function updateHistoryUI() {
  const list = $("history-list"); if (!list) return; const data = loadHistory(); list.innerHTML = '';
  data.slice(0, 10).forEach(r => {
    const li = document.createElement('li'); const left = document.createElement('span');
    left.textContent = `${r.tag} · ${r.level} · G${r.grade}${r.sport ? ' · ' + r.sport : ''} · ${new Date(r.at).toLocaleString()}`;
    const right = document.createElement('strong'); right.textContent = `${r.score}/100`;
    li.appendChild(left); li.appendChild(right); list.appendChild(li);
  });
  $("avg-score").textContent = data.length ? Math.round(data.reduce((s, r) => s + r.score, 0) / data.length) : '—';
  $("attempts").textContent = data.length;
}

/* -------------------------------- bindings -------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  const form = $("generator-form");
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const area = $("topic").value, sport = $("hobby").value, level = $("difficulty").value, grade = $("grade").value;
      const qty = Math.max(1, Math.min(30, parseInt(($("qty")?.value || '3'), 10) || 3));
      if (!area) { $("topic").reportValidity?.(); return; }
      if (!sport) { $("hobby").reportValidity?.(); return; }
      if (!level) { $("difficulty").reportValidity?.(); return; }
      if (!grade) { $("grade").reportValidity?.(); return; }
      state = { questions: [], idx: 0, meta: { area, sport, level, grade, qty }, decks: {} };
      ensureDeck(state.meta);
      const first = spawnQuestionForCurrentCombo(); if (first) state.questions.push(first);
      renderQuestion();
    });
  }

  $("btn-clear")?.addEventListener('click', () => {
    $("topic").selectedIndex = 0; $("hobby").selectedIndex = 0; $("difficulty").selectedIndex = 0; $("grade").selectedIndex = 0;
    if ($("qty")) $("qty").value = 3; $("answer").value = '';
    state = { questions: [], idx: 0, meta: { area: '', sport: '', level: '', grade: '', qty: 3 }, decks: {} };
    renderQuestion();
  });

  $("btn-prev")?.addEventListener('click', () => {
    if (!state.questions.length) return;
    state.idx = (state.idx - 1 + state.questions.length) % state.questions.length;
    renderQuestion();
  });

  $("btn-next")?.addEventListener('click', () => {
    if (!state.meta.area) { alert('Generate a question first.'); return; }
    const capQ = parseInt(state.meta.qty, 10) || 1;
    if (capQ === 1) {
      const q = spawnQuestionForCurrentCombo(); if (q) { state.questions[0] = q; state.idx = 0; renderQuestion(); }
      return;
    }
    if (state.questions.length < capQ) {
      const q = spawnQuestionForCurrentCombo(); if (q) { state.questions.push(q); state.idx = state.questions.length - 1; renderQuestion(); }
      return;
    }
    state.idx = (state.idx + 1) % state.questions.length; renderQuestion();
  });

  $("btn-eval")?.addEventListener('click', () => {
    if (!state.questions.length) { alert('Generate a question first.'); return; }
    const q = state.questions[state.idx];
    const res = evaluateAnswer($("answer").value, q);
    const missingTxt = res.missing && res.missing.length ? ` Missing: <em>${res.missing.slice(0, 6).join(', ')}</em>` : '';
    $("status").innerHTML = `<span class="${res.score >= 60 ? 'ok' : 'bad'}">Score: ${res.score}/100</span> — ${res.verdict}.${missingTxt}`;
    saveHistory({ tag: q.tag, score: res.score, at: Date.now(), level: state.meta.level, grade: state.meta.grade, sport: state.meta.sport });
    recordPreference(state.meta.area === 'mix' ? 'mix' : state.meta.area, state.meta.level, q.kind, res.score);
    updateHistoryUI();
  });

  $("btn-sample")?.addEventListener('click', () => {
    if (!state.questions.length) return;
    const q = state.questions[state.idx];
    $("status").innerHTML = `<em>Hints / sample:</em> ${q.sample}`;
  });

  $("btn-copy")?.addEventListener('click', async () => {
    if (!state.questions.length) return;
    try { await navigator.clipboard.writeText($("problem").innerText); $("status").textContent = 'Question copied to clipboard.'; }
    catch { $("status").textContent = 'Copy failed. Select and copy manually.'; }
  });

  $("btn-reset")?.addEventListener('click', () => { if (confirm('Reset all saved attempts?')) { resetHistory(); updateHistoryUI(); } });

  $("answer")?.addEventListener('keydown', (ev) => { if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') { ev.preventDefault(); $("btn-eval")?.click(); } });

  renderQuestion(); updateHistoryUI();
});

// Puts "No. of Questions", Generate, and Clear on the same row.
document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);

  function alignControlsRow() {
    const form = $("generator-form");
    if (!form) return;

    const qtyInput = $("qty");
    const clearBtn = $("btn-clear");
    // Try to find the submit button (Generate) robustly
    const submitBtn = form.querySelector("button[type='submit'], input[type='submit'], #btn-generate, button#btn-generate");

    if (!qtyInput || !clearBtn || !submitBtn) return;

    // Build a flex row container
    const row = document.createElement('div');
    row.id = 'row-qty-generate-clear';
    Object.assign(row.style, {
      display: 'flex',
      gap: '9px',
      alignItems: 'center',
      flexWrap: 'nowrap',
      marginTop: '8px',
      marginBottom: '8px'
    });

    // Wrap the qty label + input together
    const qtyWrap = document.createElement('div');
    Object.assign(qtyWrap.style, { display: 'flex', alignItems: 'center', gap: '8px' });

    let qtyLabel = form.querySelector("label[for='qty']");
    if (!qtyLabel) {
      qtyLabel = document.createElement('label');
      qtyLabel.htmlFor = 'qty';
      qtyLabel.textContent = 'No. of Questions';
    }

    qtyWrap.appendChild(qtyLabel);
    qtyWrap.appendChild(qtyInput);

    // Move elements into the single row
    row.appendChild(qtyWrap);
    row.appendChild(submitBtn);
    row.appendChild(clearBtn);

    // Place the row at the end of the form (or wherever you prefer)
    form.appendChild(row);

    // Minor styling tweaks for consistency
    [submitBtn, clearBtn].forEach(btn => {
      if (btn && btn.style) {
        btn.style.minHeight = '40px';
        btn.style.padding = '8px 14px';
      }
    });
    if (qtyInput && qtyInput.style) qtyInput.style.width = '90px';

    // Ensure there’s space after MCQ options
    const choices = $("choices");
    if (choices && choices.style) {
      choices.style.marginTop = '10px';
      choices.style.marginBottom = '12px';
    }
  }

  alignControlsRow();
});
