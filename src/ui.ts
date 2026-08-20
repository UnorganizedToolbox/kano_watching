import { ViewName, ToastType } from './types';

let viewsCached: Record<ViewName, HTMLElement> | null = null;

function getViews(): Record<ViewName, HTMLElement> {
  if (!viewsCached) {
    viewsCached = {
      setup: document.getElementById('setup-view')!,
      exam: document.getElementById('exam-view')!,
      upload: document.getElementById('upload-view')!,
      correction: document.getElementById('correction-view')!,
      report: document.getElementById('report-view')!,
      stats: document.getElementById('stats-view')!,
      pomodoro: document.getElementById('pomodoro-view')!,
      question: document.getElementById('question-view')!
    };
  }
  return viewsCached;
}

export function switchView(viewName: ViewName): void {
  const views = getViews();
  Object.keys(views).forEach(name => {
    const key = name as ViewName;
    if (key === viewName) {
      views[key].classList.add('active');
    } else {
      views[key].classList.remove('active');
    }
  });

  // Handle Main Tab bar visibility and active state
  const tabContainer = document.getElementById('app-main-tabs');
  if (tabContainer) {
    if (viewName === 'setup' || viewName === 'pomodoro' || viewName === 'question' || viewName === 'stats') {
      tabContainer.style.display = 'flex';
      
      // Deactivate all tab buttons
      document.getElementById('tab-exam-btn')?.classList.remove('active');
      document.getElementById('tab-pomodoro-btn')?.classList.remove('active');
      document.getElementById('tab-question-btn')?.classList.remove('active');
      
      // Activate corresponding tab button
      if (viewName === 'setup' || viewName === 'stats') {
        document.getElementById('tab-exam-btn')?.classList.add('active');
      } else if (viewName === 'pomodoro') {
        document.getElementById('tab-pomodoro-btn')?.classList.add('active');
      } else if (viewName === 'question') {
        document.getElementById('tab-question-btn')?.classList.add('active');
      }
    } else {
      tabContainer.style.display = 'none';
    }
  }

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
  
  toastTimeout = setTimeout(() => {
    toast.classList.remove('active');
  }, 3000);
}

export function applyCurriculumModeUI(): void {
  const mode = localStorage.getItem('math_curriculum_mode') || 'junior_high';
  const tabExam = document.getElementById('tab-exam-btn');
  const statsNavBtn = document.getElementById('stats-nav-btn');
  
  const schoolStats = document.getElementById('school-stats-container');
  const uniStats = document.getElementById('university-stats-container');
  
  if (mode === 'university') {
    // University Mode hides exam tab and shows university statistics dashboard
    if (tabExam) tabExam.style.display = 'none';
    if (schoolStats) schoolStats.style.display = 'none';
    if (uniStats) uniStats.style.display = 'block';
    
    // Auto route to pomodoro if we are in setup/exam and in university mode
    const activeView = document.querySelector('.view.active');
    if (activeView && (activeView.id === 'setup-view' || activeView.id === 'exam-view')) {
      switchView('pomodoro');
    }
  } else {
    // School mode (Junior / High school) shows exam tab
    if (tabExam) tabExam.style.display = 'inline-block';
    if (schoolStats) schoolStats.style.display = 'block';
    if (uniStats) uniStats.style.display = 'none';
  }
}
