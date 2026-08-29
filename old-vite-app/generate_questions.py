#!/usr/bin/env python3
# generate_questions.py - Gemini APIを使用して問題プールを大量自動生成するツール

import os
import sys
import json
import time
import urllib.request
import urllib.error

# 設定
GEMINI_MODEL = "gemini-3.5-flash"
QUESTIONS_FILE = "questions.json"

def get_api_key():
  # Env var check
  api_key = os.environ.get("GEMINI_API_KEY")
  if api_key:
    return api_key
    
  # CLI argument check
  if len(sys.argv) > 1:
    return sys.argv[1]
    
  # Manual prompt
  print("Gemini APIキーが見つかりません。")
  api_key = input("APIキーを入力してください (AIZAaSy...): ").strip()
  return api_key

def call_gemini_api(api_key, prompt):
  url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={api_key}"
  
  headers = {
    "Content-Type": "application/json"
  }
  
  data = {
    "contents": [{
      "parts": [{
        "text": prompt
      }]
    }],
    "generationConfig": {
      "responseMimeType": "application/json"
    }
  }
  
  req = urllib.request.Request(
    url, 
    data=json.dumps(data).encode("utf-8"), 
    headers=headers, 
    method="POST"
  )
  
  try:
    with urllib.request.urlopen(req) as response:
      res_data = json.loads(response.read().decode("utf-8"))
      text_response = res_data["candidates"][0]["content"]["parts"][0]["text"]
      return text_response
  except urllib.error.HTTPError as e:
    print(f"\n❌ APIエラーが発生しました (HTTP {e.code}): {e.reason}")
    print(e.read().decode("utf-8"))
    return None
  except Exception as e:
    print(f"\n❌ エラーが発生しました: {e}")
    return None

def generate_questions_for_unit(api_key, subject_name, chapter_name, unit_name, subject_key, chapter_key, unit_key, count=3):
  prompt = f"""
あなたは日本の高校数学の教材作成プロフェッショナルです。
参考書『My Best よくわかる高校数学』（新課程版）の以下の単元に沿った、教科書基本〜標準レベル（定期テストで基本〜平均点レベル）の問題を {count} 問作成してください。

【対象単元】
- 科目: {subject_name}
- 章: {chapter_name}
- 節・単元: {unit_name}

【作成指示】
1. 難易度は基本レベル（公式の直接適用）〜標準レベル（典型的な解法パターン）としてください。数学が苦手な生徒でも、ヒントを読めば解き始められるレベルが理想です。
2. 数式はLaTeX表記を用いてください。
   - インラインの数式は $ ... $ で囲んでください（例: $x = 3$）
   - ディスプレイ（別行立て）の数式は $$ ... $$ で囲んでください。
3. 日本語の表現は自然で、高校生向けに分かりやすくしてください。

必ず、以下のJSON配列スキーマに従った有効なJSON形式でのみ出力してください。マークダウンによるJSONブロックの囲みなどは付けず、純粋なJSON文字列としてください。

[
  {{
    "id": "{subject_key}_{chapter_key}_{unit_key}_genX", // Xは1から{count}までの連番
    "difficulty": "easy", // easyまたはmedium
    "text": "問題文。数式はLaTeXを使用してください。\\nで改行できます。",
    "answer": "最終的な解答（LaTeX数式含む、簡潔に）",
    "reference": "{chapter_name} {unit_name}",
    "hint": "問題を解くための主要な公式や着眼点のヒント（優しく解説）"
  }}
]
"""
  response_text = call_gemini_api(api_key, prompt)
  if not response_text:
    return None
    
  try:
    # Clean output if wrapped in backticks
    clean_text = response_text.strip()
    if clean_text.startswith("```"):
      clean_text = clean_text.replace("```json", "").replace("```", "").strip()
      
    questions = json.loads(clean_text)
    return questions
  except Exception as e:
    print(f"\n⚠️ JSONの解析に失敗しました: {e}")
    print("応答テキスト:")
    print(response_text)
    return None

def main():
  api_key = get_api_key()
  if not api_key:
    print("APIキーが無効です。終了します。")
    return
    
  if not os.path.exists(QUESTIONS_FILE):
    print(f"エラー: {QUESTIONS_FILE} が見つかりません。")
    return
    
  with open(QUESTIONS_FILE, "r", encoding="utf-8") as f:
    db = json.load(f)
    
  print("\n=============================================")
  print("🚀 高校数学問題データベース 自動作成スクリプト")
  print("=============================================\n")
  
  # Count existing questions
  subjects = db.get("subjects", {})
  
  print("出題プールを自動作成する科目を選択してください:")
  sub_keys = list(subjects.keys())
  for idx, k in enumerate(sub_keys):
    print(f"  {idx + 1}. {subjects[k]['name']} ({k})")
  print(f"  {len(sub_keys) + 1}. すべての科目を一括処理する")
  
  try:
    choice = int(input("\n選択 (番号を入力): ").strip()) - 1
  except ValueError:
    print("無効な入力です。終了します。")
    return
    
  target_keys = []
  if choice == len(sub_keys):
    target_keys = sub_keys
  elif 0 <= choice < len(sub_keys):
    target_keys = [sub_keys[choice]]
  else:
    print("無効な選択肢です。終了します。")
    return
    
  try:
    q_count = int(input("各単元ごとに何問ずつ生成しますか？ (推奨: 3): ").strip())
  except ValueError:
    q_count = 3
    
  total_generated = 0
  
  for sub_key in target_keys:
    subject = subjects[sub_key]
    print(f"\n--- 科目: {subject['name']} の生成を開始します ---")
    
    for chap_key, chapter in subject.get("chapters", {}).items():
      print(f"\n📁 {chapter['name']}")
      
      for unit_key, unit in chapter.get("units", {}).items():
        unit_name = unit if isinstance(unit, str) else unit.get("name", "")
        print(f"  📖 {unit_name} ... 生成中...", end="", flush=True)
        
        # Check if the unit is structured as dictionary or string
        # In our questions.json, the unit is structured as dictionary containing questions: []
        unit_data = subject["chapters"][chap_key]["units"][unit_key]
        if isinstance(unit_data, str):
          # Convert to dict format
          unit_data = {
            "name": unit_name,
            "questions": []
          }
          subject["chapters"][chap_key]["units"][unit_key] = unit_data
          
        # Generate
        new_qs = generate_questions_for_unit(
          api_key, 
          subject["name"], 
          chapter["name"], 
          unit_name, 
          sub_key, 
          chap_key, 
          unit_key,
          count=q_count
        )
        
        if new_qs:
          # Overwrite or append? Let's append to keep the samples, but ensure IDs are unique
          existing_ids = {q["id"] for q in unit_data.get("questions", [])}
          added_count = 0
          
          if "questions" not in unit_data:
            unit_data["questions"] = []
            
          for q in new_qs:
            # Avoid duplicate IDs
            if q["id"] in existing_ids:
              q["id"] = q["id"] + "_new_" + str(int(time.time()))
            unit_data["questions"].append(q)
            added_count += 1
            
          total_generated += added_count
          print(f" ✅ 成功 ({added_count}問追加しました)")
          
          # Save database incrementally to prevent losing progress
          with open(QUESTIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(db, f, ensure_ascii=False, indent=2)
        else:
          print(" ❌ 失敗 (スキップします)")
          
        # Avoid hitting API rate limits (15 requests per minute limit on Gemini Flash free tier)
        time.sleep(4.0)

  print(f"\n🎉 完了しました！ 合計 {total_generated} 問を生成して {QUESTIONS_FILE} に保存しました。")
  print("iPhone上のアプリに反映するために、`./deploy.sh` を実行してデプロイしてください。")

if __name__ == "__main__":
  main()
