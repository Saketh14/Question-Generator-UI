// script.js — Interactive & “funny” questions via a tiny local LLM (JSON + templates)
'use strict';
const $ = (id) => document.getElementById(id);

/* -------------------------------------------------------------------------- */
/* 0) Tiny “LLM” prompt bank (JSON in-code; no DB, no APIs)                   */
/* -------------------------------------------------------------------------- */
const TOY_LLM = {
  names: ["Rahul", "Aisha", "Maya", "Arjun", "Sam", "Liam", "Zara", "Ishan", "Neha", "Kiran", "Aarav", "Anya"],
  coaches: ["Coach Vector", "Captain Fraction", "Professor Pi", "Sir Integrator", "Ms. Matrix"],
  wrappers: {
    intros: [
      "{emoji} {coach}: Pssst, quick challenge for {name}!",
      "{emoji} Mission time! Help {name} calculate this before the snack timer beeps.",
      "{emoji} Math Quest: {name} needs you on the stats squad.",
      "{emoji} Brain Bat! {name} steps up with a puzzle."
    ],
    closers: [
      "No calculators, just superstar brain cells ⭐",
      "Finish it and do a tiny victory dance 🕺",
      "If stuck, poke the <em>Show Sample Answer</em> button!",
      "Bonus point if you explain it to a rubber duck 🦆"
    ]
  },
  sports: {
    cricket: { emoji: "🏏", noun: "runs", move: "straight drive" },
    football: { emoji: "🏈", noun: "yards", move: "touchdown" },
    soccer: { emoji: "⚽", noun: "goals", move: "nutmeg" },
    basketball: { emoji: "🏀", noun: "points", move: "crossover" },
    tennis: { emoji: "🎾", noun: "points", move: "topspin" }
  },
  // Topic-specific idea “cards” (the generator picks and fills numbers)
  cards: {
    algebra: {
      easy: [
        { kind: "linear_bonus", text: "{name} earns {a} {noun} per success plus a bonus {b} {noun}. Today the total is {T} {noun}. How many successes x did {name} make?" },
        { kind: "average_3", text: "{name} scored {s1}, {s2}, and wants an average of {avg} over 3 games. How many {noun} in game 3? (Let r be the answer.)" }
      ],
      moderate: [
        { kind: "system_sum", text: "A team made {m} shots: some worth 2 {noun}, some 3 {noun}. Total {sum} {noun}. How many of each?" },
        { kind: "target_avg4", text: "After {g1}, {g2}, {g3} {noun}, {name} wants average {avg} over 4 games. How many in game 4?" }
      ],
      hard: [
        { kind: "raise_pct", text: "So far {name} is {made}/{att} on attempts. How many perfect attempts x next game to reach {target}%?" }
      ]
    },
    calculus: {
      easy: [
        { kind: "derivative_quad", text: "A {sport} ball tracks f(t)={m}t²+{b}t. Find f'(t). What rule is this?" },
        { kind: "area_linear", text: "Acceleration a(t)={k}t+{c}. Compute ∫₀¹ a(t) dt (change in speed during a 1-s burst)." }
      ],
      moderate: [
        { kind: "product", text: "f(t)=(t²+{c})e^t. Differentiate using the product rule." },
        { kind: "chain", text: "g(t)=({a}t²+1)³. Find g'(t) using the chain rule." }
      ],
      hard: [
        { kind: "opt_perim", text: "A rectangular {sport} zone has fixed perimeter {P} m. What dimensions maximize area? (Calc or AM-GM.)" }
      ]
    },
    geometry: {
      easy: [
        { kind: "rect_pa", text: "A mini {sport} court has length {L} m and width {W} m. Find its perimeter and area." }
      ],
      moderate: [
        { kind: "pythag", text: "A {sport} drill makes a right triangle path with legs {a} and {b}. Find the hypotenuse." }
      ],
      hard: [
        { kind: "similar_scale", text: "Scale a triangular {sport} marker by {s}:1. Original base {base}, height {height}. What are the scaled dimensions?" }
      ]
    },
    trigonometry: {
      easy: [
        { kind: "ramp_ratios", text: "A {sport} ramp rises {opp} over a run of {adj}. Compute sinθ, cosθ, tanθ." }
      ],
      moderate: [
        { kind: "angle_elev", text: "From {d} m away, a {sport} coach looks up {h} m. Find the angle of elevation (°)." }
      ],
      hard: [
        { kind: "solve_sin", text: "Solve 0°≤x<360°: 2sin x = √3 (visualize a {sport} serve arc)." }
      ]
    },
    probability: {
      easy: [
        { kind: "coin", text: "A coin toss decides who starts a {sport} game. Probability of two heads in a row?" }
      ],
      moderate: [
        { kind: "perm", text: "From {n} {sport} players, how many ways to choose captain & vice-captain (order matters)?" }
      ],
      hard: [
        { kind: "binom_ev", text: "Each {sport} attempt succeeds with p={p}. In {trials} attempts, what’s the expected number of successes?" }
      ]
    }
  }
};

/* -------------------------------------------------------------------------- */
/* 1) Helpers                                                                  */
/* -------------------------------------------------------------------------- */
const SPORTS = Object.keys(TOY_LLM.sports);
function validSport(s) { return SPORTS.includes((s || '').toLowerCase()); }
function sportOrDefault(s) { return s ? (validSport(s) ? s.toLowerCase() : '') : ''; }
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;

/* Build fun wrapper line */
function wrapWithHumor(sportKey, name) {
  const sport = TOY_LLM.sports[sportKey] || { emoji: "🧠" };
  const coach = pick(TOY_LLM.coaches);
  const intro = pick(TOY_LLM.wrappers.intros)
    .replace("{emoji}", sport.emoji)
    .replace("{coach}", coach)
    .replace("{name}", name);
  const closer = pick(TOY_LLM.wrappers.closers);
  return { intro, closer };
}

/* MCQ helpers */
function buildChoices(correct, isNumber = true) {
  const opts = new Set([String(correct)]);
  const base = typeof correct === "number" ? correct : parseFloat(correct);
  if (isFinite(base)) {
    for (let d of [-2, -1, 1, 2, 3, -3]) {
      if (opts.size >= 4) break;
      opts.add(String(base + d));
    }
  }
  while (opts.size < 4) { opts.add(String(Math.floor(Math.random() * 9) + 1)); }
  const arr = Array.from(opts);
  // shuffle
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

/* -------------------------------------------------------------------------- */
/* 2) Tiny generator (“toy-LLM”)                                               */
/* -------------------------------------------------------------------------- */

function llmGenerate({ area, level, grade, sport: sportKey }) {
  const name = pick(TOY_LLM.names);
  const sport = TOY_LLM.sports[sportKey] || { emoji: "🧠", noun: "points", move: "move" };
  const { intro, closer } = wrapWithHumor(sportKey, name);

  const cards = TOY_LLM.cards[area]?.[level];
  if (!cards || !cards.length) return null;
  const card = pick(cards);

  const g = Math.max(7, Math.min(10, +grade || 7));
  let text = "", sample = "", correct = null, keywords = [];

  switch (card.kind) {
    // ---------- Algebra ----------
    case "linear_bonus": {
      const a = 2 + (g % 3);
      const b = 3 + (g % 2);
      const x = 3 + Math.floor(Math.random() * 5);
      const T = a * x + b;
      text = card.text
        .replace("{name}", name).replaceAll("{a}", a).replaceAll("{b}", b)
        .replaceAll("{T}", T).replaceAll("{noun}", sport.noun);
      sample = `Model: ${a}x + ${b} = ${T}. Subtract ${b} ⇒ ${a}x = ${T - b}. Divide by ${a} ⇒ x = ${(T - b) / a}. ${closer}`;
      correct = (T - b) / a; keywords = ["linear", "equation", String(a), String(b), String(T)];
      break;
    }
    case "average_3": {
      const s1 = 10 + g, s2 = 8 + Math.floor(Math.random() * 6);
      const avg = 15 + (g % 4);
      const total = avg * 3, r = total - (s1 + s2);
      text = card.text.replace("{name}", name).replace("{s1}", s1).replace("{s2}", s2)
        .replace("{avg}", avg).replaceAll("{noun}", sport.noun);
      sample = `Total needed = ${avg}×3 = ${total}. So far = ${s1}+${s2}. Need r = ${r}. ${closer}`;
      correct = r; keywords = ["average", String(avg), String(total)];
      break;
    }
    case "system_sum": {
      const m = 30 + (g % 8);
      // choose a consistent solution, then back-compute sum
      const y3 = 10 + (g % 5);
      const y2 = m - y3;
      const sum = 2 * y2 + 3 * y3;
      text = card.text.replace("{m}", m).replace("{sum}", sum).replaceAll("{noun}", sport.noun);
      sample = `Let x=2-pointers, y=3-pointers. x+y=${m}; 2x+3y=${sum}. Solve ⇒ y=${y3}, x=${y2}. ${closer}`;
      correct = `${y2} twos & ${y3} threes`; keywords = ["system", "2x+3y", String(sum), String(m)];
      break;
    }
    case "target_avg4": {
      const g1 = 12 + (g % 5), g2 = 9 + (g % 4), g3 = 15 + (g % 6);
      const avg = 12 + (g % 5);
      const need = avg * 4 - (g1 + g2 + g3);
      text = card.text.replace("{g1}", g1).replace("{g2}", g2).replace("{g3}", g3)
        .replace("{avg}", avg).replaceAll("{noun}", sport.noun).replace("{name}", name);
      sample = `Need ${avg}×4=${avg * 4}. Have ${g1}+${g2}+${g3}=${g1 + g2 + g3}. Game 4 = ${need}. ${closer}`;
      correct = need; keywords = ["average", String(avg)];
      break;
    }
    case "raise_pct": {
      const made = 10 + (g % 6), att = 15 + (g % 7), target = 70 + (g % 4) * 5;
      const p = target / 100;
      const x = Math.max(0, Math.ceil((p * att - made) / (1 - p)));
      text = card.text.replace("{name}", name).replace("{made}", made).replace("{att}", att)
        .replace("{target}", target);
      sample = `(m+x)/(a+x) ≥ ${target}/100. Solve ⇒ x ≥ ${x}. ${closer}`;
      correct = x; keywords = ["percentage", String(target)];
      break;
    }

    // ---------- Calculus ----------
    case "derivative_quad": {
      const m = 2 + (g % 6), b = 3 + (g % 4);
      text = card.text.replace("{m}", m).replace("{b}", b).replace("{sport}", sportKey || "sport");
      sample = `Power rule ⇒ f'(t)=${2 * m}t+${b}. ${closer}`;
      correct = `${2 * m}t + ${b}`; keywords = ["derivative", "power rule"];
      break;
    }
    case "area_linear": {
      const k = 2 + (g % 4), c = 1 + (g % 3);
      const val = k / 2 + c;
      text = card.text.replace("{k}", k).replace("{c}", c);
      sample = `∫₀¹ (${k}t+${c}) dt = [${k / 2}t² + ${c}t]₀¹ = ${val}. ${closer}`;
      correct = val; keywords = ["integral", "definite"];
      break;
    }
    case "product": {
      const c = 1 + (g % 5);
      text = card.text.replace("{c}", c);
      sample = `f'=(2t)e^t + (t²+${c})e^t = (2t + t² + ${c})e^t. ${closer}`;
      correct = "(2t + t² + c)e^t"; keywords = ["product rule"];
      break;
    }
    case "chain": {
      const a = 2 + (g % 3);
      text = card.text.replace("{a}", a);
      sample = `g'=3(${a}t²+1)²·(2${a}t) = ${6 * a}t(${a}t²+1)². ${closer}`;
      correct = `${6 * a}t(${a}t²+1)²`; keywords = ["chain rule"];
      break;
    }
    case "opt_perim": {
      // UPDATED: add randomness so {P} is truly “generated”
      const P = 40 + 2 * g + 2 * Math.floor(Math.random() * 6); // 40+ .. 50+ depending on grade
      text = card.text.replace("{P}", P).replace("{sport}", sportKey || "sport");
      sample = `Max area at square ⇒ L=W=${P / 4}. Use derivative or AM-GM. ${closer}`;
      correct = P / 4; keywords = ["optimize", "perimeter"];
      break;
    }

    // ---------- Geometry ----------
    case "rect_pa": {
      const L = 12 + g + Math.floor(Math.random() * 3);
      const W = 6 + (g % 5) + Math.floor(Math.random() * 2);
      text = card.text.replace("{L}", L).replace("{W}", W).replace("{sport}", sportKey || "sport");
      sample = `Perimeter 2(L+W)=${2 * (L + W)}; Area L·W=${L * W}. ${closer}`;
      correct = `${2 * (L + W)} & ${L * W}`; keywords = ["perimeter", "area"];
      break;
    }
    case "pythag": {
      const a = 6 + (g % 3), b = 8 + (g % 4);
      const c = Math.hypot(a, b).toFixed(2);
      text = card.text.replace("{a}", a).replace("{b}", b).replace("{sport}", sportKey || "sport");
      sample = `c=√(${a}²+${b}²)=${c}. ${closer}`;
      correct = parseFloat(c); keywords = ["pythagoras", "hypotenuse"];
      break;
    }
    case "similar_scale": {
      const s = 2 + (g % 2), base = 10 + g, height = 7 + (g % 5);
      text = card.text.replace("{s}", s).replace("{base}", base).replace("{height}", height).replace("{sport}", sportKey || "sport");
      sample = `Scaled base=${base * s}, height=${height * s}. ${closer}`;
      correct = `${base * s} & ${height * s}`; keywords = ["similar", "scale"];
      break;
    }

    // ---------- Trig ----------
    case "ramp_ratios": {
      const opp = 3 + (g % 3), adj = 4 + (g % 4), hyp = Math.hypot(opp, adj).toFixed(2);
      text = card.text.replace("{opp}", opp).replace("{adj}", adj).replace("{sport}", sportKey || "sport");
      sample = `sinθ=${opp}/${hyp}, cosθ=${adj}/${hyp}, tanθ=${opp}/${adj}. ${closer}`;
      correct = `sin=${(opp / hyp).toFixed(2)}`; keywords = ["sin", "cos", "tan"];
      break;
    }
    case "angle_elev": {
      const h = 10 + (g % 5), d = 15 + (g % 4);
      const angle = (Math.atan(h / d) * 180 / Math.PI).toFixed(1);
      text = card.text.replace("{h}", h).replace("{d}", d).replace("{sport}", sportKey || "sport");
      sample = `tanθ=h/d=${h}/${d} ⇒ θ≈${angle}°. ${closer}`;
      correct = parseFloat(angle); keywords = ["angle", "tan"];
      break;
    }
    case "solve_sin": {
      text = card.text.replace("{sport}", sportKey || "sport");
      sample = `sin x=√3/2 ⇒ x=60°,120°. ${closer}`;
      correct = "60°, 120°"; keywords = ["solve", "sin"];
      break;
    }

    // ---------- Probability ----------
    case "coin": {
      text = card.text.replace("{sport}", sportKey || "sport");
      sample = `Independent tosses ⇒ 1/2 × 1/2 = 1/4. ${closer}`;
      correct = 0.25; keywords = ["independent", "1/4", "0.25"];
      break;
    }
    case "perm": {
      const n = 6 + (g % 5);
      text = card.text.replace("{n}", n).replace("{sport}", sportKey || "sport");
      sample = `Order matters ⇒ P(${n},2)=${n}×(${n - 1})=${n * (n - 1)}. ${closer}`;
      correct = n * (n - 1); keywords = ["permutation", String(n)];
      break;
    }
    case "binom_ev": {
      const p = 0.5 + (g % 3) * 0.1; const trials = 10;
      text = card.text.replace("{p}", p.toFixed(1)).replace("{trials}", trials).replace("{sport}", sportKey || "sport");
      sample = `E=np=${trials}×${p.toFixed(1)}=${(trials * p).toFixed(1)}. ${closer}`;
      correct = parseFloat((trials * p).toFixed(1)); keywords = ["binomial", "expected"];
      break;
    }
  }

  // Build MCQ sometimes (50% chance) if correct is numeric
  let choices = null;
  if (typeof correct === "number" && Math.random() < 0.5) {
    choices = buildChoices(correct, true);
  }

  const funnyLead = `${intro}<br><br>`;
  return {
    tag: cap(area),
    // FIXED: return the **filled** text (was returning unfilled card.text before)
    text: funnyLead + text,
    sample,
    correct,
    choices,
    keywords: (keywords || []).map(k => String(k).toLowerCase())
  };
}

/* -------------------------------------------------------------------------- */
/* 3) Backward-compatible makeQuestions                                       */
/* -------------------------------------------------------------------------- */
function makeQuestions(area, hobby, level, grade, count = 3) {
  const sport = sportOrDefault(hobby);
  const list = [];
  for (let i = 0; i < count; i++) {
    const topic = (area === 'mix') ? pick(['algebra', 'calculus', 'geometry', 'trigonometry', 'probability']) : area;
    const q = llmGenerate({ area: topic, level, grade, sport });
    if (q) list.push(q);
  }
  return list.length ? list : [{
    tag: 'Oops',
    text: 'Could not generate a question. Try different settings.',
    sample: 'Change topic/level and try again.',
    keywords: []
  }];
}

/* -------------------------------------------------------------------------- */
/* 4) Evaluation: exact check (if q.correct) + keyword fallback               */
/* -------------------------------------------------------------------------- */
function evaluateAnswer(answer, q) {
  const a = (answer || '').trim();
  // Exact numeric/string if we know the correct answer
  if (q && q.correct !== null && q.correct !== undefined) {
    let ok = false;
    if (typeof q.correct === 'number') {
      const num = parseFloat(a.replace(/[^\d.\-]/g, ''));
      ok = isFinite(num) && Math.abs(num - q.correct) <= 0.05; // small tolerance
    } else {
      ok = a.toLowerCase().includes(String(q.correct).toLowerCase());
    }
    const score = ok ? 100 : 0;
    const verdict = ok ? 'Nailedddd! 🏆' : 'Close! Check the hints and try again.';
    return { score, verdict, missing: ok ? [] : [String(q.correct)] };
  }
  // Fallback: keyword scoring
  const uniq = Array.from(new Set(q.keywords || []));
  const hits = uniq.filter(k => a.toLowerCase().includes(k));
  const score = Math.round(100 * hits.length / Math.max(1, uniq.length));
  const verdict = score >= 80 ? 'Excellent — covers most key points.' :
    score >= 60 ? 'Good — add a few details.' :
      score >= 40 ? 'Okay — expand on steps.' :
        'Needs improvement — add definitions, steps, and a check.';
  return { score, verdict, missing: uniq.filter(k => !hits.includes(k)) };
}

/* -------------------------------------------------------------------------- */
/* 5) State, history, UI (unchanged + MCQ wiring)                             */
/* -------------------------------------------------------------------------- */
let state = { questions: [], idx: 0, meta: { area: '', sport: '', level: '', grade: '' } };
const STORAGE_KEY = 'mathTrainerHistoryV2';
function loadHistory() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] } catch { return [] } }
function saveHistory(item) { const d = loadHistory(); d.unshift(item); localStorage.setItem(STORAGE_KEY, JSON.stringify(d.slice(0, 150))); }
function resetHistory() { localStorage.removeItem(STORAGE_KEY); }

function renderChoices(q) {
  const box = $("choices");
  box.innerHTML = "";
  box.hidden = !q.choices || !q.choices.length;
  if (box.hidden) return;

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
      setTimeout(() => { Array.from(box.children).forEach(c => c.classList.remove('correct', 'wrong')); }, 900);
    });
    box.appendChild(btn);
  });
}

function renderQuestion() {
  if (!state.questions.length) {
    $("problem").innerHTML = 'No question yet. Choose an area and click <em>Generate Questions</em>.';
    $("q-meta").textContent = '—'; $("status").textContent = ''; $("answer").value = ''; $("choices").hidden = true;
    return;
  }
  const q = state.questions[state.idx];
  $("problem").innerHTML = q.text;
  $("q-meta").textContent = `Q${state.idx + 1}/${state.questions.length} · ${q.tag} · ${state.meta.level} · Grade ${state.meta.grade}${state.meta.sport ? ' · ' + state.meta.sport : ''}`;
  $("status").textContent = ''; $("answer").value = '';
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

/* -------------------------------------------------------------------------- */
/* 6) Bindings                                                                */
/* -------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  const form = $("generator-form");
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const area = $("topic").value;
      const sport = $("hobby").value;     // optional
      const level = $("difficulty").value;
      const grade = $("grade").value;
      const qty = Math.max(1, Math.min(30, parseInt(($("qty")?.value || '3'), 10) || 3));
      if (!area) { $("topic").reportValidity?.(); return; }
      if (!level) { $("difficulty").reportValidity?.(); return; }
      if (!grade) { $("grade").reportValidity?.(); return; }

      state.questions = makeQuestions(area, sport, level, grade, qty);
      state.idx = 0; state.meta = { area, sport, level, grade };
      renderQuestion();
    });
  }

  $("btn-clear")?.addEventListener('click', () => {
    $("topic").selectedIndex = 0; $("hobby").selectedIndex = 0; $("difficulty").selectedIndex = 0; $("grade").selectedIndex = 0; $("answer").value = '';
    $("qty").value = 3;
    state = { questions: [], idx: 0, meta: { area: '', sport: '', level: '', grade: '' } };
    renderQuestion();
  });

  $("btn-prev")?.addEventListener('click', () => { if (!state.questions.length) return; state.idx = (state.idx - 1 + state.questions.length) % state.questions.length; renderQuestion(); });
  $("btn-next")?.addEventListener('click', () => { if (!state.questions.length) return; state.idx = (state.idx + 1) % state.questions.length; renderQuestion(); });

  $("btn-eval")?.addEventListener('click', () => {
    if (!state.questions.length) { alert('Generate a question first.'); return; }
    const q = state.questions[state.idx];
    const result = evaluateAnswer($("answer").value, q);
    const missingTxt = result.missing && result.missing.length ? ` Missing: <em>${result.missing.slice(0, 6).join(', ')}</em>` : '';
    $("status").innerHTML = `<span class="${result.score >= 60 ? 'ok' : 'bad'}">Score: ${result.score}/100</span> — ${result.verdict}.${missingTxt}`;
    saveHistory({ tag: q.tag, score: result.score, at: Date.now(), level: state.meta.level, grade: state.meta.grade, sport: state.meta.sport });
    updateHistoryUI();
  });

  $("btn-sample")?.addEventListener('click', () => {
    if (!state.questions.length) return;
    const q = state.questions[state.idx];
    $("status").innerHTML = `<em>Hints / sample:</em> ${q.sample}`;
  });

  $("btn-copy")?.addEventListener('click', async () => {
    if (!state.questions.length) return;
    try {
      await navigator.clipboard.writeText($("problem").innerText);
      $("status").textContent = 'Question copied to clipboard.';
    } catch { $("status").textContent = 'Copy failed. Select and copy manually.'; }
  });

  $("btn-reset")?.addEventListener('click', () => { if (confirm('Reset all saved attempts?')) { resetHistory(); updateHistoryUI(); } });

  $("answer")?.addEventListener('keydown', (ev) => { if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') { ev.preventDefault(); $("btn-eval")?.click(); } });

  renderQuestion(); updateHistoryUI();
});
