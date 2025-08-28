// script.js — exact N questions; 50/50 MCQ/Open; no extras after limit
'use strict';
const $ = (id) => document.getElementById(id);

/* ----------------------------- tiny utilities ----------------------------- */
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const MAX_QUESTIONS = 8;

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
const LEARN_KEY = 'trainerLearnedV3';
function loadLearned() { try { return JSON.parse(localStorage.getItem(LEARN_KEY)) || {} } catch { return {} } }
function saveLearned(store) { localStorage.setItem(LEARN_KEY, JSON.stringify(store)); }
function learn(area, level, q) {
  const key = `${area}__${level}`;
  const store = loadLearned(); store[key] = store[key] || [];
  const rec = { text: q.plainProblem || q.text, sample: q.solution_html || q.sample, correct: q.correct, keywords: q.keywords || [], choices: q.choices || [] };
  if (!store[key].some(e => e.text === rec.text)) {
    store[key].unshift(rec);
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
  seen: {},
  mcqCount: 0,
  openCount: 0
};

/* ------------------------------- prompts ---------------------------------- */
function metaToArea(meta) {
  const m = (meta.area || '').toLowerCase();
  if (['algebra', 'geometry', 'trigonometry', 'probability', 'calculus', 'mix'].includes(m)) return m;
  return 'algebra';
}

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

/* ---------- MCQ/Open sanitization + alternating for ~50/50 ---------------- */
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
function wantMCQ(i) {
  // Alternate by index: even -> MCQ, odd -> open (50/50)
  return i % 2 === 0;
}

/* ------------------------------- LLM bridge ------------------------------- */
async function llmAsk(messagesOrString, { retries = 1, delayMs = 300 } = {}) {
  if (!window.LLM || typeof window.LLM.ask !== 'function') {
    throw new Error('LLM bridge missing.');
  }
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      let res;
      if (Array.isArray(messagesOrString)) {
        res = await window.LLM.ask(messagesOrString);
        if (!res || !String(res).trim()) {
          const joined = messagesOrString.map(m => `${m.role.toUpperCase()}:\n${m.content}`).join('\n\n');
          res = await window.LLM.ask(joined);
        }
      } else {
        res = await window.LLM.ask(messagesOrString);
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
async function aiQuestionMessages(meta, dedupHints = [], indexInBatch = 0) {
  const area = metaToArea(meta);
  const level = meta.level || 'easy';
  const grade = meta.grade || '8';
  const sport = (meta.sport || 'basketball').toLowerCase();

  const seen = getLearned(area, level).slice(0, 4);
  const avoidTexts = [
    ...seen.map(r => r.text).filter(Boolean),
    ...dedupHints
  ].join("\n---\n");

  const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const makeMCQ = wantMCQ(indexInBatch);

  const schema = makeMCQ
    ? { problem: "string", choices: "string[4]", answer_index: "integer 0..3", solution_html: "string" }
    : { problem: "string", solution_html: "string" };

  const instructions = makeMCQ
    ? `Return JSON ONLY with keys: problem, choices (4 strings), answer_index (0..3), solution_html.`
    : `Return JSON ONLY with keys: problem, solution_html. No choices.`;

  const guide =
    `You are Math Trainer LLM. Generate playful, rigorous ${makeMCQ ? "MCQ" : "open-ended"} math problems.
Constraints:
- 2–4 sentences; use concrete numbers; solvable; no spoilers in problem text.
- Keep difficulty and vocabulary to the selected grade level.
- ${makeMCQ ? "Include exactly 4 plausible MCQ options with ONE correct." : "Do NOT include choices."}
- Produce JSON only.
Tone: Friendly, concise classroom coach.`;

  const userPayload = {
    REQUIREMENTS: {
      AREA: area, LEVEL: level, GRADE: grade, SPORT: sport,
      STYLE: "2-4 sentences", UNIQUE_CORRECT: true, NO_SPOILERS_IN_PROBLEM: true
    },
    AVOID_SIMILAR_TO: avoidTexts || "—",
    SEED: seed,
    FORMAT: { type: "json", schema }
  };

  return [
    { role: "system", content: guide.trim() },
    { role: "user", content: JSON.stringify(userPayload) + "\n" + instructions }
  ];
}

async function aiSampleMessages(meta, plainProblem) {
  const area = metaToArea(meta);
  const level = meta.level || 'easy';
  const grade = meta.grade || '8';
  return [
    { role: "system", content: "You are Math Trainer LLM Solver. Return a concise, correct solution in HTML with 3–6 short lines." },
    {
      role: "user",
      content:
        `Solve for a grade ${grade} ${area} problem (difficulty: ${level}).

Problem:
${plainProblem}

Requirements:
- 3–6 short lines; use math succinctly.
- Keep units consistent; show final numeric result.
- End with <strong>Answer: …</strong>.`
    }
  ];
}

/* --------------------------- builders (MCQ/open) -------------------------- */
async function aiBuildQuestion(meta, dedupHints = [], indexInBatch = 0) {
  const msgs = await aiQuestionMessages(meta, dedupHints, indexInBatch);
  const raw = await llmAsk(msgs);
  const parsed = jsonExtract(raw);
  if (!parsed) throw new Error('LLM did not return valid JSON.');
  const data = sanitizePayload(parsed);

  const { intro, closer } = funWrap((meta.sport || '').toLowerCase());
  const emoji = sportEmoji(meta.sport);

  const q = {
    tag: cap(meta.area === 'mix' ? 'Mixed' : meta.area),
    plainProblem: data.problem,
    text: `${intro}<br><br>${emoji} ${data.problem}<br><br><small>${closer}</small>`,
    solution_html: data.solution_html || '',
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

  learn(metaToArea(meta), meta.level, q);
  return q;
}

/* ---------- ensure NEW question each time for a combo with retries -------- */
async function generateUniqueQuestion(meta, indexInBatch = 0) {
  const key = comboKey(meta);
  state.seen[key] = state.seen[key] || new Set();
  const seenSet = state.seen[key];

  const recentTexts = Array.from(seenSet).slice(-4);
  for (let attempt = 0; attempt < 3; attempt++) {
    const q = await aiBuildQuestion(meta, recentTexts, indexInBatch);
    const text = (q.plainProblem || '').trim();
    if (text && !seenSet.has(text)) {
      seenSet.add(text);
      return q;
    }
    recentTexts.push(text);
  }
  const fallback = await aiBuildQuestion(meta, recentTexts, indexInBatch);
  const fbText = (fallback.plainProblem || '').trim();
  seenSet.add(fbText);
  return fallback;
}

/* ------------------------- history + UI rendering ------------------------- */
const STORAGE_KEY = 'mathTrainerHistoryV4';
function loadHistory() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] } catch { return [] } }
function saveHistory(item) { const d = loadHistory(); d.unshift(item); localStorage.setItem(STORAGE_KEY, JSON.stringify(d.slice(0, 200))); }
function resetHistory() { localStorage.removeItem(STORAGE_KEY); }

/* -------------------------------- choices UI ------------------------------ */
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

  // nav buttons enable/disable
  prevBtn.disabled = state.idx <= 0;
  nextBtn.disabled = state.idx >= total - 1; // no more than requested count
  [copyBtn, evalBtn, sampleBtn].forEach(b => b && (b.disabled = false));
}

function updateHistoryUI() {
  const list = $("history-list"); if (!list) return;
  const data = loadHistory(); list.innerHTML = '';
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
      qty = Math.min(MAX_QUESTIONS, qty); // enforce max 8

      if (!area) { $("topic").reportValidity?.(); return; }
      if (!sport) { $("hobby").reportValidity?.(); return; }
      if (!level) { $("difficulty").reportValidity?.(); return; }
      if (!grade) { $("grade").reportValidity?.(); return; }

      // reset state
      state = {
        questions: [],
        idx: 0,
        meta: { area, sport, level, grade, qty },
        seen: {},
        mcqCount: 0,
        openCount: 0
      };

      $("problem").innerHTML = '⏳ Generating your set…';
      $("q-meta").textContent = '—';
      $("status").textContent = '';
      $("answer").value = '';
      clearChoicesBox();

      setBusy(true);
      $("progress").textContent = `0 / ${qty} ready…`;
      try {
        const key = comboKey(state.meta);
        state.seen[key] = new Set();

        // generate EXACT qty; alternate MCQ/open by index
        for (let i = 0; i < qty; i++) {
          const q = await generateUniqueQuestion(state.meta, i);
          state.questions.push(q);
          $("progress").textContent = `${i + 1} / ${qty} ready…`;
        }

        // Show first, lock Next if only one
        state.idx = 0;
        $("progress").textContent = `✅ Ready: ${qty} / ${qty}`;
        renderQuestion();
      } catch (err) {
        console.error(err);
        $("problem").innerHTML = `⚠️ LLM error: ${err?.message || 'unknown'}.<br><small>Tip: check your bridge, API key, and CORS.</small>`;
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
    state = { questions: [], idx: 0, meta: { area: '', sport: '', level: '', grade: '', qty: 3 }, seen: {}, mcqCount: 0, openCount: 0 };
    $("progress").textContent = '';
    renderQuestion();
  });

  $("btn-prev")?.addEventListener('click', () => {
    if (!state.questions.length) return;
    state.idx = Math.max(0, state.idx - 1);
    renderQuestion();
  });

  // navigate only; DO NOT create new after limit
  $("btn-next")?.addEventListener('click', () => {
    if (!state.questions.length) return;
    const limit = Number(state.meta.qty || state.questions.length);
    state.idx = Math.min(limit - 1, state.idx + 1);
    renderQuestion();
  });

  $("btn-eval")?.addEventListener('click', () => {
    if (!state.questions.length) { alert('Generate a question set first.'); return; }
    const q = state.questions[state.idx];
    const res = evaluateAnswer($("answer").value, q);
    const missingTxt = res.missing && res.missing.length ? ` Missing: <em>${res.missing.join(', ')}</em>` : '';
    $("status").innerHTML = `<span class="${res.score >= 60 ? 'ok' : 'bad'}">Score: ${res.score}/100</span> — ${res.verdict}.${missingTxt}`;
    const scoreItem = { tag: q.tag, score: res.score, at: Date.now(), level: state.meta.level, grade: state.meta.grade, sport: state.meta.sport };
    const list = loadHistory(); const newList = [scoreItem, ...list].slice(0, 200);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    updateHistoryUI();
  });

  $("btn-sample")?.addEventListener('click', async () => {
    if (!state.questions.length) return;
    const q = state.questions[state.idx];
    $("status").innerHTML = `<em>Generating solution…</em>`;
    setBusy(true);
    try {
      let solution = q.solution_html;
      if (!solution) {
        const msgs = await aiSampleMessages(state.meta, q.plainProblem || $("problem").innerText);
        solution = await llmAsk(msgs);
        q.solution_html = solution;
      }
      $("status").innerHTML = `<em>Solution:</em><br>${solution}`;
    } catch (err) {
      console.error(err);
      $("status").innerHTML = `⚠️ LLM solution error: ${err?.message || 'unknown'}`;
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
