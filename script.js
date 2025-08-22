// script.js — vanilla, keeps your UX; loads curated first, fills to 3
'use strict';
const $ = (id) => document.getElementById(id);

/* ------------------ Sports (5 only) ------------------ */
const SPORTS = ['cricket', 'football', 'soccer', 'basketball', 'tennis'];
function validSport(s) { return SPORTS.includes((s || '').toLowerCase()); }
function sportOrDefault(s) { return s ? (validSport(s) ? s.toLowerCase() : 'your sport') : ''; }

/* ------------------ Curated Bank ------------------ */
/* (Cricket Algebra G7–10; Calculus–Tennis G10; Geometry–Soccer G8;
   Algebra for Basketball & Football G7–10) */
const CURATED = {
  algebra: {
    cricket: {
      7: {
        easy: [
          { text: 'A batsman scores 15 and 23. To average 20 over 3 matches, how many in the third?', sample: 'Total needed 20×3=60; so far 15+23=38; x=60−38=22.', keywords: ['average', '20', '60', '15', '23', 'runs', 'third', '22'] },
          { text: 'Losing team: 120 runs. Winners scored 15 more. Find the winners’ score s.', sample: 's=120+15=135.', keywords: ['equation', '120', '15', '135', 'runs'] }
        ],
        moderate: [
          { text: 'First innings: w wickets. Second: 2w+3. Total 18. Find w.', sample: 'w+(2w+3)=18 ⇒ 3w=15 ⇒ w=5.', keywords: ['wickets', 'system', '18', '2w+3', 'w=5'] },
          { text: 'Total 200 runs. Boundaries = 3s−20; singles/doubles = s. Find s and both parts.', sample: 's+(3s−20)=200 ⇒ 4s=220 ⇒ s=55; boundaries=145.', keywords: ['boundaries', 'singles', 'doubles', '200', '55', '145'] }
        ],
        hard: [
          { text: 'Avg 35 over 8 innings. After 9th, avg 37. Runs in 9th?', sample: '8×35=280; 9×37=333; 333−280=53.', keywords: ['average', '35', '37', '9th', '53'] },
          { text: 'RR 5.2 after 15 overs. Want overall 6 after 20. Required run rate next 5?', sample: 'Runs now 78; need 120; next 5 need 42 ⇒ 42/5=8.4.', keywords: ['run rate', 'overs', '5.2', '6.0', '8.4'] }
        ]
      },
      8: {
        easy: [
          { text: 'Team score S is 25 less than 3×75. Find S.', sample: 'S=3×75−25=200.', keywords: ['200', '75', '3×75', '25'] },
          { text: 'Scores: 30, x, 45. Avg=40. Find x.', sample: '40×3=120; 30+x+45=120 ⇒ x=45.', keywords: ['average', '120', 'x=45'] }
        ],
        moderate: [
          { text: 'P and Q took 15 wickets. P=2Q−3. Find (P,Q).', sample: 'q+(2q−3)=15 ⇒ q=6, P=9.', keywords: ['wickets', '2q−3', '15', '6', '9'] },
          { text: 'Avg n matches=180. Next score 220 makes avg 185. Find total matches now.', sample: '(180n+220)/(n+1)=185 ⇒ n=7 ⇒ total 8.', keywords: ['average', '180', '220', '185', 'n=7', '8'] }
        ],
        hard: [
          { text: 'X+Y=75; and 2X+(Y−5)=120. Find (X,Y).', sample: '2x+y=125 with x+y=75 ⇒ x=50 ⇒ y=25.', keywords: ['system', '75', '120', '50', '25'] },
          { text: 'Revised: Avg 24 after w wickets. Next 5 wickets cost 150 runs. New avg 25. Find w.', sample: '24w+150=25(w+5) ⇒ w=25.', keywords: ['average', '24', '25', '150', 'w=25'] }
        ]
      },
      9: {
        easy: [
          { text: 'Team runs 5x+10=110. Find x.', sample: '5x=100 ⇒ x=20.', keywords: ['linear', '110', 'x=20'] },
          { text: 'Scores S, S+5, 2S total 115. Find S.', sample: '4S+5=115 ⇒ S=27.5.', keywords: ['sum', '115', '27.5'] }
        ],
        moderate: [
          { text: 'x+y=120 and 2x−y=90. Find (x,y).', sample: 'Add ⇒ 3x=210 ⇒ x=70, y=50.', keywords: ['system', '120', '90', '70', '50'] },
          { text: 'R(n)=n²−10n+30. Find minimum runs.', sample: 'Vertex at n=5 ⇒ R(5)=5.', keywords: ['parabola', 'vertex', '5'] }
        ],
        hard: [
          { text: 'A,B,C in AP. B=60, total 180, and (A·C)=3500. Find (A,B,C).', sample: '(60−d)(60+d)=3500 ⇒ d=10 ⇒ (50,60,70).', keywords: ['AP', 'product', '3500', '50', '60', '70'] },
          { text: 'Avg 55 over two scores x,y; and x=2y−10. Find (x,y).', sample: 'x+y=110; 2y−10+y=110 ⇒ y=40, x=70.', keywords: ['average', '55', '70', '40'] }
        ]
      },
      10: {
        easy: [
          { text: 'W(n)=2n+5. How many wickets in 10th match?', sample: 'W(10)=25.', keywords: ['function', 'W(10)=25'] },
          { text: 'R(x)=5x²+1000. Runs after 10 years?', sample: 'R(10)=1500.', keywords: ['quadratic', '1500'] }
        ],
        moderate: [
          { text: 'Scores form GP: a=20, r=1.5. 3rd score?', sample: 'ar²=20·(1.5)²=45.', keywords: ['GP', '20', '1.5', '45'] },
          { text: 'R(t)=6e^{0.2t}. Runs after 5 min?', sample: '≈16.', keywords: ['exponential', 'e', '16'] }
        ],
        hard: [
          { text: 'f(x)=x²−3x+5, g(x)=2x−1. When equal?', sample: 'x²−5x+6=0 ⇒ x=2,3.', keywords: ['quadratic', 'intersection', '2', '3'] },
          { text: 'Career runs grow 15%/yr from 5000. Years to exceed 20000?', sample: '(1.15)^t>4 ⇒ t≈9.9 ⇒ ~10 yrs.', keywords: ['exponential', '15%', '10'] }
        ]
      }
    },

    /* Basketball Algebra */
    basketball: {
      7: {
        easy: [{ text: 'Only 2s and 3s: total points 17, total makes 7. Find one solution (x twos, y threes).', sample: '2x+3y=17, x+y=7 ⇒ y=3, x=4.', keywords: ['2x+3y', 'system', '17', '7', 'x=4', 'y=3'] }],
        moderate: [{ text: 'FT record 18/25. To reach 80% after x perfect attempts, find x.', sample: '(18+x)/(25+x)≥0.8 ⇒ x≥20.', keywords: ['free throw', 'percentage', '80%', 'x=20'] }],
        hard: [{ text: 'Avg 62 over 8 games. Next two both p to get avg ≥ 68. Find min p.', sample: '(496+2p)/10 ≥ 68 ⇒ p ≥ 92.', keywords: ['average', 'inequality', '92'] }]
      },
      8: {
        easy: [{ text: 'Scores 12, x, 21. Avg=18. Find x.', sample: '54 total ⇒ x=21.', keywords: ['average', '54', 'x=21'] }],
        moderate: [{ text: '96 points with 40 makes (2s/3s). How many of each?', sample: '2x+3y=96, x+y=40 ⇒ y=16, x=24.', keywords: ['system', '96', '40', '24', '16'] }],
        hard: [{ text: '2pt:30/40, 3pt:8/20. Make x more 3s (all) for 60% overall. Find x.', sample: '(38+x)/(60+x)=0.6 ⇒ x=2.', keywords: ['percentage', 'overall', 'x=2'] }]
      },
      9: {
        easy: [{ text: 'Points P(n)=4n+6 after n makes. If P=46, find n.', sample: 'n=10.', keywords: ['linear', 'n=10'] }],
        moderate: [{ text: 'x+y=55 and 3x−y=35. Find (x,y).', sample: 'x=22.5, y=32.5.', keywords: ['system', '22.5', '32.5'] }],
        hard: [{ text: 'Q(t)=−t²+14t+20. Find maximum and time.', sample: 't=7, Q(7)=69.', keywords: ['vertex', 'max', 't=7', '69'] }]
      },
      10: {
        easy: [{ text: 'Rebounds R(n)=3n+5. Find R(12).', sample: '41.', keywords: ['function', '41'] }],
        moderate: [{ text: '3PA GP with a=6, r=1.25. 4th game attempts?', sample: '≈11.7.', keywords: ['GP', '1.25'] }],
        hard: [{ text: 'f(x)=x²−8x+18 equals g(x)=2x+1. Solve.', sample: 'x²−10x+17=0 ⇒ x=5±√8.', keywords: ['quadratic', 'intersection'] }]
      }
    },

    /* Football (American) Algebra */
    football: {
      7: {
        easy: [{ text: '2 TD (6) and some FGs (3) total 27. How many FGs?', sample: '12+3f=27 ⇒ f=5.', keywords: ['touchdown', 'field goal', '27', 'f=5'] }],
        moderate: [{ text: 'Rushing yards 12, 9, x, 7 average 10. Find x.', sample: 'Total 40 ⇒ x=12.', keywords: ['average', 'x=12'] }],
        hard: [{ text: 'Kicker 18/22. After x perfect, reach ≥90%. Find x.', sample: '(18+x)/(22+x)≥0.9 ⇒ x≥5.', keywords: ['percentage', 'x=5'] }]
      },
      8: {
        easy: [{ text: 'Drive gained 8 each for 4 downs. Total?', sample: '32 yards.', keywords: ['linear', '32'] }],
        moderate: [{ text: 'x+y=150 and x−y=30 yards. Find (x,y).', sample: 'x=90, y=60.', keywords: ['system', '90', '60'] }],
        hard: [{ text: 'QB 96/150. After x perfect, reach 70%. Find x.', sample: '(96+x)/(150+x)=0.7 ⇒ x=30.', keywords: ['percentage', 'x=30'] }]
      },
      9: {
        easy: [{ text: 'S=7n+3k with n TD (PAT) and k FG. Give integer pair for 31.', sample: 'n=4,k=1 works (28+3).', keywords: ['expression', '31', 'integer'] }],
        moderate: [{ text: 'Y(t)=−2t²+20t+5. When is max and value?', sample: 't=5, Y=55.', keywords: ['vertex', 't=5', '55'] }],
        hard: [{ text: 'Revenue: R=12x+8(1000−x). Max where?', sample: 'Linear ↑ ⇒ boundary x=1000.', keywords: ['optimization', 'boundary'] }]
      },
      10: {
        easy: [{ text: 'G(n)=5n+40. Find G(12).', sample: '100.', keywords: ['function', '100'] }],
        moderate: [{ text: 'K(t)=60e^{-0.03t}. Distance at t=10?', sample: '≈44.4.', keywords: ['exponential', '44.4'] }],
        hard: [{ text: 'x²−6x+10 = 3x−2. Solve.', sample: 'x=3 or 4.', keywords: ['quadratic', '3', '4'] }]
      }
    }
  },

  /* Calculus (Tennis G10) */
  calculus: {
    tennis: {
      10: {
        easy: [
          { text: 'h(t)=−16t²+60t+5 ft. Initial height?', sample: 'h(0)=5 ft.', keywords: ['initial', '5'] },
          { text: 'v(t)=40−8t ft/s. Acceleration?', sample: 'v\'(t)=−8 ft/s².', keywords: ['acceleration', '-8'] }
        ],
        moderate: [
          { text: 's(t)=t³−6t²+9t. When is velocity zero?', sample: 'v=3t²−12t+9=0 ⇒ t=1,3.', keywords: ['derivative', 'zeros'] },
          { text: 'S\'(t)=2t+5, S(0)=10. Find S(3).', sample: 'S=t²+5t+10 ⇒ 34.', keywords: ['integral', '34'] }
        ],
        hard: [
          { text: 'h(t)=−5t²+25t+1 m. Avg height on [0,2]?', sample: '(1/2)∫₀² h dt = 58/3 ≈ 19.33 m.', keywords: ['average value', '19.33'] },
          { text: 'v(t)=100e^{−0.05t} mph. Find v\'(10).', sample: '−5e^{−0.5}≈−3.03.', keywords: ['derivative', '-3.03'] }
        ]
      }
    }
  },

  /* Geometry (Soccer G8) */
  geometry: {
    soccer: {
      8: {
        easy: [
          { text: 'Field 100 m × 60 m. Area?', sample: 'A=6000 m².', keywords: ['area', '6000'] },
          { text: 'Center circle diameter 20 yd. Radius & circumference?', sample: 'r=10 yd; C≈62.8 yd.', keywords: ['circle', 'radius', '62.8'] }
        ],
        moderate: [
          { text: 'Penalty box 44×18 yd. Diagonal distance?', sample: '√2260≈47.5 yd.', keywords: ['pythagoras', '47.5'] },
          { text: 'Penalty 44×18; goal 20×6. Area outside?', sample: '792−120=672 yd².', keywords: ['area difference', '672'] }
        ],
        hard: [
          { text: 'Perimeter 360 m; length = width+30. Dimensions?', sample: 'w=75, l=105.', keywords: ['perimeter', '105', '75'] },
          { text: 'Corner→center→midpoint opposite sideline on 100×60. Total distance?', sample: '≈108.31 m.', keywords: ['distance', '108.31'] }
        ]
      }
    }
  }
};

function getCurated(area, sport, grade, level) {
  const a = (area || '').toLowerCase();
  const s = (sport || '').toLowerCase();
  const g = String(+grade || 0);
  return (((CURATED[a] || {})[s] || {})[g] || {})[(level || '').toLowerCase()] || [];
}

/* ------------------ Generators (fallback to reach 3) ------------------ */
function genAlgebra(level, grade, sport, count = 3) {
  const S = sportOrDefault(sport) || 'sport';
  const noun = (sp => {
    const s = (sp || '').toLowerCase();
    if (s === 'cricket') return 'runs';
    if (s === 'football') return 'yards';
    if (s === 'soccer') return 'goals';
    if (s === 'basketball' || s === 'tennis') return 'points';
    return 'points';
  })(S);
  const out = []; const names = ['Rahul', 'Aisha', 'Maya', 'Arjun', 'Sam', 'Liam', 'Zara', 'Ishan'];
  for (let i = 1; i <= count; i++) {
    const name = names[i % names.length];
    if (level === 'easy') {
      const a = 2 + (i % 4), b = 3 + (i % 3), x = 4 + (i % 5);
      const total = a * x + b;
      out.push({
        tag: 'Algebra',
        text: `${name} practices ${S}. Each success earns ${a} ${noun} plus ${b} bonus ${noun}. If total is ${total}, how many successes x?`,
        sample: `${a}x+${b}=${total} ⇒ x=${(total - b) / a}.`,
        keywords: ['linear', String(a), String(b), String(total)]
      });
    } else if (level === 'moderate') {
      const s1 = 10 + (i % 5), s2 = 8 + (i % 4), s3 = 12 + (i % 6), target = 12 + (+grade % 5);
      const totalNeeded = target * 4, sum = s1 + s2 + s3, need = totalNeeded - sum;
      out.push({
        tag: 'Algebra',
        text: `${name} loves ${S}: ${s1}, ${s2}, ${s3} ${noun}. Aim avg ${target} over 4. How many in game 4?`,
        sample: `Need ${totalNeeded} total; have ${sum} ⇒ ${need}.`,
        keywords: ['average', String(target), String(need)]
      });
    } else {
      const made = 10 + (i % 5), total = 18 + (i % 6), target = 70 + (+grade % 3) * 5, p = target / 100;
      const x = Math.max(0, Math.ceil((p * total - made) / (1 - p)));
      out.push({
        tag: 'Algebra',
        text: `${name}'s ${S} success rate is ${made}/${total}. Perfect next x to reach ${target}%?`,
        sample: `(made+x)/(total+x) ≥ ${target}/100 ⇒ x≥${x}.`,
        keywords: ['percentage', String(target), String(x)]
      });
    }
  }
  return out;
}
function genCalculus(level, grade, sport, count = 3) {
  const S = sportOrDefault(sport) || 'sport'; const out = [];
  for (let i = 1; i <= count; i++) {
    if (level === 'easy') {
      const m = 2 + i, b = 3 + i;
      out.push({
        tag: 'Calculus', text: `In ${S}, position p(t)=${m}t²+${b}t. Find p'(t).`,
        sample: `p'(t)=${2 * m}t+${b}.`, keywords: ['derivative', 'power rule']
      });
    } else if (level === 'moderate') {
      out.push({
        tag: 'Calculus', text: `Training load g(t)=(2t²+1)³. Find g'(t).`,
        sample: `g'(t)=12t(2t²+1)².`, keywords: ['chain rule']
      });
    } else {
      const P = 40 + 2 * (+grade || 0);
      out.push({
        tag: 'Calculus', text: `A rectangular ${S} area has fixed perimeter ${P}. Which dims maximize area?`,
        sample: `Square ⇒ L=W=${P / 4}.`, keywords: ['optimize', 'perimeter']
      });
    }
  }
  return out;
}
function genGeometry(level, grade, sport, count = 3) {
  const S = sportOrDefault(sport) || 'sport', out = [];
  for (let i = 1; i <= count; i++) {
    if (level === 'easy') {
      const L = 20 + i, W = 10 + (i % 3);
      out.push({
        tag: 'Geometry', text: `Design a ${S} mini-court L=${L}, W=${W}. Perimeter & area?`,
        sample: `2(L+W)=${2 * (L + W)}, L·W=${L * W}.`, keywords: ['perimeter', 'area']
      });
    } else if (level === 'moderate') {
      const a = 6 + i % 3, b = 8 + i % 2;
      out.push({
        tag: 'Geometry', text: `A ${S} drill uses a right triangle with legs ${a} and ${b}. Find c.`,
        sample: `c=√(${a}²+${b}²)=${Math.hypot(a, b).toFixed(2)}.`, keywords: ['pythagoras', 'hypotenuse']
      });
    } else {
      out.push({
        tag: 'Geometry', text: `Scale a ${S} field by 2:1. Triangle base 12, height 8. Scaled dims?`,
        sample: `Base 24, height 16.`, keywords: ['similarity', 'scale']
      });
    }
  }
  return out;
}
function genTrigonometry(level, grade, sport, count = 3) {
  const S = sportOrDefault(sport) || 'sport', out = [];
  for (let i = 1; i <= count; i++) {
    if (level === 'easy') {
      const opp = 3 + i % 2, adj = 4 + i % 3, hyp = Math.hypot(opp, adj).toFixed(2);
      out.push({
        tag: 'Trigonometry', text: `A ${S} ramp rises ${opp} over ${adj}. Find sin, cos, tan.`,
        sample: `sin=${opp}/${hyp}, cos=${adj}/${hyp}, tan=${opp}/${adj}.`, keywords: ['sin', 'cos', 'tan']
      });
    } else if (level === 'moderate') {
      const h = 10 + i % 3, d = 15 + i % 4;
      out.push({
        tag: 'Trigonometry', text: `From ${d} m away, a ${S} coach looks up ${h} m. Angle of elevation?`,
        sample: `tanθ=h/d ⇒ θ≈${(Math.atan(h / d) * 180 / Math.PI).toFixed(1)}°.`, keywords: ['angle', 'tan']
      });
    } else {
      out.push({
        tag: 'Trigonometry', text: `Solve 0°≤x<360°: 2sin x = √3 (in a ${S} drill).`,
        sample: `sin x=√3/2 ⇒ x=60°,120°.`, keywords: ['solve', 'sin']
      });
    }
  }
  return out;
}
function genProbability(level, grade, sport, count = 3) {
  const S = sportOrDefault(sport) || 'sport', out = [];
  for (let i = 1; i <= count; i++) {
    if (level === 'easy') {
      out.push({
        tag: 'Probability', text: `A coin decides who starts a ${S} game. P(two heads in a row)?`,
        sample: `1/2 × 1/2 = 1/4.`, keywords: ['independent', '1/4']
      });
    } else if (level === 'moderate') {
      const n = 6 + i % 3;
      out.push({
        tag: 'Probability', text: `From ${n} ${S} players, ways to choose captain & vice (order matters)?`,
        sample: `P(${n},2)=${n * (n - 1)}.`, keywords: ['permutation']
      });
    } else {
      const p = 0.6, trials = 10;
      out.push({
        tag: 'Probability', text: `Success prob p=${p} per ${S} attempt. Expected successes in ${trials}?`,
        sample: `E=np=${trials * p}.`, keywords: ['binomial', 'expected value']
      });
    }
  }
  return out;
}
function pickGenerator(area) {
  switch (area) {
    case 'algebra': return genAlgebra;
    case 'calculus': return genCalculus;
    case 'geometry': return genGeometry;
    case 'trigonometry': return genTrigonometry;
    case 'probability': return genProbability;
    default: return null;
  }
}

/* ------------------ Build 3 Qs: curated first, then fill ------------------ */
function makeQuestions(area, hobby, level, grade) {
  const COUNT = 3;
  const sport = sportOrDefault(hobby);
  const curated = sport ? getCurated(area, sport, grade, level) : [];
  const curatedTagged = curated.map(q => ({ ...q, tag: area[0].toUpperCase() + area.slice(1) }));
  const need = Math.max(0, COUNT - curatedTagged.length);
  const gen = pickGenerator(area);
  const filler = need > 0 && gen ? gen(level, grade, sport, need) : [];
  return [...curatedTagged, ...filler].slice(0, COUNT).map(q => ({
    ...q,
    keywords: (q.keywords || []).map(k => String(k).toLowerCase())
  }));
}

/* ------------------ Evaluate ------------------ */
function evaluateAnswer(answer, keywords) {
  const a = (answer || '').toLowerCase();
  const uniq = [...new Set(keywords)];
  const hits = uniq.filter(k => a.includes(k));
  const score = Math.round(100 * hits.length / Math.max(1, uniq.length));
  const missing = uniq.filter(k => !hits.includes(k));
  const verdict = score >= 80 ? 'Excellent — covers most key points.' :
    score >= 60 ? 'Good — add a few details.' :
      score >= 40 ? 'Okay — expand on steps.' :
        'Needs improvement — add definitions, steps, and a check.';
  return { score, verdict, missing };
}

/* ------------------ State + History ------------------ */
let state = { questions: [], idx: 0, meta: { area: '', sport: '', level: '', grade: '' } };
const STORAGE_KEY = 'mathTrainerHistoryV2';
function loadHistory() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] } catch { return [] } }
function saveHistory(item) { const d = loadHistory(); d.unshift(item); localStorage.setItem(STORAGE_KEY, JSON.stringify(d.slice(0, 150))); }
function resetHistory() { localStorage.removeItem(STORAGE_KEY); }

function renderQuestion() {
  if (!state.questions.length) {
    $("problem").innerHTML = 'No question yet. Choose an area and click <em>Generate Questions</em>.';
    $("q-meta").textContent = '—'; $("status").textContent = ''; $("answer").value = ''; return;
  }
  const q = state.questions[state.idx];
  $("problem").textContent = q.text;
  $("q-meta").textContent = `Q${state.idx + 1}/${state.questions.length} · ${q.tag} · ${state.meta.level} · Grade ${state.meta.grade}${state.meta.sport ? ' · ' + state.meta.sport : ''}`;
  $("status").textContent = ''; $("answer").value = '';
}

function updateHistoryUI() {
  const list = $("history-list"); if (!list) return; const data = loadHistory(); list.innerHTML = '';
  data.slice(0, 10).forEach(r => {
    const li = document.createElement('li');
    const left = document.createElement('span'); left.textContent = `${r.tag} · ${r.level} · G${r.grade}${r.sport ? ' · ' + r.sport : ''} · ${new Date(r.at).toLocaleString()}`;
    const right = document.createElement('strong'); right.textContent = `${r.score}/100`;
    li.appendChild(left); li.appendChild(right); list.appendChild(li);
  });
  $("avg-score").textContent = data.length ? Math.round(data.reduce((s, r) => s + r.score, 0) / data.length) : '—';
  $("attempts").textContent = data.length;
}

/* ------------------ Bindings ------------------ */
document.addEventListener('DOMContentLoaded', () => {
  const form = $("generator-form");
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const area = $("topic").value;
      const sport = $("hobby").value;      // optional
      const level = $("difficulty").value;
      const grade = $("grade").value;
      if (!area) { $("topic").reportValidity?.(); return; }
      if (!level) { $("difficulty").reportValidity?.(); return; }
      if (!grade) { $("grade").reportValidity?.(); return; }
      state.questions = makeQuestions(area, sport, level, grade);
      state.idx = 0; state.meta = { area, sport, level, grade };
      renderQuestion();
    });
  }

  $("btn-clear")?.addEventListener('click', () => {
    $("topic").selectedIndex = 0; $("hobby").selectedIndex = 0; $("difficulty").selectedIndex = 0; $("grade").selectedIndex = 0; $("answer").value = '';
    state = { questions: [], idx: 0, meta: { area: '', sport: '', level: '', grade: '' } }; renderQuestion();
  });

  $("btn-prev")?.addEventListener('click', () => { if (!state.questions.length) return; state.idx = (state.idx - 1 + state.questions.length) % state.questions.length; renderQuestion(); });
  $("btn-next")?.addEventListener('click', () => { if (!state.questions.length) return; state.idx = (state.idx + 1) % state.questions.length; renderQuestion(); });

  $("btn-eval")?.addEventListener('click', () => {
    if (!state.questions.length) { alert('Generate a question first.'); return; }
    const q = state.questions[state.idx];
    const { score, verdict, missing } = evaluateAnswer($("answer").value, q.keywords);
    const missingTxt = missing.length ? ` Missing: <em>${missing.slice(0, 6).join(', ')}</em>` : '';
    $("status").innerHTML = `<span class="${score >= 60 ? 'ok' : 'bad'}">Score: ${score}/100</span> — ${verdict}.${missingTxt}`;
    saveHistory({ tag: q.tag, score, at: Date.now(), level: state.meta.level, grade: state.meta.grade, sport: state.meta.sport });
    updateHistoryUI();
  });

  $("btn-sample")?.addEventListener('click', () => { if (!state.questions.length) return; const q = state.questions[state.idx]; $("status").innerHTML = `<em>Sample outline:</em> ${q.sample}`; });

  $("btn-copy")?.addEventListener('click', async () => { if (!state.questions.length) return; try { await navigator.clipboard.writeText(state.questions[state.idx].text); $("status").textContent = 'Question copied to clipboard.'; } catch { $("status").textContent = 'Copy failed. Select and copy manually.'; } });

  $("btn-reset")?.addEventListener('click', () => { if (confirm('Reset all saved attempts?')) { resetHistory(); updateHistoryUI(); } });

  $("answer")?.addEventListener('keydown', (ev) => { if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') { ev.preventDefault(); $("btn-eval")?.click(); } });

  renderQuestion(); updateHistoryUI();
});
