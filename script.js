// script.js — LLM-only generator with MCQs, robust LLM, and strict "new on Next" + max 8
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
function sportEmoji(s) { const k = (s || '').toLowerCase(); return SPORTS[k]?.emoji || '🧠'; }

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
  seen: {} // { comboKey: Set(plainProblem) }
};

/* ------------------------------- “fine-tune” ------------------------------ */
const SYSTEM_GUIDE = `
You are Math Trainer LLM. Generate playful, rigorous math word problems tailored by subject (area), level, grade, and sport theme.
Constraints:
- 2–4 sentences; use concrete numbers; problem must be solvable without revealing the answer.
- Return JSON only (no extra commentary).
- Include 4 MCQ options with exactly one correct.
- Options must be plausible, distinct, and similar magnitude; avoid giveaways.
- Tidy arithmetic (integers or clean decimals) when possible.
- Keep to difficulty + grade vocabulary. No solution spoilers in problem text.
- STRICTLY produce different problems if asked repeatedly for the same combination; use varied numbers and setup.
Tone: Friendly, confident, concise classroom coach.
`;

const FEWSHOT_MCQ = [
  {
    role: "user",
    content: "AREA=algebra; LEVEL=easy; GRADE=8; SPORT=basketball; FORMAT=JSON"
  },
  {
    role: "assistant",
    content: JSON.stringify({
      problem: "During drills, Jamie scores 4 points per layup and 2 points per free throw. In one practice, she makes 6 layups and some free throws to total 28 points. How many free throws did she make?",
      choices: ["2", "4", "5", "6"],
      answer_index: 0,
      solution_html: "Layups = 6×4 = 24 points.<br>Let f be the number of free throws (2 points each): 24 + 2f = 28 ⇒ 2f = 4 ⇒ f = <strong>2</strong>."
    })
  }
];

/* ------------------------------ helpers ----------------------------------- */
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

function sanitizeMCQPayload(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Invalid LLM JSON.');
  let { problem, choices, answer_index, solution_html } = payload;
  if (typeof problem !== 'string' || !problem.trim()) throw new Error('Missing problem.');
  if (!Array.isArray(choices) || choices.length !== 4) throw new Error('Choices must have 4 options.');
  choices = choices.map(c => String(c ?? '').trim());
  if (choices.some(c => !c)) throw new Error('Empty choice detected.');
  const idx = Number(answer_index);
  if (!Number.isInteger(idx) || idx < 0 || idx > 3) throw new Error('answer_index must be 0..3.');
  solution_html = String(solution_html ?? '').trim();
  return { problem: problem.trim(), choices, answer_index: idx, solution_html };
}

/* ------------------------------- LLM bridge ------------------------------- */
async function llmAsk(messagesOrString, { retries = 2, delayMs = 450 } = {}) {
  if (!window.LLM || typeof window.LLM.ask !== 'function') {
    throw new Error('LLM bridge missing. Start it (e.g., "npm run groq") and set your API key.');
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
async function aiQuestionMessages(meta, dedupHints = []) {
  const area = metaToArea(meta);
  const level = meta.level || 'easy';
  const grade = meta.grade || '8';
  const sport = (meta.sport || 'basketball').toLowerCase();

  const seen = getLearned(area, level).slice(0, 8);
  const avoidTexts = [
    ...seen.map(r => r.text).filter(Boolean),
    ...dedupHints
  ].join("\n---\n");

  const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const userPayload = {
    REQUIREMENTS: {
      AREA: area, LEVEL: level, GRADE: grade, SPORT: sport,
      STYLE: "2-4 sentences", MCQ: 4, UNIQUE_CORRECT: true, NO_SPOILERS_IN_PROBLEM: true
    },
    AVOID_SIMILAR_TO: avoidTexts || "—",
    SEED: seed,
    FORMAT: {
      type: "json",
      schema: {
        problem: "string",
        choices: "string[4]",
        answer_index: "integer 0..3",
        solution_html: "string (short HTML steps)"
      }
    }
  };

  return [
    { role: "system", content: SYSTEM_GUIDE.trim() },
    ...FEWSHOT_MCQ,
    { role: "user", content: JSON.stringify(userPayload) }
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

/* --------------------------- builders (MCQ) -------------------------------- */
async function aiBuildQuestion(meta, dedupHints = []) {
  const msgs = await aiQuestionMessages(meta, dedupHints);
  const raw = await llmAsk(msgs);
  const parsed = jsonExtract(raw);
  if (!parsed) throw new Error('LLM did not return valid JSON.');
  const data = sanitizeMCQPayload(parsed);

  const { intro, closer } = funWrap((meta.sport || '').toLowerCase());
  const emoji = sportEmoji(meta.sport);

  const q = {
    tag: cap(meta.area === 'mix' ? 'Mixed' : meta.area),
    plainProblem: data.problem,
    text: `${intro}<br><br>${emoji} ${data.problem}<br><br><small>${closer}</small>`,
    choices: data.choices,
    answer_index: data.answer_index,
    solution_html: data.solution_html || '',
    correct: data.choices[data.answer_index] ?? null,
    keywords: []
  };
  learn(metaToArea(meta), meta.level, q);
  return q;
}

async function aiBuildSample(meta, plainProblem) {
  const msgs = await aiSampleMessages(meta, plainProblem);
  return await llmAsk(msgs);
}

/* ---------- ensure NEW question each time (per combination) with retries --- */
async function generateUniqueQuestion(meta) {
  const key = comboKey(meta);
  state.seen[key] = state.seen[key] || new Set();
  const seenSet = state.seen[key];

  const recentTexts = Array.from(seenSet).slice(-12); // pass to AVOID_SIMILAR_TO
  for (let attempt = 0; attempt < 3; attempt++) {
    const q = await aiBuildQuestion(meta, recentTexts);
    const text = (q.plainProblem || '').trim();
    if (text && !seenSet.has(text)) {
      seenSet.add(text);
      return q;
    }
    // try again with stronger hint (append the duplicate text)
    recentTexts.push(text);
  }
  // If it's still repeating, return the last one anyway
  const fallback = await aiBuildQuestion(meta, recentTexts);
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
  if (q && Array.isArray(q.choices) && Number.isInteger(q.answer_index)) {
    const chosen = (answer ?? '').trim();
    const isCorrect = chosen && chosen === q.choices[q.answer_index];
    const score = isCorrect ? 100 : 0;
    const verdict = isCorrect ? 'Nice! 🏆' : 'Not quite — check the sample answer.';
    const missing = isCorrect ? [] : [q.choices[q.answer_index]];
    return { score, verdict, missing };
  }
  return { score: 0, verdict: 'Please select an option.', missing: [] };
}

/* ------------------------- question rendering ----------------------------- */
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
  const total = Math.min(MAX_QUESTIONS, state.meta?.qty || state.questions.length);
  $("problem").innerHTML = q.text;
  $("q-meta").textContent = `Q${state.idx + 1}/${total} · ${q.tag} · ${state.meta.level} · Grade ${state.meta.grade}${state.meta.sport ? ' · ' + state.meta.sport : ''}`;
  $("status").textContent = '';
  $("answer").value = '';
  renderChoices(q);
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
  const btns = ["btn-next", "btn-eval", "btn-sample", "btn-copy"];
  btns.forEach(id => { const b = $(id); if (b) b.disabled = on; });
  const formBtn = $("generator-form")?.querySelector('button[type="submit"]');
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

      state = { questions: [], idx: 0, meta: { area, sport, level, grade, qty }, seen: state.seen || {} };
      // reset the "seen" set for this new combo to ensure fresh generation
      state.seen[comboKey(state.meta)] = new Set();

      setBusy(true);
      $("problem").innerHTML = '⏳ Generating question…';
      try {
        const q = await generateUniqueQuestion(state.meta);
        state.questions.push(q);
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
    state = { questions: [], idx: 0, meta: { area: '', sport: '', level: '', grade: '', qty: 3 }, seen: {} };
    renderQuestion();
  });

  $("btn-prev")?.addEventListener('click', () => {
    if (!state.questions.length) return;
    state.idx = Math.max(0, state.idx - 1);
    renderQuestion();
  });

  // ALWAYS generate a brand-new question on Next; keep only the latest 8
  $("btn-next")?.addEventListener('click', async () => {
    if (!state.meta.area) { alert('Generate a question first.'); return; }

    setBusy(true);
    try {
      const q = await generateUniqueQuestion(state.meta);
      state.questions.push(q);
      // Trim to MAX_QUESTIONS (keep the latest)
      while (state.questions.length > MAX_QUESTIONS) state.questions.shift();
      // Move index to the newest
      state.idx = state.questions.length - 1;
      renderQuestion();
    } catch (err) {
      console.error(err);
      alert(`LLM error: ${err?.message || 'unknown'}`);
    } finally {
      setBusy(false);
    }
  });

  $("btn-eval")?.addEventListener('click', () => {
    if (!state.questions.length) { alert('Generate a question first.'); return; }
    const q = state.questions[state.idx];
    const res = evaluateAnswer($("answer").value, q);
    const missingTxt = res.missing && res.missing.length ? ` Missing: <em>${res.missing.join(', ')}</em>` : '';
    $("status").innerHTML = `<span class="${res.score >= 60 ? 'ok' : 'bad'}">Score: ${res.score}/100</span> — ${res.verdict}.${missingTxt}`;
    const scoreItem = { tag: q.tag, score: res.score, at: Date.now(), level: state.meta.level, grade: state.meta.grade, sport: state.meta.sport };
    saveHistory(scoreItem); updateHistoryUI();
  });

  $("btn-sample")?.addEventListener('click', async () => {
    if (!state.questions.length) return;
    const q = state.questions[state.idx];
    $("status").innerHTML = `<em>Generating solution…</em>`;
    setBusy(true);
    try {
      let solution = q.solution_html;
      if (!solution) {
        solution = await aiBuildSample(state.meta, q.plainProblem || $("problem").innerText);
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
