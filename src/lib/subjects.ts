// 学習科目マスタ。学年によって選択肢を絞り込み、探しやすくする。
// 主要教科/副教科の分類は、複数教科をまたぐ実績(例: 特定教科への偏り判定)で使う想定。

export type GradeLevel = 'elementary' | 'junior_high' | 'high_school';

export const GRADE_LEVEL_OPTIONS: { value: GradeLevel; label: string }[] = [
  { value: 'elementary', label: '小学生' },
  { value: 'junior_high', label: '中学生' },
  { value: 'high_school', label: '高校生' },
];

export const OTHER_SUBJECT = 'その他' as const;

export const SUBJECTS_BY_GRADE: Record<GradeLevel, string[]> = {
  elementary: ['算数', '国語', '理科', '社会', '英語', '音楽', '美術', '家庭科'],
  junior_high: ['数学', '国語', '理科', '社会', '英語', '音楽', '美術', '技術', '家庭科', '情報'],
  high_school: [
    '数学', '国語', '英語', '物理', '化学', '生物', '地学',
    '日本史', '世界史', '地理', '倫理', '政治', '経済',
    '音楽', '美術', '技術', '家庭科', '情報',
  ],
};

// 学年未設定の生徒向けフォールバック(中学生相当が最も無難な範囲)
export const DEFAULT_SUBJECTS = SUBJECTS_BY_GRADE.junior_high;

export function getSubjectOptions(gradeLevel: GradeLevel | null | undefined): string[] {
  const base = gradeLevel ? SUBJECTS_BY_GRADE[gradeLevel] : DEFAULT_SUBJECTS;
  return [...base, OTHER_SUBJECT];
}

const MAIN_SUBJECTS = new Set([
  '算数', '数学', '国語', '英語', '理科', '社会',
  '物理', '化学', '生物', '地学',
  '日本史', '世界史', '地理', '倫理', '政治', '経済',
]);

// 主要教科なら true、副教科(音楽/美術/技術/家庭科/情報/その他・自由記述)なら false
export function isMainSubject(subject: string): boolean {
  return MAIN_SUBJECTS.has(subject);
}
