import { Question } from "./types";
import { gcd, formatCoef, formatPoly, randomChoice, randomRange } from "./utils";

export function generateDynamicQuestion(templateId: string, index: number): Question {
  let q: Question = {
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
  }
  return q;
}
