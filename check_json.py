#!/usr/bin/env python3
# check_json.py - questions.json 内の全問題データ（高校・中学両対応）の整合性を自動チェックするスクリプト

import json
import re

QUESTIONS_FILE = "questions.json"

def check_math_rational(q_id, text, answer):
  match_q = re.search(r'\\frac\{(\d+)\}\{\\sqrt\{(\d+)\}\s*([+-])\s*\\sqrt\{(\d+)\}\}', text)
  if match_q:
    c = int(match_q.group(1))
    a = int(match_q.group(2))
    sign = match_q.group(3)
    b = int(match_q.group(4))
    
    diff = a - b
    factor = c // diff
    
    ans_clean = answer.replace(" ", "").replace("$", "")
    if f"\\sqrt{{{a}}}" not in ans_clean or f"\\sqrt{{{b}}}" not in ans_clean:
      return f"有理化の不整合: 問題の root({a}), root({b}) が解答に存在しません。解答={answer}"
  return None

def check_math_inequality(q_id, text, answer):
  # ax + b > cx + d
  match = re.search(r'(-?\d+)x\s*([+-]\s*\d+)?\s*>\s*(-?\d+)x\s*([+-]\s*\d+)?', text.replace("$$", ""))
  if match:
    a = int(match.group(1))
    
    b_part = match.group(2)
    b = 0
    if b_part:
      b = int(b_part.replace(" ", ""))
      
    c = int(match.group(3))
    
    d_part = match.group(4)
    d = 0
    if d_part:
      d = int(d_part.replace(" ", ""))
      
    diff_x = a - c
    expected_val = (d - b) / diff_x
    
    ans_clean = answer.replace("$", "").replace(" ", "")
    if diff_x > 0 and "<" in ans_clean:
      return f"不等号の方向エラー: x > {expected_val} であるべきですが、解答は {answer} です。"
    if diff_x < 0 and ">" in ans_clean:
      return f"不等号の方向エラー: x < {expected_val} であるべきですが、解答は {answer} です。"
      
    match_ans = re.search(r'x[<>]?(-?\d+)', ans_clean)
    if match_ans:
      ans_val = int(match_ans.group(1))
      if abs(ans_val - expected_val) > 0.001:
        return f"不等式の値エラー: 計算結果は {expected_val} ですが、解答は {ans_val} です。"
  return None

def check_math_vertex(q_id, text, answer):
  match = re.search(r'y\s*=\s*(-?\d*)x\^2\s*([+-]\s*\d+)?x\s*([+-]\s*\d+)?', text.replace("$$", "").replace(" ", ""))
  if match:
    a_str = match.group(1)
    if a_str == "" or a_str == "+": a = 1
    elif a_str == "-": a = -1
    else: a = int(a_str)
    
    b_str = match.group(2)
    b = int(b_str) if b_str else 0
    
    c_str = match.group(3)
    c = int(c_str) if c_str else 0
    
    h_expected = -b / (2*a)
    k_expected = c - a * (h_expected**2)
    
    match_ans = re.search(r'\((-?\d+),\s*(-?\d+)\)', answer)
    if match_ans:
      ans_h = int(match_ans.group(1))
      ans_k = int(match_ans.group(2))
      
      if abs(ans_h - h_expected) > 0.001 or abs(ans_k - k_expected) > 0.001:
        return f"頂点座標エラー: 計算結果は ({h_expected}, {k_expected}) ですが、解答は ({ans_h}, {ans_k}) です。"
  return None

def check_subjects(subjects, errors):
  total_questions = 0
  for sub_key, subject in subjects.items():
    for chap_key, chapter in subject.get("chapters", {}).items():
      for unit_key, unit in chapter.get("units", {}).items():
        if isinstance(unit, str):
          continue
          
        questions = unit.get("questions", [])
        for q in questions:
          total_questions += 1
          q_id = q.get("id")
          text = q.get("text", "")
          answer = q.get("answer", "")
          reference = q.get("reference", "")
          hint = q.get("hint", "")
          
          if not q_id or not text or not answer or not reference or not hint:
            errors.append(f"[{q_id}] 必須フィールドに空値があります。")
            continue
            
          if text.count("$") % 2 != 0:
            errors.append(f"[{q_id}] 問題文の LaTeX ドルマーク（$）のペアが閉じていません。")
          if answer.count("$") % 2 != 0:
            errors.append(f"[{q_id}] 解答文の LaTeX ドルマーク（$）のペアが閉じていません。")
            
          if "q2_p" in q_id:
            err = check_math_rational(q_id, text, answer)
            if err: errors.append(f"[{q_id}] {err}")
          elif "q3_p" in q_id:
            err = check_math_inequality(q_id, text, answer)
            if err: errors.append(f"[{q_id}] {err}")
          elif "m1_ch3_q1_p" in q_id:
            err = check_math_vertex(q_id, text, answer)
            if err: errors.append(f"[{q_id}] {err}")
            
  return total_questions

def main():
  print("=== questions.json 整合性検証スクリプトを起動しました ===")
  
  try:
    with open(QUESTIONS_FILE, "r", encoding="utf-8") as f:
      db = json.load(f)
  except Exception as e:
    print(f"❌ ファイルの読み込みに失敗しました: {e}")
    return
    
  errors = []
  total_questions = 0
  
  if "high_school" in db:
    total_questions += check_subjects(db["high_school"].get("subjects", {}), errors)
  if "junior_high" in db:
    total_questions += check_subjects(db["junior_high"].get("subjects", {}), errors)
    
  print(f"検証完了: 合計 {total_questions} 問のデータを検査しました。")
  if len(errors) == 0:
    print("✅ 整合性チェックをパスしました！数学的な不整合やシンタックスエラーは検出されませんでした。")
  else:
    print(f"❌ {len(errors)} 件のエラーが見つかりました：")
    for err in errors:
      print(f"  - {err}")

if __name__ == "__main__":
  main()
