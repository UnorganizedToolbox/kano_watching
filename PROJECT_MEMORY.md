# LearnFlow (Math Diagnostic Tool) - Project Memory

## 📖 概要 (Overview)
本プロジェクトは、数学の実力診断とポモドーロタイマーを用いた学習管理、およびゲーミフィケーション要素を統合したNext.jsアプリケーションです。

## ⚙️ 技術スタック
- **Frontend**: Next.js (App Router), React, Tailwind CSS, lucide-react, react-katex
- **Backend/DB**: Supabase (PostgreSQL, Auth, RLS)
- **Deployment**: Vercel (Production: `main` branch, プレビュー・テストにはブランチデプロイを活用)

## 📜 ユーザーからの特別指示＆独自ルール (Custom Rules)
1. **バージョン表記ルール (厳守)**
   - 右下に表記するバージョンは `0.0.X.Y` のフォーマットを絶対に使用する。
   - 現在のバージョン: `v0.0.4.0`
2. **プロジェクト情報の更新**
   - 仕様変更や新たな計画が決定した場合は、過去の無効な計画は残さず、常に**「現在有効な最新の情報」のみ**をこのファイルに書き換えて維持する。
3. **Googleカレンダー連携のルール**
   - ポリシー上は「読み書き両方を行う」と明記するが、実装上は**「学習成果（実績など）をカレンダーへ同期（書き込み）しない」**こと。
4. **アカウントと氏名の管理ルール**
   - 未成年の利用に関する親の同意は「課金のみ」を対象とする。
   - ユーザーは本名の入力は不要で、ユーザー名のみを設定する。
   - 管理者が「生徒の本名を変更不可のニックネームとして強制設定するシステム」を今後実装する。

## 🗂️ 実装済みの主要機能とファイル構成 (Current Features & Architecture)

### 1. ユーザー＆プロフィール (Profiles)
- データベース: `profiles` (Authと連動)
- 機能: 表示名、目標イベント名(`target_title`)、目標日(`target_date`)、無償石(`free_stones`)、累計EXP(`exp`)などを管理。
- **レベル計算**: 冗長なDBカラムは廃止済。`src/lib/gamification/level.ts` の `calc_Lv_from_EXP` を使い、累計EXPから常に動的にレベルを逆算するステートレス設計。

### 2. 学習ポータル＆ゲーミフィケーション (Game Portal & Achievements)
- **エンジン**: `src/lib/gamification/engine.ts`
- ミッション判定は DAILY(毎日0時), WEEKLY(月曜0時), GENERAL/EVENT に分離。ミッション達成は `student_activity_logs` の `MISSION_REWARDED` ログとしてその都度記録され、ステートレスに判定される。

### 3. タイマー＆Q&A (Timer & Q&A)
- **ポモドーロ**: 終了時に集中力スコアとメモを記録。
- **Q&A (`QAThreadList.tsx`)**: スレッド形式でのチャット。`status`: `open` -> `answered` -> `resolved`。`react-katex` で数式対応。

### 4. カレンダー＆同期機能 (Timeline & Sync)
- **パス**: `/timeline`, `/settings`
- Google OAuthを利用したカレンダー連携機能を設定画面の「同期」タブから行う（ログイン時のGoogleボタンは廃止）。

## 🚧 今後予定されている機能 / 未実装
- 管理者が生徒の本名を「変更不可のニックネーム」として登録・管理できるシステムの追加
- アセンション（転生）機能の仕様策定と実装（例: Lv100到達時の永続ボーナス）
- 不具合報告のシステム内DB化（`bug_reports` テーブルの活用）
