// app.js - High School Math Diagnosis Tool (Streak, Backup, Pause, and Passcode Version)

// Security Config
const DEFAULT_API_KEY = ""; // ここにご自身のGemini APIキーを直書きすることも可能です（プライベートブラウズ等の対策）
const APP_PASSCODE = "1202"; // アプリのパスコード（FC2公開時の簡易ロック用）

// Mathematics Arithmetic Helpers for Generator
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

function formatCoef(val, isFirst) {
  if (val === 0) return "";
  if (val === 1) return isFirst ? "" : "+";
  if (val === -1) return "-";
  if (val > 0) return isFirst ? `${val}` : `+${val}`;
  return `${val}`;
}

function formatPoly(a, b, c) {
  let partA = "";
  if (a !== 0) {
    let coefA = formatCoef(a, true);
    if (coefA === "+") coefA = "";
    partA = `${coefA}x^2`;
  }
  
  let partB = "";
  if (b !== 0) {
    let coefB = formatCoef(b, a === 0);
    partB = `${coefB}x`;
  }
  
  let partC = "";
  if (c !== 0) {
    partC = c > 0 ? (a !== 0 || b !== 0 ? `+${c}` : `${c}`) : `${c}`;
  }
  
  return `${partA}${partB}${partC}`;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomRange(min, max, excludeZero = false) {
  let val = 0;
  do {
    val = Math.floor(Math.random() * (max - min + 1)) + min;
  } while (excludeZero && val === 0);
  return val;
}

function generateDynamicQuestion(templateId, index) {
  let q = {
    id: `${templateId}_v${index}`,
    difficulty: "medium",
    text: "",
    answer: "",
    reference: "",
    hint: ""
  };
  
  switch(templateId) {
    case "m1_ch1_q1_dynamic": {
      const a = randomRange(1, 3);
      const c = randomRange(1, 3);
      const b = randomRange(-4, 4, true);
      const d = randomRange(-4, 4, true);
      if (gcd(a, Math.abs(b)) !== 1 || gcd(c, Math.abs(d)) !== 1) {
        return generateDynamicQuestion(templateId, index);
      }
      const A = a * c;
      const B = a * d + b * c;
      const C = b * d;
      if (B === 0 || C === 0) return generateDynamicQuestion(templateId, index);
      
      const expr = formatPoly(A, B, C);
      const part1 = (a === 1 ? "x" : `${a}x`) + (b > 0 ? `+${b}` : `${b}`);
      const part2 = (c === 1 ? "x" : `${c}x`) + (d > 0 ? `+${d}` : `${d}`);
      
      q.difficulty = A === 1 ? "easy" : "medium";
      q.text = `次の多項式を因数分解しなさい：\n$$${expr}$$`;
      q.answer = `$(${part1})(${part2})$`;
      q.reference = "第1章 第1節 - 因数分解（たすき掛けの利用）";
      q.hint = "たすき掛けの公式 $acx^2 + (ad+bc)x + bd = (ax+b)(cx+d)$ を使用しましょう。積が2次の係数、および定数項になる組み合わせを探します。";
      break;
    }
    case "m1_ch1_q2_dynamic": {
      const a = randomChoice([2, 3, 5, 6, 7]);
      let b = a;
      while (b === a) b = randomChoice([2, 3, 5, 6, 7]);
      const diff = a - b;
      const k = randomRange(1, 3);
      const c = k * Math.abs(diff);
      
      q.difficulty = "easy";
      q.text = `次の式の分母を有理化しなさい：\n$$\\frac{${c}}{\\sqrt{${a}} ${diff > 0 ? '-' : '+'} \\sqrt{${b}}}$$`;
      
      const factor = c / diff;
      const sign = diff > 0 ? "+" : "-";
      if (factor === 1) {
        q.answer = `$\\sqrt{${a}} ${sign} \\sqrt{${b}}$`;
      } else if (factor === -1) {
        q.answer = `$-(\\sqrt{${a}} ${sign} \\sqrt{${b}})$`;
      } else {
        q.answer = factor > 0 ? `$${factor}(\\sqrt{${a}} ${sign} \\sqrt{${b}})$` : `$-${Math.abs(factor)}(\\sqrt{${a}} ${sign} \\sqrt{${b}})$`;
      }
      q.reference = "第1章 第2節 - 分母の有理化";
      q.hint = "公式 $(x-y)(x+y) = x^2 - y^2$ を利用して分母の根号を消去します。分母と分子に、分母の符号を変えた式を掛けます。";
      break;
    }
    case "m1_ch1_q3_dynamic": {
      const a = randomRange(-5, 5, true);
      let c = a;
      while (c === a) c = randomRange(-5, 5, true);
      const diffX = a - c;
      const ansVal = randomRange(-5, 5, true);
      const b = randomChoice([-10, -5, 5, 10]);
      const d = diffX * ansVal + b;
      
      const signB = b < 0 ? `- ${Math.abs(b)}` : `+ ${b}`;
      const signD = d < 0 ? `- ${Math.abs(d)}` : `+ ${d}`;
      
      q.difficulty = "easy";
      q.text = `次の1次不等式を解きなさい：\n$$${a}x ${signB} > ${c}x ${signD}$$`;
      q.answer = diffX > 0 ? `$x > ${ansVal}$` : `$x < ${ansVal}$`;
      q.reference = "第1章 第3節 - 1次不等式の解法";
      q.hint = "$x$を含む項を左辺に、定数を右辺に移項して整理します。両辺を負の数で割る（または掛ける）ときは、不等号の向きが逆転することに注意してください。";
      break;
    }
    case "m1_ch2_q1_dynamic": {
      const pIdx = randomRange(0, 3);
      const a = randomChoice([2, 3, 4, 5]);
      const a2 = a * a;
      
      let pText = "", qText = "", ans = "", detail = "";
      if (pIdx === 0) {
        pText = `$x = ${a}$`;
        qText = `$x^2 = ${a2}$`;
        ans = "十分条件であるが、必要条件ではない";
        detail = `$x=${a}$ ならば $x^2=${a2}$ は常に真ですが、逆に $x^2=${a2}$ ならば $x=\\pm{a}$ となり $x=-{a}$ の反例があるため偽です。`;
      } else if (pIdx === 1) {
        pText = `$x^2 = ${a2}$`;
        qText = `$x = ${a}$`;
        ans = "必要条件であるが、十分条件ではない";
        detail = `$x^2=${a2}$ ならば $x=\\pm{a}$ なので十分条件は偽ですが、逆に $x=${a}$ ならば常に $x^2=${a2}$ は成立するため必要条件は真です。`;
      } else if (pIdx === 2) {
        pText = `$|x| = ${a}$`;
        qText = `$x^2 = ${a2}$`;
        ans = "必要十分条件";
        detail = `$|x|=${a}$ も $x^2=${a2}$ も、どちらも解は $x = \\pm {a}$ となり、条件として完全に一致（同値）します。`;
      } else {
        pText = `$-${a} < x < ${a}$`;
        qText = `$|x| < ${a}$`;
        ans = "必要十分条件";
        detail = `実数の絶対値の性質から、$-${a} < x < ${a}$ であることと $|x| < ${a}$ であることは同値です。`;
      }
      
      q.difficulty = pIdx >= 2 ? "easy" : "medium";
      q.text = `実数 $x$ に関する条件 $p, q$ を次のように定める。\n$$p : ${pText}$$\n$$q : ${qText}$$\nこのとき、条件 $p$ は条件 $q$ であるための何条件であるか判定しなさい。`;
      q.answer = `$${ans}$`;
      q.reference = "第2章 第1節 - 必要条件と十分条件";
      q.hint = `p ⇒ q の真偽（十分性）と、q ⇒ p の真偽（必要性）をそれぞれ調べます。${detail}`;
      break;
    }
    case "m1_ch3_q1_dynamic": {
      const a = randomChoice([-2, -1, 1, 2]);
      const h = randomRange(-5, 5, true);
      const k = randomRange(-6, 6, true);
      const A = a;
      const B = -2 * a * h;
      const C = a * h * h + k;
      const expr = formatPoly(A, B, C);
      
      q.difficulty = Math.abs(a) === 1 ? "easy" : "medium";
      q.text = `次の2次関数のグラフの頂点の座標を求めなさい：\n$$y = ${expr}$$`;
      q.answer = `$(${h}, ${k})$`;
      q.reference = "第3章 第1節 - 平方完成とグラフの頂点";
      q.hint = "与えられた式を平方完成して $y = a(x-h)^2 + k$ の標準形に変形します。頂点の座標は $(h, k)$ です。";
      break;
    }
    case "m1_ch3_q2_dynamic": {
      const alpha = randomRange(-4, 3);
      const beta = alpha + randomRange(2, 5);
      const B = -(alpha + beta);
      const C = alpha * beta;
      const expr = formatPoly(1, B, C);
      const isLess = randomChoice([true, false]);
      
      q.difficulty = "easy";
      q.text = isLess ? `次の2次不等式を解きなさい：\n$$${expr} \\leqq 0$$` : `次の2次不等式を解きなさい：\n$$${expr} > 0$$`;
      q.answer = isLess ? `$${alpha} \\leqq x \\leqq ${beta}$` : `$x < ${alpha}, ${beta} < x$`;
      q.reference = "第3章 第2節 - 2次不等式の解法";
      q.hint = "まず $x^2 + bx + c = 0$ の方程式を解いて境界点を求めます（因数分解 $(x-\\alpha)(x-\\beta) = 0$ の利用）。不等号の向きと放物線の上下関係から範囲を決定します。";
      break;
    }
    case "m1_ch4_q1_dynamic": {
      const triple = randomChoice([[3, 4, 5], [5, 12, 13], [8, 15, 17]]);
      const A = triple[0];
      const B = triple[1];
      const C = triple[2];
      const isSin = randomChoice([true, false]);
      
      q.difficulty = "medium";
      if (isSin) {
        q.text = `$\\theta$ は鋭角とする。$\\sin \\theta = \\frac{${A}}{${C}}$ のとき、$\\cos \\theta$ と $\\tan \\theta$ の値をそれぞれ求めなさい。`;
        q.answer = `$\\cos \\theta = \\frac{${B}}{${C}}, \\tan \\theta = \\frac{${A}}{${B}}$`;
      } else {
        q.text = `$\\theta$ は鋭角とする。$\\cos \\theta = \\frac{${B}}{${C}}$ のとき、$\\sin \\theta$ と $\\tan \\theta$ の値をそれぞれ求めなさい。`;
        q.answer = `$\\sin \\theta = \\frac{${A}}{${C}}, \\tan \\theta = \\frac{${A}}{${B}}$`;
      }
      q.reference = "第4章 第1節 - 三角比の相互関係";
      q.hint = "三角比の相互関係の公式 $\\sin^2\\theta + \\cos^2\\theta = 1$ および $\\tan\\theta = \\frac{\\sin\\theta}{\\cos\\theta}$ を使用します。鋭角なので $\\sin\\theta > 0, \\cos\\theta > 0$ です。";
      break;
    }
    case "m1_ch5_q1_dynamic": {
      const mean = randomRange(6, 12);
      const devs = randomChoice([[-3, -1, 1, 3], [-4, -2, 2, 4], [-2, -1, 1, 2], [-3, -2, 2, 3]]);
      const data = devs.map(d => mean + d);
      data.sort(() => 0.5 - Math.random());
      
      let sumSq = 0;
      devs.forEach(d => sumSq += d*d);
      const variance = sumSq / 4;
      
      q.difficulty = "medium";
      q.text = `次のデータは、あるクラスの生徒4人の小テストの得点（点）です。このデータの平均値と分散をそれぞれ求めなさい。\n$$ ${data.join(', ')} $$`;
      q.answer = `平均値: $${mean}$ 点, 分散: $${variance}$`;
      q.reference = "第5章 第1節 - データの平均値と分散";
      q.hint = "平均値はデータの総和を個数（4）で割ったものです。分散は、各データ値から平均値を引いた値（偏差）の2乗の平均値として計算します。";
      break;
    }
    case "ma_ch1_q1_dynamic": {
      const r = randomRange(3, 5);
      const w = randomRange(3, 5);
      const k = randomRange(2, 3);
      const n = r + w;
      
      let num = 1;
      for (let i = 0; i < k; i++) num *= (r - i);
      let den = 1;
      for (let i = 0; i < k; i++) den *= (n - i);
      
      const g = gcd(num, den);
      const ansNum = num / g;
      const ansDen = den / g;
      
      q.difficulty = "medium";
      q.text = `袋の中に赤玉が ${r} 個、白玉が ${w} 個入っています。この袋から同時に ${k} 個の玉を取り出すとき、取り出した玉がすべて赤玉である確率を求めなさい。`;
      q.answer = `$\\frac{${ansNum}}{${ansDen}}$`;
      q.reference = "第1章 第1節 - 確率の基本計算";
      q.hint = "赤玉から取り出す組み合わせの数 ${}_r \\mathrm{C}_k$ を、全体の玉から取り出す組み合わせの数 ${}_{r+w} \\mathrm{C}_k$ で割って確率を求めます。";
      break;
    }
    case "ma_ch3_q1_dynamic": {
      const g = randomRange(6, 15);
      const pair = randomChoice([[7, 5], [9, 8], [11, 7], [13, 8], [11, 5]]);
      const val1 = g * pair[0];
      const val2 = g * pair[1];
      const A = Math.max(val1, val2);
      const B = Math.min(val1, val2);
      
      q.difficulty = "medium";
      q.text = `ユークリッドの互除法を用いて、次の2つの整数の最大公約数を求めなさい：\n$$${A} \\text{ と } ${B}$$`;
      q.answer = `$${g}$`;
      q.reference = "第3章 第2節 - ユークリッドの互除法";
      q.hint = "大きい方の数を小さい方の数で割り、「割る数 ＝ 割り算の余り × 商 ＋ 新しい余り」の変形を余りが 0 になるまで繰り返します。最後に割った数が最大公約数です。";
      break;
    }
    case "m2_ch1_q2_dynamic": {
      const h = randomRange(-4, 4, true);
      const k = randomChoice([1, 2, 3, 5, 6, 7]);
      const B = -2 * h;
      const C = h * h + k;
      const expr = formatPoly(1, B, C);
      
      q.difficulty = "medium";
      q.text = `次の2次方程式を複素数の範囲で解きなさい：\n$$${expr} = 0$$`;
      q.answer = `$x = ${h} \\pm \\sqrt{${k}}i$`;
      q.reference = "第1章 第3節 - 2次方程式の解の公式と複素数";
      q.hint = "解の公式 $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$ を適用します。ルートの中が負の数になるので虛数単位 $i = \\sqrt{-1}$ を用いて表現します。";
      break;
    }
    case "m2_ch2_q1_dynamic": {
      const m = randomChoice([-4, -3, -2, 2, 3, 4]);
      const k = randomChoice([-2, -1, 1, 2]);
      const px = k * Math.abs(m);
      const py = randomRange(-3, 3);
      
      const slopeSign = m > 0 ? "-" : "";
      const interceptVal = Math.round((m > 0 ? 1 : -1) * k + py);
      
      q.difficulty = "medium";
      q.text = `直線 $y = ${m}x + 2$ に垂直で、点 $(${px}, ${py})$ を通る直線の方程式を求めなさい。`;
      q.answer = `$y = ${slopeSign}\\frac{1}{${Math.abs(m)}}x ${interceptVal >= 0 ? '+' : ''}${interceptVal}$`.replace(" +0", "").replace(" -0", "");
      q.reference = "第2章 第1節 - 2直線の垂直条件と直線の方程式";
      q.hint = "2つの直線が垂直に交わるとき、その傾きの積は $-1$ になります。垂直な直線の傾きを $m'$ とすると、$m \\times m' = -1$ です。傾きと通過する1点から直線の方程式 $y - y_1 = m'(x - x_1)$ を求めます。";
      break;
    }
    case "m2_ch3_q1_dynamic": {
      const eqType = randomRange(0, 3);
      if (eqType === 0) {
        q.text = `次の三角方程式を解きなさい（ただし、 $0 \\leqq \\theta < 2\\pi$ とします）：\n$$\\sin \\theta = \\frac{1}{2}$$`;
        q.answer = `$\\theta = \\frac{\\pi}{6}, \\frac{5\\pi}{6}$`;
      } else if (eqType === 1) {
        q.text = `次の三角方程式を解きなさい（ただし、 $0 \\leqq \\theta < 2\\pi$ とします）：\n$$\\cos \\theta = -\\frac{1}{2}$$`;
        q.answer = `$\\theta = \\frac{2\\pi}{3}, \\frac{4\\pi}{3}$`;
      } else if (eqType === 2) {
        q.text = `次の三角方程式を解きなさい（ただし、 $0 \\leqq \\theta < 2\\pi$ とします）：\n$$\\sin \\theta = -\\frac{\\sqrt{3}}{2}$$`;
        q.answer = `$\\theta = \\frac{4\\pi}{3}, \\frac{5\\pi}{3}$`;
      } else {
        q.text = `次の三角方程式を解きなさい（ただし、 $0 \\leqq \\theta < 2\\pi$ とします）：\n$$\\cos \\theta = \\frac{\\sqrt{2}}{2}$$`;
        q.answer = `$\\theta = \\frac{\\pi}{4}, \\frac{7\\pi}{4}$`;
      }
      q.difficulty = "medium";
      q.reference = "第3章 第1節 - 三角関数の基本方程式";
      q.hint = "単位円（またはグラフ）をかき、指定された範囲内で $y$ 座標（sinの場合）または $x$ 座標（cosの場合）が与えられた値になる角度 $\\theta$ を求めます。";
      break;
    }
    case "m2_ch4_q1_dynamic": {
      const a = randomChoice([2, 3]);
      const c = randomRange(2, 3);
      const b = randomRange(1, 5);
      const ansVal = Math.pow(a, c) + b;
      
      q.difficulty = "medium";
      q.text = `次の対数方程式を解きなさい：\n$$\\log_{${a}}(x - ${b}) = ${c}$$`;
      q.answer = `$x = ${ansVal}$`;
      q.reference = "第4章 第1節 - 対数とその方程式";
      q.hint = "対数の定義 $\\log_a M = c \\iff M = a^c$ を用いて対数記号を外します。真数条件 $x - b > 0$ を満たすことも確認します。";
      break;
    }
    case "m2_ch5_q1_dynamic": {
      const a = randomChoice([-2, -1, 1, 2]);
      const b = randomChoice([-4, -2, 0, 2, 4]);
      const c = randomChoice([-3, -1, 1, 3]);
      const x0 = randomChoice([-2, -1, 0, 1, 2]);
      const y0 = a * x0 * x0 + b * x0 + c;
      const m = 2 * a * x0 + b;
      const intercept = -m * x0 + y0;
      
      const exprY = formatPoly(a, b, c);
      const slopePart = formatCoef(m, true) + "x";
      const interceptPart = intercept === 0 ? "" : (intercept > 0 ? `+${intercept}` : `${intercept}`);
      let lineEq = `y = ${slopePart}${interceptPart}`;
      if (m === 0) lineEq = `y = ${y0}`;
      
      lineEq = lineEq.replace(" 1x", " x").replace(" -1x", " -x").replace("1x", "x").replace("-1x", "-x");
      
      q.difficulty = "medium";
      q.text = `関数 $y = ${exprY}$ のグラフ上の、点 $(${x0}, ${y0})$ における接線の方程式を求めなさい。`;
      q.answer = `$${lineEq}$`;
      q.reference = "第5章 第1節 - 微分係数と接線の方程式";
      q.hint = "接線の傾きは、関数を微分して得られる接点での微分係数 $f'(x_0)$ に一致します。傾き $m$ と接点 $(x_0, y_0)$ から、直線の方程式 $y - y_0 = m(x - x_0)$ を計算します。";
      break;
    }
    case "mb_ch1_q1_dynamic": {
      const isArithmetic = randomChoice([true, false]);
      if (isArithmetic) {
        const a1 = randomRange(2, 10);
        const d = randomRange(3, 7);
        q.text = `初項が ${a1}、公差が ${d} である等差数列 $\{a_n\}$ の一般項を求めなさい。`;
        const diff = a1 - d;
        q.answer = `$a_n = ${d}n ${diff >= 0 ? '+' : ''}${diff}$`.replace(" +0", "").replace(" -0", "");
        q.reference = "第1章 第1節 - 等差数列の一般項";
        q.hint = "等差数列の一般項の公式 $a_n = a_1 + (n-1)d$ を使って式を整理します。";
      } else {
        const a1 = randomRange(2, 5);
        const r = randomRange(2, 3);
        q.text = `初項が ${a1}、公比が ${r} である等比数列 $\{a_n\}$ の一般項を求めなさい。`;
        q.answer = `$a_n = ${a1} \\cdot ${r}^{n-1}$`;
        q.reference = "第1章 第1節 - 等比数列の一般項";
        q.hint = "等比数列の一般項の公式 $a_n = a_1 \\cdot r^{n-1}$ に初項と公比を代入します。";
      }
      q.difficulty = "easy";
      break;
    }
    case "mc_ch1_q1_dynamic": {
      const x1 = randomRange(-5, 5, true);
      const y1 = randomRange(-5, 5, true);
      const x2 = randomRange(-5, 5, true);
      const y2 = randomRange(-5, 5, true);
      const dot = x1 * x2 + y1 * y2;
      
      q.difficulty = "easy";
      q.text = `2つの平面ベクトル $\\vec{a} = (${x1}, ${y1})$、$\\vec{b} = (${x2}, ${y2})$ の内積 $\\vec{a} \\cdot \\vec{b}$ を求めなさい。`;
      q.answer = `$${dot}$`;
      q.reference = "第1章 第1節 - ベクトルの成分と内積";
      q.hint = "成分で表された平面ベクトルの内積の定義公式 $\\vec{a} \\cdot \\vec{b} = a_1 b_1 + a_2 b_2$ を用いて計算します。";
      break;
    }
    case "j1_math_eq_dynamic": {
      const xAns = randomRange(-8, 8, true);
      const a = randomRange(-6, 6, true);
      if (Math.abs(a) === 1) return generateDynamicQuestion(templateId, index);
      const b = randomRange(-12, 12, true);
      const c = a * xAns + b;
      const signB = b > 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
      
      q.difficulty = "easy";
      q.text = `次の1次方程式を解きなさい：\n$$${a}x ${signB} = ${c}$$`;
      q.answer = `$x = ${xAns}$`;
      q.reference = "中学1年 - 1次方程式の解法";
      q.hint = "定数項を右辺に移項し、両辺を $x$ の係数で割ります。移項するときは符号が逆になることに注意しましょう。";
      break;
    }
    case "j2_math_sim_dynamic": {
      const xAns = randomRange(-4, 4, true);
      const yAns = randomRange(-4, 4, true);
      if (xAns === yAns) return generateDynamicQuestion(templateId, index);
      const a = randomRange(-3, 3, true);
      const b = randomRange(-3, 3, true);
      const d = randomRange(-3, 3, true);
      const e = randomRange(-3, 3, true);
      if (a * e - b * d === 0) return generateDynamicQuestion(templateId, index);
      
      const c = a * xAns + b * yAns;
      const f = d * xAns + e * yAns;
      
      const signB = b > 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
      const signE = e > 0 ? `+ ${e}` : `- ${Math.abs(e)}`;
      
      q.difficulty = "medium";
      q.text = `次の連立方程式を解きなさい：\n$$\\begin{cases} ${a}x ${signB}y = ${c} \\\\ ${d}x ${signE}y = ${f} \\end{cases}$$`;
      q.answer = `$x = ${xAns}, y = ${yAns}$`;
      q.reference = "中学2年 - 連立方程式の解法";
      q.hint = "加減法または代入法を用いて、1つの文字を消去します。係数の絶対値をそろえて、両辺を足すか引くかしましょう。";
      break;
    }
    case "j3_math_fac_dynamic": {
      const a = randomRange(-8, 8, true);
      const b = randomRange(-8, 8, true);
      const B = a + b;
      const C = a * b;
      if (B === 0 || C === 0) return generateDynamicQuestion(templateId, index);
      
      const expr = formatPoly(1, B, C);
      const signA = a > 0 ? `+${a}` : `${a}`;
      const signB = b > 0 ? `+${b}` : `${b}`;
      
      q.difficulty = "easy";
      q.text = `次の式を因数分解しなさい：\n$$${expr}$$`;
      q.answer = `$(x ${signA})(x ${signB})$`;
      q.reference = "中学3年 - 多項式の因数分解";
      q.hint = "「和が $x$ の係数、積が定数項」になるような2つの整数の組み合わせを探します。$(x+a)(x+b) = x^2 + (a+b)x + ab$ の公式を使います。";
      break;
    }
    case "j3_math_quad_dynamic": {
      const alpha = randomRange(-8, 8, true);
      const beta = randomRange(-8, 8, true);
      const B = -(alpha + beta);
      const C = alpha * beta;
      if (B === 0 || C === 0) return generateDynamicQuestion(templateId, index);
      
      const expr = formatPoly(1, B, C);
      const sortedRoots = [alpha, beta].sort((x, y) => x - y);
      
      q.difficulty = "medium";
      q.text = `次の2次方程式を解きなさい：\n$$${expr} = 0$$`;
      q.answer = alpha === beta ? `$x = ${alpha}$` : `$x = ${sortedRoots[0]}, ${sortedRoots[1]}$`;
      q.reference = "中学3年 - 2次方程式の解法（因数分解 of 利用）";
      q.hint = "左辺を因数分解して $(x - \\alpha)(x - \\beta) = 0$ の形に変形できれば、解は $x = \\alpha, \\beta$ と求まります。";
      break;
    }
    case "mc_ch1_q1_dynamic": {
      const x1 = randomRange(-5, 5, true);
      const y1 = randomRange(-5, 5, true);
      const x2 = randomRange(-5, 5, true);
      const y2 = randomRange(-5, 5, true);
      const dot = x1 * x2 + y1 * y2;
      
      q.difficulty = "easy";
      q.text = `2つの平面ベクトル $\\vec{a} = (${x1}, ${y1})$、$\\vec{b} = (${x2}, ${y2})$ の内積 $\\vec{a} \\cdot \\vec{b}$ を求めなさい。`;
      q.answer = `$${dot}$`;
      q.reference = "第1章 第1節 - ベクトルの成分と内積";
      q.hint = "成分で表された平面ベクトルの内積の定義公式 $\\vec{a} \\cdot \\vec{b} = a_1 b_1 + a_2 b_2$ を用いて計算します。";
      break;
    }
    case "j1_math_eq_dynamic": {
      const xAns = randomRange(-8, 8, true);
      const a = randomRange(-6, 6, true);
      if (Math.abs(a) === 1) return generateDynamicQuestion(templateId, index);
      const b = randomRange(-12, 12, true);
      const c = a * xAns + b;
      const signB = b > 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
      
      q.difficulty = "easy";
      q.text = `次の1次方程式を解きなさい：\n$$${a}x ${signB} = ${c}$$`;
      q.answer = `$x = ${xAns}$`;
      q.reference = "中学1年 - 1次方程式の解法";
      q.hint = "定数項を右辺に移項し、両辺を $x$ の係数で割ります。移項するときは符号が逆になることに注意しましょう。";
      break;
    }
    case "j2_math_sim_dynamic": {
      const xAns = randomRange(-4, 4, true);
      const yAns = randomRange(-4, 4, true);
      if (xAns === yAns) return generateDynamicQuestion(templateId, index);
      const a = randomRange(-3, 3, true);
      const b = randomRange(-3, 3, true);
      const d = randomRange(-3, 3, true);
      const e = randomRange(-3, 3, true);
      if (a * e - b * d === 0) return generateDynamicQuestion(templateId, index);
      
      const c = a * xAns + b * yAns;
      const f = d * xAns + e * yAns;
      
      const signB = b > 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
      const signE = e > 0 ? `+ ${e}` : `- ${Math.abs(e)}`;
      
      q.difficulty = "medium";
      q.text = `次の連立方程式を解きなさい：\n$$\\begin{cases} ${a}x ${signB}y = ${c} \\\\ ${d}x ${signE}y = ${f} \\end{cases}$$`;
      q.answer = `$x = ${xAns}, y = ${yAns}$`;
      q.reference = "中学2年 - 連立方程式の解法";
      q.hint = "加減法または代入法を用いて、1つの文字を消去します。係数の絶対値をそろえて、両辺を足すか引くかしましょう。";
      break;
    }
    case "j3_math_fac_dynamic": {
      const a = randomRange(-8, 8, true);
      const b = randomRange(-8, 8, true);
      const B = a + b;
      const C = a * b;
      if (B === 0 || C === 0) return generateDynamicQuestion(templateId, index);
      
      const expr = formatPoly(1, B, C);
      const signA = a > 0 ? `+${a}` : `${a}`;
      const signB = b > 0 ? `+${b}` : `${b}`;
      
      q.difficulty = "easy";
      q.text = `次の式を因数分解しなさい：\n$$${expr}$$`;
      q.answer = `$(x ${signA})(x ${signB})$`;
      q.reference = "中学3年 - 多項式の因数分解";
      q.hint = "「和が $x$ の係数、積が定数項」になるような2つの整数の組み合わせを探します。$(x+a)(x+b) = x^2 + (a+b)x + ab$ の公式を使います。";
      break;
    }
    case "j3_math_quad_dynamic": {
      const alpha = randomRange(-8, 8, true);
      const beta = randomRange(-8, 8, true);
      const B = -(alpha + beta);
      const C = alpha * beta;
      if (B === 0 || C === 0) return generateDynamicQuestion(templateId, index);
      
      const expr = formatPoly(1, B, C);
      const sortedRoots = [alpha, beta].sort((x, y) => x - y);
      
      q.difficulty = "medium";
      q.text = `次の2次方程式を解きなさい：\n$$${expr} = 0$$`;
      q.answer = alpha === beta ? `$x = ${alpha}$` : `$x = ${sortedRoots[0]}, ${sortedRoots[1]}$`;
      q.reference = "中学3年 - 2次方程式の解法（因数分解の利用）";
      q.hint = "左辺を因数分解して $(x - \\alpha)(x - \\beta) = 0$ の形に変形できれば、解は $x = \\alpha, \\beta$ と求まります。";
      break;
    }
  }
  return q;
}

// Global state
let questionsDb = null;
let activeSession = null;
let timerInterval = null;
const MOCK_EXAM_TIME_LIMIT = 40 * 60; // 40 minutes in seconds

// DOM elements
const views = {
  setup: document.getElementById('setup-view'),
  exam: document.getElementById('exam-view'),
  upload: document.getElementById('upload-view'),
  correction: document.getElementById('correction-view'),
  report: document.getElementById('report-view'),
  stats: document.getElementById('stats-view'),
  pomodoro: document.getElementById('pomodoro-view'),
  question: document.getElementById('question-view')
};

// UI Initializer
document.addEventListener('DOMContentLoaded', () => {
  checkPasscode();
  initApp();
  preventMobileZoom();
});

function checkPasscode() {
  const saved = localStorage.getItem('math_app_passcode');
  if (saved === APP_PASSCODE) {
    document.getElementById('passcode-screen').style.display = 'none';
  } else {
    document.getElementById('passcode-screen').style.display = 'flex';
  }
}

window.submitPasscode = function() {
  const code = document.getElementById('passcode-input').value.trim();
  if (code === APP_PASSCODE) {
    localStorage.setItem('math_app_passcode', code);
    document.getElementById('passcode-screen').style.display = 'none';
    showToast('認証に成功しました！', 'success');
  } else {
    showToast('パスコードが正しくありません。', 'danger');
    document.getElementById('passcode-input').value = '';
  }
};

function preventMobileZoom() {
  // Prevent double-tap to zoom
  document.addEventListener('touchstart', (event) => {
    if (event.touches.length > 1) {
      event.preventDefault();
    }
  }, { passive: false });

  let lastTouchEnd = 0;
  document.addEventListener('touchend', (event) => {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, false);

  // Prevent pinch-to-zoom (gesture)
  document.addEventListener('gesturestart', (event) => {
    event.preventDefault();
  });
}

async function initApp() {
  loadApiKey();
  setupEventListeners();
  
  // Load questions database
  try {
    const response = await fetch('questions.json');
    if (!response.ok) throw new Error('Failed to load questions database.');
    questionsDb = await response.json();
    renderSubjectSelector();
    
    // Render Statistics Dashboard (Heatmap + History)
    renderDashboard();
    applyCurriculumModeUI();
    renderPomoSubjects();
    
    // Check if there is an active session in progress
    restoreSession();
    
    // Automatically sync textbook mapping if URL exists and it's not yet synced
    const sheetsUrl = localStorage.getItem('math_google_sheets_url');
    const syncedVersion = localStorage.getItem('textbook_synced_version');
    if (sheetsUrl && syncedVersion !== '1.0') {
      autoSyncTextbookMapping(sheetsUrl);
    }
  } catch (error) {
    showToast('問題データの読み込みに失敗しました。ラズパイ上のファイルを確認してください。', 'danger');
    console.error(error);
  }
}

// -------------------------------------------------------------
// Settings and API Key Management
// -------------------------------------------------------------
function loadApiKey() {
  const apiKey = localStorage.getItem('gemini_api_key') || DEFAULT_API_KEY;
  document.getElementById('api-key-input').value = apiKey;
  
  const mode = localStorage.getItem('math_curriculum_mode') || 'junior_high';
  document.getElementById('curriculum-mode-input').value = mode;

  const studentName = localStorage.getItem('math_student_name') || '';
  document.getElementById('student-name-input').value = studentName;

  const sheetsUrl = localStorage.getItem('math_google_sheets_url') || '';
  document.getElementById('google-sheets-url-input').value = sheetsUrl;
}

function saveApiKey() {
  const apiKey = document.getElementById('api-key-input').value.trim();
  if (apiKey) {
    localStorage.setItem('gemini_api_key', apiKey);
  } else if (!DEFAULT_API_KEY) {
    showToast('APIキーを入力してください。', 'warning');
    return;
  }

  const studentName = document.getElementById('student-name-input').value.trim();
  localStorage.setItem('math_student_name', studentName);

  const sheetsUrl = document.getElementById('google-sheets-url-input').value.trim();
  localStorage.setItem('math_google_sheets_url', sheetsUrl);
  
  const mode = document.getElementById('curriculum-mode-input').value;
  const oldMode = localStorage.getItem('math_curriculum_mode') || 'junior_high';
  localStorage.setItem('math_curriculum_mode', mode);
  
  closeModal('settings-modal');
  showToast('設定を保存しました。');
  
  if (mode !== oldMode) {
    renderSubjectSelector();
    renderDashboard();
  }
  applyCurriculumModeUI();
}

async function testApiConnection() {
  const apiKey = document.getElementById('api-key-input').value.trim();
  const studentName = document.getElementById('student-name-input').value.trim();
  const sheetsUrl = document.getElementById('google-sheets-url-input').value.trim();
  
  if (!apiKey) {
    showToast('APIキーを入力してください。', 'warning');
    return;
  }
  if (!studentName) {
    showToast('生徒名を入力してください。', 'warning');
    return;
  }
  
  showLoader('接続テスト中...', 'Gemini APIおよびスプレッドシートへの接続を確認しています。');
  
  try {
    // 1. Gemini APIの接続確認
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Hello. Respond in 3 words." }] }]
      })
    });
    
    if (!geminiRes.ok) {
      const errData = await geminiRes.json();
      throw new Error(`Gemini APIエラー: ${errData.error?.message || geminiRes.statusText}`);
    }
    
    // 2. スプレッドシート（GAS）への接続テスト
    if (sheetsUrl) {
      const payload = {
        action: 'get_questions',
        studentName: studentName
      };
      
      const gasRes = await fetch(sheetsUrl, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      if (!gasRes.ok) {
        throw new Error('スプレッドシート連携エラー: 応答がありません。');
      }
      
      const gasJson = await gasRes.json();
      if (gasJson.status !== 'success') {
        throw new Error(`スプレッドシートエラー: ${gasJson.message || '接続に失敗しました。'}`);
      }
    }
    
    hideLoader();
    showToast('接続に成功しました！', 'success');
  } catch (error) {
    hideLoader();
    console.error(error);
    showToast(error.message || '接続エラーが発生しました。', 'danger');
  }
}

async function testProgramExecution() {
  const sheetsUrl = document.getElementById('google-sheets-url-input').value.trim();
  if (!sheetsUrl) {
    showToast('連携用URL（GASのWebアプリURL）を入力してください。', 'warning');
    return;
  }
  
  const studentName = document.getElementById('student-name-input').value.trim() || 'テスト生徒';
  
  const dummyPayload = {
    timestamp: new Date().toLocaleString('ja-JP'),
    studentName: studentName,
    curriculumMode: 'junior_high',
    subjectName: 'テスト数学 (GAS接続・記録テスト用)',
    score: 85,
    maxScore: 100,
    duration: '15分30秒',
    weaknesses: '【これは自動テストデータです】スプレッドシートの1枚目にサマリーが生成され、2枚目に不具合報告用の空テーブルが作られているか確認してください。',
    recommendation: '無事に動作していれば、この生徒の名前のシート（👤 ' + studentName + '）が追加され、メールが届いています。'
  };

  console.log("Starting GAS Program Execution Test...");
  console.log("Configured GAS URL:", sheetsUrl);
  console.log("Sending dummy test payload:", dummyPayload);
  
  showLoader('テスト中...', 'GAS経由でスプレッドシートへの記録とメール送信を実行しています。');
  
  try {
    await fetch(sheetsUrl, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify(dummyPayload)
    });
    
    console.log("Fetch request for program test resolved (Opaque response).");
    hideLoader();
    showToast('テストデータを送信しました！メールおよびスプレッドシートをご確認ください。', 'success');
  } catch (error) {
    hideLoader();
    showToast('送信エラーが発生しました。接続を確認してください。', 'danger');
    console.error("Program test failed with error:", error);
  }
}

// -------------------------------------------------------------
// UI Rendering - Setup View Subjects list
// -------------------------------------------------------------
function renderSubjectSelector() {
  const container = document.getElementById('subject-selector');
  const mode = localStorage.getItem('math_curriculum_mode') || 'junior_high';
  const subjectsSrc = questionsDb ? questionsDb[mode] : null;
  
  if (!subjectsSrc || !subjectsSrc.subjects) {
    container.innerHTML = '<p class="text-muted">利用可能な問題データがありません。</p>';
    return;
  }
  
  let html = '';
  
  for (const [subKey, subject] of Object.entries(subjectsSrc.subjects)) {
    html += `
      <div class="subject-group" id="group-${subKey}">
        <div class="subject-header" onclick="toggleUnitList('${subKey}')">
          <div class="subject-title">
            <span class="chevron" id="chevron-${subKey}">▶</span>
            <span>${subject.name}</span>
          </div>
          <span style="font-size: 0.8rem; color: var(--text-muted);">単元を表示</span>
        </div>
        <div class="unit-list" id="units-${subKey}">
    `;
    
    for (const [chapKey, chapter] of Object.entries(subject.chapters)) {
      html += `<div style="margin: 0.5rem 0 0.2rem 0; font-size: 0.85rem; font-weight: bold; color: var(--text-primary);">${chapter.name}</div>`;
      
      for (const [unitKey, unit] of Object.entries(chapter.units)) {
        const questionCount = unit.questions ? unit.questions.length : 0;
        const isDisabled = questionCount === 0 ? 'disabled' : '';
        const countBadge = questionCount > 0 ? `(${questionCount}問)` : '(問題なし)';
        
        html += `
          <div class="checkbox-item">
            <input type="checkbox" id="chk-${subKey}-${chapKey}-${unitKey}" 
                   data-subject="${subKey}" data-chapter="${chapKey}" data-unit="${unitKey}" ${isDisabled}>
            <label for="chk-${subKey}-${chapKey}-${unitKey}">
              ${unit.name} <span style="font-size: 0.75rem; color: var(--text-muted);">${countBadge}</span>
            </label>
          </div>
        `;
      }
    }
    
    html += `
        </div>
      </div>
    `;
  }
  
  container.innerHTML = html;
}

window.toggleUnitList = function(subKey) {
  const list = document.getElementById(`units-${subKey}`);
  const chevron = document.getElementById(`chevron-${subKey}`);
  if (list.classList.contains('active')) {
    list.classList.remove('active');
    chevron.textContent = '▶';
  } else {
    list.classList.add('active');
    chevron.textContent = '▼';
  }
};

// -------------------------------------------------------------
// History storage & Dashboard Rendering
// -------------------------------------------------------------
function getHistory() {
  const saved = localStorage.getItem('math_test_history');
  return saved ? JSON.parse(saved) : [];
}

function saveToHistory(item) {
  const history = getHistory();
  history.push(item);
  localStorage.setItem('math_test_history', JSON.stringify(history));
  renderDashboard();
}

function clearHistory() {
  if (confirm('過去の診断履歴とカレンダーの記録をすべて消去します。よろしいですか？\n※この操作は取り消せません。')) {
    localStorage.removeItem('math_test_history');
    renderDashboard();
    showToast('学習履歴をすべて消去しました。');
  }
}

function renderDashboard() {
  renderHeatmap();
  renderHistoryList();
  renderStats();
}

function renderStats() {
  const history = getHistory();
  document.getElementById('stats-total-tests').textContent = history.length;
  
  if (history.length === 0) {
    document.getElementById('stats-avg-score').textContent = '0';
    return;
  }
  
  let totalPercent = 0;
  history.forEach(item => {
    const max = item.maxScore || (item.attemptedCount * 25) || 100;
    const pct = (item.score / max) * 100;
    totalPercent += pct;
  });
  
  const avg = Math.round(totalPercent / history.length);
  document.getElementById('stats-avg-score').textContent = avg;
}

function renderHeatmap() {
  const container = document.getElementById('heatmap-grid-container');
  const labelsContainer = document.getElementById('heatmap-months-labels');
  if (!container) return;
  
  const history = getHistory();
  
  // Map YYYY-MM-DD to test counts
  const dateMap = {};
  history.forEach(item => {
    const d = new Date(item.timestamp);
    const dateStr = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
    dateMap[dateStr] = (dateMap[dateStr] || 0) + 1;
  });
  
  // Generate calendar cells (16 weeks = 112 days) aligned to Sunday
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 is Sunday
  const startDay = new Date();
  startDay.setDate(now.getDate() - (15 * 7) - dayOfWeek); // Sunday 15 weeks ago
  
  let html = '';
  const monthLabels = Array(16).fill('');
  let lastMonth = -1;
  
  for (let i = 0; i < 16 * 7; i++) {
    const date = new Date(startDay);
    date.setDate(startDay.getDate() + i);
    
    const dateStr = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}`;
    const count = dateMap[dateStr] || 0;
    
    let level = 'level-0';
    if (count === 1) level = 'level-1';
    else if (count === 2) level = 'level-2';
    else if (count >= 3) level = 'level-3';
    
    const formattedDate = `${date.getFullYear()}/${date.getMonth()+1}/${date.getDate()}`;
    const tooltip = `${formattedDate}: ${count}回の受験`;
    
    html += `<div class="heatmap-cell ${level}" title="${tooltip}"></div>`;
    
    // Month label logic
    if (i % 7 === 0) { // column start
      const colIdx = i / 7;
      const month = date.getMonth();
      if (month !== lastMonth) {
        monthLabels[colIdx] = (month + 1) + '月';
        lastMonth = month;
      }
    }
  }
  
  container.innerHTML = html;
  
  // Render month labels above columns
  let labelsHtml = '';
  monthLabels.forEach(lbl => {
    labelsHtml += `<span style="width: 12.5px; text-align: left; overflow: visible; white-space: nowrap;">${lbl}</span>`;
  });
  labelsContainer.innerHTML = labelsHtml;
}

function renderHistoryList() {
  const container = document.getElementById('history-list-container');
  const history = getHistory().reverse(); // Show latest first
  
  if (history.length === 0) {
    container.innerHTML = '<p class="text-muted" style="font-size: 0.85rem; text-align: center; padding: 1rem 0;">履歴はありません。</p>';
    return;
  }
  
  let html = '';
  history.forEach(item => {
    const date = new Date(item.timestamp);
    const dateStr = `${date.getFullYear()}/${date.getMonth()+1}/${date.getDate()} ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
    const maxScore = item.maxScore || (item.attemptedCount * 25) || 100;
    const ratio = item.score / maxScore;
    
    let colorClass = 'warning';
    if (ratio >= 0.8) colorClass = 'green';
    else if (ratio >= 0.5) colorClass = 'purple';
    
    html += `
      <div class="history-item" onclick="viewPastReport('${item.id}')">
        <div class="history-info">
          <span class="history-date">📅 ${dateStr}</span>
          <span class="history-subj">${item.subjects.join(', ')} (挑戦: ${item.attemptedCount}問)</span>
        </div>
        <div class="history-score ${colorClass}">
          ${item.score} / ${maxScore} 点
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

window.viewPastReport = function(testId) {
  const history = getHistory();
  const record = history.find(item => item.id === testId);
  if (!record) return;
  
  activeSession = {
    attemptedQuestions: record.attemptedQuestions || [],
    ocrTextUnified: record.ocrTextUnified || '',
    images: record.images || [],
    generalNote: record.generalNote || '',
    report: record.report,
    isFinished: true
  };
  
  renderReport();
  switchView('report');
  showToast('過去のレポートを表示しました。');
};

// -------------------------------------------------------------
// Backup and Restore (Data migration)
// -------------------------------------------------------------
function exportBackup() {
  const history = getHistory();
  const apiKey = localStorage.getItem('gemini_api_key') || DEFAULT_API_KEY;
  
  const backupData = {
    version: "1.0",
    apiKey: apiKey,
    history: history
  };
  
  const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `math_diagnosis_backup_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast('バックアップファイルを書き出しました。');
}

async function syncTextbookMapping() {
  const sheetsUrl = localStorage.getItem('math_google_sheets_url');
  if (!sheetsUrl) {
    showToast('連携用URL（Googleスプレッドシート）が設定されていません。', 'danger');
    return;
  }
  
  showLoader('教材データを同期中...');
  
  try {
    const localRes = await fetch('textbook_mapping.json');
    if (!localRes.ok) {
      throw new Error('textbook_mapping.json を取得できませんでした。先に動画の解析を完了してください。');
    }
    const mappings = await localRes.json();
    
    const payload = {
      action: 'import_textbook_mapping',
      mappings: mappings
    };
    
    const gasRes = await fetch(sheetsUrl, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    const resJson = await gasRes.json();
    if (resJson.status === 'success') {
      localStorage.setItem('textbook_synced_version', '1.0');
      showToast(`教材データ（${resJson.count}件）の同期が完了しました！`, 'success');
      closeModal('settings-modal');
    } else {
      throw new Error(resJson.message || '同期処理に失敗しました。');
    }
  } catch (err) {
    console.error(err);
    showToast(`エラー: ${err.message}`, 'danger');
  } finally {
    hideLoader();
  }
}

async function autoSyncTextbookMapping(sheetsUrl) {
  try {
    const localRes = await fetch('textbook_mapping.json');
    if (!localRes.ok) return;
    const mappings = await localRes.json();
    
    const payload = {
      action: 'import_textbook_mapping',
      mappings: mappings
    };
    
    const gasRes = await fetch(sheetsUrl, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    const resJson = await gasRes.json();
    if (resJson.status === 'success') {
      localStorage.setItem('textbook_synced_version', '1.0');
      console.log(`Auto-synced textbook mapping: ${resJson.count} items.`);
    }
  } catch (err) {
    console.error("Auto-sync textbook mapping failed:", err);
  }
}

window.triggerImportBackup = function() {
  document.getElementById('import-backup-file').click();
};

window.handleImportBackup = function(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const data = JSON.parse(event.target.result);
      
      if (data.apiKey !== undefined) {
        localStorage.setItem('gemini_api_key', data.apiKey);
        document.getElementById('api-key-input').value = data.apiKey;
      }
      
      if (data.history !== undefined) {
        localStorage.setItem('math_test_history', JSON.stringify(data.history));
      }
      
      showToast('バックアップデータを読み込みました！', 'success');
      closeModal('settings-modal');
      renderDashboard();
    } catch (err) {
      showToast('ファイルの読み込みに失敗しました。有効なJSONではありません。', 'danger');
      console.error(err);
    }
  };
  reader.readAsText(file);
};

// -------------------------------------------------------------
// Session Operations (Start / Resume / Reset)
// -------------------------------------------------------------
function startExam() {
  const selectedUnits = [];
  const checkboxes = document.querySelectorAll('#subject-selector input[type="checkbox"]:checked');
  
  checkboxes.forEach(chk => {
    selectedUnits.push({
      subject: chk.dataset.subject,
      chapter: chk.dataset.chapter,
      unit: chk.dataset.unit
    });
  });
  
  if (selectedUnits.length === 0) {
    showToast('診断を行いたい単元を少なくとも1つ以上選択してください。', 'warning');
    return;
  }
  
  const mode = localStorage.getItem('math_curriculum_mode') || 'junior_high';
  const subjectsSrc = questionsDb[mode].subjects;
  
  // Collect all questions in selected categories
  const pool = [];
  selectedUnits.forEach(sel => {
    const questions = subjectsSrc[sel.subject].chapters[sel.chapter].units[sel.unit].questions;
    if (questions && questions.length > 0) {
      questions.forEach(q => {
        if (q.template) {
          // Generate 20 random variations of this template question!
          for (let i = 0; i < 20; i++) {
            const dynamicQ = generateDynamicQuestion(q.id, i + 1);
            pool.push({
              ...dynamicQ,
              subjectName: subjectsSrc[sel.subject].name,
              chapterName: subjectsSrc[sel.subject].chapters[sel.chapter].name,
              unitName: subjectsSrc[sel.subject].chapters[sel.chapter].units[sel.unit].name
            });
          }
        } else {
          pool.push({
            ...q,
            subjectName: subjectsSrc[sel.subject].name,
            chapterName: subjectsSrc[sel.subject].chapters[sel.chapter].name,
            unitName: subjectsSrc[sel.subject].chapters[sel.chapter].units[sel.unit].name
          });
        }
      });
    }
  });
  
  if (pool.length === 0) {
    showToast('選択した単元に登録されている問題がありません。別単元を選んでください。', 'warning');
    return;
  }
  
  // Shuffle all questions to form a randomized queue
  const questionQueue = pool.sort(() => 0.5 - Math.random());
  
  // Create dynamic session state
  activeSession = {
    questionPool: questionQueue,        // Remaining questions
    attemptedQuestions: [questionQueue[0]], // Questions served to the student (starts with Q1)
    currentQuestionIndex: 0,
    startTime: Date.now(),
    elapsedSeconds: 0,
    isFinished: false,
    isPaused: false,     // Pause flag
    images: [],          // Base64 compressed image files
    generalNote: "",     // Combined tutor/student note
    ocrTextUnified: "",  // Consolidated transcribed OCR text
    report: null         // Diagnostic report JSON
  };
  
  saveSessionToStorage();
  runExamMode();
}

function runExamMode() {
  renderActiveQuestion();
  
  // Reset Paused layout
  document.getElementById('exam-paused-mask').style.display = 'none';
  document.getElementById('exam-question-body').style.display = 'block';
  document.getElementById('exam-controls-row').style.display = 'flex';
  
  switchView('exam');
  startTimer();
}

function restoreSession() {
  const saved = localStorage.getItem('math_test_session');
  if (!saved) return;
  
  try {
    activeSession = JSON.parse(saved);
    
    // Show report if evaluation exists
    if (activeSession.report) {
      renderReport();
      switchView('report');
      return;
    }
    
    // If finished, route to upload or correction state
    if (activeSession.isFinished) {
      if (activeSession.ocrTextUnified) {
        renderOcrCorrection();
        switchView('correction');
      } else {
        renderMultiPreviewGallery();
        switchView('upload');
      }
      return;
    }
    
    // Handle paused state restoration
    if (activeSession.isPaused) {
      switchView('exam');
      renderActiveQuestion();
      
      const remaining = MOCK_EXAM_TIME_LIMIT - activeSession.elapsedSeconds;
      const min = Math.floor(remaining / 60).toString().padStart(2, '0');
      const sec = (remaining % 60).toString().padStart(2, '0');
      document.getElementById('timer-display').textContent = `${min}:${sec}`;
      
      document.getElementById('exam-paused-mask').style.display = 'block';
      document.getElementById('exam-question-body').style.display = 'none';
      document.getElementById('exam-controls-row').style.display = 'none';
      
      const timerTextEl = document.getElementById('exam-timer');
      timerTextEl.className = 'timer-text timer-warning';
      
      showToast('一時停止中のテストがあります。');
      return;
    }
    
    // Resume timer and exam
    const now = Date.now();
    const elapsedSinceStart = Math.floor((now - activeSession.startTime) / 1000);
    
    if (elapsedSinceStart >= MOCK_EXAM_TIME_LIMIT) {
      activeSession.elapsedSeconds = MOCK_EXAM_TIME_LIMIT;
      activeSession.isFinished = true;
      saveSessionToStorage();
      renderMultiPreviewGallery();
      switchView('upload');
      showToast('制限時間が終了しました。解答用紙を撮影してアップロードしてください。', 'warning');
    } else {
      activeSession.elapsedSeconds = elapsedSinceStart;
      runExamMode();
      showToast('前回のテストセッションを再開しました。');
    }
  } catch (error) {
    console.error("Failed to restore session", error);
    localStorage.removeItem('math_test_session');
  }
}

function saveSessionToStorage() {
  if (activeSession) {
    localStorage.setItem('math_test_session', JSON.stringify(activeSession));
  }
}

function resetSession() {
  if (activeSession) {
    const isReport = !!activeSession.report;
    const msg = isReport 
      ? 'ホーム画面に戻りますか？\n（現在の診断レポートを閉じます。過去の診断結果は履歴から再度閲覧可能です）'
      : 'テストを終了してホーム画面に戻りますか？\n（現在進行中のテストデータは破棄されます）';
      
    if (!confirm(msg)) {
      return;
    }
  }
  
  stopTimer();
  activeSession = null;
  localStorage.removeItem('math_test_session');
  
  document.getElementById('multi-file-input').value = '';
  document.getElementById('general-note-box').value = '';
  
  switchView('setup');
  renderDashboard(); // Update grass heatmap and history
  showToast('ホーム画面に戻りました。');
}

// -------------------------------------------------------------
// Timer Logic
// -------------------------------------------------------------
function startTimer() {
  stopTimer();
  updateTimerDisplay();
  
  timerInterval = setInterval(() => {
    if (!activeSession || activeSession.isPaused) {
      stopTimer();
      return;
    }
    
    const now = Date.now();
    activeSession.elapsedSeconds = Math.floor((now - activeSession.startTime) / 1000);
    
    if (activeSession.elapsedSeconds >= MOCK_EXAM_TIME_LIMIT) {
      activeSession.elapsedSeconds = MOCK_EXAM_TIME_LIMIT;
      activeSession.isFinished = true;
      saveSessionToStorage();
      stopTimer();
      renderMultiPreviewGallery();
      switchView('upload');
      showToast('制限時間終了です！解答の撮影に進みます。', 'warning');
    } else {
      updateTimerDisplay();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerDisplay() {
  const display = document.getElementById('timer-display');
  const timerTextEl = document.getElementById('exam-timer');
  const remaining = MOCK_EXAM_TIME_LIMIT - activeSession.elapsedSeconds;
  
  const min = Math.floor(remaining / 60).toString().padStart(2, '0');
  const sec = (remaining % 60).toString().padStart(2, '0');
  display.textContent = `${min}:${sec}`;
  
  if (remaining <= 300) { // 5 minutes left
    timerTextEl.className = 'timer-text timer-warning';
  } else {
    timerTextEl.className = 'timer-text timer-running';
  }
}

// -------------------------------------------------------------
// Exam Action triggers (Next, Pause, Resume, Finish)
// -------------------------------------------------------------
function pauseExam() {
  if (!activeSession) return;
  stopTimer();
  activeSession.isPaused = true;
  saveSessionToStorage();
  
  document.getElementById('exam-paused-mask').style.display = 'block';
  document.getElementById('exam-question-body').style.display = 'none';
  document.getElementById('exam-controls-row').style.display = 'none';
  
  const timerTextEl = document.getElementById('exam-timer');
  timerTextEl.className = 'timer-text timer-warning';
  
  showToast('試験を一時停止しました。');
}

function resumeExam() {
  if (!activeSession) return;
  activeSession.isPaused = false;
  
  // Adjust startTime so elapsedSeconds remains correct on resume
  activeSession.startTime = Date.now() - (activeSession.elapsedSeconds * 1000);
  saveSessionToStorage();
  
  document.getElementById('exam-paused-mask').style.display = 'none';
  document.getElementById('exam-question-body').style.display = 'block';
  document.getElementById('exam-controls-row').style.display = 'flex';
  
  startTimer();
  showToast('試験を再開しました。');
}

// -------------------------------------------------------------
// UI Rendering - Exam View (Single question flow)
// -------------------------------------------------------------
function renderActiveQuestion() {
  const currentIdx = activeSession.currentQuestionIndex;
  const q = activeSession.attemptedQuestions[currentIdx];
  
  document.getElementById('current-question-num').textContent = `大問 ${currentIdx + 1}`;
  document.getElementById('current-question-ref').textContent = `${q.subjectName} - ${q.chapterName} (${q.unitName})`;
  
  const textEl = document.getElementById('current-question-text');
  textEl.textContent = q.text;
  
  // Show total attempted questions count in header
  document.getElementById('solved-count-display').textContent = activeSession.attemptedQuestions.length;
  
  // Handle Prev button disabled state (Keep it layout-stable but grayed out)
  const prevBtn = document.getElementById('prev-question-btn');
  if (prevBtn) {
    if (currentIdx === 0) {
      prevBtn.disabled = true;
      prevBtn.classList.add('btn-disabled');
    } else {
      prevBtn.disabled = false;
      prevBtn.classList.remove('btn-disabled');
    }
  }
  
  if (window.renderMathInElement) {
    window.renderMathInElement(textEl, {
      delimiters: [
        {left: '$$', right: '$$', display: true},
        {left: '$', right: '$', display: false}
      ]
    });
  }
}

window.prevQuestion = function() {
  if (!activeSession) return;
  const currentIdx = activeSession.currentQuestionIndex;
  if (currentIdx > 0) {
    activeSession.currentQuestionIndex = currentIdx - 1;
    saveSessionToStorage();
    renderActiveQuestion();
  }
};

window.nextQuestion = function() {
  const currentIdx = activeSession.currentQuestionIndex;
  const nextIdx = currentIdx + 1;
  
  if (nextIdx < activeSession.attemptedQuestions.length) {
    activeSession.currentQuestionIndex = nextIdx;
    saveSessionToStorage();
    renderActiveQuestion();
    return;
  }
  
  // Dynamic shuffle and recycling of questions if pool runs out
  if (nextIdx >= activeSession.questionPool.length) {
    showToast('選択した分野の問題を一周しました。シャッフルして出題を継続します。');
    const currentQ = activeSession.attemptedQuestions[currentIdx];
    
    // Copy the attempted questions (or pool size limit), exclude current to avoid back-to-back repeats
    const poolCopy = activeSession.questionPool.slice(0, activeSession.attemptedQuestions.length);
    let reshuffled = poolCopy.filter(q => q.id !== currentQ.id).sort(() => 0.5 - Math.random());
    if (reshuffled.length === 0) {
      reshuffled = [...poolCopy];
    }
    
    activeSession.questionPool = activeSession.questionPool.concat(reshuffled);
  }
  
  const nextQ = activeSession.questionPool[nextIdx];
  activeSession.attemptedQuestions.push(nextQ);
  activeSession.currentQuestionIndex = nextIdx;
  saveSessionToStorage();
  renderActiveQuestion();
};

function finishExam() {
  stopTimer();
  
  const currentIdx = activeSession.currentQuestionIndex;
  const confirmResult = confirm(`現在表示中の大問 ${currentIdx + 1} も解答（記入）しましたか？\n（はい = 採点対象に含む, いいえ = 採点対象から除外）`);
  
  if (!confirmResult) {
    activeSession.attemptedQuestions.pop();
    activeSession.currentQuestionIndex = Math.max(0, currentIdx - 1);
  }
  
  if (activeSession.attemptedQuestions.length === 0) {
    showToast('解答した問題がありません。テストを最初からやり直します。', 'warning');
    resetSession();
    return;
  }
  
  activeSession.isFinished = true;
  saveSessionToStorage();
  
  renderMultiPreviewGallery();
  switchView('upload');
}

// -------------------------------------------------------------
// UI Rendering - Multi-image upload
// -------------------------------------------------------------
window.triggerMultiFileInput = function() {
  document.getElementById('multi-file-input').click();
};

window.handleMultiFileSelect = function(e) {
  const files = e.target.files;
  if (!files || files.length === 0) return;
  
  showLoader('画像処理中...', '画像を圧縮して追加しています。');
  
  let processedCount = 0;
  const targetCount = files.length;
  
  activeSession.images = [];
  
  for (let i = 0; i < targetCount; i++) {
    const file = files[i];
    const reader = new FileReader();
    reader.onload = function(event) {
      compressImage(event.target.result, 1200, 0.8, (compressedBase64) => {
        activeSession.images.push(compressedBase64);
        processedCount++;
        
        if (processedCount === targetCount) {
          saveSessionToStorage();
          renderMultiPreviewGallery();
          hideLoader();
          showToast(`${targetCount}枚の解答用紙を読み込みました。`);
        }
      });
    };
    reader.readAsDataURL(file);
  }
};

function renderMultiPreviewGallery() {
  const gallery = document.getElementById('multi-preview-gallery');
  if (activeSession.images.length === 0) {
    gallery.innerHTML = '';
    return;
  }
  
  let html = '';
  activeSession.images.forEach((imgSrc, idx) => {
    html += `
      <div style="position: relative; width: 80px; height: 80px; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px; overflow: hidden;">
        <img src="${imgSrc}" style="width: 100%; height: 100%; object-fit: cover;" alt="Sheet ${idx + 1}">
        <div onclick="removeUploadedImage(event, ${idx})" style="position: absolute; top: 2px; right: 2px; background: rgba(239, 68, 68, 0.9); color: white; border-radius: 50%; width: 16px; height: 16px; font-size: 10px; display: flex; align-items: center; justify-content: center; font-weight: bold; cursor: pointer;">×</div>
      </div>
    `;
  });
  
  if (activeSession.images.length > 0) {
    html += `
      <button class="btn btn-secondary" onclick="clearAllImages(event)" style="padding: 0.2rem 0.5rem; font-size: 0.75rem; width: auto; height: 30px; align-self: center;">全部クリア</button>
    `;
  }
  
  gallery.innerHTML = html;
  document.getElementById('general-note-box').value = activeSession.generalNote || '';
}

window.removeUploadedImage = function(e, idx) {
  e.stopPropagation();
  activeSession.images.splice(idx, 1);
  saveSessionToStorage();
  renderMultiPreviewGallery();
  showToast('画像を削除しました。');
};

window.clearAllImages = function(e) {
  e.stopPropagation();
  activeSession.images = [];
  saveSessionToStorage();
  renderMultiPreviewGallery();
  showToast('すべての画像をクリアしました。');
};

// Client-side Image compression helper
function compressImage(base64Str, maxWidth, quality, callback) {
  const img = new Image();
  img.src = base64Str;
  img.onload = function() {
    const canvas = document.createElement('canvas');
    let width = img.width;
    let height = img.height;
    
    if (width > maxWidth) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    }
    
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    
    const compressed = canvas.toDataURL('image/jpeg', quality);
    callback(compressed);
  };
}

// -------------------------------------------------------------
// Gemini API Call: Pre-read / Transcription (OCR) Step
// -------------------------------------------------------------
async function runOcrPreRead() {
  const apiKey = localStorage.getItem('gemini_api_key') || DEFAULT_API_KEY;
  if (!apiKey) {
    showToast('診断を実行するにはAPIキーの設定が必要です。設定ボタンを開いてください。', 'warning');
    openModal('settings-modal');
    return;
  }
  
  if (activeSession.images.length === 0) {
    showToast('少なくとも1枚以上の解答用紙の写真を撮影・アップロードしてください。', 'warning');
    return;
  }
  
  activeSession.generalNote = document.getElementById('general-note-box').value.trim();
  saveSessionToStorage();
  
  showLoader('文字起こし中...', 'Gemini AIがすべての解答用紙から計算式を文字起こししています。');
  
  try {
    let questionsListText = '';
    activeSession.attemptedQuestions.forEach((q, idx) => {
      questionsListText += `大問 ${idx + 1}: ${q.text}\n`;
    });
    
    const parts = [
      {
        text: `あなたは手書きの数学解答用紙から計算式を正確に読み取りテキスト化するプロのAIアシスタントです。
添付された ${activeSession.images.length} 枚の解答用紙の画像から、学生が解いた計算プロセスを読み取り、文字起こしをしてください。

解答用紙に解かれているのは以下の問題です：
${questionsListText}

【指示事項】
1. 各問題への解答プロセスを検出し、大問ごとに整理して出力してください（例：「【大問 1】」「【大問 2】」といった見出しを付けてください）。
2. 数式はLaTeX形式（例えば $2x^2 + 5x + 3 = 0$ や $\\sin \\theta = 3/5$ など）で表現してください。
3. 学生や指導者からの補足コメント（後述）がある場合は、それを参考にしながら潰れた手書き文字を正しく補完してください。
4. 採点や解説は一切出力せず、文字起こしテキスト（数式プロセス）のみを簡潔に出力してください。
5. 解答用紙に解かれていない問題については、「(大問 X は解答用紙に記述なし)」と出力してください。

補足コメント: "${activeSession.generalNote}"`
      }
    ];
    
    activeSession.images.forEach(imgData => {
      const rawBase64 = imgData.split(',')[1];
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: rawBase64
        }
      });
    });
    
    const payload = {
      contents: [{ parts }]
    };
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Gemini Pre-read failed: ${response.statusText}`);
    }
    
    const resultJson = await response.json();
    const text = resultJson.candidates?.[0]?.content?.parts?.[0]?.text || '(文字起こしに失敗しました)';
    
    activeSession.ocrTextUnified = text.trim();
    saveSessionToStorage();
    
    hideLoader();
    renderOcrCorrection();
    switchView('correction');
    showToast('文字起こしが完了しました。修正を行ってください。');
    
  } catch (error) {
    hideLoader();
    showToast(`文字起こしプロセスでエラーが発生しました: ${error.message}`, 'danger');
    console.error(error);
  }
}

// -------------------------------------------------------------
// UI Rendering - OCR Text Correction View (Interactive Editor)
// -------------------------------------------------------------
function renderOcrCorrection() {
  const container = document.getElementById('ocr-disp-unified');
  const text = activeSession.ocrTextUnified || '';
  
  container.textContent = text;
  document.getElementById('ocr-textarea-unified').value = text;
  
  if (window.renderMathInElement) {
    window.renderMathInElement(container, {
      delimiters: [
        {left: '$$', right: '$$', display: true},
        {left: '$', right: '$', display: false}
      ]
    });
  }
}

window.enterUnifiedEditMode = function() {
  document.getElementById('ocr-disp-unified').style.display = 'none';
  document.getElementById('ocr-edit-wrap-unified').style.display = 'block';
  document.getElementById('ocr-textarea-unified').focus();
};

window.cancelUnifiedEditMode = function() {
  document.getElementById('ocr-disp-unified').style.display = 'block';
  document.getElementById('ocr-edit-wrap-unified').style.display = 'none';
};

window.saveUnifiedEditMode = function() {
  const newText = document.getElementById('ocr-textarea-unified').value;
  activeSession.ocrTextUnified = newText;
  saveSessionToStorage();
  
  renderOcrCorrection();
  
  document.getElementById('ocr-disp-unified').style.display = 'block';
  document.getElementById('ocr-edit-wrap-unified').style.display = 'none';
  showToast('解答テキストを保存・反映しました。');
};

// -------------------------------------------------------------
// Gemini API Call: Final Diagnosis and Evaluation
// -------------------------------------------------------------
async function runFinalDiagnosis() {
  const apiKey = localStorage.getItem('gemini_api_key') || DEFAULT_API_KEY;
  
  showLoader('実力診断中...', 'Gemini AIが計算プロセスを論理分析し、学習プランを作成しています。');
  
  try {
    const elapsed = activeSession.elapsedSeconds || 0;
    const min = Math.floor(elapsed / 60);
    const sec = elapsed % 60;
    const durationText = `${min}分${sec}秒`;

    let promptQuestionsText = '';
    activeSession.attemptedQuestions.forEach((q, idx) => {
      promptQuestionsText += `
### 大問 ${idx + 1}
- 問題ID: ${q.id}
- 問題内容: ${q.text}
- 正解・解説: ${q.answer}
- 関連単元: ${q.reference}
- ヒント・アプローチ: ${q.hint}
`;
    });
    
    const promptText = `あなたは数学教育の専門家であり、数学に非常に強い苦手意識を持つ高校2年生の個別指導講師です。
以下のテスト内容（挑戦した問題）と、生徒が解いた途中式プロセス（補正済みテキスト）を分析し、採点および実力の診断を行ってください。

【試験の実施状況（解答時間情報）】
- 全体の所要時間: ${durationText}
- 各問題の解答案を作成・整理するのに要した時間です。

【出題された問題リスト】
${promptQuestionsText}

【生徒の解答プロセス（補正済みテキスト）】
"""
${activeSession.ocrTextUnified || '(解答なし)'}
"""

【診断時の重要指示】
1. **問題ID（idフィールド）の厳密な返却**:
   各問の採点オブジェクトの \`id\` フィールドには、出題された問題のID（例：\`m1_ch1_q1\`, \`ma_ch1_q1\` など）を**一字一句違わずにそのまま**使用してください。「大問1」や「q1」などに書き換えてはいけません。不一致が起きると画面上に点数が表示されません。
2. **採点基準**:
   各大問は25点満点です。計算プロセスを論理的に追い、最終回答が正しく、かつ計算ステップに誤りがない場合は必ず **25点満点** とし、\`isCorrect\` を \`true\` にしてください。途中式が合っていて最終計算を間違えた場合などは、論理性を評価して部分点（例：15点など）をつけ、\`isCorrect\` を \`false\` にしてください。
3. **間違いの分析**:
   途中式のどのステップでどのような勘違い（移項時の符号ミス、因数分解のたすき掛けミス、平方完成の定数項調整ミスなど）があったかを優しく丁寧に日本語で指摘してください。
4. **学習提案**:
   参考書『My Best よくわかる高校数学』（新課程版）に準拠した復習計画を提案してください。
5. **解答時間の評価**:
   「全体の所要時間」が問題のボリュームや難易度に比べて極端に短い（例：数秒〜数分で全問解かれているなど）場合、あるいは非常に時間がかかっている場合は、解答スピードと習熟度の関連性（完全に定着しているのか、暗算の速度なのか、勘なのか等）について苦手診断（\`weaknesses\`）の中で言及・評価してください。
`;

    const parts = [{ text: promptText }];
    
    activeSession.images.forEach(imgData => {
      const rawBase64 = imgData.split(',')[1];
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: rawBase64
        }
      });
    });

    const payload = {
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 2048,
        responseSchema: {
          type: "OBJECT",
          properties: {
            totalScore: { type: "INTEGER" },
            questions: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  id: { type: "STRING" },
                  score: { type: "INTEGER" },
                  isCorrect: { type: "BOOLEAN" },
                  commentary: { type: "STRING" }
                },
                required: ["id", "score", "isCorrect", "commentary"]
              }
            },
            weaknesses: { type: "STRING" },
            recommendation: { type: "STRING" }
          },
          required: ["totalScore", "questions", "weaknesses", "recommendation"]
        }
      }
    };
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      let errorDetail = response.statusText;
      try {
        const errorJson = await response.json();
        console.error("Gemini API Error details:", errorJson);
        errorDetail = errorJson.error?.message || response.statusText;
      } catch (e) {
        console.error("Failed to parse Gemini error response body:", e);
      }
      throw new Error(`Gemini evaluation failed: ${errorDetail}`);
    }
    
    const resultJson = await response.json();
    let textResponse = resultJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    console.log("Raw Gemini API response text:", textResponse);
    
    if (textResponse.includes('```')) {
      textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    }
    
    const firstBrace = textResponse.indexOf('{');
    const lastBrace = textResponse.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      textResponse = textResponse.substring(firstBrace, lastBrace + 1);
      console.log("Extracted JSON candidate string before brace cleaning:", textResponse);
      
      // Clean duplicate or unbalanced extra closing braces at the end
      textResponse = cleanInvalidJsonBraces(textResponse);
      console.log("Extracted JSON candidate string after brace cleaning:", textResponse);
    }
    
    let reportData;
    try {
      reportData = JSON.parse(textResponse);
    } catch (parseError) {
      console.error("JSON parsing failed!");
      console.error("Failed JSON string:", textResponse);
      console.error("Original raw response object:", resultJson);
      console.error(parseError);
      throw new Error(`AIの採点結果（JSON形式）の解析に失敗しました。詳細な内容はブラウザのデベロッパーツール（コンソール）を確認してください。エラー: ${parseError.message}`);
    }

    activeSession.report = reportData;
    saveSessionToStorage();
    
    // Store in history for statistics dashboard
    const historyItem = {
      id: 'test_' + Date.now(),
      timestamp: Date.now(),
      score: reportData.totalScore,
      maxScore: activeSession.attemptedQuestions.length * 25,
      attemptedCount: activeSession.attemptedQuestions.length,
      subjects: Array.from(new Set(activeSession.attemptedQuestions.map(q => q.subjectName))),
      report: reportData,
      attemptedQuestions: activeSession.attemptedQuestions,
      images: activeSession.images,
      ocrTextUnified: activeSession.ocrTextUnified,
      generalNote: activeSession.generalNote,
      durationSeconds: activeSession.elapsedSeconds || 0 // Save exact seconds spent
    };
    saveToHistory(historyItem);
    sendResultEmail(historyItem);
    
    hideLoader();
    renderReport();
    switchView('report');
    showToast('診断レポートが完成しました！', 'success');
    
  } catch (error) {
    hideLoader();
    showToast(`診断中にエラーが発生しました: ${error.message}`, 'danger');
    console.error(error);
  }
}

// -------------------------------------------------------------
// UI Rendering - Diagnostic Report View
// -------------------------------------------------------------
function renderReport() {
  const report = activeSession.report;
  if (!report) return;
  
  const attemptedCount = activeSession.attemptedQuestions.length;
  const maxScore = attemptedCount * 25;
  
  // Render score and title
  document.getElementById('total-score').textContent = report.totalScore;
  document.getElementById('max-score').textContent = maxScore;
  document.getElementById('attempted-summary').textContent = `挑戦した問題数: ${attemptedCount}問 (完答: ${report.questions.filter(q => q.isCorrect).length}問)`;
  
  // Render question commentaries
  const qContainer = document.getElementById('report-q-results');
  let qHtml = '';
  
  activeSession.attemptedQuestions.forEach((q, idx) => {
    let qReport = report.questions.find(qr => qr.id === q.id);
    
    if (!qReport && report.questions[idx]) {
      qReport = report.questions[idx];
      console.warn(`Gemini returned incorrect question ID: "${qReport.id}". Mapping by index fallback used.`);
    }
    
    if (!qReport) {
      qReport = { score: 0, isCorrect: false, commentary: 'AI採点データのマッピングに失敗しました。' };
    }
    
    const statusClass = qReport.isCorrect ? 'correct' : 'incorrect';
    const statusIcon = qReport.isCorrect ? '✓ 完答 (25/25点)' : `△ 部分点 (${qReport.score}/25点)`;
    
    qHtml += `
      <div class="report-q-result ${statusClass}">
        <div class="report-q-header">
          <div>大問 ${idx + 1} (${q.subjectName} - ${q.chapterName})</div>
          <div class="report-q-score" style="color: ${qReport.isCorrect ? 'var(--accent-success)' : 'var(--accent-warning)'};">
            ${statusIcon}
          </div>
        </div>
        <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem; overflow-x: auto; padding-bottom: 2px;">
          問題: ${q.text}
        </div>
        <div class="report-commentary">${qReport.commentary}</div>
      </div>
    `;
  });
  qContainer.innerHTML = qHtml;
  
  // Render Overall recommendation card
  const recCard = document.getElementById('recommendation-card');
  recCard.innerHTML = `
    <h2 class="report-section-title">📊 総合評価 & 復習計画</h2>
    <div style="margin-bottom: 1.2rem;">
      <h3 style="font-size: 1rem; color: var(--text-primary); margin-bottom: 0.3rem;">全体的な得意不得意の診断</h3>
      <p style="font-size: 0.9rem; line-height: 1.6;">${report.weaknesses}</p>
    </div>
    
    <div class="report-recommendation-box">
      <div class="report-recommendation-title">📖 参考書 『よくわかる高校数学』 での復習プラン</div>
      <p style="font-size: 0.9rem; line-height: 1.6; color: var(--text-primary);">${report.recommendation}</p>
    </div>
  `;
  
  if (window.renderMathInElement) {
    window.renderMathInElement(qContainer, {
      delimiters: [
        {left: '$$', right: '$$', display: true},
        {left: '$', right: '$', display: false}
      ]
    });
    window.renderMathInElement(recCard, {
      delimiters: [
        {left: '$$', right: '$$', display: true},
        {left: '$', right: '$', display: false}
      ]
    });
  }
}

// -------------------------------------------------------------
// Event Listeners & Navigation helper
// -------------------------------------------------------------
function setupEventListeners() {
  // Passcode listeners
  document.getElementById('submit-passcode-btn').addEventListener('click', window.submitPasscode);
  document.getElementById('passcode-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      window.submitPasscode();
    }
  });

  // Navigation button handlers
  document.getElementById('start-exam-btn').addEventListener('click', startExam);
  document.getElementById('prev-question-btn').addEventListener('click', prevQuestion);
  document.getElementById('next-question-btn').addEventListener('click', nextQuestion);
  document.getElementById('finish-exam-btn').addEventListener('click', finishExam);
  document.getElementById('pause-exam-btn').addEventListener('click', pauseExam);
  document.getElementById('resume-exam-btn').addEventListener('click', resumeExam);
  
  document.getElementById('start-ocr-btn').addEventListener('click', runOcrPreRead);
  document.getElementById('back-to-upload-btn').addEventListener('click', () => switchView('upload'));
  document.getElementById('submit-diagnostic-btn').addEventListener('click', runFinalDiagnosis);
  document.getElementById('download-pdf-btn').addEventListener('click', () => window.print());
  document.getElementById('restart-app-btn').addEventListener('click', resetSession);
  document.getElementById('abort-exam-btn').addEventListener('click', resetSession);
  
  // Cancel Exam / Upload handlers to escape without AI evaluation
  const cancelExamHandler = () => {
    if (confirm('テストを中断し、解答データを破棄してホームに戻りますか？（保存されていないデータは失われます）')) {
      localStorage.removeItem('math_test_session');
      activeSession = null;
      switchView('setup');
      showToast('テストを中断しました。');
    }
  };
  document.getElementById('cancel-upload-btn').addEventListener('click', cancelExamHandler);
  document.getElementById('cancel-exam-btn').addEventListener('click', cancelExamHandler);

  // Pomodoro Hide remaining time handler
  const hideCheckbox = document.getElementById('pomo-hide-time-checkbox');
  if (hideCheckbox) {
    hideCheckbox.addEventListener('change', (e) => {
      const display = document.getElementById('pomo-display');
      if (e.target.checked) {
        display.classList.add('blurred');
      } else {
        display.classList.remove('blurred');
      }
    });
  }
  
  // Settings & Backup handlers
  document.getElementById('settings-btn').addEventListener('click', () => openModal('settings-modal'));
  document.getElementById('close-settings-btn').addEventListener('click', () => closeModal('settings-modal'));
  document.getElementById('save-settings-btn').addEventListener('click', saveApiKey);
  document.getElementById('test-connection-btn').addEventListener('click', testApiConnection);
  document.getElementById('test-program-btn').addEventListener('click', testProgramExecution);
  document.getElementById('stats-nav-btn').addEventListener('click', () => {
    switchView('stats');
    initStatsPage();
  });
  
  document.getElementById('export-backup-btn').addEventListener('click', exportBackup);
  document.getElementById('sync-textbook-btn').addEventListener('click', syncTextbookMapping);
  document.getElementById('clear-history-btn').addEventListener('click', clearHistory);
  
  document.getElementById('report-issue-btn').addEventListener('click', () => {
    document.getElementById('report-desc-input').value = '';
    stopTimer();
    openModal('report-modal');
  });
  
  document.getElementById('direct-input-btn').addEventListener('click', startDirectInput);

  // Close modal when clicking outside
  document.getElementById('settings-modal').addEventListener('click', (e) => {
    if (e.target.id === 'settings-modal') closeModal('settings-modal');
  });

  // LMS Handlers
  setupPomodoroHandlers();
  setupQuestionHandlers();
}

function switchView(viewName) {
  Object.keys(views).forEach(name => {
    if (name === viewName) {
      views[name].classList.add('active');
    } else {
      views[name].classList.remove('active');
    }
  });

  // Handle Main Tab bar visibility and active state
  const tabContainer = document.getElementById('app-main-tabs');
  if (viewName === 'setup' || viewName === 'pomodoro' || viewName === 'question' || viewName === 'stats') {
    tabContainer.style.display = 'flex';
    
    // Deactivate all tab buttons
    document.getElementById('tab-exam-btn').classList.remove('active');
    document.getElementById('tab-pomodoro-btn').classList.remove('active');
    document.getElementById('tab-question-btn').classList.remove('active');
    
    // Activate corresponding tab button
    if (viewName === 'setup' || viewName === 'stats') {
      document.getElementById('tab-exam-btn').classList.add('active');
    } else if (viewName === 'pomodoro') {
      document.getElementById('tab-pomodoro-btn').classList.add('active');
    } else if (viewName === 'question') {
      document.getElementById('tab-question-btn').classList.add('active');
    }
  } else {
    tabContainer.style.display = 'none';
  }

  window.scrollTo(0, 0);
}

function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// Loader UI helpers
function showLoader(title, description) {
  document.getElementById('loading-title').textContent = title;
  document.getElementById('loading-desc').textContent = description || '';
  document.getElementById('loading-screen').classList.add('active');
}

function updateLoaderText(title) {
  document.getElementById('loading-title').textContent = title;
}

function hideLoader() {
  document.getElementById('loading-screen').classList.remove('active');
}

// Toast notification helper
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast-notify');
  toast.textContent = message;
  
  if (type === 'danger') {
    toast.style.borderColor = 'var(--accent-danger)';
  } else if (type === 'success') {
    toast.style.borderColor = 'var(--accent-success)';
  } else if (type === 'warning') {
    toast.style.borderColor = 'var(--accent-warning)';
  } else {
    toast.style.borderColor = 'var(--border-glass-active)';
  }
  
  toast.classList.add('active');
  setTimeout(() => {
    toast.classList.remove('active');
  }, 3000);
}

async function sendResultEmail(historyItem) {
  const sheetsUrl = localStorage.getItem('math_google_sheets_url');
  if (!sheetsUrl) {
    console.log('No email notification URL configured. Skipping email send.');
    return;
  }

  const studentName = localStorage.getItem('math_student_name') || '未設定';
  const mode = localStorage.getItem('math_curriculum_mode') || 'junior_high';
  
  const elapsed = activeSession.elapsedSeconds || 0;
  const min = Math.floor(elapsed / 60);
  const sec = elapsed % 60;
  const duration = `${min}分${sec}秒`;

  const payload = {
    action: 'submit_exam_result',
    timestamp: new Date().toLocaleString('ja-JP'),
    studentName: studentName,
    curriculumMode: mode,
    subjectName: historyItem.subjects.join(', '),
    score: historyItem.score,
    maxScore: historyItem.maxScore,
    duration: duration,
    weaknesses: historyItem.report.weaknesses || '',
    recommendation: historyItem.report.recommendation || '',
    reportJson: JSON.stringify(historyItem.report)
  };

  try {
    await fetch(sheetsUrl, {
      method: 'POST',
      mode: 'no-cors', // Bypasses CORS restrictions on GAS web apps
      body: JSON.stringify(payload)
    });
    console.log('Email send payload submitted successfully.');
  } catch (error) {
    console.error('Error submitting email payload:', error);
  }
}

window.submitIssueReport = async function() {
  const sheetsUrl = localStorage.getItem('math_google_sheets_url');
  console.log("Attempting to submit bug report. Configured URL:", sheetsUrl);
  
  if (!sheetsUrl) {
    console.warn("Bug report failed: No sheetsUrl configured in localStorage.");
    showToast('連携用URLが設定されていないため、報告を送信できません。', 'warning');
    return;
  }

  if (!activeSession) {
    console.warn("Bug report failed: No active exam session.");
    showToast('アクティブな試験セッションがありません。', 'warning');
    return;
  }

  const currentIdx = activeSession.currentQuestionIndex;
  const currentQ = activeSession.attemptedQuestions[currentIdx];
  if (!currentQ) {
    console.warn("Bug report failed: No current question found at index:", currentIdx);
    showToast('出題中の問題が見つかりません。', 'warning');
    return;
  }

  const studentName = localStorage.getItem('math_student_name') || '未設定';
  const type = document.getElementById('report-type-input').value;
  const desc = document.getElementById('report-desc-input').value.trim();

  const payload = {
    action: 'report_issue',
    timestamp: new Date().toLocaleString('ja-JP'),
    studentName: studentName,
    questionId: currentQ.id,
    questionText: currentQ.text,
    issueType: type,
    description: desc
  };

  console.log("Submitting bug report payload:", payload);
  showLoader('報告送信中...', '不具合報告を指導者へ送信しています。');

  try {
    await fetch(sheetsUrl, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify(payload)
    });
    console.log("Fetch request for bug report resolved. Status is opaque due to no-cors mode.");
    
    closeReportModal();
    showToast('不具合報告を送信しました。ご協力ありがとうございます！', 'success');
    console.log("Bug report submission completed successfully (Opaque success).");
  } catch (error) {
    showToast('送信に失敗しました。接続を確認してください。', 'danger');
    console.error("Bug report submission failed with error:", error);
  } finally {
    hideLoader();
  }
};

function startDirectInput() {
  if (!activeSession) return;
  activeSession.images = [];
  
  // Dynamically generate default text based on the number of questions in activeSession
  let defaultText = "";
  const totalQ = activeSession.attemptedQuestions ? activeSession.attemptedQuestions.length : 1;
  for (let i = 1; i <= totalQ; i++) {
    defaultText += `【大問${i}】\n\n\n`;
  }
  
  activeSession.ocrTextUnified = defaultText;
  saveSessionToStorage();
  
  renderOcrCorrection();
  switchView('correction');
  window.enterUnifiedEditMode();
  showToast('直接入力モードを開始しました。解答を入力してください。');
}

window.closeReportModal = function() {
  closeModal('report-modal');
  if (activeSession && !activeSession.isPaused) {
    activeSession.startTime = Date.now() - (activeSession.elapsedSeconds * 1000);
    saveSessionToStorage();
    startTimer();
  }
};

function cleanInvalidJsonBraces(jsonStr) {
  jsonStr = jsonStr.trim();
  
  // Count opening and closing braces to see if we have unbalanced extra closing braces
  let openBraces = 0;
  let closeBraces = 0;
  let insideString = false;
  let escapeNext = false;
  
  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      insideString = !insideString;
      continue;
    }
    
    if (!insideString) {
      if (char === '{') openBraces++;
      if (char === '}') closeBraces++;
    }
  }
  
  // If there are more closing braces than opening braces, and it ends with '}', strip trailing '}' until balanced
  if (closeBraces > openBraces) {
    console.log(`Unbalanced JSON braces detected. Open: ${openBraces}, Close: ${closeBraces}. Cleaning...`);
    while (closeBraces > openBraces && jsonStr.endsWith('}')) {
      jsonStr = jsonStr.slice(0, -1).trim();
      closeBraces--;
    }
  }
  
  return jsonStr;
}

// -------------------------------------------------------------
// Learning Statistics Page Logic
// -------------------------------------------------------------
function initStatsPage() {
  const mode = localStorage.getItem('math_curriculum_mode') || 'junior_high';
  
  const schoolStats = document.getElementById('school-stats-container');
  const uniStats = document.getElementById('university-stats-container');
  
  if (mode === 'university') {
    if (schoolStats) schoolStats.style.display = 'none';
    if (uniStats) uniStats.style.display = 'block';
    
    // Sync from sheet in background
    syncPomodoroLogsFromSheet().then(() => {
      renderUniversityDashboard();
    });
    
    // Render local first
    renderUniversityDashboard();
  } else {
    if (schoolStats) schoolStats.style.display = 'block';
    if (uniStats) uniStats.style.display = 'none';
    
    const history = getHistory();
    const subjectSelect = document.getElementById('stats-subject-select');
    
    const uniqueSubjects = new Set();
    history.forEach(item => {
      if (item.subjects && item.subjects.length > 0) {
        item.subjects.forEach(s => uniqueSubjects.add(s));
      }
    });
    
    subjectSelect.innerHTML = '';
    const optAllSub = document.createElement('option');
    optAllSub.value = 'all';
    optAllSub.textContent = 'すべて';
    subjectSelect.appendChild(optAllSub);
    
    uniqueSubjects.forEach(sub => {
      const opt = document.createElement('option');
      opt.value = sub;
      opt.textContent = sub;
      subjectSelect.appendChild(opt);
    });
    
    subjectSelect.onchange = () => {
      populateChapters(subjectSelect.value, history);
    };
    
    populateChapters('all', history);
  }
}

function applyCurriculumModeUI() {
  const mode = localStorage.getItem('math_curriculum_mode') || 'junior_high';
  const examTab = document.getElementById('tab-exam-btn');
  if (!examTab) return;
  
  if (mode === 'university') {
    examTab.style.display = 'none';
    
    const activeView = Object.keys(views).find(name => views[name].classList.contains('active'));
    if (activeView === 'setup' || activeView === 'exam' || activeView === 'upload' || activeView === 'correction' || activeView === 'report') {
      switchView('pomodoro');
    }
  } else {
    examTab.style.display = 'inline-block';
  }
}

function parsePomodoroSessions(logs) {
  const sorted = [...logs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  
  let totalWorkSeconds = 0;
  let totalBreakSeconds = 0;
  let totalLagSeconds = 0;
  let workSessionCount = 0;
  
  let currentState = 'idle'; // 'work', 'break', 'idle'
  const hourCounts = Array(24).fill(0);
  const transitionPairs = [];
  let lastSubject = null;
  const fatiguePoints = [];
  let currentConsecutiveSessions = 0;
  const dailyWorkSeconds = {};
  
  sorted.forEach(log => {
    const event = log.event;
    const elapsed = Number(log.elapsedSeconds || 0);
    const lag = Number(log.lagSeconds || 0);
    const subject = log.subject;
    
    if (event === '作業開始' || event === '作業再開') {
      const d = new Date(log.timestamp);
      if (!isNaN(d.getTime())) {
        hourCounts[d.getHours()]++;
      }
    }
    
    if (event === '作業開始') {
      currentState = 'work';
      currentConsecutiveSessions++;
      if (lag > 0) {
        totalLagSeconds += lag;
        fatiguePoints.push({ session: currentConsecutiveSessions, lag: lag });
      }
      
      if (lastSubject && lastSubject !== subject) {
        transitionPairs.push({ from: lastSubject, to: subject });
      }
      lastSubject = subject;
      
    } else if (event === '作業再開') {
      currentState = 'work';
      
    } else if (event === '休憩開始') {
      currentState = 'break';
      currentConsecutiveSessions++;
      if (lag > 0) {
        totalLagSeconds += lag;
        fatiguePoints.push({ session: currentConsecutiveSessions, lag: lag });
      }
      
      if (lastSubject) {
        transitionPairs.push({ from: lastSubject, to: '休憩' });
      }
      lastSubject = '休憩';
      
    } else if (event === '一時停止' || event === '終了' || event === '自動一時停止（離脱）' || event === '自動休憩一時停止（離脱）') {
      if (currentState === 'work' || event === '自動一時停止（離脱）') {
        totalWorkSeconds += elapsed;
        
        const d = new Date(log.timestamp);
        if (!isNaN(d.getTime())) {
          const dateStr = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
          dailyWorkSeconds[dateStr] = (dailyWorkSeconds[dateStr] || 0) + elapsed;
        }
        
        if (elapsed >= 1500) {
          workSessionCount++;
        }
      } else if (currentState === 'break' || event === '自動休憩一時停止（離脱）') {
        totalBreakSeconds += elapsed;
      }
      
      if (event === '終了') {
        currentState = 'idle';
        currentConsecutiveSessions = 0;
        lastSubject = '終了';
      } else {
        currentState = 'idle';
      }
    }
  });
  
  return {
    totalWorkSeconds,
    totalBreakSeconds,
    totalLagSeconds,
    workSessionCount,
    hourCounts,
    transitionPairs,
    fatiguePoints,
    dailyWorkSeconds
  };
}

function renderUniversityDashboard() {
  const localLogs = JSON.parse(localStorage.getItem('math_pomodoro_history') || '[]');
  const analysis = parsePomodoroSessions(localLogs);
  
  const totalMin = Math.floor(analysis.totalWorkSeconds / 60);
  document.getElementById('uni-total-work-time').textContent = `${totalMin}分`;
  document.getElementById('uni-pomo-count').textContent = `${analysis.workSessionCount}回`;
  
  const totalActionSeconds = analysis.totalWorkSeconds + analysis.totalLagSeconds;
  const efficiency = totalActionSeconds > 0 ? Math.round((analysis.totalWorkSeconds / totalActionSeconds) * 100) : 100;
  document.getElementById('uni-efficiency-rate').textContent = `${efficiency}%`;
  
  const totalSessions = localLogs.filter(l => l.event === '一時停止' || l.event === '終了' || l.event === '自動一時停止（離脱）').length;
  const avgSessionSec = totalSessions > 0 ? Math.round(analysis.totalWorkSeconds / totalSessions) : 0;
  const avgSessionMin = Math.round(avgSessionSec / 60);
  document.getElementById('uni-avg-session').textContent = `${avgSessionMin}分`;
  
  drawCircadianChart(analysis.hourCounts);
  drawBurnupChart(analysis.dailyWorkSeconds);
  drawMarkovMatrix(analysis.transitionPairs);
  drawFatigueChart(analysis.fatiguePoints);
}

function drawCircadianChart(hourCounts) {
  const container = document.getElementById('uni-circadian-chart');
  if (!container) return;
  
  const maxVal = Math.max(...hourCounts, 1);
  const width = 500;
  const height = 130;
  const barWidth = 14;
  const gap = 5;
  const paddingLeft = 30;
  const paddingTop = 10;
  
  let svgContent = `<svg viewBox="0 0 ${width} ${height + 25}" width="100%" height="100%" style="overflow: visible;">`;
  
  for (let i = 0; i <= 4; i++) {
    const y = paddingTop + (height / 4) * i;
    const val = Math.round(maxVal - (maxVal / 4) * i);
    svgContent += `<line x1="${paddingLeft}" y1="${y}" x2="${width}" y2="${y}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`;
    svgContent += `<text x="${paddingLeft - 8}" y="${y + 4}" fill="rgba(255,255,255,0.4)" font-size="8" text-anchor="end">${val}</text>`;
  }
  
  for (let hour = 0; hour < 24; hour++) {
    const count = hourCounts[hour];
    const barHeight = (count / maxVal) * height;
    const x = paddingLeft + hour * (barWidth + gap);
    const y = paddingTop + height - barHeight;
    
    const color = count > 0 ? "url(#circadian-grad)" : "rgba(255,255,255,0.05)";
    
    svgContent += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" rx="3" style="transition: all 0.3s; cursor: pointer;">
      <title>${hour}時: ${count}回開始</title>
    </rect>`;
    
    if (hour % 4 === 0 || hour === 23) {
      svgContent += `<text x="${x + barWidth/2}" y="${paddingTop + height + 15}" fill="rgba(255,255,255,0.5)" font-size="8" text-anchor="middle">${hour}h</text>`;
    }
  }
  
  svgContent += `<defs>
    <linearGradient id="circadian-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="var(--accent-primary)"/>
      <stop offset="100%" stop-color="rgba(99, 102, 241, 0.2)"/>
    </linearGradient>
  </defs>`;
  
  svgContent += `</svg>`;
  container.innerHTML = svgContent;
}

function drawBurnupChart(dailyWorkSeconds) {
  const container = document.getElementById('uni-burnup-chart');
  if (!container) return;
  
  const dates = [];
  const labels = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
    dates.push(dateStr);
    labels.push(`${d.getMonth()+1}/${d.getDate()}`);
  }
  
  let cumHours = 0;
  const cumValues = [];
  dates.forEach(dateStr => {
    const sec = dailyWorkSeconds[dateStr] || 0;
    cumHours += sec / 3600;
    cumValues.push(cumHours);
  });
  
  const targetHours = Array(7).fill(0).map((_, i) => (i + 1) * 2.0);
  const maxVal = Math.max(...cumValues, ...targetHours, 5);
  
  const width = 500;
  const height = 170;
  const paddingLeft = 35;
  const paddingRight = 15;
  const paddingTop = 15;
  const graphWidth = width - paddingLeft - paddingRight;
  
  let svgContent = `<svg viewBox="0 0 ${width} ${height + 30}" width="100%" height="100%" style="overflow: visible;">`;
  
  for (let i = 0; i <= 4; i++) {
    const y = paddingTop + (height / 4) * i;
    const val = ((maxVal / 4) * (4 - i)).toFixed(1);
    svgContent += `<line x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`;
    svgContent += `<text x="${paddingLeft - 8}" y="${y + 4}" fill="rgba(255,255,255,0.4)" font-size="8" text-anchor="end">${val}h</text>`;
  }
  
  const getX = (index) => paddingLeft + (graphWidth / 6) * index;
  const getY = (val) => paddingTop + height - (val / maxVal) * height;
  
  let targetPath = `M ${getX(0)} ${getY(targetHours[0])}`;
  for (let i = 1; i < 7; i++) {
    targetPath += ` L ${getX(i)} ${getY(targetHours[i])}`;
  }
  svgContent += `<path d="${targetPath}" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" stroke-dasharray="4,4"/>`;
  
  let actualPath = `M ${getX(0)} ${getY(cumValues[0])}`;
  let areaPath = `M ${getX(0)} ${getY(0)} L ${getX(0)} ${getY(cumValues[0])}`;
  for (let i = 1; i < 7; i++) {
    const x = getX(i);
    const y = getY(cumValues[i]);
    actualPath += ` L ${x} ${y}`;
    areaPath += ` L ${x} ${y}`;
  }
  areaPath += ` L ${getX(6)} ${getY(0)} Z`;
  
  svgContent += `<path d="${areaPath}" fill="url(#burnup-area-grad)" style="opacity: 0.15;"/>`;
  svgContent += `<path d="${actualPath}" fill="none" stroke="var(--accent-primary)" stroke-width="3" stroke-linecap="round"/>`;
  
  for (let i = 0; i < 7; i++) {
    const x = getX(i);
    const y = getY(cumValues[i]);
    svgContent += `<circle cx="${x}" cy="${y}" r="4" fill="var(--accent-primary)" stroke="rgba(15,23,42,1)" stroke-width="1.5" style="cursor: pointer;">
      <title>${labels[i]}: 累計 ${cumValues[i].toFixed(2)}時間</title>
    </circle>`;
    
    svgContent += `<circle cx="${x}" cy="${getY(targetHours[i])}" r="2" fill="rgba(255,255,255,0.4)"/>`;
    svgContent += `<text x="${x}" y="${paddingTop + height + 18}" fill="rgba(255,255,255,0.5)" font-size="8" text-anchor="middle">${labels[i]}</text>`;
  }
  
  svgContent += `<g transform="translate(${paddingLeft + 10}, ${paddingTop + 10})">
    <line x1="0" y1="5" x2="15" y2="5" stroke="var(--accent-primary)" stroke-width="3"/>
    <text x="20" y="9" fill="rgba(255,255,255,0.7)" font-size="8">実績実績時間</text>
    <line x1="100" y1="5" x2="115" y2="5" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" stroke-dasharray="3,3"/>
    <text x="120" y="9" fill="rgba(255,255,255,0.7)" font-size="8">目標 (2h/日)</text>
  </g>`;
  
  svgContent += `<defs>
    <linearGradient id="burnup-area-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="var(--accent-primary)"/>
      <stop offset="100%" stop-color="transparent"/>
    </linearGradient>
  </defs>`;
  
  svgContent += `</svg>`;
  container.innerHTML = svgContent;
}

function drawMarkovMatrix(transitionPairs) {
  const container = document.getElementById('uni-markov-matrix-wrapper');
  if (!container) return;
  
  if (transitionPairs.length === 0) {
    container.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted); text-align: center; margin: 1.5rem 0;">データがありません。タイマー記録が蓄積されると遷移表が生成されます。</p>`;
    return;
  }
  
  const statesSet = new Set();
  transitionPairs.forEach(pair => {
    statesSet.add(pair.from);
    statesSet.add(pair.to);
  });
  const states = Array.from(statesSet);
  
  states.sort((a, b) => {
    if (a === '休憩') return 1;
    if (b === '休憩') return -1;
    if (a === '終了') return 1;
    if (b === '終了') return -1;
    return a.localeCompare(b);
  });
  
  const matrix = {};
  states.forEach(from => {
    matrix[from] = {};
    states.forEach(to => {
      matrix[from][to] = 0;
    });
  });
  
  const rowTotals = {};
  states.forEach(state => { rowTotals[state] = 0; });
  
  transitionPairs.forEach(pair => {
    if (matrix[pair.from] && matrix[pair.from][pair.to] !== undefined) {
      matrix[pair.from][pair.to]++;
      rowTotals[pair.from]++;
    }
  });
  
  let html = `<table style="width: 100%; border-collapse: collapse; font-size: 0.8rem; text-align: center; color: white;">`;
  html += `<thead><tr><th style="padding: 0.6rem; border-bottom: 2px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.02); font-weight: 600; text-align: left; color: var(--accent-primary);">移行前 \\ 移行後</th>`;
  states.forEach(state => {
    html += `<th style="padding: 0.6rem; border-bottom: 2px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.02); font-weight: 600;">${state}</th>`;
  });
  html += `</tr></thead><tbody>`;
  
  states.forEach(from => {
    html += `<tr><td style="padding: 0.6rem; border-bottom: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02); font-weight: 600; text-align: left; color: var(--accent-primary);">${from}</td>`;
    
    const total = rowTotals[from];
    states.forEach(to => {
      const count = matrix[from][to];
      const prob = total > 0 ? (count / total) : 0;
      const pct = (prob * 100).toFixed(0);
      
      let bg = 'transparent';
      let fontColor = 'rgba(255,255,255,0.4)';
      if (prob > 0) {
        bg = `rgba(99, 102, 241, ${0.1 + prob * 0.7})`;
        fontColor = '#ffffff';
      }
      
      html += `<td style="padding: 0.6rem; border-bottom: 1px solid rgba(255,255,255,0.08); background: ${bg}; color: ${fontColor}; font-weight: ${prob > 0 ? '600' : 'normal'};">
        ${pct}%<br><span style="font-size: 0.65rem; opacity: 0.6;">(${count}回)</span>
      </td>`;
    });
    html += `</tr>`;
  });
  
  html += `</tbody></table>`;
  container.innerHTML = html;
}

function drawFatigueChart(fatiguePoints) {
  const container = document.getElementById('uni-fatigue-chart');
  if (!container) return;
  
  if (fatiguePoints.length === 0) {
    container.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted); text-align: center; margin: 2rem 0;">データがありません。タイマー終了後の反応遅延（アラーム放置秒数）が計測されるとグラフが描画されます。</p>`;
    return;
  }
  
  const width = 500;
  const height = 150;
  const paddingLeft = 35;
  const paddingRight = 15;
  const paddingTop = 15;
  const graphWidth = width - paddingLeft - paddingRight;
  
  const maxSession = Math.max(...fatiguePoints.map(p => p.session), 4);
  const maxLag = Math.max(...fatiguePoints.map(p => p.lag), 60);
  
  const getX = (session) => paddingLeft + (graphWidth / (maxSession - 1 || 1)) * (session - 1);
  const getY = (lag) => paddingTop + height - (lag / maxLag) * height;
  
  let svgContent = `<svg viewBox="0 0 ${width} ${height + 25}" width="100%" height="100%" style="overflow: visible;">`;
  
  for (let i = 0; i <= 3; i++) {
    const y = paddingTop + (height / 3) * i;
    const val = Math.round((maxLag / 3) * (3 - i));
    svgContent += `<line x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`;
    svgContent += `<text x="${paddingLeft - 8}" y="${y + 3}" fill="rgba(255,255,255,0.4)" font-size="8" text-anchor="end">${val}秒</text>`;
  }
  
  fatiguePoints.forEach(p => {
    const x = getX(p.session);
    const y = getY(p.lag);
    svgContent += `<circle cx="${x}" cy="${y}" r="5" fill="#f59e0b" style="opacity: 0.75; cursor: pointer;">
      <title>サイクル #${p.session} - アラーム放置: ${p.lag}秒</title>
    </circle>`;
  });
  
  if (fatiguePoints.length >= 2) {
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    const n = fatiguePoints.length;
    fatiguePoints.forEach(p => {
      sumX += p.session;
      sumY += p.lag;
      sumXY += p.session * p.lag;
      sumXX += p.session * p.session;
    });
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;
    
    const x1 = 1;
    const y1 = slope * x1 + intercept;
    const x2 = maxSession;
    const y2 = slope * x2 + intercept;
    
    svgContent += `<line x1="${getX(x1)}" y1="${getY(y1)}" x2="${getX(x2)}" y2="${getY(y2)}" stroke="#ef4444" stroke-width="2" stroke-dasharray="3,3">
      <title>傾向線 (傾き: ${slope.toFixed(2)}秒/サイクル)</title>
    </line>`;
  }
  
  for (let i = 1; i <= maxSession; i++) {
    const x = getX(i);
    svgContent += `<text x="${x}" y="${paddingTop + height + 15}" fill="rgba(255,255,255,0.5)" font-size="8" text-anchor="middle">#${i}</text>`;
  }
  
  svgContent += `</svg>`;
  container.innerHTML = svgContent;
}

function populateChapters(selectedSubject, history) {
  const chapterSelect = document.getElementById('stats-chapter-select');
  chapterSelect.innerHTML = '';
  
  const optAllCh = document.createElement('option');
  optAllCh.value = 'all';
  optAllCh.textContent = 'すべて';
  chapterSelect.appendChild(optAllCh);
  
  const uniqueChapters = new Set();
  history.forEach(item => {
    if (item.attemptedQuestions) {
      item.attemptedQuestions.forEach(q => {
        if (selectedSubject === 'all' || q.subjectName === selectedSubject) {
          if (q.chapterName) uniqueChapters.add(q.chapterName);
        }
      });
    }
  });
  
  uniqueChapters.forEach(ch => {
    const opt = document.createElement('option');
    opt.value = ch;
    opt.textContent = ch;
    chapterSelect.appendChild(opt);
  });
  
  chapterSelect.onchange = () => {
    renderStatsDashboard();
  };
  
  renderStatsDashboard();
}

function renderStatsDashboard() {
  const history = getHistory().sort((a,b) => a.timestamp - b.timestamp);
  const selectedSubject = document.getElementById('stats-subject-select').value;
  const selectedChapter = document.getElementById('stats-chapter-select').value;
  
  const filteredHistory = history.filter(item => {
    const matchSubject = (selectedSubject === 'all' || (item.subjects && item.subjects.includes(selectedSubject)));
    const matchChapter = (selectedChapter === 'all' || (item.attemptedQuestions && item.attemptedQuestions.some(q => q.chapterName === selectedChapter)));
    return matchSubject && matchChapter;
  });
  
  const chartWrapper = document.getElementById('stats-chart-wrapper');
  const summaryEl = document.getElementById('stats-analysis-summary');
  
  const fitTypeEl = document.getElementById('stats-fit-type');
  const trendEl = document.getElementById('stats-trend');
  const avgTimeQEl = document.getElementById('stats-avg-time-q');
  const avgTimeRunEl = document.getElementById('stats-avg-time-run');
  const avgTimeDayEl = document.getElementById('stats-avg-time-day');
  const avgTimeWeekEl = document.getElementById('stats-avg-time-week');
  const totalTimeEl = document.getElementById('stats-total-time');
  
  if (filteredHistory.length === 0) {
    chartWrapper.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted); margin: 2rem 0;">データがありません。テストを受けるとグラフが表示されます。</p>`;
    summaryEl.textContent = 'データが不足しているため評価を表示できません。テストを受講してください。';
    [fitTypeEl, trendEl, avgTimeQEl, avgTimeRunEl, avgTimeDayEl, avgTimeWeekEl, totalTimeEl].forEach(el => el.textContent = '-');
    return;
  }
  
  // 1. Group by local date string to plot daily average scores
  const historyByDay = {};
  filteredHistory.forEach(item => {
    const d = new Date(item.timestamp);
    const dateStr = `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`;
    if (!historyByDay[dateStr]) {
      historyByDay[dateStr] = {
        scores: [],
        maxScores: [],
        timestamp: item.timestamp
      };
    }
    historyByDay[dateStr].scores.push(item.score);
    historyByDay[dateStr].maxScores.push(item.maxScore);
    if (item.timestamp > historyByDay[dateStr].timestamp) {
      historyByDay[dateStr].timestamp = item.timestamp;
    }
  });

  const dayKeys = Object.keys(historyByDay).sort((a,b) => historyByDay[a].timestamp - historyByDay[b].timestamp);
  const points = dayKeys.map((dateStr, idx) => {
    const dayData = historyByDay[dateStr];
    const totalScore = dayData.scores.reduce((sum, s) => sum + s, 0);
    const totalMax = dayData.maxScores.reduce((sum, m) => sum + m, 0);
    const scoreRate = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
    return {
      x: idx + 1,
      y: scoreRate,
      label: new Date(dayData.timestamp).toLocaleDateString('ja-JP', {month: 'numeric', day: 'numeric'})
    };
  });
  
  const fit = performRegression(points);
  
  if (fit.type === '--') {
    fitTypeEl.textContent = '--';
  } else {
    fitTypeEl.textContent = `${fit.type} (${fit.formula})`;
  }
  trendEl.textContent = fit.trend;
  
  trendEl.className = '';
  if (fit.trend === '上昇') trendEl.style.color = '#10b981';
  else if (fit.trend === '下降') trendEl.style.color = '#ef4444';
  else if (fit.trend === '上限') trendEl.style.color = '#38bdf8';
  else if (fit.trend === '下限') trendEl.style.color = '#facc15';
  else trendEl.style.color = '#94a3b8';
  
  let summaryText = "";
  if (fit.trend === '--') {
    summaryText = `十分なデータ（異なる受講日）が集まっていないため、成績の傾向はまだ分析できません。もう数日テストを受けてください。`;
  } else if (fit.trend === '上昇') {
    summaryText = `成績は順調に上昇傾向にあります（近似式: ${fit.formula}）。学習習慣が身につき、問題の理解度が高まっている状態です。この調子で復習と演習を継続していきましょう！`;
  } else if (fit.trend === '維持') {
    summaryText = `成績はほぼ横ばいで推移しています。基本の理解は安定していますが、さらなるスコアアップには、間違えた問題の解説の精読や苦手分野の重点的な補強が有効です。`;
  } else if (fit.trend === '下降') {
    summaryText = `直近の成績に下降傾向が見られます。学習範囲が難しくなっているか、あるいはケアレスミスが増加している可能性があります。一度基礎的な例題に戻り、途中式を丁寧に書く練習をしてください。`;
  } else if (fit.trend === '上限') {
    summaryText = `常に満点に近い、非常にハイレベルな成績を安定して維持しています。現在の分野の基礎は完全に定着しているため、より応用的な発展問題にチャレンジすることをお勧めします！`;
  } else if (fit.trend === '下限') {
    summaryText = `得点が低迷している状態です。前提知識に抜けがある可能性が高いため、焦らず教科書や基礎テキストの解説を丁寧に読み込み、例題の写経から始めましょう。`;
  }
  summaryEl.textContent = summaryText;
  
  // Calculate cumulative stats using raw filteredHistory
  const totalSeconds = filteredHistory.reduce((sum, item) => sum + (item.durationSeconds || 0), 0);
  totalTimeEl.textContent = formatTimeSeconds(totalSeconds);
  
  const totalQuestions = filteredHistory.reduce((sum, item) => sum + (item.attemptedCount || 0), 0);
  const avgSecondsPerQ = totalQuestions > 0 ? Math.round(totalSeconds / totalQuestions) : 0;
  avgTimeQEl.textContent = formatTimeSeconds(avgSecondsPerQ);
  
  const avgSecondsPerRun = Math.round(totalSeconds / filteredHistory.length);
  const sqDiffsRun = filteredHistory.map(item => Math.pow((item.durationSeconds || 0) - avgSecondsPerRun, 2));
  const varianceRun = sqDiffsRun.reduce((sum, v) => sum + v, 0) / filteredHistory.length;
  const stdDevRun = Math.sqrt(varianceRun);
  avgTimeRunEl.textContent = `${formatTimeSeconds(avgSecondsPerRun)} (σ=${formatTimeSeconds(Math.round(stdDevRun))})`;
  
  // Date span calculations
  const timestamps = filteredHistory.map(item => item.timestamp);
  const minTs = Math.min(...timestamps);
  const maxTs = Math.max(...timestamps);
  const oneDayMs = 24 * 60 * 60 * 1000;
  const startDay = new Date(minTs);
  startDay.setHours(0,0,0,0);
  const endDay = new Date(maxTs);
  endDay.setHours(0,0,0,0);
  const daysCount = Math.max(1, Math.round((endDay - startDay) / oneDayMs) + 1);
  
  // Daily sums for daily average
  const dailySums = new Array(daysCount).fill(0);
  filteredHistory.forEach(item => {
    const itemDay = new Date(item.timestamp);
    itemDay.setHours(0,0,0,0);
    const idx = Math.round((itemDay - startDay) / oneDayMs);
    if (idx >= 0 && idx < daysCount) {
      dailySums[idx] += (item.durationSeconds || 0);
    }
  });
  
  const avgDailySec = Math.round(totalSeconds / daysCount);
  const sqDiffsDaily = dailySums.map(v => Math.pow(v - avgDailySec, 2));
  const varianceDaily = sqDiffsDaily.reduce((sum, v) => sum + v, 0) / daysCount;
  const stdDevDaily = Math.sqrt(varianceDaily);
  avgTimeDayEl.textContent = `${formatTimeSeconds(avgDailySec)} (σ=${formatTimeSeconds(Math.round(stdDevDaily))})`;
  
  // Weekly sums (bin daily sums into weeks)
  const weeksCount = Math.max(1, Math.ceil(daysCount / 7));
  const weeklySums = new Array(weeksCount).fill(0);
  dailySums.forEach((val, idx) => {
    const wIdx = Math.floor(idx / 7);
    if (wIdx < weeksCount) {
      weeklySums[wIdx] += val;
    }
  });
  
  const avgWeeklySec = Math.round(totalSeconds / weeksCount);
  const sqDiffsWeekly = weeklySums.map(v => Math.pow(v - avgWeeklySec, 2));
  const varianceWeekly = sqDiffsWeekly.reduce((sum, v) => sum + v, 0) / weeksCount;
  const stdDevWeekly = Math.sqrt(varianceWeekly);
  avgTimeWeekEl.textContent = `${formatTimeSeconds(avgWeeklySec)} (σ=${formatTimeSeconds(Math.round(stdDevWeekly))})`;
  
  // Render SVG折れ線グラフ
  const svgWidth = 460;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 30;
  
  const chartW = svgWidth - paddingX * 2;
  const chartH = svgHeight - paddingY * 2;
  
  let svgContent = `<svg viewBox="0 0 ${svgWidth} ${svgHeight}" width="100%" height="100%">`;
  
  const yPercentages = [0, 25, 50, 75, 100];
  yPercentages.forEach(pct => {
    const yCoord = paddingY + chartH - (pct / 100) * chartH;
    svgContent += `<line x1="${paddingX}" y1="${yCoord}" x2="${svgWidth - paddingX}" y2="${yCoord}" stroke="rgba(255,255,255,0.06)" stroke-width="1" />`;
    svgContent += `<text x="${paddingX - 10}" y="${yCoord + 4}" fill="#64748b" font-size="9" text-anchor="end">${pct}%</text>`;
  });
  
  const coords = [];
  points.forEach((pt, idx) => {
    const xCoord = points.length === 1 ? paddingX + chartW / 2 : paddingX + (idx / (points.length - 1)) * chartW;
    const yCoord = paddingY + chartH - (pt.y / 100) * chartH;
    coords.push({ x: xCoord, y: yCoord, label: pt.label, value: pt.y });
  });
  
  if (fit.type !== '不明' && points.length >= 2) {
    const startX = coords[0].x;
    const endX = coords[coords.length - 1].x;
    
    let slope = 0;
    let intercept = 0;
    if (fit.type === '線形') {
      const match = fit.formula.match(/y = (-?[\d\.]+)x \+ (-?[\d\.]+)/);
      if (match) {
        slope = parseFloat(match[1]);
        intercept = parseFloat(match[2]);
      }
    }
    
    const getFitY = (xIndex) => {
      let val = 0;
      if (fit.type === '線形') val = slope * xIndex + intercept;
      else if (fit.type === '対数') {
        const match = fit.formula.match(/y = (-?[\d\.]+)ln\(x\) \+ (-?[\d\.]+)/);
        if (match) {
          val = parseFloat(match[1]) * Math.log(xIndex) + parseFloat(match[2]);
        }
      } else if (fit.type === '指数') {
        const match = fit.formula.match(/y = (-?[\d\.]+)e\^(-?[\d\.]+)x/);
        if (match) {
          val = parseFloat(match[1]) * Math.exp(parseFloat(match[2]) * xIndex);
        }
      }
      return Math.max(0, Math.min(100, val));
    };
    
    const startFitY = paddingY + chartH - (getFitY(1) / 100) * chartH;
    const endFitY = paddingY + chartH - (getFitY(points.length) / 100) * chartH;
    
    svgContent += `<line x1="${startX}" y1="${startFitY}" x2="${endX}" y2="${endFitY}" stroke="rgba(245, 158, 11, 0.4)" stroke-width="1.5" stroke-dasharray="4,4" />`;
  }
  
  if (coords.length > 1) {
    let pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      pathD += ` L ${coords[i].x} ${coords[i].y}`;
    }
    svgContent += `<path d="${pathD}" fill="none" stroke="#6366f1" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />`;
  }
  
  coords.forEach((coord, idx) => {
    svgContent += `<circle cx="${coord.x}" cy="${coord.y}" r="5" fill="#818cf8" stroke="#ffffff" stroke-width="1.5" />`;
    svgContent += `<text x="${coord.x}" y="${coord.y - 10}" fill="#ffffff" font-size="9" font-weight="bold" text-anchor="middle">${Math.round(coord.value)}%</text>`;
    svgContent += `<text x="${coord.x}" y="${paddingY + chartH + 18}" fill="#64748b" font-size="8" text-anchor="middle">${coord.label}</text>`;
  });
  
  svgContent += `</svg>`;
  chartWrapper.innerHTML = svgContent;
}

function performRegression(points) {
  const n = points.length;
  if (n < 2) return { type: "--", trend: "--", formula: "--", r2: 0 };
  
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;
  for (let i = 0; i < n; i++) {
    const x = points[i].x;
    const y = points[i].y;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
    sumYY += y * y;
  }
  
  const num = (n * sumXY) - (sumX * sumY);
  const den = (n * sumXX) - (sumX * sumX);
  
  let slope = 0;
  let intercept = sumY / n; // default to mean if den is 0
  if (den !== 0) {
    slope = num / den;
    intercept = (sumY - slope * sumX) / n;
  }
  
  let ssTot = 0;
  let ssRes = 0;
  const meanY = sumY / n;
  for (let i = 0; i < n; i++) {
    const x = points[i].x;
    const y = points[i].y;
    const predY = slope * x + intercept;
    ssTot += Math.pow(y - meanY, 2);
    ssRes += Math.pow(y - predY, 2);
  }
  let r2Linear = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
  if (r2Linear < 0) r2Linear = 0;
  
  let sumLogX = 0, sumLogXY = 0, sumLogXX = 0;
  for (let i = 0; i < n; i++) {
    const lx = Math.log(points[i].x);
    const y = points[i].y;
    sumLogX += lx;
    sumLogXY += lx * y;
    sumLogXX += lx * lx;
  }
  const denLog = (n * sumLogXX) - (sumLogX * sumLogX);
  let slopeLog = 0, interceptLog = sumY / n;
  if (denLog !== 0) {
    slopeLog = ((n * sumLogXY) - (sumLogX * sumY)) / denLog;
    interceptLog = (sumY - slopeLog * sumLogX) / n;
  }
  let ssResLog = 0;
  for (let i = 0; i < n; i++) {
    const lx = Math.log(points[i].x);
    const y = points[i].y;
    const predY = slopeLog * lx + interceptLog;
    ssResLog += Math.pow(y - predY, 2);
  }
  let r2Log = ssTot > 0 ? 1 - (ssResLog / ssTot) : 0;
  if (r2Log < 0) r2Log = 0;

  // Exponential fit
  let sumExpY = 0, sumExpXY = 0;
  for (let i = 0; i < n; i++) {
    const x = points[i].x;
    const ly = Math.log(Math.max(0.1, points[i].y));
    sumExpY += ly;
    sumExpXY += x * ly;
  }
  let slopeExp = 0, interceptExp = sumExpY / n;
  if (den !== 0) {
    slopeExp = ((n * sumExpXY) - (sumX * sumExpY)) / den;
    interceptExp = (sumExpY - slopeExp * sumX) / n;
  }
  let ssResExp = 0;
  for (let i = 0; i < n; i++) {
    const x = points[i].x;
    const y = points[i].y;
    const predY = Math.exp(slopeExp * x + interceptExp);
    ssResExp += Math.pow(y - predY, 2);
  }
  let r2Exp = ssTot > 0 ? 1 - (ssResExp / ssTot) : 0;
  if (r2Exp < 0) r2Exp = 0;
 
  let bestModel = "線形";
  let bestR2 = r2Linear;
  let formula = `y = ${slope.toFixed(2)}x + ${intercept.toFixed(2)}`;
  
  if (ssTot === 0) {
    bestModel = "線形";
    bestR2 = 1.0;
    formula = `y = 0.00x + ${intercept.toFixed(2)}`;
  } else {
    if (r2Log > bestR2 && r2Log > 0.4) {
      bestModel = "対数";
      bestR2 = r2Log;
      formula = `y = ${slopeLog.toFixed(2)}ln(x) + ${interceptLog.toFixed(2)}`;
    }
    if (r2Exp > bestR2 && r2Exp > 0.4) {
      bestModel = "指数";
      bestR2 = r2Exp;
      formula = `y = ${Math.exp(interceptExp).toFixed(2)}e^(${slopeExp.toFixed(2)}x)`;
    }
    
    if (bestR2 < 0.2) {
      bestModel = "不明";
      formula = "相関なし";
    }
  }

  const avgY = sumY / n;
  let trend = "維持";
  if (avgY >= 95) {
    trend = "上限";
  } else if (avgY <= 5) {
    trend = "下限";
  } else if (bestModel !== "不明") {
    let effectiveSlope = slope;
    if (bestModel === "対数") effectiveSlope = slopeLog;
    if (bestModel === "指数") effectiveSlope = slopeExp;
    
    if (effectiveSlope > 2) {
      trend = "上昇";
    } else if (effectiveSlope < -2) {
      trend = "下降";
    } else {
      trend = "維持";
    }
  } else {
    const diff = points[n-1].y - points[0].y;
    if (diff > 15) {
      trend = "上昇";
    } else if (diff < -15) {
      trend = "下降";
    } else {
      trend = "維持";
    }
  }
  
  return { type: bestModel, trend: trend, formula: formula, r2: bestR2 };
}

function formatTimeSeconds(totalSeconds) {
  if (isNaN(totalSeconds) || totalSeconds <= 0) return "00:00:00";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
}

// -------------------------------------------------------------
// Pomodoro Timer & Study Log Logic
// -------------------------------------------------------------
let pomoState = 'idle'; // 'idle', 'work', 'work_paused', 'break', 'break_paused', 'work_complete', 'break_complete'
let pomoTimerInterval = null;
let pomoSecondsLeft = 25 * 60;
let pomoAccumulatedSeconds = 0; // seconds spent in current running state
let pomoStateStartTime = 0;
let pomoZeroTimestamp = 0; // timestamp when timer reached zero
let pomoSelectedSubject = '数学';
let pomoMemo = '';
let globalAudioCtx = null;
let pomoTimerStartSecondsLeft = 25 * 60; // Keep track of seconds left when timer was started/resumed

function initAudioContext() {
  try {
    if (!globalAudioCtx) {
      globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume();
    }
    
    // Play a tiny, virtually silent sound to unlock AudioContext on iOS/iPadOS Safari
    const osc = globalAudioCtx.createOscillator();
    const gain = globalAudioCtx.createGain();
    osc.connect(gain);
    gain.connect(globalAudioCtx.destination);
    osc.frequency.setValueAtTime(440, globalAudioCtx.currentTime);
    gain.gain.setValueAtTime(0.00001, globalAudioCtx.currentTime);
    osc.start();
    osc.stop(globalAudioCtx.currentTime + 0.01);
  } catch (e) {
    console.error("Web Audio API is not supported or failed to initialize:", e);
  }
}

function initPomodoroUI() {
  // Clear any existing intervals
  if (pomoTimerInterval) {
    clearInterval(pomoTimerInterval);
    pomoTimerInterval = null;
  }
  pomoState = 'idle';
  pomoSecondsLeft = 25 * 60;
  pomoAccumulatedSeconds = 0;
  
  document.getElementById('pomo-display').textContent = "25:00";
  document.getElementById('pomo-memo-input').value = "";
  
  updatePomoUIState();
}

function updatePomoUIState() {
  const statusEl = document.getElementById('pomo-status');
  const displayEl = document.getElementById('pomo-display');
  
  // Reset classes
  statusEl.className = 'pomo-status-pill';
  
  // Status text & class
  if (pomoState === 'idle') {
    statusEl.textContent = '現在の状態: 未開始';
    statusEl.classList.add('pomo-status-idle');
  } else if (pomoState === 'work') {
    statusEl.textContent = '現在の状態: 作業中 📝';
    statusEl.classList.add('pomo-status-work');
  } else if (pomoState === 'work_paused') {
    statusEl.textContent = '現在の状態: 作業一時停止中 ⏸️';
    statusEl.classList.add('pomo-status-paused');
  } else if (pomoState === 'break') {
    statusEl.textContent = '現在の状態: 休憩中 ☕';
    statusEl.classList.add('pomo-status-break');
  } else if (pomoState === 'break_paused') {
    statusEl.textContent = '現在の状態: 休憩一時停止中 ⏸️';
    statusEl.classList.add('pomo-status-paused');
  } else if (pomoState === 'work_complete') {
    statusEl.textContent = '作業終了！☕ 休憩を開始してください';
    statusEl.classList.add('pomo-status-paused');
  } else if (pomoState === 'break_complete') {
    statusEl.textContent = '休憩終了！🚀 作業を開始してください';
    statusEl.classList.add('pomo-status-work');
  }

  // Toggle button visibilities
  const startBtn = document.getElementById('pomo-start-btn');
  const pauseBtn = document.getElementById('pomo-pause-btn');
  const resumeBtn = document.getElementById('pomo-resume-btn');
  const breakBtn = document.getElementById('pomo-break-btn');
  const stopBtn = document.getElementById('pomo-stop-btn');

  // Hide all by default
  [startBtn, pauseBtn, resumeBtn, breakBtn, stopBtn].forEach(btn => btn.style.display = 'none');

  if (pomoState === 'idle') {
    startBtn.style.display = 'inline-block';
    startBtn.textContent = '🚀 作業開始';
  } else if (pomoState === 'work') {
    pauseBtn.style.display = 'inline-block';
    breakBtn.style.display = 'inline-block';
    stopBtn.style.display = 'inline-block';
  } else if (pomoState === 'work_paused') {
    resumeBtn.style.display = 'inline-block';
    stopBtn.style.display = 'inline-block';
  } else if (pomoState === 'break') {
    pauseBtn.style.display = 'inline-block';
    startBtn.style.display = 'inline-block';
    startBtn.textContent = '🚀 作業開始';
    stopBtn.style.display = 'inline-block';
  } else if (pomoState === 'break_paused') {
    resumeBtn.style.display = 'inline-block';
    stopBtn.style.display = 'inline-block';
  } else if (pomoState === 'work_complete') {
    breakBtn.style.display = 'inline-block';
    stopBtn.style.display = 'inline-block';
  } else if (pomoState === 'break_complete') {
    startBtn.style.display = 'inline-block';
    startBtn.textContent = '🚀 作業開始';
    stopBtn.style.display = 'inline-block';
  }
}

function formatPomoTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function saveLocalPomoLog(payload) {
  try {
    const history = JSON.parse(localStorage.getItem('math_pomodoro_history') || '[]');
    history.push(payload);
    localStorage.setItem('math_pomodoro_history', JSON.stringify(history));
  } catch (err) {
    console.error("Failed to save local pomo log:", err);
  }
}

async function syncPomodoroLogsFromSheet() {
  const sheetsUrl = localStorage.getItem('math_google_sheets_url');
  if (!sheetsUrl) return;
  
  const studentName = localStorage.getItem('math_student_name') || '未設定';
  const payload = {
    action: 'get_pomodoro_logs',
    studentName: studentName
  };
  
  try {
    const response = await fetch(sheetsUrl, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!response.ok) return;
    const resJson = await response.json();
    if (resJson.status === 'success' && resJson.logs) {
      const localLogs = JSON.parse(localStorage.getItem('math_pomodoro_history') || '[]');
      
      const timestamps = new Set(localLogs.map(l => l.timestamp));
      let newCount = 0;
      resJson.logs.forEach(log => {
        if (!timestamps.has(log.timestamp)) {
          localLogs.push(log);
          newCount++;
        }
      });
      
      if (newCount > 0) {
        localLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        localStorage.setItem('math_pomodoro_history', JSON.stringify(localLogs));
        console.log(`Synced ${newCount} new Pomodoro logs from sheet.`);
      }
    }
  } catch (err) {
    console.error("Failed to sync Pomodoro logs from sheet:", err);
  }
}

async function logPomodoroEvent(event, elapsedSec, lagSec = 0) {
  const studentName = localStorage.getItem('math_student_name') || '未設定';
  const payload = {
    action: 'pomodoro_log',
    timestamp: new Date().toLocaleString('ja-JP'),
    studentName: studentName,
    subject: pomoSelectedSubject,
    event: event,
    elapsedSeconds: elapsedSec,
    lagSeconds: lagSec,
    memo: pomoMemo
  };

  saveLocalPomoLog(payload);

  const sheetsUrl = localStorage.getItem('math_google_sheets_url');
  if (!sheetsUrl) return;

  try {
    fetch(sheetsUrl, {
      method: 'POST',
      mode: 'no-cors',
      keepalive: true, // Keep connection alive if tab is closed immediately
      body: JSON.stringify(payload)
    });
    console.log("Logged pomodoro event:", event, "with elapsed:", elapsedSec, "lag:", lagSec);
  } catch (err) {
    console.error("Failed to log pomodoro event:", err);
  }
}

function startPomoTimerTick() {
  if (pomoTimerInterval) clearInterval(pomoTimerInterval);
  
  pomoStateStartTime = Date.now();
  pomoTimerStartSecondsLeft = pomoSecondsLeft;
  const initialAccumulated = pomoAccumulatedSeconds;
  
  pomoTimerInterval = setInterval(() => {
    const elapsedRealSeconds = Math.floor((Date.now() - pomoStateStartTime) / 1000);
    pomoSecondsLeft = pomoTimerStartSecondsLeft - elapsedRealSeconds;
    pomoAccumulatedSeconds = initialAccumulated + elapsedRealSeconds;
    
    if (pomoSecondsLeft > 0) {
      document.getElementById('pomo-display').textContent = formatPomoTime(pomoSecondsLeft);
    } else {
      // Timer finished!
      pomoSecondsLeft = 0;
      pomoAccumulatedSeconds = initialAccumulated + pomoTimerStartSecondsLeft;
      clearInterval(pomoTimerInterval);
      pomoTimerInterval = null;
      
      playPomoAlert();
      pomoZeroTimestamp = Date.now();
      
      if (pomoState === 'work') {
        logPomodoroEvent('一時停止', pomoAccumulatedSeconds, 0);
        pomoState = 'work_complete';
        pomoSecondsLeft = 5 * 60;
      } else if (pomoState === 'break') {
        logPomodoroEvent('一時停止', pomoAccumulatedSeconds, 0);
        pomoState = 'break_complete';
        pomoSecondsLeft = 25 * 60;
      }
      
      updatePomoUIState();
    }
  }, 1000);
}

// Automatically log accumulated time when browser tab is closed or navigated away
window.addEventListener('pagehide', saveAndLogOnClose);

function saveAndLogOnClose() {
  if ((pomoState === 'work' || pomoState === 'break') && pomoAccumulatedSeconds > 0) {
    const eventName = (pomoState === 'work') ? '自動一時停止（離脱）' : '自動休憩一時停止（離脱）';
    const sheetsUrl = localStorage.getItem('math_google_sheets_url');
    if (sheetsUrl) {
      const studentName = localStorage.getItem('math_student_name') || '未設定';
      const payload = {
        action: 'pomodoro_log',
        timestamp: new Date().toLocaleString('ja-JP'),
        studentName: studentName,
        subject: pomoSelectedSubject,
        event: eventName,
        elapsedSeconds: pomoAccumulatedSeconds,
        lagSeconds: 0,
        memo: pomoMemo + ' (ブラウザ終了/タブ切替による自動記録)'
      };
      
      fetch(sheetsUrl, {
        method: 'POST',
        mode: 'no-cors',
        keepalive: true,
        body: JSON.stringify(payload)
      });
      
      // Stop timer locally to prevent double logging or ticking in suspended background state
      if (pomoTimerInterval) {
        clearInterval(pomoTimerInterval);
        pomoTimerInterval = null;
      }
      pomoState = (pomoState === 'work') ? 'work_paused' : 'break_paused';
      pomoSecondsLeft = pomoTimerStartSecondsLeft - Math.floor((Date.now() - pomoStateStartTime) / 1000);
      if (pomoSecondsLeft < 0) pomoSecondsLeft = 0;
      pomoAccumulatedSeconds = 0;
      updatePomoUIState();
    }
  }
}

function playPomoAlert() {
  try {
    initAudioContext();
    if (!globalAudioCtx) return;
    
    const osc = globalAudioCtx.createOscillator();
    const gain = globalAudioCtx.createGain();
    osc.connect(gain);
    gain.connect(globalAudioCtx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, globalAudioCtx.currentTime);
    gain.gain.setValueAtTime(0.5, globalAudioCtx.currentTime);
    
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.01, globalAudioCtx.currentTime + 1.2);
    osc.stop(globalAudioCtx.currentTime + 1.2);
  } catch (err) {
    console.error("Audio beep failed:", err);
  }
}

const DEFAULT_POMO_SUBJECTS = ["数学", "英語", "国語", "理科", "社会", "その他"];

function renderPomoSubjects() {
  const select = document.getElementById('pomo-subject-select');
  if (!select) return;
  
  const currentVal = select.value;
  const customSubjects = JSON.parse(localStorage.getItem('math_custom_subjects') || '[]');
  
  select.innerHTML = '';
  
  DEFAULT_POMO_SUBJECTS.forEach(sub => {
    const opt = document.createElement('option');
    opt.value = sub;
    opt.textContent = sub;
    select.appendChild(opt);
  });
  
  customSubjects.forEach(sub => {
    const opt = document.createElement('option');
    opt.value = sub;
    opt.textContent = sub;
    select.appendChild(opt);
  });
  
  if (currentVal && [...DEFAULT_POMO_SUBJECTS, ...customSubjects].includes(currentVal)) {
    select.value = currentVal;
  } else {
    select.value = DEFAULT_POMO_SUBJECTS[0];
  }
  
  toggleSubjectDeleteLink();
}

function toggleSubjectDeleteLink() {
  const select = document.getElementById('pomo-subject-select');
  const deleteLink = document.getElementById('pomo-subject-delete-link');
  if (!select || !deleteLink) return;
  
  const val = select.value;
  const customSubjects = JSON.parse(localStorage.getItem('math_custom_subjects') || '[]');
  
  if (customSubjects.includes(val)) {
    deleteLink.style.display = 'inline';
  } else {
    deleteLink.style.display = 'none';
  }
}

// Bind Pomo Buttons
function setupPomodoroHandlers() {
  // Bind subject change and addition elements
  const selectEl = document.getElementById('pomo-subject-select');
  if (selectEl) {
    selectEl.addEventListener('change', () => {
      toggleSubjectDeleteLink();
    });
  }
  
  const addBtn = document.getElementById('pomo-add-subject-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const name = prompt('追加する新しい科目名を入力してください：');
      if (!name) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      
      const customSubjects = JSON.parse(localStorage.getItem('math_custom_subjects') || '[]');
      if (DEFAULT_POMO_SUBJECTS.includes(trimmed) || customSubjects.includes(trimmed)) {
        showToast('その科目は既に登録されています。', 'warning');
        return;
      }
      
      customSubjects.push(trimmed);
      localStorage.setItem('math_custom_subjects', JSON.stringify(customSubjects));
      
      renderPomoSubjects();
      document.getElementById('pomo-subject-select').value = trimmed;
      toggleSubjectDeleteLink();
      showToast(`新しく「${trimmed}」を追加しました。`, 'success');
    });
  }
  
  const deleteLink = document.getElementById('pomo-subject-delete-link');
  if (deleteLink) {
    deleteLink.addEventListener('click', () => {
      const select = document.getElementById('pomo-subject-select');
      const val = select.value;
      if (!confirm(`カスタム科目「${val}」を削除しますか？`)) return;
      
      let customSubjects = JSON.parse(localStorage.getItem('math_custom_subjects') || '[]');
      customSubjects = customSubjects.filter(sub => sub !== val);
      localStorage.setItem('math_custom_subjects', JSON.stringify(customSubjects));
      
      renderPomoSubjects();
      showToast('科目を削除しました。');
    });
  }

  document.getElementById('pomo-start-btn').addEventListener('click', () => {
    initAudioContext();
    pomoSelectedSubject = document.getElementById('pomo-subject-select').value;
    pomoMemo = document.getElementById('pomo-memo-input').value.trim();
    
    let lagSec = 0;
    if (pomoState === 'break_complete' && pomoZeroTimestamp > 0) {
      lagSec = Math.round((Date.now() - pomoZeroTimestamp) / 1000);
    }
    
    if (pomoState === 'break') {
      logPomodoroEvent('一時停止', pomoAccumulatedSeconds, 0);
    }
    
    pomoSecondsLeft = 25 * 60;
    pomoState = 'work';
    logPomodoroEvent('作業開始', 0, lagSec);
    pomoZeroTimestamp = 0;
    
    updatePomoUIState();
    startPomoTimerTick();
  });

  document.getElementById('pomo-pause-btn').addEventListener('click', () => {
    initAudioContext();
    if (pomoTimerInterval) {
      clearInterval(pomoTimerInterval);
      pomoTimerInterval = null;
    }
    
    logPomodoroEvent('一時停止', pomoAccumulatedSeconds, 0);
    
    pomoState = (pomoState === 'work') ? 'work_paused' : 'break_paused';
    updatePomoUIState();
  });

  document.getElementById('pomo-resume-btn').addEventListener('click', () => {
    initAudioContext();
    logPomodoroEvent('作業再開', 0, 0);
    pomoState = (pomoState === 'work_paused') ? 'work' : 'break';
    
    updatePomoUIState();
    startPomoTimerTick();
  });

  document.getElementById('pomo-break-btn').addEventListener('click', () => {
    initAudioContext();
    pomoSelectedSubject = document.getElementById('pomo-subject-select').value;
    pomoMemo = document.getElementById('pomo-memo-input').value.trim();
    
    let lagSec = 0;
    if (pomoState === 'work_complete' && pomoZeroTimestamp > 0) {
      lagSec = Math.round((Date.now() - pomoZeroTimestamp) / 1000);
    }
    
    if (pomoState === 'work') {
      logPomodoroEvent('一時停止', pomoAccumulatedSeconds, 0);
    }
    
    pomoSecondsLeft = 5 * 60;
    pomoState = 'break';
    logPomodoroEvent('休憩開始', 0, lagSec);
    pomoZeroTimestamp = 0;
    
    updatePomoUIState();
    startPomoTimerTick();
  });

  document.getElementById('pomo-stop-btn').addEventListener('click', () => {
    initAudioContext();
    if (pomoTimerInterval) {
      clearInterval(pomoTimerInterval);
      pomoTimerInterval = null;
    }
    
    let lagSec = 0;
    if ((pomoState === 'work_complete' || pomoState === 'break_complete') && pomoZeroTimestamp > 0) {
      lagSec = Math.round((Date.now() - pomoZeroTimestamp) / 1000);
    }
    
    logPomodoroEvent('終了', pomoAccumulatedSeconds, lagSec);
    
    pomoState = 'idle';
    pomoSecondsLeft = 25 * 60;
    pomoAccumulatedSeconds = 0;
    pomoZeroTimestamp = 0;
    
    document.getElementById('pomo-display').textContent = "25:00";
    updatePomoUIState();
  });
  
  // Bind Top nav-tabs to navigate and manage state
  document.getElementById('tab-exam-btn').addEventListener('click', () => {
    stopPomoOnLeave();
    switchView('setup');
  });
  document.getElementById('tab-pomodoro-btn').addEventListener('click', () => {
    switchView('pomodoro');
  });
  document.getElementById('tab-question-btn').addEventListener('click', () => {
    stopPomoOnLeave();
    switchView('question');
    initQuestionUI();
  });
}

function stopPomoOnLeave() {
  if (pomoState !== 'idle') {
    if (pomoTimerInterval) {
      clearInterval(pomoTimerInterval);
      pomoTimerInterval = null;
    }
    let lagSec = 0;
    if ((pomoState === 'work_complete' || pomoState === 'break_complete') && pomoZeroTimestamp > 0) {
      lagSec = Math.round((Date.now() - pomoZeroTimestamp) / 1000);
    }
    logPomodoroEvent('終了', pomoAccumulatedSeconds, lagSec);
    pomoState = 'idle';
    pomoSecondsLeft = 25 * 60;
    pomoAccumulatedSeconds = 0;
    pomoZeroTimestamp = 0;
    document.getElementById('pomo-display').textContent = "25:00";
    updatePomoUIState();
  }
}

// -------------------------------------------------------------
// Question Box Logic
// -------------------------------------------------------------
let questionImageBase64 = null;

function initQuestionUI() {
  document.getElementById('question-text-input').value = '';
  document.getElementById('question-image-input').value = '';
  document.getElementById('question-preview-wrap').style.display = 'none';
  document.getElementById('question-preview-img').src = '';
  document.getElementById('question-ai-response-card').style.display = 'none';
  document.getElementById('question-ai-response-text').innerHTML = '';
  questionImageBase64 = null;
  
  loadPastQuestions();
}

function setupQuestionHandlers() {
  const fileInput = document.getElementById('question-image-input');
  const dropzone = document.getElementById('question-upload-dropzone');
  
  dropzone.addEventListener('click', (e) => {
    if (e.target !== fileInput) {
      fileInput.click();
    }
  });
  
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        questionImageBase64 = event.target.result;
        document.getElementById('question-preview-img').src = questionImageBase64;
        document.getElementById('question-preview-wrap').style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  });

  document.getElementById('question-remove-image-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.value = '';
    questionImageBase64 = null;
    document.getElementById('question-preview-wrap').style.display = 'none';
    document.getElementById('question-preview-img').src = '';
  });

  document.getElementById('question-submit-btn').addEventListener('click', handleQuestionSubmission);
  document.getElementById('refresh-questions-btn').addEventListener('click', loadPastQuestions);
}

async function handleQuestionSubmission() {
  const text = document.getElementById('question-text-input').value.trim();
  const target = document.getElementById('question-target-select').value;
  
  if (!text && !questionImageBase64) {
    showToast('質問内容を入力するか、写真をアップロードしてください。', 'warning');
    return;
  }
  
  if (target === 'tutor') {
    const sheetsUrl = localStorage.getItem('math_google_sheets_url');
    if (!sheetsUrl) {
      showToast('連携用URLが設定されていません。システム設定をご確認ください。', 'warning');
      return;
    }
    
    showLoader('送信中...', '質問内容を指導者へメール送信し、スプレッドシートへ記録しています。');
    
    const studentName = localStorage.getItem('math_student_name') || '未設定';
    const payload = {
      action: 'question_to_tutor',
      timestamp: new Date().toLocaleString('ja-JP'),
      studentName: studentName,
      title: text.substring(0, 30) || '無題の質問',
      text: text,
      imageBase64: questionImageBase64
    };
    
    try {
      await fetch(sheetsUrl, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(payload)
      });
      showToast('指導者へ質問を送信しました！', 'success');
      initQuestionUI();
    } catch (err) {
      console.error(err);
      showToast('送信に失敗しました。接続を確認してください。', 'danger');
    } finally {
      hideLoader();
    }
  } else {
    const apiKey = localStorage.getItem('gemini_api_key') || DEFAULT_API_KEY;
    showLoader('AIが解答を作成中...', '問題内容を分析して分かりやすいヒントを作成しています。');
    
    const promptText = `あなたはプロの家庭教師です。以下の質問および画像について、生徒が一人で理解できるように、段階的（ステップバイステップ）で分かりやすいヒントと丁寧な解説を日本語で記述してください。解説文の中に数式（LaTeX形式）を適宜用いることができます。数式を使用する場合は $$ ... $$ または $ ... $ で囲んでください。
    
質問内容:
${text || '(質問テキストなし、画像を参照してください)'}`;

    const parts = [{ text: promptText }];
    if (questionImageBase64) {
      const rawBase64 = questionImageBase64.split(',')[1];
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: rawBase64
        }
      });
    }
    
    const payload = {
      contents: [{ parts }],
      generationConfig: {
        maxOutputTokens: 2048
      }
    };
    
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error('Gemini API request failed');
      }
      
      const resultJson = await response.json();
      const aiResponse = resultJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      const responseTextEl = document.getElementById('question-ai-response-text');
      responseTextEl.textContent = aiResponse;
      
      if (window.renderMathInElement) {
        window.renderMathInElement(responseTextEl, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false }
          ]
        });
      }
      
      document.getElementById('question-ai-response-card').style.display = 'block';
      showToast('AIからヒントが届きました！', 'success');
      
    } catch (err) {
      console.error(err);
      showToast('AIの回答生成に失敗しました。', 'danger');
    } finally {
      hideLoader();
    }
  }
}

async function loadPastQuestions() {
  const container = document.getElementById('questions-list-container');
  const sheetsUrl = localStorage.getItem('math_google_sheets_url');
  
  if (!sheetsUrl) {
    container.innerHTML = `<p style="font-size: 0.8rem; color: var(--text-muted); text-align: center; margin: 1rem 0;">連携用URLが設定されていません。システム設定をご確認ください。</p>`;
    return;
  }
  
  container.innerHTML = `<p style="font-size: 0.8rem; color: var(--text-muted); text-align: center; margin: 1rem 0;">読み込み中...</p>`;
  
  const studentName = localStorage.getItem('math_student_name') || '未設定';
  const payload = {
    action: 'get_questions',
    studentName: studentName
  };
  
  try {
    const response = await fetch(sheetsUrl, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    const resJson = await response.json();
    if (resJson.status === 'success') {
      const list = resJson.questions || [];
      if (list.length === 0) {
        container.innerHTML = `<p style="font-size: 0.8rem; color: var(--text-muted); text-align: center; margin: 1rem 0;">過去の質問はありません。</p>`;
        return;
      }
      
      let html = '';
      list.forEach((q) => {
        const isAnswered = q.status === '回答済';
        const badgeColor = isAnswered ? '#10b981' : '#f59e0b';
        const badgeText = isAnswered ? '回答あり' : '回答待ち';
        
        html += `
          <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-glass); border-radius: 8px; padding: 0.8rem; display: flex; flex-direction: column; gap: 0.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
              <span style="font-weight: 600; font-size: 0.85rem; color: white;">Q: ${escapeHtml(q.title)}</span>
              <span style="font-size: 0.7rem; padding: 0.15rem 0.4rem; border-radius: 12px; background: rgba(${isAnswered ? '16,185,129' : '245,158,11'}, 0.15); color: ${badgeColor}; font-weight: bold; flex-shrink: 0;">${badgeText}</span>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-secondary); white-space: pre-wrap; margin: 0;">${escapeHtml(q.text)}</p>
            ${q.imageUrl && q.imageUrl !== 'Attached in Email' && q.imageUrl !== 'メールに直接添付' && q.imageUrl !== 'Attached in email' ? `
              <div style="margin-top: 0.3rem;">
                <a href="${q.imageUrl}" target="_blank" style="font-size: 0.75rem; color: var(--accent-primary); text-decoration: underline;">📸 添付された問題画像</a>
              </div>
            ` : ''}
            <div style="font-size: 0.7rem; color: var(--text-muted); text-align: right;">送信日時: ${q.timestamp}</div>
            
            ${isAnswered ? `
              <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed rgba(255,255,255,0.08); background: rgba(16,185,129,0.02); border-radius: 4px; padding: 0.5rem;">
                <div style="font-weight: bold; font-size: 0.8rem; color: #34d399; margin-bottom: 0.2rem; display: flex; align-items: center; gap: 0.3rem;">
                  <span>👤 指導者からの回答</span>
                </div>
                <div class="q-answer-content" style="font-size: 0.8rem; color: var(--text-primary); white-space: pre-wrap; line-height: 1.5;">${escapeHtml(q.answerText)}</div>
                <div style="font-size: 0.7rem; color: var(--text-muted); text-align: right; margin-top: 0.3rem;">回答日時: ${q.answerTimestamp}</div>
              </div>
            ` : ''}
          </div>
        `;
      });
      
      container.innerHTML = html;
      
      if (window.renderMathInElement) {
        const answerElements = container.querySelectorAll('.q-answer-content');
        answerElements.forEach(el => {
          window.renderMathInElement(el, {
            delimiters: [
              { left: "$$", right: "$$", display: true },
              { left: "$", right: "$", display: false }
            ]
          });
        });
      }
      
    } else {
      container.innerHTML = `<p style="font-size: 0.8rem; color: var(--text-muted); text-align: center; margin: 1rem 0;">質問リストの取得に失敗しました。</p>`;
    }
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p style="font-size: 0.8rem; color: var(--text-muted); text-align: center; margin: 1rem 0;">取得エラーが発生しました。接続を確認してください。</p>`;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
