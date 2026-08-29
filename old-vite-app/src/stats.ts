import { state } from "./state";
import { Question, HistoryItem, Point, RegressionResult, TransitionPair, FatiguePoint } from "./types";
import { showToast, switchView, closeModal } from "./ui";
import { syncPomodoroLogsFromGas } from "./api";
import { formatTimeSeconds } from "./utils";
import { renderReport } from "./exam";
import { DEFAULT_POMO_SUBJECTS } from "./constants";

declare global {
  interface Window {
    viewPastReport: (testId: string) => void;
    triggerImportBackup: () => void;
    handleImportBackup: (e: any) => void;
    exportBackup: () => void;
  }
}

export function getHistory(): HistoryItem[] {
  const saved = localStorage.getItem('math_test_history');
  return saved ? JSON.parse(saved) : [];
}

export function saveToHistory(item: HistoryItem): void {
  const history = getHistory();
  history.push(item);
  localStorage.setItem('math_test_history', JSON.stringify(history));
  renderDashboard();
}

export function clearHistory(): void {
  if (confirm('過去の診断履歴とカレンダーの記録をすべて消去します。よろしいですか？\n※この操作は取り消せません。')) {
    localStorage.removeItem('math_test_history');
    renderDashboard();
    showToast('学習履歴をすべて消去しました。');
  }
}


export function renderDashboard(): void {
  renderHeatmap();
  renderHistoryList();
  renderStats();
}

export function renderStats(): void {
  const history = getHistory();
  const totalTestsEl = document.getElementById('stats-total-tests');
  if (totalTestsEl) totalTestsEl.textContent = String(history.length);
  
  const avgScoreEl = document.getElementById('stats-avg-score');
  if (history.length === 0) {
    if (avgScoreEl) avgScoreEl.textContent = '0';
    return;
  }
  
  let totalPercent = 0;
  history.forEach(item => {
    const max = item.maxScore || (item.attemptedCount * 25) || 100;
    const pct = (item.score / max) * 100;
    totalPercent += pct;
  });
  
  const avg = Math.round(totalPercent / history.length);
  if (avgScoreEl) avgScoreEl.textContent = String(avg);
}

export function renderHeatmap(): void {
  const container = document.getElementById('heatmap-grid-container');
  const labelsContainer = document.getElementById('heatmap-months-labels');
  if (!container) return;
  
  const history = getHistory();
  
  // Map YYYY-MM-DD to test counts
  const dateMap: Record<string, number> = {};
  history.forEach(item => {
    const d = new Date(item.timestamp);
    const dateStr = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
    dateMap[dateStr] = (dateMap[dateStr] || 0) + 1;
  });
  
  // Generate calendar cells (16 weeks = 112 days) aligned to Sunday
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 is Sunday
  const startDay = new Date();
  startDay.setDate(now.getDate() - (15 * 7) - dayOfWeek); // Sunday 15 weeks ago
  
  let html = '';
  const monthLabels = Array(16).fill('');
  let lastMonth = -1;
  
  for (let i = 0; i < 16 * 7; i++) {
    const date = new Date(startDay);
    date.setDate(startDay.getDate() + i);
    
    const dateStr = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}`;
    const count = dateMap[dateStr] || 0;
    
    let level = 'level-0';
    if (count === 1) level = 'level-1';
    else if (count === 2) level = 'level-2';
    else if (count >= 3) level = 'level-3';
    
    const formattedDate = `${date.getFullYear()}/${date.getMonth()+1}/${date.getDate()}`;
    const tooltip = `${formattedDate}: ${count}回の受験`;
    
    html += `<div class="heatmap-cell ${level}" title="${tooltip}"></div>`;
    
    // Month label logic
    if (i % 7 === 0) { // column start
      const colIdx = i / 7;
      const month = date.getMonth();
      if (month !== lastMonth) {
        monthLabels[colIdx] = (month + 1) + '月';
        lastMonth = month;
      }
    }
  }
  
  container.innerHTML = html;
  
  // Render month labels above columns
  let labelsHtml = '';
  monthLabels.forEach(lbl => {
    labelsHtml += `<span style="width: 12.5px; text-align: left; overflow: visible; white-space: nowrap;">${lbl}</span>`;
  });
  if (labelsContainer) labelsContainer.innerHTML = labelsHtml;
}

export function renderHistoryList(): void {
  const container = document.getElementById('history-list-container');
  const history = getHistory().reverse(); // Show latest first
  
  if (!container) return;
  
  if (history.length === 0) {
    container.innerHTML = '<p class="text-muted" style="font-size: 0.85rem; text-align: center; padding: 1rem 0;">履歴はありません。</p>';
    return;
  }
  
  let html = '';
  history.forEach(item => {
    const date = new Date(item.timestamp);
    const dateStr = `${date.getFullYear()}/${date.getMonth()+1}/${date.getDate()} ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
    const maxScore = item.maxScore || (item.attemptedCount * 25) || 100;
    const ratio = item.score / maxScore;
    
    let colorClass = 'warning';
    if (ratio >= 0.8) colorClass = 'green';
    else if (ratio >= 0.5) colorClass = 'purple';
    
    html += `
      <div class="history-item" onclick="viewPastReport('${item.id}')">
        <div class="history-info">
          <span class="history-date">📅 ${dateStr}</span>
          <span class="history-subj">${item.subjects.join(', ')} (挑戦: ${item.attemptedCount}問)</span>
        </div>
        <div class="history-score ${colorClass}">
          ${item.score} / ${maxScore} 点
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}


window.viewPastReport = function(testId: string): void {
  const history = getHistory();
  const record = history.find(item => item.id === testId);
  if (!record) return;
  
  state.activeSession = {
    questionPool: [],
    attemptedQuestions: record.attemptedQuestions || [],
    currentQuestionIndex: 0,
    startTime: record.timestamp,
    elapsedSeconds: record.durationSeconds || 0,
    isPaused: false,
    isFinished: true,
    images: record.images || [],
    generalNote: record.generalNote || "",
    ocrTextUnified: record.ocrTextUnified || "",
    report: record.report
  };
  
  renderReport();
  switchView('report');
  showToast('過去のレポートを表示しました。');
};

export function exportBackup(): void {
  const history = getHistory();
  const apiKey = localStorage.getItem('gemini_api_key') || "";
  
  const backupData = {
    version: "1.0",
    apiKey: apiKey,
    history: history
  };
  
  const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `math_diagnosis_backup_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast('バックアップファイルを書き出しました。');
}

window.triggerImportBackup = function(): void {
  const el = document.getElementById('import-backup-file') as HTMLInputElement;
  if (el) el.click();
};

window.handleImportBackup = function(e: any): void {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(event: any) {
    try {
      const target = event.target as FileReader;
      if (!target || typeof target.result !== 'string') return;
      const data = JSON.parse(target.result);
      
      if (data.apiKey !== undefined) {
        localStorage.setItem('gemini_api_key', data.apiKey);
        const apiKeyInput = document.getElementById('api-key-input') as HTMLInputElement;
        if (apiKeyInput) apiKeyInput.value = data.apiKey;
      }
      
      if (data.history !== undefined) {
        localStorage.setItem('math_test_history', JSON.stringify(data.history));
      }
      
      showToast('バックアップデータを読み込みました！', 'success');
      closeModal('settings-modal');
      renderDashboard();
    } catch (err) {
      showToast('ファイルの読み込みに失敗しました。有効なJSONではありません。', 'danger');
      console.error(err);
    }
  };
  reader.readAsText(file);
};


async function syncLocalPomodoroLogs(): Promise<void> {
  const studentName = localStorage.getItem('math_student_name') || '未設定';
  try {
    const logs = await syncPomodoroLogsFromGas(studentName);
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
    }
  } catch (err) {
    console.error("Failed to sync Pomodoro logs:", err);
  }
}

export function initStatsPage(): void {
  const mode = localStorage.getItem('math_curriculum_mode') || 'junior_high';
  
  const schoolStats = document.getElementById('school-stats-container');
  const uniStats = document.getElementById('university-stats-container');
  
  if (mode === 'university') {
    if (schoolStats) schoolStats.style.display = 'none';
    if (uniStats) uniStats.style.display = 'block';
    
    // Sync from sheet in background
    syncLocalPomodoroLogs().then(() => {
      renderUniversityDashboard();
    });
    
    // Render local first
    renderUniversityDashboard();
  } else {
    if (schoolStats) schoolStats.style.display = 'block';
    if (uniStats) uniStats.style.display = 'none';
    
    const history = getHistory();
    const subjectSelect = document.getElementById('stats-subject-select') as HTMLSelectElement;
    if (subjectSelect) {
      const uniqueSubjects = new Set<string>();
      history.forEach(item => {
        if (item.subjects && item.subjects.length > 0) {
          item.subjects.forEach(s => uniqueSubjects.add(s));
        }
      });
      
      subjectSelect.innerHTML = '';
      const optAllSub = document.createElement('option');
      optAllSub.value = 'all';
      optAllSub.textContent = 'すべて';
      subjectSelect.appendChild(optAllSub);
      
      uniqueSubjects.forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub;
        opt.textContent = sub;
        subjectSelect.appendChild(opt);
      });
      
      subjectSelect.onchange = () => {
        populateChapters(subjectSelect.value, history);
      };
      
      populateChapters('all', history);
    }
  }
}


export function parsePomodoroSessions(logs: any[]): {
  totalWorkSeconds: number;
  totalBreakSeconds: number;
  totalLagSeconds: number;
  workSessionCount: number;
  hourCounts: number[];
  transitionPairs: TransitionPair[];
  fatiguePoints: FatiguePoint[];
  dailyWorkSeconds: Record<string, number>;
} {
  const sorted = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  let totalWorkSeconds = 0;
  let totalBreakSeconds = 0;
  let totalLagSeconds = 0;
  let workSessionCount = 0;
  
  let currentState = 'idle'; // 'work', 'break', 'idle'
  const hourCounts = Array(24).fill(0);
  const transitionPairs: TransitionPair[] = [];
  let lastSubject: string | null = null;
  const fatiguePoints: FatiguePoint[] = [];
  let currentConsecutiveSessions = 0;
  const dailyWorkSeconds: Record<string, number> = {};
  
  sorted.forEach(log => {
    const event = log.event;
    const elapsed = Number(log.elapsedSeconds || 0);
    const lag = Number(log.lagSeconds || 0);
    const subject = log.subject;
    
    if (event === '作業開始' || event === '作業再開') {
      const d = new Date(log.timestamp);
      if (!isNaN(d.getTime())) {
        hourCounts[d.getHours()]++;
      }
    }
    
    if (event === '作業開始') {
      currentState = 'work';
      currentConsecutiveSessions++;
      if (lag > 0) {
        totalLagSeconds += lag;
        fatiguePoints.push({ session: currentConsecutiveSessions, lag: lag });
      }
      
      if (lastSubject && lastSubject !== subject) {
        transitionPairs.push({ from: lastSubject, to: subject });
      }
      lastSubject = subject;
      
    } else if (event === '作業再開') {
      currentState = 'work';
      
    } else if (event === '休憩開始') {
      currentState = 'break';
      currentConsecutiveSessions++;
      if (lag > 0) {
        totalLagSeconds += lag;
        fatiguePoints.push({ session: currentConsecutiveSessions, lag: lag });
      }
      
      if (lastSubject) {
        transitionPairs.push({ from: lastSubject, to: '休憩' });
      }
      lastSubject = '休憩';
      
    } else if (event === '一時停止' || event === '終了' || event === '自動一時停止（離脱）' || event === '自動休憩一時停止（離脱）') {
      if (currentState === 'work' || event === '自動一時停止（離脱）') {
        totalWorkSeconds += elapsed;
        
        const d = new Date(log.timestamp);
        if (!isNaN(d.getTime())) {
          const dateStr = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
          dailyWorkSeconds[dateStr] = (dailyWorkSeconds[dateStr] || 0) + elapsed;
        }
        
        if (elapsed >= 1500) {
          workSessionCount++;
        }
      } else if (currentState === 'break' || event === '自動休憩一時停止（離脱）') {
        totalBreakSeconds += elapsed;
      }
      
      if (event === '終了') {
        currentState = 'idle';
        currentConsecutiveSessions = 0;
        lastSubject = '終了';
      } else {
        currentState = 'idle';
      }
    }
  });
  
  return {
    totalWorkSeconds,
    totalBreakSeconds,
    totalLagSeconds,
    workSessionCount,
    hourCounts,
    transitionPairs,
    fatiguePoints,
    dailyWorkSeconds
  };
}

export function renderUniversityDashboard(): void {
  const localLogs = JSON.parse(localStorage.getItem('math_pomodoro_history') || '[]');
  const analysis = parsePomodoroSessions(localLogs);
  
  const totalMin = Math.floor(analysis.totalWorkSeconds / 60);
  const totalWorkTimeEl = document.getElementById('uni-total-work-time');
  if (totalWorkTimeEl) totalWorkTimeEl.textContent = `${totalMin}分`;
  
  const pomoCountEl = document.getElementById('uni-pomo-count');
  if (pomoCountEl) pomoCountEl.textContent = `${analysis.workSessionCount}回`;
  
  const totalActionSeconds = analysis.totalWorkSeconds + analysis.totalLagSeconds;
  const efficiency = totalActionSeconds > 0 ? Math.round((analysis.totalWorkSeconds / totalActionSeconds) * 100) : 100;
  const efficiencyRateEl = document.getElementById('uni-efficiency-rate');
  if (efficiencyRateEl) efficiencyRateEl.textContent = `${efficiency}%`;
  
  const totalSessions = localLogs.filter((l: any) => l.event === '一時停止' || l.event === '終了' || l.event === '自動一時停止（離脱）').length;
  const avgSessionSec = totalSessions > 0 ? Math.round(analysis.totalWorkSeconds / totalSessions) : 0;
  const avgSessionMin = Math.round(avgSessionSec / 60);
  const avgSessionEl = document.getElementById('uni-avg-session');
  if (avgSessionEl) avgSessionEl.textContent = `${avgSessionMin}分`;
  
  drawCircadianChart(analysis.hourCounts);
  drawBurnupChart(analysis.dailyWorkSeconds);
  drawMarkovMatrix(analysis.transitionPairs);
  drawFatigueChart(analysis.fatiguePoints);
}

export function drawCircadianChart(hourCounts: number[]): void {
  const container = document.getElementById('uni-circadian-chart');
  if (!container) return;
  
  const maxVal = Math.max(...hourCounts, 1);
  const width = 500;
  const height = 130;
  const barWidth = 14;
  const gap = 5;
  const paddingLeft = 30;
  const paddingTop = 10;
  
  let svgContent = `<svg viewBox="0 0 ${width} ${height + 25}" width="100%" height="100%" style="overflow: visible;">`;
  
  for (let i = 0; i <= 4; i++) {
    const y = paddingTop + (height / 4) * i;
    const val = Math.round(maxVal - (maxVal / 4) * i);
    svgContent += `<line x1="${paddingLeft}" y1="${y}" x2="${width}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
    svgContent += `<text x="${paddingLeft - 8}" y="${y + 4}" fill="#64748b" font-size="8" text-anchor="end">${val}</text>`;
  }
  
  for (let hour = 0; hour < 24; hour++) {
    const count = hourCounts[hour];
    const barHeight = (count / maxVal) * height;
    const x = paddingLeft + hour * (barWidth + gap);
    const y = paddingTop + height - barHeight;
    
    const color = count > 0 ? "url(#circadian-grad)" : "#e2e8f0";
    
    svgContent += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" rx="3" style="transition: all 0.3s; cursor: pointer;">
      <title>${hour}時: ${count}回開始</title>
    </rect>`;
    
    if (hour % 4 === 0 || hour === 23) {
      svgContent += `<text x="${x + barWidth/2}" y="${paddingTop + height + 15}" fill="#64748b" font-size="8" text-anchor="middle">${hour}h</text>`;
    }
  }
  
  svgContent += `<defs>
    <linearGradient id="circadian-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="var(--accent-primary)"/>
      <stop offset="100%" stop-color="rgba(99, 102, 241, 0.2)"/>
    </linearGradient>
  </defs>`;
  
  svgContent += `</svg>`;
  container.innerHTML = svgContent;
}

export function drawBurnupChart(dailyWorkSeconds: Record<string, number>): void {
  const container = document.getElementById('uni-burnup-chart');
  if (!container) return;
  
  const dates = [];
  const labels = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
    dates.push(dateStr);
    labels.push(`${d.getMonth()+1}/${d.getDate()}`);
  }
  
  let cumHours = 0;
  const cumValues: number[] = [];
  dates.forEach(dateStr => {
    const sec = dailyWorkSeconds[dateStr] || 0;
    cumHours += sec / 3600;
    cumValues.push(cumHours);
  });
  
  const targetHours = Array(7).fill(0).map((_, i) => (i + 1) * 2.0);
  const maxVal = Math.max(...cumValues, ...targetHours, 5);
  
  const width = 500;
  const height = 170;
  const paddingLeft = 35;
  const paddingRight = 15;
  const paddingTop = 15;
  const graphWidth = width - paddingLeft - paddingRight;
  
  let svgContent = `<svg viewBox="0 0 ${width} ${height + 30}" width="100%" height="100%" style="overflow: visible;">`;
  
  for (let i = 0; i <= 4; i++) {
    const y = paddingTop + (height / 4) * i;
    const val = ((maxVal / 4) * (4 - i)).toFixed(1);
    svgContent += `<line x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
    svgContent += `<text x="${paddingLeft - 8}" y="${y + 4}" fill="#64748b" font-size="8" text-anchor="end">${val}h</text>`;
  }
  
  const getX = (index: number) => paddingLeft + (graphWidth / 6) * index;
  const getY = (val: number) => paddingTop + height - (val / maxVal) * height;
  
  let targetPath = `M ${getX(0)} ${getY(targetHours[0])}`;
  for (let i = 1; i < 7; i++) {
    targetPath += ` L ${getX(i)} ${getY(targetHours[i])}`;
  }
  svgContent += `<path d="${targetPath}" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,4"/>`;
  
  let actualPath = `M ${getX(0)} ${getY(cumValues[0])}`;
  let areaPath = `M ${getX(0)} ${getY(0)} L ${getX(0)} ${getY(cumValues[0])}`;
  for (let i = 1; i < 7; i++) {
    const x = getX(i);
    const y = getY(cumValues[i]);
    actualPath += ` L ${x} ${y}`;
    areaPath += ` L ${x} ${y}`;
  }
  areaPath += ` L ${getX(6)} ${getY(0)} Z`;
  
  svgContent += `<path d="${areaPath}" fill="url(#burnup-area-grad)" style="opacity: 0.15;"/>`;
  svgContent += `<path d="${actualPath}" fill="none" stroke="var(--accent-primary)" stroke-width="3" stroke-linecap="round"/>`;
  
  for (let i = 0; i < 7; i++) {
    const x = getX(i);
    const y = getY(cumValues[i]);
    svgContent += `<circle cx="${x}" cy="${y}" r="4" fill="var(--accent-primary)" stroke="#ffffff" stroke-width="1.5" style="cursor: pointer;">
      <title>${labels[i]}: 累計 ${cumValues[i].toFixed(2)}時間</title>
    </circle>`;
    
    svgContent += `<circle cx="${x}" cy="${getY(targetHours[i])}" r="2" fill="#94a3b8"/>`;
    svgContent += `<text x="${x}" y="${paddingTop + height + 18}" fill="#64748b" font-size="8" text-anchor="middle">${labels[i]}</text>`;
  }
  
  svgContent += `<g transform="translate(${paddingLeft + 10}, ${paddingTop + 10})">
    <line x1="0" y1="5" x2="15" y2="5" stroke="var(--accent-primary)" stroke-width="3"/>
    <text x="20" y="9" fill="#1e293b" font-size="8">実績時間</text>
    <line x1="100" y1="5" x2="115" y2="5" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3,3"/>
    <text x="120" y="9" fill="#1e293b" font-size="8">目標 (2h/日)</text>
  </g>`;
  
  svgContent += `<defs>
    <linearGradient id="burnup-area-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="var(--accent-primary)"/>
      <stop offset="100%" stop-color="transparent"/>
    </linearGradient>
  </defs>`;
  
  svgContent += `</svg>`;
  container.innerHTML = svgContent;
}

export function drawMarkovMatrix(transitionPairs: TransitionPair[]): void {
  const container = document.getElementById('uni-markov-matrix-wrapper');
  if (!container) return;
  
  if (transitionPairs.length === 0) {
    container.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted); text-align: center; margin: 1.5rem 0;">データがありません。タイマー記録が蓄積されると遷移表が生成されます。</p>`;
    return;
  }
  
  const statesSet = new Set<string>();
  transitionPairs.forEach(pair => {
    statesSet.add(pair.from);
    statesSet.add(pair.to);
  });
  const states = Array.from(statesSet);
  
  states.sort((a, b) => {
    if (a === '休憩') return 1;
    if (b === '休憩') return -1;
    if (a === '終了') return 1;
    if (b === '終了') return -1;
    return a.localeCompare(b);
  });
  
  const matrix: Record<string, Record<string, number>> = {};
  states.forEach(from => {
    matrix[from] = {};
    states.forEach(to => {
      matrix[from][to] = 0;
    });
  });
  
  const rowTotals: Record<string, number> = {};
  states.forEach(st => { rowTotals[st] = 0; });
  
  transitionPairs.forEach(pair => {
    if (matrix[pair.from] && matrix[pair.from][pair.to] !== undefined) {
      matrix[pair.from][pair.to]++;
      rowTotals[pair.from]++;
    }
  });
  
  let html = `<table style="width: 100%; border-collapse: collapse; font-size: 0.8rem; text-align: center; color: white;">`;
  html += `<thead><tr><th style="padding: 0.6rem; border-bottom: 2px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.02); font-weight: 600; text-align: left; color: var(--accent-primary);">移行前 \\ 移行後</th>`;
  states.forEach(state => {
    html += `<th style="padding: 0.6rem; border-bottom: 2px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.02); font-weight: 600;">${state}</th>`;
  });
  html += `</tr></thead><tbody>`;
  
  states.forEach(from => {
    html += `<tr><td style="padding: 0.6rem; border-bottom: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02); font-weight: 600; text-align: left; color: var(--accent-primary);">${from}</td>`;
    
    const total = rowTotals[from];
    states.forEach(to => {
      const count = matrix[from][to];
      const prob = total > 0 ? (count / total) : 0;
      const pct = (prob * 100).toFixed(0);
      
      let bg = 'transparent';
      let fontColor = 'rgba(255,255,255,0.4)';
      if (prob > 0) {
        bg = `rgba(99, 102, 241, ${0.1 + prob * 0.7})`;
        fontColor = '#ffffff';
      }
      
      html += `<td style="padding: 0.6rem; border-bottom: 1px solid rgba(255,255,255,0.08); background: ${bg}; color: ${fontColor}; font-weight: ${prob > 0 ? '600' : 'normal'};">
        ${pct}%<br><span style="font-size: 0.65rem; opacity: 0.6;">(${count}回)</span>
      </td>`;
    });
    html += `</tr>`;
  });
  
  html += `</tbody></table>`;
  container.innerHTML = html;
}

export function drawFatigueChart(fatiguePoints: FatiguePoint[]): void {
  const container = document.getElementById('uni-fatigue-chart');
  if (!container) return;
  
  if (fatiguePoints.length === 0) {
    container.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted); text-align: center; margin: 2rem 0;">データがありません。タイマー終了後の反応遅延（アラーム放置秒数）が計測されるとグラフが描画されます。</p>`;
    return;
  }
  
  const width = 500;
  const height = 150;
  const paddingLeft = 35;
  const paddingRight = 15;
  const paddingTop = 15;
  const graphWidth = width - paddingLeft - paddingRight;
  
  const maxSession = Math.max(...fatiguePoints.map(p => p.session), 4);
  const maxLag = Math.max(...fatiguePoints.map(p => p.lag), 60);
  
  const getX = (session: number) => paddingLeft + (graphWidth / (maxSession - 1 || 1)) * (session - 1);
  const getY = (lag: number) => paddingTop + height - (lag / maxLag) * height;
  
  let svgContent = `<svg viewBox="0 0 ${width} ${height + 25}" width="100%" height="100%" style="overflow: visible;">`;
  
  for (let i = 0; i <= 3; i++) {
    const y = paddingTop + (height / 3) * i;
    const val = Math.round((maxLag / 3) * (3 - i));
    svgContent += `<line x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
    svgContent += `<text x="${paddingLeft - 8}" y="${y + 3}" fill="#64748b" font-size="8" text-anchor="end">${val}秒</text>`;
  }
  
  fatiguePoints.forEach(p => {
    const x = getX(p.session);
    const y = getY(p.lag);
    svgContent += `<circle cx="${x}" cy="${y}" r="5" fill="#f59e0b" style="opacity: 0.75; cursor: pointer;">
      <title>サイクル #${p.session} - アラーム放置: ${p.lag}秒</title>
    </circle>`;
  });
  
  if (fatiguePoints.length >= 2) {
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    const n = fatiguePoints.length;
    fatiguePoints.forEach(p => {
      sumX += p.session;
      sumY += p.lag;
      sumXY += p.session * p.lag;
      sumXX += p.session * p.session;
    });
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;
    
    const x1 = 1;
    const y1 = slope * x1 + intercept;
    const x2 = maxSession;
    const y2 = slope * x2 + intercept;
    
    svgContent += `<line x1="${getX(x1)}" y1="${getY(y1)}" x2="${getX(x2)}" y2="${getY(y2)}" stroke="#ef4444" stroke-width="2" stroke-dasharray="3,3">
      <title>傾向線 (傾き: ${slope.toFixed(2)}秒/サイクル)</title>
    </line>`;
  }
  
  for (let i = 1; i <= maxSession; i++) {
    const x = getX(i);
    svgContent += `<text x="${x}" y="${paddingTop + height + 15}" fill="#64748b" font-size="8" text-anchor="middle">#${i}</text>`;
  }
  
  svgContent += `</svg>`;
  container.innerHTML = svgContent;
}

export function populateChapters(selectedSubject: string, history: HistoryItem[]): void {
  const chapterSelect = document.getElementById('stats-chapter-select') as HTMLSelectElement;
  if (!chapterSelect) return;
  chapterSelect.innerHTML = '';
  
  const optAllCh = document.createElement('option');
  optAllCh.value = 'all';
  optAllCh.textContent = 'すべて';
  chapterSelect.appendChild(optAllCh);
  
  const uniqueChapters = new Set<string>();
  history.forEach(item => {
    if (item.attemptedQuestions) {
      item.attemptedQuestions.forEach(q => {
        if (selectedSubject === 'all' || q.subjectName === selectedSubject) {
          if (q.chapterName) uniqueChapters.add(q.chapterName);
        }
      });
    }
  });
  
  uniqueChapters.forEach(ch => {
    const opt = document.createElement('option');
    opt.value = ch;
    opt.textContent = ch;
    chapterSelect.appendChild(opt);
  });
  
  chapterSelect.onchange = () => {
    renderStatsDashboard();
  };
  
  renderStatsDashboard();
}

export function renderStatsDashboard(): void {
  const history = getHistory().sort((a,b) => a.timestamp - b.timestamp);
  const selectedSubjectSelect = document.getElementById('stats-subject-select') as HTMLSelectElement;
  const selectedChapterSelect = document.getElementById('stats-chapter-select') as HTMLSelectElement;
  const selectedSubject = selectedSubjectSelect ? selectedSubjectSelect.value : 'all';
  const selectedChapter = selectedChapterSelect ? selectedChapterSelect.value : 'all';
  
  const filteredHistory = history.filter(item => {
    const matchSubject = (selectedSubject === 'all' || (item.subjects && item.subjects.includes(selectedSubject)));
    const matchChapter = (selectedChapter === 'all' || (item.attemptedQuestions && item.attemptedQuestions.some(q => q.chapterName === selectedChapter)));
    return matchSubject && matchChapter;
  });
  
  const chartWrapper = document.getElementById('stats-chart-wrapper');
  const summaryEl = document.getElementById('stats-analysis-summary');
  
  const fitTypeEl = document.getElementById('stats-fit-type');
  const trendEl = document.getElementById('stats-trend');
  const avgTimeQEl = document.getElementById('stats-avg-time-q');
  const avgTimeRunEl = document.getElementById('stats-avg-time-run');
  const avgTimeDayEl = document.getElementById('stats-avg-time-day');
  const avgTimeWeekEl = document.getElementById('stats-avg-time-week');
  const totalTimeEl = document.getElementById('stats-total-time');
  const scoreStddevEl = document.getElementById('stats-score-stddev');
  const targetForecastEl = document.getElementById('stats-target-forecast');
  
  if (!chartWrapper || !summaryEl) return;
  
  if (filteredHistory.length === 0) {
    chartWrapper.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted); margin: 2rem 0;">データがありません。テストを受けるとグラフが表示されます。</p>`;
    summaryEl.textContent = 'データが不足しているため評価を表示できません。テストを受講してください。';
    [fitTypeEl, trendEl, avgTimeQEl, avgTimeRunEl, avgTimeDayEl, avgTimeWeekEl, totalTimeEl, scoreStddevEl, targetForecastEl].forEach(el => {
      if (el) el.textContent = '-';
    });
    return;
  }
  
  // 1. Group by local date string to plot daily average scores
  const historyByDay: Record<string, { scores: number[]; maxScores: number[]; timestamp: number }> = {};
  filteredHistory.forEach(item => {
    const d = new Date(item.timestamp);
    const dateStr = `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`;
    if (!historyByDay[dateStr]) {
      historyByDay[dateStr] = {
        scores: [],
        maxScores: [],
        timestamp: item.timestamp
      };
    }
    historyByDay[dateStr].scores.push(item.score);
    historyByDay[dateStr].maxScores.push(item.maxScore);
    if (item.timestamp > historyByDay[dateStr].timestamp) {
      historyByDay[dateStr].timestamp = item.timestamp;
    }
  });
 
  const dayKeys = Object.keys(historyByDay).sort((a,b) => historyByDay[a].timestamp - historyByDay[b].timestamp);
  const points = dayKeys.map((dateStr, idx) => {
    const dayData = historyByDay[dateStr];
    const totalScore = dayData.scores.reduce((sum: number, s: number) => sum + s, 0);
    const totalMax = dayData.maxScores.reduce((sum: number, m: number) => sum + m, 0);
    const scoreRate = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
    return {
      x: idx + 1,
      y: scoreRate,
      label: new Date(dayData.timestamp).toLocaleDateString('ja-JP', {month: 'numeric', day: 'numeric'})
    };
  });
  
  const fit = performRegression(points);
  
  if (fitTypeEl) {
    if (fit.type === '--') {
      fitTypeEl.textContent = '--';
    } else {
      fitTypeEl.textContent = `${fit.type} (${fit.formula})`;
    }
  }
  
  if (trendEl) {
    trendEl.textContent = fit.trend;
    trendEl.className = '';
    if (fit.trend === '上昇') trendEl.style.color = '#10b981';
    else if (fit.trend === '下降') trendEl.style.color = '#ef4444';
    else if (fit.trend === '上限') trendEl.style.color = '#38bdf8';
    else if (fit.trend === '下限') trendEl.style.color = '#facc15';
    else trendEl.style.color = '#94a3b8';
  }

  // Calculate score standard deviation (volatility)
  if (scoreStddevEl) {
    if (points.length === 0) {
      scoreStddevEl.textContent = '-';
    } else {
      const scores = points.map(pt => pt.y);
      const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      const sqDiffsScore = scores.map(s => Math.pow(s - avgScore, 2));
      const varianceScore = sqDiffsScore.reduce((sum, v) => sum + v, 0) / scores.length;
      const stdDevScore = Math.sqrt(varianceScore);
      
      let stabilityText = "";
      if (stdDevScore < 5) stabilityText = "（極めて安定）";
      else if (stdDevScore < 12) stabilityText = "（安定）";
      else if (stdDevScore < 20) stabilityText = "（ややムラあり）";
      else stabilityText = "（ブレが大きい・苦手単元のムラあり）";
      
      scoreStddevEl.textContent = `${stdDevScore.toFixed(1)}% ${stabilityText}`;
    }
  }

  // Calculate target achievement forecast (80% / 100% targets)
  if (targetForecastEl) {
    if (fit.type === '--' || fit.type === '不明' || points.length < 2) {
      targetForecastEl.textContent = 'データ不足のため予測不可';
    } else {
      let target80 = -1;
      let target100 = -1;
      
      if (fit.type === '線形') {
        const match = fit.formula.match(/y = (-?[\d\.]+)x \+ (-?[\d\.]+)/);
        if (match) {
          const a = parseFloat(match[1]);
          const b = parseFloat(match[2]);
          if (a > 0) {
            target80 = (80 - b) / a;
            target100 = (100 - b) / a;
          }
        }
      } else if (fit.type === '対数') {
        const match = fit.formula.match(/y = (-?[\d\.]+)ln\(x\) \+ (-?[\d\.]+)/);
        if (match) {
          const a = parseFloat(match[1]);
          const b = parseFloat(match[2]);
          if (a > 0) {
            target80 = Math.exp((80 - b) / a);
            target100 = Math.exp((100 - b) / a);
          }
        }
      } else if (fit.type === '指数') {
        const match = fit.formula.match(/y = (-?[\d\.]+)e\^(-?[\d\.]+)x/);
        if (match) {
          const a = parseFloat(match[1]);
          const b = parseFloat(match[2]);
          if (b > 0) {
            target80 = Math.log(80 / a) / b;
            target100 = Math.log(100 / a) / b;
          }
        }
      }
      
      const formatForecast = (val: number) => {
        if (val <= 0 || val > 150) return '長期の学習継続が必要';
        const rounded = Math.ceil(val);
        const currentCount = points.length;
        if (rounded <= currentCount) return '到達済み';
        return `第${rounded}回目（あと${rounded - currentCount}回）`;
      };
      
      targetForecastEl.textContent = `80%突破: ${formatForecast(target80)} / 100%突破: ${formatForecast(target100)}`;
    }
  }
  
  let summaryText = "";
  if (fit.trend === '--') {
    summaryText = `十分なデータ（異なる受講日）が集まっていないため、成績の傾向はまだ分析できません。もう数日テストを受けてください。`;
  } else if (fit.trend === '上昇') {
    summaryText = `成績は順調に上昇傾向にあります（近似式: ${fit.formula}）。学習習慣が身につき、問題の理解度が高まっている状態です。この調子で復習と演習を継続していきましょう！`;
  } else if (fit.trend === '維持') {
    summaryText = `成績はほぼ横ばいで推移しています。基本の理解は安定していますが、さらなるスコアアップには、間違えた問題の解説の精読や苦手分野の重点的な補強が有効です。`;
  } else if (fit.trend === '下降') {
    summaryText = `直近の成績に下降傾向が見られます。学習範囲が難しくなっているか、あるいはケアレスミスが増加している可能性があります。一度基礎的な例題に戻り、途中式を丁寧に書く練習をしてください。`;
  } else if (fit.trend === '上限') {
    summaryText = `常に満点に近い、非常にハイレベルな成績を安定して維持しています。現在の分野の基礎は完全に定着しているため、より応用的な発展問題にチャレンジすることをお勧めします！`;
  } else if (fit.trend === '下限') {
    summaryText = `得点が低迷している状態です。前提知識に抜けがある可能性が高いため、焦らず教科書や基礎テキストの解説を丁寧に読み込み、例題の写経から始めましょう。`;
  }
  summaryEl.textContent = summaryText;
  
  // Calculate cumulative stats using raw filteredHistory
  const totalSeconds = filteredHistory.reduce((sum: number, item: HistoryItem) => sum + (item.durationSeconds || 0), 0);
  if (totalTimeEl) totalTimeEl.textContent = formatTimeSeconds(totalSeconds);
  
  const totalQuestions = filteredHistory.reduce((sum: number, item: HistoryItem) => sum + (item.attemptedCount || 0), 0);
  const avgSecondsPerQ = totalQuestions > 0 ? Math.round(totalSeconds / totalQuestions) : 0;
  if (avgTimeQEl) avgTimeQEl.textContent = formatTimeSeconds(avgSecondsPerQ);
  
  const avgSecondsPerRun = Math.round(totalSeconds / filteredHistory.length);
  const sqDiffsRun = filteredHistory.map(item => Math.pow((item.durationSeconds || 0) - avgSecondsPerRun, 2));
  const varianceRun = sqDiffsRun.reduce((sum: number, v: number) => sum + v, 0) / filteredHistory.length;
  const stdDevRun = Math.sqrt(varianceRun);
  if (avgTimeRunEl) {
    avgTimeRunEl.textContent = `${formatTimeSeconds(avgSecondsPerRun)} (σ=${formatTimeSeconds(Math.round(stdDevRun))})`;
  }
  
  // Date span calculations
  const timestamps = filteredHistory.map(item => item.timestamp);
  const minTs = Math.min(...timestamps);
  const maxTs = Math.max(...timestamps);
  const oneDayMs = 24 * 60 * 60 * 1000;
  const startDay = new Date(minTs);
  startDay.setHours(0,0,0,0);
  const endDay = new Date(maxTs);
  endDay.setHours(0,0,0,0);
  const daysCount = Math.max(1, Math.round((endDay.getTime() - startDay.getTime()) / oneDayMs) + 1);
  
  // Daily sums for daily average
  const dailySums = new Array(daysCount).fill(0);
  filteredHistory.forEach(item => {
    const itemDay = new Date(item.timestamp);
    itemDay.setHours(0,0,0,0);
    const idx = Math.round((itemDay.getTime() - startDay.getTime()) / oneDayMs);
    if (idx >= 0 && idx < daysCount) {
      dailySums[idx] += (item.durationSeconds || 0);
    }
  });
  
  const avgDailySec = Math.round(totalSeconds / daysCount);
  const sqDiffsDaily = dailySums.map(v => Math.pow(v - avgDailySec, 2));
  const varianceDaily = sqDiffsDaily.reduce((sum: number, v: number) => sum + v, 0) / daysCount;
  const stdDevDaily = Math.sqrt(varianceDaily);
  if (avgTimeDayEl) {
    avgTimeDayEl.textContent = `${formatTimeSeconds(avgDailySec)} (σ=${formatTimeSeconds(Math.round(stdDevDaily))})`;
  }
  
  // Weekly sums (bin daily sums into weeks)
  const weeksCount = Math.max(1, Math.ceil(daysCount / 7));
  const weeklySums = new Array(weeksCount).fill(0);
  dailySums.forEach((val, idx) => {
    const wIdx = Math.floor(idx / 7);
    if (wIdx < weeksCount) {
      weeklySums[wIdx] += val;
    }
  });
  
  const avgWeeklySec = Math.round(totalSeconds / weeksCount);
  const sqDiffsWeekly = weeklySums.map(v => Math.pow(v - avgWeeklySec, 2));
  const varianceWeekly = sqDiffsWeekly.reduce((sum: number, v: number) => sum + v, 0) / weeksCount;
  const stdDevWeekly = Math.sqrt(varianceWeekly);
  if (avgTimeWeekEl) {
    avgTimeWeekEl.textContent = `${formatTimeSeconds(avgWeeklySec)} (σ=${formatTimeSeconds(Math.round(stdDevWeekly))})`;
  }
  
  // Render SVG折れ線グラフ
  const svgWidth = 460;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 30;
  
  const chartW = svgWidth - paddingX * 2;
  const chartH = svgHeight - paddingY * 2;
  
  let svgContent = `<svg viewBox="0 0 ${svgWidth} ${svgHeight}" width="100%" height="100%">`;
  
  const yPercentages = [0, 25, 50, 75, 100];
  yPercentages.forEach(pct => {
    const yCoord = paddingY + chartH - (pct / 100) * chartH;
    svgContent += `<line x1="${paddingX}" y1="${yCoord}" x2="${svgWidth - paddingX}" y2="${yCoord}" stroke="#e2e8f0" stroke-width="1" />`;
    svgContent += `<text x="${paddingX - 10}" y="${yCoord + 4}" fill="#64748b" font-size="9" text-anchor="end">${pct}%</text>`;
  });
  
  const coords: { x: number; y: number; label: string; value: number }[] = [];
  points.forEach((pt, idx) => {
    const xCoord = points.length === 1 ? paddingX + chartW / 2 : paddingX + (idx / (points.length - 1)) * chartW;
    const yCoord = paddingY + chartH - (pt.y / 100) * chartH;
    coords.push({ x: xCoord, y: yCoord, label: pt.label, value: pt.y });
  });
  
  if (fit.type !== '不明' && points.length >= 2) {
    const startX = coords[0].x;
    const endX = coords[coords.length - 1].x;
    
    let slope = 0;
    let intercept = 0;
    if (fit.type === '線形') {
      const match = fit.formula.match(/y = (-?[\d\.]+)x \+ (-?[\d\.]+)/);
      if (match) {
        slope = parseFloat(match[1]);
        intercept = parseFloat(match[2]);
      }
    }
    
    const getFitY = (xIndex: number) => {
      let val = 0;
      if (fit.type === '線形') val = slope * xIndex + intercept;
      else if (fit.type === '対数') {
        const match = fit.formula.match(/y = (-?[\d\.]+)ln\(x\) \+ (-?[\d\.]+)/);
        if (match) {
          val = parseFloat(match[1]) * Math.log(xIndex) + parseFloat(match[2]);
        }
      } else if (fit.type === '指数') {
        const match = fit.formula.match(/y = (-?[\d\.]+)e\^(-?[\d\.]+)x/);
        if (match) {
          val = parseFloat(match[1]) * Math.exp(parseFloat(match[2]) * xIndex);
        }
      }
      return Math.max(0, Math.min(100, val));
    };
    
    const startFitY = paddingY + chartH - (getFitY(1) / 100) * chartH;
    const endFitY = paddingY + chartH - (getFitY(points.length) / 100) * chartH;
    
    svgContent += `<line x1="${startX}" y1="${startFitY}" x2="${endX}" y2="${endFitY}" stroke="rgba(245, 158, 11, 0.6)" stroke-width="1.5" stroke-dasharray="4,4" />`;
  }
  
  if (coords.length > 1) {
    let pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      pathD += ` L ${coords[i].x} ${coords[i].y}`;
    }
    svgContent += `<path d="${pathD}" fill="none" stroke="#3b82f6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />`;
  }
  
  coords.forEach((coord, idx) => {
    svgContent += `<circle cx="${coord.x}" cy="${coord.y}" r="5" fill="#3b82f6" stroke="#ffffff" stroke-width="1.5" />`;
    svgContent += `<text x="${coord.x}" y="${coord.y - 10}" fill="#1e293b" font-size="9" font-weight="bold" text-anchor="middle">${Math.round(coord.value)}%</text>`;
    svgContent += `<text x="${coord.x}" y="${paddingY + chartH + 18}" fill="#64748b" font-size="8" text-anchor="middle">${coord.label}</text>`;
  });
  
  svgContent += `</svg>`;
  chartWrapper.innerHTML = svgContent;
}

export function performRegression(points: Point[]): RegressionResult {
  const n = points.length;
  if (n < 2) return { type: "--", trend: "--", formula: "--", r2: 0 };
  
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;
  for (let i = 0; i < n; i++) {
    const x = points[i].x;
    const y = points[i].y;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
    sumYY += y * y;
  }
  
  const num = (n * sumXY) - (sumX * sumY);
  const den = (n * sumXX) - (sumX * sumX);
  
  let slope = 0;
  let intercept = sumY / n; // default to mean if den is 0
  if (den !== 0) {
    slope = num / den;
    intercept = (sumY - slope * sumX) / n;
  }
  
  let ssTot = 0;
  let ssRes = 0;
  const meanY = sumY / n;
  for (let i = 0; i < n; i++) {
    const x = points[i].x;
    const y = points[i].y;
    const predY = slope * x + intercept;
    ssTot += Math.pow(y - meanY, 2);
    ssRes += Math.pow(y - predY, 2);
  }
  let r2Linear = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
  if (r2Linear < 0) r2Linear = 0;
  
  let sumLogX = 0, sumLogXY = 0, sumLogXX = 0;
  for (let i = 0; i < n; i++) {
    const lx = Math.log(points[i].x);
    const y = points[i].y;
    sumLogX += lx;
    sumLogXY += lx * y;
    sumLogXX += lx * lx;
  }
  const denLog = (n * sumLogXX) - (sumLogX * sumLogX);
  let slopeLog = 0, interceptLog = sumY / n;
  if (denLog !== 0) {
    slopeLog = ((n * sumLogXY) - (sumLogX * sumY)) / denLog;
    interceptLog = (sumY - slopeLog * sumLogX) / n;
  }
  let ssResLog = 0;
  for (let i = 0; i < n; i++) {
    const lx = Math.log(points[i].x);
    const y = points[i].y;
    const predY = slopeLog * lx + interceptLog;
    ssResLog += Math.pow(y - predY, 2);
  }
  let r2Log = ssTot > 0 ? 1 - (ssResLog / ssTot) : 0;
  if (r2Log < 0) r2Log = 0;

  // Exponential fit
  let sumExpY = 0, sumExpXY = 0;
  for (let i = 0; i < n; i++) {
    const x = points[i].x;
    const ly = Math.log(Math.max(0.1, points[i].y));
    sumExpY += ly;
    sumExpXY += x * ly;
  }
  let slopeExp = 0, interceptExp = sumExpY / n;
  if (den !== 0) {
    slopeExp = ((n * sumExpXY) - (sumX * sumExpY)) / den;
    interceptExp = (sumExpY - slopeExp * sumX) / n;
  }
  let ssResExp = 0;
  for (let i = 0; i < n; i++) {
    const x = points[i].x;
    const y = points[i].y;
    const predY = Math.exp(slopeExp * x + interceptExp);
    ssResExp += Math.pow(y - predY, 2);
  }
  let r2Exp = ssTot > 0 ? 1 - (ssResExp / ssTot) : 0;
  if (r2Exp < 0) r2Exp = 0;
 
  let bestModel = "線形";
  let bestR2 = r2Linear;
  let formula = `y = ${slope.toFixed(2)}x + ${intercept.toFixed(2)}`;
  
  if (ssTot === 0) {
    bestModel = "線形";
    bestR2 = 1.0;
    formula = `y = 0.00x + ${intercept.toFixed(2)}`;
  } else {
    if (r2Log > bestR2 && r2Log > 0.4) {
      bestModel = "対数";
      bestR2 = r2Log;
      formula = `y = ${slopeLog.toFixed(2)}ln(x) + ${interceptLog.toFixed(2)}`;
    }
    if (r2Exp > bestR2 && r2Exp > 0.4) {
      bestModel = "指数";
      bestR2 = r2Exp;
      formula = `y = ${Math.exp(interceptExp).toFixed(2)}e^(${slopeExp.toFixed(2)}x)`;
    }
    
    if (bestR2 < 0.2) {
      bestModel = "不明";
      formula = "相関なし";
    }
  }

  const avgY = sumY / n;
  let trend = "維持";
  if (avgY >= 95) {
    trend = "上限";
  } else if (avgY <= 5) {
    trend = "下限";
  } else if (bestModel !== "不明") {
    let effectiveSlope = slope;
    if (bestModel === "対数") effectiveSlope = slopeLog;
    if (bestModel === "指数") effectiveSlope = slopeExp;
    
    if (effectiveSlope > 2) {
      trend = "上昇";
    } else if (effectiveSlope < -2) {
      trend = "下降";
    } else {
      trend = "維持";
    }
  } else {
    const diff = points[n-1].y - points[0].y;
    if (diff > 15) {
      trend = "上昇";
    } else if (diff < -15) {
      trend = "下降";
    } else {
      trend = "維持";
    }
  }
  
  return { type: bestModel, trend: trend, formula: formula, r2: bestR2 };
}
