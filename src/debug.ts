import { state } from './state';
import { showToast } from './ui';
import { startPomoTimerTick, stopPomoOnLeave } from './pomo';
import { playPomoAlert, startBgmPlayback, stopBgmPlayback, unlockAudio } from './audio';
import { testGeminiApiKey, testGasEmailProgram, sendResultEmailToGas } from './api';

export function setupDebugHandlers(): void {
  // Bind listeners unconditionally on startup so they function after Admin login

  // 1. Timer tests
  document.getElementById('debug-timer-2s-btn')?.addEventListener('click', () => {
    stopPomoOnLeave();
    unlockAudio();
    state.pomoSecondsLeft = 2;
    state.pomoState = 'work';
    state.pomoStateStartTime = Date.now();
    state.pomoTimerStartSecondsLeft = 2;
    state.pomoAccumulatedSeconds = 0;
    state.pomoZeroTimestamp = 0;
    startPomoTimerTick();
    showToast('デバッグ: 2秒タイマーを開始しました。');
  });

  document.getElementById('debug-timer-15m-btn')?.addEventListener('click', () => {
    stopPomoOnLeave();
    unlockAudio();
    state.pomoSecondsLeft = 15 * 60;
    state.pomoState = 'work';
    state.pomoStateStartTime = Date.now();
    state.pomoTimerStartSecondsLeft = 15 * 60;
    state.pomoAccumulatedSeconds = 0;
    state.pomoZeroTimestamp = 0;
    startPomoTimerTick();
    showToast('デバッグ: 15分タイマーを開始しました。');
  });

  document.getElementById('debug-timer-25m-btn')?.addEventListener('click', () => {
    stopPomoOnLeave();
    unlockAudio();
    state.pomoSecondsLeft = 25 * 60;
    state.pomoState = 'work';
    state.pomoStateStartTime = Date.now();
    state.pomoTimerStartSecondsLeft = 25 * 60;
    state.pomoAccumulatedSeconds = 0;
    state.pomoZeroTimestamp = 0;
    startPomoTimerTick();
    showToast('デバッグ: 25分タイマーを開始しました。');
  });

  document.getElementById('debug-timer-stop-btn')?.addEventListener('click', () => {
    stopPomoOnLeave();
    showToast('デバッグ: タイマーを停止しました。');
  });

  // 2. Sound tests
  document.getElementById('debug-sound-alert-btn')?.addEventListener('click', () => {
    unlockAudio();
    playPomoAlert(true); // force play!
    showToast('デバッグ: アラーム音テスト再生を指示しました。');
  });

  document.getElementById('debug-sound-bgm-start-btn')?.addEventListener('click', () => {
    unlockAudio();
    startBgmPlayback();
    showToast('デバッグ: BGM再生を開始しました。');
  });

  document.getElementById('debug-sound-bgm-stop-btn')?.addEventListener('click', () => {
    stopBgmPlayback();
    showToast('デバッグ: BGM再生を停止しました。');
  });

  // 3. API / GAS tests
  document.getElementById('debug-gas-send-exam-btn')?.addEventListener('click', async () => {
    const sheetsUrl = localStorage.getItem('math_google_sheets_url');
    if (!sheetsUrl) {
      showToast('デバッグエラー: スプレッドシートURLが未設定です。', 'danger');
      return;
    }
    
    // 100% 正答率のダミーテスト結果を送信
    const studentName = localStorage.getItem('math_student_name') || 'Admin';
    const dummyReport = {
      totalScore: 100,
      questions: [
        { id: "debug_q1", score: 25, isCorrect: true, commentary: "デバッグ送信: 完璧な記述です。" },
        { id: "debug_q2", score: 25, isCorrect: true, commentary: "デバッグ送信: 途中式も完璧です。" },
        { id: "debug_q3", score: 25, isCorrect: true, commentary: "デバッグ送信: 正しい展開です。" },
        { id: "debug_q4", score: 25, isCorrect: true, commentary: "デバッグ送信: 答えが正確に導かれています。" }
      ],
      weaknesses: "デバッグ送信: 弱点はありません。非常に優秀な成績です。",
      recommendation: "デバッグ送信: 次の章へ進んでください。"
    };
    
    const payload = {
      action: 'submit_exam_result',
      timestamp: new Date().toLocaleString('ja-JP'),
      studentName: studentName,
      curriculumMode: localStorage.getItem('math_curriculum_mode') || 'junior_high',
      subjectName: 'デバッグ数学（100%送信）',
      score: 100,
      maxScore: 100,
      duration: '0分2秒',
      weaknesses: dummyReport.weaknesses,
      recommendation: dummyReport.recommendation,
      reportJson: JSON.stringify(dummyReport)
    };
    
    showToast('デバッグ: 100%正答率でのGAS送信を試みています...');
    try {
      await sendResultEmailToGas(sheetsUrl, payload);
      showToast('デバッグ: GAS送信リクエストを投げました (opaque)。', 'success');
    } catch (e: any) {
      showToast(`デバッグエラー: ${e.message}`, 'danger');
    }
  });

  document.getElementById('debug-gas-email-btn')?.addEventListener('click', async () => {
    const sheetsUrl = localStorage.getItem('math_google_sheets_url');
    if (!sheetsUrl) {
      showToast('デバッグエラー: スプレッドシートURLが未設定です。', 'danger');
      return;
    }
    const studentName = localStorage.getItem('math_student_name') || 'Admin';
    
    showToast('デバッグ: GASメール送信テストを実行中...');
    try {
      await testGasEmailProgram(sheetsUrl, studentName);
      showToast('デバッグ: ダミーメールテストリクエストを投げました (opaque)。', 'success');
    } catch (e: any) {
      showToast(`デバッグエラー: ${e.message}`, 'danger');
    }
  });

  document.getElementById('debug-gemini-test-btn')?.addEventListener('click', async () => {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      showToast('デバッグエラー: Gemini APIキーが未設定です。', 'danger');
      return;
    }
    
    showToast('デバッグ: Gemini API接続確認中...');
    try {
      await testGeminiApiKey(apiKey);
      showToast('デバッグ: Gemini API接続成功！', 'success');
    } catch (e: any) {
      showToast(`デバッグエラー: ${e.message}`, 'danger');
    }
  });

  // 4. Test & Admin data clear action
  const deleteLogsBtn = document.getElementById('debug-delete-test-logs-btn');
  if (deleteLogsBtn) {
    deleteLogsBtn.addEventListener('click', async () => {
      const sheetsUrl = localStorage.getItem('math_google_sheets_url');
      if (!sheetsUrl) {
        showToast('連携用URLが設定されていません。', 'danger');
        return;
      }
      
      if (!confirm('本当に Test と Admin の全学習記録をスプレッドシート上から削除しますか？\n（この操作は元に戻せません。空き行は自動で詰められます）')) {
        return;
      }
      
      const btn = deleteLogsBtn as HTMLButtonElement;
      btn.disabled = true;
      showToast('テストデータをクリア中...');
      
      try {
        const response = await fetch(sheetsUrl, {
          method: 'POST',
          body: JSON.stringify({
            action: 'delete_test_admin_logs'
          })
        });
        if (!response.ok) {
          throw new Error(`接続エラー: ${response.statusText}`);
        }
        const resJson = await response.json();
        if (resJson.status !== 'success') {
          throw new Error(resJson.message || 'データ削除処理に失敗しました。');
        }
        
        showToast('Test & Admin のテスト履歴を完全消去しました。', 'success');
      } catch (err: any) {
        showToast(`エラー: ${err.message}`, 'danger');
      } finally {
        btn.disabled = false;
      }
    });
  }

  // Start state logging loop
  startDebugConsoleLogger();
}

function startDebugConsoleLogger(): void {
  const consoleEl = document.getElementById('debug-console-log') as HTMLTextAreaElement;
  if (!consoleEl) return;

  const logState = () => {
    const debugInfo = {
      timestamp: new Date().toLocaleTimeString(),
      state: {
        pomoState: state.pomoState,
        pomoSecondsLeft: state.pomoSecondsLeft,
        pomoAccumulatedSeconds: state.pomoAccumulatedSeconds,
        pomoBgmUrl: state.pomoBgmUrl ? '(BLOB URL: ' + state.pomoBgmUrl.substring(0, 30) + '...)' : null,
        pomoBgmFileName: state.pomoBgmFileName,
        activeSession: state.activeSession ? {
          currentQuestionIndex: state.activeSession.currentQuestionIndex,
          elapsedSeconds: state.activeSession.elapsedSeconds,
          isPaused: state.activeSession.isPaused,
          isFinished: state.activeSession.isFinished
        } : null
      },
      localStorage: {
        math_student_name: localStorage.getItem('math_student_name'),
        math_google_sheets_url: localStorage.getItem('math_google_sheets_url') ? '設定あり' : '設定なし',
        gemini_api_key: localStorage.getItem('gemini_api_key') ? '設定あり' : '設定なし',
        math_curriculum_mode: localStorage.getItem('math_curriculum_mode')
      }
    };

    consoleEl.value = JSON.stringify(debugInfo, null, 2);
  };

  logState();
  setInterval(logState, 1000);
}
