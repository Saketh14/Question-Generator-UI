// script.js — Fun, interactive, 20-pattern decks per area; clears MCQs properly
'use strict';
const $ = (id) => document.getElementById(id);

/* ----------------------------- tiny utilities ----------------------------- */
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; };
const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;

/* ----------------------------- sports nouns ------------------------------- */
const SPORTS = {
  cricket: { emoji: "🏏", noun: "runs", unit: "runs", field: "pitch" },
  football: { emoji: "🏈", noun: "yards", unit: "yards", field: "field" },
  soccer: { emoji: "⚽", noun: "goals", unit: "goals", field: "pitch" },
  basketball: { emoji: "🏀", noun: "points", unit: "points", field: "court" },
  tennis: { emoji: "🎾", noun: "points", unit: "points", field: "court" }
};
function sportNoun(s) { const k = (s || '').toLowerCase(); return SPORTS[k] ? SPORTS[k].noun : 'points'; }
function sportField(s) { const k = (s || '').toLowerCase(); return SPORTS[k] ? SPORTS[k].field : 'field'; }
function sportEmoji(s) { const k = (s || '').toLowerCase(); return SPORTS[k]?.emoji || '🧠'; }

/* --------------------------- persistent “learning” ------------------------ */
const LEARN_KEY = 'trainerLearnedV3';
function loadLearned() { try { return JSON.parse(localStorage.getItem(LEARN_KEY)) || {} } catch { return {} } }
function saveLearned(store) { localStorage.setItem(LEARN_KEY, JSON.stringify(store)); }
function learn(area, level, q) {
  const key = `${area}__${level}`;
  const store = loadLearned(); store[key] = store[key] || [];
  if (!store[key].some(e => e.text === q.text)) {
    store[key].unshift({ text: q.text, sample: q.sample, correct: q.correct, keywords: q.keywords, choices: q.choices || [] });
    store[key] = store[key].slice(0, 400);
    saveLearned(store);
  }
}
function getLearned(area, level) { const store = loadLearned(); return store[`${area}__${level}`] || []; }

/* ------------------------------ humor wrappers ---------------------------- */
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
function funWrap(sportKey) {
  const sp = SPORTS[sportKey] || { emoji: "🧠" };
  const intro = pick(INTROS).replace("{emoji}", sp.emoji).replace("{coach}", pick(COACHES)).replace("{name}", pick(NAMES));
  const closer = pick(CLOSERS);
  return { intro, closer, emoji: sp.emoji };
}

/* ------------------------------ deck (20 kinds) --------------------------- */
const kinds20 = (prefix) => Array.from({ length: 20 }, (_, i) => `${prefix}${i + 1}`);
const CARD_BANK = {
  algebra: { easy: kinds20('alg_e_'), moderate: kinds20('alg_m_'), hard: kinds20('alg_h_') },
  geometry: { easy: kinds20('geo_e_'), moderate: kinds20('geo_m_'), hard: kinds20('geo_h_') },
  trigonometry: { easy: kinds20('tri_e_'), moderate: kinds20('tri_m_'), hard: kinds20('tri_h_') },
  probability: { easy: kinds20('prob_e_'), moderate: kinds20('prob_m_'), hard: kinds20('prob_h_') },
  calculus: { easy: kinds20('cal_e_'), moderate: kinds20('cal_m_'), hard: kinds20('cal_h_') }
};

let state = { questions: [], idx: 0, meta: { area: '', sport: '', level: '', grade: '', qty: 3 }, decks: {} };
function comboKey(m) { return `${m.area}|${m.level}|${m.grade}|${(m.sport || '').toLowerCase()}`; }
function ensureDeck(meta) {
  const key = comboKey(meta);
  if (state.decks[key]) return state.decks[key];

  let kinds = [];
  if (meta.area === 'mix') {
    const LV = meta.level || 'easy';
    const take4 = (arr) => shuffle([...arr]).slice(0, 4);
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

/* ------------------------ MCQ helpers + clearing -------------------------- */
function buildChoices(correct) {
  const opts = new Set([String(correct)]);
  if (typeof correct === 'number' && isFinite(correct)) {
    const base = correct;
    for (const d of [-3, -2, -1, 1, 2, 3, 4, -4, 5, -5]) {
      if (opts.size >= 4) break;
      opts.add(String(Math.round((base + d) * 100) / 100));
    }
  }
  while (opts.size < 4) opts.add(String(rand(1, 9)));
  return shuffle(Array.from(opts));
}
function clearChoicesBox() {
  const box = $('choices');
  if (!box) return;
  box.innerHTML = '';
  box.hidden = true;
}

/* ---------- AI question helpers (optional bridge) ---------- */
async function aiMakePrompt(meta) {
  const area = meta.area || 'algebra';
  const level = meta.level || 'easy';
  const grade = meta.grade || '8';
  const sport = (meta.sport || 'basketball').toLowerCase();

  return `Create ONE fun ${area} word problem for grade ${grade} with a ${sport} theme.
- Difficulty: ${level}.
- Be playful but clear; 2–4 sentences max.
- Include concrete numbers so it’s solvable without the answer.
- Do NOT include the solution, hints, or multiple-choice options.
- Output ONLY the problem text.`;
}

async function aiBuildQuestion(meta) {
  if (!window.LLM || typeof window.LLM.ask !== 'function') {
    throw new Error('LLM bridge not available. Start it with "npm run groq".');
  }
  const prompt = await aiMakePrompt(meta);
  const reply = (await window.LLM.ask(prompt))?.trim();
  if (!reply) throw new Error('No AI response (check /api/health and your GROQ_API_KEY).');

  const { intro, closer } = funWrap((meta.sport || '').toLowerCase());
  const emoji = sportEmoji(meta.sport);

  return {
    tag: 'AI',
    text: `${intro}<br><br>${emoji} ${reply}<br><br><small>${closer}</small>`,
    sample: `Try outlining givens → unknowns → equation. Then solve. (AI question)`,
    correct: null,
    keywords: [],
    choices: null
  };
}

/* read + validate current form selections; returns meta or null */
function readMetaOrPrompt() {
  const area = $("topic")?.value || '';
  const sport = $("hobby")?.value || '';
  const level = $("difficulty")?.value || '';
  const grade = $("grade")?.value || '';
  const qty = Math.max(1, Math.min(30, parseInt(($("qty")?.value || '1'), 10) || 1));

  if (!area) { $("topic").reportValidity?.(); return null; }
  if (!sport) { $("hobby").reportValidity?.(); return null; }
  if (!level) { $("difficulty").reportValidity?.(); return null; }
  if (!grade) { $("grade").reportValidity?.(); return null; }

  return { area, sport, level, grade, qty };
}


/* ---------------------------- Area generators ----------------------------- */
/* Strategy: Each area has 20 reusable pattern functions (PAT[area][i]).
   Level tunes numbers & operations so the same pattern has E/M/H variants.
   This keeps code compact and avoids syntax errors in giant switch blocks. */

/* ------------------------------- ALGEBRA ---------------------------------- */
const ALG_PATTERNS = [
  // 1 One-step linear
  (lvl, g, sport) => {
    const noun = sportNoun(sport);
    const a = lvl === 'easy' ? rand(2, 6) : rand(3, 9);
    const x = rand(3, 9);
    const total = a * x;
    return {
      text: `Earn ${a} ${noun} per drill in ${sport}. Total ${total} ${noun}. How many drills x?`,
      sample: `${a}x=${total} ⇒ x=${total}/${a}=${x}.`,
      correct: x, keywords: ['linear', 'solve']
    };
  },
  // 2 Two-step linear
  (lvl, g, sport) => {
    const noun = sportNoun(sport);
    const a = rand(2, 6), bonus = rand(3, 12); const x = rand(3, 9);
    const total = a * x + bonus;
    return {
      text: `Get ${a} ${noun}/hit + bonus ${bonus} ${noun}. Total ${total}. Hits x?`,
      sample: `${a}x+${bonus}=${total} ⇒ ${a}x=${total - bonus} ⇒ x=${(total - bonus)}/${a}=${x}.`,
      correct: x, keywords: ['two-step', 'linear']
    };
  },
  // 3 Target average
  (lvl, g, sport) => {
    const noun = sportNoun(sport);
    const s1 = rand(8, 18), s2 = rand(8, 18), target = rand(12, 20);
    const total = target * 3; const need = total - (s1 + s2);
    return {
      text: `Scores ${s1}, ${s2}, and wants average ${target} over 3 games. How many ${noun} in game 3?`,
      sample: `Need total ${total}; x=${total}-${s1}-${s2}=${need}.`,
      correct: need, keywords: ['average', 'mean']
    };
  },
  // 4 Proportion (solve x) — fixed to be solvable
  (lvl, g) => {
    const a = rand(2, 5), b = rand(3, 9);
    // a:b = x:(a*b) ⇒ x = a^2
    const denom = a * b;
    return {
      text: `If ${a}:${b} = x:${denom}, find x.`,
      sample: `${a}/${b} = x/${denom} ⇒ x = ${denom}·${a}/${b} = ${a * a}.`,
      correct: a * a, keywords: ['ratio', 'proportion']
    };
  },
  // 5 Percent increase
  (lvl, g) => {
    const base = rand(40, 80), inc = lvl === 'easy' ? rand(5, 18) : rand(10, 25);
    const ans = Math.round(base * (1 + inc / 100));
    return { text: `Score ${base} increased by ${inc}% becomes ?`, sample: `= ${base}(1+${inc}/100) = ${ans}.`, correct: ans, keywords: ['percent'] };
  },
  // 6 Unit rate
  (lvl, g, sport) => {
    const noun = sportNoun(sport);
    const pts = rand(30, 60), mins = rand(10, 20);
    const val = +(pts / mins).toFixed(2);
    return { text: `${pts} ${noun} in ${mins} minutes. Find unit rate (${noun}/min).`, sample: `${pts}/${mins}=${val}.`, correct: val, keywords: ['rate'] };
  },
  // 7 Evaluate expression
  (lvl, g) => {
    const a = rand(2, 7), b = rand(1, 9), x = rand(2, 6);
    return { text: `Evaluate ${a}x+${b} at x=${x}.`, sample: `${a}·${x}+${b}=${a * x + b}.`, correct: a * x + b, keywords: ['evaluate'] };
  },
  // 8 Inequality truth check
  (lvl, g) => {
    const a = rand(2, 6), b = rand(1, 9), x = rand(3, 8);
    const rhs = a * x + b + rand(1, 3);
    return { text: `Does ${a}x+${b} ≤ ${rhs} hold at x=${x}? Explain.`, sample: `LHS=${a * x + b}; compare with RHS.`, correct: null, keywords: ['inequality'] };
  },
  // 9 Arithmetic sequence nth
  (lvl, g) => {
    const a1 = rand(3, 12), d = rand(2, 6), n = lvl === 'easy' ? 8 : rand(8, 15);
    const an = a1 + (n - 1) * d;
    return { text: `Sequence: ${a1}, ${a1 + d}, ${a1 + 2 * d}, … Find ${n}th term.`, sample: `aₙ=a₁+(n-1)d=${an}.`, correct: an, keywords: ['sequence'] };
  },
  // 10 Translate word→equation
  (lvl, g, sport) => {
    const noun = sportNoun(sport);
    const c = rand(4, 12), p = rand(30, 80);
    return { text: `“Has ${c} ${noun} more than twice x.” If total ${p}, find x.`, sample: `2x+${c}=${p} ⇒ x=${(p - c) / 2}.`, correct: (p - c) / 2, keywords: ['translate', 'linear'] };
  },
  // 11 System sum split
  () => {
    const a = rand(10, 30), b = rand(10, 30);
    return { text: `Team A + B scored ${a + b}. If A had ${a}, how many did B have?`, sample: `B=${a + b}-${a}=${b}.`, correct: b, keywords: ['system'] };
  },
  // 12 Combine like terms
  () => {
    const a = rand(2, 6), b = rand(2, 6), c = rand(1, 9);
    return { text: `Simplify: ${a}x + ${b}x - ${c}.`, sample: `(${a + b})x - ${c}.`, correct: null, keywords: ['simplify'] };
  },
  // 13 Distributive
  () => {
    const a = rand(2, 7), b = rand(2, 9);
    return { text: `Expand: ${a}(x + ${b}).`, sample: `${a}x + ${a * b}.`, correct: null, keywords: ['distribute'] };
  },
  // 14 Factor common
  () => {
    const m = rand(2, 6) * rand(2, 6), c = rand(2, 9);
    return { text: `Factor: ${m}x + ${m * c}.`, sample: `${m}(x+${c}).`, correct: null, keywords: ['factor'] };
  },
  // 15 Linear word problem
  (lvl, g, sport) => {
    const noun = sportNoun(sport);
    const a = rand(2, 6), p = rand(40, 120);
    return { text: `Needs ${p} ${noun}. Each drill gives ${a}. How many drills?`, sample: `x=${p}/${a}≈${Math.round(p / a)}.`, correct: Math.round(p / a), keywords: ['equation'] };
  },
  // 16 Average of n
  () => {
    const n = rand(3, 6), target = rand(10, 18), sumKnown = rand(10, 20);
    const need = target * n - sumKnown;
    return { text: `Average ${target} over ${n} games. If first ${n - 1} total ${sumKnown}, find last game score.`, sample: `Need ${target * n} ⇒ ${need}.`, correct: need, keywords: ['average'] };
  },
  // 17 Ratio split
  () => {
    const p = rand(30, 90), r1 = rand(2, 5), r2 = rand(2, 5);
    const ans = Math.round(p * (r1 / (r1 + r2)));
    return { text: `Split ${p} in ratio ${r1}:${r2}. Part 1?`, sample: `= ${p}·${r1}/(${r1 + r2})≈${ans}.`, correct: ans, keywords: ['ratio'] };
  },
  // 18 Percent discount
  () => {
    const price = rand(50, 150), disc = rand(5, 30);
    const newP = Math.round(price * (1 - disc / 100));
    return { text: `${disc}% off ₹${price}. New price?`, sample: `= ${price}(1-${disc}/100)=${newP}.`, correct: newP, keywords: ['percent'] };
  },
  // 19 Linear projection
  (lvl, g, sport) => {
    const noun = sportNoun(sport);
    const b = rand(20, 40), a = rand(3, 7);
    return { text: `Scored ${b} ${noun} now; improves ${a}/${sport === 'football' ? 'yard' : 'unit'} each game. After 3 more games?`, sample: `Add 3×${a} ⇒ ${b + 3 * a}.`, correct: b + 3 * a, keywords: ['linear', 'model'] };
  },
  // 20 Identity
  () => {
    const a = rand(2, 6), b = rand(2, 6);
    return { text: `Solve: ${a}(x+${b}) = ${a * (b + 1)} + ${a}x.`, sample: `Identity; all real x.`, correct: null, keywords: ['identity'] };
  }
];

/* ------------------------------- GEOMETRY --------------------------------- */
const GEO_PATTERNS = [
  // 1 Perimeter rectangle
  (lvl, g, sport) => {
    const L = rand(10, 40), W = rand(6, 30);
    const per = 2 * (L + W);
    return { text: `${sport} mini-${sportField(sport)}: L=${L}m, W=${W}m. Perimeter?`, sample: `2(L+W)=${per}m.`, correct: per, keywords: ['perimeter'] };
  },
  // 2 Area rectangle
  () => {
    const L = rand(10, 40), W = rand(6, 30), A = L * W;
    return { text: `Rectangle ${L}×${W}. Area?`, sample: `L·W=${A} m².`, correct: A, keywords: ['area'] };
  },
  // 3 Circumference circle
  () => {
    const r = rand(5, 20); const C = +(2 * 3.14 * r).toFixed(2);
    return { text: `Circle radius ${r}. Circumference (π≈3.14)?`, sample: `≈${C}.`, correct: C, keywords: ['circumference'] };
  },
  // 4 Area circle
  () => {
    const r = rand(5, 20); const A = +(3.14 * r * r).toFixed(2);
    return { text: `Circle radius ${r}. Area?`, sample: `≈${A}.`, correct: A, keywords: ['area', 'circle'] };
  },
  // 5 Pythagoras hyp
  () => {
    const a = rand(6, 20), b = rand(6, 20); const c = +Math.hypot(a, b).toFixed(2);
    return { text: `Right triangle legs ${a}, ${b}. Hypotenuse?`, sample: `√(${a}²+${b}²)=${c}.`, correct: c, keywords: ['pythagoras'] };
  },
  // 6 Scale drawing
  (lvl, g) => {
    const scale = lvl === 'easy' ? g : g + 1; const real = rand(10, 30) * scale;
    return { text: `Scale 1:${scale}. What real length is ${real} cm on plan?`, sample: `Real = ${real}/${scale}=${real / scale} cm.`, correct: real / scale, keywords: ['scale'] };
  },
  // 7 Midpoint
  () => {
    const x1 = rand(0, 10), y1 = rand(0, 10), x2 = x1 + rand(2, 8), y2 = y1 + rand(2, 8);
    return { text: `Midpoint of (${x1},${y1}) & (${x2},${y2})?`, sample: `( (x1+x2)/2, (y1+y2)/2 ).`, correct: null, keywords: ['midpoint'] };
  },
  // 8 Interior angle sum
  () => ({ text: `Interior sum of hexagon angles?`, sample: `(n-2)·180=720°.`, correct: 720, keywords: ['polygon'] }),
  // 9 Equilateral perimeter
  () => { const s = rand(6, 20); return { text: `Equilateral triangle side ${s}. Perimeter?`, sample: `3·${s}=${3 * s}.`, correct: 3 * s, keywords: ['perimeter'] }; },
  // 10 Square diagonal
  () => { const L = rand(6, 30); const d = +(L * Math.SQRT2).toFixed(2); return { text: `Square side ${L}. Diagonal?`, sample: `L√2≈${d}.`, correct: d, keywords: ['diagonal'] }; },
  // 11 Composite area (rect + semicircle)
  () => {
    const L = rand(10, 30), W = rand(6, 20); const A = L * W + 0.5 * 3.14 * (W / 2) ** 2;
    return { text: `Composite: rect ${L}×${W} + semicircle (diameter ${W}). Area≈?`, sample: `≈${A.toFixed(2)}.`, correct: +A.toFixed(2), keywords: ['composite'] };
  },
  // 12 Triangle inequality check
  () => {
    const a = rand(6, 20), b = rand(6, 20), c = a + b - rand(1, 5);
    return { text: `Is triangle ${a}, ${b}, ${c} valid?`, sample: `Check a+b>c etc.`, correct: null, keywords: ['triangle inequality'] };
  },
  // 13 Distance between points
  () => { const dx = rand(2, 8), dy = rand(2, 8); const d = +Math.hypot(dx, dy).toFixed(2); return { text: `Distance between two points Δx=${dx}, Δy=${dy}?`, sample: `√(Δx²+Δy²)=${d}.`, correct: d, keywords: ['distance'] }; },
  // 14 Parallel lines fact
  () => ({ text: `Alternate interior angles are equal — state why (parallel lines).`, sample: `Parallel line properties.`, correct: null, keywords: ['angles'] }),
  // 15 Right triangle area
  () => { const a = rand(6, 20), b = rand(6, 20); const A = (a * b) / 2; return { text: `Right triangle legs ${a}, ${b}. Area?`, sample: `½ab=${A}.`, correct: A, keywords: ['area'] }; },
  // 16 Rectangular prism volume
  () => { const L = rand(6, 20), W = rand(6, 20), H = rand(6, 20); const V = L * W * H; return { text: `Prism ${L}×${W}×${H}. Volume?`, sample: `L·W·H=${V}.`, correct: V, keywords: ['volume'] }; },
  // 17 Cylinder surface area
  () => { const r = rand(4, 10), h = rand(6, 20); const SA = +(2 * 3.14 * r * (r + h)).toFixed(2); return { text: `Cylinder r=${r}, h=${h}. SA≈?`, sample: `≈${SA}.`, correct: SA, keywords: ['surface area'] }; },
  // 18 Arc length
  () => { const r = rand(5, 15), deg = rand(30, 150); const s = +(2 * 3.14 * r * (deg / 360)).toFixed(2); return { text: `Arc length r=${r}, θ=${deg}°.`, sample: `(θ/360)·2πr≈${s}.`, correct: s, keywords: ['arc'] }; },
  // 19 Similar triangles scale
  () => { const k = rand(2, 5), s = rand(6, 20); return { text: `Similar triangles scale ${k}:1. A side ${s} → ?`, sample: `×${k}=${k * s}.`, correct: k * s, keywords: ['similar'] }; },
  // 20 Coordinate rectangle area
  () => { const L = rand(6, 20), W = rand(6, 20); return { text: `Rectangle with corners (0,0),(${L},0),(${L},${W}),(0,${W}). Area?`, sample: `=${L * W}.`, correct: L * W, keywords: ['coordinate', 'area'] }; }
];

/* ----------------------------- TRIGONOMETRY ------------------------------- */
const TRI_PATTERNS = [
  // 1 SOH-CAH-TOA basics
  (lvl, g) => {
    const opp = rand(3, 9), adj = rand(4, 10), hyp = +Math.hypot(opp, adj).toFixed(2);
    return { text: `Right triangle opp=${opp}, adj=${adj}. Compute sinθ, cosθ, tanθ.`, sample: `sin=${opp}/${hyp}, cos=${adj}/${hyp}, tan=${opp}/${adj}.`, correct: null, keywords: ['sohcahtoa'] };
  },
  // 2 Angle of elevation
  () => { const h = rand(6, 20), d = rand(8, 30); const ang = +(Math.atan(h / d) * 180 / Math.PI).toFixed(1); return { text: `Height ${h}, distance ${d}. Angle of elevation θ≈?`, sample: `tanθ=h/d ⇒ θ≈${ang}°.`, correct: ang, keywords: ['elevation'] }; },
  // 3 Missing side from hyp
  () => { const hyp = rand(8, 20), adj = rand(4, 15); const opp = +Math.sqrt(Math.max(0, hyp * hyp - adj * adj)).toFixed(2); return { text: `Hyp=${hyp}, adj=${adj}. Find opp.`, sample: `√(h²-a²)=${opp}.`, correct: opp, keywords: ['triangle'] }; },
  // 4 Deg→Rad
  () => { const A = rand(15, 165); const rad = +((A * Math.PI) / 180).toFixed(3); return { text: `Convert ${A}° to radians.`, sample: `×π/180=${rad}.`, correct: rad, keywords: ['radians'] }; },
  // 5 Exact landmark angles
  () => ({ text: `Exact values: sin30°, cos60°, tan45°.`, sample: `1/2, 1/2, 1 (check tan45=1).`, correct: null, keywords: ['exact'] }),
  // 6 Given tan, find sin & cos
  () => { const o = rand(3, 8), a = rand(4, 9); const h = +Math.hypot(o, a).toFixed(2); return { text: `Given tanθ=${o}/${a}. Compute sinθ and cosθ.`, sample: `sin=${o}/${h}, cos=${a}/${h}.`, correct: null, keywords: ['triangle'] }; },
  // 7 sin/cos identity
  () => ({ text: `Prove/recall sin²θ+cos²θ=1 (unit circle).`, sample: `x²+y²=1.`, correct: null, keywords: ['identity'] }),
  // 8 Solve basic equation
  () => ({ text: `Solve 0°≤x<360°: 2sinx=√3.`, sample: `x=60°,120°.`, correct: null, keywords: ['solve'] }),
  // 9 Double-angle
  () => ({ text: `State sin(2θ) and one form of cos(2θ).`, sample: `2sinθcosθ; cos²θ-sin²θ.`, correct: null, keywords: ['double-angle'] }),
  // 10 Law of sines
  () => { const A = rand(30, 80), B = rand(30, 80), a = rand(6, 15); return { text: `Law of sines: A=${A}°, B=${B}°, a=${a}. Find b.`, sample: `b=a·sinB/sinA.`, correct: null, keywords: ['law of sines'] }; },
  // 11 Law of cosines
  () => { const a = rand(6, 15), b = rand(6, 15), C = rand(30, 120); return { text: `Sides a=${a}, b=${b}, included angle ${C}°. Find third side.`, sample: `c²=a²+b²-2abcosC.`, correct: null, keywords: ['law of cosines'] }; },
  // 12 Exact 15°
  () => ({ text: `Find exact sin(15°).`, sample: `sin(45°-30°)=(√6-√2)/4.`, correct: null, keywords: ['exact'] }),
  // 13 Convert rad→deg
  () => { const r = +(Math.random() * 2).toFixed(3); const deg = +((r * 180) / Math.PI).toFixed(1); return { text: `Convert ${r} rad to degrees.`, sample: `×180/π≈${deg}°.`, correct: deg, keywords: ['degrees'] }; },
  // 14 Area of triangle using trig
  () => { const a = rand(6, 15), b = rand(6, 15), C = rand(30, 120); const A = (0.5 * a * b * Math.sin(C * Math.PI / 180)).toFixed(2); return { text: `Area with a=${a}, b=${b}, ∠C=${C}°.`, sample: `(1/2)ab sinC≈${A}.`, correct: +A, keywords: ['area'] }; },
  // 15 Inverse trig principal value
  () => { const v = +(Math.random() * 0.9).toFixed(2); return { text: `Principal value of arcsin ${v}.`, sample: `≈ calculator.`, correct: null, keywords: ['inverse'] }; },
  // 16 Graph info
  () => ({ text: `For y=A sin(Bx), what are amplitude and period?`, sample: `A=|A|, P=2π/|B|.`, correct: null, keywords: ['graph'] }),
  // 17 General solutions
  () => ({ text: `General solutions of sinx = sinα.`, sample: `x=α+360k or x=180-α+360k.`, correct: null, keywords: ['general'] }),
  // 18 Bearings
  () => ({ text: `Use bearings to find displacement magnitude (resolve components).`, sample: `Use cos/sin for components.`, correct: null, keywords: ['bearings'] }),
  // 19 Solve cos(3x)=0
  () => ({ text: `Smallest positive x with cos(3x)=0.`, sample: `3x=90° ⇒ x=30°.`, correct: 30, keywords: ['periodicity'] }),
  // 20 Simplify expression
  () => ({ text: `Simplify sinx(1+cotx).`, sample: `sinx + cosx.`, correct: null, keywords: ['simplify'] })
];

/* ----------------------------- PROBABILITY -------------------------------- */
const PROB_PATTERNS = [
  () => ({ text: `Flip 2 coins. P(2 heads)?`, sample: `1/4.`, correct: 0.25, keywords: ['independent'] }),
  () => ({ text: `Roll a die. P(X≥5)?`, sample: `2/6=1/3.`, correct: (1 / 3), keywords: ['die'] }),
  () => { const r = rand(3, 8), b = rand(3, 8); const p = +(r / (r + b)).toFixed(2); return { text: `Bag with ${r} red & ${b} blue. P(red)?`, sample: `≈${p}.`, correct: p, keywords: ['bag'] }; },
  () => ({ text: `Complement rule (at least one) idea.`, sample: `1 - P(none).`, correct: null, keywords: ['complement'] }),
  () => ({ text: `OR for disjoint events.`, sample: `P(A∪B)=P(A)+P(B).`, correct: null, keywords: ['addition'] }),
  () => ({ text: `AND independent events.`, sample: `P(A∩B)=P(A)P(B).`, correct: null, keywords: ['multiplication'] }),
  () => { const n = rand(6, 14); return { text: `Random pick from ${n}. P(you)?`, sample: `1/${n}.`, correct: +(1 / n).toFixed(3), keywords: ['uniform'] }; },
  () => ({ text: `Draw 2 without replacement: show fraction steps.`, sample: `Multiply sequential fractions.`, correct: null, keywords: ['without replacement'] }),
  () => ({ text: `Expected value of a fair die.`, sample: `(1+…+6)/6=3.5.`, correct: 3.5, keywords: ['expected'] }),
  () => ({ text: `Permutation vs combination quick example.`, sample: `Order matters vs not.`, correct: null, keywords: ['perm', 'comb'] }),
  () => ({ text: `P(none) in 3 tries with p=0.2.`, sample: `0.8³.`, correct: +(0.8 ** 3).toFixed(3), keywords: ['independent'] }),
  () => { const n = rand(6, 12); return { text: `Ways to pick 2 captains (order matters) from ${n}.`, sample: `P(${n},2)=${n * (n - 1)}.`, correct: n * (n - 1), keywords: ['perm'] }; },
  () => { const n = rand(6, 12); return { text: `Choose 2 from ${n} (order not matter).`, sample: `C(${n},2)=${n * (n - 1) / 2}.`, correct: n * (n - 1) / 2, keywords: ['comb'] }; },
  () => ({ text: `Binomial: n=10, p=0.3, P(X=3).`, sample: `C(10,3)·0.3³·0.7⁷.`, correct: null, keywords: ['binomial'] }),
  () => ({ text: `At least one success in n=5, p=0.2.`, sample: `1-0.8⁵.`, correct: +(1 - 0.8 ** 5).toFixed(3), keywords: ['complement'] }),
  () => ({ text: `Geometric: P(first success on trial 3) p=0.4.`, sample: `0.6²·0.4.`, correct: +(0.6 ** 2 * 0.4).toFixed(3), keywords: ['geometric'] }),
  () => ({ text: `Two dice: P(sum=7).`, sample: `6/36=1/6.`, correct: (1 / 6), keywords: ['dice'] }),
  () => ({ text: `Venn counts: |A∪B|=|A|+|B|-|A∩B| example.`, sample: `Plug counts.`, correct: null, keywords: ['venn'] }),
  () => ({ text: `Hypergeometric idea (draw without replacement).`, sample: `Use combinations.`, correct: null, keywords: ['hyper'] }),
  () => ({ text: `Expected trials until first goal if p=0.3.`, sample: `1/p≈3.33.`, correct: +(1 / 0.3).toFixed(2), keywords: ['geometric'] })
];

/* -------------------------------- CALCULUS -------------------------------- */
const CAL_PATTERNS = [
  // 1 Product rule poly*exp
  (lvl) => { const c = rand(2, 8); return { text: `f(t)=(t²+${c})e^t. Differentiate.`, sample: `f'=(t²+2t+${c})e^t.`, correct: `(t²+2t+${c})e^t`, keywords: ['product'] }; },
  // 2 Product rule trig*exp
  () => { const k = rand(1, 5); return { text: `f(t)=(sin t + ${k})e^t. Find f'(t).`, sample: `(sin t + cos t + ${k})e^t.`, correct: null, keywords: ['product'] }; },
  // 3 Product rule poly*trig
  () => { const a = rand(1, 4); return { text: `f(t)=(t²+${a})cos t. Differentiate.`, sample: `2t cos t - (t²+${a}) sin t.`, correct: null, keywords: ['product'] }; },
  // 4 Chain rule (power of poly)
  () => { const a = rand(2, 4), b = rand(1, 6); return { text: `g(t)=(${a}t²+${b})³. g'(t)=?`, sample: `=3(${a}t²+${b})²·(2${a}t)=${6 * a}t(${a}t²+${b})².`, correct: null, keywords: ['chain'] }; },
  // 5 Chain (sin^2(at))
  () => { const a = rand(1, 4); return { text: `h(t)=sin²(${a}t). h'(t)=?`, sample: `=2 sin(${a}t)·cos(${a}t)·${a} = ${2 * a} sin(${a}t)cos(${a}t).`, correct: null, keywords: ['chain'] }; },
  // 6 Exp chain
  () => { const a = rand(1, 4), b = rand(1, 5); return { text: `p(t)=e^{${a}t²+${b}t}. p'(t)=?`, sample: `(2${a}t+${b})·e^{…}.`, correct: null, keywords: ['exp', 'chain'] }; },
  // 7 Quotient rule
  () => { const a = rand(1, 5), k = rand(2, 6); return { text: `y(t)=(${a}t+1)/(t²+${k}). Differentiate.`, sample: `Quotient rule.`, correct: null, keywords: ['quotient'] }; },
  // 8 Implicit circle
  () => { const R = rand(6, 14); return { text: `x²+y²=${R}² ⇒ dy/dx?`, sample: `-x/y.`, correct: null, keywords: ['implicit'] }; },
  // 9 Implicit mixed
  () => { const k = rand(2, 5); return { text: `x·y + sin y = ${k}. dy/dx?`, sample: `y' = -y/(x+cos y).`, correct: null, keywords: ['implicit'] }; },
  // 10 Log differentiation
  () => { const a = rand(1, 4), b = rand(1, 6), k = rand(2, 4); return { text: `f(t)=t^${a}(t+${b})^${k}. Use log diff to find f'(t).`, sample: `f'/f=${a}/t+${k}/(t+${b}).`, correct: null, keywords: ['log diff'] }; },
  // 11 Second derivative
  () => { const a = rand(1, 5), b = rand(1, 5); return { text: `f(t)=${a}t³-${b}t. Compute f''(t).`, sample: `6${a}t.`, correct: `${6 * a}t`, keywords: ['second'] }; },
  // 12 Tangent slope at t0
  () => {
    const a = rand(2, 6), t0 = rand(1, 3); return { text: `f(t)=t³-${a}t. Slope at t=${t0}?`, sample: `3t²-${a} ⇒ ${3 * t0 * t0 - a}.`, correct: 3 * t0 * t0 - a, keywords: ['tangent'] };
  },
  // 13 Critical points
  () => {
    const a = rand(3, 9); return { text: `f(t)=t³-${a}t. Critical points?`, sample: `3t²-${a}=0 ⇒ t=±√(${a}/3).`, correct: null, keywords: ['critical'] };
  },
  // 14 Increasing intervals
  () => { const a = rand(3, 9); return { text: `f(t)=t⁴-${a}t². Increasing intervals?`, sample: `f'=2t(2t²-${a}); sign chart.`, correct: null, keywords: ['increasing'] }; },
  // 15 Average value
  () => { const a = rand(2, 5), b = rand(1, 6), k = rand(2, 6); const val = a * k / 2 + b; return { text: `Average value of f(t)=${a}t+${b} on [0,${k}].`, sample: `(1/${k})∫=${val}.`, correct: val, keywords: ['average value'] }; },
  // 16 Basic power rule
  () => { const a = rand(2, 5), b = rand(1, 5), c = rand(2, 8); return { text: `f(x)=${a}x²+${b}x+${c}. f'(x)=?`, sample: `${2 * a}x+${b}.`, correct: null, keywords: ['power'] }; },
  // 17 Simple definite integral
  () => { const a = rand(1, 6), b = rand(1, 6); const val = a / 2 + b; return { text: `Evaluate ∫₀¹ (${a}x+${b}) dx`, sample: `= ${a / 2}+${b}=${val}.`, correct: val, keywords: ['definite'] }; },
  // 18 L’Hôpital small limit
  () => ({ text: `lim x→0 (1-cos x)/x²`, sample: `=1/2.`, correct: 0.5, keywords: ['lhopital'] }),
  // 19 Substitution simple
  () => { const a = rand(2, 6); return { text: `∫ (2x)/(x²+${a}) dx`, sample: `ln(x²+${a})+C.`, correct: null, keywords: ['substitution'] }; },
  // 20 Optimization rectangle (AM-GM vibe)
  (lvl, g, sport) => {
    const P = 4 * rand(8, 20);
    const side = P / 4;
    return { text: `Rectangular ${sportField(sport)} has fixed perimeter ${P} m. What dimensions maximize area?`, sample: `Square best ⇒ ${side}×${side}.`, correct: null, keywords: ['optimize'] };
  }
];

/* ------------------------------- ROUTER ----------------------------------- */
function genByArea(kind, grade, sport, level) {
  const area = kind.slice(0, kind.indexOf('_'));
  const idx = parseInt(kind.split('_')[2], 10) - 1;

  const g = Math.max(7, Math.min(10, +grade || 7));
  let body;

  if (area === 'alg') body = ALG_PATTERNS[idx % ALG_PATTERNS.length](level, g, sport);
  else if (area === 'geo') body = GEO_PATTERNS[idx % GEO_PATTERNS.length](level, g, sport);
  else if (area === 'tri') body = TRI_PATTERNS[idx % TRI_PATTERNS.length](level, g, sport);
  else if (area === 'prob') body = PROB_PATTERNS[idx % PROB_PATTERNS.length](level, g, sport);
  else if (area === 'cal') body = CAL_PATTERNS[idx % CAL_PATTERNS.length](level, g, sport);
  else body = { text: `Warm-up: evaluate ${g}x at x=2.`, sample: `= ${2 * g}.`, correct: 2 * g, keywords: ['warmup'] };

  let choices = null;
  if (typeof body.correct === 'number' && isFinite(body.correct) && Math.random() < 0.5) {
    choices = buildChoices(body.correct);
  }

  const { intro, closer } = funWrap((sport || '').toLowerCase());
  return {
    tag: cap(area === 'alg' ? 'Algebra' : area === 'geo' ? 'Geometry' : area === 'tri' ? 'Trigonometry' : area === 'prob' ? 'Probability' : 'Calculus'),
    text: `${intro}<br><br>${body.text}`,
    sample: `${body.sample} ${closer}`,
    correct: body.correct ?? null,
    keywords: (body.keywords || []).map(s => String(s).toLowerCase()),
    choices
  };
}

/* -------------------- LOCAL spawn (no identical repeat) ------------------- */
function ensureKinds(meta) {
  if (meta.area === 'mix') return true;
  return Boolean(CARD_BANK[meta.area]?.[meta.level]);
}
function spawnQuestionForCurrentCombo() { // LOCAL ONLY
  const meta = state.meta;
  if (!meta.area || !meta.level || !meta.grade || !ensureKinds(meta)) return null;
  const deck = ensureDeck(meta);
  if (deck.cursor >= deck.order.length) { deck.order = shuffle(deck.order); deck.cursor = 0; }
  const kind = deck.order[deck.cursor++];
  const q = genByArea(kind, meta.grade, meta.sport, meta.level);
  const recent = deck.recentTexts;
  if (recent.includes(q.text)) { return spawnQuestionForCurrentCombo(); }
  recent.push(q.text); if (recent.length > 12) recent.shift();
  learn(meta.area === 'mix' ? 'mix' : meta.area, meta.level, q);
  return q;
}

/* -------------------- MIXED spawn (AI + LOCAL) ---------------------------- */
/** Tune ratio: 0.0 → always local, 1.0 → always AI */
let AI_CHANCE = 0.75;
window.setAIMixRatio = (p) => { const v = Math.max(0, Math.min(1, Number(p))); AI_CHANCE = isNaN(v) ? AI_CHANCE : v; };

async function spawnMixedQuestionForCurrentCombo() {
  const meta = state.meta;
  const tryAI = Math.random() < AI_CHANCE;
  if (tryAI) {
    try {
      const qAI = await aiBuildQuestion(meta);
      return qAI;
    } catch (e) {
      console.warn('AI failed; falling back to local:', e?.message || e);
      // fall through to local
    }
  }
  return spawnQuestionForCurrentCombo();
}

/* ---------------------- evaluation (numeric/keyword) ---------------------- */
function evaluateAnswer(answer, q) {
  const a = (answer || '').trim();
  if (q && q.correct !== null && q.correct !== undefined) {
    let ok = false;
    if (typeof q.correct === 'number') {
      const num = parseFloat(a.replace(/[^\d.\-]/g, ''));
      ok = isFinite(num) && Math.abs(num - q.correct) <= 0.05;
    } else if (typeof q.correct === 'string') {
      ok = a.toLowerCase().includes(q.correct.toLowerCase());
    }
    const score = ok ? 100 : 0;
    return { score, verdict: ok ? 'Nailedddd! 🏆' : 'Close! Check the hints and try again.', missing: ok ? [] : [String(q.correct)] };
  }
  const uniq = Array.from(new Set(q.keywords || []));
  const hits = uniq.filter(k => a.toLowerCase().includes(k));
  const score = Math.round(100 * hits.length / Math.max(1, uniq.length));
  const verdict = score >= 80 ? 'Excellent — covers most key points.' : score >= 60 ? 'Good — add a few details.' : score >= 40 ? 'Okay — expand on steps.' : 'Needs improvement — add definitions, steps, and a check.';
  return { score, verdict, missing: uniq.filter(k => !hits.includes(k)) };
}

/* ------------------------- history + UI rendering ------------------------- */
const STORAGE_KEY = 'mathTrainerHistoryV4';
function loadHistory() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] } catch { return [] } }
function saveHistory(item) { const d = loadHistory(); d.unshift(item); localStorage.setItem(STORAGE_KEY, JSON.stringify(d.slice(0, 200))); }
function resetHistory() { localStorage.removeItem(STORAGE_KEY); }

function renderChoices(q) {
  const box = $("choices");
  if (!box) return;
  box.innerHTML = "";
  if (!q.choices || !q.choices.length) { box.hidden = true; return; }
  q.choices.forEach(text => {
    const btn = document.createElement('button');
    btn.className = 'choice';
    btn.textContent = text;
    btn.addEventListener('click', () => {
      $("answer").value = text;
      const ok = q.correct !== undefined && q.correct !== null &&
        (typeof q.correct === 'number'
          ? Math.abs(parseFloat(text) - q.correct) <= 0.05
          : String(text).toLowerCase() === String(q.correct).toLowerCase());
      btn.classList.add(ok ? 'correct' : 'wrong');
      setTimeout(() => Array.from(box.children).forEach(c => c.classList.remove('correct', 'wrong')), 900);
    });
    box.appendChild(btn);
  });
  const spacer = document.createElement('div');
  spacer.style.height = '10px';
  box.appendChild(spacer);
  box.hidden = false;
}

function renderQuestion() {
  if (!state.questions.length) {
    $("problem").innerHTML = 'No question yet. Choose inputs and click <em>Generate Questions</em>.';
    $("q-meta").textContent = '—';
    $("status").textContent = '';
    $("answer").value = '';
    clearChoicesBox();
    return;
  }
  const q = state.questions[state.idx];
  const total = state.meta?.qty || state.questions.length;
  $("problem").innerHTML = q.text;
  $("q-meta").textContent = `Q${state.idx + 1}/${total} · ${q.tag} · ${state.meta.level} · Grade ${state.meta.grade}${state.meta.sport ? ' · ' + state.meta.sport : ''}`;
  $("status").textContent = '';
  $("answer").value = '';
  renderChoices(q);
}

function updateHistoryUI() {
  const list = $("history-list"); if (!list) return; const data = loadHistory(); list.innerHTML = '';
  data.slice(0, 10).forEach(r => {
    const li = document.createElement('li');
    const left = document.createElement('span');
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
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const area = $("topic").value;
      const sport = $("hobby").value;
      const level = $("difficulty").value;
      const grade = $("grade").value;
      const qty = Math.max(1, Math.min(30, parseInt(($("qty")?.value || '3'), 10) || 3));

      if (!area) { $("topic").reportValidity?.(); return; }
      if (!sport) { $("hobby").reportValidity?.(); return; }
      if (!level) { $("difficulty").reportValidity?.(); return; }
      if (!grade) { $("grade").reportValidity?.(); return; }

      state = { questions: [], idx: 0, meta: { area, sport, level, grade, qty }, decks: {} };
      ensureDeck(state.meta);

      clearChoicesBox();
      // First question = MIXED
      const first = await spawnMixedQuestionForCurrentCombo();
      if (first) state.questions.push(first);
      renderQuestion();
    });
  }

  $("btn-clear")?.addEventListener('click', () => {
    $("topic").selectedIndex = 0;
    $("hobby").selectedIndex = 0;
    $("difficulty").selectedIndex = 0;
    $("grade").selectedIndex = 0;
    if ($("qty")) $("qty").value = 3;
    $("answer").value = '';
    clearChoicesBox();
    state = { questions: [], idx: 0, meta: { area: '', sport: '', level: '', grade: '', qty: 3 }, decks: {} };
    renderQuestion();
  });

  $("btn-prev")?.addEventListener('click', () => {
    if (!state.questions.length) return;
    state.idx = (state.idx - 1 + state.questions.length) % state.questions.length;
    renderQuestion();
  });

  $("btn-next")?.addEventListener('click', async () => {
    if (!state.meta.area) { alert('Generate a question first.'); return; }
    const cap = parseInt(state.meta.qty, 10) || 1;

    if (cap === 1) {
      const q = await spawnMixedQuestionForCurrentCombo();
      if (q) { state.questions[0] = q; state.idx = 0; renderQuestion(); }
      return;
    }

    if (state.questions.length < cap) {
      const q = await spawnMixedQuestionForCurrentCombo();
      if (q) { state.questions.push(q); state.idx = state.questions.length - 1; renderQuestion(); }
      return;
    }
    state.idx = (state.idx + 1) % state.questions.length;
    renderQuestion();
  });

  $("btn-eval")?.addEventListener('click', () => {
    if (!state.questions.length) { alert('Generate a question first.'); return; }
    const q = state.questions[state.idx];
    const res = evaluateAnswer($("answer").value, q);
    const missingTxt = res.missing && res.missing.length ? ` Missing: <em>${res.missing.slice(0, 6).join(', ')}</em>` : '';
    $("status").innerHTML = `<span class="${res.score >= 60 ? 'ok' : 'bad'}">Score: ${res.score}/100</span> — ${res.verdict}.${missingTxt}`;
    saveHistory({ tag: q.tag, score: res.score, at: Date.now(), level: state.meta.level, grade: state.meta.grade, sport: state.meta.sport });
    updateHistoryUI();
  });

  // (Optional) Old AI button remains; not required anymore.
  $("btn-ai")?.addEventListener('click', async () => {
    try {
      const meta = readMetaOrPrompt();
      if (!meta) return;
      state.meta = { ...state.meta, ...meta };
      const n = meta.qty || 1;

      if (n === 1) {
        const q = await aiBuildQuestion(meta);
        if (state.questions.length) {
          state.questions[state.idx] = q;
        } else {
          state.questions.push(q);
          state.idx = 0;
        }
        clearChoicesBox();
        renderQuestion();
        return;
      }

      for (let i = 0; i < n; i++) {
        const q = await aiBuildQuestion(meta);
        state.questions.push(q);
      }
      state.idx = state.questions.length - 1;
      clearChoicesBox();
      renderQuestion();
    } catch (err) {
      console.error(err);
      alert(`AI Question failed: ${err?.message || 'unknown error'}\n\nTip: run the bridge with "npm run groq" and check http://localhost:8787/api/health`);
    }
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

  $("btn-reset")?.addEventListener('click', () => {
    if (confirm('Reset all saved attempts?')) { resetHistory(); updateHistoryUI(); }
  });

  $("answer")?.addEventListener('keydown', (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') { ev.preventDefault(); $("btn-eval")?.click(); }
  });

  renderQuestion(); updateHistoryUI();
});
