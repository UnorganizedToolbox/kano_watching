import { state } from './state';
import { APP_PASSCODE } from './constants';
import { showToast, switchView, openModal, closeModal, applyCurriculumModeUI } from './ui';
import { preventMobileZoom } from './utils';
import {
  loadApiKey,
  saveApiKey,
  testApiConnection,
  testProgramExecution,
  syncTextbookMapping,
  autoSyncTextbookMapping,
  setRenderSubjectSelector,
  setupAuthHandlers,
  logoutStudent
} from './settings';
import { renderDashboard, initStatsPage, clearHistory, exportBackup } from './stats';
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
  restoreSession,
  resetSession
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
  // Tab Navigation click handlers
  document.getElementById('tab-exam-btn')?.addEventListener('click', () => {
    stopPomoOnLeave();
    switchView('setup');
  });
  document.getElementById('tab-pomodoro-btn')?.addEventListener('click', () => switchView('pomodoro'));
  document.getElementById('tab-question-btn')?.addEventListener('click', () => {
    stopPomoOnLeave();
    switchView('question');
    initQuestionUI();
  });

  // Passcode listeners
  document.getElementById('submit-passcode-btn')?.addEventListener('click', window.submitPasscode);
  document.getElementById('passcode-input')?.addEventListener('keypress', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      window.submitPasscode();
    }
  });

  // Navigation button handlers
  document.getElementById('start-exam-btn')?.addEventListener('click', startExam);
  document.getElementById('prev-question-btn')?.addEventListener('click', prevQuestion);
  document.getElementById('next-question-btn')?.addEventListener('click', nextQuestion);
  document.getElementById('finish-exam-btn')?.addEventListener('click', finishExam);
  document.getElementById('pause-exam-btn')?.addEventListener('click', pauseExam);
  document.getElementById('resume-exam-btn')?.addEventListener('click', resumeExam);
  
  document.getElementById('start-ocr-btn')?.addEventListener('click', runOcrPreRead);
  document.getElementById('back-to-upload-btn')?.addEventListener('click', () => switchView('upload'));
  document.getElementById('submit-diagnostic-btn')?.addEventListener('click', runFinalDiagnosis);
  document.getElementById('download-pdf-btn')?.addEventListener('click', () => window.print());
  document.getElementById('restart-app-btn')?.addEventListener('click', resetSession);
  document.getElementById('abort-exam-btn')?.addEventListener('click', resetSession);
  
  // Cancel Exam / Upload handlers to escape without AI evaluation
  const cancelExamHandler = () => {
    if (confirm('テストを中断し、解答データを破棄してホームに戻りますか？（保存されていないデータは失われます）')) {
      stopTimer();
      localStorage.removeItem('math_test_session');
      state.activeSession = null;
      switchView('setup');
      showToast('テストを中断しました。');
    }
  };
  document.getElementById('cancel-upload-btn')?.addEventListener('click', cancelExamHandler);
  document.getElementById('cancel-exam-btn')?.addEventListener('click', cancelExamHandler);

  // Pomodoro Hide remaining time handler
  const hideCheckbox = document.getElementById('pomo-hide-time-checkbox') as HTMLInputElement;
  if (hideCheckbox) {
    hideCheckbox.addEventListener('change', (e: any) => {
      const display = document.getElementById('pomo-display');
      if (display) {
        if (e.target.checked) {
          display.classList.add('blurred');
        } else {
          display.classList.remove('blurred');
        }
      }
    });
  }
  
  // Settings & Backup handlers
  document.getElementById('settings-btn')?.addEventListener('click', () => openModal('settings-modal'));
  document.getElementById('close-settings-btn')?.addEventListener('click', () => closeModal('settings-modal'));
  document.getElementById('save-settings-btn')?.addEventListener('click', saveApiKey);
  document.getElementById('test-connection-btn')?.addEventListener('click', testApiConnection);
  document.getElementById('test-program-btn')?.addEventListener('click', testProgramExecution);
  document.getElementById('stats-nav-btn')?.addEventListener('click', () => {
    switchView('stats');
    initStatsPage();
  });
  
  document.getElementById('export-backup-btn')?.addEventListener('click', exportBackup);
  document.getElementById('sync-textbook-btn')?.addEventListener('click', syncTextbookMapping);
  document.getElementById('clear-history-btn')?.addEventListener('click', clearHistory);
  
  document.getElementById('report-issue-btn')?.addEventListener('click', () => {
    const desc = document.getElementById('report-desc-input') as HTMLInputElement;
    if (desc) desc.value = '';
    stopTimer();
    openModal('report-modal');
  });
  
  document.getElementById('direct-input-btn')?.addEventListener('click', startDirectInput);

  // Close modal when clicking outside
  document.getElementById('settings-modal')?.addEventListener('click', (e: any) => {
    if (e.target.id === 'settings-modal') closeModal('settings-modal');
  });

  // LMS Handlers
  setupPomodoroHandlers();
  setupQuestionHandlers();
  setupDebugHandlers();

  // Auth Handlers
  setupAuthHandlers();
  document.getElementById('settings-logout-btn')?.addEventListener('click', logoutStudent);
}

// -------------------------------------------------------------
// App Initializer
// -------------------------------------------------------------
async function initApp(): Promise<void> {
  // Synchronize Vite environment variable for GAS URL to localStorage automatically
  const envGasUrl = import.meta.env.VITE_GAS_URL;
  if (envGasUrl) {
    localStorage.setItem('math_google_sheets_url', envGasUrl);
  }

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
    // Update settings modal inputs with logged-in user details
    const studentNameInput = document.getElementById('student-name-input') as HTMLInputElement;
    if (studentNameInput) {
      studentNameInput.value = studentName;
      studentNameInput.disabled = true;
    }
    const idDisplay = document.getElementById('settings-student-id-display');
    if (idDisplay) {
      idDisplay.textContent = studentId;
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

