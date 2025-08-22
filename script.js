// script.js (Math topics with sports-only hobby personalization)
'use strict';
const $ = (id) => document.getElementById(id);

// --- Helpers ---------------------------------------------------------------
const SPORTS = ['cricket', 'football', 'soccer', 'basketball', 'tennis', 'badminton', 'swimming', 'running'];
function pickSport(hobby) {
  const h = (hobby || '').toLowerCase().trim();
  return SPORTS.includes(h) ? h : 'your favorite sport';
}

// --- Question Bank: >=5 topics, >=5 questions total -----------------------
const bank = {
  algebra: [
    { tag: 'Algebra', text: 'Solve: 2x - 5 = 11. Show each step and check your solution.', sample: 'Add 5 both sides → 2x = 16 → x = 8. Check: 2(8)-5=11 ✓', keywords: ['add 5', '2x', '16', 'x = 8', 'check'] },
    { tag: 'Algebra', text: 'Factor and solve: x^2 - 5x + 6 = 0.', sample: '(x-2)(x-3)=0 → x=2 or x=3. Verify by substitution.', keywords: ['factor', '(x-2)', '(x-3)', 'roots', 'x=2', 'x=3', 'verify'] },
    { tag: 'Algebra', text: 'Solve the system using substitution: 2x + 3y = 7 and x - y = 1.', sample: 'From x-y=1 → x=y+1. Substitute: 2(y+1)+3y=7 → 5y=5 → y=1, x=2.', keywords: ['substitution', 'y+1', '5y', 'y=1', 'x=2'] },
    { tag: 'Algebra', text: 'Solve the inequality: |2x - 3| ≤ 5 and express the solution interval.', sample: '-5 ≤ 2x-3 ≤ 5 → add 3 → -2 ≤ 2x ≤ 8 → ÷2 → -1 ≤ x ≤ 4.', keywords: ['absolute value', 'interval', '-1', '4'] },
    { tag: 'Algebra', text: 'Given y = -3x + 5, state slope and intercept and sketch reasoning.', sample: 'Slope m=-3, intercept b=5; crosses (0,5); falls 3 for each +1 in x.', keywords: ['slope', 'intercept', 'm=-3', 'b=5', '(0,5)'] }
  ],
  calculus: [
    { tag: 'Calculus', text: 'Compute lim_{x→2} (x^2 - 4)/(x - 2). Explain your steps.', sample: 'Factor: (x-2)(x+2)/(x-2) → x+2 → limit = 4.', keywords: ['limit', 'factor', 'x+2', '4'] },
    { tag: 'Calculus', text: 'Differentiate f(x) = 3x^2 + 2x - 7 and name the rule used.', sample: "f'(x)=6x+2 using power rule.", keywords: ['derivative', 'power rule', '6x+2'] },
    { tag: 'Calculus', text: 'Use the product rule to differentiate f(x) = x^2 e^x.', sample: "f'(x)=2x e^x + x^2 e^x (product rule).", keywords: ['product rule', 'e^x', '2x e^x', 'x^2 e^x'] },
    { tag: 'Calculus', text: 'Differentiate using chain rule: d/dx (3x^2 - 1)^5.', sample: "5(3x^2-1)^4 * 6x = 30x(3x^2-1)^4.", keywords: ['chain rule', '30x', '(3x^2-1)^4'] },
    { tag: 'Calculus', text: 'Evaluate the definite integral ∫₀¹ 2x dx.', sample: 'Antiderivative x^2 |₀¹ = 1.', keywords: ['integral', 'antiderivative', 'x^2', '1'] }
  ],
  geometry: [
    { tag: 'Geometry', text: 'A right triangle has legs 6 and 8. Find the hypotenuse.', sample: 'Use Pythagoras: √(6²+8²)=10.', keywords: ['right triangle', 'pythagoras', '6', '8', '10'] },
    { tag: 'Geometry', text: 'Find the area of a circle with radius 5.', sample: 'A=πr² → 25π.', keywords: ['area', 'circle', 'πr²', '25π'] }
  ],
  trigonometry: [
    { tag: 'Trigonometry', text: 'Compute sin(θ) if cos(θ)=3/5 and θ in QI. Then find tan(θ).', sample: 'sin=4/5 (positive in QI); tan= (4/5)/(3/5)=4/3.', keywords: ['sin', 'cos', 'tan', 'quadrant I', '4/5', '3/5', '4/3'] },
    { tag: 'Trigonometry', text: 'Prove the identity: 1 + tan²x = sec²x (outline).', sample: 'Divide by cos²x: (cos²x+sin²x)/cos²x = 1/cos²x → sec²x.', keywords: ['identity', 'tan^2', 'sec^2', 'cos^2', 'sin^2'] }
  ],
  probability: [
    { tag: 'Probability', text: 'A fair die is rolled. What is P(X≥5)?', sample: 'Outcomes {5,6}: 2/6 = 1/3.', keywords: ['die', 'outcomes', '1/3', 'probability'] },
    { tag: 'Probability', text: 'From a 52-card deck, what is P(drawing a heart)?', sample: '13/52 = 1/4.', keywords: ['cards', 'hearts', '1/4', '52'] }
  ]
};

function makeGeneric(area, hobby) {
  const label = (area === 'mix' ? 'math' : area) || 'math';
  const sport = pickSport(hobby);
  return {
    tag: label[0].toUpperCase() + label.slice(1),
    text: `Create a 3-step checklist to approach a typical ${label} problem. Relate one step to ${sport}.`,
    sample: `1) Identify what is asked (variables/constraints). 2) Apply the rule/algorithm. 3) Verify/interpret the result. Link to ${sport}: explain why the step matters practically.`,
    keywords: ['identify', 'apply', 'verify', label]
  };
}

function pickPool(area) {
  if (area === 'algebra') return [...bank.algebra];
  if (area === 'calculus') return [...bank.calculus];
  if (area === 'geometry') return [...bank.geometry];
  if (area === 'trigonometry') return [...bank.trigonometry];
  if (area === 'probability') return [...bank.probability];
  // mix: take one from each to ensure >=5 questions
  const oneEach = [bank.algebra[0], bank.calculus[0], bank.geometry[0], bank.trigonometry[0], bank.probability[0]];
  return oneEach;
}

function makeQuestions(area, hobby) {
  // Removed the generic "3-step checklist" question. Now we only use the
  // selected topic's question pool.
  const items = pickPool(area);
  return items.map(q => ({
    text: q.text,
    sample: q.sample,
    keywords: q.keywords.map(k => (k + "").toLowerCase()),
    tag: q.tag
  }));
}

function evaluateAnswer(answer, keywords) {
  const a = (answer || '').toLowerCase();
  const unique = Array.from(new Set(keywords));
  const hits = unique.filter(k => a.includes(k));
  const score = Math.round(100 * hits.length / Math.max(1, unique.length));
  const missing = unique.filter(k => !hits.includes(k));
  const verdict = score >= 80 ? 'Excellent — covers most key points.' : score >= 60 ? 'Good — add a few details.' : score >= 40 ? 'Okay — expand on rules/steps.' : 'Needs improvement — add definitions, steps, and a check.';
  return { score, verdict, missing };
}

let state = { questions: [], idx: 0 };
const STORAGE_KEY = 'mathTrainerHistory';
function loadHistory() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] } catch { return [] } }
function saveHistory(item) { const d = loadHistory(); d.unshift(item); localStorage.setItem(STORAGE_KEY, JSON.stringify(d.slice(0, 100))); }
function resetHistory() { localStorage.removeItem(STORAGE_KEY); }

function renderQuestion() {
  if (!state.questions.length) {
    $("problem").innerHTML = 'No question yet. Choose an area and click <em>Generate Questions</em>.';
    $("q-meta").textContent = '—'; $("status").textContent = ''; $("answer").value = ''; return;
  }
  const q = state.questions[state.idx];
  $("problem").textContent = q.text;
  $("q-meta").textContent = `Question ${state.idx + 1} of ${state.questions.length} · ${q.tag}`;
  $("status").textContent = ''; $("answer").value = '';
}

function updateHistoryUI() {
  const list = $("history-list"); if (!list) return; const data = loadHistory(); list.innerHTML = '';
  data.slice(0, 8).forEach(r => { const li = document.createElement('li'); const left = document.createElement('span'); left.textContent = `${r.tag} · ${new Date(r.at).toLocaleString()}`; const right = document.createElement('strong'); right.textContent = `${r.score}/100`; li.appendChild(left); li.appendChild(right); list.appendChild(li); });
  $("avg-score").textContent = data.length ? Math.round(data.reduce((s, r) => s + r.score, 0) / data.length) : '—';
  $("attempts").textContent = data.length;
}

// Bindings
document.addEventListener('DOMContentLoaded', () => {
  const form = $("generator-form");
  if (form) { form.addEventListener('submit', (e) => { e.preventDefault(); const area = $("topic").value; if (!area) { $("topic").reportValidity?.(); return; } const hobby = $("hobby").value; state.questions = makeQuestions(area, hobby); state.idx = 0; renderQuestion(); }); }

  $("btn-clear")?.addEventListener('click', () => { $("topic").selectedIndex = 0; $("hobby").selectedIndex = 0; $("answer").value = ''; state = { questions: [], idx: 0 }; renderQuestion(); });

  $("btn-prev")?.addEventListener('click', () => { if (!state.questions.length) return; state.idx = (state.idx - 1 + state.questions.length) % state.questions.length; renderQuestion(); });
  $("btn-next")?.addEventListener('click', () => { if (!state.questions.length) return; state.idx = (state.idx + 1) % state.questions.length; renderQuestion(); });

  $("btn-eval")?.addEventListener('click', () => { if (!state.questions.length) { alert('Generate a question first.'); return; } const q = state.questions[state.idx]; const { score, verdict, missing } = evaluateAnswer($("answer").value, q.keywords); const missingTxt = missing.length ? ` Missing: <em>${missing.slice(0, 5).join(', ')}</em>` : ''; $("status").innerHTML = `<span class="${score >= 60 ? 'ok' : 'bad'}">Score: ${score}/100</span> — ${verdict}.${missingTxt}`; saveHistory({ tag: q.tag, score, at: Date.now() }); updateHistoryUI(); });

  $("btn-sample")?.addEventListener('click', () => { if (!state.questions.length) return; const q = state.questions[state.idx]; $("status").innerHTML = `<em>Sample outline:</em> ${q.sample}`; });

  $("btn-copy")?.addEventListener('click', async () => { if (!state.questions.length) return; const q = state.questions[state.idx]; try { await navigator.clipboard.writeText(q.text); $("status").textContent = 'Question copied to clipboard.'; } catch { $("status").textContent = 'Copy failed. Select and copy manually.'; } });

  $("btn-reset")?.addEventListener('click', () => { if (confirm('Reset all saved attempts?')) { resetHistory(); updateHistoryUI(); } });

  $("answer")?.addEventListener('keydown', (ev) => { if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') { ev.preventDefault(); $("btn-eval")?.click(); } });

  renderQuestion(); updateHistoryUI();
});
