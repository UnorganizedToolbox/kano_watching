import { Question, HistoryItem, ExamSession } from './types';

// Gemini API Proxy Endpoint
const GEMINI_API_URL = "/api/gemini";

// -------------------------------------------------------------
// Gemini API Operations (Proxied via Cloudflare Pages Functions)
// -------------------------------------------------------------

export async function testGeminiApiKey(): Promise<void> {
  const payload = {
    contents: [{ parts: [{ text: "Hello. Respond in 3 words." }] }]
  };
  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Student-Name': encodeURIComponent(localStorage.getItem('math_student_name') || '')
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Gemini API接続エラー: ${response.statusText}`);
  }
}

export async function runOcrPreRead(images: string[], attemptedQuestions: Question[], generalNote: string): Promise<string> {
  let questionsListText = '';
  attemptedQuestions.forEach((q, idx) => {
    questionsListText += `大問 ${idx + 1}: ${q.text}\n`;
  });
  
  const parts: any[] = [
    {
      text: `あなたは手書きの数学解答用紙から計算式を正確に読み取りテキスト化するプロのAIアシスタントです。
添付された ${images.length} 枚の解答用紙の画像から、学生が解いた計算プロセスを読み取り、文字起こしをしてください。

解答用紙に解かれているのは以下の問題です：
${questionsListText}

【指示事項】
1. 各問題への解答プロセスを検出し、大問ごとに整理して出力してください（例：「【大問 1】」「【大問 2】」といった見出しを付けてください）。
2. 数式はLaTeX形式（例えば $2x^2 + 5x + 3 = 0$ や $\\sin \\theta = 3/5$ など）で表現してください。
3. 学生や指導者からの補足コメント（後述）がある場合は、それを参考にしながら潰れた手書き文字を正しく補完してください。
4. 採点や解説は一切出力せず、文字起こしテキスト（数式プロセス）のみを簡潔に出力してください。
5. 解答用紙に解かれていない問題については、「(大問 X は解答用紙に記述なし)」と出力してください。

補足コメント: "${generalNote}"`
    }
  ];
  
  images.forEach(imgData => {
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
  
  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Student-Name': encodeURIComponent(localStorage.getItem('math_student_name') || '')
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Gemini APIエラー: ${response.statusText}`);
  }
  
  const resultJson = await response.json();
  const text = resultJson.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Geminiから解答テキストが得られませんでした。");
  }
  return text.trim();
}

export async function runFinalDiagnosis(
  attemptedQuestions: Question[],
  ocrTextUnified: string,
  elapsedSeconds: number
): Promise<any> {
  const min = Math.floor(elapsedSeconds / 60);
  const sec = elapsedSeconds % 60;
  const durationText = `${min}分${sec}秒`;

  let promptQuestionsText = '';
  attemptedQuestions.forEach((q, idx) => {
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
${ocrTextUnified || '(解答なし)'}
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
  
  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Student-Name': encodeURIComponent(localStorage.getItem('math_student_name') || '')
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    const errorDetail = errorJson.message || response.statusText;
    throw new Error(`Gemini evaluation failed: ${errorDetail}`);
  }
  
  const resultJson = await response.json();
  const textResponse = resultJson.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResponse) {
    throw new Error("Geminiから結果が返されませんでした。");
  }
  return textResponse.trim();
}

export async function askGeminiQuestion(promptText: string, imageBase64: string | null): Promise<string> {
  const parts: any[] = [{ text: promptText }];
  if (imageBase64) {
    const rawBase64 = imageBase64.split(',')[1];
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: rawBase64
      }
    });
  }
  
  const payload = { contents: [{ parts }] };
  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Student-Name': encodeURIComponent(localStorage.getItem('math_student_name') || '')
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    const errorDetail = errorJson.message || response.statusText;
    throw new Error(`AIのヒント作成失敗: ${errorDetail}`);
  }
  
  const resultJson = await response.json();
  const resText = resultJson.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!resText) {
    throw new Error("AIから応答が得られませんでした。");
  }
  return resText.trim();
}

// Google Sheets (GAS) Web App Proxy Endpoint
const GAS_PROXY_URL = "/api/gas";

// -------------------------------------------------------------
// Google Sheets (GAS) Web App Operations (Proxied via Cloudflare)
// -------------------------------------------------------------

export async function testGasConnection(studentName: string): Promise<void> {
  const payload = {
    action: 'get_questions',
    studentName: studentName,
    studentId: localStorage.getItem('math_student_id') || ''
  };
  const response = await fetch(GAS_PROXY_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(`Google Apps Script接続エラー: 応答がありません。`);
  }
  const gasJson = await response.json();
  if (gasJson.status !== 'success') {
    throw new Error(`GASエラー: ${gasJson.message || '接続に失敗しました。'}`);
  }
}

export async function testGasEmailProgram(studentName: string): Promise<void> {
  const dummyPayload = {
    action: 'submit_exam_result', // Explicit action matches routing fix!
    studentId: localStorage.getItem('math_student_id') || '',
    timestamp: new Date().toLocaleString('ja-JP'),
    studentName: studentName,
    curriculumMode: 'junior_high',
    subjectName: 'テスト数学 (GAS接続・記録テスト用)',
    score: 85,
    maxScore: 100,
    duration: '15分30秒',
    weaknesses: '【これは自動テストデータです】スプレッドシートの1枚目にサマリーが生成され、2枚目に不具合報告用の空テーブルが作られているか確認してください。',
    recommendation: '無さに動作していれば、この生徒の名前のシート（👤 ' + studentName + '）が追加され、メールが届いています。'
  };
  const response = await fetch(GAS_PROXY_URL, {
    method: 'POST',
    body: JSON.stringify(dummyPayload)
  });
  if (!response.ok) {
    throw new Error(`Google Apps Script接続エラー: ${response.statusText}`);
  }
  const gasJson = await response.json();
  if (gasJson.status !== 'success') {
    throw new Error(`GASエラー: ${gasJson.message || 'メールテストに失敗しました。'}`);
  }
}

export async function syncTextbookMappingToGas(mappings: any[]): Promise<number> {
  const payload = {
    action: 'import_textbook_mapping',
    studentId: localStorage.getItem('math_student_id') || '',
    mappings: mappings
  };
  const response = await fetch(GAS_PROXY_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error('同期処理に失敗しました。ネットワークを確認してください。');
  }
  const resJson = await response.json();
  if (resJson.status !== 'success') {
    throw new Error(resJson.message || '同期処理に失敗しました。');
  }
  return resJson.count;
}

export async function sendResultEmailToGas(payload: any): Promise<void> {
  const response = await fetch(GAS_PROXY_URL, {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      studentId: localStorage.getItem('math_student_id') || ''
    })
  });
  if (!response.ok) {
    throw new Error(`診断結果のGAS送信に失敗しました: ${response.statusText}`);
  }
  const resJson = await response.json();
  if (resJson.status !== 'success') {
    throw new Error(resJson.message || 'GAS側の送信処理でエラーが発生しました。');
  }
}

export async function submitIssueReportToGas(
  studentName: string,
  issueText: string,
  problemText: string,
  aiReportText: string
): Promise<void> {
  const payload = {
    action: 'report_issue',
    studentId: localStorage.getItem('math_student_id') || '',
    timestamp: new Date().toLocaleString('ja-JP'),
    studentName: studentName,
    issueText: issueText,
    problemText: problemText,
    aiReportText: aiReportText
  };
  const response = await fetch(GAS_PROXY_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error('不具合報告の送信に失敗しました。接続を確認してください。');
  }
  const resJson = await response.json();
  if (resJson.status !== 'success') {
    throw new Error(resJson.message || '送信に失敗しました。');
  }
}

export async function getQuestionsFromGas(studentName: string): Promise<any[]> {
  const payload = {
    action: 'get_questions',
    studentId: localStorage.getItem('math_student_id') || '',
    studentName: studentName
  };
  const response = await fetch(GAS_PROXY_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error('スプレッドシート連携エラー: 回答履歴を取得できませんでした。');
  }
  const resJson = await response.json();
  if (resJson.status !== 'success') {
    throw new Error(resJson.message || '質問履歴の取得に失敗しました。');
  }
  return resJson.questions || [];
}

export async function submitQuestionToGas(
  studentName: string,
  text: string,
  imageBase64: string | null
): Promise<void> {
  const payload = {
    action: 'question_to_tutor',
    studentId: localStorage.getItem('math_student_id') || '',
    timestamp: new Date().toLocaleString('ja-JP'),
    studentName: studentName,
    title: text.substring(0, 30) || '無題の質問',
    text: text,
    imageBase64: imageBase64
  };
  const response = await fetch(GAS_PROXY_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(`質問の送信に失敗しました: ${response.statusText}`);
  }
  const resJson = await response.json();
  if (resJson.status !== 'success') {
    throw new Error(resJson.message || 'GAS側の質問登録に失敗しました。');
  }
}

export async function syncPomodoroLogsFromGas(studentName: string): Promise<any[]> {
  const payload = {
    action: 'get_pomodoro_logs',
    studentId: localStorage.getItem('math_student_id') || '',
    studentName: studentName
  };
  const response = await fetch(GAS_PROXY_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error('スプレッドシート連携エラー: ポモドーロログを取得できませんでした。');
  }
  const resJson = await response.json();
  if (resJson.status !== 'success') {
    throw new Error(resJson.message || 'ポモドーロログの取得に失敗しました。');
  }
  return resJson.logs || [];
}

export async function logPomodoroEventToGas(payload: any): Promise<void> {
  const response = await fetch(GAS_PROXY_URL, {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      studentId: localStorage.getItem('math_student_id') || ''
    })
  });
  if (!response.ok) {
    throw new Error(`ポモドーロログの送信失敗: ${response.statusText}`);
  }
  const resJson = await response.json();
  if (resJson.status !== 'success') {
    throw new Error(resJson.message || 'GAS側のログ追記でエラーが発生しました。');
  }
}

export async function requestRegistration(studentName: string, email: string): Promise<string> {
  const payload = {
    action: 'request_registration',
    studentName: studentName,
    email: email
  };
  const response = await fetch(GAS_PROXY_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(`接続エラー: ${response.statusText}`);
  }
  const resJson = await response.json();
  if (resJson.status !== 'success') {
    throw new Error(resJson.message || '利用申請に失敗しました。');
  }
  return resJson.message;
}

export async function loginStudent(studentId: string, password: string): Promise<{ studentName: string, email: string }> {
  const payload = {
    action: 'login_student',
    studentId: studentId,
    password: password
  };
  const response = await fetch(GAS_PROXY_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(`接続エラー: ${response.statusText}`);
  }
  const resJson = await response.json();
  if (resJson.status !== 'success') {
    throw new Error(resJson.message || 'ログインに失敗しました。生徒IDが正しいか確認してください。');
  }
  return {
    studentName: resJson.studentName,
    email: resJson.email
  };
}
