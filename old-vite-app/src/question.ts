import { state } from './state';
import { showToast, showLoader, hideLoader } from './ui';
import { submitQuestionToGas, getQuestionsFromGas, askGeminiQuestion } from './api';
import { escapeHtml } from './utils';

// Declaring window globals for KaTeX render helper
declare global {
  interface Window {
    renderMathInElement?: (el: HTMLElement, options?: any) => void;
  }
}

export function initQuestionUI(): void {
  const textInput = document.getElementById('question-text-input') as HTMLInputElement;
  const imageInput = document.getElementById('question-image-input') as HTMLInputElement;
  const previewWrap = document.getElementById('question-preview-wrap');
  const previewImg = document.getElementById('question-preview-img') as HTMLImageElement;
  const responseCard = document.getElementById('question-ai-response-card');
  const responseText = document.getElementById('question-ai-response-text');
  
  if (textInput) textInput.value = '';
  if (imageInput) imageInput.value = '';
  if (previewWrap) previewWrap.style.display = 'none';
  if (previewImg) previewImg.src = '';
  if (responseCard) responseCard.style.display = 'none';
  if (responseText) responseText.innerHTML = '';
  
  state.questionImageBase64 = null;
  
  loadPastQuestions();
}

export function setupQuestionHandlers(): void {
  const fileInput = document.getElementById('question-image-input') as HTMLInputElement;
  const dropzone = document.getElementById('question-upload-dropzone');
  
  if (dropzone && fileInput) {
    dropzone.addEventListener('click', (e) => {
      if (e.target !== fileInput) {
        fileInput.click();
      }
    });
    
    fileInput.addEventListener('change', (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event: any) => {
          state.questionImageBase64 = event.target.result;
          const previewImg = document.getElementById('question-preview-img') as HTMLImageElement;
          const previewWrap = document.getElementById('question-preview-wrap');
          if (previewImg) previewImg.src = state.questionImageBase64 || '';
          if (previewWrap) previewWrap.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });
  }

  document.getElementById('question-remove-image-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (fileInput) fileInput.value = '';
    state.questionImageBase64 = null;
    const previewWrap = document.getElementById('question-preview-wrap');
    const previewImg = document.getElementById('question-preview-img') as HTMLImageElement;
    if (previewWrap) previewWrap.style.display = 'none';
    if (previewImg) previewImg.src = '';
  });

  document.getElementById('question-submit-btn')?.addEventListener('click', handleQuestionSubmission);
  document.getElementById('refresh-questions-btn')?.addEventListener('click', loadPastQuestions);
}

export async function handleQuestionSubmission(): Promise<void> {
  const textInput = document.getElementById('question-text-input') as HTMLTextAreaElement;
  const selectTarget = document.getElementById('question-target-select') as HTMLSelectElement;
  
  if (!textInput || !selectTarget) return;
  
  const text = textInput.value.trim();
  const target = selectTarget.value;
  
  if (!text && !state.questionImageBase64) {
    showToast('質問内容を入力するか、写真をアップロードしてください。', 'warning');
    return;
  }
  
  if (target === 'tutor') {
    showLoader('送信中...', '質問内容を指導者へメール送信し、スプレッドシートへ記録しています。');
    
    try {
      const studentName = localStorage.getItem('math_student_name') || '未設定';
      await submitQuestionToGas(studentName, text, state.questionImageBase64);
      showToast('指導者へ質問を送信しました！', 'success');
      initQuestionUI();
    } catch (err) {
      console.error(err);
      showToast('送信に失敗しました。接続を確認してください。', 'danger');
    } finally {
      hideLoader();
    }
  } else {
    showLoader('AIが解答を作成中...', '問題内容を分析して分かりやすいヒントを作成しています。');
    
    const promptText = `あなたはプロの家庭教師です。以下の質問および画像について、生徒が一人で理解できるように、段階的（ステップバイステップ）で分かりやすいヒントと丁寧な解説を日本語で記述してください。解説文の中に数式（LaTeX形式）を適宜用いることができます。数式を使用する場合は $$ ... $$ または $ ... $ で囲んでください。
    
質問内容:
${text || '(質問テキストなし、画像を参照してください)'}`;
    
    try {
      const aiResponse = await askGeminiQuestion(promptText, state.questionImageBase64);
      
      const responseTextEl = document.getElementById('question-ai-response-text');
      if (responseTextEl) {
        responseTextEl.textContent = aiResponse;
        
        if (window.renderMathInElement) {
          window.renderMathInElement(responseTextEl, {
            delimiters: [
              { left: "$$", right: "$$", display: true },
              { left: "$", right: "$", display: false }
            ]
          });
        }
      }
      
      const card = document.getElementById('question-ai-response-card');
      if (card) card.style.display = 'block';
      showToast('AIからヒントが届きました！', 'success');
      
    } catch (err: any) {
      console.error(err);
      showToast(`AIの回答生成に失敗しました: ${err.message}`, 'danger');
    } finally {
      hideLoader();
    }
  }
}

export async function loadPastQuestions(): Promise<void> {
  const container = document.getElementById('questions-list-container');
  if (!container) return;
  
  container.innerHTML = `<p style="font-size: 0.8rem; color: var(--text-muted); text-align: center; margin: 1rem 0;">読み込み中...</p>`;
  
  const studentName = localStorage.getItem('math_student_name') || '未設定';
  
  try {
    const list = await getQuestionsFromGas(studentName);
    
    if (list.length === 0) {
      container.innerHTML = `<p style="font-size: 0.8rem; color: var(--text-muted); text-align: center; margin: 1rem 0;">過去の質問はありません。</p>`;
      return;
    }
    
    let html = '';
    list.forEach((q) => {
      const isAnswered = q.status === '回答済';
      const badgeColor = isAnswered ? '#10b981' : '#f59e0b';
      const badgeText = isAnswered ? '回答あり' : '回答待ち';
      
      html += `
        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-glass); border-radius: 8px; padding: 0.8rem; display: flex; flex-direction: column; gap: 0.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
            <span style="font-weight: 600; font-size: 0.85rem; color: white;">Q: ${escapeHtml(q.title)}</span>
            <span style="font-size: 0.7rem; padding: 0.15rem 0.4rem; border-radius: 12px; background: rgba(${isAnswered ? '16,185,129' : '245,158,11'}, 0.15); color: ${badgeColor}; font-weight: bold; flex-shrink: 0;">${badgeText}</span>
          </div>
          <p style="font-size: 0.8rem; color: var(--text-secondary); white-space: pre-wrap; margin: 0;">${escapeHtml(q.text)}</p>
          ${q.imageUrl && q.imageUrl !== 'Attached in Email' && q.imageUrl !== 'メールに直接添付' && q.imageUrl !== 'Attached in email' ? `
            <div style="margin-top: 0.3rem;">
              <a href="${q.imageUrl}" target="_blank" style="font-size: 0.75rem; color: var(--accent-primary); text-decoration: underline;">📸 添付された問題画像</a>
            </div>
          ` : ''}
          <div style="font-size: 0.7rem; color: var(--text-muted); text-align: right;">送信日時: ${q.timestamp}</div>
          
          ${isAnswered ? `
            <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed rgba(255,255,255,0.08); background: rgba(16,185,129,0.02); border-radius: 4px; padding: 0.5rem;">
              <div style="font-weight: bold; font-size: 0.8rem; color: #34d399; margin-bottom: 0.2rem; display: flex; align-items: center; gap: 0.3rem;">
                <span>👤 指導者からの回答</span>
              </div>
              <div class="q-answer-content" style="font-size: 0.8rem; color: var(--text-primary); white-space: pre-wrap; line-height: 1.5;">${escapeHtml(q.answerText)}</div>
              <div style="font-size: 0.7rem; color: var(--text-muted); text-align: right; margin-top: 0.3rem;">回答日時: ${q.answerTimestamp}</div>
            </div>
          ` : ''}
        </div>
      `;
    });
    
    container.innerHTML = html;
    
    if (window.renderMathInElement) {
      const answerElements = container.querySelectorAll('.q-answer-content');
      answerElements.forEach(el => {
        window.renderMathInElement!(el as HTMLElement, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false }
          ]
        });
      });
    }
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p style="font-size: 0.8rem; color: var(--text-muted); text-align: center; margin: 1rem 0;">取得エラーが発生しました。接続を確認してください。</p>`;
  }
}
