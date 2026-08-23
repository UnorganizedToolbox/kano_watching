import { state } from './state';
import { DEFAULT_POMO_SUBJECTS } from './constants';
import { showToast, switchView } from './ui';
import { formatPomoTime } from './utils';
import { initAudio, unlockAudio, startBgmPlayback, pauseBgmPlayback, resumeBgmPlayback, stopBgmPlayback, playPomoAlert, registerTimeUpdateCallback } from './audio';
import { logPomodoroEventToGas, syncPomodoroLogsFromGas } from './api';

export function initPomodoroUI(): void {
  if (state.pomoTimerInterval) {
    clearInterval(state.pomoTimerInterval);
    state.pomoTimerInterval = null;
  }
  state.pomoState = 'idle';
  state.pomoSecondsLeft = 25 * 60;
  state.pomoAccumulatedSeconds = 0;
  
  const pomoDisplay = document.getElementById('pomo-display');
  const debugDisplay = document.getElementById('debug-pomo-display');
  const pomoMemoInput = document.getElementById('pomo-memo-input') as HTMLInputElement;
  
  if (pomoDisplay) pomoDisplay.textContent = "25:00";
  if (debugDisplay) debugDisplay.textContent = "25:00";
  if (pomoMemoInput) pomoMemoInput.value = "";
  
  updatePomoUIState();
}

export function updatePomoUIState(): void {
  const statusEl = document.getElementById('pomo-status');
  const debugStatusEl = document.getElementById('debug-pomo-status');
  
  const updateStatus = (el: HTMLElement) => {
    el.className = 'pomo-status-pill';
    
    if (state.pomoState === 'idle') {
      el.textContent = '現在の状態: 未開始';
      el.classList.add('pomo-status-idle');
    } else if (state.pomoState === 'work') {
      el.textContent = '現在の状態: 作業中 📝';
      el.classList.add('pomo-status-work');
    } else if (state.pomoState === 'work_paused') {
      el.textContent = '現在の状態: 作業一時停止中 ⏸️';
      el.classList.add('pomo-status-paused');
    } else if (state.pomoState === 'break') {
      el.textContent = '現在の状態: 休憩中 ☕';
      el.classList.add('pomo-status-break');
    } else if (state.pomoState === 'break_paused') {
      el.textContent = '現在の状態: 休憩一時停止中 ⏸️';
      el.classList.add('pomo-status-paused');
    } else if (state.pomoState === 'work_complete') {
      el.textContent = '作業終了！☕ 休憩を開始してください';
      el.classList.add('pomo-status-paused');
    } else if (state.pomoState === 'break_complete') {
      el.textContent = '休憩終了！🚀 作業を開始してください';
      el.classList.add('pomo-status-work');
    }
  };
  
  if (statusEl) updateStatus(statusEl);
  if (debugStatusEl) updateStatus(debugStatusEl);

  const startBtn = document.getElementById('pomo-start-btn');
  const pauseBtn = document.getElementById('pomo-pause-btn');
  const resumeBtn = document.getElementById('pomo-resume-btn');
  const breakBtn = document.getElementById('pomo-break-btn');
  const stopBtn = document.getElementById('pomo-stop-btn');
  const devBtn = document.getElementById('pomo-dev-test-btn');

  if (startBtn && pauseBtn && resumeBtn && breakBtn && stopBtn) {
    [startBtn, pauseBtn, resumeBtn, breakBtn, stopBtn].forEach(btn => btn.style.display = 'none');
    if (devBtn) devBtn.style.display = 'none';

    const studentName = localStorage.getItem('math_student_name') || '';
    const isDev = (studentName === 'Admin');

    if (state.pomoState === 'idle') {
      startBtn.style.display = 'inline-block';
      startBtn.textContent = '🚀 作業開始';
      if (isDev && devBtn) devBtn.style.display = 'inline-block';
    } else if (state.pomoState === 'work') {
      pauseBtn.style.display = 'inline-block';
      breakBtn.style.display = 'inline-block';
      stopBtn.style.display = 'inline-block';
      if (isDev && devBtn) devBtn.style.display = 'inline-block';
    } else if (state.pomoState === 'work_paused') {
      resumeBtn.style.display = 'inline-block';
      stopBtn.style.display = 'inline-block';
    } else if (state.pomoState === 'break') {
      pauseBtn.style.display = 'inline-block';
      startBtn.style.display = 'inline-block';
      startBtn.textContent = '🚀 作業開始';
      stopBtn.style.display = 'inline-block';
      if (isDev && devBtn) devBtn.style.display = 'inline-block';
    } else if (state.pomoState === 'break_paused') {
      resumeBtn.style.display = 'inline-block';
      stopBtn.style.display = 'inline-block';
    } else if (state.pomoState === 'work_complete') {
      breakBtn.style.display = 'inline-block';
      stopBtn.style.display = 'inline-block';
    } else if (state.pomoState === 'break_complete') {
      startBtn.style.display = 'inline-block';
      startBtn.textContent = '🚀 作業開始';
      stopBtn.style.display = 'inline-block';
    }
  }
}

export function saveLocalPomoLog(payload: any): void {
  const logs = JSON.parse(localStorage.getItem('math_pomodoro_history') || '[]');
  logs.push(payload);
  localStorage.setItem('math_pomodoro_history', JSON.stringify(logs));
}

export async function syncPomodoroLogsFromSheet(): Promise<void> {
  const sheetsUrl = localStorage.getItem('math_google_sheets_url');
  if (!sheetsUrl) return;
  
  const studentName = localStorage.getItem('math_student_name') || '未設定';
  
  try {
    const logs = await syncPomodoroLogsFromGas(sheetsUrl, studentName);
    const localLogs = JSON.parse(localStorage.getItem('math_pomodoro_history') || '[]');
    const timestamps = new Set(localLogs.map((l: any) => l.timestamp));
    let newCount = 0;
    
    logs.forEach(log => {
      if (!timestamps.has(log.timestamp)) {
        localLogs.push(log);
        newCount++;
      }
    });
    
    if (newCount > 0) {
      localLogs.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      localStorage.setItem('math_pomodoro_history', JSON.stringify(localLogs));
      console.log(`Synced ${newCount} new Pomodoro logs from sheet.`);
    }
  } catch (err) {
    console.error("Failed to sync Pomodoro logs from sheet:", err);
  }
}

export async function logPomodoroEvent(event: string, elapsedSec: number, lagSec: number = 0): Promise<void> {
  const studentName = localStorage.getItem('math_student_name') || '未設定';
  const payload = {
    action: 'pomodoro_log',
    timestamp: new Date().toLocaleString('ja-JP'),
    studentName: studentName,
    subject: state.pomoSelectedSubject,
    event: event,
    elapsedSeconds: elapsedSec,
    lagSeconds: lagSec,
    memo: state.pomoMemo
  };

  saveLocalPomoLog(payload);

  const sheetsUrl = localStorage.getItem('math_google_sheets_url');
  if (!sheetsUrl) return;

  try {
    await logPomodoroEventToGas(sheetsUrl, payload);
    console.log("Logged pomodoro event:", event, "with elapsed:", elapsedSec, "lag:", lagSec);
  } catch (err) {
    console.error("Failed to log pomodoro event:", err);
  }
}

export function tickPomoTimer(): void {
  if (state.pomoState !== 'work' && state.pomoState !== 'break') return;

  const elapsedRealSeconds = Math.floor((Date.now() - state.pomoStateStartTime) / 1000);
  const nextSecondsLeft = state.pomoTimerStartSecondsLeft - elapsedRealSeconds;
  
  if (nextSecondsLeft !== state.pomoSecondsLeft) {
    state.pomoSecondsLeft = nextSecondsLeft >= 0 ? nextSecondsLeft : 0;
    
    // Calculate accumulated seconds for log
    const prevAccumulated = state.pomoAccumulatedSeconds;
    state.pomoAccumulatedSeconds = Math.max(prevAccumulated, state.pomoTimerStartSecondsLeft - state.pomoSecondsLeft);
    
    const displayEl = document.getElementById('pomo-display');
    const debugDisplayEl = document.getElementById('debug-pomo-display');
    const timeText = formatPomoTime(state.pomoSecondsLeft);
    
    if (state.pomoSecondsLeft > 0) {
      if (displayEl) displayEl.textContent = timeText;
      if (debugDisplayEl) debugDisplayEl.textContent = timeText;
    } else {
      if (state.pomoTimerInterval) {
        clearInterval(state.pomoTimerInterval);
        state.pomoTimerInterval = null;
      }
      
      playPomoAlert();
      state.pomoZeroTimestamp = Date.now();
      
      if (state.pomoState === 'work') {
        logPomodoroEvent('一時停止', state.pomoAccumulatedSeconds, 0);
        state.pomoState = 'work_complete';
        state.pomoSecondsLeft = 5 * 60;
      } else if (state.pomoState === 'break') {
        logPomodoroEvent('一時停止', state.pomoAccumulatedSeconds, 0);
        state.pomoState = 'break_complete';
        state.pomoSecondsLeft = 25 * 60;
      }
      
      const newTimeText = formatPomoTime(state.pomoSecondsLeft);
      if (displayEl) displayEl.textContent = newTimeText;
      if (debugDisplayEl) debugDisplayEl.textContent = newTimeText;
      updatePomoUIState();
    }
  }
}

export function startPomoTimerTick(): void {
  if (state.pomoTimerInterval) {
    clearInterval(state.pomoTimerInterval);
  }
  
  startBgmPlayback();
  
  state.pomoStateStartTime = Date.now();
  state.pomoTimerStartSecondsLeft = state.pomoSecondsLeft;
  
  // Register HTML5 audio timeupdate events for background ticking
  registerTimeUpdateCallback(tickPomoTimer);
  
  // Foreground smooth setInterval ticking
  state.pomoTimerInterval = window.setInterval(tickPomoTimer, 1000);
}

export function saveAndLogOnClose(): void {
  if ((state.pomoState === 'work' || state.pomoState === 'break') && state.pomoAccumulatedSeconds > 0) {
    const eventName = (state.pomoState === 'work') ? '自動一時停止（離脱）' : '自動休憩一時停止（離脱）';
    const sheetsUrl = localStorage.getItem('math_google_sheets_url');
    if (sheetsUrl) {
      const studentName = localStorage.getItem('math_student_name') || '未設定';
      const payload = {
        action: 'pomodoro_log',
        timestamp: new Date().toLocaleString('ja-JP'),
        studentName: studentName,
        subject: state.pomoSelectedSubject,
        event: eventName,
        elapsedSeconds: state.pomoAccumulatedSeconds,
        lagSeconds: 0,
        memo: state.pomoMemo + ' (ブラウザ終了/タブ切替による自動記録)'
      };
      
      fetch(sheetsUrl, {
        method: 'POST',
        mode: 'no-cors',
        keepalive: true,
        body: JSON.stringify(payload)
      });
      
      if (state.pomoTimerInterval) {
        clearInterval(state.pomoTimerInterval);
        state.pomoTimerInterval = null;
      }
      state.pomoState = (state.pomoState === 'work') ? 'work_paused' : 'break_paused';
      state.pomoSecondsLeft = state.pomoTimerStartSecondsLeft - Math.floor((Date.now() - state.pomoStateStartTime) / 1000);
      if (state.pomoSecondsLeft < 0) state.pomoSecondsLeft = 0;
      state.pomoAccumulatedSeconds = 0;
      updatePomoUIState();
    }
  }
}

export function stopPomoOnLeave(): void {
  if (state.pomoState !== 'idle') {
    if (state.pomoTimerInterval) {
      clearInterval(state.pomoTimerInterval);
      state.pomoTimerInterval = null;
    }
    let lagSec = 0;
    if ((state.pomoState === 'work_complete' || state.pomoState === 'break_complete') && state.pomoZeroTimestamp > 0) {
      lagSec = Math.round((Date.now() - state.pomoZeroTimestamp) / 1000);
    }
    logPomodoroEvent('終了', state.pomoAccumulatedSeconds, lagSec);
    state.pomoState = 'idle';
    state.pomoSecondsLeft = 25 * 60;
    state.pomoAccumulatedSeconds = 0;
    state.pomoZeroTimestamp = 0;
    
    const displayEl = document.getElementById('pomo-display');
    if (displayEl) displayEl.textContent = "25:00";
    updatePomoUIState();
  }
}

export function renderPomoSubjects(): void {
  const select = document.getElementById('pomo-subject-select') as HTMLSelectElement;
  if (!select) return;
  
  const currentVal = select.value;
  select.innerHTML = '';
  
  DEFAULT_POMO_SUBJECTS.forEach(sub => {
    const opt = document.createElement('option');
    opt.value = sub;
    opt.textContent = sub;
    select.appendChild(opt);
  });
  
  const customSubjects = JSON.parse(localStorage.getItem('math_custom_subjects') || '[]');
  customSubjects.forEach((sub: string) => {
    const opt = document.createElement('option');
    opt.value = sub;
    opt.textContent = sub;
    select.appendChild(opt);
  });
  
  if (currentVal && select.querySelector(`option[value="${currentVal}"]`)) {
    select.value = currentVal;
  }
  
  toggleSubjectDeleteLink();
}

export function toggleSubjectDeleteLink(): void {
  const select = document.getElementById('pomo-subject-select') as HTMLSelectElement;
  const link = document.getElementById('pomo-subject-delete-link');
  if (!select || !link) return;
  
  const isCustom = !DEFAULT_POMO_SUBJECTS.includes(select.value);
  link.style.display = isCustom ? 'inline-block' : 'none';
}

export function setupPomodoroHandlers(): void {
  const selectEl = document.getElementById('pomo-subject-select');
  if (selectEl) {
    selectEl.addEventListener('change', () => {
      toggleSubjectDeleteLink();
    });
  }
  
  const addBtn = document.getElementById('pomo-add-subject-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const name = prompt('追加する新しい科目名を入力してください：');
      if (!name) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      
      const customSubjects = JSON.parse(localStorage.getItem('math_custom_subjects') || '[]');
      if (DEFAULT_POMO_SUBJECTS.includes(trimmed) || customSubjects.includes(trimmed)) {
        showToast('その科目は既に登録されています。', 'warning');
        return;
      }
      
      customSubjects.push(trimmed);
      localStorage.setItem('math_custom_subjects', JSON.stringify(customSubjects));
      
      renderPomoSubjects();
      const select = document.getElementById('pomo-subject-select') as HTMLSelectElement;
      if (select) select.value = trimmed;
      toggleSubjectDeleteLink();
      showToast(`新しく「${trimmed}」を追加しました。`, 'success');
    });
  }
  
  const deleteLink = document.getElementById('pomo-subject-delete-link');
  if (deleteLink) {
    deleteLink.addEventListener('click', () => {
      const select = document.getElementById('pomo-subject-select') as HTMLSelectElement;
      if (!select) return;
      const val = select.value;
      if (!confirm(`カスタム科目「${val}」を削除しますか？`)) return;
      
      let customSubjects = JSON.parse(localStorage.getItem('math_custom_subjects') || '[]');
      customSubjects = customSubjects.filter((sub: string) => sub !== val);
      localStorage.setItem('math_custom_subjects', JSON.stringify(customSubjects));
      
      renderPomoSubjects();
      showToast('科目を削除しました。');
    });
  }

  document.getElementById('pomo-start-btn')?.addEventListener('click', () => {
    unlockAudio();
    const select = document.getElementById('pomo-subject-select') as HTMLSelectElement;
    const memo = document.getElementById('pomo-memo-input') as HTMLInputElement;
    
    state.pomoSelectedSubject = select ? select.value : '数学';
    state.pomoMemo = memo ? memo.value.trim() : '';
    
    let lagSec = 0;
    if (state.pomoState === 'break_complete' && state.pomoZeroTimestamp > 0) {
      lagSec = Math.round((Date.now() - state.pomoZeroTimestamp) / 1000);
    }
    
    if (state.pomoState === 'break') {
      logPomodoroEvent('一時停止', state.pomoAccumulatedSeconds, 0);
    }
    
    state.pomoSecondsLeft = 25 * 60;
    state.pomoState = 'work';
    logPomodoroEvent('作業開始', 0, lagSec);
    state.pomoZeroTimestamp = 0;
    
    updatePomoUIState();
    startPomoTimerTick();
  });

  document.getElementById('pomo-pause-btn')?.addEventListener('click', () => {
    unlockAudio();
    if (state.pomoTimerInterval) {
      clearInterval(state.pomoTimerInterval);
      state.pomoTimerInterval = null;
    }
    
    pauseBgmPlayback();
    
    logPomodoroEvent('一時停止', state.pomoAccumulatedSeconds, 0);
    
    state.pomoState = (state.pomoState === 'work') ? 'work_paused' : 'break_paused';
    updatePomoUIState();
  });

  document.getElementById('pomo-resume-btn')?.addEventListener('click', () => {
    unlockAudio();
    logPomodoroEvent('作業再開', 0, 0);
    state.pomoState = (state.pomoState === 'work_paused') ? 'work' : 'break';
    
    updatePomoUIState();
    startPomoTimerTick();
  });

  document.getElementById('pomo-break-btn')?.addEventListener('click', () => {
    unlockAudio();
    const select = document.getElementById('pomo-subject-select') as HTMLSelectElement;
    const memo = document.getElementById('pomo-memo-input') as HTMLInputElement;
    
    state.pomoSelectedSubject = select ? select.value : '数学';
    state.pomoMemo = memo ? memo.value.trim() : '';
    
    let lagSec = 0;
    if (state.pomoState === 'work_complete' && state.pomoZeroTimestamp > 0) {
      lagSec = Math.round((Date.now() - state.pomoZeroTimestamp) / 1000);
    }
    
    if (state.pomoState === 'work') {
      logPomodoroEvent('一時停止', state.pomoAccumulatedSeconds, 0);
    }
    
    state.pomoSecondsLeft = 5 * 60;
    state.pomoState = 'break';
    logPomodoroEvent('休憩開始', 0, lagSec);
    state.pomoZeroTimestamp = 0;
    
    updatePomoUIState();
    startPomoTimerTick();
  });

  document.getElementById('pomo-stop-btn')?.addEventListener('click', () => {
    unlockAudio();
    if (state.pomoTimerInterval) {
      clearInterval(state.pomoTimerInterval);
      state.pomoTimerInterval = null;
    }
    
    stopBgmPlayback();
    
    let lagSec = 0;
    if ((state.pomoState === 'work_complete' || state.pomoState === 'break_complete') && state.pomoZeroTimestamp > 0) {
      lagSec = Math.round((Date.now() - state.pomoZeroTimestamp) / 1000);
    }
    
    logPomodoroEvent('終了', state.pomoAccumulatedSeconds, lagSec);
    
    state.pomoState = 'idle';
    state.pomoSecondsLeft = 25 * 60;
    state.pomoAccumulatedSeconds = 0;
    state.pomoZeroTimestamp = 0;
    
    const display = document.getElementById('pomo-display');
    if (display) display.textContent = "25:00";
    updatePomoUIState();
  });

  document.getElementById('pomo-dev-test-btn')?.addEventListener('click', () => {
    unlockAudio();
    if (state.pomoState === 'idle' || state.pomoState === 'work_complete' || state.pomoState === 'break_complete') {
      state.pomoSecondsLeft = 2;
      state.pomoState = 'work';
      logPomodoroEvent('作業開始', 0, 0);
      updatePomoUIState();
      startPomoTimerTick();
      state.pomoStateStartTime = Date.now();
      state.pomoTimerStartSecondsLeft = 2;
      showToast('テスト：2秒の作業タイマーを開始しました。');
    } else if (state.pomoState === 'work' || state.pomoState === 'break') {
      state.pomoSecondsLeft = 2;
      state.pomoStateStartTime = Date.now();
      state.pomoTimerStartSecondsLeft = 2;
      showToast('テスト：タイマーを残り2秒に短縮しました。');
    }
  });

  // BGM file change/clear handlers
  const bgmFileInput = document.getElementById('pomo-bgm-file') as HTMLInputElement;
  const bgmClearBtn = document.getElementById('pomo-bgm-clear-btn') as HTMLElement;
  const bgmStatusEl = document.getElementById('pomo-bgm-status') as HTMLElement;
  
  if (bgmFileInput) {
    bgmFileInput.addEventListener('change', (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      if (state.pomoBgmUrl) {
        URL.revokeObjectURL(state.pomoBgmUrl);
      }
      
      state.pomoBgmUrl = URL.createObjectURL(file);
      state.pomoBgmFileName = file.name;
      
      if (bgmStatusEl) {
        bgmStatusEl.textContent = `選択中: ${file.name}`;
        bgmStatusEl.style.color = 'var(--accent-success)';
      }
      if (bgmClearBtn) {
        bgmClearBtn.style.display = 'inline-block';
      }
      showToast(`BGMに「${file.name}」を設定しました。`, 'success');
      unlockAudio();
    });
  }
  
  if (bgmClearBtn) {
    bgmClearBtn.addEventListener('click', () => {
      if (state.pomoBgmUrl) {
        URL.revokeObjectURL(state.pomoBgmUrl);
      }
      state.pomoBgmUrl = null;
      state.pomoBgmFileName = null;
      
      if (bgmFileInput) bgmFileInput.value = '';
      if (bgmStatusEl) {
        bgmStatusEl.textContent = '※未設定の場合、無音ループでバックグラウンド実行を維持します。';
        bgmStatusEl.style.color = '';
      }
      bgmClearBtn.style.display = 'none';
      showToast('BGMを解除しました。');
      
      stopBgmPlayback();
      unlockAudio();
    });
  }
}
