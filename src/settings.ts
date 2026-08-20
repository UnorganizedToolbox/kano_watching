import { DEFAULT_API_KEY } from './constants';
import { showToast, showLoader, hideLoader, closeModal, applyCurriculumModeUI } from './ui';
import { testGeminiApiKey, testGasConnection, testGasEmailProgram, syncTextbookMappingToGas } from './api';
import { renderDashboard } from './stats';

// Declaring external rendering dependencies that will be bound from main
let renderSubjectSelectorRef: (() => void) | null = null;

export function setRenderSubjectSelector(fn: () => void): void {
  renderSubjectSelectorRef = fn;
}

export function loadApiKey(): void {
  const apiKey = localStorage.getItem('gemini_api_key') || DEFAULT_API_KEY;
  const apiKeyInput = document.getElementById('api-key-input') as HTMLInputElement;
  if (apiKeyInput) apiKeyInput.value = apiKey;
  
  const mode = localStorage.getItem('math_curriculum_mode') || 'junior_high';
  const modeInput = document.getElementById('curriculum-mode-input') as HTMLSelectElement;
  if (modeInput) modeInput.value = mode;

  const studentName = localStorage.getItem('math_student_name') || '';
  const studentNameInput = document.getElementById('student-name-input') as HTMLInputElement;
  if (studentNameInput) studentNameInput.value = studentName;

  const sheetsUrl = localStorage.getItem('math_google_sheets_url') || '';
  const sheetsUrlInput = document.getElementById('google-sheets-url-input') as HTMLInputElement;
  if (sheetsUrlInput) sheetsUrlInput.value = sheetsUrl;
}

export function saveApiKey(): void {
  const apiKeyEl = document.getElementById('api-key-input') as HTMLInputElement;
  const studentNameEl = document.getElementById('student-name-input') as HTMLInputElement;
  const googleSheetsUrlEl = document.getElementById('google-sheets-url-input') as HTMLInputElement;
  const curriculumModeEl = document.getElementById('curriculum-mode-input') as HTMLSelectElement;
  
  if (!apiKeyEl || !studentNameEl || !googleSheetsUrlEl || !curriculumModeEl) return;

  const apiKey = apiKeyEl.value.trim();
  if (apiKey) {
    localStorage.setItem('gemini_api_key', apiKey);
  } else if (!DEFAULT_API_KEY) {
    showToast('APIキーを入力してください。', 'warning');
    return;
  }

  const studentName = studentNameEl.value.trim();
  localStorage.setItem('math_student_name', studentName);

  const sheetsUrl = googleSheetsUrlEl.value.trim();
  localStorage.setItem('math_google_sheets_url', sheetsUrl);
  
  const mode = curriculumModeEl.value;
  const oldMode = localStorage.getItem('math_curriculum_mode') || 'junior_high';
  localStorage.setItem('math_curriculum_mode', mode);
  
  closeModal('settings-modal');
  showToast('設定を保存しました。');
  
  if (mode !== oldMode) {
    if (renderSubjectSelectorRef) renderSubjectSelectorRef();
    renderDashboard();
  }
  applyCurriculumModeUI();
}

export async function testApiConnection(): Promise<void> {
  const apiKeyEl = document.getElementById('api-key-input') as HTMLInputElement;
  const studentNameEl = document.getElementById('student-name-input') as HTMLInputElement;
  const googleSheetsUrlEl = document.getElementById('google-sheets-url-input') as HTMLInputElement;
  
  if (!apiKeyEl || !studentNameEl || !googleSheetsUrlEl) return;
  
  const apiKey = apiKeyEl.value.trim();
  const studentName = studentNameEl.value.trim();
  const sheetsUrl = googleSheetsUrlEl.value.trim();
  
  if (!apiKey) {
    showToast('APIキーを入力してください。', 'warning');
    return;
  }
  if (!studentName) {
    showToast('生徒名を入力してください。', 'warning');
    return;
  }
  
  showLoader('接続テスト中...', 'Gemini APIおよびスプレッドシートへの接続を確認しています。');
  
  try {
    // 1. Test Gemini API connection
    await testGeminiApiKey(apiKey);
    
    // 2. Test Google Sheets GAS connection
    if (sheetsUrl) {
      await testGasConnection(sheetsUrl, studentName);
    }
    
    hideLoader();
    showToast('接続に成功しました！', 'success');
  } catch (error: any) {
    hideLoader();
    console.error(error);
    showToast(error.message || '接続エラーが発生しました。', 'danger');
  }
}

export async function testProgramExecution(): Promise<void> {
  const sheetsUrlEl = document.getElementById('google-sheets-url-input') as HTMLInputElement;
  const studentNameEl = document.getElementById('student-name-input') as HTMLInputElement;
  
  if (!sheetsUrlEl || !studentNameEl) return;
  
  const sheetsUrl = sheetsUrlEl.value.trim();
  if (!sheetsUrl) {
    showToast('連携用URL（GASのWebアプリURL）を入力してください。', 'warning');
    return;
  }
  
  const studentName = studentNameEl.value.trim() || 'テスト生徒';
  
  console.log("Starting GAS Program Execution Test...");
  console.log("Configured GAS URL:", sheetsUrl);
  
  showLoader('テスト中...', 'GAS経由でスプレッドシートへの記録とメール送信を実行しています。');
  
  try {
    await testGasEmailProgram(sheetsUrl, studentName);
    console.log("Fetch request for program test resolved (Opaque response).");
    hideLoader();
    showToast('テストデータを送信しました！メールおよびスプレッドシートをご確認ください。', 'success');
  } catch (error: any) {
    hideLoader();
    showToast('送信エラーが発生しました。接続を確認してください。', 'danger');
    console.error("Program test failed with error:", error);
  }
}

export async function syncTextbookMapping(): Promise<void> {
  const sheetsUrl = localStorage.getItem('math_google_sheets_url');
  if (!sheetsUrl) {
    showToast('連携用URL（Googleスプレッドシート）が設定されていません。', 'danger');
    return;
  }
  
  showLoader('教材データを同期中...');
  
  try {
    const localRes = await fetch('textbook_mapping.json');
    if (!localRes.ok) {
      throw new Error('textbook_mapping.json を取得できませんでした。');
    }
    const mappings = await localRes.json();
    
    const count = await syncTextbookMappingToGas(sheetsUrl, mappings);
    
    localStorage.setItem('textbook_synced_version', '1.0');
    showToast(`教材データ（${count}件）の同期が完了しました！`, 'success');
    closeModal('settings-modal');
  } catch (err: any) {
    console.error(err);
    showToast(`エラー: ${err.message}`, 'danger');
  } finally {
    hideLoader();
  }
}

export async function autoSyncTextbookMapping(sheetsUrl: string): Promise<void> {
  const syncedVer = localStorage.getItem('textbook_synced_version');
  if (syncedVer === '1.0') return;
  
  try {
    const localRes = await fetch('textbook_mapping.json');
    if (localRes.ok) {
      const mappings = await localRes.json();
      const count = await syncTextbookMappingToGas(sheetsUrl, mappings);
      localStorage.setItem('textbook_synced_version', '1.0');
      console.log(`Auto-synced textbook mapping: ${count} items.`);
    }
  } catch (err) {
    console.error("Auto-sync textbook mapping failed:", err);
  }
}
