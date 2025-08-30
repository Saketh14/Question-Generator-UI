// script.js — model-only; exact N; 50/50 MCQ/Open; strong de-dupe; no same pattern; concise 3-line solutions
'use strict';
const $ = (id) => document.getElementById(id);

/* ----------------------------- tiny utilities ----------------------------- */
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const MAX_QUESTIONS = 5;
const setProgress = (text) => { const el = $('progress'); if (el) el.textContent = text; };
const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const extractNums = (s) => (String(s || '').match(/-?\d+(\.\d+)?/g) || []).slice(0, 40);

/* ---------------------- friendly user-facing messages --------------------- */
function userMessageFromError(e) {
  const s = String(e && e.message || e || '').toLowerCase();
  if (/failed to fetch|networkerror|typeerror|cors|blocked/.test(s))
    return "Network hiccup. Please check your connection and try again.";
  if (/timeout|timed out|504/.test(s))
    return "It’s taking a bit long. Let’s try that again.";
  if (/not found|404/.test(s))
    return "The generator isn’t reachable right now. Please try again.";
  if (/unauthorized|401|forbidden|403|api key/.test(s))
    return "The generator is warming up. Please try again shortly.";
  if (/rate.?limit|429|quota|too many/.test(s))
    return "Lots of traffic right now—try again in a few seconds.";
  if (/payment|402|billing|credit/.test(s))
    return "We’re temporarily out of capacity. Please try again later.";
  if (/invalid json|parse|schema|422|bad request/.test(s))
    return "That request didn’t go through cleanly. One more try should fix it.";
  return "Something unexpected happened. Please try again.";
}

/* ----------------------------- sports nouns ------------------------------- */
const SPORTS = {
  cricket: { emoji: "🏏", noun: "runs", unit: "runs", field: "pitch" },
  football: { emoji: "🏈", noun: "yards", unit: "yards", field: "field" },
  soccer: { emoji: "⚽", noun: "goals", unit: "goals", field: "pitch" },
  basketball: { emoji: "🏀", noun: "points", unit: "points", field: "court" },
  tennis: { emoji: "🎾", noun: "points", unit: "points", field: "court" }
};
const sportEmoji = (s) => (SPORTS[(s || '').toLowerCase()]?.emoji || '🧠');

/* --------------------------- persistent “learning” ------------------------ */
const LEARN_KEY = 'trainerLearnedV4';
function comboLearnKey(meta) {
  return `${(meta.area || '').toLowerCase()}|${(meta.level || '').toLowerCase()}|${(meta.grade || '').toLowerCase()}|${(meta.sport || '').toLowerCase()}`;
}
function loadLearned() { try { return JSON.parse(localStorage.getItem(LEARN_KEY)) || {} } catch { return {} } }
function saveLearned(store) { localStorage.setItem(LEARN_KEY, JSON.stringify(store)); }
function learn(meta, q) {
  const key = comboLearnKey(meta);
  const store = loadLearned(); store[key] = store[key] || [];
  const rec = { text: q.plainProblem || q.text, sample: q.solution_html || q.sample, correct: q.correct, choices: q.choices || [] };
  if (!store[key].some(e => norm(e.text) === norm(rec.text))) {
    store[key].unshift(rec);
    store[key] = store[key].slice(0, 400);
    saveLearned(store);
  }
}
function getLearned(meta) { const store = loadLearned(); return store[comboLearnKey(meta)] || []; }

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
  const intro = pick(INTROS)
    .replace("{emoji}", sp.emoji)
    .replace("{coach}", pick(COACHES))
    .replace("{name}", pick(NAMES));
  const closer = pick(CLOSERS);
  return { intro, closer, emoji: sp.emoji };
}

/* ------------------------------ global state ------------------------------ */
function comboKey(meta) {
  return `${(meta.area || '').toLowerCase()}|${(meta.level || '').toLowerCase()}|${(meta.grade || '').toLowerCase()}|${(meta.sport || '').toLowerCase()}`;
}
let state = {
  questions: [],
  idx: 0,
  meta: { area: '', sport: '', level: '', grade: '', qty: 3 },
  seen: {},             // text-level de-dupe per comboKey
  seenPatterns: {},     // pattern-signature de-dupe per comboKey
  mcqCount: 0,
  openCount: 0
};

/* -------------------------- history key + helpers ------------------------- */
const STORAGE_KEY = 'mathTrainerHistoryV4';
function loadHistory() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] } catch { return [] } }
function resetHistory() { localStorage.removeItem(STORAGE_KEY); }

/* -------------------------------- helpers --------------------------------- */
function metaToArea(meta) {
  const m = (meta.area || '').toLowerCase();
  if (['algebra', 'geometry', 'trigonometry', 'probability', 'calculus', 'mix'].includes(m)) return m;
  return 'algebra';
}

/* ---- FUN-ONLY guard for grades 4–6 (defense-in-depth, client-side) ------ */
const FUN_FORBIDDEN_PATTERNS = [
  /\bsolve\s+for\s+[a-z]\b/i, /\bvariable\b/i, /\bequation\b/i,
  /\bpolynomial|quadratic|factor(?:ise|ize)|simplify\b/i,
  /\bexponent|power\b/i, /\btrig|sine|cosine|tangent|sin\(|cos\(|tan\(/i,
  /\bmatrix|determinant|vector\b/i, /\bderivative|integral|calculus\b/i,
  /\btheorem|proof\b/i, /\blog\(\s*\d?/i, /[xyz]\s*=/i, /[a-z]\s*\^\s*\d/i, /√|∠/
];
function violatesFun(meta, text) {
  const g = Number(meta?.grade || 0);
  if (!(g >= 4 && g <= 6)) return false;
  const t = String(text || '');
  return FUN_FORBIDDEN_PATTERNS.some(rx => rx.test(t));
}

/* ----------------------------- pattern signature -------------------------- */
/* mask numbers/units/common cues → detect template reuse */
const UNIT_WORDS = [
  'km', 'kilometers', 'meter', 'meters', 'm', 'cm', 'centimeters', 'mm', 'minutes', 'minute', 'hours', 'hour', 'h', 'sec', 'second', 'seconds',
  'rupees', 'rs', 'dollars', '$', 'cents', 'percent', '%', 'yards', 'yard', 'miles', 'mile', 'mi', 'lbs', 'kg', 'kilograms'
];
function patternSignature(s) {
  let t = String(s || '').toLowerCase();
  // mask numbers (including decimals/fractions)
  t = t.replace(/-?\d+(\.\d+)?/g, '#');
  // mask simple fractions like 3/4
  t = t.replace(/\b#\/#\b/g, '#/#');
  // mask time formats
  t = t.replace(/\b#(?::#){1,2}\b/g, '#:#');
  // mask units/keywords
  const unitRx = new RegExp(`\\b(${UNIT_WORDS.join('|')})\\b`, 'g');
  t = t.replace(unitRx, 'U');
  // collapse whitespace & punctuation spacing
  t = t.replace(/[^\w#\/]+/g, ' ').replace(/\s+/g, ' ').trim();
  return t;
}

/* --------------------------- JSON parsing helpers ------------------------- */
function jsonExtract(text) {
  if (!text) return null;
  text = text.replace(/```(?:json)?/gi, '```');
  if (text.includes('```')) {
    const m = text.match(/```([\s\S]*?)```/);
    if (m && m[1]) text = m[1].trim();
  }
  try { return JSON.parse(text); } catch { }
  const start = text.indexOf('{'), end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch { }
  }
  const rx = /{[\s\S]*?"problem"[\s\S]*?}/g; const match = rx.exec(text);
  if (match) { try { return JSON.parse(match[0]); } catch { } }
  return null;
}

function sanitizePayload(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Invalid LLM JSON.');
  let { problem, choices, answer_index, solution_html } = payload;
  if (typeof problem !== 'string' || !problem.trim()) throw new Error('Missing problem.');
  const hasMCQ = Array.isArray(choices);

  if (hasMCQ) {
    if (choices.length !== 4) throw new Error('Choices must have 4 options.');
    choices = choices.map(c => String(c ?? '').trim());
    if (choices.some(c => !c)) throw new Error('Empty choice detected.');
    const idx = Number(answer_index);
    if (!Number.isInteger(idx) || idx < 0 || idx > 3) throw new Error('answer_index must be 0..3.');
    solution_html = String(solution_html ?? '').trim();
    return { type: 'mcq', problem: problem.trim(), choices, answer_index: idx, solution_html };
  } else {
    solution_html = String(solution_html ?? '').trim();
    return { type: 'open', problem: problem.trim(), solution_html };
  }
}

/* ------------------------------- LLM bridge ------------------------------- */
async function llmAsk(messagesOrString, { retries = 2, delayMs = 300, max_tokens } = {}) {
  if (!window.LLM || typeof window.LLM.ask !== 'function') {
    throw new Error('LLM bridge missing.');
  }
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      let res;
      if (Array.isArray(messagesOrString)) {
        res = await window.LLM.ask(messagesOrString, { max_tokens });
        if (!res || !String(res).trim()) {
          const joined = messagesOrString.map(m => `${m.role.toUpperCase()}:\n${m.content}`).join('\n\n');
          res = await window.LLM.ask(joined, { max_tokens });
        }
      } else {
        res = await window.LLM.ask(messagesOrString, { max_tokens });
      }
      res = typeof res === 'string' ? res.trim() : String(res ?? '').trim();
      if (res) return res;
      throw new Error('Empty response from LLM.');
    } catch (e) {
      lastErr = e;
      if (attempt < retries) { await sleep(delayMs * (attempt + 1)); continue; }
      throw lastErr || new Error('LLM failed.');
    }
  }
}

/* ------------------------------- prompts ---------------------------------- */
async function aiQuestionMessages(meta, dedupHints = [], indexInBatch = 0, attempt = 0, banNumbers = [], patternSigs = []) {
  const area = metaToArea(meta);
  const level = meta.level || 'easy';
  const grade = meta.grade || '8';
  const sport = (meta.sport || 'basketball').toLowerCase();

  // fun-only flag for grades 4–6
  const funOnly = Number(grade) >= 4 && Number(grade) <= 6;

  // Pull a few learned + session dedup hints
  const learned = getLearned(meta).slice(0, 8).map(r => r.text).filter(Boolean);
  const avoidTexts = [...learned, ...dedupHints].slice(-16).join("\n---\n");
  const banned = Array.from(new Set(banNumbers)).slice(-20).join(", ");
  const patternAvoid = Array.from(new Set(patternSigs)).slice(-16);

  const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const makeMCQ = indexInBatch % 2 === 0; // alternate MCQ/Open

  const schema = makeMCQ
    ? { problem: "string", choices: "string[4]", answer_index: "integer 0..3", solution_html: "string" }
    : { problem: "string", solution_html: "string" };

  const instructions = makeMCQ
    ? `Return JSON ONLY with keys: problem, choices (4 strings), answer_index (0..3), solution_html.`
    : `Return JSON ONLY with keys: problem, solution_html. No choices.`;

  const strict =
    attempt > 0
      ? `\nSTRICT DIFFERENCE:\n- Change SCENARIO, VERBS, UNITS, and NUMBERS.\n- Do NOT reuse any sentence or template from AVOID_SIMILAR_TO.\n- Avoid these numbers entirely: [${banned}].\n- Avoid these PATTERN SIGNATURES: ${JSON.stringify(patternAvoid)}.\n- Ensure the new problem shares at most ~50% tokens with AVOID_SIMILAR_TO.` +
      (funOnly ? `\nSTRICT FUN-ONLY: Remove variables/equations and advanced topics. Use sports/games/food/daily-life.` : ``)
      : ``;

  const varietyGuide =
    `You are Math Trainer LLM. Generate playful, rigorous ${makeMCQ ? "MCQ" : "open-ended"} math problems.
Constraints:
- 2–4 sentences; use concrete numbers; solvable; no spoilers in problem text.
- Keep difficulty and vocabulary to the selected grade.
- ${makeMCQ ? "Include exactly 4 plausible MCQ options with ONE correct (similar magnitude; no giveaways)." : "Do NOT include choices."}
- The problem MUST be NEW for this (area, level, grade, sport) combo, DIFFER from recent items, and DIFFERENT TEMPLATE than prior ones.
- Rotate skill focus across a batch: pick a different skill each time (e.g., sums/differences, unit rates, fractions/percents, averages, ratio, perimeter/area, time, simple probability; for upper grades: linear equations, factorization, systems, similarity, trig basics).
- Produce JSON only.
Tone: Friendly, concise classroom coach.${funOnly ? `
FUN-ONLY for Grades 4–6:
- Contexts: sports, playground games, food, time, money, school life.
- Math: +, −, ×, ÷; small whole numbers; simple fractions/percents; unit rates; perimeter/area of rectangles; elapsed time; measurements.
- NO: variables/equations, factorization, polynomials, trigonometry, exponents, matrices, derivatives, theorems.
- Keep language simple; may include one emoji; 2–4 sentences.` : ''}`;

  const userPayload = {
    REQUIREMENTS: {
      AREA: area, LEVEL: level, GRADE: grade, SPORT: sport,
      STYLE: "2-4 sentences", UNIQUE_CORRECT: true, NO_SPOILERS_IN_PROBLEM: true,
      PAIR_INDEX: indexInBatch, TYPE: makeMCQ ? "MCQ" : "OPEN", FUN_ONLY: funOnly
    },
    AVOID_SIMILAR_TO: avoidTexts || "—",
    BAN_NUMBERS: banned || "—",
    PATTERN_SIGNATURES_TO_AVOID: patternAvoid,
    SEED: seed,
    FORMAT: { type: "json", schema }
  };

  return [
    { role: "system", content: varietyGuide.trim() },
    { role: "user", content: JSON.stringify(userPayload) + "\n" + instructions + strict }
  ];
}

async function aiSampleMessages(meta, plainProblem) {
  const area = metaToArea(meta);
  const level = meta.level || 'easy';
  const grade = meta.grade || '8';
  return [
    {
      role: "system",
      content:
        "You are Math Trainer LLM Solver. Output ONLY HTML with <br> for new lines. " +
        "Write EXACTLY 3 very short lines: (1) key step, (2) compute, (3) <strong>Answer: ...</strong>. " +
        "No prefaces like 'To find' or 'We need to'. Allowed tags: <br> and <strong> only. " +
        "Keep total under 360 characters."
    },
    {
      role: "user",
      content:
        `Solve this grade ${grade} ${area} problem (difficulty: ${level}):

${plainProblem}

Format (exactly 3 lines):
line1: minimal setup or formula
line2: compact computation
line3: <strong>Answer: ...</strong>

Rules:
- Use numbers/symbols only; no prose.
- Only <br> and <strong>.
- Under 360 characters.`
    }
  ];
}

/* --------------------------- builders (MCQ/open) -------------------------- */
async function aiBuildQuestion(meta, dedupHints = [], indexInBatch = 0, attempt = 0, banNumbers = [], patternSigs = []) {
  const msgs = await aiQuestionMessages(meta, dedupHints, indexInBatch, attempt, banNumbers, patternSigs);
  const raw = await llmAsk(msgs, { max_tokens: 360 });
  const parsed = jsonExtract(raw);
  if (!parsed) throw new Error('LLM did not return valid JSON.');
  const data = sanitizePayload(parsed);

  const { intro, closer } = funWrap((meta.sport || '').toLowerCase());
  const emoji = sportEmoji(meta.sport);

  const q = {
    tag: cap(meta.area === 'mix' ? 'Mixed' : meta.area),
    plainProblem: data.problem,
    text: `${intro}<br><br>${emoji} ${data.problem}<br><br><small>${closer}</small>`,
    solution_html: '', // always generate concise solution on demand
    keywords: []
  };

  if (data.type === 'mcq') {
    q.choices = data.choices;
    q.answer_index = data.answer_index;
    q.correct = data.choices[data.answer_index] ?? null;
  } else {
    q.choices = null;
    q.answer_index = null;
    q.correct = null;
  }

  // Guards
  if (violatesFun(meta, q.plainProblem)) {
    throw new Error('Needs fun-only content'); // triggers stricter retry
  }

  // Pattern signature de-dupe
  const sig = patternSignature(q.plainProblem);
  if (!sig) throw new Error('Malformed question text');
  const key = comboKey(meta);
  state.seenPatterns[key] = state.seenPatterns[key] || new Set();
  if (state.seenPatterns[key].has(sig)) {
    throw new Error('Same pattern detected'); // force retry with different template
  }

  learn(meta, q);
  return q;
}

/* ---------- ensure NEW question each time for a combo with retries -------- */
async function generateUniqueQuestion(meta, indexInBatch = 0) {
  const key = comboKey(meta);
  state.seen[key] = state.seen[key] || new Set();
  state.seenPatterns[key] = state.seenPatterns[key] || new Set();
  const seenSet = state.seen[key];
  const patternSet = state.seenPatterns[key];

  // Build recent problems + a list of banned numbers + patterns to avoid
  const recentTexts = Array.from(seenSet).slice(-16);
  const bannedNumbers = recentTexts.flatMap(extractNums).slice(-40);
  const patternSigs = Array.from(patternSet).slice(-16);

  for (let attempt = 0; attempt < 7; attempt++) { // more attempts, stricter each round
    try {
      const q = await aiBuildQuestion(meta, recentTexts, indexInBatch, attempt, bannedNumbers, patternSigs);
      const text = norm(q.plainProblem);
      const sig = patternSignature(q.plainProblem);
      if (text && !seenSet.has(text) && sig && !patternSet.has(sig)) {
        seenSet.add(text);
        patternSet.add(sig);
        return q;
      }
      // strengthen hints for next try
      recentTexts.push(q.plainProblem);
      bannedNumbers.push(...extractNums(q.plainProblem));
      if (sig) patternSigs.push(sig);
    } catch (e) {
      // push a synthetic avoid-hint to nudge diversity
      recentTexts.push(`AVOID: ${e.message} :: ${Date.now()}`);
    }
  }

  // last resort
  const last = await aiBuildQuestion(meta, recentTexts, indexInBatch, 7, bannedNumbers, patternSigs);
  const txt = norm(last.plainProblem);
  const sig = patternSignature(last.plainProblem);
  if (txt) seenSet.add(txt);
  if (sig) patternSet.add(sig);
  return last;
}

/* ------------------------- question rendering ----------------------------- */
function renderQuestion() {
  const total = state.meta.qty || state.questions.length || 0;
  const nextBtn = $("btn-next"), prevBtn = $("btn-prev");
  const copyBtn = $("btn-copy"), evalBtn = $("btn-eval"), sampleBtn = $("btn-sample");
  const hasQ = !!state.questions.length;

  if (!hasQ) {
    $("problem").innerHTML = 'No question yet. Choose inputs and click <em>Generate Questions</em>.';
    $("q-meta").textContent = '—';
    $("status").textContent = '';
    $("answer").value = '';
    clearChoicesBox();
    [nextBtn, prevBtn, copyBtn, evalBtn, sampleBtn].forEach(b => b && (b.disabled = true));
    return;
  }

  const q = state.questions[state.idx];
  $("problem").innerHTML = q.text;
  $("q-meta").textContent = `Q${state.idx + 1}/${total} · ${q.tag} · ${state.meta.level} · Grade ${state.meta.grade}${state.meta.sport ? ' · ' + state.meta.sport : ''}`;
  $("status").textContent = '';
  $("answer").value = '';
  renderChoices(q);

  const isSingleRolling = Number(state.meta.qty || 0) === 1;
  prevBtn.disabled = state.idx <= 0;
  nextBtn.disabled = !isSingleRolling && state.idx >= total - 1; // endless only when qty=1
  [copyBtn, evalBtn, sampleBtn].forEach(b => b && (b.disabled = false));
}

/* ------------------------------ choices UI -------------------------------- */
function clearChoicesBox() {
  const box = $('choices'); if (!box) return;
  box.innerHTML = ''; box.hidden = true;
}
function renderChoices(q) {
  const box = $('choices'); if (!box) return;
  box.innerHTML = '';
  if (!q.choices || q.choices.length !== 4) { box.hidden = true; return; }
  q.choices.forEach((text, i) => {
    const btn = document.createElement('button');
    btn.className = 'choice';
    btn.textContent = text;
    btn.dataset.index = String(i);
    btn.addEventListener('click', () => {
      $("answer").value = text;
      const correct = i === q.answer_index;
      btn.classList.add(correct ? 'correct' : 'wrong');
      setTimeout(() => Array.from(box.children).forEach(c => c.classList.remove('correct', 'wrong')), 900);
    });
    box.appendChild(btn);
  });
  const spacer = document.createElement('div'); spacer.style.height = '10px';
  box.appendChild(spacer);
  box.hidden = false;
}

/* ------------------------------ evaluation -------------------------------- */
function evaluateAnswer(answer, q) {
  if (q?.choices && Number.isInteger(q.answer_index)) {
    const chosen = (answer ?? '').trim();
    const isCorrect = chosen && chosen === q.choices[q.answer_index];
    const score = isCorrect ? 100 : 0;
    const verdict = isCorrect ? 'Nice! 🏆' : 'Not quite — check the sample answer.';
    const missing = isCorrect ? [] : [q.choices[q.answer_index]];
    return { score, verdict, missing };
  }
  return { score: 0, verdict: 'Open-ended question — compare with the sample solution.', missing: [] };
}

/* ---------------------- solution normalizers (concise) -------------------- */
function normalizeConcise(html) {
  if (!html) return "";
  html = html.replace(/<(?!br\s*\/?>|strong\b)[^>]*>/gi, "").replace(/\s+/g, " ").trim();
  const starters = [/^to\s+find[^:.,]*[:.,-]\s*/i, /^we\s+need\s+to\s*/i, /^(first|then|next|therefore|so|thus),?\s*/i];
  starters.forEach(rx => { html = html.replace(rx, ""); });
  let lines = html.split(/<br\s*\/?>/i).map(s => s.trim()).filter(Boolean);
  const hasAnswer = lines.some(l => /(^|\b)answer\s*:/i.test(l));
  if (!hasAnswer && lines.length) {
    lines[lines.length - 1] = `<strong>Answer: ${lines[lines.length - 1]}</strong>`;
  } else {
    lines = lines.map(l => l.replace(/(^|\b)answer\s*:\s*/i, "<strong>Answer: ").replace(/<\/strong>$/i, ""));
    lines = lines.map(l => /<strong>Answer: /.test(l) && !/<\/strong>/.test(l) ? l + "</strong>" : l);
  }
  const maxLineLen = 100;
  const cap = s => (s.length > maxLineLen ? s.slice(0, maxLineLen - 1) + "…" : s);
  const answer = lines.find(l => /<strong>Answer:/i.test(l)) ?? lines[lines.length - 1];
  const head = lines.filter(l => l !== answer).slice(0, 2).map(cap);
  lines = [...head, answer];
  return lines.join("<br>");
}

function shortenSolution(html, maxChars = 360) {
  if (!html) return "";
  html = html.replace(/<(?!br\s*\/?>|strong\b)[^>]*>/gi, "").replace(/\s+/g, " ").trim();
  return html.length > maxChars ? html.slice(0, maxChars - 1) + "…" : html;
}

/* ---------------------------- history utilities --------------------------- */
function updateHistoryUI() {
  const list = $("history-list"); if (!list) return;
  const data = loadHistory(); list.innerHTML = '';
  data.slice(0, 10).forEach(r => {
    const li = document.createElement('li');
    const left = document.createElement('span');
    left.textContent =
      `${r.tag} · ${r.level} · G${r.grade}${r.sport ? ' · ' + r.sport : ''} · ${new Date(r.at).toLocaleString()}`;
    const right = document.createElement('strong'); right.textContent = `${r.score}/100`;
    li.appendChild(left); li.appendChild(right); list.appendChild(li);
  });
  $("avg-score").textContent = data.length
    ? Math.round(data.reduce((s, r) => s + r.score, 0) / data.length)
    : '—';
  $("attempts").textContent = data.length;
}

function updateHistoryAfterEval(q, score) {
  const scoreItem = { tag: q.tag, score, at: Date.now(), level: state.meta.level, grade: state.meta.grade, sport: state.meta.sport };
  const list = loadHistory(); const newList = [scoreItem, ...(list || [])].slice(0, 200);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
  updateHistoryUI();
}

/* -------------------------------- bindings -------------------------------- */
function setBusy(on) {
  const formBtn = $("btn-generate");
  const buttons = ["btn-next", "btn-prev", "btn-eval", "btn-sample", "btn-copy", "btn-clear"];
  buttons.forEach(id => { const b = $(id); if (b) b.disabled = on || b.dataset.locked === '1'; });
  if (formBtn) formBtn.disabled = on;
}

document.addEventListener('DOMContentLoaded', () => {
  const form = $("generator-form");
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const area = $("topic").value;
      const sport = $("hobby").value;
      const level = $("difficulty").value;
      const grade = $("grade").value;
      let qty = Math.max(1, Math.min(30, parseInt(($("qty")?.value || '3'), 10) || 3));
      qty = Math.min(MAX_QUESTIONS, qty);

      if (!area) { $("topic").reportValidity?.(); return; }
      if (!sport) { $("hobby").reportValidity?.(); return; }
      if (!level) { $("difficulty").reportValidity?.(); return; }
      if (!grade) { $("grade").reportValidity?.(); return; }
      const gNum = Number(grade);
      if (!(gNum >= 4 && gNum <= 10)) {
        $("problem").innerHTML = '⚠️ Please choose a grade from 4 to 10.';
        return;
      }

      state = {
        questions: [],
        idx: 0,
        meta: { area, sport, level, grade, qty },
        seen: {},
        seenPatterns: {},
        mcqCount: 0,
        openCount: 0
      };

      $("problem").innerHTML = '⏳ Generating your set…';
      $("q-meta").textContent = '—';
      $("status").textContent = '';
      $("answer").value = '';
      clearChoicesBox();

      setBusy(true);
      setProgress(`0 / ${qty} ready…`);
      try {
        const key = comboKey(state.meta);
        state.seen[key] = new Set();
        state.seenPatterns[key] = new Set();

        // generate EXACT qty; alternate MCQ/open by index and force uniqueness + new pattern
        for (let i = 0; i < qty; i++) {
          const q = await generateUniqueQuestion(state.meta, i);
          state.questions.push(q);
          setProgress(`${i + 1} / ${qty} ready…`);
        }

        state.idx = 0;
        setProgress(`✅ Ready: ${qty} / ${qty}`);
        renderQuestion();
      } catch (err) {
        console.error(err);
        $("problem").innerHTML = `⚠️ ${userMessageFromError(err)}`;
      } finally {
        setBusy(false);
      }
    });
  }

  $("btn-clear")?.addEventListener('click', () => {
    $("topic").selectedIndex = 0;
    $("hobby").selectedIndex = 0;
    $("difficulty").selectedIndex = 0;
    $("grade").selectedIndex = 0;
    if ($("qty")) $("qty").value = 3;
    $("answer").value = '';
    state = { questions: [], idx: 0, meta: { area: '', sport: '', level: '', grade: '', qty: 3 }, seen: {}, seenPatterns: {}, mcqCount: 0, openCount: 0 };
    setProgress('');
    renderQuestion();
  });

  $("btn-prev")?.addEventListener('click', () => {
    if (!state.questions.length) return;
    state.idx = Math.max(0, state.idx - 1);
    renderQuestion();
  });

  // Navigate only; if qty === 1, generate a fresh new question (rolling mode)
  $("btn-next")?.addEventListener('click', async () => {
    if (!state.questions.length) return;
    const limit = Number(state.meta.qty || state.questions.length);

    if (limit === 1) {
      setBusy(true);
      try {
        const q = await generateUniqueQuestion(state.meta, 0);
        state.questions[0] = q;       // keep array length = 1
        state.idx = 0;
        renderQuestion();
      } catch (err) {
        console.error(err);
        alert(userMessageFromError(err));
      } finally {
        setBusy(false);
      }
      return;
    }

    state.idx = Math.min(limit - 1, state.idx + 1);
    renderQuestion();
  });

  $("btn-eval")?.addEventListener('click', () => {
    if (!state.questions.length) { alert('Generate a question set first.'); return; }
    const q = state.questions[state.idx];
    const res = evaluateAnswer($("answer").value, q);
    const missingTxt = res.missing && res.missing.length ? ` Missing: <em>${res.missing.join(', ')}</em>` : '';
    $("status").innerHTML = `<span class="${res.score >= 60 ? 'ok' : 'bad'}">Score: ${res.score}/100</span> — ${res.verdict}.${missingTxt}`;
    updateHistoryAfterEval(q, res.score);
  });

  $("btn-sample")?.addEventListener('click', async () => {
    if (!state.questions.length) return;
    const q = state.questions[state.idx];
    $("status").innerHTML = `<em>Generating solution…</em>`;
    setBusy(true);
    try {
      const msgs = await aiSampleMessages(state.meta, q.plainProblem || $("problem").innerText);
      let solution = await llmAsk(msgs, { max_tokens: 180 });
      solution = normalizeConcise(solution);
      solution = shortenSolution(solution);
      q.solution_html = solution;
      $("status").innerHTML = `<em>Solution:</em><br>${solution}`;
    } catch (err) {
      console.error(err);
      $("status").innerHTML = `⚠️ ${userMessageFromError(err)}`;
    } finally {
      setBusy(false);
    }
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
