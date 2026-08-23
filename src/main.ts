import { state } from './state';
import { APP_PASSCODE } from './constants';
import { showToast, switchView, applyCurriculumModeUI } from './ui';
import { preventMobileZoom } from './utils';
import {
  loadApiKey,
  saveApiKey,
  testApiConnection,
  testProgramExecution,
  changePassword,
  setRenderSubjectSelector,
  setupAuthHandlers,
  logoutStudent
} from './settings';
import { renderDashboard, initStatsPage, clearHistory } from './stats';
import {
  startExam,
  prevQuestion,
  nextQuestion,
  finishExam,
  pauseExam,
  resumeExam,
  stopTimer,
  runOcrPreRead,
  runFinalDiagnosis,
  startDirectInput,
  restoreSession
} from './exam';
import { setupPomodoroHandlers, renderPomoSubjects, saveAndLogOnClose, initPomodoroUI, stopPomoOnLeave } from './pomo';
import { setupQuestionHandlers, initQuestionUI } from './question';
import { setupDebugHandlers } from './debug';

declare global {
  interface Window {
    submitPasscode: () => void;
    toggleUnitList: (subKey: string) => void;
  }
}

// -------------------------------------------------------------
// UI Rendering - Setup View Subjects list
// -------------------------------------------------------------
export function renderSubjectSelector(): void {
  const container = document.getElementById('subject-selector');
  if (!container) return;
  
  const mode = localStorage.getItem('math_curriculum_mode') || 'junior_high';
  const subjectsSrc = state.questionsDb ? state.questionsDb[mode] : null;
  
  if (!subjectsSrc || !subjectsSrc.subjects) {
    container.innerHTML = '<p class="text-muted">利用可能な問題データがありません。</p>';
    return;
  }
  
  let html = '';
  
  for (const [subKey, subject] of Object.entries<any>(subjectsSrc.subjects)) {
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
    
    for (const [chapKey, chapter] of Object.entries<any>(subject.chapters)) {
      html += `<div style="margin: 0.5rem 0 0.2rem 0; font-size: 0.85rem; font-weight: bold; color: var(--text-primary);">${chapter.name}</div>`;
      
      for (const [unitKey, unit] of Object.entries<any>(chapter.units)) {
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

export function toggleUnitList(subKey: string): void {
  const list = document.getElementById(`units-${subKey}`);
  const chevron = document.getElementById(`chevron-${subKey}`);
  if (!list || !chevron) return;
  
  if (list.classList.contains('active')) {
    list.classList.remove('active');
    chevron.textContent = '▶';
  } else {
    list.classList.add('active');
    chevron.textContent = '▼';
  }
}

// Bind to window for HTML click handlers
window.toggleUnitList = toggleUnitList;

// -------------------------------------------------------------
// Passcode Authentication
// -------------------------------------------------------------
export function checkPasscode(): void {
  const saved = localStorage.getItem('math_app_passcode');
  const screen = document.getElementById('passcode-screen');
  if (screen) {
    if (saved === APP_PASSCODE) {
      screen.style.display = 'none';
    } else {
      screen.style.display = 'flex';
    }
  }
}

export function submitPasscode(): void {
  const input = document.getElementById('passcode-input') as HTMLInputElement;
  if (!input) return;
  
  const code = input.value.trim();
  if (code === APP_PASSCODE) {
    localStorage.setItem('math_app_passcode', code);
    const screen = document.getElementById('passcode-screen');
    if (screen) screen.style.display = 'none';
    showToast('認証に成功しました！', 'success');
  } else {
    showToast('パスコードが正しくありません。', 'danger');
    input.value = '';
  }
}

window.submitPasscode = submitPasscode;

// -------------------------------------------------------------
// Event Listeners registration
// -------------------------------------------------------------
function setupEventListeners(): void {
  // Passcode listeners
  document.getElementById('submit-passcode-btn')?.addEventListener('click', window.submitPasscode);
  document.getElementById('passcode-input')?.addEventListener('keypress', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      window.submitPasscode();
    }
  });

  // ─── Portal Menu Card Navigation ───
  document.getElementById('portal-goto-dashboard-btn')?.addEventListener('click', () => {
    renderDashboard();
    switchView('dashboard');
  });
  document.getElementById('portal-goto-exam-btn')?.addEventListener('click', () => {
    stopPomoOnLeave();
    switchView('setup');
  });
  document.getElementById('portal-goto-stats-btn')?.addEventListener('click', () => {
    initStatsPage();
    switchView('stats');
  });
  document.getElementById('portal-goto-pomodoro-btn')?.addEventListener('click', () => {
    switchView('pomodoro');
  });
  document.getElementById('portal-goto-question-btn')?.addEventListener('click', () => {
    stopPomoOnLeave();
    switchView('question');
    initQuestionUI();
  });
  document.getElementById('portal-goto-settings-btn')?.addEventListener('click', () => {
    loadApiKey();
    switchView('settings');
  });
  document.getElementById('portal-goto-debug-btn')?.addEventListener('click', () => {
    switchView('debug');
  });

  // ─── Header ☰ Menu button → returns to portal ───
  document.getElementById('menu-nav-btn')?.addEventListener('click', () => {
    if (state.activeSession && !state.activeSession.isFinished) {
      showToast('テスト実施中はメニューに戻れません。', 'warning');
      return;
    }
    stopPomoOnLeave();
    switchView('portal');
  });

  // ─── Exam Flow ───
  document.getElementById('start-exam-btn')?.addEventListener('click', startExam);
  document.getElementById('prev-question-btn')?.addEventListener('click', prevQuestion);
  document.getElementById('next-question-btn')?.addEventListener('click', nextQuestion);
  document.getElementById('finish-exam-btn')?.addEventListener('click', finishExam);
  document.getElementById('pause-exam-btn')?.addEventListener('click', pauseExam);
  document.getElementById('resume-exam-btn')?.addEventListener('click', resumeExam);
  
  document.getElementById('ocr-submit-btn')?.addEventListener('click', runOcrPreRead);
  document.getElementById('correction-cancel-btn')?.addEventListener('click', () => switchView('upload'));
  document.getElementById('correction-submit-btn')?.addEventListener('click', runFinalDiagnosis);
  document.getElementById('report-close-btn')?.addEventListener('click', () => {
    renderDashboard();
    switchView('dashboard');
  });
  document.getElementById('abort-exam-btn')?.addEventListener('click', () => {
    if (confirm('テストを中断し、解答データを破棄してホームに戻りますか？')) {
      stopTimer();
      localStorage.removeItem('math_test_session');
      state.activeSession = null;
      switchView('portal');
      showToast('テストを中断しました。');
    }
  });
  document.getElementById('direct-input-btn')?.addEventListener('click', startDirectInput);

  // ─── Settings View ───
  document.getElementById('back-settings-btn')?.addEventListener('click', () => switchView('portal'));
  document.getElementById('back-stats-btn')?.addEventListener('click', () => switchView('portal'));
  document.getElementById('save-settings-btn')?.addEventListener('click', saveApiKey);
  document.getElementById('test-connection-btn')?.addEventListener('click', testApiConnection);
  document.getElementById('test-program-btn')?.addEventListener('click', testProgramExecution);
  document.getElementById('change-password-btn')?.addEventListener('click', changePassword);
  document.getElementById('settings-logout-btn')?.addEventListener('click', logoutStudent);

  // ─── Dashboard History ───
  document.getElementById('clear-history-btn')?.addEventListener('click', clearHistory);

  // ─── Debug back button ───
  document.getElementById('back-debug-btn')?.addEventListener('click', () => switchView('portal'));

  // ─── Bug Report Floating Button ───
  document.getElementById('bug-report-trigger')?.addEventListener('click', () => {
    const modal = document.getElementById('bug-report-modal');
    if (modal) modal.style.display = 'flex';
  });
  document.getElementById('bug-report-cancel-btn')?.addEventListener('click', () => {
    const modal = document.getElementById('bug-report-modal');
    if (modal) modal.style.display = 'none';
  });
  document.getElementById('bug-report-submit-btn')?.addEventListener('click', async () => {
    const textarea = document.getElementById('bug-report-textarea') as HTMLTextAreaElement;
    const content = textarea?.value.trim();
    if (!content) {
      showToast('報告内容を入力してください。', 'warning');
      return;
    }
    const studentName = localStorage.getItem('math_student_name') || '匿名';
    try {
      await fetch('/api/gas', {
        method: 'POST',
        body: JSON.stringify({ action: 'report_bug', studentName, description: content })
      });
      showToast('不具合報告を送信しました。', 'success');
      if (textarea) textarea.value = '';
      const modal = document.getElementById('bug-report-modal');
      if (modal) modal.style.display = 'none';
    } catch {
      showToast('送信に失敗しました。', 'danger');
    }
  });

  // ─── Sub-systems ───
  setupPomodoroHandlers();
  setupQuestionHandlers();
  setupDebugHandlers();
  setupAuthHandlers();
}

// -------------------------------------------------------------
// App Initializer
// -------------------------------------------------------------
async function initApp(): Promise<void> {
  // Bind subject selector rendering back to settings
  setRenderSubjectSelector(renderSubjectSelector);
  
  loadApiKey();
  setupEventListeners();
  
  // Check login state
  const studentId = localStorage.getItem('math_student_id') || '';
  const studentName = localStorage.getItem('math_student_name') || '';
  
  if (!studentId) {
    // Force switch to Auth screen
    switchView('auth');
  } else {
    // Update settings view inputs with logged-in user details
    const studentNameInput = document.getElementById('student-name-input') as HTMLInputElement;
    if (studentNameInput) {
      studentNameInput.value = studentName;
      studentNameInput.disabled = true;
    }
    const idDisplay = document.getElementById('settings-student-id-display');
    if (idDisplay) {
      idDisplay.textContent = studentId;
    }
    
    // Show Admin debug entry if Admin account
    if (studentName === 'Admin') {
      const adminEntry = document.getElementById('portal-admin-debug-entry');
      if (adminEntry) adminEntry.style.display = 'block';
    }
  }
  
  // Load questions database
  try {
    const response = await fetch('questions.json');
    if (!response.ok) throw new Error('Failed to load questions database.');
    state.questionsDb = await response.json();
    renderSubjectSelector();
    
    // Render Statistics Dashboard (Heatmap + History)
    renderDashboard();
    applyCurriculumModeUI();
    renderPomoSubjects();
    initPomodoroUI();
    initQuestionUI();
    
    // Check if there is an active session in progress
    restoreSession();
  } catch (error) {
    showToast('問題データの読み込みに失敗しました。ラズパイ上のファイルを確認してください。', 'danger');
    console.error(error);
  }
}

// -------------------------------------------------------------
// Lifecycle triggers
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  checkPasscode();
  initApp();
  preventMobileZoom();
});

// Auto-save Pomodoro state on tab hide/close
window.addEventListener('pagehide', () => {
  saveAndLogOnClose();
});

