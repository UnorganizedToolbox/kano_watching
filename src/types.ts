export interface Question {
  id: string;
  text: string;
  answer: string;
  hint: string;
  reference: string;
  difficulty?: string;
  subjectName?: string;
  chapterName?: string;
}

export interface DiagnosticQuestionReport {
  id: string;
  score: number;
  isCorrect: boolean;
  commentary: string;
}

export interface DiagnosticReport {
  totalScore: number;
  questions: DiagnosticQuestionReport[];
  weaknesses: string;
  recommendation: string;
}

export interface ExamSession {
  questionPool: Question[];
  attemptedQuestions: Question[];
  currentQuestionIndex: number;
  startTime: number;
  elapsedSeconds: number;
  isPaused: boolean;
  isFinished: boolean;
  images: string[];
  ocrTextUnified: string;
  generalNote: string;
  report: DiagnosticReport | null;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  score: number;
  maxScore: number;
  attemptedCount: number;
  subjects: string[];
  report: DiagnosticReport;
  attemptedQuestions: Question[];
  images: string[];
  ocrTextUnified: string;
  generalNote: string;
  durationSeconds: number;
}

export interface PomodoroLog {
  timestamp: string;
  studentName: string;
  subject: string;
  event: string;
  elapsedSeconds: number;
  lagSeconds: number;
  memo: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface RegressionResult {
  slope?: number;
  intercept?: number;
  r2: number;
  formula: string;
  type: string;
  trend: string;
}

export interface TransitionPair {
  from: string;
  to: string;
}

export interface FatiguePoint {
  session: number;
  lag: number;
}

export type PomoState = 'idle' | 'work' | 'work_paused' | 'break' | 'break_paused' | 'work_complete' | 'break_complete';

export type ViewName = 'setup' | 'exam' | 'upload' | 'correction' | 'report' | 'stats' | 'pomodoro' | 'question' | 'debug';

export type ToastType = 'info' | 'success' | 'warning' | 'danger';
