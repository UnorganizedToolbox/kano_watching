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
   - `0` (1つ目): 未完成
   - `0` (2つ目): α版
   - `X` (3つ目): 機能追加（新たな機能を実装するたびにインクリメント。0-index）
   - `Y` (4つ目): バグ修正（機能追加を伴わずにバグを修正するたびにインクリメント）
   - 現在のバージョン: `v0.0.4.0`
2. **プロジェクト情報の更新**
   - 仕様変更や新たな計画が決定した場合は、過去の無効な計画は残さず、常に**「現在有効な最新の情報」のみ**をこのファイルに書き換えて維持する。

## 🗂️ 実装済みの主要機能とファイル構成 (Current Features & Architecture)

### 1. ユーザー＆プロフィール (Profiles)
- データベース: `profiles` (Authと連動)
- 機能: 表示名、目標イベント名(`target_title`)、目標日(`target_date`)、無償石(`free_stones`)、累計EXP(`exp`)などを管理。
- **レベル計算**: 冗長なDBカラムは廃止済。`src/lib/gamification/level.ts` の `calc_Lv_from_EXP` を使い、累計EXPから常に動的にレベルを逆算するステートレス設計。

### 2. 学習ポータル＆ゲーミフィケーション (Game Portal & Achievements)
- **パス**: `/game` (日課), `/achievements` (一回きりの実績)
- **エンジン**: `src/lib/gamification/engine.ts`
- ミッション判定は4カテゴリに完全分離され、リセットタイミングが統一されている。
  - **DAILY**: 毎日 00:00 にリセット。
  - **WEEKLY**: 毎週月曜 00:00 にリセット。
  - **GENERAL / EVENT**: 恒久実績。
- ミッションの達成記録は、一生の実績テーブルではなく `student_activity_logs` 内の `MISSION_REWARDED` ログとしてその都度記録され、日付ベースで自動リセットされる。

### 3. タイマー＆Q&A (Timer & Q&A)
- **パス**: `/timer`
- **ポモドーロ**: 終了時に集中力スコア（1〜5）とメモを記録。
- **Q&A (`QAThreadList.tsx`)**: スレッド形式でのチャット。
  - `status`: `open` (先生の回答待ち) -> `answered` (先生回答済) -> `resolved` (生徒が「解決済」押下で完了)。
  - `react-katex` により `$$` や `$` で囲んだTypst/LaTeX形式の数式を描画。

### 4. 進捗と分析 (Progress)
- **パス**: `/progress`
- 学習時間（ポモドーロ完了数）や集中力スコアの推移をChart.js等を用いてダッシュボードで可視化。

### 5. ダッシュボード (Dashboard)
- **パス**: `/` (トップページ)
- 設定された「目標日」へのカウントダウン表示、最新の診断結果表示、AI学習ナビゲーターを配置。

## 🚧 今後予定されている機能 / 未実装
- アセンション（転生）機能の仕様策定と実装（例: Lv100到達時の永続ボーナス）
- UI上の `<未実装>` バッジがついている各種機能の対応（CBT問題作成、保護者連携、管理者デバッグパネルなど）
- 不具合報告（現在 `mailto:` 実装）のシステム内DB化（`bug_reports` テーブルの活用）
