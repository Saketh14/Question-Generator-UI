// script.js — vanilla, no UX changes
'use strict';
const $ = (id) => document.getElementById(id);

// ------------------ sports (5 only) ------------------
const SPORTS = ['cricket', 'football', 'soccer', 'basketball', 'tennis'];
function validSport(s) { return SPORTS.includes((s || '').toLowerCase()); }
function sportOrDefault(s) { return validSport(s) ? s.toLowerCase() : 'your sport'; }

// ------------------ curated bank ---------------------
const CURATED = {
  // ===== Algebra (Cricket — from your spec) =====
  algebra: {
    cricket: {
      7: {
        easy: [
          {
            text: 'A batsman scores 15 and 23. To average 20 over 3 matches, how many in the third?',
            sample: 'Total needed 20×3=60; so far 15+23=38; x=60−38=22.',
            keywords: ['average', '20', '60', '15', '23', 'runs', 'third', '22']
          },
          {
            text: 'Losing team: 120 runs. Winners scored 15 more. Find the winners’ score s.',
            sample: 's=120+15=135.',
            keywords: ['equation', '120', '15', '135', 'runs']
          }
        ],
        moderate: [
          {
            text: 'First innings: w wickets. Second: 2w+3. Total 18. Find w.',
            sample: 'w+(2w+3)=18 ⇒ 3w=15 ⇒ w=5.',
            keywords: ['wickets', 'system', '18', '2w+3', 'w=5']
          },
          {
            text: 'Total 200 runs. Boundaries = 3s−20; singles/doubles = s. Find s and both parts.',
            sample: 's+(3s−20)=200 ⇒ 4s=220 ⇒ s=55; boundaries=145.',
            keywords: ['boundaries', 'singles', 'doubles', '200', '55', '145']
          }
        ],
        hard: [
          {
            text: 'Avg 35 over 8 innings. After 9th, avg 37. Runs in 9th?',
            sample: '8×35=280; 9×37=333; 333−280=53.',
            keywords: ['average', '35', '37', '9th', '53']
          },
          {
            text: 'RR 5.2 after 15 overs. Want overall 6 after 20. Required run rate next 5?',
            sample: 'Runs now 78; need 120; next 5 need 42 ⇒ 42/5=8.4.',
            keywords: ['run rate', 'overs', '5.2', '6.0', '8.4']
          }
        ]
      },
      8: {
        easy: [
          {
            text: 'Team score S is 25 less than 3×75. Find S.',
            sample: 'S=3×75−25=200.',
            keywords: ['200', '75', '3×75', '25']
          },
          {
            text: 'Scores: 30, x, 45. Avg=40. Find x.',
            sample: '40×3=120; 30+x+45=120 ⇒ x=45.',
            keywords: ['average', '120', 'x=45']
          }
        ],
        moderate: [
          {
            text: 'P and Q took 15 wickets. P=2Q−3. Find (P,Q).',
            sample: 'q+(2q−3)=15 ⇒ q=6, P=9.',
            keywords: ['wickets', '2q−3', '15', '6', '9']
          },
          {
            text: 'Avg n matches=180. Next score 220 makes avg 185. Find total matches now.',
            sample: '(180n+220)/(n+1)=185 ⇒ n=7 ⇒ total 8.',
            keywords: ['average', '180', '220', '185', 'n=7', '8']
          }
        ],
        hard: [
          {
            text: 'X+Y=75; and 2X+(Y−5)=120. Find (X,Y).',
            sample: '2x+y=125 with x+y=75 ⇒ x=50 ⇒ y=25.',
            keywords: ['system', '75', '120', '50', '25']
          },
          {
            text: 'Revised: Avg 24 after w wickets. Next 5 wickets cost 150 runs. New avg 25. Find w.',
            sample: '24w+150=25(w+5) ⇒ w=25.',
            keywords: ['average', '24', '25', '150', 'w=25']
          }
        ]
      },
      9: {
        easy: [
          {
            text: 'Team runs 5x+10=110. Find x.',
            sample: '5x=100 ⇒ x=20.',
            keywords: ['linear', '110', 'x=20']
          },
          {
            text: 'Scores S, S+5, 2S total 115. Find S.',
            sample: '4S+5=115 ⇒ S=27.5.',
            keywords: ['sum', '115', '27.5']
          }
        ],
        moderate: [
          {
            text: 'x+y=120 and 2x−y=90. Find (x,y).',
            sample: 'Add ⇒ 3x=210 ⇒ x=70, y=50.',
            keywords: ['system', '120', '90', '70', '50']
          },
          {
            text: 'R(n)=n²−10n+30. Find minimum runs.',
            sample: 'Vertex at n=5 ⇒ R(5)=5.',
            keywords: ['parabola', 'vertex', '5']
          }
        ],
        hard: [
          {
            text: 'A,B,C in AP. B=60, total 180, and (A·C)=3500. Find (A,B,C).',
            sample: '(60−d)(60+d)=3500 ⇒ d=10 ⇒ (50,60,70).',
            keywords: ['AP', 'product', '3500', '50', '60', '70']
          },
          {
            text: 'Avg 55 over two scores x,y; and x=2y−10. Find (x,y).',
            sample: 'x+y=110; 2y−10+y=110 ⇒ y=40, x=70.',
            keywords: ['average', '55', '70', '40']
          }
        ]
      },
      10: {
        easy: [
          {
            text: 'W(n)=2n+5. How many wickets in 10th match?',
            sample: 'W(10)=25.',
            keywords: ['function', 'W(10)=25']
          },
          {
            text: 'R(x)=5x²+1000. Runs after 10 years?',
            sample: 'R(10)=5·100+1000=1500.',
            keywords: ['quadratic', '1500']
          }
        ],
        moderate: [
          {
            text: 'Scores form GP: a=20, r=1.5. 3rd score?',
            sample: 'ar²=20·(1.5)²=45.',
            keywords: ['GP', '20', '1.5', '45']
          },
          {
            text: 'R(t)=6e^{0.2t}. Runs after 5 min (nearest whole)?',
            sample: 'R(5)=6e≈16.',
            keywords: ['exponential', 'e', '16']
          }
        ],
        hard: [
          {
            text: 'f(x)=x²−3x+5, g(x)=2x−1. When equal?',
            sample: 'x²−5x+6=0 ⇒ x=2,3.',
            keywords: ['quadratic', 'intersection', '2', '3']
          },
          {
            text: 'Career runs grow 15%/yr from 5000. Years to exceed 20000?',
            sample: '(1.15)^t>4 ⇒ t> log4/log1.15 ≈ 9.9 ⇒ 10 yrs.',
            keywords: ['exponential', '15%', '10']
          }
        ]
      }
    },

    // ===== New: Algebra (Basketball) =====
    basketball: {
      7: {
        easy: [
          {
            text: 'A player made only 2-pointers and 3-pointers. If total points = 17 and made shots = 7, find one solution (x twos, y threes).',
            sample: '2x+3y=17, x+y=7 ⇒ y=3, x=4.',
            keywords: ['2x+3y', 'system', '17', '7', 'x=4', 'y=3']
          }
        ],
        moderate: [
          {
            text: 'FT record 18/25. To reach 80% after x more attempts (all makes), how many x?',
            sample: '(18+x)/(25+x)≥0.8 ⇒ x≥20.',
            keywords: ['free throw', 'percentage', '80%', 'inequality', 'x=20']
          }
        ],
        hard: [
          {
            text: 'Team averages 62 points over 8 games. Next 2 games both score p points and want average ≥ 68 over 10 games. Find minimum p.',
            sample: '(62·8 + 2p)/10 ≥ 68 ⇒ 496+2p ≥ 680 ⇒ p ≥ 92.',
            keywords: ['average', 'inequality', '92']
          }
        ]
      },
      8: {
        easy: [
          {
            text: 'A guard scores 12, x, and 21 points. If avg is 18, find x.',
            sample: '18·3=54; 12+x+21=54 ⇒ x=21.',
            keywords: ['average', '54', 'x=21']
          }
        ],
        moderate: [
          {
            text: 'A team scores 96 with 2-pointers and 3-pointers only; made shots = 40. How many of each?',
            sample: '2x+3y=96, x+y=40 ⇒ y=16, x=24.',
            keywords: ['system', '96', '40', 'x=24', 'y=16']
          }
        ],
        hard: [
          {
            text: 'A shooter is 30/40 on 2s and 8/20 on 3s. If he takes x more 3s and makes all to raise overall FG% to 60%, find x.',
            sample: '(30+8+x)/(40+20+x)=0.6 ⇒ x=2.',
            keywords: ['percentage', 'overall', '60%', 'x=2']
          }
        ]
      },
      9: {
        easy: [
          {
            text: 'Points P(n)=4n+6 after n made shots (mix of 2s/3s). If P=46, find n.',
            sample: '4n+6=46 ⇒ n=10.',
            keywords: ['linear', 'n=10', '46']
          }
        ],
        moderate: [
          {
            text: 'Two players’ points satisfy x+y=55 and 3x−y=35. Find (x,y).',
            sample: 'Add ⇒ 4x=90 ⇒ x=22.5, y=32.5.',
            keywords: ['system', '55', '35', '22.5', '32.5']
          }
        ],
        hard: [
          {
            text: 'Game score modeled by Q(t)=−t²+14t+20. At what t is the maximum and what is it?',
            sample: 'Vertex at t=−b/2a=7; Q(7)=69.',
            keywords: ['vertex', 'maximum', 't=7', '69']
          }
        ]
      },
      10: {
        easy: [
          {
            text: 'Rebounds R(n)=3n+5. How many after n=12?',
            sample: 'R(12)=41.',
            keywords: ['function', 'R(12)=41']
          }
        ],
        moderate: [
          {
            text: '3-point attempts form GP: a=6, r=1.25. Attempts in 4th game?',
            sample: 'ar^3=6·(1.25)^3≈11.7.',
            keywords: ['GP', '1.25', '4th']
          }
        ],
        hard: [
          {
            text: 'Player value f(x)=x²−8x+18 equals g(x)=2x+1. Solve for x.',
            sample: 'x²−10x+17=0 ⇒ x=5±√8.',
            keywords: ['quadratic', 'intersection']
          }
        ]
      }
    },

    // ===== New: Algebra (Football — American rules) =====
    football: {
      7: {
        easy: [
          {
            text: 'A team scored 2 touchdowns (6 each) and some field goals (3 each) for 27 points. How many field goals?',
            sample: '2·6 + 3f = 27 ⇒ 12+3f=27 ⇒ f=5.',
            keywords: ['touchdown', 'field goal', '27', 'f=5']
          }
        ],
        moderate: [
          {
            text: 'Rushing yards: 12, 9, x, 7 average 10. Find x.',
            sample: 'Average 10 over 4 ⇒ total 40; 12+9+x+7=40 ⇒ x=12.',
            keywords: ['average', '40', 'x=12']
          }
        ],
        hard: [
          {
            text: 'Kicker is 18/22 on field goals. After x perfect attempts, overall ≥ 90%. Find x.',
            sample: '(18+x)/(22+x) ≥ 0.9 ⇒ x ≥ 5.',
            keywords: ['percentage', 'inequality', '90%', 'x=5']
          }
        ]
      },
      8: {
        easy: [
          {
            text: 'A drive gained 8y each down for 4 downs. Write total yards T and find T.',
            sample: 'T=4·8=32 yards.',
            keywords: ['linear', '32']
          }
        ],
        moderate: [
          {
            text: 'Two backs had yards x and y with x+y=150 and x−y=30. Find (x,y).',
            sample: 'Add ⇒ 2x=180 ⇒ x=90, y=60.',
            keywords: ['system', '90', '60']
          }
        ],
        hard: [
          {
            text: 'QB completion % is 64% (96/150). After x perfect attempts, reach 70%. Find x.',
            sample: '(96+x)/(150+x)=0.70 ⇒ x=30.',
            keywords: ['percentage', 'completion', '70%', 'x=30']
          }
        ]
      },
      9: {
        easy: [
          {
            text: 'Score model S(n)=7n+3k with n TDs (with PAT) and k FGs. If S=31 and k=2, find n.',
            sample: '7n+3·2=31 ⇒ 7n=25 ⇒ n not integer → need n=3,k=2 gives 27; n=4,k=1 gives 31.',
            keywords: ['expression', 'integer', '31']
          }
        ],
        moderate: [
          {
            text: 'Yards model Y(t)=−2t²+20t+5. When is max yards and value?',
            sample: 't=−b/2a=5; Y(5)=55.',
            keywords: ['vertex', 'maximum', 't=5', '55']
          }
        ],
        hard: [
          {
            text: 'Ticket revenue: f(x)=12x+8(1000−x). Find x for max revenue.',
            sample: 'R(x)=12x+8000−8x=4x+8000 → linear ⇒ max at x=1000 (boundary).',
            keywords: ['optimization', 'boundary']
          }
        ]
      },
      10: {
        easy: [
          {
            text: 'Yards per game G(n)=5n+40. Find G(12).',
            sample: 'G(12)=100.',
            keywords: ['function', 'G(12)=100']
          }
        ],
        moderate: [
          {
            text: 'Kicking distance K(t)=60e^{-0.03t}. Distance after 10s (nearest ft)?',
            sample: '≈ 60e^{-0.3} ≈ 44.4.',
            keywords: ['exponential', 'e', '44.4']
          }
        ],
        hard: [
          {
            text: 'f(x)=x^2−6x+10 equals g(x)=3x−2. Solve.',
            sample: 'x^2−9x+12=0 ⇒ x=3 or 4.',
            keywords: ['quadratic', 'intersection', '3', '4']
          }
        ]
      }
    }
  },

  // ===== Calculus (Tennis — G10) =====
  calculus: {
    tennis: {
      10: {
        easy: [
          { text: 'h(t)=−16t²+60t+5 ft. Initial height?', sample: 'h(0)=5 ft.', keywords: ['initial', '5'] },
          { text: 'v(t)=40−8t ft/s. Acceleration?', sample: 'a(t)=−8 ft/s².', keywords: ['acceleration', '-8'] }
        ],
        moderate: [
          { text: 's(t)=t³−6t²+9t. When is velocity zero?', sample: 'v=3t²−12t+9=0 ⇒ t=1,3.', keywords: ['derivative', 'zeros'] },
          { text: 'S\'(t)=2t+5, S(0)=10. Find S(3).', sample: 'S=t²+5t+10 ⇒ S(3)=34.', keywords: ['integral', '34'] }
        ],
        hard: [
          { text: 'h(t)=−5t²+25t+1 m. Avg height on [0,2]?', sample: 'Avg=(1/2)∫₀² h dt = 58/3 ≈ 19.33 m.', keywords: ['average value', '19.33'] },
          { text: 'v(t)=100e^{−0.05t} mph. Find v\'(10).', sample: 'v\'=−5e^{−0.05t}; v\'(10)≈−3.03.', keywords: ['derivative', '-3.03'] }
        ]
      }
    }
  },

  // ===== Geometry (Soccer — G8) =====
  geometry: {
    soccer: {
      8: {
        easy: [
          { text: 'Field 100 m × 60 m. Area?', sample: 'A=100×60=6000 m².', keywords: ['area', '6000'] },
          { text: 'Center circle diameter 20 yd. Radius & circumference?', sample: 'r=10 yd; C≈3.14×20=62.8 yd.', keywords: ['circle', 'radius', '62.8'] }
        ],
        moderate: [
          { text: 'Penalty box 44×18 yd. Diagonal distance?', sample: '√(44²+18²)=√2260≈47.5 yd.', keywords: ['pythagoras', '47.5'] },
          { text: 'Penalty area 44×18; goal area 20×6. Area outside?', sample: '792−120=672 yd².', keywords: ['area difference', '672'] }
        ],
        hard: [
          { text: 'Perimeter 360 m; length is width+30. Dimensions?', sample: 'w=75, l=105.', keywords: ['perimeter', '105', '75'] },
          { text: 'Corner→center→midpoint opposite sideline on 100×60. Total distance?', sample: '≈58.31+50=108.31 m.', keywords: ['distance', '108.31'] }
        ]
      }
    }
  }
};

// quick curated fetch
function getCurated(area, sport, grade, level) {
  const a = (area || '').toLowerCase();
  const s = (sport || '').toLowerCase();
  const g = String(+grade || 0);
  return (((CURATED[a] || {})[s] || {})[g] || {})[(level || '').toLowerCase()] || [];
}

// ------------------ generators (fallbacks) ---------------
function genAlgebra(level, grade, sport, count = 3) {
  const S = sportOrDefault(sport);
  const out = [];
  const names = ['Rahul', 'Aisha', 'Neha', 'Arjun', 'Sam', 'Liam', 'Maya', 'Ishan', 'Zara', 'Kiran', 'Aarav', 'Anya'];
  const noun = (sp => {
    const s = (sp || '').toLowerCase();
    if (s === 'cricket') return 'runs';
    if (s === 'football') return 'yards';
    if (s === 'soccer') return 'goals';
    if (s === 'basketball' || s === 'tennis') return 'points';
    return 'points';
  })(S);

  for (let i = 1; i <= count; i++) {
    const name = names[i % names.length];
    if (level === 'easy') {
      const a = 2 + (i % 4), b = 3 + (i % 3), x = 4 + (i % 5);
      const total = a * x + b;
      out.push({
        tag: 'Algebra',
        text: `${name} practices ${S}. Each success earns ${a} ${noun} plus a bonus ${b} ${noun}. If total is ${total} ${noun}, how many successes x?`,
        sample: `Eqn: ${a}x + ${b} = ${total} ⇒ x = ${(total - b) / a}.`,
        keywords: ['linear', 'equation', String(a), String(b), String(total)]
      });
    } else if (level === 'moderate') {
      const s1 = 10 + (i % 5), s2 = 8 + (i % 4), s3 = 12 + (i % 6), target = 12 + (+grade % 5);
      const totalNeeded = target * 4, sum = s1 + s2 + s3, need = totalNeeded - sum;
      out.push({
        tag: 'Algebra',
        text: `${name} loves ${S}. First three games: ${s1}, ${s2}, ${s3} ${noun}. Aim avg ${target} over 4 games. How many ${noun} in game 4?`,
        sample: `Total ${totalNeeded}, so far ${sum} ⇒ need ${need}.`,
        keywords: ['average', String(target), String(totalNeeded), String(sum), String(need)]
      });
    } else {
      const made = 10 + (i % 5), total = 18 + (i % 6), target = 70 + (+grade % 3) * 5, p = target / 100;
      const x = Math.max(0, Math.ceil((p * total - made) / (1 - p)));
      out.push({
        tag: 'Algebra',
        text: `${name}'s ${S} success rate is ${made}/${total}. How many perfect attempts x next to reach ${target}%?`,
        sample: `(made+x)/(total+x) ≥ ${target}/100 ⇒ x ≥ ${x}.`,
        keywords: ['percentage', 'inequality', String(target), String(x)]
      });
    }
  }
  return out;
}

function genCalculus(level, grade, sport, count = 3) {
  const S = sportOrDefault(sport), out = [];
  for (let i = 1; i <= count; i++) {
    if (level === 'easy') {
      const m = 2 + i, b = 3 + i;
      out.push({
        tag: 'Calculus',
        text: `In ${S}, position p(t)=${m}t²+${b}t. Find velocity p'(t).`,
        sample: `p'(t)=${2 * m}t+${b} (power rule).`,
        keywords: ['derivative', 'power rule']
      });
    } else if (level === 'moderate') {
      out.push({
        tag: 'Calculus',
        text: `Training load g(t)=(2t²+1)³. Find g'(t) (chain rule).`,
        sample: `g'(t)=3(2t²+1)²·(4t)=12t(2t²+1)².`,
        keywords: ['chain rule']
      });
    } else {
      const P = 40 + 2 * (+grade || 0);
      out.push({
        tag: 'Calculus',
        text: `A rectangular ${S} area has fixed perimeter ${P}. Which dimensions maximize area?`,
        sample: `Square: L=W=${P}/4.`,
        keywords: ['optimize', 'perimeter']
      });
    }
  }
  return out;
}

function genGeometry(level, grade, sport, count = 3) {
  const S = sportOrDefault(sport), out = [];
  for (let i = 1; i <= count; i++) {
    if (level === 'easy') {
      const L = 20 + i, W = 10 + (i % 3);
      out.push({
        tag: 'Geometry',
        text: `Design a ${S} mini-court L=${L}, W=${W}. Find perimeter & area.`,
        sample: `Perimeter=2(L+W)=${2 * (L + W)}, Area=L·W=${L * W}.`,
        keywords: ['perimeter', 'area']
      });
    } else if (level === 'moderate') {
      const a = 6 + i % 3, b = 8 + i % 2;
      out.push({
        tag: 'Geometry',
        text: `A ${S} drill uses a right triangle with legs ${a} and ${b}. Find the hypotenuse.`,
        sample: `c=√(${a}²+${b}²)=${Math.hypot(a, b).toFixed(2)}.`,
        keywords: ['pythagoras', 'hypotenuse']
      });
    } else {
      const scale = 2;
      out.push({
        tag: 'Geometry',
        text: `Scale a ${S} field diagram by ${scale}:1. Original triangle base 12, height 8. Find scaled dimensions.`,
        sample: `Base 24, height 16.`,
        keywords: ['similarity', 'scale']
      });
    }
  }
  return out;
}

function genTrigonometry(level, grade, sport, count = 3) {
  const S = sportOrDefault(sport), out = [];
  for (let i = 1; i <= count; i++) {
    if (level === 'easy') {
      const opp = 3 + i % 2, adj = 4 + i % 3, hyp = Math.hypot(opp, adj).toFixed(2);
      out.push({
        tag: 'Trigonometry',
        text: `A ${S} ramp rises ${opp} over run ${adj}. Compute sinθ, cosθ, tanθ.`,
        sample: `sin=${opp}/${hyp}, cos=${adj}/${hyp}, tan=${opp}/${adj}.`,
        keywords: ['sin', 'cos', 'tan']
      });
    } else if (level === 'moderate') {
      const h = 10 + i % 3, d = 15 + i % 4;
      out.push({
        tag: 'Trigonometry',
        text: `From ${d} m away, a ${S} coach looks up ${h} m. Find the angle of elevation.`,
        sample: `tanθ=h/d ⇒ θ≈${(Math.atan(h / d) * 180 / Math.PI).toFixed(1)}°.`,
        keywords: ['angle of elevation', 'tan']
      });
    } else {
      out.push({
        tag: 'Trigonometry',
        text: `Solve for 0°≤x<360°: 2sin x = √3 (angles in a ${S} drill).`,
        sample: `sin x=√3/2 ⇒ x=60°,120° (principal range).`,
        keywords: ['solve', 'sin', '√3/2']
      });
    }
  }
  return out;
}

function genProbability(level, grade, sport, count = 3) {
  const S = sportOrDefault(sport), out = [];
  for (let i = 1; i <= count; i++) {
    if (level === 'easy') {
      out.push({
        tag: 'Probability',
        text: `A coin toss decides who starts a ${S} game. Probability of two heads in a row?`,
        sample: `1/2 × 1/2 = 1/4.`,
        keywords: ['independent', '1/4']
      });
    } else if (level === 'moderate') {
      const n = 6 + i % 3;
      out.push({
        tag: 'Probability',
        text: `From ${n} ${S} players, how many ways to choose a captain and a vice-captain (order matters)?`,
        sample: `P(${n},2)=${n * (n - 1)}.`,
        keywords: ['permutation']
      });
    } else {
      const p = 0.6, trials = 10;
      out.push({
        tag: 'Probability',
        text: `A player succeeds with probability p=${p} per ${S} attempt. Expected successes in ${trials} attempts?`,
        sample: `E=np=${trials * p}.`,
        keywords: ['binomial', 'expected value']
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

// prefer curated; fill to 3 with generator
function makeQuestions(area, hobby, level, grade) {
  const COUNT = 3;
  const sport = sportOrDefault(hobby);
  const curated = getCurated(area, sport, grade, level)
    .map(q => ({ ...q, tag: (area || '').charAt(0).toUpperCase() + area.slice(1) }));
  const need = Math.max(0, COUNT - curated.length);
  let filler = [];
  if (need > 0) {
    const gen = pickGenerator(area);
    filler = gen ? gen(level, grade, sport, need) : [];
  }
  return [...curated, ...filler].slice(0, COUNT).map(q => ({
    ...q,
    keywords: (q.keywords || []).map(k => String(k).toLowerCase())
  }));
}

// ------------------ evaluation -----------------------
function evaluateAnswer(answer, keywords) {
  const a = (answer || '').toLowerCase();
  const unique = [...new Set(keywords)];
  const hits = unique.filter(k => a.includes(k));
  const score = Math.round(100 * hits.length / Math.max(1, unique.length));
  const missing = unique.filter(k => !hits.includes(k));
  const verdict =
    score >= 80 ? 'Excellent — covers most key points.' :
      score >= 60 ? 'Good — add a few details.' :
        score >= 40 ? 'Okay — expand on steps.' :
          'Needs improvement — add definitions, steps, and a check.';
  return { score, verdict, missing };
}

// ------------------ state + history ------------------
let state = { questions: [], idx: 0, meta: { area: '', sport: '', level: '', grade: '' } };
const STORAGE_KEY = 'mathTrainerHistoryV2';
function loadHistory() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } }
function saveHistory(item) { const d = loadHistory(); d.unshift(item); localStorage.setItem(STORAGE_KEY, JSON.stringify(d.slice(0, 150))); }
function resetHistory() { localStorage.removeItem(STORAGE_KEY); }

function renderQuestion() {
  if (!state.questions.length) {
    $("problem").innerHTML = 'No question yet. Choose an area and click <em>Generate Questions</em>.';
    $("q-meta").textContent = '—';
    $("status").textContent = '';
    $("answer").value = '';
    return;
  }
  const q = state.questions[state.idx];
  $("problem").textContent = q.text;
  $("q-meta").textContent = `Q${state.idx + 1}/${state.questions.length} · ${q.tag} · ${state.meta.level} · Grade ${state.meta.grade}${state.meta.sport ? ' · ' + state.meta.sport : ''}`;
  $("status").textContent = '';
  $("answer").value = '';
}

function updateHistoryUI() {
  const list = $("history-list"); if (!list) return;
  const data = loadHistory();
  list.innerHTML = '';
  data.slice(0, 10).forEach(r => {
    const li = document.createElement('li');
    const left = document.createElement('span');
    left.textContent = `${r.tag} · ${r.level} · G${r.grade}${r.sport ? ' · ' + r.sport : ''} · ${new Date(r.at).toLocaleString()}`;
    const right = document.createElement('strong');
    right.textContent = `${r.score}/100`;
    li.appendChild(left); li.appendChild(right);
    list.appendChild(li);
  });
  $("avg-score").textContent = data.length ? Math.round(data.reduce((s, r) => s + r.score, 0) / data.length) : '—';
  $("attempts").textContent = data.length;
}

// ------------------ bindings ------------------------
document.addEventListener('DOMContentLoaded', () => {
  const form = $("generator-form");
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault(); // prevent refresh
      const area = $("topic").value;
      const sport = $("hobby").value;   // optional
      const level = $("difficulty").value;
      const grade = $("grade").value;
      if (!area) { $("topic").reportValidity?.(); return; }
      if (!level) { $("difficulty").reportValidity?.(); return; }
      if (!grade) { $("grade").reportValidity?.(); return; }
      state.questions = makeQuestions(area, sport, level, grade);
      state.idx = 0;
      state.meta = { area, sport, level, grade };
      renderQuestion();
    });
  }

  $("btn-clear")?.addEventListener('click', () => {
    $("topic").selectedIndex = 0;
    $("hobby").selectedIndex = 0;
    $("difficulty").selectedIndex = 0;
    $("grade").selectedIndex = 0;
    $("answer").value = '';
    state = { questions: [], idx: 0, meta: { area: '', sport: '', level: '', grade: '' } };
    renderQuestion();
  });

  $("btn-prev")?.addEventListener('click', () => {
    if (!state.questions.length) return;
    state.idx = (state.idx - 1 + state.questions.length) % state.questions.length;
    renderQuestion();
  });

  $("btn-next")?.addEventListener('click', () => {
    if (!state.questions.length) return;
    state.idx = (state.idx + 1) % state.questions.length;
    renderQuestion();
  });

  $("btn-eval")?.addEventListener('click', () => {
    if (!state.questions.length) { alert('Generate a question first.'); return; }
    const q = state.questions[state.idx];
    const { score, verdict, missing } = evaluateAnswer($("answer").value, q.keywords);
    const missingTxt = missing.length ? ` Missing: <em>${missing.slice(0, 6).join(', ')}</em>` : '';
    $("status").innerHTML = `<span class="${score >= 60 ? 'ok' : 'bad'}">Score: ${score}/100</span> — ${verdict}.${missingTxt}`;
    saveHistory({ tag: q.tag, score, at: Date.now(), level: state.meta.level, grade: state.meta.grade, sport: state.meta.sport });
    updateHistoryUI();
  });

  $("btn-sample")?.addEventListener('click', () => {
    if (!state.questions.length) return;
    const q = state.questions[state.idx];
    $("status").innerHTML = `<em>Sample outline:</em> ${q.sample}`;
  });

  $("btn-copy")?.addEventListener('click', async () => {
    if (!state.questions.length) return;
    try {
      await navigator.clipboard.writeText(state.questions[state.idx].text);
      $("status").textContent = 'Question copied to clipboard.';
    } catch {
      $("status").textContent = 'Copy failed. Select and copy manually.';
    }
  });

  $("btn-reset")?.addEventListener('click', () => {
    if (confirm('Reset all saved attempts?')) {
      resetHistory();
      updateHistoryUI();
    }
  });

  $("answer")?.addEventListener('keydown', (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') {
      ev.preventDefault();
      $("btn-eval")?.click();
    }
  });

  renderQuestion();
  updateHistoryUI();
});
