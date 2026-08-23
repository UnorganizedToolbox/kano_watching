import { DEFAULT_API_KEY } from './constants';
import { showToast, showLoader, hideLoader, applyCurriculumModeUI } from './ui';
import { testGeminiApiKey, testGasConnection, testGasEmailProgram, syncTextbookMappingToGas } from './api';
import { renderDashboard } from './stats';
import { updatePomoUIState } from './pomo';

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
  
  switchView('portal');
  showToast('設定を保存しました。');
  
  if (mode !== oldMode) {
    if (renderSubjectSelectorRef) renderSubjectSelectorRef();
    renderDashboard();
  }
  applyCurriculumModeUI();
  updatePomoUIState();
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
    switchView('portal');
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

// -------------------------------------------------------------
// Student Auth handlers (Login & Registration Request)
// -------------------------------------------------------------
import { loginStudent, requestRegistration } from './api';
import { switchView } from './ui';

export function setupAuthHandlers(): void {
  const tabLogin = document.getElementById('auth-tab-login');
  const tabRegister = document.getElementById('auth-tab-register');
  const formLogin = document.getElementById('auth-login-form');
  const formRegister = document.getElementById('auth-register-form');
  
  const btnLogin = document.getElementById('auth-login-btn');
  const btnRegister = document.getElementById('auth-register-btn');
  const btnSaveUrl = document.getElementById('auth-save-url-btn');
  
  const inputSheetsUrl = document.getElementById('auth-sheets-url-input') as HTMLInputElement;
  const inputStudentId = document.getElementById('auth-student-id-input') as HTMLInputElement;
  const inputRegName = document.getElementById('auth-reg-name-input') as HTMLInputElement;
  const inputRegEmail = document.getElementById('auth-reg-email-input') as HTMLInputElement;
  
  // Set initial sheets url if any
  const savedUrl = localStorage.getItem('math_google_sheets_url') || '';
  if (inputSheetsUrl) inputSheetsUrl.value = savedUrl;
  
  // 1. Tab Switching
  if (tabLogin && tabRegister && formLogin && formRegister) {
    tabLogin.onclick = () => {
      tabLogin.classList.add('active');
      tabLogin.style.borderBottom = '2px solid var(--accent-primary)';
      tabLogin.style.color = 'white';
      tabRegister.classList.remove('active');
      tabRegister.style.borderBottom = 'none';
      tabRegister.style.color = 'var(--text-muted)';
      formLogin.style.display = 'block';
      formRegister.style.display = 'none';
    };
    
    tabRegister.onclick = () => {
      tabRegister.classList.add('active');
      tabRegister.style.borderBottom = '2px solid var(--accent-primary)';
      tabRegister.style.color = 'white';
      tabLogin.classList.remove('active');
      tabLogin.style.borderBottom = 'none';
      tabLogin.style.color = 'var(--text-muted)';
      formLogin.style.display = 'none';
      formRegister.style.display = 'block';
    };
  }
  
  // 2. Save Sheets URL
  if (btnSaveUrl && inputSheetsUrl) {
    btnSaveUrl.onclick = () => {
      const url = inputSheetsUrl.value.trim();
      if (!url) {
        showToast('URLを入力してください。', 'warning');
        return;
      }
      localStorage.setItem('math_google_sheets_url', url);
      // Synchronize to settings modal inputs as well
      const modalSheetsUrlInput = document.getElementById('google-sheets-url-input') as HTMLInputElement;
      if (modalSheetsUrlInput) modalSheetsUrlInput.value = url;
      showToast('連携用URLを保存しました！');
    };
  }
  
  // 3. Login Action
  const inputPassword = document.getElementById('auth-student-password-input') as HTMLInputElement;
  if (btnLogin && inputStudentId && inputPassword) {
    btnLogin.onclick = async () => {
      const sheetsUrl = localStorage.getItem('math_google_sheets_url') || '';
      if (!sheetsUrl) {
        showToast('連携用URLが設定されていません。', 'warning');
        return;
      }
      
      const studentId = inputStudentId.value.trim();
      const password = inputPassword.value.trim();
      
      if (!studentId) {
        showToast('生徒IDを入力してください。', 'warning');
        return;
      }
      if (!password) {
        showToast('パスワードを入力してください。', 'warning');
        return;
      }
      
      showLoader('ログイン中...', '認証情報を照合しています。');
      
      try {
        const result = await loginStudent(sheetsUrl, studentId, password);
        
        // Save auth state
        localStorage.setItem('math_student_id', studentId);
        localStorage.setItem('math_student_name', result.studentName);
        localStorage.setItem('math_student_email', result.email);
        
        // Lock student name input in settings view
        const studentNameInput = document.getElementById('student-name-input') as HTMLInputElement;
        if (studentNameInput) {
          studentNameInput.value = result.studentName;
          studentNameInput.disabled = true;
        }
        const idDisplay = document.getElementById('settings-student-id-display');
        if (idDisplay) idDisplay.textContent = studentId;
        
        hideLoader();
        showToast(`ログインに成功しました。お帰りなさい、${result.studentName}さん！`, 'success');
        
        // Switch to portal menu view
        renderDashboard();
        applyCurriculumModeUI();
        updatePomoUIState();
        
      } catch (err: any) {
        hideLoader();
        showToast(err.message || 'ログインに失敗しました。', 'danger');
      }
    };
  }
  
  // 4. Registration Request Action
  if (btnRegister && inputRegName && inputRegEmail) {
    btnRegister.onclick = async () => {
      const sheetsUrl = localStorage.getItem('math_google_sheets_url') || '';
      if (!sheetsUrl) {
        showToast('「連携用URL」が設定されていません。下部の接続連携設定からURLを登録してください。', 'warning');
        return;
      }
      
      const name = inputRegName.value.trim();
      const email = inputRegEmail.value.trim();
      
      if (!name) {
        showToast('お名前を入力してください。', 'warning');
        return;
      }
      
      // Validation to block "test", "admin" and "administrator" exact matches
      const lowerName = name.toLowerCase();
      if (lowerName === 'test' || lowerName === 'admin' || lowerName === 'administrator') {
        showToast('使用禁止文字が含まれています。', 'warning');
        return;
      }

      if (!email) {
        showToast('メールアドレスを入力してください。', 'warning');
        return;
      }
      
      showLoader('申請送信中...', '管理者に利用申請を送信しています。');
      
      try {
        const message = await requestRegistration(sheetsUrl, name, email);
        hideLoader();
        showToast(message || '利用申請を送信しました！', 'success');
        
        // Reset fields and return to login tab
        inputRegName.value = '';
        inputRegEmail.value = '';
        if (tabLogin) (tabLogin as HTMLElement).click();
        
      } catch (err: any) {
        hideLoader();
        showToast(err.message || '利用申請の送信に失敗しました。', 'danger');
      }
    };
  }

  // 5. Temporary Test Account Creator (Admin / Test accounts setup)
  const btnCreateTemp = document.getElementById('auth-create-temp-btn');
  if (btnCreateTemp) {
    btnCreateTemp.onclick = async () => {
      const sheetsUrl = localStorage.getItem('math_google_sheets_url') || '';
      if (!sheetsUrl) {
        showToast('連携用URLが設定されていません。環境変数をご確認ください。', 'warning');
        return;
      }
      
      showLoader('アカウント作成中...', 'Test & Admin アカウントを登録中...');
      
      try {
        const response = await fetch(sheetsUrl, {
          method: 'POST',
          body: JSON.stringify({
            action: 'create_temp_test_admin_accounts'
          })
        });
        if (!response.ok) {
          throw new Error(`接続エラー: ${response.statusText}`);
        }
        const resJson = await response.json();
        if (resJson.status !== 'success') {
          throw new Error(resJson.message || '作成に失敗しました。');
        }
        
        hideLoader();
        alert(`一時テストアカウントを作成しました！\n\n【一般用】\n生徒名: Test\n生徒ID: ${resJson.testId}\n初期パスワード: ${resJson.password}\n\n【管理者用】\n生徒名: Admin\n生徒ID: ${resJson.adminId}\n初期パスワード: ${resJson.password}\n\nこれらを入力してログインしてください。`);
        
        // Fill inputs automatically with test account credentials
        const inputId = document.getElementById('auth-student-id-input') as HTMLInputElement;
        const inputPass = document.getElementById('auth-student-password-input') as HTMLInputElement;
        if (inputId) inputId.value = resJson.testId;
        if (inputPass) inputPass.value = resJson.password;
        
      } catch (err: any) {
        hideLoader();
        showToast(err.message || 'アカウント作成に失敗しました。', 'danger');
      }
    };
  }
}

export function logoutStudent(): void {
  if (confirm('ログアウトしますか？\n（ホームの学習履歴はブラウザに残りますが、再度ログインするまでテストや質問の送信ができなくなります）')) {
    localStorage.removeItem('math_student_id');
    localStorage.removeItem('math_student_name');
    localStorage.removeItem('math_student_email');
    
    // Unlock name input but clear it
    const studentNameInput = document.getElementById('student-name-input') as HTMLInputElement;
    if (studentNameInput) {
      studentNameInput.value = '';
      studentNameInput.disabled = false;
    }
    
    // Reset login ID & password inputs
    const inputStudentId = document.getElementById('auth-student-id-input') as HTMLInputElement;
    const inputStudentPass = document.getElementById('auth-student-password-input') as HTMLInputElement;
    if (inputStudentId) inputStudentId.value = '';
    if (inputStudentPass) inputStudentPass.value = '';
    
    showToast('ログアウトしました。');
    switchView('auth');
  }
}

export async function changePassword(): Promise<void> {
  const sheetsUrl = localStorage.getItem('math_google_sheets_url') || '';
  const studentId = localStorage.getItem('math_student_id') || '';
  if (!sheetsUrl || !studentId) {
    showToast('認証エラー：再ログインしてください。', 'danger');
    return;
  }

  const inputCurrent = document.getElementById('change-pass-current') as HTMLInputElement;
  const inputNew = document.getElementById('change-pass-new') as HTMLInputElement;
  const inputConfirm = document.getElementById('change-pass-new-confirm') as HTMLInputElement;

  if (!inputCurrent || !inputNew || !inputConfirm) return;

  const currentPass = inputCurrent.value.trim();
  const newPass = inputNew.value.trim();
  const confirmPass = inputConfirm.value.trim();

  if (!currentPass) {
    showToast('現在のパスワードを入力してください。', 'warning');
    return;
  }
  if (!newPass) {
    showToast('新しいパスワードを入力してください。', 'warning');
    return;
  }
  if (newPass.length < 5) {
    showToast('パスワードは5文字以上で入力してください。', 'warning');
    return;
  }
  if (newPass !== confirmPass) {
    showToast('新しいパスワードが再入力の値と一致しません。', 'warning');
    return;
  }

  showLoader('パスワード変更中...', 'サーバーと通信しています。');

  try {
    const response = await fetch(sheetsUrl, {
      method: 'POST',
      body: JSON.stringify({
        action: 'change_password',
        studentId: studentId,
        currentPassword: currentPass,
        newPassword: newPass
      })
    });

    if (!response.ok) {
      throw new Error(`接続エラー: ${response.statusText}`);
    }

    const resJson = await response.json();
    if (resJson.status !== 'success') {
      throw new Error(resJson.message || 'パスワード変更処理に失敗しました。');
    }

    hideLoader();
    showToast('パスワードを正常に変更しました！', 'success');

    // Clear fields
    inputCurrent.value = '';
    inputNew.value = '';
    inputConfirm.value = '';
  } catch (err: any) {
    hideLoader();
    showToast(err.message || 'パスワードの変更に失敗しました。', 'danger');
  }
}
