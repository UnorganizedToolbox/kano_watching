import { ViewName, ToastType } from './types';

let viewsCached: Record<ViewName, HTMLElement> | null = null;

function getViews(): Record<ViewName, HTMLElement> {
  if (!viewsCached) {
    viewsCached = {
      auth: document.getElementById('auth-view')!,
      portal: document.getElementById('portal-view')!,
      dashboard: document.getElementById('dashboard-view')!,
      setup: document.getElementById('setup-view')!,
      exam: document.getElementById('exam-view')!,
      upload: document.getElementById('upload-view')!,
      correction: document.getElementById('correction-view')!,
      report: document.getElementById('report-view')!,
      stats: document.getElementById('stats-view')!,
      pomodoro: document.getElementById('pomodoro-view')!,
      question: document.getElementById('question-view')!,
      settings: document.getElementById('settings-view')!,
      debug: document.getElementById('debug-view')!
    };
  }
  return viewsCached!;
}

export function switchView(viewName: ViewName): void {
  // If not logged in, force 'auth' view regardless of destination
  const loggedIn = !!localStorage.getItem('math_student_id');
  const targetView = loggedIn ? viewName : 'auth';

  const views = getViews();
  Object.keys(views).forEach(name => {
    const key = name as ViewName;
    if (key === targetView) {
      views[key].classList.add('active');
    } else {
      views[key].classList.remove('active');
    }
  });

  // Handle Header visibility
  const appHeader = document.getElementById('app-header');
  const menuBtn = document.getElementById('menu-nav-btn');
  const statsBtn = document.getElementById('stats-nav-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const accountDisplay = document.getElementById('header-account-display');

  if (appHeader) {
    if (targetView === 'auth') {
      appHeader.style.display = 'none';
    } else {
      appHeader.style.display = 'flex';
      
      // Update header username
      const studentName = localStorage.getItem('math_student_name') || '未設定';
      const studentId = localStorage.getItem('math_student_id') || '';
      if (accountDisplay) {
        accountDisplay.textContent = `👤 ${studentName} (${studentId}) ▼`;
      }
      
      // Strict Navigation Lock (Hide menu/settings/stats buttons during exam session)
      const isExamActive = (targetView === 'exam' || targetView === 'upload' || targetView === 'correction');
      
      if (menuBtn) menuBtn.style.display = isExamActive ? 'none' : 'flex';
      if (statsBtn) statsBtn.style.display = isExamActive ? 'none' : 'inline-block';
      if (settingsBtn) settingsBtn.style.display = isExamActive ? 'none' : 'inline-block';
    }
  }

  // Always scroll to top on transition
  window.scrollTo(0, 0);
}

export function openModal(id: string): void {
  document.getElementById(id)?.classList.add('active');
}

export function closeModal(id: string): void {
  document.getElementById(id)?.classList.remove('active');
}

// Loader UI helpers
export function showLoader(title: string, description?: string): void {
  const titleEl = document.getElementById('loading-title');
  const descEl = document.getElementById('loading-desc');
  const screenEl = document.getElementById('loading-screen');
  
  if (titleEl) titleEl.textContent = title;
  if (descEl) descEl.textContent = description || '';
  if (screenEl) screenEl.classList.add('active');
}

export function updateLoaderText(title: string): void {
  const titleEl = document.getElementById('loading-title');
  if (titleEl) titleEl.textContent = title;
}

export function hideLoader(): void {
  document.getElementById('loading-screen')?.classList.remove('active');
}

// Toast notification helper
let toastTimeout: number | null = null;
export function showToast(message: string, type: ToastType = 'info'): void {
  const toast = document.getElementById('toast-notify');
  if (!toast) return;
  
  toast.textContent = message;
  
  // Reset border colors
  toast.style.borderColor = '';
  
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
  
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }
  
  toastTimeout = window.setTimeout(() => {
    toast.classList.remove('active');
  }, 3000);
}

export function applyCurriculumModeUI(): void {
  const isDev = localStorage.getItem('math_student_name') === 'Admin';
  if (isDev) {
    switchView('debug');
  } else {
    switchView('portal');
  }
}
