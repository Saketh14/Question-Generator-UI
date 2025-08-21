// script.js (Cricket-focused)
const $ = (id) => document.getElementById(id);

// --- Question bank: Cricket only -------------------------------------------
// Each item provides a template, a sample answer outline, and a set of
// keywords used for simple evaluation.
const bank = {
  cricket: [
    // Batting
    {
      tag: 'Batting',
      template: () => `Batting: Explain the backlift and follow-through in a straight drive. Include grip, stance, and weight transfer.`,
      sample: () => `Neutral stance; top hand control; backlift slightly open; step to the pitch; head over ball; weight from back to front; full face of bat; high elbow; follow-through towards bowler.`,
      keywords: () => [
        'grip','stance','backlift','high elbow','head over the ball','weight transfer','front foot','follow-through','full face'
      ]
    },
    {
      tag: 'Batting',
      template: () => `Batting: How do you play a short-pitched bouncer safely? Mention footwork, body position, and shot selection.`,
      sample: () => `Pick length early; sway/duck; if attacking, roll wrists on pull/hook; keep eyes on ball; get inside line; avoid skying by keeping bat horizontal.`,
      keywords: () => ['bouncer','pick length','sway','duck','pull','hook','roll wrists','inside line','horizontal bat']
    },

    // Bowling
    {
      tag: 'Bowling',
      template: () => `Bowling (Pace): Describe seam position and wrist alignment to bowl an outswinger to a right-hander. Include release and landing.`,
      sample: () => `Seam angled to first slip; wrist behind ball; release outside the line with upright seam; land on good length; shiny side on leg; fingers along the seam.`,
      keywords: () => ['outswing','seam','wrist behind ball','upright seam','first slip','release','good length','shiny side','fingers along seam']
    },
    {
      tag: 'Bowling',
      template: () => `Bowling (Spin): Explain how an off-spinner generates drift and dip. Include grip, finger action, and flight.`,
      sample: () => `Two fingers on seam; roll fingers; high release; give loop; overspin for dip; slight side spin for drift; vary flight and pace.`,
      keywords: () => ['off spin','drift','dip','grip','finger roll','overspin','flight','loop','vary pace']
    },

    // Fielding
    {
      tag: 'Fielding',
      template: () => `Fielding: Outline correct technique for a one-bounce pickup and direct-hit throw from mid-wicket. Mention approach, pickup, and release.`,
      sample: () => `Approach on semicircle; low base; hands form a funnel; scoop with outside foot forward; transfer to throwing hand early; side-on; aim at base of stumps; follow-through.`,
      keywords: () => ['approach','semicircle','low base','pickup','transfer','side-on','direct hit','base of stumps','follow-through']
    },

    // Umpiring
    {
      tag: 'Umpiring',
      template: () => `Umpiring: Walk through the LBW decision process step-by-step. Include pitching, impact, line, shot offered, and height.`,
      sample: () => `Check: (1) ball pitched in line or outside off; (2) impact in line w/ stumps unless no shot; (3) projected to hit stumps; (4) height/inside edge; (5) consider DRS umpire's call.`,
      keywords: () => ['lbw','pitched','outside off','impact in line','no shot','hitting stumps','height','inside edge','drs','umpire\'s call']
    }
  ]
};

// Always use cricket; optionally filter by subtopic words in the user's input
function pickSubtopic(topicInput) {
  const t = (topicInput||'').toLowerCase();
  if (/bat(ting)?/.test(t)) return 'Batting';
  if (/bowl(ing)?|pace|swing|spin/.test(t)) return 'Bowling';
  if (/field(ing)?/.test(t)) return 'Fielding';
  if (/ump(ir|)ing|lbw|drs/.test(t)) return 'Umpiring';
  return 'Any';
}

function makeQuestions(topic, _hobby) {
  const sub = pickSubtopic(topic);
  let items = [...bank.cricket];
  if (sub !== 'Any') items = items.filter(q => q.tag === sub);
  // If filtering leaves too few, fall back to full set
  if (items.length < 3) items = [...bank.cricket];
  return items.map(q => ({
    text: q.template(),
    sample: q.sample(),
    keywords: q.keywords().map(k => (k+"").toLowerCase()),
    tag: q.tag
  }));
}

// Weighted keyword-based evaluation with feedback
function evaluateAnswer(answer, keywords) {
  const a = (answer||'').toLowerCase();
  const unique = Array.from(new Set(keywords));
  const hits = unique.filter(k => a.includes(k));
  const score = Math.round(100 * hits.length / Math.max(1, unique.length));
  const missing = unique.filter(k => !hits.includes(k));
  let verdict;
  if (score >= 80) verdict = 'Excellent — covers most technical points.';
  else if (score >= 60) verdict = 'Good — add a couple of missing details.';
  else if (score >= 40) verdict = 'Okay — expand on technique and key terms.';
  else verdict = 'Needs improvement — add fundamentals and step-by-step technique.';
  return { score, verdict, missing };
}

let state = { questions: [], idx: 0 };

function renderQuestion() {
  if (!state.questions.length) {
    $("problem").innerHTML = 'No question yet. Click <em>Generate Questions</em>.';
    $("q-meta").textContent = '—';
    return;
  }
  const q = state.questions[state.idx];
  $("problem").textContent = q.text;
  $("q-meta").textContent = `Question ${state.idx+1} of ${state.questions.length} · ${q.tag}`;
  $("status").textContent = '';
  $("answer").value = '';
}

$("btn-generate").addEventListener('click', () => {
  const topic = $("topic").value.trim(); // can be subtopic like "batting"
  state.questions = makeQuestions(topic, null);
  state.idx = 0;
  renderQuestion();
});

$("btn-clear").addEventListener('click', () => {
  $("topic").value=''; $("hobby").value=''; $("answer").value='';
  state = { questions: [], idx: 0 }; renderQuestion();
});

$("btn-prev").addEventListener('click', () => {
  if (!state.questions.length) return;
  state.idx = (state.idx - 1 + state.questions.length) % state.questions.length;
  renderQuestion();
});
$("btn-next").addEventListener('click', () => {
  if (!state.questions.length) return;
  state.idx = (state.idx + 1) % state.questions.length;
  renderQuestion();
});

$("btn-eval").addEventListener('click', () => {
  if (!state.questions.length) { alert('Generate a question first.'); return; }
  const q = state.questions[state.idx];
  const { score, verdict, missing } = evaluateAnswer($("answer").value, q.keywords);
  const missingTxt = missing.length ? ` Missing: <em>${missing.slice(0,5).join(', ')}</em>` : '';
  $("status").innerHTML = `<span class="${score>=60? 'ok':'bad'}">Score: ${score}/100</span> — ${verdict}.${missingTxt}`;
});

$("btn-sample").addEventListener('click', () => {
  if (!state.questions.length) return;
  const q = state.questions[state.idx];
  $("status").innerHTML = `<em>Sample outline:</em> ${q.sample}`;
});

// initial
renderQuestion();
