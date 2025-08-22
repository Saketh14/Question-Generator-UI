/* script.js - Vanilla JS for Question-Generator-UI */
'use strict';

/* ---------- Utilities ---------- */
const $ = (id) => document.getElementById(id);

/* ---------- Question Bank (Cricket) ---------- */
const bank = {
  cricket: [
    // Batting
    {
      tag: 'Batting',
      template: () =>
        'Batting: Explain the backlift and follow-through in a straight drive. Include grip, stance, and weight transfer.',
      sample: () =>
        'Neutral stance; top hand control; backlift slightly open; step to the pitch; head over ball; weight from back to front; full face of bat; high elbow; follow-through towards bowler.',
      keywords: () => [
        'grip','stance','backlift','high elbow','head over the ball','weight transfer','front foot','follow-through','full face'
      ]
    },
    {
      tag: 'Batting',
      template: () =>
        'Batting: How do you play a short-pitched bouncer safely? Mention footwork, body position, and shot selection.',
      sample: () =>
        'Pick length early; sway/duck; if attacking, roll wrists on pull/hook; keep eyes on ball; get inside line; avoid skying by keeping bat horizontal.',
      keywords: () => [
        'bouncer','pick length','sway','duck','pull','hook','roll wrists','inside line','horizontal bat'
      ]
    },

    // Bowling
    {
      tag: 'Bowling',
      template: () =>
        'Bowling (Pace): Describe seam position and wrist alignment to bowl an outswinger to a right-hander. Include release and landing.',
      sample: () =>
        'Seam angled to first slip; wrist behind ball; release outside the line with upright seam; land on good length; shiny side on leg; fingers along the seam.',
      keywords: () => [
        'outswing','seam','wrist behind ball','upright seam','first slip','release','good length','shiny side','fingers along seam'
      ]
    },
    {
      tag: 'Bowling',
      template: () =>
        'Bowling (Spin): Explain how an off-spinner generates drift and dip. Include grip, finger action, and flight.',
      sample: () =>
        'Two fingers on seam; roll fingers; high release; give loop; overspin for dip; slight side spin for drift; vary flight and pace.',
      keywords: () => [
        'off spin','drift','dip','grip','finger roll','overspin','flight','loop','vary pace'
      ]
    },

    // Fielding
    {
      tag: 'Fielding',
      template: () =>
        'Fielding: Outline correct technique for a one-bounce pickup and direct-hit throw from mid-wicket. Mention approach, pickup, and release.',
      sample: () =>
        'Approach on semicircle; low base; hands form a funnel; scoop with outside foot forward; transfer to throwing hand early; side-on; aim at base of stumps; follow-through.',
      keywords: () => [
        'approach','semicircle','low base','pickup','transfer','side-on','direct hit','base of stumps','follow-through'
      ]
    },

    // Umpiring
    {
      tag: 'Umpiring',
      template: () =>
        'Umpiring: Walk through the LBW decision process step-by-step. Include pitching, impact, line, shot offered, and height.',
      sample: () =>
        "Check: (1) ball pitched in line or outside off; (2) impact in line w/ stumps unless no shot; (3) projected to hit stumps; (4) height/inside edge; (5) consider DRS umpire's call.",
      keywords: () => [
        'lbw','pitched','outside off','impact in line','no shot','hitting stumps','height','inside edge','drs',"umpire's call"
      ]
    }
  ]
};

/* ---------- Core Logic ---------- */
function makeQuestions(subtopic) {
  const sub = (subtopic || '').toLowerCase(); // "Batting" etc.
  let items = bank.cricket;
  if (sub) items = items.filter(q => q.tag.toLowerCase() === sub);
  if (items.length === 0) items = bank.cricket; // fallback only if none
  return items.map(q => ({
    text: q.template(),
    sample: q.sample(),
    keywords: q.keywords().map(k => (k + '').toLowerCase()),
    tag: q.tag
  }));
}

function evaluateAnswer(answer, keywords) {
  const a = (answer || '').toLowerCase();
  const unique = Array.from(new Set(keywords));
  const hits = unique.filter(k => a.includes(k));
  const score = Math.round(100 * hits.length / Math.max(1, unique.length));
  const missing = unique.filter(k => !hits.includes(k));
  let verdict =
    score >= 80 ? 'Excellent — covers most technical points.' :
    score >= 60 ? 'Good — add a couple of missing details.' :
    score >= 40 ? 'Okay — expand on technique and key terms.' :
                  'Needs improvement — add fundamentals and step-by-step technique.';
  return { score, verdict, missing };
}

/* ---------- State & Persistence ---------- */
let state = { questions: [], idx: 0 };

const STORAGE_KEY = 'cricketTrainerHistory';
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveHistory(item) {
  const data = loadHistory();
  data.unshift(item);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data.slice(0, 100)));
}
function resetHistory() {
  localStorage.removeItem(STORAGE_KEY);
}

/* ---------- UI Rendering ---------- */
function renderQuestion() {
  if (!state.questions.length) {
    $('problem').innerHTML = 'No question yet. Choose an area and click <em>Generate Questions</em>.';
    $('q-meta').textContent = '—';
    $('status').textContent = '';
    $('answer').value = '';
    return;
  }
  const q = state.questions[state.idx];
  $('problem').textContent = q.text;
  $('q-meta').textContent = `Question ${state.idx + 1} of ${state.questions.length} · ${q.tag}`;
  $('status').textContent = '';
  $('answer').value = '';
}

function updateHistoryUI() {
  const list = $('history-list');
  if (!list) return;
  const data = loadHistory();
  list.innerHTML = '';
  data.slice(0, 8).forEach(r => {
    const li = document.createElement('li');
    const left = document.createElement('span');
    left.textContent = `${r.tag} · ${new Date(r.at).toLocaleString()}`;
    const right = document.createElement('strong');
    right.textContent = `${r.score}/100`;
    li.appendChild(left);
    li.appendChild(right);
    list.appendChild(li);
  });
  $('avg-score').textContent = data.length ? Math.round(data.reduce((s, r) => s + r.score, 0) / data.length) : '—';
  $('attempts').textContent = data.length;
}

/* ---------- Event Bindings ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const form = $('generator-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault(); // <-- prevents page refresh on Generate
      const topicEl = $('topic');
      const topic = (topicEl.value || '').trim();
      if (!topic) {
        if (topicEl.reportValidity) topicEl.reportValidity();
        return;
      }
      state.questions = makeQuestions(topic);
      state.idx = 0;
      renderQuestion();
    });
  }

  const clearBtn = $('btn-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if ($('topic')) $('topic').selectedIndex = 0;
      if ($('hobby')) $('hobby').value = '';
      if ($('answer')) $('answer').value = '';
      state = { questions: [], idx: 0 };
      renderQuestion();
    });
  }

  const prevBtn = $('btn-prev');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (!state.questions.length) return;
      state.idx = (state.idx - 1 + state.questions.length) % state.questions.length;
      renderQuestion();
    });
  }

  const nextBtn = $('btn-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (!state.questions.length) return;
      state.idx = (state.idx + 1) % state.questions.length;
      renderQuestion();
    });
  }

  const evalBtn = $('btn-eval');
  if (evalBtn) {
    evalBtn.addEventListener('click', () => {
      if (!state.questions.length) { alert('Generate a question first.'); return; }
      const q = state.questions[state.idx];
      const { score, verdict, missing } = evaluateAnswer(($('answer').value || ''), q.keywords);
      const missingTxt = missing.length ? ` Missing: <em>${missing.slice(0, 5).join(', ')}</em>` : '';
      $('status').innerHTML = `<span class="${score >= 60 ? 'ok' : 'bad'}">Score: ${score}/100</span> — ${verdict}.${missingTxt}`;
      saveHistory({ tag: q.tag, score, at: Date.now() });
      updateHistoryUI();
    });
  }

  const sampleBtn = $('btn-sample');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      if (!state.questions.length) return;
      const q = state.questions[state.idx];
      $('status').innerHTML = `<em>Sample outline:</em> ${q.sample}`;
    });
  }

  const copyBtn = $('btn-copy');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      if (!state.questions.length) return;
      try {
        await navigator.clipboard.writeText(state.questions[state.idx].text);
        $('status').textContent = 'Question copied to clipboard.';
      } catch {
        $('status').textContent = 'Copy failed. Select and copy manually.';
      }
    });
  }

  const resetBtn = $('btn-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Reset all saved attempts?')) {
        resetHistory();
        updateHistoryUI();
      }
    });
  }

  const answerEl = $('answer');
  if (answerEl) {
    answerEl.addEventListener('keydown', (ev) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') {
        ev.preventDefault();
        if ($('btn-eval')) $('btn-eval').click();
      }
    });
  }

  // Initial paint
  renderQuestion();
  updateHistoryUI();
});
