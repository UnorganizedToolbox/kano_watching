import { state, saveSessionToStorage } from './state';
import { Question, ExamSession, DiagnosticReport, HistoryItem } from './types';
import { MOCK_EXAM_TIME_LIMIT } from './constants';
import { generateDynamicQuestion } from './generator';
import { showToast, showLoader, hideLoader, switchView, applyCurriculumModeUI, openModal, closeModal } from './ui';
import { runOcrPreRead as ocrPreReadApi, runFinalDiagnosis as finalDiagnosisApi, sendResultEmailToGas, submitIssueReportToGas } from './api';
import { compressImage, cleanInvalidJsonBraces } from './utils';

// We will import renderDashboard dynamically or normally from stats to avoid circular dependency if any, 
// but normal import is fine in TS/ES Modules.
import { renderDashboard } from './stats';

// Declaring window globals for compiler
declare global {
  interface Window {
    prevQuestion: () => void;
    nextQuestion: () => void;
    triggerMultiFileInput: () => void;
    handleMultiFileSelect: (e: any) => void;
    removeUploadedImage: (e: any, idx: number) => void;
    clearAllImages: (e: any) => void;
    enterUnifiedEditMode: () => void;
    cancelUnifiedEditMode: () => void;
    saveUnifiedEditMode: () => void;
    closeReportModal: () => void;
    submitIssueReport: () => void;
  }
}

export function startExam(): void {
  const selectedUnits: { subject: string; chapter: string; unit: string }[] = [];
  const checkboxes = document.querySelectorAll('#subject-selector input[type="checkbox"]:checked');
  
  checkboxes.forEach(chk => {
    const el = chk as HTMLInputElement;
    selectedUnits.push({
      subject: el.dataset.subject || '',
      chapter: el.dataset.chapter || '',
      unit: el.dataset.unit || ''
    });
  });
  
  if (selectedUnits.length === 0) {
    showToast('診断を行いたい単元を少なくとも1つ以上選択してください。', 'warning');
    return;
  }
  
  if (!state.questionsDb) {
    showToast('問題データベースがロードされていません。', 'danger');
    return;
  }
  
  const mode = localStorage.getItem('math_curriculum_mode') || 'junior_high';
  const subjectsSrc = state.questionsDb[mode].subjects;
  
  // Collect all questions in selected categories
  const pool: Question[] = [];
  selectedUnits.forEach(sel => {
    const unitObj = subjectsSrc[sel.subject]?.chapters[sel.chapter]?.units[sel.unit];
    if (!unitObj) return;
    
    const questions = unitObj.questions;
    if (questions && questions.length > 0) {
      questions.forEach((q: any) => {
        if (q.template) {
          // Generate 3 random variations (sufficient for a single exam session)
          for (let i = 0; i < 3; i++) {
            const seed = Math.floor(Math.random() * 1000) + 1;
            const dynamicQ = generateDynamicQuestion(q.id, seed);
            pool.push({
              ...dynamicQ,
              subjectName: subjectsSrc[sel.subject].name,
              chapterName: subjectsSrc[sel.subject].chapters[sel.chapter].name
            });
          }
        } else {
          pool.push({
            ...q,
            subjectName: subjectsSrc[sel.subject].name,
            chapterName: subjectsSrc[sel.subject].chapters[sel.chapter].name
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
  state.activeSession = {
    questionPool: questionQueue,        // Remaining questions
    attemptedQuestions: [questionQueue[0]], // Questions served to the student (starts with Q1)
    currentQuestionIndex: 0,
    startTime: Date.now(),
    elapsedSeconds: 0,
    isFinished: false,
    isPaused: false,
    images: [],
    generalNote: "",
    ocrTextUnified: "",
    report: null
  };
  
  saveSessionToStorage();
  runExamMode();
}

export function runExamMode(): void {
  renderActiveQuestion();
  
  // Reset Paused layout
  const mask = document.getElementById('exam-paused-mask');
  const body = document.getElementById('exam-question-body');
  const controls = document.getElementById('exam-controls-row');
  
  if (mask) mask.style.display = 'none';
  if (body) body.style.display = 'block';
  if (controls) controls.style.display = 'flex';
  
  switchView('exam');
  startTimer();
}

export function restoreSession(): void {
  const saved = localStorage.getItem('math_test_session');
  if (!saved) return;
  
  try {
    state.activeSession = JSON.parse(saved);
    if (!state.activeSession) return;
    
    // Show report if evaluation exists
    if (state.activeSession.report) {
      renderReport();
      switchView('report');
      return;
    }
    
    // If finished, route to upload or correction state
    if (state.activeSession.isFinished) {
      if (state.activeSession.ocrTextUnified) {
        renderOcrCorrection();
        switchView('correction');
      } else {
        renderMultiPreviewGallery();
        switchView('upload');
      }
      return;
    }
    
    // Handle paused state restoration
    if (state.activeSession.isPaused) {
      switchView('exam');
      renderActiveQuestion();
      
      const remaining = MOCK_EXAM_TIME_LIMIT - state.activeSession.elapsedSeconds;
      const min = Math.floor(remaining / 60).toString().padStart(2, '0');
      const sec = (remaining % 60).toString().padStart(2, '0');
      
      const timerDisplay = document.getElementById('timer-display');
      const pausedMask = document.getElementById('exam-paused-mask');
      const questionBody = document.getElementById('exam-question-body');
      const controlsRow = document.getElementById('exam-controls-row');
      const timerTextEl = document.getElementById('exam-timer');
      
      if (timerDisplay) timerDisplay.textContent = `${min}:${sec}`;
      if (pausedMask) pausedMask.style.display = 'block';
      if (questionBody) questionBody.style.display = 'none';
      if (controlsRow) controlsRow.style.display = 'none';
      if (timerTextEl) timerTextEl.className = 'timer-text timer-warning';
      
      showToast('一時停止中のテストがあります。');
      return;
    }
    
    // Resume timer and exam
    const now = Date.now();
    const elapsedSinceStart = Math.floor((now - state.activeSession.startTime) / 1000);
    
    if (elapsedSinceStart >= MOCK_EXAM_TIME_LIMIT) {
      state.activeSession.elapsedSeconds = MOCK_EXAM_TIME_LIMIT;
      state.activeSession.isFinished = true;
      saveSessionToStorage();
      renderMultiPreviewGallery();
      switchView('upload');
      showToast('制限時間が終了しました。解答用紙を撮影してアップロードしてください。', 'warning');
    } else {
      state.activeSession.elapsedSeconds = elapsedSinceStart;
      runExamMode();
      showToast('前回のテストセッションを再開しました。');
    }
  } catch (error) {
    console.error("Failed to restore session", error);
    localStorage.removeItem('math_test_session');
  }
}

export function resetSession(): void {
  if (state.activeSession) {
    const isReport = !!state.activeSession.report;
    const msg = isReport 
      ? 'ホーム画面に戻りますか？\n（現在の診断レポートを閉じます。過去の診断結果は履歴から再度閲覧可能です）'
      : 'テストを終了してホーム画面に戻りますか？\n（現在進行中のテストデータは破棄されます）';
      
    if (!confirm(msg)) {
      return;
    }
  }
  
  stopTimer();
  state.activeSession = null;
  localStorage.removeItem('math_test_session');
  
  const fileInput = document.getElementById('multi-file-input') as HTMLInputElement;
  const noteBox = document.getElementById('general-note-box') as HTMLTextAreaElement;
  
  if (fileInput) fileInput.value = '';
  if (noteBox) noteBox.value = '';
  
  switchView('setup');
  renderDashboard(); // Update grass heatmap and history
  showToast('ホーム画面に戻りました。');
}

// -------------------------------------------------------------
// Timer Logic
// -------------------------------------------------------------
export function startTimer(): void {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
  }
  
  state.timerInterval = window.setInterval(() => {
    if (!state.activeSession) return;
    
    const now = Date.now();
    const elapsed = Math.floor((now - state.activeSession.startTime) / 1000);
    state.activeSession.elapsedSeconds = elapsed;
    
    if (elapsed >= MOCK_EXAM_TIME_LIMIT) {
      state.activeSession.elapsedSeconds = MOCK_EXAM_TIME_LIMIT;
      state.activeSession.isFinished = true;
      saveSessionToStorage();
      stopTimer();
      
      renderMultiPreviewGallery();
      switchView('upload');
      showToast('制限時間（40分）が経過しました。解答用紙を撮影してアップロードしてください。', 'warning');
    } else {
      updateTimerDisplay();
    }
  }, 1000);
}

export function stopTimer(): void {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

export function updateTimerDisplay(): void {
  if (!state.activeSession) return;
  const remaining = MOCK_EXAM_TIME_LIMIT - state.activeSession.elapsedSeconds;
  const min = Math.floor(remaining / 60).toString().padStart(2, '0');
  const sec = (remaining % 60).toString().padStart(2, '0');
  
  const display = document.getElementById('timer-display');
  const timerTextEl = document.getElementById('exam-timer');
  
  if (display) display.textContent = `${min}:${sec}`;
  
  if (timerTextEl) {
    if (remaining < 300) {
      // Less than 5 minutes: warning color
      timerTextEl.className = 'timer-text timer-warning';
    } else {
      timerTextEl.className = 'timer-text';
    }
  }
}

// -------------------------------------------------------------
// Exam Action triggers (Next, Pause, Resume, Finish)
// -------------------------------------------------------------
export function pauseExam(): void {
  if (!state.activeSession) return;
  stopTimer();
  state.activeSession.isPaused = true;
  saveSessionToStorage();
  
  const mask = document.getElementById('exam-paused-mask');
  const body = document.getElementById('exam-question-body');
  const controls = document.getElementById('exam-controls-row');
  
  if (mask) mask.style.display = 'block';
  if (body) body.style.display = 'none';
  if (controls) controls.style.display = 'none';
  
  showToast('試験を一時停止しました。');
}

export function resumeExam(): void {
  if (!state.activeSession) return;
  
  // Recalculate startTime to shift forward by paused duration
  const elapsed = state.activeSession.elapsedSeconds;
  state.activeSession.startTime = Date.now() - (elapsed * 1000);
  state.activeSession.isPaused = false;
  saveSessionToStorage();
  
  runExamMode();
  showToast('試験を再開しました。');
}

export function renderActiveQuestion(): void {
  if (!state.activeSession) return;
  const currentIdx = state.activeSession.currentQuestionIndex;
  const q = state.activeSession.attemptedQuestions[currentIdx];
  
  const numEl = document.getElementById('current-question-num');
  const refEl = document.getElementById('current-question-ref');
  const textEl = document.getElementById('current-question-text');
  const solvedEl = document.getElementById('solved-count-display');
  const prevBtn = document.getElementById('prev-question-btn') as HTMLButtonElement;
  
  if (numEl) numEl.textContent = `大問 ${currentIdx + 1}`;
  if (refEl) refEl.textContent = `${q.subjectName} - ${q.chapterName} (${q.reference})`;
  if (textEl) textEl.textContent = q.text;
  if (solvedEl) solvedEl.textContent = String(state.activeSession.attemptedQuestions.length);
  
  if (prevBtn) {
    if (currentIdx === 0) {
      prevBtn.disabled = true;
      prevBtn.classList.add('btn-disabled');
    } else {
      prevBtn.disabled = false;
      prevBtn.classList.remove('btn-disabled');
    }
  }
  
  if (textEl && window.renderMathInElement) {
    window.renderMathInElement(textEl, {
      delimiters: [
        {left: '$$', right: '$$', display: true},
        {left: '$', right: '$', display: false}
      ]
    });
  }
}

export function prevQuestion(): void {
  if (!state.activeSession) return;
  if (state.activeSession.currentQuestionIndex > 0) {
    state.activeSession.currentQuestionIndex--;
    saveSessionToStorage();
    renderActiveQuestion();
  }
}

export function nextQuestion(): void {
  if (!state.activeSession) return;
  const currentIdx = state.activeSession.currentQuestionIndex;
  const attemptedCount = state.activeSession.attemptedQuestions.length;
  
  if (currentIdx === attemptedCount - 1) {
    // We are at the last generated question. Draw another one from remaining pool
    if (state.activeSession.questionPool.length <= 1) {
      // Re-shuffle to prevent running out of questions
      showToast('問題プールが少なくなったため、追加のシャッフルを行いました。');
      // For simplicity, we can clone attempted questions or just restart pool if empty
    }
    
    // Serve next question from pool
    const nextQ = state.activeSession.questionPool[attemptedCount];
    if (nextQ) {
      state.activeSession.attemptedQuestions.push(nextQ);
      state.activeSession.currentQuestionIndex++;
      saveSessionToStorage();
      renderActiveQuestion();
    } else {
      showToast('これ以上問題がありません。試験を終了してください。', 'warning');
    }
  } else {
    // Navigate forward in history
    state.activeSession.currentQuestionIndex++;
    saveSessionToStorage();
    renderActiveQuestion();
  }
}

export function finishExam(): void {
  if (!state.activeSession) return;
  if (!confirm('試験を終了して、解答のアップロードへ移りますか？')) {
    return;
  }
  
  stopTimer();
  state.activeSession.isFinished = true;
  saveSessionToStorage();
  
  renderMultiPreviewGallery();
  switchView('upload');
}

// -------------------------------------------------------------
// Image upload preview rendering
// -------------------------------------------------------------
export function renderMultiPreviewGallery(): void {
  if (!state.activeSession) return;
  const gallery = document.getElementById('multi-preview-gallery');
  if (!gallery) return;
  
  if (state.activeSession.images.length === 0) {
    gallery.innerHTML = '';
    return;
  }
  
  let html = '';
  state.activeSession.images.forEach((imgSrc, idx) => {
    html += `
      <div style="position: relative; width: 80px; height: 80px; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px; overflow: hidden;">
        <img src="${imgSrc}" style="width: 100%; height: 100%; object-fit: cover;" alt="Sheet ${idx + 1}">
        <div onclick="removeUploadedImage(event, ${idx})" style="position: absolute; top: 2px; right: 2px; background: rgba(239, 68, 68, 0.9); color: white; border-radius: 50%; width: 16px; height: 16px; font-size: 10px; display: flex; align-items: center; justify-content: center; font-weight: bold; cursor: pointer;">×</div>
      </div>
    `;
  });
  
  if (state.activeSession.images.length > 0) {
    html += `
      <button class="btn btn-secondary" onclick="clearAllImages(event)" style="padding: 0.2rem 0.5rem; font-size: 0.75rem; width: auto; height: 30px; align-self: center;">全部クリア</button>
    `;
  }
  
  gallery.innerHTML = html;
  const noteBox = document.getElementById('general-note-box') as HTMLTextAreaElement;
  if (noteBox) noteBox.value = state.activeSession.generalNote || '';
}

// -------------------------------------------------------------
// OCR Preread API step
// -------------------------------------------------------------
export async function runOcrPreRead(): Promise<void> {
  const apiKey = localStorage.getItem('gemini_api_key') || '';
  if (!apiKey) {
    showToast('診断を実行するにはAPIキーの設定が必要です。設定ボタンを開いてください。', 'warning');
    openModal('settings-modal');
    return;
  }
  
  if (!state.activeSession) return;
  
  if (state.activeSession.images.length === 0) {
    showToast('少なくとも1枚以上の解答用紙の写真を撮影・アップロードしてください。', 'warning');
    return;
  }
  
  const noteBox = document.getElementById('general-note-box') as HTMLTextAreaElement;
  state.activeSession.generalNote = noteBox ? noteBox.value.trim() : '';
  saveSessionToStorage();
  
  showLoader('文字起こし中...', 'Gemini AIがすべての解答用紙から計算式を文字起こししています。');
  
  try {
    const text = await ocrPreReadApi(
      apiKey,
      state.activeSession.images,
      state.activeSession.attemptedQuestions,
      state.activeSession.generalNote
    );
    
    state.activeSession.ocrTextUnified = text;
    saveSessionToStorage();
    
    hideLoader();
    renderOcrCorrection();
    switchView('correction');
    showToast('文字起こしが完了しました。修正を行ってください。');
    
  } catch (error: any) {
    hideLoader();
    showToast(`文字起こしプロセスでエラーが発生しました: ${error.message}`, 'danger');
    console.error(error);
  }
}

export function renderOcrCorrection(): void {
  if (!state.activeSession) return;
  const container = document.getElementById('ocr-disp-unified');
  const textarea = document.getElementById('ocr-textarea-unified') as HTMLTextAreaElement;
  const text = state.activeSession.ocrTextUnified || '';
  
  if (container) container.textContent = text;
  if (textarea) textarea.value = text;
  
  if (container && window.renderMathInElement) {
    window.renderMathInElement(container, {
      delimiters: [
        {left: '$$', right: '$$', display: true},
        {left: '$', right: '$', display: false}
      ]
    });
  }
}

export function startDirectInput(): void {
  if (!state.activeSession) return;
  state.activeSession.images = [];
  
  // Dynamically generate default text based on the number of questions in activeSession
  let defaultText = "";
  const totalQ = state.activeSession.attemptedQuestions ? state.activeSession.attemptedQuestions.length : 1;
  for (let i = 1; i <= totalQ; i++) {
    defaultText += `【大問${i}】\n\n\n`;
  }
  
  state.activeSession.ocrTextUnified = defaultText;
  saveSessionToStorage();
  
  renderOcrCorrection();
  switchView('correction');
  window.enterUnifiedEditMode();
  showToast('直接入力モードを開始しました。解答を入力してください。');
}

// -------------------------------------------------------------
// Final AI Diagnosis
// -------------------------------------------------------------
export async function runFinalDiagnosis(): Promise<void> {
  const apiKey = localStorage.getItem('gemini_api_key') || '';
  if (!apiKey) {
    showToast('診断を実行するにはAPIキーの設定が必要です。設定ボタンを開いてください。', 'warning');
    openModal('settings-modal');
    return;
  }
  
  if (!state.activeSession) return;
  
  showLoader('実力診断中...', 'Gemini AIが計算プロセスを論理分析し、学習プランを作成しています。');
  
  try {
    const rawResultText = await finalDiagnosisApi(
      apiKey,
      state.activeSession.attemptedQuestions,
      state.activeSession.ocrTextUnified,
      state.activeSession.elapsedSeconds
    );
    
    let textClean = rawResultText;
    if (textClean.includes('```')) {
      textClean = textClean.replace(/```json/g, '').replace(/```/g, '').trim();
    }
    
    const firstBrace = textClean.indexOf('{');
    const lastBrace = textClean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      textClean = textClean.substring(firstBrace, lastBrace + 1);
      textClean = cleanInvalidJsonBraces(textClean);
    }
    
    let reportData: DiagnosticReport;
    try {
      reportData = JSON.parse(textClean);
    } catch (parseError: any) {
      console.error("JSON parsing failed!");
      console.error("Failed JSON string:", textClean);
      throw new Error(`AIの採点結果（JSON形式）の解析に失敗しました。詳細な内容はブラウザのデベロッパーツール（コンソール）を確認してください。エラー: ${parseError.message}`);
    }

    state.activeSession.report = reportData;
    saveSessionToStorage();
    
    // Store in history for statistics dashboard
    const historyItem: HistoryItem = {
      id: 'test_' + Date.now(),
      timestamp: Date.now(),
      score: reportData.totalScore,
      maxScore: state.activeSession.attemptedQuestions.length * 25,
      attemptedCount: state.activeSession.attemptedQuestions.length,
      subjects: Array.from(new Set(state.activeSession.attemptedQuestions.map(q => q.subjectName || "数学"))),
      report: reportData,
      attemptedQuestions: state.activeSession.attemptedQuestions,
      images: state.activeSession.images,
      ocrTextUnified: state.activeSession.ocrTextUnified,
      generalNote: state.activeSession.generalNote,
      durationSeconds: state.activeSession.elapsedSeconds || 0
    };
    
    // We will save to history and email logs using GAS API
    const history = JSON.parse(localStorage.getItem('math_test_history') || '[]');
    history.push(historyItem);
    localStorage.setItem('math_test_history', JSON.stringify(history));
    
    // Trigger result email to GAS
    const sheetsUrl = localStorage.getItem('math_google_sheets_url');
    if (sheetsUrl) {
      const studentName = localStorage.getItem('math_student_name') || '未設定';
      const mode = localStorage.getItem('math_curriculum_mode') || 'junior_high';
      const elapsed = state.activeSession.elapsedSeconds || 0;
      const min = Math.floor(elapsed / 60);
      const sec = elapsed % 60;
      const duration = `${min}分${sec}秒`;
      
      const payload = {
        action: 'submit_exam_result', // Match revised explicit action in GAS
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
      
      sendResultEmailToGas(sheetsUrl, payload).catch(err => {
        console.error("Failed to submit result email to GAS:", err);
      });
    }
    
    hideLoader();
    renderReport();
    switchView('report');
    showToast('診断レポートが完成しました！', 'success');
    
  } catch (error: any) {
    hideLoader();
    showToast(`診断中にエラーが発生しました: ${error.message}`, 'danger');
    console.error(error);
  }
}

export function renderReport(): void {
  if (!state.activeSession || !state.activeSession.report) return;
  const report = state.activeSession.report;
  
  const attemptedCount = state.activeSession.attemptedQuestions.length;
  const maxScore = attemptedCount * 25;
  
  const scoreEl = document.getElementById('total-score');
  const maxEl = document.getElementById('max-score');
  const summaryEl = document.getElementById('attempted-summary');
  
  if (scoreEl) scoreEl.textContent = String(report.totalScore);
  if (maxEl) maxEl.textContent = String(maxScore);
  if (summaryEl) {
    summaryEl.textContent = `挑戦した問題数: ${attemptedCount}問 (完答: ${report.questions.filter(q => q.isCorrect).length}問)`;
  }
  
  const qContainer = document.getElementById('report-q-results');
  if (qContainer) {
    let qHtml = '';
    state.activeSession.attemptedQuestions.forEach((q, idx) => {
      let qReport = report.questions.find(qr => qr.id === q.id);
      if (!qReport && report.questions[idx]) {
        qReport = report.questions[idx];
      }
      if (!qReport) {
        qReport = { id: q.id, score: 0, isCorrect: false, commentary: 'AI採点データのマッピングに失敗しました。' };
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
    
    if (window.renderMathInElement) {
      window.renderMathInElement(qContainer, {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '$', right: '$', display: false}
        ]
      });
    }
  }
  
  const recCard = document.getElementById('recommendation-card');
  if (recCard) {
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
      window.renderMathInElement(recCard, {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '$', right: '$', display: false}
        ]
      });
    }
  }
}

export async function submitIssueReport(): Promise<void> {
  const select = document.getElementById('issue-type-select') as HTMLSelectElement;
  const issueTextEl = document.getElementById('issue-text-input') as HTMLTextAreaElement;
  
  if (!select || !issueTextEl) return;
  
  const type = select.value;
  const text = issueTextEl.value.trim();
  
  if (!text) {
    showToast('報告内容を入力してください。', 'warning');
    return;
  }
  
  const sheetsUrl = localStorage.getItem('math_google_sheets_url');
  if (!sheetsUrl) {
    showToast('連携用URLが設定されていないため送信できません。設定を確認してください。', 'warning');
    return;
  }
  
  showLoader('不具合を報告中...', '指導者へ不具合報告のメール通知を行っています。');
  
  try {
    const studentName = localStorage.getItem('math_student_name') || '未設定';
    let problemText = '';
    let aiReportText = '';
    
    if (state.activeSession) {
      const idx = state.activeSession.currentQuestionIndex;
      const q = state.activeSession.attemptedQuestions[idx];
      if (q) problemText = `問題名: ${q.subjectName}-${q.chapterName}\n問題内容: ${q.text}`;
      
      if (state.activeSession.report) {
        aiReportText = JSON.stringify(state.activeSession.report);
      }
    }
    
    const fullIssueText = `【不具合カテゴリ】: ${type}\n【詳細内容】:\n${text}`;
    
    await submitIssueReportToGas(sheetsUrl, studentName, fullIssueText, problemText, aiReportText);
    
    hideLoader();
    closeModal('report-modal');
    issueTextEl.value = '';
    showToast('不具合報告を送信しました。ご協力ありがとうございました。', 'success');
  } catch (err: any) {
    hideLoader();
    showToast(`送信エラー: ${err.message}`, 'danger');
  }
}

// -------------------------------------------------------------
// Bind Exam elements to window
// -------------------------------------------------------------
window.prevQuestion = prevQuestion;
window.nextQuestion = nextQuestion;
window.triggerMultiFileInput = () => {
  document.getElementById('multi-file-input')?.click();
};
// Parallel processing helper that preserves file select order
async function processFiles(files: FileList): Promise<string[]> {
  const promises = Array.from(files).map(file => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event: any) => {
        compressImage(event.target.result, 1200, 0.8)
          .then(resolve)
          .catch(reject);
      };
      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
      reader.readAsDataURL(file);
    });
  });
  return Promise.all(promises);
}

window.handleMultiFileSelect = async (e: any) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;
  
  showLoader('画像処理中...', '画像を正しい順番で圧縮して追加しています。');
  
  try {
    const compressedImages = await processFiles(files);
    if (!state.activeSession) return;
    
    state.activeSession.images = compressedImages;
    saveSessionToStorage();
    hideLoader();
    renderMultiPreviewGallery();
    showToast(`${compressedImages.length}枚の解答用紙を追加しました。`);
  } catch (err: any) {
    hideLoader();
    showToast(`画像処理に失敗しました: ${err.message}`, 'danger');
    console.error(err);
  }
};
window.removeUploadedImage = (e: any, idx: number) => {
  e.stopPropagation();
  if (state.activeSession) {
    state.activeSession.images.splice(idx, 1);
    saveSessionToStorage();
    renderMultiPreviewGallery();
    showToast('画像を削除しました。');
  }
};
window.clearAllImages = (e: any) => {
  e.stopPropagation();
  if (state.activeSession) {
    state.activeSession.images = [];
    saveSessionToStorage();
    renderMultiPreviewGallery();
    showToast('すべての画像をクリアしました。');
  }
};
window.enterUnifiedEditMode = () => {
  const disp = document.getElementById('ocr-disp-unified');
  const wrap = document.getElementById('ocr-edit-wrap-unified');
  const txt = document.getElementById('ocr-textarea-unified');
  
  if (disp) disp.style.display = 'none';
  if (wrap) wrap.style.display = 'block';
  if (txt) txt.focus();
};
window.cancelUnifiedEditMode = () => {
  const disp = document.getElementById('ocr-disp-unified');
  const wrap = document.getElementById('ocr-edit-wrap-unified');
  if (disp) disp.style.display = 'block';
  if (wrap) wrap.style.display = 'none';
};
window.saveUnifiedEditMode = () => {
  const txt = document.getElementById('ocr-textarea-unified') as HTMLTextAreaElement;
  if (!txt || !state.activeSession) return;
  
  state.activeSession.ocrTextUnified = txt.value;
  saveSessionToStorage();
  
  renderOcrCorrection();
  
  const disp = document.getElementById('ocr-disp-unified');
  const wrap = document.getElementById('ocr-edit-wrap-unified');
  if (disp) disp.style.display = 'block';
  if (wrap) wrap.style.display = 'none';
  showToast('解答テキストを保存・反映しました。');
};
window.closeReportModal = () => {
  closeModal('report-modal');
};
window.submitIssueReport = submitIssueReport;
