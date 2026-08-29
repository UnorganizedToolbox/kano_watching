#!/usr/bin/env python3
# generate_parametric_pool.py - パラメータを変えた数学問題を数学的に正しく自動生成するスクリプト

import json
import random
import math

QUESTIONS_FILE = "questions.json"

def format_coef(val, is_first=False):
  """数式の係数を綺麗にフォーマットする (例: 1x -> x, -1x -> -x, + 0 -> 消去)"""
  if val == 0:
    return ""
  if val == 1:
    return "+" if not is_first else ""
  if val == -1:
    return "-"
  if val > 0:
    return f"+{val}" if not is_first else f"{val}"
  return f"{val}"

def format_poly(a, b, c):
  """ax^2 + bx + c を綺麗にする"""
  part_a = ""
  if a != 0:
    coef_a = format_coef(a, True)
    if coef_a == "+": coef_a = ""
    part_a = f"{coef_a}x^2"
    
  part_b = ""
  if b != 0:
    coef_b = format_coef(b, a == 0)
    if coef_b == "+": coef_b = "+"
    elif coef_b == "-": coef_b = "-"
    else:
      coef_b = f"+{b}" if b > 0 and a != 0 else f"{b}"
    
    if b == 1:
      part_b = "+x" if a != 0 else "x"
    elif b == -1:
      part_b = "-x"
    else:
      part_b = f"{coef_b}x"
      
  part_c = ""
  if c != 0:
    part_c = f"+{c}" if c > 0 and (a != 0 or b != 0) else f"{c}"
    
  return f"{part_a}{part_b}{part_c}"

def gcd(a, b):
  return math.gcd(a, b)

# -------------------------------------------------------------
# High School Math Generators (高校数学)
# -------------------------------------------------------------

def gen_m1_ch1_calculations(count=15):
  """数I: たすき掛け因数分解 ax^2 + (ad+bc)x + bd"""
  questions = []
  used_exprs = set()
  
  while len(questions) < count:
    a = random.choice([1, 2, 3, 4])
    c = random.choice([1, 2, 3])
    b = random.choice([-4, -3, -2, -1, 1, 2, 3, 4])
    d = random.choice([-4, -3, -2, -1, 1, 2, 3, 4])
    
    if gcd(abs(a), abs(b)) != 1 or gcd(abs(c), abs(d)) != 1:
      continue
      
    A = a * c
    B = a * d + b * c
    C = b * d
    
    if B == 0 or C == 0:
      continue
      
    expr = format_poly(A, B, C)
    if expr in used_exprs:
      continue
    used_exprs.add(expr)
    
    part1 = f"{a}x{'+' if b > 0 else ''}{b}" if a != 1 else f"x{'+' if b > 0 else ''}{b}"
    part2 = f"{c}x{'+' if d > 0 else ''}{d}" if c != 1 else f"x{'+' if d > 0 else ''}{d}"
    
    part1 = part1.replace("1x", "x")
    part2 = part2.replace("1x", "x")
    
    ans = f"$({part1})({part2})$"
    
    questions.append({
      "id": f"m1_ch1_q1_p{len(questions)+1}",
      "difficulty": "easy" if A == 1 else "medium",
      "text": f"次の多項式を因数分解しなさい：\n$${expr}$$",
      "answer": ans,
      "reference": "第1章 第1節 - 因数分解（たすき掛けの利用）",
      "hint": "たすき掛けの公式 $acx^2 + (ad+bc)x + bd = (ax+b)(cx+d)$ を使用しましょう。積が2次の係数、および定数項になる組み合わせを探します。"
    })
  return questions

def gen_m1_ch1_real_numbers(count=15):
  """数I: 分母の有理化 c / (sqrt(a) - sqrt(b))"""
  questions = []
  while len(questions) < count:
    a = random.choice([2, 3, 5, 6, 7])
    b = random.choice([2, 3, 5, 6, 7])
    if a == b: continue
    
    diff = a - b
    c = random.choice([1, 2, 3, 4]) * abs(diff)
    
    q_text = f"次の式の分母を有理化しなさい：\n$$\\\\frac{{{c}}}{{\\\\sqrt{{{a}}} {'-' if diff > 0 else '+'} \\\\sqrt{{{b}}}}}$$"
    
    factor = c // diff
    sign = "+" if diff > 0 else "-"
    if factor == 1:
      ans = f"$\\\\sqrt{{{a}}} {sign} \\\\sqrt{{{b}}}$"
    elif factor == -1:
      ans = f"$-(\\\\sqrt{{{a}}} {sign} \\\\sqrt{{{b}}})$"
    else:
      ans = f"${abs(factor)}(\\\\sqrt{{{a}}} {sign} \\\\sqrt{{{b}}})$" if factor > 0 else f"$-{abs(factor)}(\\\\sqrt{{{a}}} {sign} \\\\sqrt{{{b}}})$"
      
    questions.append({
      "id": f"m1_ch1_q2_p{len(questions)+1}",
      "difficulty": "easy",
      "text": q_text,
      "answer": ans,
      "reference": "第1章 第2節 - 分母の有理化",
      "hint": "公式 $(x-y)(x+y) = x^2 - y^2$ を利用して分母の根号を消去します。分母と分子に、分母の符号を変えた式を掛けます。"
    })
  return questions

def gen_m1_ch1_inequalities(count=15):
  """数I: 1次不等式 ax - b > cx + d"""
  questions = []
  while len(questions) < count:
    a = random.choice([-5, -4, -3, -2, 2, 3, 4, 5])
    c = random.choice([-5, -4, -3, -2, 2, 3, 4, 5])
    if a == c: continue
    
    diff_x = a - c
    ans_val = random.choice([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5])
    
    b = random.choice([-10, -5, 0, 5, 10])
    d = diff_x * ans_val + b
    
    sign_b = f"- {abs(b)}" if b < 0 else f"+ {b}"
    if b == 0: sign_b = ""
    sign_d = f"- {abs(d)}" if d < 0 else f"+ {d}"
    if d == 0: sign_d = ""
    
    text = f"次の1次不等式を解きなさい：\n$${a}x {sign_b} > {c}x {sign_d}$$"
    
    if diff_x > 0:
      ans = f"$x > {ans_val}$"
    else:
      ans = f"$x < {ans_val}$"
      
    questions.append({
      "id": f"m1_ch1_q3_p{len(questions)+1}",
      "difficulty": "easy",
      "text": text,
      "answer": ans,
      "reference": "第1章 第3節 - 1次不等式の解法",
      "hint": "$x$を含む項を左辺に、定数を右辺に移項して整理します。両辺を負の数で割る（または掛ける）ときは、不等号の向きが逆転することに注意してください。"
    })
  return questions

def gen_m1_ch2_propositions(count=20):
  """数I: 集合と命題 必要十分条件の判定"""
  questions = []
  patterns = [
    ("suff", "$x = {a}$", "$x^2 = {a2}$", "十分条件であるが、必要条件ではない", "x={a} ならば $x^2={a2}$ は常に真ですが、逆に $x^2={a2}$ ならば $x=\\\\pm{a}$ となり $x=-{a}$ の反例があるため偽です。"),
    ("nec", "$x^2 = {a2}$", "$x = {a}$", "必要条件であるが、十分条件ではない", "$x^2={a2}$ ならば $x=\\\\pm{a}$ なので十分条件は偽ですが、逆に $x={a}$ ならば常に $x^2={a2}$ は成立するため必要条件は真です。"),
    ("nec_suff", "$|x| = {a}$", "$x^2 = {a2}$", "必要十分条件", "$|x|={a}$ も $x^2={a2}$ も、どちらも解は $x = \\\\pm {a}$ となり、条件として完全に一致（同値）します。"),
    ("nec_suff2", "$-{a} < x < {a}$", "$|x| < {a}$", "必要十分条件", "実数の絶対値の性質から、$-{a} < x < {a}$ であることと $|x| < {a}$ であることは同値です。"),
    ("suff2", "$x > {a}$", "$x > {a_minus_b}$", "十分条件であるが、必要条件ではない", "$x > {a}$ であれば必ず $x > {a_minus_b}$ は満たされますが、逆に $x > {a_minus_b}$ であっても $x$ が {a} 以下になる場合があるため偽です。"),
    ("nec2", "$x > {a_minus_b}$", "$x > {a}$", "必要条件であるが、十分条件ではない", "$x > {a_minus_b}$ から $x > {a}$ は導けませんが（反例あり）、$x > {a}$ ならば確実に $x > {a_minus_b}$ を満たすため必要条件です。")
  ]
  
  while len(questions) < count:
    p = random.choice(patterns)
    a = random.choice([2, 3, 4, 5])
    b = random.choice([1, 2, 3])
    a2 = a * a
    a_minus_b = a - b
    
    p_text = p[1].format(a=a, a2=a2, a_minus_b=a_minus_b)
    q_text = p[2].format(a=a, a2=a2, a_minus_b=a_minus_b)
    
    text = f"実数 $x$ に関する条件 $p, q$ を次のように定める。\n" \
           f"$$p : {p_text}$$\n" \
           f"$$q : {q_text}$$\n" \
           f"このとき、条件 $p$ は条件 $q$ であるための何条件であるか判定しなさい。"
           
    questions.append({
      "id": f"m1_ch2_q1_p{len(questions)+1}",
      "difficulty": "easy" if p[0] == "nec_suff" else "medium",
      "text": text,
      "answer": f"${p[3]}$",
      "reference": "第2章 第1節 - 必要条件と十分条件",
      "hint": f"p ⇒ q の真偽（十分性）と、q ⇒ p の真偽（必要性）をそれぞれ調べます。{p[4].format(a=a, a2=a2, a_minus_b=a_minus_b)}"
    })
  return questions

def gen_m1_ch3_graphs(count=15):
  """数I: 2次関数の頂点 y = a(x - h)^2 + k"""
  questions = []
  while len(questions) < count:
    a = random.choice([-2, -1, 1, 2])
    h = random.choice([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5])
    k = random.choice([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6])
    
    A = a
    B = -2 * a * h
    C = a * (h**2) + k
    
    expr = format_poly(A, B, C)
    
    questions.append({
      "id": f"m1_ch3_q1_p{len(questions)+1}",
      "difficulty": "easy" if a == 1 else "medium",
      "text": f"次の2次関数のグラフの頂点の座標を求めなさい：\n$$y = {expr}$$",
      "answer": f"$({h}, {k})$",
      "reference": "第3章 第1節 - 平方完成とグラフの頂点",
      "hint": "与えられた式を平方完成して $y = a(x-h)^2 + k$ の標準形に変形します。頂点の座標は $(h, k)$ です。"
    })
  return questions

def gen_m1_ch3_inequalities(count=15):
  """数I: 2次不等式 (x-a)(x-b) <= 0 or >= 0"""
  questions = []
  while len(questions) < count:
    alpha = random.choice([-4, -3, -2, -1, 0, 1, 2, 3])
    beta = alpha + random.choice([2, 3, 4, 5])
    
    B = -(alpha + beta)
    C = alpha * beta
    
    expr = format_poly(1, B, C)
    
    is_less = random.choice([True, False])
    if is_less:
      text = f"次の2次不等式を解きなさい：\n$${expr} \\\\mathrm{{\\\\leqq}} 0$$"
      ans = f"${alpha} \\\\mathrm{{\\\\leqq}} x \\\\mathrm{{\\\\leqq}} {beta}$"
    else:
      text = f"次の2次不等式を解きなさい：\n$${expr} > 0$$"
      ans = f"$x < {alpha}, {beta} < x$"
      
    questions.append({
      "id": f"m1_ch3_q2_p{len(questions)+1}",
      "difficulty": "easy",
      "text": text,
      "answer": ans,
      "reference": "第3章 第2節 - 2次不等式の解法",
      "hint": "まず $x^2 + bx + c = 0$ の方程式を解いて境界点を求めます（因数分解 $(x-\\alpha)(x-\\beta) = 0$ の利用）。不等号の向きと放物線の上下関係から範囲を決定します。"
    })
  return questions

def gen_m1_ch5_data(count=20):
  """数I: データの分析 平均値と分散"""
  questions = []
  dev_patterns = [
    [-3, -1, 1, 3], # sum_sq = 20, var = 5
    [-4, -2, 2, 4], # sum_sq = 40, var = 10
    [-2, -1, 1, 2], # sum_sq = 10, var = 2.5
    [-1, -1, 1, 1], # sum_sq = 4, var = 1
    [-3, -2, 2, 3], # sum_sq = 26, var = 6.5
    [-5, -1, 1, 5]  # sum_sq = 52, var = 13
  ]
  
  while len(questions) < count:
    mean = random.choice([6, 7, 8, 9, 10, 11, 12, 13])
    devs = random.choice(dev_patterns)
    
    data = [mean + d for d in devs]
    random.shuffle(data)
    
    sum_sq = sum(d**2 for d in devs)
    variance = sum_sq / 4
    if variance == int(variance):
      variance = int(variance)
      
    data_str = ", ".join(map(str, data))
    text = f"次のデータは、あるクラスの生徒4人の小テストの得点（点）です。このデータの平均値と分散をそれぞれ求めなさい。\n" \
           f"$$ {data_str} $$"
           
    ans = f"平均値: ${mean}$ 点, 分散: ${variance}$"
    
    questions.append({
      "id": f"m1_ch5_q1_p{len(questions)+1}",
      "difficulty": "medium",
      "text": text,
      "answer": ans,
      "reference": "第5章 第1節 - データの平均値と分散",
      "hint": "平均値はデータの総和を個数（4）で割ったものです。分散は、各データ値から平均値を引いた値（偏差）の2乗の平均値として計算します。"
    })
  return questions

def gen_ma_ch3_euclidean(count=15):
  """数A: ユークリッドの互除法"""
  questions = []
  while len(questions) < count:
    g = random.choice([6, 7, 8, 9, 12, 13, 14, 15, 17, 18])
    a_factor = random.choice([7, 9, 11, 13, 17])
    b_factor = random.choice([5, 8, 12, 15])
    if math.gcd(a_factor, b_factor) != 1: continue
    
    val1 = g * a_factor
    val2 = g * b_factor
    
    A = max(val1, val2)
    B = min(val1, val2)
    
    if A == B: continue
    
    questions.append({
      "id": f"ma_ch3_q1_p{len(questions)+1}",
      "difficulty": "medium",
      "text": f"ユークリッドの互除法を用いて、次の2つの整数の最大公約数を求めなさい：\n$${A} \\\\text{{ と }} {B}$$",
      "answer": f"${g}$",
      "reference": "第3章 第2節 - ユークリッドの互除法",
      "hint": "大きい方の数を小さい方の数で割り、「割る数 ＝ 割り算の余り × 商 ＋ 新しい余り」の変形を余りが 0 になるまで繰り返します。最後に割った数が最大公約数です。"
    })
  return questions

def gen_m2_ch1_complex(count=15):
  """数II: 複素数の範囲の2次方程式解法 x^2 + bx + c = 0 (b^2 - 4c < 0)"""
  questions = []
  while len(questions) < count:
    h = random.choice([-4, -3, -2, -1, 1, 2, 3, 4])
    k = random.choice([1, 2, 3, 4, 5])
    
    B = -2 * h
    C = h**2 + k
    
    expr = format_poly(1, B, C)
    
    sqrt_k_str = f"\\\\sqrt{{{k}}}"
    root_val = math.isqrt(k)
    if root_val * root_val == k:
      sqrt_k_str = str(root_val)
      
    if sqrt_k_str == "1":
      ans = f"$x = {h} \\\\pm i$"
    else:
      ans = f"$x = {h} \\\\pm {sqrt_k_str}i$"
      
    questions.append({
      "id": f"m2_ch1_q2_p{len(questions)+1}",
      "difficulty": "medium",
      "text": f"次の2次方程式を複素数の範囲で解きなさい：\n$${expr} = 0$$",
      "answer": ans,
      "reference": "第1章 第3節 - 2次方程式の解の公式と複素数",
      "hint": "解の公式 $x = \\\\frac{-b \\\\pm \\\\sqrt{b^2 - 4ac}}{2a}$ を適用します。ルートの中が負の数になるので虛数単位 $i = \\\\sqrt{-1}$ を用いて表現します。"
    })
  return questions

def gen_m2_ch2_lines(count=15):
  """数II: 直線の垂直条件"""
  questions = []
  while len(questions) < count:
    m_denom = random.choice([2, 3, 4, 5])
    m_sign = random.choice([1, -1])
    m = m_sign * m_denom
    
    px = random.choice([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5])
    py = random.choice([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5])
    
    perp_num = -1 if m_sign > 0 else 1
    const_num = -perp_num * px + py * m_denom
    
    sign_c = "+" if const_num > 0 else "-"
    const_fraction = f"\\\\frac{{{abs(const_num)}}}{{{m_denom}}}"
    if const_num % m_denom == 0:
      const_val = const_num // m_denom
      const_fraction = str(abs(const_val))
      if const_val == 0: sign_c = ""; const_fraction = ""
      
    ans = f"$y = {'-' if perp_num < 0 else ''}\\\\frac{{1}}{{{m_denom}}}x {sign_c} {const_fraction}$".replace(" - ", " -").replace(" + ", " +")
    ans = ans.replace(" -0", "").replace(" +0", "")
    
    c_val = random.choice([-5, -2, 2, 5])
    q_text = f"直線 $y = {m}x {'+' if c_val > 0 else ''}{c_val}$ に垂直で、点 $({px}, {py})$ を通る直線の方程式を求めなさい。"
    
    questions.append({
      "id": f"m2_ch2_q1_p{len(questions)+1}",
      "difficulty": "medium",
      "text": q_text,
      "answer": ans,
      "reference": "第2章 第1節 - 2直線の垂直条件と直線の方程式",
      "hint": "2つの直線が垂直に交わるとき、その傾きの積は $-1$ になります。垂直な直線の傾きを $m'$ とすると、$m \\\\times m' = -1$ です。傾きと通過する1点から直線の方程式 $y - y_1 = m'(x - x_1)$ を求めます。"
    })
  return questions

def gen_m2_ch5_tangent(count=15):
  """数II: 2次関数の接線方程式"""
  questions = []
  while len(questions) < count:
    a = random.choice([-2, -1, 1, 2])
    b = random.choice([-4, -2, 0, 2, 4])
    c = random.choice([-3, -1, 1, 3])
    
    x0 = random.choice([-2, -1, 0, 1, 2])
    y0 = a * (x0**2) + b * x0 + c
    
    m = 2 * a * x0 + b
    intercept = -m * x0 + y0
    
    expr_y = format_poly(a, b, c)
    if intercept == 0:
      ans_intercept = ""
      sign_intercept = ""
    else:
      ans_intercept = str(abs(intercept))
      sign_intercept = "+" if intercept > 0 else "-"
      
    if m == 0:
      ans = f"$y = {y0}$"
    else:
      if ans_intercept == "":
        ans = f"$y = {m}x$"
      else:
        ans = f"$y = {m}x{sign_intercept}{ans_intercept}$"
        
    ans = ans.replace(" 1x", " x").replace(" -1x", " -x").replace("1x", "x").replace("-1x", "-x")
    
    q_text = f"関数 $y = {expr_y}$ のグラフ上の、点 $({x0}, {y0})$ における接線の方程式を求めなさい。"
    
    questions.append({
      "id": f"m2_ch5_q1_p{len(questions)+1}",
      "difficulty": "medium",
      "text": q_text,
      "answer": ans,
      "reference": "第5章 第1節 - 微分係数と接線の方程式",
      "hint": "接線の傾きは、関数を微分して得られる接点での微分係数 $f'(x_0)$ に一致します。傾き $m$ と接点 $(x_0, y_0)$ から、直線の方程式 $y - y_0 = m(x - x_0)$ を計算します。"
    })
  return questions

def gen_mc_ch1_vectors(count=15):
  """数C: ベクトルの内積"""
  questions = []
  while len(questions) < count:
    x1 = random.choice([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5])
    y1 = random.choice([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5])
    x2 = random.choice([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5])
    y2 = random.choice([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5])
    
    dot_product = x1 * x2 + y1 * y2
    
    q_text = f"2つの平面ベクトル $\\\\vec{{a}} = ({x1}, {y1})$、$\\\\vec{{b}} = ({x2}, {y2})$ の内積 $\\\\vec{{a}} \\\\cdot \\\\vec{{b}}$ を求めなさい。"
    
    questions.append({
      "id": f"mc_ch1_q1_p{len(questions)+1}",
      "difficulty": "easy",
      "text": q_text,
      "answer": f"${dot_product}$",
      "reference": "第1章 第1節 - ベクトルの成分と内積",
      "hint": "成分で表された平面ベクトルの内積の定義公式 $\\\\vec{a} \\\\cdot \\\\vec{b} = a_1 b_1 + a_2 b_2$ を用いて計算します。$x$成分同士の積と$y$成分同士の積を足し合わせます。"
    })
  return questions

# -------------------------------------------------------------
# Junior High School Math Generators (中学数学 - ベータ版)
# -------------------------------------------------------------

def gen_j1_equations(count=20):
  """中1: 1次方程式 ax + b = c"""
  questions = []
  while len(questions) < count:
    x_ans = random.choice([-8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8])
    a = random.choice([-6, -5, -4, -3, -2, 2, 3, 4, 5, 6])
    b = random.choice([-15, -12, -10, -8, -5, -3, 3, 5, 8, 10, 12, 15])
    
    c = a * x_ans + b
    
    sign_b = f"+ {b}" if b > 0 else f"- {abs(b)}"
    
    text = f"次の1次方程式を解きなさい：\n$${a}x {sign_b} = {c}$$"
    
    questions.append({
      "id": f"j1_math_eq_p{len(questions)+1}",
      "difficulty": "easy",
      "text": text,
      "answer": f"$x = {x_ans}$",
      "reference": "中学1年 - 1次方程式の解法",
      "hint": "定数項を右辺に移項し、両辺を $x$ の係数で割ります。移項するときは符号が逆になることに注意しましょう。"
    })
  return questions

def gen_j2_simultaneous(count=20):
  """中2: 連立方程式 ax + by = c, dx + ey = f"""
  questions = []
  while len(questions) < count:
    x_ans = random.choice([-4, -3, -2, -1, 1, 2, 3, 4])
    y_ans = random.choice([-4, -3, -2, -1, 1, 2, 3, 4])
    if x_ans == y_ans: continue
    
    a = random.choice([-4, -3, -2, -1, 1, 2, 3, 4])
    b = random.choice([-4, -3, -2, -1, 1, 2, 3, 4])
    d = random.choice([-4, -3, -2, -1, 1, 2, 3, 4])
    e = random.choice([-4, -3, -2, -1, 1, 2, 3, 4])
    
    if a * e - b * d == 0: continue
    
    c = a * x_ans + b * y_ans
    f = d * x_ans + e * y_ans
    
    sign_b = f"+ {b}" if b > 0 else f"- {abs(b)}"
    sign_e = f"+ {e}" if e > 0 else f"- {abs(e)}"
    
    text = f"次の連立方程式を解きなさい：\n" \
           f"$$\\\\begin{{cases}} {a}x {sign_b}y = {c} \\\\\\\\ {d}x {sign_e}y = {f} \\\\end{{cases}}$$"
           
    questions.append({
      "id": f"j2_math_sim_p{len(questions)+1}",
      "difficulty": "medium",
      "text": text,
      "answer": f"$x = {x_ans}, y = {y_ans}$",
      "reference": "中学2年 - 連立方程式の解法",
      "hint": "加減法または代入法を用いて、1つの文字を消去します。係数の絶対値をそろえて、両辺を足すか引くかしましょう。"
    })
  return questions

def gen_j3_factoring(count=20):
  """中3: 多項式の因数分解 x^2 + (a+b)x + ab"""
  questions = []
  while len(questions) < count:
    a = random.choice([-8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8])
    b = random.choice([-8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8])
    
    B = a + b
    C = a * b
    if B == 0 or C == 0: continue
    
    expr = format_poly(1, B, C)
    
    sign_a = f"+ {a}" if a > 0 else f"- {abs(a)}"
    sign_b = f"+ {b}" if b > 0 else f"- {abs(b)}"
    
    sign_a = sign_a.replace(" ", "")
    sign_b = sign_b.replace(" ", "")
    
    ans = f"$(x {sign_a})(x {sign_b})$"
    
    questions.append({
      "id": f"j3_math_fac_p{len(questions)+1}",
      "difficulty": "easy",
      "text": f"次の式を因数分解しなさい：\n$${expr}$$",
      "answer": ans,
      "reference": "中学3年 - 多項式の因数分解",
      "hint": "「和が $x$ の係数、積が定数項」になるような2つの整数の組み合わせを探します。$(x+a)(x+b) = x^2 + (a+b)x + ab$ の公式を使います。"
    })
  return questions

def gen_j3_quadratic(count=20):
  """中3: 2次方程式 x^2 + Bx + C = 0"""
  questions = []
  while len(questions) < count:
    alpha = random.choice([-8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8])
    beta = random.choice([-8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8])
    
    B = -(alpha + beta)
    C = alpha * beta
    if B == 0 or C == 0: continue
    
    expr = format_poly(1, B, C)
    
    if alpha == beta:
      ans = f"$x = {alpha}$"
    else:
      ans = f"$x = {alpha}, {beta}$"
      
    questions.append({
      "id": f"j3_math_quad_p{len(questions)+1}",
      "difficulty": "medium",
      "text": f"次の2次方程式を解きなさい：\n$${expr} = 0$$",
      "answer": ans,
      "reference": "中学3年 - 2次方程式の解法（因数分解の利用）",
      "hint": "左辺を因数分解して $(x - \\\\alpha)(x - \\\\beta) = 0$ の形に変形できれば、解は $x = \\\\alpha, \\\\beta$ と求まります。"
    })
  return questions

# -------------------------------------------------------------
# Main processing & Migration
# -------------------------------------------------------------

def main():
  print("=== パラメータ変形を用いた問題プールの自動増量プロセスを開始します ===")
  
  try:
    with open(QUESTIONS_FILE, "r", encoding="utf-8") as f:
      db = json.load(f)
  except Exception as e:
    print(f"エラー: {QUESTIONS_FILE} の読み込みに失敗しました。{e}")
    return

  # Structure migration
  if "subjects" in db and "high_school" not in db:
    print("-> 既存のDB構造を 'high_school' と 'junior_high' の入れ子構造に移行します。")
    db = {
      "high_school": {
        "subjects": db["subjects"]
      },
      "junior_high": {
        "subjects": {}
      }
    }

  # Build junior_high structure if empty
  if "junior_high" not in db or "subjects" not in db["junior_high"] or not db["junior_high"]["subjects"]:
    db["junior_high"] = {
      "subjects": {
        "junior_math": {
          "name": "中学数学 (高校受験対策)",
          "chapters": {
            "j1_math": {
              "name": "中学1年",
              "units": {
                "u1_equations": {
                  "name": "1次方程式",
                  "questions": []
                }
              }
            },
            "j2_math": {
              "name": "中学2年",
              "units": {
                "u1_simultaneous": {
                  "name": "連立方程式",
                  "questions": []
                }
              }
            },
            "j3_math": {
              "name": "中学3年",
              "units": {
                "u1_factoring": {
                  "name": "展開と因数分解",
                  "questions": []
                },
                "u2_quadratic": {
                  "name": "2次方程式",
                  "questions": []
                }
              }
            }
          }
        }
      }
    }

  # -------------------------------------------------------------
  # Populate High School Pool
  # -------------------------------------------------------------
  hs_subjects = db["high_school"]["subjects"]
  
  if "math1" in hs_subjects:
    units = hs_subjects["math1"]["chapters"]["ch1_expressions"]["units"]
    units["u1_calculations"]["questions"] = gen_m1_ch1_calculations(20)
    units["u2_real_numbers"]["questions"] = gen_m1_ch1_real_numbers(20)
    units["u3_inequalities"]["questions"] = gen_m1_ch1_inequalities(20)
    
    units_ch2 = hs_subjects["math1"]["chapters"]["ch2_sets"]["units"]
    units_ch2["u1_sets_and_propositions"]["questions"] = gen_m1_ch2_propositions(20)
    
    units_ch3 = hs_subjects["math1"]["chapters"]["ch3_functions"]["units"]
    units_ch3["u1_graphs"]["questions"] = gen_m1_ch3_graphs(20)
    units_ch3["u2_inequalities"]["questions"] = gen_m1_ch3_inequalities(20)
    
    units_ch5 = hs_subjects["math1"]["chapters"]["ch5_data"]["units"]
    units_ch5["u1_data_analysis"]["questions"] = gen_m1_ch5_data(20)
    
    print("高校数学：数学Ⅰの問題生成完了 (合計140問)")

  if "mathA" in hs_subjects:
    units = hs_subjects["mathA"]["chapters"]["ch3_human_activities"]["units"]
    units["u1_divisors"]["questions"] = gen_ma_ch3_euclidean(20)
    print("高校数学：数学Aの問題生成完了 (合計20問)")

  if "math2" in hs_subjects:
    units_ch1 = hs_subjects["math2"]["chapters"]["ch1_expressions"]["units"]
    units_ch1["u3_complex_equations"]["questions"] = gen_m2_ch1_complex(20)
    
    units_ch2 = hs_subjects["math2"]["chapters"]["ch2_geometry_equations"]["units"]
    units_ch2["u1_points_lines_circles"]["questions"] = gen_m2_ch2_lines(20)
    
    units_ch5 = hs_subjects["math2"]["chapters"]["ch5_calculus"]["units"]
    units_ch5["u1_differentiation"]["questions"] = gen_m2_ch5_tangent(20)
    print("高校数学：数学Ⅱの問題生成完了 (合計60問)")

  if "mathC" in hs_subjects:
    units = hs_subjects["mathC"]["chapters"]["ch1_vectors"]["units"]
    units["u1_vectors"]["questions"] = gen_mc_ch1_vectors(20)
    print("高校数学：数学Cの問題生成完了 (合計20問)")

  # -------------------------------------------------------------
  # Populate Junior High School Pool
  # -------------------------------------------------------------
  jh_chapters = db["junior_high"]["subjects"]["junior_math"]["chapters"]
  
  jh_chapters["j1_math"]["units"]["u1_equations"]["questions"] = gen_j1_equations(20)
  jh_chapters["j2_math"]["units"]["u1_simultaneous"]["questions"] = gen_j2_simultaneous(20)
  jh_chapters["j3_math"]["units"]["u1_factoring"]["questions"] = gen_j3_factoring(20)
  jh_chapters["j3_math"]["units"]["u2_quadratic"]["questions"] = gen_j3_quadratic(20)
  print("中学数学：中1〜中3の問題生成完了 (合計80問)")

  # Write back updated DB
  try:
    with open(QUESTIONS_FILE, "w", encoding="utf-8") as f:
      json.dump(db, f, ensure_ascii=False, indent=2)
    print(f"\n🎉 成功！ すべての生成問題をマージし {QUESTIONS_FILE} に書き込みました。")
  except Exception as e:
    print(f"エラー: {QUESTIONS_FILE} への書き込みに失敗しました。{e}")

if __name__ == "__main__":
  main()
