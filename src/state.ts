import { Question, ExamSession, PomoState } from './types';

export const state = {
  questionsDb: null as Record<string, any> | null,
  activeSession: null as ExamSession | null,
  timerInterval: null as number | null,
  
  // Pomodoro state
  pomoState: 'idle' as PomoState,
  pomoTimerInterval: null as number | null,
  pomoSecondsLeft: 25 * 60,
  pomoAccumulatedSeconds: 0,
  pomoStateStartTime: 0,
  pomoZeroTimestamp: 0,
  pomoSelectedSubject: '数学',
  pomoMemo: '',
  pomoTimerStartSecondsLeft: 25 * 60,
  
  // Question Box state
  questionImageBase64: null as string | null
};

export function saveSessionToStorage(): void {
  if (state.activeSession) {
    localStorage.setItem('math_test_session', JSON.stringify(state.activeSession));
  } else {
    localStorage.removeItem('math_test_session');
  }
}
